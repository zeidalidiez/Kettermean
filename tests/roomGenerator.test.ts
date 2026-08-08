import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../src/config';
import { RoomGenerator } from '../src/llm/RoomGenerator';
import type { AppSettings, GenerationContext } from '../src/types';
import { memoryStorage } from './storage';

const settings: AppSettings = {
  mode: 'seeded',
  seed: 'queue-test',
  provider: 'openai',
  apiKey: 'test-only-key',
  baseUrl: 'https://example.test/v1',
  model: 'test-model',
  allowGore: false,
};

function context(seed: string): GenerationContext {
  return {
    seed,
    previousTitles: [],
    moodBias: 'static',
    allowGore: false,
    linkIndex: 0,
  };
}

function response(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('RoomGenerator cost controls', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    vi.stubGlobal('window', {
      setTimeout,
      clearTimeout,
      location: { origin: 'https://example.test' },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('serializes generation globally, not only per seed', async () => {
    let active = 0;
    let maxActive = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 15));
        active -= 1;
        return response(
          '{"themeId":"fluorescent_lobby","title":"Quiet Lobby","blurb":"The lights wait.","mood":"static"}',
        );
      }),
    );

    const generator = new RoomGenerator(settings);
    generator.beginSession();
    await Promise.all([generator.get(context('queue-a')), generator.get(context('queue-b'))]);
    expect(maxActive).toBe(1);
    expect(generator.getApiCallCount()).toBe(2);
  });

  it('does not automatically retry or rebill an unusable seed', async () => {
    const fetchMock = vi.fn(async () => response('not a usable room direction'));
    vi.stubGlobal('fetch', fetchMock);

    const generator = new RoomGenerator(settings);
    generator.beginSession();
    const first = await generator.get(context('bad-seed'));
    const second = await generator.get(context('bad-seed'));

    expect(first.offline).toBe(true);
    expect(second.offline).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aborts an obsolete cloud request when the session ends', async () => {
    const fetchMock = vi.fn((_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const generator = new RoomGenerator(settings);
    generator.beginSession();
    const obsolete = generator.get(context('obsolete-seed'));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    generator.endSession();

    await expect(obsolete).resolves.toMatchObject({ offline: true });
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it('removes obsolete room-cache versions without touching unrelated storage', () => {
    const local = memoryStorage({
      'kettermean.roomCache.v8': '{}',
      'kettermean.roomCache.v10': '{}',
      [STORAGE_KEYS.roomCache]: '{}',
      'another-app': 'keep-me',
    });
    vi.stubGlobal('localStorage', local);

    new RoomGenerator(settings);

    expect(local.getItem('kettermean.roomCache.v8')).toBeNull();
    expect(local.getItem('kettermean.roomCache.v10')).toBeNull();
    expect(local.getItem(STORAGE_KEYS.roomCache)).toBe('{}');
    expect(local.getItem('another-app')).toBe('keep-me');
  });
});
