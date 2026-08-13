export const STORAGE_KEYS = {
  settings: 'kettermean.settings.v1',
  sessionApiKey: 'kettermean.apiKey.session.v1',
  roomCache: 'kettermean.roomCache.v28',
} as const;

export const DEFAULT_OPENAI_BASE = 'https://api.openai.com/v1';
export const DEFAULT_OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
export const DEFAULT_ANTHROPIC_BASE = 'https://api.anthropic.com';
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
export const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-5';
/**
 * Browser models = WebLLM prebuilt model_ids only (q4f16 preferred for VRAM).
 * Any id from @mlc-ai/web-llm prebuiltAppConfig still works if typed manually.
 * Default minimizes download/VRAM cost; malformed steering is filled procedurally.
 */
export const DEFAULT_BROWSER_MODEL = 'SmolLM2-360M-Instruct-q4f16_1-MLC';
export const BROWSER_MODEL_DEPTH_GROUPS = [
  {
    depth: 'Level 1 · Quick direction',
    demand: 'lowest download + memory',
    suggestedModel: DEFAULT_BROWSER_MODEL,
    models: [
      'SmolLM2-360M-Instruct-q4f16_1-MLC',
      'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
      'Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC',
      'Qwen3-0.6B-q4f16_1-MLC',
      'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC',
    ],
  },
  {
    depth: 'Level 2 · Richer direction',
    demand: 'balanced download + memory',
    suggestedModel: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    models: [
      'gemma3-1b-it-q4f16_1-MLC',
      'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      'OLMo-2-0425-1B-Instruct-q4f16_1-MLC',
      'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
      'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC',
      'Qwen3-1.7B-q4f16_1-MLC',
      'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
    ],
  },
  {
    depth: 'Level 3 · Deeper direction',
    demand: 'higher download + memory',
    suggestedModel: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    models: [
      'gemma-2-2b-it-q4f16_1-MLC',
      'Llama-3.2-3B-Instruct-q4f16_1-MLC',
      'Hermes-3-Llama-3.2-3B-q4f16_1-MLC',
      'Phi-3.5-mini-instruct-q4f16_1-MLC',
      'Phi-3-mini-4k-instruct-q4f16_1-MLC',
    ],
  },
] as const;

export const BROWSER_MODEL_OPTIONS = BROWSER_MODEL_DEPTH_GROUPS.flatMap(
  (group) => group.models,
);

export const PLAYER = {
  eyeHeight: 1.65,
  radius: 0.35,
  walkSpeed: 4.2,
  sprintSpeed: 7.2,
  lookSensitivity: 0.0022,
  gamepadLookSensitivity: 2.4,
  touchLookSensitivity: 1.8,
  gravity: 18,
  jumpVelocity: 6.5,
} as const;

export const LINK = {
  cooldownMs: 900,
  fadeMs: 420,
} as const;

/** After this many links in random mode, force a fresh root seed. */
export const RANDOM_RESEED_EVERY = 7;

/**
 * LLM cost controls:
 * - only one in-flight generation at a time
 * - prefetch at most one next room
 * - cache by seed (memory + localStorage)
 * - compact output with strict token budgets
 */
export const LLM_BUDGET = {
  maxTokens: 1100,
  lightMaxTokens: 480,
  deepNarrativeMaxTokens: 760,
  browserMaxTokens: 40,
  browserTextMaxTokens: 240,
  browserCastMaxTokens: 120,
  temperature: 0.8,
  cacheLimit: 48,
  /** Free routers can be slow; do not abort quickly. */
  requestTimeoutMs: 90000,
  /** Only stop calling the API after this many consecutive failures. */
  maxConsecutiveFailures: 3,
  failOpenToOffline: true,
} as const;

export const ROOM = {
  minSize: 5.5,
  maxSize: 360,
  maxHeight: 140,
  wallHeightMin: 2.4,
  wallHeightMax: 8,
  propCountMin: 2,
  /** Logical-object budgets; composed models may contain several meshes each. */
  propCountMax: 72,
  /** Approximate five-mesh units, so richer assets reduce density before they stall a GPU. */
  propRenderCostMax: 80,
  entityCountMin: 0,
  entityCountMax: 12,
  // One round-four creature can occupy up to 43 five-mesh units by itself.
  entityRenderCostMax: 44,
} as const;
