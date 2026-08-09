import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const browser = vi.hoisted(() => ({
  completion: vi.fn<(params: unknown) => Promise<string>>(),
}));

vi.mock('../src/llm/browserEngine', () => ({
  browserChatCompletion: browser.completion,
  disposeBrowserEngine: vi.fn(async () => undefined),
  ensureBrowserEngine: vi.fn(async () => undefined),
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
});
