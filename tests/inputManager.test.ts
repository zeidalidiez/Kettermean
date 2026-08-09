import { describe, expect, it, vi } from 'vitest';
import {
  isFlashlightKey,
  isNextDreamKey,
  requestPointerLockIfSupported,
} from '../src/input/InputManager';

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

describe('next dream keyboard shortcut', () => {
  it('accepts a fresh R press and rejects repeats or unrelated keys', () => {
    expect(isNextDreamKey({ code: 'KeyR', repeat: false })).toBe(true);
    expect(isNextDreamKey({ code: 'KeyR', repeat: true })).toBe(false);
    expect(isNextDreamKey({ code: 'Space', repeat: false })).toBe(false);
  });
});

describe('flashlight keyboard shortcut', () => {
  it('accepts a fresh F press and rejects repeats or unrelated keys', () => {
    expect(isFlashlightKey({ code: 'KeyF', repeat: false })).toBe(true);
    expect(isFlashlightKey({ code: 'KeyF', repeat: true })).toBe(false);
    expect(isFlashlightKey({ code: 'KeyR', repeat: false })).toBe(false);
  });
});
