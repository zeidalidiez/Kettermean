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
  // WebLLM requires the last message to be from user/tool — do NOT prefill assistant.
  const messages = [
    { role: 'system' as const, content: params.system },
    {
      role: 'user' as const,
      content: `${params.user}

Return ONLY one JSON object. Start with { and end with }. No markdown. No thinking.`,
    },
  ];

  type NonStream = {
    choices?: Array<{ message?: { content?: string | null }; text?: string }>;
  };

  const requestBase: Record<string, unknown> = {
    messages,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
    stream: false,
  };

  // Qwen3 defaults to thinking mode; disable for faster/cleaner JSON.
  if (/qwen3/i.test(params.modelId)) {
    requestBase.extra_body = { enable_thinking: false };
  }

  // Prefer JSON mode when supported; fall back cleanly if the runtime rejects it.
  let completion: NonStream;
  try {
    completion = (await eng.chat.completions.create({
      ...requestBase,
      response_format: { type: 'json_object' },
    } as never)) as NonStream;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      completion = (await eng.chat.completions.create({
        messages,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        stream: false,
      } as never)) as NonStream;
    } catch (err2) {
      const msg2 = err2 instanceof Error ? err2.message : String(err2);
      throw new Error(`Browser model failed: ${msg2 || msg}`);
    }
  }

  const choice = completion.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content === 'string' && content.trim()) {
    return normalizeJsonText(content.trim());
  }
  if (choice?.text?.trim()) {
    return normalizeJsonText(choice.text.trim());
  }
  throw new Error('Browser model returned empty content');
}

function normalizeJsonText(text: string): string {
  // Qwen3 may still wrap reasoning even when thinking is disabled.
  let t = text.replace(/<think>[\s\S]*?<\/think>\s*/gi, '').trim();
  if (!t.startsWith('{')) t = `{${t}`;
  return t;
}

export function getBrowserEngineStatus(): { loaded: boolean; modelId: string } {
  return { loaded: Boolean(engine), modelId: loadedModelId };
}
