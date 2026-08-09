import {
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_BROWSER_MODEL,
  DEFAULT_OPENAI_BASE,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  STORAGE_KEYS,
} from '../config';
import type { AppSettings, DreamMode, LlmProvider } from '../types';
import { randomSeed } from './rng';

const MODES = new Set<DreamMode>(['random', 'seeded']);
const PROVIDERS = new Set<LlmProvider>(['offline', 'openai', 'anthropic', 'browser']);
const BROWSER_MODEL_DEFAULTS_REVISION = 2;
const LEGACY_BROWSER_DEFAULTS = new Set([
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
]);

export function defaultSettings(): AppSettings {
  return {
    mode: 'random',
    seed: randomSeed(),
    provider: 'offline',
    apiKey: '',
    baseUrl: DEFAULT_OPENAI_BASE,
    model: DEFAULT_OPENAI_MODEL,
    allowGore: false,
    noFlashingLights: false,
    noLowLight: false,
  };
}

export function loadSettings(): AppSettings {
  const defaults = defaultSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return { ...defaults, apiKey: readSessionKey() };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      removePersistentSettings();
      return { ...defaults, apiKey: readSessionKey() };
    }

    // Migrate legacy persistent keys into this tab only, then scrub localStorage.
    const legacyKey = cleanString(parsed.apiKey, '', 512);
    if (legacyKey && !readSessionKey()) writeSessionKey(legacyKey);

    const provider = isProvider(parsed.provider) ? parsed.provider : defaults.provider;
    const storedModel = cleanString(parsed.model, defaults.model, 180);
    const needsBrowserDefaultsRevision =
      provider === 'browser' &&
      parsed.browserModelDefaultsRevision !== BROWSER_MODEL_DEFAULTS_REVISION;
    const model =
      needsBrowserDefaultsRevision && LEGACY_BROWSER_DEFAULTS.has(storedModel)
        ? DEFAULT_BROWSER_MODEL
        : storedModel;

    const settings: AppSettings = {
      mode: isMode(parsed.mode) ? parsed.mode : defaults.mode,
      seed: cleanString(parsed.seed, defaults.seed, 120),
      provider,
      apiKey: readSessionKey(),
      baseUrl: cleanBaseUrl(parsed.baseUrl, defaults.baseUrl),
      model,
      allowGore: parsed.allowGore === true,
      noFlashingLights: parsed.noFlashingLights === true,
      noLowLight: parsed.noLowLight === true,
    };

    if ('apiKey' in parsed) {
      // Remove first so a quota error cannot leave the legacy secret behind.
      removePersistentSettings();
    }
    if ('apiKey' in parsed || needsBrowserDefaultsRevision) {
      persistNonSecretSettings(settings);
    }
    return settings;
  } catch {
    removePersistentSettings();
    return { ...defaults, apiKey: readSessionKey() };
  }
}

export function saveSettings(settings: AppSettings): void {
  persistNonSecretSettings(settings);
  if (settings.apiKey.trim()) {
    writeSessionKey(settings.apiKey.trim());
  } else {
    removeSessionKey();
  }
}

export function clearApiKey(settings: AppSettings): AppSettings {
  removeSessionKey();
  const next = { ...settings, apiKey: '' };
  persistNonSecretSettings(next);
  return next;
}

export function modelForProvider(provider: AppSettings['provider'], current: string): string {
  if (provider === 'anthropic') {
    return current.includes('claude') ? current : DEFAULT_ANTHROPIC_MODEL;
  }
  if (provider === 'openai') {
    if (!current.trim()) return DEFAULT_OPENROUTER_MODEL;
    if (current.includes('claude')) return DEFAULT_OPENAI_MODEL;
    return current;
  }
  if (provider === 'browser') {
    if (
      !current.trim() ||
      current.includes('openrouter') ||
      current.includes('claude') ||
      current.includes('gpt-') ||
      current.includes('/')
    ) {
      return DEFAULT_BROWSER_MODEL;
    }
    return current;
  }
  return current;
}

function persistNonSecretSettings(settings: AppSettings): void {
  const persistent = {
    mode: settings.mode,
    seed: settings.seed,
    provider: settings.provider,
    baseUrl: settings.baseUrl,
    model: settings.model,
    browserModelDefaultsRevision: BROWSER_MODEL_DEFAULTS_REVISION,
    allowGore: settings.allowGore,
    noFlashingLights: settings.noFlashingLights,
    noLowLight: settings.noLowLight,
  };
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(persistent));
  } catch {
    // Storage can be disabled by browser privacy policy. The in-memory settings
    // still work for the current page.
  }
}

function removePersistentSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.settings);
  } catch {
    // Storage is unavailable; there is no writable persistence surface to scrub.
  }
}

function readSessionKey(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.sessionApiKey)?.trim() || '';
  } catch {
    return '';
  }
}

function writeSessionKey(value: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.sessionApiKey, value);
  } catch {
    // Keep the key only in the current in-memory settings when storage is blocked.
  }
}

function removeSessionKey(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.sessionApiKey);
  } catch {
    // Nothing persistent can remain when session storage itself is unavailable.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isMode(value: unknown): value is DreamMode {
  return typeof value === 'string' && MODES.has(value as DreamMode);
}

function isProvider(value: unknown): value is LlmProvider {
  return typeof value === 'string' && PROVIDERS.has(value as LlmProvider);
}

function cleanString(value: unknown, fallback: string, maxLength: number): string {
  return typeof value === 'string' && value.trim()
    ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength)
    : fallback;
}

function cleanBaseUrl(value: unknown, fallback: string): string {
  const candidate = cleanString(value, fallback, 300);
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString().replace(/\/$/, '') : fallback;
  } catch {
    return fallback;
  }
}
