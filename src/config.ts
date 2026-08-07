export const APP_NAME = 'Kettermean';
export const APP_VERSION = '0.1.0';

export const STORAGE_KEYS = {
  settings: 'kettermean.settings.v1',
  roomCache: 'kettermean.roomCache.v3',
} as const;

export const DEFAULT_OPENAI_BASE = 'https://api.openai.com/v1';
export const DEFAULT_OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
export const DEFAULT_ANTHROPIC_BASE = 'https://api.anthropic.com';
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
/** OpenRouter free auto-router is more reliable than a single flaky free slug. */
export const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-5';

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
  contactGraceMs: 80,
} as const;

/** After this many links in random mode, force a fresh root seed. */
export const RANDOM_RESEED_EVERY = 7;

/**
 * LLM cost controls:
 * - only one in-flight generation at a time
 * - prefetch at most one next room
 * - cache by seed (memory + localStorage)
 * - compact JSON, low max_tokens
 */
export const LLM_BUDGET = {
  maxInFlight: 1,
  prefetchDepth: 1,
  maxTokens: 220,
  temperature: 0.8,
  cacheLimit: 48,
  requestTimeoutMs: 25000,
  /** Wait this long on dream start before showing an offline placeholder. */
  startWaitMs: 8000,
  /** Only stop calling the API after this many consecutive failures. */
  maxConsecutiveFailures: 3,
  failOpenToOffline: true,
} as const;

export const ROOM = {
  minSize: 8,
  maxSize: 28,
  wallHeightMin: 2.4,
  wallHeightMax: 8,
  propCountMin: 2,
  propCountMax: 12,
  entityCountMin: 0,
  entityCountMax: 4,
} as const;
