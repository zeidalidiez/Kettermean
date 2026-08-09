import { DEFAULT_BROWSER_MODEL } from '../config';
import {
  createBrowserWorkerClient,
  type BrowserWorkerClient,
} from './browserWorkerClient';

type ProgressCb = (msg: string) => void;
type EngineState = 'idle' | 'loading' | 'ready' | 'generating' | 'error';

let engine: BrowserWorkerClient | null = null;
let loadingClient: BrowserWorkerClient | null = null;
let loadedModelId = '';
let loadingModelId = '';
let state: EngineState = 'idle';
let lastError = '';
let operationTail: Promise<void> = Promise.resolve();
let cancelActiveLoad: ((reason: Error) => void) | null = null;
const pendingLoads = new Map<string, Promise<BrowserWorkerClient>>();

export type WebGpuStatus = {
  available: boolean;
  secureContext: boolean;
  hasNavigatorGpu: boolean;
  host: string;
  href: string;
  reason?: string;
};

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
        `WebGPU needs HTTPS or localhost. Open http://localhost:${window.location.port || '5173'}/ instead of a LAN-IP URL.`,
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
        'WebGPU is unavailable. Use a current Chrome/Edge build and confirm WebGPU is enabled in the browser GPU diagnostics.',
    };
  }

  return { available: true, secureContext, hasNavigatorGpu, host, href };
}

export function isWebGpuAvailable(): boolean {
  return getWebGpuStatus().available;
}

export function ensureBrowserEngine(
  modelId: string,
  onProgress?: ProgressCb,
): Promise<BrowserWorkerClient> {
  const gpu = getWebGpuStatus();
  if (!gpu.available) {
    return Promise.reject(new Error(gpu.reason || 'WebGPU is required for browser models.'));
  }

  const id = modelId.trim() || DEFAULT_BROWSER_MODEL;
  if (engine && loadedModelId === id && state !== 'error') {
    onProgress?.('Browser model ready');
    return Promise.resolve(engine);
  }

  const pending = pendingLoads.get(id);
  if (pending) return pending;

  const load = enqueueOperation(() => loadModelNow(id, onProgress));
  pendingLoads.set(id, load);
  void load.then(
    () => {
      if (pendingLoads.get(id) === load) pendingLoads.delete(id);
    },
    () => {
      if (pendingLoads.get(id) === load) pendingLoads.delete(id);
    },
  );
  return load;
}

export async function browserChatCompletion(params: {
  modelId: string;
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  onProgress?: ProgressCb;
  forceJson?: boolean;
  /** Omit to stop compact replies at a blank line; pass [] for multi-line packets. */
  stopSequences?: string[];
}): Promise<string> {
  const id = params.modelId.trim() || DEFAULT_BROWSER_MODEL;
  return enqueueOperation(async () => {
    const activeEngine = await loadModelNow(id, params.onProgress);
    state = 'generating';
    lastError = '';
    params.onProgress?.('Dreaming the next room locally…');

    const forceJson = Boolean(params.forceJson);
    let userContent = forceJson
      ? `${params.user}\n\nReturn only one JSON object. No markdown or reasoning.`
      : params.user;
    if (/qwen3/i.test(id)) userContent += '\n/no_think';

    type NonStream = {
      choices?: Array<{
        finish_reason?: string | null;
        message?: { content?: string | null };
        text?: string;
      }>;
    };

    try {
      const request: Record<string, unknown> = {
        messages: [
          { role: 'system', content: params.system },
          { role: 'user', content: userContent },
        ],
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        repetition_penalty: 1.18,
        frequency_penalty: 0.35,
        presence_penalty: 0.15,
        stream: false,
      };
      const stopSequences = params.stopSequences ?? ['\n\n'];
      if (stopSequences.length) request.stop = stopSequences;

      const completion = (await activeEngine.generate(request)) as NonStream;

      const choice = completion.choices?.[0];
      const content = choice?.message?.content;
      const text =
        typeof content === 'string' && content.trim()
          ? content.trim()
          : choice?.text?.trim() || '';
      if (!text) throw new Error('Browser model returned empty content.');

      if (engine === activeEngine) state = 'ready';
      params.onProgress?.(
        choice?.finish_reason === 'length'
          ? 'Browser model response reached its token limit'
          : 'Browser room direction ready',
      );
      return normalizeModelText(text, forceJson);
    } catch (err) {
      const message = errorMessage(err);
      if (engine === activeEngine) {
        lastError = message;
        state = isFatalEngineError(message) ? 'error' : 'ready';
      }
      throw new Error(`Browser model failed: ${message}`);
    }
  });
}

/** Cancel active work immediately and release the worker/GPU. */
export function disposeBrowserEngine(): Promise<void> {
  pendingLoads.clear();
  cancelActiveLoad?.(new Error('Browser model load cancelled.'));
  cancelActiveLoad = null;
  loadingClient?.terminate('Browser model load cancelled.');
  loadingClient = null;
  engine?.interruptGenerate();
  engine?.terminate('Browser model session ended.');
  engine = null;
  loadedModelId = '';
  loadingModelId = '';
  lastError = '';
  state = 'idle';
  return enqueueOperation(async () => undefined);
}

export function getBrowserEngineStatus(): {
  loaded: boolean;
  modelId: string;
  loadingModelId: string;
  state: EngineState;
  error?: string;
} {
  return {
    loaded: Boolean(engine && loadedModelId),
    modelId: loadedModelId,
    loadingModelId,
    state,
    ...(lastError ? { error: lastError } : {}),
  };
}

/** Stop an obsolete completion while keeping the loaded model available. */
export function interruptBrowserGeneration(): void {
  engine?.interruptGenerate();
}

async function loadModelNow(
  id: string,
  onProgress?: ProgressCb,
): Promise<BrowserWorkerClient> {
  const gpu = getWebGpuStatus();
  if (!gpu.available) throw new Error(gpu.reason || 'WebGPU is required for browser models.');
  if (engine && loadedModelId === id && state !== 'error') return engine;

  await unloadNow();
  state = 'loading';
  loadingModelId = id;
  lastError = '';
  onProgress?.(`Loading ${id} (first run downloads model weights)…`);

  const nextWorker = new Worker(new URL('./webllm.worker.ts', import.meta.url), {
    type: 'module',
    name: 'kettermean-webllm',
  });
  const nextClient = createBrowserWorkerClient(nextWorker);
  loadingClient = nextClient;

  let cancelLoad!: (reason: Error) => void;
  const cancelled = new Promise<never>((_, reject) => {
    cancelLoad = reject;
  });
  cancelActiveLoad = cancelLoad;

  try {
    await Promise.race([
      nextClient.load(id, (text) => onProgress?.(text)),
      cancelled,
    ]);
    if (loadingClient !== nextClient) {
      nextClient.terminate('Browser model load cancelled.');
      throw new Error('Browser model load cancelled.');
    }
    loadingClient = null;
    engine = nextClient;
    loadedModelId = id;
    loadingModelId = '';
    state = 'ready';
    onProgress?.('Browser model ready');
    return nextClient;
  } catch (err) {
    const ownsLoad = loadingClient === nextClient;
    nextClient.terminate('Browser model failed to load.');
    if (ownsLoad) {
      loadingClient = null;
      loadingModelId = '';
      state = 'error';
      lastError = errorMessage(err);
    }
    throw err;
  } finally {
    if (cancelActiveLoad === cancelLoad) cancelActiveLoad = null;
  }
}

async function unloadNow(): Promise<void> {
  const previous = engine;
  engine = null;
  loadedModelId = '';
  loadingModelId = '';
  if (previous) {
    try {
      await previous.unload();
    } catch (err) {
      console.warn('[Kettermean] WebLLM unload failed; terminating worker.', err);
    } finally {
      previous.terminate();
    }
  }
  state = 'idle';
}

function enqueueOperation<T>(operation: () => Promise<T>): Promise<T> {
  const task = operationTail.then(operation, operation);
  operationTail = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

function normalizeModelText(text: string, forceJson: boolean): string {
  let normalized = text
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/<think>[\s\S]*$/gi, ' ')
    .replace(/<\/think>/gi, ' ')
    .trim();
  if (forceJson && normalized && !normalized.startsWith('{')) normalized = `{${normalized}`;
  return normalized;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isFatalEngineError(message: string): boolean {
  return /device\s*lost|out of memory|\boom\b|webgpu.*lost|worker.*crash/i.test(message);
}
