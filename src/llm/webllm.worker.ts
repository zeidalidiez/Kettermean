import { MLCEngine } from '@mlc-ai/web-llm';

type WorkerRequest =
  | { id: number; type: 'load'; modelId: string }
  | { id: number; type: 'generate'; request: unknown }
  | { id: number; type: 'unload' }
  | { id: number; type: 'interrupt' };

type WorkerResponse =
  | { id: number; type: 'progress'; text: string }
  | { id: number; type: 'result'; value: unknown }
  | { id: number; type: 'error'; error: string };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse) => void;
};

let engine: MLCEngine | null = null;

scope.onmessage = (event): void => {
  void handle(event.data);
};

async function handle(message: WorkerRequest): Promise<void> {
  try {
    switch (message.type) {
      case 'load': {
        if (engine) await engine.unload();
        engine = new MLCEngine({
          initProgressCallback: (report) => {
            post({
              id: message.id,
              type: 'progress',
              text: report?.text || `Loading ${message.modelId}…`,
            });
          },
        });
        await engine.reload(message.modelId);
        post({ id: message.id, type: 'result', value: null });
        break;
      }
      case 'generate': {
        if (!engine) throw new Error('Browser model is not loaded.');
        const completion = await engine.chat.completions.create(message.request as never);
        post({ id: message.id, type: 'result', value: completion });
        break;
      }
      case 'interrupt': {
        await engine?.interruptGenerate();
        break;
      }
      case 'unload': {
        await engine?.unload();
        engine = null;
        post({ id: message.id, type: 'result', value: null });
        break;
      }
    }
  } catch (err) {
    if (message.type === 'load') {
      try {
        await engine?.unload();
      } catch {
        // The host will terminate the worker after a failed load.
      }
      engine = null;
    }
    post({ id: message.id, type: 'error', error: errorMessage(err) });
  }
}

function post(message: WorkerResponse): void {
  scope.postMessage(message);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
