import { DEFAULT_BROWSER_MODEL } from '../config';

type ProgressCb = (msg: string) => void;

// Keep WebLLM out of the main bundle until browser provider is chosen.
type MLCEngineLike = {
  chat: {
    completions: {
      create: (req: unknown) => Promise<unknown>;
    };
  };
};

let engine: MLCEngineLike | null = null;
let loadedModelId = '';
let loadPromise: Promise<MLCEngineLike> | null = null;

export function isWebGpuAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export async function ensureBrowserEngine(
  modelId: string,
  onProgress?: ProgressCb,
): Promise<MLCEngineLike> {
  if (!isWebGpuAvailable()) {
    throw new Error('WebGPU is required for browser models. Use Chrome/Edge with WebGPU enabled.');
  }

  const id = modelId.trim() || DEFAULT_BROWSER_MODEL;
  if (engine && loadedModelId === id) return engine;
  if (loadPromise && loadedModelId === id) return loadPromise;

  loadedModelId = id;
  onProgress?.(`Downloading ${id} (first run only)…`);

  loadPromise = (async () => {
    const webllm = await import('@mlc-ai/web-llm');
    const e = await webllm.CreateMLCEngine(id, {
      initProgressCallback: (report) => {
        const text = report?.text || `Loading ${id}…`;
        onProgress?.(text);
      },
    });
    engine = e as unknown as MLCEngineLike;
    onProgress?.('Browser model ready');
    return engine;
  })().catch((err) => {
    engine = null;
    loadedModelId = '';
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

export async function browserChatCompletion(params: {
  modelId: string;
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  onProgress?: ProgressCb;
}): Promise<string> {
  const eng = await ensureBrowserEngine(params.modelId, params.onProgress);
  const messages = [
    { role: 'system' as const, content: params.system },
    { role: 'user' as const, content: params.user },
    { role: 'assistant' as const, content: '{' },
  ];

  type NonStream = {
    choices?: Array<{ message?: { content?: string | null }; text?: string }>;
  };

  const requestBase = {
    messages,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
    stream: false as const,
  };

  // Prefer JSON mode when supported; fall back cleanly if the runtime rejects it.
  let completion: NonStream;
  try {
    completion = (await eng.chat.completions.create({
      ...requestBase,
      response_format: { type: 'json_object' },
    } as never)) as NonStream;
  } catch {
    completion = (await eng.chat.completions.create(requestBase as never)) as NonStream;
  }

  const choice = completion.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content === 'string' && content.trim()) {
    const t = content.trim();
    return t.startsWith('{') ? t : `{${t}`;
  }
  if (choice?.text?.trim()) {
    const t = choice.text.trim();
    return t.startsWith('{') ? t : `{${t}`;
  }
  throw new Error('Browser model returned empty content');
}

export function getBrowserEngineStatus(): { loaded: boolean; modelId: string } {
  return { loaded: Boolean(engine), modelId: loadedModelId };
}
