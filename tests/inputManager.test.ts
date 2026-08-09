import { describe, expect, it, vi } from 'vitest';
import { requestPointerLockIfSupported } from '../src/input/InputManager';

describe('pointer lock compatibility', () => {
  it('does nothing when a touch browser does not implement Pointer Lock', () => {
    expect(() => requestPointerLockIfSupported({})).not.toThrow();
  });

  it('absorbs synchronous policy failures and rejected requests', async () => {
    const syncFailure = {
      requestPointerLock: vi.fn(() => {
        throw new Error('not allowed');
      }),
    };
    expect(() => requestPointerLockIfSupported(syncFailure)).not.toThrow();

    const asyncFailure = {
      requestPointerLock: vi.fn(() => Promise.reject(new Error('denied'))),
    };
    requestPointerLockIfSupported(asyncFailure);
    await Promise.resolve();

    expect(syncFailure.requestPointerLock).toHaveBeenCalledOnce();
    expect(asyncFailure.requestPointerLock).toHaveBeenCalledOnce();
  });
});
