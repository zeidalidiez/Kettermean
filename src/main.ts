import {
  DEFAULT_ANTHROPIC_BASE,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OPENAI_BASE,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENROUTER_BASE,
  DEFAULT_OPENROUTER_MODEL,
} from './config';
import { clearApiKey, loadSettings, modelForProvider, saveSettings } from './core/settings';
import { DreamGame } from './game/DreamGame';
import type { AppSettings, DreamMode, LlmProvider } from './types';

const settings = loadSettings();
const game = new DreamGame(settings);

const modeSelect = qs<HTMLSelectElement>('mode-select');
const seedInput = qs<HTMLInputElement>('seed-input');
const seedField = qs<HTMLElement>('seed-field');
const providerSelect = qs<HTMLSelectElement>('provider-select');
const apiKeyInput = qs<HTMLInputElement>('api-key-input');
const baseUrlInput = qs<HTMLInputElement>('base-url-input');
const modelInput = qs<HTMLInputElement>('model-input');
const goreToggle = qs<HTMLInputElement>('gore-toggle');
const startBtn = qs<HTMLButtonElement>('start-btn');
const clearKeyBtn = qs<HTMLButtonElement>('clear-key-btn');
const resumeBtn = qs<HTMLButtonElement>('resume-btn');
const quitBtn = qs<HTMLButtonElement>('quit-btn');

function applyForm(s: AppSettings): void {
  modeSelect.value = s.mode;
  seedInput.value = s.seed;
  providerSelect.value = s.provider;
  apiKeyInput.value = s.apiKey;
  baseUrlInput.value = s.baseUrl;
  modelInput.value = s.model;
  goreToggle.checked = s.allowGore;
  syncModeUi();
  syncProviderUi();
}

function readForm(): AppSettings {
  const provider = providerSelect.value as LlmProvider;
  return {
    mode: modeSelect.value as DreamMode,
    seed: seedInput.value.trim(),
    provider,
    apiKey: apiKeyInput.value.trim(),
    baseUrl: baseUrlInput.value.trim(),
    model: modelInput.value.trim(),
    allowGore: goreToggle.checked,
  };
}

function syncModeUi(): void {
  const seeded = modeSelect.value === 'seeded';
  seedField.style.opacity = seeded ? '1' : '0.55';
  seedInput.disabled = !seeded;
}

function syncProviderUi(): void {
  const provider = providerSelect.value as LlmProvider;
  const offline = provider === 'offline';
  apiKeyInput.disabled = offline;
  baseUrlInput.disabled = offline;
  modelInput.disabled = offline;

  if (provider === 'openai') {
    // Prefer OpenRouter as the practical browser-friendly default.
    if (
      !baseUrlInput.value ||
      baseUrlInput.value.includes('api.openai.com') ||
      baseUrlInput.value.includes('anthropic.com')
    ) {
      baseUrlInput.value = DEFAULT_OPENROUTER_BASE;
    }
    if (
      !modelInput.value ||
      modelInput.value.includes('claude') ||
      modelInput.value === DEFAULT_OPENAI_MODEL ||
      modelInput.value.includes('ling-3.0') ||
      modelInput.value.includes('inclusionai/')
    ) {
      modelInput.value = DEFAULT_OPENROUTER_MODEL;
    }
    baseUrlInput.placeholder = DEFAULT_OPENROUTER_BASE;
    modelInput.placeholder = DEFAULT_OPENROUTER_MODEL;
  }
  if (provider === 'anthropic') {
    if (!baseUrlInput.value || baseUrlInput.value.includes('openai') || baseUrlInput.value.includes('openrouter')) {
      baseUrlInput.value = DEFAULT_ANTHROPIC_BASE;
    }
    if (!modelInput.value.includes('claude')) {
      modelInput.value = DEFAULT_ANTHROPIC_MODEL;
    }
    baseUrlInput.placeholder = DEFAULT_ANTHROPIC_BASE;
    modelInput.placeholder = DEFAULT_ANTHROPIC_MODEL;
  }
  if (provider === 'offline') {
    baseUrlInput.placeholder = DEFAULT_OPENAI_BASE;
    modelInput.placeholder = DEFAULT_OPENAI_MODEL;
  }
  modelInput.value = modelForProvider(provider, modelInput.value);
}

modeSelect.addEventListener('change', syncModeUi);
providerSelect.addEventListener('change', syncProviderUi);

startBtn.addEventListener('click', () => {
  const next = readForm();
  if (next.mode === 'seeded' && !next.seed) {
    alert('Enter a seed for seeded mode, or switch to randomized.');
    return;
  }
  if (next.provider !== 'offline' && !next.apiKey) {
    const ok = confirm('No API key entered. Continue with offline procedural rooms?');
    if (!ok) return;
    next.provider = 'offline';
    providerSelect.value = 'offline';
  }
  saveSettings(next);
  game.updateSettings(next);
  void game.start();
});

clearKeyBtn.addEventListener('click', () => {
  const next = clearApiKey(readForm());
  apiKeyInput.value = '';
  game.updateSettings(next);
});

resumeBtn.addEventListener('click', () => game.resume());
quitBtn.addEventListener('click', () => game.quitToMenu());

applyForm(settings);

function qs<T extends HTMLElement>(id: string): T {
  const n = document.getElementById(id);
  if (!n) throw new Error(`#${id} missing`);
  return n as T;
}
