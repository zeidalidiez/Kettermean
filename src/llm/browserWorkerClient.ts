type WorkerCommand =
  | { type: 'load'; modelId: string }
  | { type: 'generate'; request: unknown }
  | { type: 'unload' }
  | { type: 'interrupt' };

type WorkerRequest = WorkerCommand & { id: number };

type WorkerResponse =
  | { id: number; type: 'progress'; text: string }
  | { id: number; type: 'result'; value: unknown }
  | { id: number; type: 'error'; error: string };

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  onProgress?: (text: string) => void;
  timer?: ReturnType<typeof setTimeout>;
}

export interface BrowserWorkerClient {
  load(modelId: string, onProgress?: (text: string) => void): Promise<void>;
  generate(request: unknown): Promise<unknown>;
  interruptGenerate(): void;
  unload(): Promise<void>;
  terminate(reason?: string): void;
}

/**
 * @param requestTimeoutMs Optional per-request timeout for inference only.
 * Model loads are deliberately excluded: first-run weight downloads and shader
 * compilation can legitimately take several minutes. A hung generate must not
 * block the serialized engine queue forever, so on timeout the request is
 * rejected and the worker is told to interrupt its current completion.
 */
export function createBrowserWorkerClient(
  worker: Worker,
  requestTimeoutMs?: number,
): BrowserWorkerClient {
  let nextId = 1;
  let terminated = false;
  let terminationReason = 'WebLLM worker terminated.';
  const pending = new Map<number, PendingRequest>();

  const onMessage = (event: MessageEvent<WorkerResponse>): void => {
    const message = event.data;
    const request = pending.get(message.id);
    if (!request) return;
    if (message.type === 'progress') {
      request.onProgress?.(message.text);
      return;
    }
    pending.delete(message.id);
    if (request.timer) clearTimeout(request.timer);
    if (message.type === 'error') request.reject(new Error(message.error));
    else request.resolve(message.value);
  };

  const rejectAll = (message: string): void => {
    for (const item of pending.values()) item.reject(new Error(message));
    pending.clear();
  };

  const shutDown = (reason: string): void => {
    if (terminated) return;
    terminated = true;
    terminationReason = reason;
    rejectAll(reason);
    worker.removeEventListener('message', onMessage);
    worker.removeEventListener('error', onError);
    worker.terminate();
  };

  const onError = (event: ErrorEvent): void => {
    shutDown(event.message || 'WebLLM worker crashed.');
  };

  worker.addEventListener('message', onMessage);
  worker.addEventListener('error', onError);

  const request = <T>(
    message: WorkerCommand,
    onProgress?: (text: string) => void,
    timeoutMs?: number,
  ): Promise<T> => {
    if (terminated) return Promise.reject(new Error(terminationReason));
    const id = nextId;
    nextId += 1;
    return new Promise<T>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const pendingRequest: PendingRequest = {
        resolve: (value) => resolve(value as T),
        reject,
        onProgress,
      };
      if (timeoutMs && timeoutMs > 0) {
        timer = setTimeout(() => {
          pending.delete(id);
          // Ask the worker to abandon the stalled completion so the next
          // queued inference is not blocked behind a hung generation.
          try {
            worker.postMessage({ id: 0, type: 'interrupt' } satisfies WorkerRequest);
          } catch {
            // A dead worker surfaces via its error event; nothing left to do.
          }
          reject(new Error(`Browser model request timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
        pendingRequest.timer = timer;
      }
      pending.set(id, pendingRequest);
      try {
        worker.postMessage({ ...message, id } satisfies WorkerRequest);
      } catch (err) {
        if (timer) clearTimeout(timer);
        pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  };

  return {
    load: (modelId, onProgress) => request<void>({ type: 'load', modelId }, onProgress),
    generate: (completionRequest) =>
      request<unknown>(
        { type: 'generate', request: completionRequest },
        undefined,
        requestTimeoutMs,
      ),
    interruptGenerate: () => {
      if (!terminated) {
        worker.postMessage({ id: 0, type: 'interrupt' } satisfies WorkerRequest);
      }
    },
    unload: () => request<void>({ type: 'unload' }),
    terminate: (reason = 'WebLLM worker terminated.') => shutDown(reason),
  };
}
