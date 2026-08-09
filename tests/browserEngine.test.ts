import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const webllm = vi.hoisted(() => ({
  activeLoads: 0,
  maxActiveLoads: 0,
  loadOrder: [] as string[],
  completion: vi.fn<(request: unknown) => Promise<unknown>>(),
}));

vi.mock('../src/llm/browserWorkerClient', () => ({
  createBrowserWorkerClient: () => ({
    load: async (modelId: string, onProgress?: (text: string) => void) => {
      webllm.activeLoads += 1;
      webllm.maxActiveLoads = Math.max(webllm.maxActiveLoads, webllm.activeLoads);
      webllm.loadOrder.push(`start:${modelId}`);
      onProgress?.(`loading:${modelId}`);
      await new Promise((resolve) => setTimeout(resolve, 12));
      webllm.loadOrder.push(`end:${modelId}`);
      webllm.activeLoads -= 1;
    },
    generate: webllm.completion,
    interruptGenerate: vi.fn(),
    unload: vi.fn(async () => undefined),
    terminate: vi.fn(),
  }),
}));

class FakeWorker {
  terminate(): void {}
}

describe('WebLLM engine lifecycle', () => {
  beforeEach(() => {
    webllm.activeLoads = 0;
    webllm.maxActiveLoads = 0;
    webllm.loadOrder = [];
    webllm.completion.mockReset();
    vi.stubGlobal('window', {
      isSecureContext: true,
      location: {
        host: 'localhost:5173',
        href: 'http://localhost:5173/',
        port: '5173',
      },
    });
    vi.stubGlobal('navigator', { gpu: {} });
    vi.stubGlobal('Worker', FakeWorker);
  });

  afterEach(async () => {
    const { disposeBrowserEngine } = await import('../src/llm/browserEngine');
    await disposeBrowserEngine();
    vi.unstubAllGlobals();
  });

  it('serializes different model loads and finishes on the requested model', async () => {
    const { ensureBrowserEngine, getBrowserEngineStatus } = await import(
      '../src/llm/browserEngine'
    );
    await Promise.all([ensureBrowserEngine('model-a'), ensureBrowserEngine('model-b')]);

    expect(webllm.maxActiveLoads).toBe(1);
    expect(webllm.loadOrder).toEqual([
      'start:model-a',
      'end:model-a',
      'start:model-b',
      'end:model-b',
    ]);
    expect(getBrowserEngineStatus()).toMatchObject({
      loaded: true,
      modelId: 'model-b',
      state: 'ready',
    });
  });

  it('does not run a second inference when a completion fails', async () => {
    webllm.completion.mockRejectedValueOnce(new Error('bad request'));
    const { browserChatCompletion } = await import('../src/llm/browserEngine');

    await expect(
      browserChatCompletion({
        modelId: 'model-a',
        system: 'Fill a form.',
        user: '1. theme',
        maxTokens: 100,
        temperature: 0.2,
      }),
    ).rejects.toThrow('bad request');
    expect(webllm.completion).toHaveBeenCalledTimes(1);
  });

  it('bounds tiny-model completions and penalizes repetition', async () => {
    webllm.completion.mockResolvedValueOnce({
      choices: [{ finish_reason: 'stop', message: { content: 'KMR12345678' } }],
    });
    const { browserChatCompletion } = await import('../src/llm/browserEngine');

    await browserChatCompletion({
      modelId: 'model-a',
      system: 'Return a code.',
      user: 'Choose eight digits.',
      maxTokens: 40,
      temperature: 0.2,
    });

    expect(webllm.completion).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 40,
        repetition_penalty: 1.18,
        frequency_penalty: 0.35,
        presence_penalty: 0.15,
        stop: ['\n\n'],
      }),
    );
  });

  it('does not leave a cancelled load reported as an engine error', async () => {
    const { disposeBrowserEngine, ensureBrowserEngine, getBrowserEngineStatus } = await import(
      '../src/llm/browserEngine'
    );

    const loading = ensureBrowserEngine('model-a');
    await new Promise((resolve) => setTimeout(resolve, 1));
    await disposeBrowserEngine();

    await expect(loading).rejects.toThrow('cancelled');
    expect(getBrowserEngineStatus()).toMatchObject({
      loaded: false,
      modelId: '',
      loadingModelId: '',
      state: 'idle',
    });
  });
});
