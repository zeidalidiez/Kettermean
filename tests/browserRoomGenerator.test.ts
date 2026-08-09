import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const browser = vi.hoisted(() => ({
  completion: vi.fn<(params: unknown) => Promise<string>>(),
}));

vi.mock('../src/llm/browserEngine', () => ({
  browserChatCompletion: browser.completion,
  disposeBrowserEngine: vi.fn(async () => undefined),
  ensureBrowserEngine: vi.fn(async () => undefined),
  interruptBrowserGeneration: vi.fn(),
}));

import { RoomGenerator } from '../src/llm/RoomGenerator';
import type { AppSettings, GenerationContext } from '../src/types';
import { memoryStorage } from './storage';

const settings: AppSettings = {
  mode: 'seeded',
  seed: 'tiny-model-test',
  provider: 'browser',
  apiKey: '',
  baseUrl: '',
  model: 'tiny-test-model',
  aiDepth: 'standard',
  allowGore: false,
  noFlashingLights: false,
  noLowLight: false,
};

function context(index: number): GenerationContext {
  return {
    seed: `malformed-browser-${index}`,
    previousTitles: [],
    moodBias: 'static',
    allowGore: false,
    linkIndex: index,
  };
}

describe('RoomGenerator browser steering recovery', () => {
  beforeEach(() => {
    browser.completion.mockReset();
    vi.stubGlobal('localStorage', memoryStorage());
    vi.stubGlobal('window', {
      setTimeout,
      clearTimeout,
      location: { origin: 'https://example.test' },
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps generating after repeated malformed tiny-model responses', async () => {
    browser.completion
      .mockResolvedValueOnce('kettermean\n=RED_STAIRWELL\n=IN_UPPER_MOOD\n=IN_UPPER_MOOD')
      .mockResolvedValueOnce('kettermean\n=red_stairwell\n=giants\n=giants\n=giants')
      .mockResolvedValueOnce('=Vending=,=Vending=,=Vending=,=Vending=')
      .mockResolvedValueOnce('I forgot the requested format.');

    const generator = new RoomGenerator(settings);
    generator.beginSession();
    const rooms = [];
    for (let index = 0; index < 4; index += 1) {
      rooms.push(await generator.get(context(index)));
    }

    expect(browser.completion).toHaveBeenCalledTimes(4);
    expect(generator.getApiCallCount()).toBe(4);
    expect(rooms.every((room) => room.offline === false)).toBe(true);
    expect(rooms.every((room) => room.visuals)).toBe(true);
  });

  it('starts a newly selected cloud provider without waiting for obsolete WebLLM work', async () => {
    let finishBrowser!: (value: string) => void;
    browser.completion.mockImplementationOnce(
      () => new Promise<string>((resolve) => {
        finishBrowser = resolve;
      }),
    );
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '{"themeId":"fluorescent_lobby","title":"Cloud Lobby","blurb":"The cloud request arrived.","mood":"static"}',
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const generator = new RoomGenerator(settings);
    generator.beginSession();
    const obsoleteBrowserRoom = generator.get(context(10));
    await vi.waitFor(() => expect(browser.completion).toHaveBeenCalledTimes(1));

    generator.updateSettings({
      ...settings,
      provider: 'openai',
      apiKey: 'test-only-key',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'openrouter/free',
    });
    generator.beginSession();
    const cloudRoom = generator.get(context(11));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await expect(cloudRoom).resolves.toMatchObject({
      offline: false,
      title: 'Cloud Lobby',
    });

    finishBrowser('00012345');
    await expect(obsoleteBrowserRoom).resolves.toMatchObject({ offline: true });
  });
});
