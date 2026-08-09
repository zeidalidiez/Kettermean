import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_BROWSER_MODEL, STORAGE_KEYS } from '../src/config';
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

  it('moves the former browser default to the lightweight model once', () => {
    const local = memoryStorage({
      [STORAGE_KEYS.settings]: JSON.stringify({
        mode: 'seeded',
        seed: 'migrate-browser-default',
        provider: 'browser',
        baseUrl: 'https://example.test/v1',
        model: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
        allowGore: false,
      }),
    });
    vi.stubGlobal('localStorage', local);
    vi.stubGlobal('sessionStorage', memoryStorage());

    expect(loadSettings().model).toBe(DEFAULT_BROWSER_MODEL);
    expect(JSON.parse(local.getItem(STORAGE_KEYS.settings) ?? '{}')).toMatchObject({
      model: DEFAULT_BROWSER_MODEL,
      browserModelDefaultsRevision: 2,
    });
  });

  it('preserves an explicitly saved 1.5B browser model', () => {
    const local = memoryStorage();
    vi.stubGlobal('localStorage', local);
    vi.stubGlobal('sessionStorage', memoryStorage());
    const explicit: AppSettings = {
      mode: 'seeded',
      seed: 'explicit-browser-model',
      provider: 'browser',
      apiKey: '',
      baseUrl: 'https://example.test/v1',
      model: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
      allowGore: false,
    };

    saveSettings(explicit);
    expect(loadSettings().model).toBe(explicit.model);
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
