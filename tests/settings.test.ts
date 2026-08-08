import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../src/config';
import { loadSettings, saveSettings } from '../src/core/settings';
import type { AppSettings } from '../src/types';
import { memoryStorage } from './storage';

describe('settings persistence', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('validates corrupted stored settings and migrates persistent keys to the session', () => {
    const local = memoryStorage({
      [STORAGE_KEYS.settings]: JSON.stringify({
        mode: 'broken',
        provider: 'bogus',
        apiKey: 'legacy-key',
        baseUrl: 'javascript:alert(1)',
        model: 42,
        allowGore: 'yes',
      }),
    });
    const session = memoryStorage();
    vi.stubGlobal('localStorage', local);
    vi.stubGlobal('sessionStorage', session);

    const loaded = loadSettings();
    expect(loaded.mode).toBe('random');
    expect(loaded.provider).toBe('offline');
    expect(loaded.baseUrl).toMatch(/^https:/);
    expect(loaded.allowGore).toBe(false);
    expect(loaded.apiKey).toBe('legacy-key');
    expect(local.getItem(STORAGE_KEYS.settings)).not.toContain('legacy-key');
  });

  it('stores API keys only in sessionStorage', () => {
    const local = memoryStorage();
    const session = memoryStorage();
    vi.stubGlobal('localStorage', local);
    vi.stubGlobal('sessionStorage', session);
    const value: AppSettings = {
      mode: 'random',
      seed: 'safe',
      provider: 'openai',
      apiKey: 'temporary-key',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'openrouter/free',
      allowGore: false,
    };

    saveSettings(value);
    expect(local.getItem(STORAGE_KEYS.settings)).not.toContain('temporary-key');
    expect(session.getItem(STORAGE_KEYS.sessionApiKey)).toBe('temporary-key');
  });

  it('keeps working when browser storage is disabled', () => {
    const blocked = {
      getItem: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
      removeItem: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
    };
    vi.stubGlobal('localStorage', blocked);
    vi.stubGlobal('sessionStorage', blocked);

    expect(loadSettings()).toMatchObject({ provider: 'offline', apiKey: '' });
    expect(() => saveSettings({
      mode: 'random',
      seed: 'memory-only',
      provider: 'offline',
      apiKey: '',
      baseUrl: 'https://example.test/v1',
      model: 'model',
      allowGore: false,
    })).not.toThrow();
  });
});
