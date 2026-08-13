import { describe, expect, it, vi } from 'vitest';
import { createBrowserWorkerClient } from '../src/llm/browserWorkerClient';

class FakeWorker {
  terminate = vi.fn();
  listeners = new Map<string, Array<(event: MessageEvent) => void>>();
  posted: Array<Record<string, unknown>> = [];

  addEventListener(type: string, handler: (event: MessageEvent) => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(handler);
    this.listeners.set(type, list);
  }

  removeEventListener(type: string, handler: (event: MessageEvent) => void): void {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      list.filter((item) => item !== handler),
    );
  }

  postMessage(message: Record<string, unknown>): void {
    this.posted.push(message);
  }

  emit(type: 'message' | 'error', data?: unknown): void {
    for (const handler of this.listeners.get(type) ?? []) {
      handler({ data } as MessageEvent);
    }
  }

  lastPosted(): Record<string, unknown> {
    return this.posted[this.posted.length - 1]!;
  }
}

describe('browser worker client', () => {
  it('resolves a generate result and clears its timeout timer', async () => {
    const worker = new FakeWorker();
    const client = createBrowserWorkerClient(worker, 60_000);

    const promise = client.generate({ messages: [] });
    const message = worker.lastPosted();

    worker.emit('message', { id: message.id, type: 'result', value: { ok: true } });

    await expect(promise).resolves.toEqual({ ok: true });
    expect(worker.terminate).not.toHaveBeenCalled();
  });

  it('rejects and interrupts when generate exceeds the timeout', async () => {
    vi.useFakeTimers();
    try {
      const worker = new FakeWorker();
      const client = createBrowserWorkerClient(worker, 500);

    const promise = client.generate({ messages: [] });
    void worker.lastPosted();

    vi.advanceTimersByTime(501);

      await expect(promise).rejects.toThrow('timed out after 500ms');
      expect(worker.lastPosted()).toEqual({ id: 0, type: 'interrupt' });
      expect(worker.terminate).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('never times out model loads, even with a timeout configured', async () => {
    const worker = new FakeWorker();
    const client = createBrowserWorkerClient(worker, 500);

    const promise = client.load('model-a');
    const message = worker.lastPosted();

    worker.emit('message', { id: message.id, type: 'result', value: null });

    await expect(promise).resolves.toBeNull();
  });
});
