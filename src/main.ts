import {
  DEFAULT_ANTHROPIC_BASE,
  DEFAULT_ANTHROPIC_MODEL,
  BROWSER_MODEL_DEPTH_GROUPS,
  DEFAULT_BROWSER_MODEL,
  DEFAULT_OPENAI_BASE,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENROUTER_BASE,
  DEFAULT_OPENROUTER_MODEL,
} from './config';
import { getWebGpuStatus, isWebGpuAvailable } from './llm/browserEngine';
import { clearApiKey, loadSettings, modelForProvider, saveSettings } from './core/settings';
import { DreamGame } from './game/DreamGame';
import type { AiDepth, AppSettings, DreamMode, LlmProvider } from './types';

const AI_DEPTHS: readonly AiDepth[] = ['light', 'standard', 'deep'];
const AI_DEPTH_COPY: Record<AiDepth, { label: string; note: string }> = {
  light: {
    label: 'Light · quickest',
    note: 'One compact direction pass. The local director safely fills every other field.',
  },
  standard: {
    label: 'Standard · balanced',
    note: 'Adds authored room language while the next dream forms in the background.',
  },
  deep: {
    label: 'Deep · most authored',
    note: 'Adds another focused pass for signs, inhabitants, and the room\'s strange rule.',
  },
};

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
const apiKeyField = qs<HTMLElement>('api-key-field');
const baseUrlField = qs<HTMLElement>('base-url-field');
const aiProviderStatus = qs<HTMLElement>('ai-provider-status');
const aiModelStatus = qs<HTMLElement>('ai-model-status');
const aiDepthInput = qs<HTMLInputElement>('ai-depth-input');
const aiDepthValue = qs<HTMLOutputElement>('ai-depth-value');
const aiDepthNote = qs<HTMLElement>('ai-depth-note');
const goreToggle = qs<HTMLInputElement>('gore-toggle');
const noFlashingToggle = qs<HTMLInputElement>('no-flashing-toggle');
const noLowLightToggle = qs<HTMLInputElement>('no-low-light-toggle');
const startBtn = qs<HTMLButtonElement>('start-btn');
const contentWarning = qs<HTMLDialogElement>('content-warning');
const contentWarningContinue = qs<HTMLButtonElement>('content-warning-continue');
const contentWarningBack = qs<HTMLButtonElement>('content-warning-back');
const clearKeyBtn = qs<HTMLButtonElement>('clear-key-btn');
const resumeBtn = qs<HTMLButtonElement>('resume-btn');
const quitBtn = qs<HTMLButtonElement>('quit-btn');
let contentWarningAcknowledged = false;
let pendingStartSettings: AppSettings | null = null;

populateBrowserModelOptions();

function applyForm(s: AppSettings): void {
  modeSelect.value = s.mode;
  seedInput.value = s.seed;
  providerSelect.value = s.provider;
  apiKeyInput.value = s.apiKey;
  baseUrlInput.value = s.baseUrl;
  modelInput.value = s.model;
  setBrowserModelValue(s.model);
  setAiDepthValue(s.aiDepth);
  goreToggle.checked = s.allowGore;
  noFlashingToggle.checked = s.noFlashingLights;
  noLowLightToggle.checked = s.noLowLight;
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
    aiDepth: readAiDepth(),
    allowGore: goreToggle.checked,
    noFlashingLights: noFlashingToggle.checked,
    noLowLight: noLowLightToggle.checked,
  };
}

function syncModeUi(): void {
  const seeded = modeSelect.value === 'seeded';
  seedField.style.opacity = seeded ? '1' : '0.55';
  seedInput.disabled = !seeded;
}

function setModelFieldsVisible(provider: LlmProvider): void {
  const browser = provider === 'browser';
  const cloud = provider === 'openai' || provider === 'anthropic';
  // Explicit show/hide — avoid toggle races if class state drifts.
  if (browser) modelFieldBrowser.classList.remove('hidden');
  else modelFieldBrowser.classList.add('hidden');
  if (cloud) modelFieldCloud.classList.remove('hidden');
  else modelFieldCloud.classList.add('hidden');
}

function syncProviderUi(): void {
  const provider = providerSelect.value as LlmProvider;
  const browser = provider === 'browser';
  const cloud = provider === 'openai' || provider === 'anthropic';
  apiKeyInput.disabled = !cloud;
  baseUrlInput.disabled = !cloud;
  modelInput.disabled = !cloud;
  browserModelSelect.disabled = !browser;
  aiDepthInput.disabled = provider === 'offline';
  apiKeyField.classList.toggle('hidden', !cloud);
  baseUrlField.classList.toggle('hidden', !cloud);
  clearKeyBtn.classList.toggle('hidden', !cloud);
  setModelFieldsVisible(provider);

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
    const chosen = modelForProvider(
      'browser',
      browserModelSelect.value || modelInput.value || settings.model,
    );
    setBrowserModelValue(chosen);
    if (help) {
      const gpu = getWebGpuStatus();
      help.textContent = gpu.available
        ? 'Local WebLLM via WebGPU (no API key). First run downloads model weights (can take several minutes), then caches.'
        : gpu.reason || 'WebGPU not available.';
    }
  }
  if (provider === 'offline') {
    baseUrlInput.placeholder = DEFAULT_OPENAI_BASE;
    modelInput.placeholder = DEFAULT_OPENAI_MODEL;
    if (help) help.textContent = 'Fully local procedural rooms. No network, no model download.';
  }
  syncAiStatus(provider);
}

modeSelect.addEventListener('change', syncModeUi);
providerSelect.addEventListener('change', syncProviderUi);
browserModelSelect.addEventListener('change', () => syncAiStatus('browser'));
modelInput.addEventListener('input', () => syncAiStatus(providerSelect.value as LlmProvider));
aiDepthInput.addEventListener('input', syncAiDepthUi);

startBtn.addEventListener('click', () => {
  const next = readForm();
  if (next.mode === 'seeded' && !next.seed) {
    alert('Enter a seed for seeded mode, or switch to randomized.');
    return;
  }

  if (!contentWarningAcknowledged) {
    pendingStartSettings = next;
    contentWarning.showModal();
    contentWarningContinue.focus({ preventScroll: true });
    return;
  }

  startDream(next);
});

contentWarningContinue.addEventListener('click', () => {
  const next = pendingStartSettings;
  pendingStartSettings = null;
  contentWarningAcknowledged = true;
  contentWarning.close();
  if (next) startDream(next);
});

contentWarningBack.addEventListener('click', closeContentWarning);
contentWarning.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeContentWarning();
});

function closeContentWarning(): void {
  pendingStartSettings = null;
  contentWarning.close();
  startBtn.focus({ preventScroll: true });
}

function startDream(next: AppSettings): void {
  if ((next.provider === 'openai' || next.provider === 'anthropic') && !next.apiKey) {
    const ok = confirm('No API key entered. Continue with offline procedural rooms?');
    if (!ok) {
      startBtn.focus({ preventScroll: true });
      return;
    }
    next.provider = 'offline';
    providerSelect.value = 'offline';
    syncProviderUi();
  }
  saveSettings(next);
  let runtimeSettings = next;
  let fallbackNotice = '';
  if (next.provider === 'browser' && !isWebGpuAvailable()) {
    const gpu = getWebGpuStatus();
    runtimeSettings = { ...next, provider: 'offline' };
    fallbackNotice = `${gpu.reason || 'WebGPU is unavailable.'} Continuing procedurally.`;
    console.warn('[Kettermean] WebLLM unavailable; using procedural direction for this run.', gpu);
  }
  game.updateSettings(runtimeSettings);
  game.start();
  if (fallbackNotice) game.notify(fallbackNotice);
}

function setBrowserModelValue(modelId: string): void {
  const id = modelId.trim() || DEFAULT_BROWSER_MODEL;
  const match = [...browserModelSelect.options].some((o) => o.value === id);
  browserModelSelect.value = match ? id : DEFAULT_BROWSER_MODEL;
}

function populateBrowserModelOptions(): void {
  browserModelSelect.replaceChildren();
  for (const group of BROWSER_MODEL_DEPTH_GROUPS) {
    const element = document.createElement('optgroup');
    element.label = `${group.depth} · ${group.demand}`;
    for (const modelId of group.models) {
      const option = document.createElement('option');
      option.value = modelId;
      const label = modelId.replace(/-q4f16(?:_1)?-MLC$/i, '');
      const recommendation = modelId === group.suggestedModel
        ? modelId === DEFAULT_BROWSER_MODEL
          ? ' · suggested · default'
          : ` · suggested for ${group.depth.split(' · ')[0]}`
        : '';
      option.textContent = `${label}${recommendation}`;
      element.append(option);
    }
    browserModelSelect.append(element);
  }
}

function syncAiStatus(provider: LlmProvider): void {
  if (provider === 'browser') {
    aiProviderStatus.textContent = 'Browser model · WebLLM';
    aiModelStatus.textContent = friendlyModelName(
      browserModelSelect.value || DEFAULT_BROWSER_MODEL,
    );
    return;
  }
  if (provider === 'offline') {
    aiProviderStatus.textContent = 'Procedural only';
    aiModelStatus.textContent = 'No download · deterministic generation';
    return;
  }
  aiProviderStatus.textContent = provider === 'anthropic' ? 'Anthropic Claude' : 'OpenAI-compatible';
  aiModelStatus.textContent = modelInput.value.trim() || modelForProvider(provider, '');
}

function friendlyModelName(modelId: string): string {
  const friendly = modelId
    .replace(/-q4f16(?:_1)?-MLC$/i, '')
    .replace(/-Instruct|-Chat|-it(?=$|\s)/gi, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const group = BROWSER_MODEL_DEPTH_GROUPS.find(({ suggestedModel }) => suggestedModel === modelId);
  if (!group) return friendly;
  const level = group.depth.split(' · ')[0];
  return `${friendly} · suggested ${level}${modelId === DEFAULT_BROWSER_MODEL ? ' · default' : ''}`;
}

function readAiDepth(): AiDepth {
  return AI_DEPTHS[Number(aiDepthInput.value)] ?? 'standard';
}

function setAiDepthValue(depth: AiDepth): void {
  const index = AI_DEPTHS.indexOf(depth);
  aiDepthInput.value = String(index >= 0 ? index : 1);
  syncAiDepthUi();
}

function syncAiDepthUi(): void {
  const depth = readAiDepth();
  aiDepthValue.textContent = AI_DEPTH_COPY[depth].label;
  aiDepthNote.textContent = AI_DEPTH_COPY[depth].note;
  aiDepthInput.setAttribute('aria-valuetext', AI_DEPTH_COPY[depth].label);
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
