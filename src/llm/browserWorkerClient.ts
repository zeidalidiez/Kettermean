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
}

export interface BrowserWorkerClient {
  load(modelId: string, onProgress?: (text: string) => void): Promise<void>;
  generate(request: unknown): Promise<unknown>;
  interruptGenerate(): void;
  unload(): Promise<void>;
  terminate(reason?: string): void;
}

export function createBrowserWorkerClient(worker: Worker): BrowserWorkerClient {
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
  ): Promise<T> => {
    if (terminated) return Promise.reject(new Error(terminationReason));
    const id = nextId;
    nextId += 1;
    return new Promise<T>((resolve, reject) => {
      pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        onProgress,
      });
      try {
        worker.postMessage({ ...message, id } satisfies WorkerRequest);
      } catch (err) {
        pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  };

  return {
    load: (modelId, onProgress) => request<void>({ type: 'load', modelId }, onProgress),
    generate: (completionRequest) =>
      request<unknown>({ type: 'generate', request: completionRequest }),
    interruptGenerate: () => {
      if (!terminated) {
        worker.postMessage({ id: 0, type: 'interrupt' } satisfies WorkerRequest);
      }
    },
    unload: () => request<void>({ type: 'unload' }),
    terminate: (reason = 'WebLLM worker terminated.') => shutDown(reason),
  };
}
