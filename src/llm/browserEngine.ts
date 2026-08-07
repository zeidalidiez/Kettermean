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

export type WebGpuStatus = {
  available: boolean;
  secureContext: boolean;
  hasNavigatorGpu: boolean;
  host: string;
  href: string;
  reason?: string;
};

/**
 * WebGPU only exists in secure contexts (https or localhost).
 * Opening Vite via a LAN IP (http://192.168.x.x:5173) makes navigator.gpu undefined
 * even in Chrome — that is the usual false "not detected" report.
 */
export function getWebGpuStatus(): WebGpuStatus {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      available: false,
      secureContext: false,
      hasNavigatorGpu: false,
      host: '',
      href: '',
      reason: 'No browser window.',
    };
  }

  const secureContext = Boolean(window.isSecureContext);
  const gpu = (navigator as Navigator & { gpu?: unknown }).gpu;
  const hasNavigatorGpu = gpu != null;
  const host = window.location.host;
  const href = window.location.href;

  if (!secureContext) {
    return {
      available: false,
      secureContext,
      hasNavigatorGpu,
      host,
      href,
      reason:
        `Not a secure context (${href}). Open http://localhost:${window.location.port || '5173'}/ — LAN IPs like http://192.168.x.x disable WebGPU in Chrome.`,
    };
  }

  if (!hasNavigatorGpu) {
    return {
      available: false,
      secureContext,
      hasNavigatorGpu,
      host,
      href,
      reason:
        'navigator.gpu is missing. Use up-to-date Chrome/Edge, check chrome://gpu, and ensure WebGPU is not disabled in chrome://flags.',
    };
  }

  return { available: true, secureContext, hasNavigatorGpu, host, href };
}

export function isWebGpuAvailable(): boolean {
  return getWebGpuStatus().available;
}

export async function ensureBrowserEngine(
  modelId: string,
  onProgress?: ProgressCb,
): Promise<MLCEngineLike> {
  const gpu = getWebGpuStatus();
  if (!gpu.available) {
    throw new Error(gpu.reason || 'WebGPU is required for browser models.');
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
  /** When true, append a JSON-only reminder (cloud-style). Browser Q&A leaves this false. */
  forceJson?: boolean;
}): Promise<string> {
  const eng = await ensureBrowserEngine(params.modelId, params.onProgress);
  // WebLLM requires the last message to be from user/tool — do NOT prefill assistant.
  const userContent = params.forceJson
    ? `${params.user}

Return ONLY one JSON object. Start with { and end with }. No markdown. No thinking.`
    : params.user;
  const messages = [
    { role: 'system' as const, content: params.system },
    { role: 'user' as const, content: userContent },
  ];

  type NonStream = {
    choices?: Array<{ message?: { content?: string | null }; text?: string }>;
  };

  // Do NOT use response_format/json_object here: WebLLM's grammar compiler can throw
  // BindingError "Cannot pass non-string to std::string" on some builds/models.
  const request: Record<string, unknown> = {
    messages,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
    stream: false,
  };

  // Qwen3 thinking burns tokens; disable when the runtime accepts it.
  if (/qwen3/i.test(params.modelId)) {
    request.enable_thinking = false;
  }

  let completion: NonStream;
  try {
    completion = (await eng.chat.completions.create(request as never)) as NonStream;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Retry without enable_thinking if rejected.
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
