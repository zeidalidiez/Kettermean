import {
  BROWSER_MODEL_OPTIONS,
  DEFAULT_ANTHROPIC_BASE,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_BROWSER_MODEL,
  DEFAULT_OPENAI_BASE,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENROUTER_BASE,
  DEFAULT_OPENROUTER_MODEL,
} from './config';
import { getWebGpuStatus, isWebGpuAvailable } from './llm/browserEngine';
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
const browserModelSelect = qs<HTMLSelectElement>('browser-model-select');
const modelFieldBrowser = qs<HTMLElement>('model-field-browser');
const modelFieldCloud = qs<HTMLElement>('model-field-cloud');
const goreToggle = qs<HTMLInputElement>('gore-toggle');
const startBtn = qs<HTMLButtonElement>('start-btn');
const clearKeyBtn = qs<HTMLButtonElement>('clear-key-btn');
const resumeBtn = qs<HTMLButtonElement>('resume-btn');
const quitBtn = qs<HTMLButtonElement>('quit-btn');

fillBrowserModelSelect();

function applyForm(s: AppSettings): void {
  modeSelect.value = s.mode;
  seedInput.value = s.seed;
  providerSelect.value = s.provider;
  apiKeyInput.value = s.apiKey;
  baseUrlInput.value = s.baseUrl;
  modelInput.value = s.model;
  setBrowserModelValue(s.model);
  goreToggle.checked = s.allowGore;
  syncModeUi();
  syncProviderUi();
}

function readForm(): AppSettings {
  const provider = providerSelect.value as LlmProvider;
  const model =
    provider === 'browser'
      ? browserModelSelect.value || DEFAULT_BROWSER_MODEL
      : modelInput.value.trim();
  return {
    mode: modeSelect.value as DreamMode,
    seed: seedInput.value.trim(),
    provider,
    apiKey: apiKeyInput.value.trim(),
    baseUrl: baseUrlInput.value.trim(),
    model,
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
  const browser = provider === 'browser';
  apiKeyInput.disabled = offline || browser;
  baseUrlInput.disabled = offline || browser;
  modelInput.disabled = offline;
  browserModelSelect.disabled = offline;

  modelFieldBrowser.classList.toggle('hidden', !browser);
  modelFieldCloud.classList.toggle('hidden', browser || offline);
  if (offline) modelFieldCloud.classList.add('hidden');

  const help = document.getElementById('provider-help');

  if (provider === 'openai') {
    if (
      !baseUrlInput.value ||
      baseUrlInput.value.includes('api.openai.com') ||
      baseUrlInput.value.includes('anthropic.com')
    ) {
      baseUrlInput.value = DEFAULT_OPENROUTER_BASE;
    }
    modelInput.value = modelForProvider('openai', modelInput.value);
    baseUrlInput.placeholder = DEFAULT_OPENROUTER_BASE;
    modelInput.placeholder = DEFAULT_OPENROUTER_MODEL;
    if (help) {
      help.textContent =
        'OpenAI-compatible works with OpenRouter. Example base https://openrouter.ai/api/v1.';
    }
  }
  if (provider === 'anthropic') {
    if (!baseUrlInput.value || baseUrlInput.value.includes('openai') || baseUrlInput.value.includes('openrouter')) {
      baseUrlInput.value = DEFAULT_ANTHROPIC_BASE;
    }
    modelInput.value = modelForProvider('anthropic', modelInput.value);
    baseUrlInput.placeholder = DEFAULT_ANTHROPIC_BASE;
    modelInput.placeholder = DEFAULT_ANTHROPIC_MODEL;
    if (help) help.textContent = 'Anthropic browser calls often need a CORS proxy.';
  }
  if (provider === 'browser') {
    const chosen = modelForProvider('browser', browserModelSelect.value || modelInput.value);
    setBrowserModelValue(chosen);
    if (help) {
      const gpu = getWebGpuStatus();
      help.textContent = gpu.available
        ? 'Local WebLLM via WebGPU (no API key). Use the dropdown — first run downloads weights, then caches.'
        : gpu.reason || 'WebGPU not available.';
    }
  }
  if (provider === 'offline') {
    baseUrlInput.placeholder = DEFAULT_OPENAI_BASE;
    modelInput.placeholder = DEFAULT_OPENAI_MODEL;
    if (help) help.textContent = 'Fully local procedural rooms. No network, no model download.';
  }
}

modeSelect.addEventListener('change', syncModeUi);
providerSelect.addEventListener('change', syncProviderUi);

startBtn.addEventListener('click', () => {
  const next = readForm();
  if (next.mode === 'seeded' && !next.seed) {
    alert('Enter a seed for seeded mode, or switch to randomized.');
    return;
  }
  if ((next.provider === 'openai' || next.provider === 'anthropic') && !next.apiKey) {
    const ok = confirm('No API key entered. Continue with offline procedural rooms?');
    if (!ok) return;
    next.provider = 'offline';
    providerSelect.value = 'offline';
  }
  if (next.provider === 'browser' && !isWebGpuAvailable()) {
    const gpu = getWebGpuStatus();
    alert(gpu.reason || 'WebGPU is required for browser models.');
    return;
  }
  saveSettings(next);
  game.updateSettings(next);
  void game.start();
});

function fillBrowserModelSelect(): void {
  // Keep config order; assign each id to exactly one group.
  const groupDefs: Array<{ label: string; test: (id: string) => boolean }> = [
    {
      label: 'Tiny / fast',
      test: (id) => /360M|0\.5B|0\.6B|TinyLlama/i.test(id),
    },
    {
      label: '~1B class',
      test: (id) => /1\.5B|1\.7B|gemma3-1b|Llama-3\.2-1B|OLMo-2.*1B|SmolLM2-1\.7B/i.test(id),
    },
    {
      label: 'Stronger small (more VRAM)',
      test: () => true,
    },
  ];

  const buckets = new Map<string, string[]>();
  for (const g of groupDefs) buckets.set(g.label, []);

  const fallback = groupDefs[groupDefs.length - 1]!;
  for (const id of BROWSER_MODEL_OPTIONS) {
    const group = groupDefs.find((g) => g.test(id)) ?? fallback;
    buckets.get(group.label)!.push(id);
  }

  browserModelSelect.replaceChildren();
  for (const g of groupDefs) {
    const ids = buckets.get(g.label) ?? [];
    if (!ids.length) continue;
    const og = document.createElement('optgroup');
    og.label = g.label;
    for (const id of ids) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = prettyModelLabel(id);
      og.appendChild(opt);
    }
    browserModelSelect.appendChild(og);
  }
  setBrowserModelValue(DEFAULT_BROWSER_MODEL);
}

function setBrowserModelValue(modelId: string): void {
  const id = modelId.trim() || DEFAULT_BROWSER_MODEL;
  const match = [...browserModelSelect.options].some((o) => o.value === id);
  browserModelSelect.value = match ? id : DEFAULT_BROWSER_MODEL;
}

function prettyModelLabel(id: string): string {
  return id.replace(/-q4f16_1-MLC$/i, '').replace(/-MLC$/i, '');
}

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
