import {
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_BROWSER_MODEL,
  DEFAULT_OPENAI_BASE,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  STORAGE_KEYS,
} from '../config';
import type { AppSettings } from '../types';
import { randomSeed } from './rng';

export function defaultSettings(): AppSettings {
  return {
    mode: 'random',
    seed: randomSeed(),
    provider: 'offline',
    apiKey: '',
    baseUrl: DEFAULT_OPENAI_BASE,
    model: DEFAULT_OPENAI_MODEL,
    allowGore: false,
  };
}

export function loadSettings(): AppSettings {
  const defaults = defaultSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...defaults,
      ...parsed,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      allowGore: Boolean(parsed.allowGore),
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: AppSettings): void {
  const toStore: AppSettings = {
    ...settings,
    // Keep key local-only; still stored in localStorage by design with UI warning.
    apiKey: settings.apiKey,
  };
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(toStore));
}

export function clearApiKey(settings: AppSettings): AppSettings {
  const next = { ...settings, apiKey: '' };
  saveSettings(next);
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
      // Migrate older default away from Qwen2.5 if user never customized.
      current === 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
    ) {
      return DEFAULT_BROWSER_MODEL;
    }
    return current;
  }
  return current;
}
