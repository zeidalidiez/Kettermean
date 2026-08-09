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
  noFlashingLights: false,
  noLowLight: false,
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

  it('separates comfort-constrained cache entries and enforces settings locally', () => {
    const constrainedSettings: AppSettings = {
      ...settings,
      provider: 'offline',
      noFlashingLights: true,
      noLowLight: true,
    };
    const generator = new RoomGenerator(constrainedSettings);
    const safe = generator.getOrOffline(context('comfort-cache'));

    expect(safe.visuals).toMatchObject({
      flashingDisabled: true,
      highVisibility: true,
    });
    expect(safe.visuals?.lighting).not.toBe('pulse');
    expect(safe.visuals?.lighting).not.toBe('dim');

    generator.updateSettings({
      ...constrainedSettings,
      noFlashingLights: false,
      noLowLight: false,
    });
    const atmospheric = generator.getOrOffline(context('comfort-cache'));

    expect(atmospheric).not.toBe(safe);
    expect(atmospheric.visuals).toMatchObject({
      flashingDisabled: false,
      highVisibility: false,
    });
  });

  it('adds comfort constraints to cloud prompts and validates the returned room', async () => {
    let requestBody: Record<string, unknown> | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return response(
          '{"themeId":"fluorescent_lobby","title":"Clear Lobby","blurb":"Every corner is visible.","mood":"dynamic"}',
        );
      }),
    );

    const generator = new RoomGenerator({
      ...settings,
      noFlashingLights: true,
      noLowLight: true,
    });
    generator.beginSession();
    const room = await generator.get(context('cloud-comfort'));
    const messages = requestBody?.messages as Array<{ content?: string }>;
    const prompt = messages.map((message) => message.content ?? '').join('\n');

    expect(prompt).toContain('Do not request flashing');
    expect(prompt).toContain('do not request dim or low-light');
    expect(room.visuals?.lighting).not.toBe('pulse');
    expect(room.visuals?.lighting).not.toBe('dim');
    expect(room.visuals).toMatchObject({
      flashingDisabled: true,
      highVisibility: true,
    });
  });

  it('reports the selected OpenRouter backend and a useful HTTP failure state', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('unauthorized', { status: 401 })),
    );
    const statuses: string[] = [];
    const generator = new RoomGenerator({
      ...settings,
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'openrouter/free',
    });
    generator.setStatusHandler((status) => statuses.push(status));
    generator.beginSession();
    generator.prefetch(context('openrouter-status'));

    await vi.waitFor(() =>
      expect(statuses.some((status) => status.includes('returned HTTP 401'))).toBe(true),
    );
    expect(statuses[0]).toContain('OpenRouter · openrouter/free · requesting');
    expect(statuses.at(-1)).toContain('retry 1/3');
  });
});
