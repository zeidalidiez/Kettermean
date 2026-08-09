import {
  DEFAULT_ANTHROPIC_BASE,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_BROWSER_MODEL,
  DEFAULT_OPENAI_BASE,
  DEFAULT_OPENROUTER_MODEL,
  LLM_BUDGET,
  STORAGE_KEYS,
} from '../config';
import type { AiDepth, AppSettings, GenerationContext, RoomSpec } from '../types';
import { catalogPromptSummary, listThemeIds } from '../world/assetCatalog';
import {
  assembleRoomSpec,
  generateOfflineRoom,
  parseRoomDirection,
} from '../world/offlineGenerator';
import { parseQaDirection } from '../world/qaDirector';
import {
  browserChatCompletion,
  disposeBrowserEngine,
  ensureBrowserEngine,
  interruptBrowserGeneration,
} from './browserEngine';
import { extractJsonObject, normalizeRoomSpec } from './schema';
import {
  browserSteeringPrompt,
  parseSteeringDirection,
} from '../world/steeringCode';
import { resolveRoomVisuals, ROOM_SHADER_VALUES } from '../world/roomDirector';
import {
  applyNarrativePatch,
  browserNarrativePrompt,
  cloudNarrativePrompt,
  narrativePatchFromObject,
  parseBrowserNarrative,
} from './narrative';

interface CacheEntry {
  spec: RoomSpec;
  savedAt: number;
}

export type RoomReadinessState = 'offline' | 'idle' | 'pending' | 'ready' | 'failed';

export interface RoomReadiness {
  state: RoomReadinessState;
  message?: string;
}

/**
 * Cost-aware room generation with FULL structural RoomSpec output.
 * Provider failures prepare an explicit procedural escape without silently
 * presenting it as an AI-authored room.
 */
export class RoomGenerator {
  private memory = new Map<string, RoomSpec>();
  private inflight = new Map<string, Promise<RoomSpec>>();
  private failedKeys = new Set<string>();
  private failureMessages = new Map<string, string>();
  private generationTail: Promise<void> = Promise.resolve();
  private activePrefetchKey: string | null = null;
  private sessionEpoch = 0;
  private activeCloudController: AbortController | null = null;
  private sessionFailures = 0;
  private apiCallsThisSession = 0;
  private onStatus: ((msg: string) => void) | null = null;

  constructor(private settings: AppSettings) {
    this.hydrateCache();
  }

  setStatusHandler(handler: ((msg: string) => void) | null): void {
    this.onStatus = handler;
  }

  updateSettings(settings: AppSettings): void {
    const previous = this.settings;
    const providerChanged =
      settings.provider !== previous.provider ||
      settings.model !== previous.model ||
      settings.baseUrl !== previous.baseUrl ||
      settings.apiKey !== previous.apiKey ||
      settings.aiDepth !== previous.aiDepth;
    const constraintsChanged =
      settings.allowGore !== previous.allowGore ||
      settings.noFlashingLights !== previous.noFlashingLights ||
      settings.noLowLight !== previous.noLowLight;
    this.settings = { ...settings };
    if (providerChanged || constraintsChanged) {
      this.invalidateInFlight();
      this.sessionFailures = 0;
      this.failedKeys.clear();
      this.failureMessages.clear();
      if (providerChanged && previous.provider === 'browser') void disposeBrowserEngine();
    }
  }

  beginSession(): number {
    this.invalidateInFlight();
    this.sessionFailures = 0;
    this.apiCallsThisSession = 0;
    this.failedKeys.clear();
    this.failureMessages.clear();
    return this.sessionEpoch;
  }

  endSession(): void {
    this.invalidateInFlight();
    if (this.settings.provider === 'browser') void disposeBrowserEngine();
  }

  getApiCallCount(): number {
    return this.apiCallsThisSession;
  }

  getOrOffline(ctx: GenerationContext): RoomSpec {
    const effectiveCtx = withSettingsConstraints(ctx, this.settings);
    const key = cacheKey(effectiveCtx, this.settings);
    const cached = this.memory.get(key);
    if (cached) return cached;
    const offline = generateOfflineRoom(effectiveCtx);
    if (!this.inflight.has(key)) this.remember(key, offline);
    return offline;
  }

  hasLlmRoom(ctx: GenerationContext): boolean {
    const effectiveCtx = withSettingsConstraints(ctx, this.settings);
    const spec = this.memory.get(cacheKey(effectiveCtx, this.settings));
    return Boolean(spec && !spec.offline);
  }

  getReadiness(ctx: GenerationContext): RoomReadiness {
    if (this.settings.provider === 'offline') return { state: 'offline' };
    if (
      (this.settings.provider === 'openai' || this.settings.provider === 'anthropic') &&
      !this.settings.apiKey.trim()
    ) {
      return { state: 'failed', message: 'An API key is required for this provider.' };
    }
    const effectiveCtx = withSettingsConstraints(ctx, this.settings);
    const key = cacheKey(effectiveCtx, this.settings);
    const cached = this.memory.get(key);
    if (cached && !cached.offline) return { state: 'ready' };
    if (this.failedKeys.has(key)) {
      return {
        state: 'failed',
        message: this.failureMessages.get(key) ?? 'The AI attempt did not produce usable direction.',
      };
    }
    if (this.inflight.has(key) || this.activePrefetchKey === key) return { state: 'pending' };
    return { state: 'idle' };
  }

  getReadyRoom(ctx: GenerationContext): RoomSpec | null {
    const effectiveCtx = withSettingsConstraints(ctx, this.settings);
    const room = this.memory.get(cacheKey(effectiveCtx, this.settings));
    return room && !room.offline ? room : null;
  }

  async get(ctx: GenerationContext): Promise<RoomSpec> {
    const jobSettings = { ...this.settings };
    const effectiveCtx = withSettingsConstraints(ctx, jobSettings);
    const epoch = this.sessionEpoch;
    const key = cacheKey(effectiveCtx, jobSettings);
    const cached = this.memory.get(key);
    if (cached && (!cached.offline || this.settings.provider === 'offline')) {
      return cached;
    }
    if (this.failedKeys.has(key)) return cached ?? generateOfflineRoom(effectiveCtx);

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const job = this.enqueueGeneration(() => this.generate(effectiveCtx, jobSettings, epoch, key))
      .then((spec) => {
        if (epoch === this.sessionEpoch) this.remember(key, spec);
        return spec;
      })
      .finally(() => {
        if (this.inflight.get(key) === job) this.inflight.delete(key);
      });

    this.inflight.set(key, job);
    return job;
  }

  prefetch(ctx: GenerationContext): Promise<RoomSpec> | null {
    if (this.settings.provider === 'offline') return null;
    if (
      (this.settings.provider === 'openai' || this.settings.provider === 'anthropic') &&
      !this.settings.apiKey.trim()
    ) {
      return null;
    }
    const effectiveCtx = withSettingsConstraints(ctx, this.settings);
    const key = cacheKey(effectiveCtx, this.settings);
    if (this.activePrefetchKey && this.activePrefetchKey !== key) {
      // The player already left the room this request was meant to follow.
      // Prioritize the current next dream instead of letting slow free models
      // keep every subsequent request one room behind.
      if (this.settings.provider === 'browser') interruptBrowserGeneration();
      this.invalidateInFlight();
    }
    const existing = this.memory.get(key);
    if (existing && !existing.offline) {
      this.onStatus?.(`Next AI room ready · ${providerLabel(this.settings)}`);
      return Promise.resolve(existing);
    }
    if (this.failedKeys.has(key)) {
      this.onStatus?.('This room\'s AI attempt failed · retry or choose procedural');
      return Promise.resolve(existing ?? generateOfflineRoom(effectiveCtx));
    }
    if (this.sessionFailures >= LLM_BUDGET.maxConsecutiveFailures) {
      const message = `AI paused after ${this.sessionFailures} failures`;
      this.failedKeys.add(key);
      this.failureMessages.set(key, message);
      this.onStatus?.(`${message} · retry or choose procedural`);
      const offline = generateOfflineRoom(effectiveCtx);
      this.remember(key, offline);
      return Promise.resolve(offline);
    }
    const epoch = this.sessionEpoch;
    this.activePrefetchKey = key;
    this.onStatus?.(
      `${providerLabel(this.settings)} · ${providerModel(this.settings)} · requesting next room…`,
    );
    const preparation = this.get(effectiveCtx);
    void preparation
      .then((spec) => {
        if (epoch !== this.sessionEpoch) return;
        // generate() reports the actionable reason when it falls back. Do not
        // immediately replace that message with a generic offline notice.
        if (!spec.offline) {
          this.onStatus?.(`Next AI room ready · ${providerLabel(this.settings)}`);
        }
      })
      .catch((err) => {
        if (epoch === this.sessionEpoch) {
          console.warn('[Kettermean] room prefetch failed.', err);
          this.onStatus?.('AI prefetch failed · retry or choose procedural');
        }
      })
      .finally(() => {
        if (epoch === this.sessionEpoch && this.activePrefetchKey === key) {
          this.activePrefetchKey = null;
        }
      });
    return preparation;
  }

  retry(ctx: GenerationContext): Promise<RoomSpec> | null {
    if (this.settings.provider === 'offline') return null;
    const effectiveCtx = withSettingsConstraints(ctx, this.settings);
    const key = cacheKey(effectiveCtx, this.settings);
    this.failedKeys.delete(key);
    this.failureMessages.delete(key);
    if (this.memory.get(key)?.offline) this.memory.delete(key);
    // A manual retry is an explicit request to resume after the automatic
    // consecutive-failure circuit breaker.
    this.sessionFailures = 0;
    return this.prefetch(effectiveCtx);
  }

  private async generate(
    ctx: GenerationContext,
    settings: AppSettings,
    epoch: number,
    key: string,
  ): Promise<RoomSpec> {
    if (epoch !== this.sessionEpoch || settings.provider === 'offline') {
      return generateOfflineRoom(ctx);
    }
    if (
      (settings.provider === 'openai' || settings.provider === 'anthropic') &&
      !settings.apiKey.trim()
    ) {
      return generateOfflineRoom(ctx);
    }
    if (
      LLM_BUDGET.failOpenToOffline &&
      this.sessionFailures >= LLM_BUDGET.maxConsecutiveFailures
    ) {
      return generateOfflineRoom(ctx);
    }

    try {
      const normalized = settings.provider === 'browser'
        ? await this.generateBrowserRoom(ctx, settings)
        : await this.generateCloudRoom(ctx, settings);
      if (epoch !== this.sessionEpoch) return generateOfflineRoom(ctx);

      if (!normalized) {
        throw new Error('LLM room direction was unusable after field validation.');
      }
      normalized.visuals = resolveRoomVisuals(
        normalized.seed,
        normalized.mood,
        normalized.visuals,
        ctx.recentRooms,
        ctx,
        normalized.condition,
      );
      normalized.offline = false;
      this.sessionFailures = 0;
      this.failedKeys.delete(key);
      this.failureMessages.delete(key);
      console.info(`[Kettermean] ${providerLabel(settings)} room direction accepted.`, {
        provider: settings.provider,
        model: providerModel(settings),
      });
      return normalized;
    } catch (err) {
      if (epoch !== this.sessionEpoch) return generateOfflineRoom(ctx);
      this.sessionFailures += 1;
      this.failedKeys.add(key);
      const message = err instanceof Error ? err.message : String(err);
      this.failureMessages.set(key, failureSummary(message));
      console.warn('[Kettermean] LLM room generation failed; procedural escape prepared.', message, err);
      const exhausted = this.sessionFailures >= LLM_BUDGET.maxConsecutiveFailures;
      this.onStatus?.(
        exhausted
          ? `${providerLabel(settings)} ${failureSummary(message)} · AI paused after ${this.sessionFailures} failures · retry or choose procedural`
          : `${providerLabel(settings)} ${failureSummary(message)} · retry ${this.sessionFailures}/${LLM_BUDGET.maxConsecutiveFailures} or choose procedural`,
      );
      return generateOfflineRoom(ctx);
    }
  }

  private async callCloudCompletion(
    system: string,
    user: string,
    settings: AppSettings,
    maxTokens: number,
  ): Promise<string> {
    const controller = new AbortController();
    this.activeCloudController = controller;
    const timer = window.setTimeout(() => controller.abort(), LLM_BUDGET.requestTimeoutMs);
    try {
      return settings.provider === 'anthropic'
        ? await this.callAnthropic(system, user, settings, controller.signal, maxTokens, true)
        : await this.callOpenAI(system, user, settings, controller.signal, maxTokens, true);
    } catch (err) {
      if (controller.signal.aborted) {
        throw new Error(`LLM timed out after ${LLM_BUDGET.requestTimeoutMs}ms.`);
      }
      throw err;
    } finally {
      window.clearTimeout(timer);
      if (this.activeCloudController === controller) this.activeCloudController = null;
    }
  }

  /** Kick off WebLLM weight download before the first room race. */
  async preloadBrowserModel(): Promise<void> {
    if (this.settings.provider !== 'browser') return;
    const model = this.settings.model.trim() || DEFAULT_BROWSER_MODEL;
    await ensureBrowserEngine(model, (msg) => this.onStatus?.(msg));
  }

  private async callBrowser(
    prompt: { system: string; user: string },
    settings: AppSettings,
    maxTokens: number,
    pass: number,
    totalPasses: number,
    temperature: number,
    stopSequences?: string[],
  ): Promise<string> {
    const model = settings.model.trim() || DEFAULT_BROWSER_MODEL;
    const text = await browserChatCompletion({
      modelId: model,
      system: prompt.system,
      user: prompt.user,
      maxTokens,
      temperature,
      forceJson: false,
      stopSequences,
      onProgress: (msg) => this.onStatus?.(
        /loading|downloading|fetching|compiling|model url|cache/i.test(msg)
          ? msg
          : `Pass ${pass}/${totalPasses} · ${msg}`,
      ),
    });
    return text;
  }

  private async generateBrowserRoom(
    ctx: GenerationContext,
    settings: AppSettings,
  ): Promise<RoomSpec | null> {
    const totalPasses = passCount(settings.aiDepth, 'browser');
    this.onStatus?.(`Creating room direction · pass 1/${totalPasses}`);
    this.apiCallsThisSession += 1;
    const steeringText = await this.callBrowser(
      browserSteeringPrompt(ctx),
      settings,
      LLM_BUDGET.browserMaxTokens,
      1,
      totalPasses,
      0.25,
    );
    const room = parseBrowserDirection(steeringText, ctx);
    if (!room || settings.aiDepth === 'light') return room;

    await this.tryBrowserNarrativePass('language', 2, totalPasses, room, ctx, settings);
    if (settings.aiDepth === 'deep') {
      await this.tryBrowserNarrativePass('inhabitants', 3, totalPasses, room, ctx, settings);
    }
    return room;
  }

  private async tryBrowserNarrativePass(
    kind: 'language' | 'inhabitants',
    pass: number,
    totalPasses: number,
    room: RoomSpec,
    ctx: GenerationContext,
    settings: AppSettings,
  ): Promise<void> {
    const prompt = browserNarrativePrompt(kind, ctx, room);
    this.onStatus?.(
      kind === 'language'
        ? `Writing room language · pass ${pass}/${totalPasses}`
        : `Directing inhabitants · pass ${pass}/${totalPasses}`,
    );
    try {
      this.apiCallsThisSession += 1;
      const text = await this.callBrowser(
        prompt,
        settings,
        kind === 'language' ? LLM_BUDGET.browserTextMaxTokens : LLM_BUDGET.browserCastMaxTokens,
        pass,
        totalPasses,
        0.72,
        [],
      );
      const applied = applyNarrativePatch(room, parseBrowserNarrative(text, prompt.marker));
      console.info(
        applied.length
          ? `[Kettermean] WebLLM pass ${pass}/${totalPasses} applied: ${applied.join(', ')}.`
          : `[Kettermean] WebLLM pass ${pass}/${totalPasses} used procedural text fallbacks.`,
        { preview: responsePreview(text) },
      );
    } catch (err) {
      console.warn(
        `[Kettermean] WebLLM pass ${pass}/${totalPasses} failed; retaining validated earlier fields.`,
        err,
      );
      this.onStatus?.(`Pass ${pass}/${totalPasses} failed · earlier AI direction retained`);
    }
  }

  private async generateCloudRoom(
    ctx: GenerationContext,
    settings: AppSettings,
  ): Promise<RoomSpec | null> {
    const totalPasses = passCount(settings.aiDepth, 'cloud');
    const prompt = buildPrompt(ctx, settings.aiDepth);
    this.onStatus?.(`Creating room direction · pass 1/${totalPasses}`);
    console.info(`[Kettermean] ${providerLabel(settings)} request started.`, {
      provider: settings.provider,
      model: providerModel(settings),
      depth: settings.aiDepth,
      pass: `1/${totalPasses}`,
    });
    this.apiCallsThisSession += 1;
    const text = await this.callCloudCompletion(
      prompt.system,
      prompt.user,
      settings,
      settings.aiDepth === 'light' ? LLM_BUDGET.lightMaxTokens : LLM_BUDGET.maxTokens,
    );
    const room = parseDirectedOrLegacy(text, ctx);
    if (!room || settings.aiDepth !== 'deep') return room;

    const narrative = cloudNarrativePrompt(ctx, room);
    this.onStatus?.(`Writing room language and inhabitants · pass 2/${totalPasses}`);
    try {
      this.apiCallsThisSession += 1;
      const narrativeText = await this.callCloudCompletion(
        narrative.system,
        narrative.user,
        settings,
        LLM_BUDGET.deepNarrativeMaxTokens,
      );
      const raw = extractJsonObject(narrativeText);
      const applied = applyNarrativePatch(room, narrativePatchFromObject(raw));
      console.info(
        applied.length
          ? `[Kettermean] ${providerLabel(settings)} deep pass applied: ${applied.join(', ')}.`
          : `[Kettermean] ${providerLabel(settings)} deep pass used procedural text fallbacks.`,
        { preview: responsePreview(narrativeText) },
      );
    } catch (err) {
      console.warn('[Kettermean] Deep writing pass failed; retaining base AI room.', err);
      this.onStatus?.('Deep writing pass failed · base AI room retained');
    }
    return room;
  }

  private async callOpenAI(
    system: string,
    user: string,
    settings: AppSettings,
    signal: AbortSignal,
    maxTokens: number,
    prefillJson = true,
  ): Promise<string> {
    const base = (settings.baseUrl || DEFAULT_OPENAI_BASE).replace(/\/$/, '');
    const model = settings.model || DEFAULT_OPENROUTER_MODEL;
    const useJsonMode = prefillJson && supportsJsonMode(base);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    };
    if (base.includes('openrouter.ai')) {
      headers['HTTP-Referer'] =
        typeof window !== 'undefined' ? window.location.origin : 'https://kettermean.local';
      headers['X-OpenRouter-Title'] = 'Kettermean';
      headers['X-Title'] = 'Kettermean';
    }

    // Assistant prefill nudges many models to continue as JSON instead of reasoning prose.
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];
    if (prefillJson && !useJsonMode) {
      messages.push({ role: 'assistant', content: '{' });
    }

    const body: Record<string, unknown> = {
      model,
      temperature: Math.min(LLM_BUDGET.temperature, 0.7),
      max_tokens: maxTokens,
      messages,
    };
    if (useJsonMode) body.response_format = { type: 'json_object' };

    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`OpenAI-compatible error ${res.status}: ${errBody.slice(0, 280)}`);
    }
    const data = (await res.json()) as unknown;
    let text = extractChatText(data);
    if (!text) {
      const preview = JSON.stringify(data).slice(0, 280);
      throw new Error(`Empty OpenAI response. Payload: ${preview}`);
    }
    // Prefill is not always echoed back by providers — restore the leading brace.
    if (prefillJson && !useJsonMode) text = ensureLeadingBrace(text);
    return text;
  }

  private async callAnthropic(
    system: string,
    user: string,
    settings: AppSettings,
    signal: AbortSignal,
    maxTokens: number,
    prefillJson = true,
  ): Promise<string> {
    const base = (settings.baseUrl || DEFAULT_ANTHROPIC_BASE).replace(/\/$/, '');
    const model = settings.model || DEFAULT_ANTHROPIC_MODEL;
    const messages: Array<{ role: string; content: string }> = [{ role: 'user', content: user }];
    if (prefillJson) messages.push({ role: 'assistant', content: '{' });

    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      signal,
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: Math.min(LLM_BUDGET.temperature, 0.7),
        system,
        messages,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic error ${res.status}: ${body.slice(0, 280)}`);
    }
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    let text = data.content?.find((c) => c.type === 'text')?.text ?? '';
    if (!text) throw new Error('Empty Anthropic response');
    if (prefillJson) text = ensureLeadingBrace(text);
    return text;
  }

  private remember(key: string, spec: RoomSpec): void {
    this.memory.set(key, spec);
    if (this.memory.size > LLM_BUDGET.cacheLimit) {
      const first = this.memory.keys().next().value;
      if (first) this.memory.delete(first);
    }
    this.persistCache();
  }

  private hydrateCache(): void {
    try {
      const legacyPrefix = 'kettermean.roomCache.v';
      const legacyKeys = Array.from(
        { length: localStorage.length },
        (_, index) => localStorage.key(index),
      ).filter(
        (key): key is string =>
          Boolean(key?.startsWith(legacyPrefix) && key !== STORAGE_KEYS.roomCache),
      );
      for (const key of legacyKeys) localStorage.removeItem(key);

      const raw = localStorage.getItem(STORAGE_KEYS.roomCache);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
      const entries = Object.entries(parsed)
        .sort((a, b) => b[1].savedAt - a[1].savedAt)
        .slice(0, LLM_BUDGET.cacheLimit);
      for (const [key, entry] of entries) {
        if (entry?.spec?.seed) this.memory.set(key, entry.spec);
      }
    } catch {
      // ignore
    }
  }

  private persistCache(): void {
    try {
      const out: Record<string, CacheEntry> = {};
      let i = 0;
      for (const [key, spec] of this.memory) {
        out[key] = { spec, savedAt: Date.now() - i };
        i += 1;
        if (i >= LLM_BUDGET.cacheLimit) break;
      }
      localStorage.setItem(STORAGE_KEYS.roomCache, JSON.stringify(out));
    } catch {
      // ignore
    }
  }

  private enqueueGeneration<T>(work: () => Promise<T>): Promise<T> {
    const job = this.generationTail.then(work, work);
    this.generationTail = job.then(
      () => undefined,
      () => undefined,
    );
    return job;
  }

  private invalidateInFlight(): void {
    this.sessionEpoch += 1;
    this.inflight.clear();
    this.activePrefetchKey = null;
    this.activeCloudController?.abort();
    this.activeCloudController = null;
    // A provider/session change must not sit behind an obsolete WebLLM job.
    // The old job is epoch-guarded and cannot populate the new session, while
    // the fresh queue lets the newly selected provider start immediately.
    this.generationTail = Promise.resolve();
  }
}

function providerLabel(settings: AppSettings): string {
  if (settings.provider === 'browser') return 'WebLLM';
  if (settings.provider === 'anthropic') return 'Anthropic';
  if (
    settings.provider === 'openai' &&
    settings.baseUrl.trim().toLowerCase().includes('openrouter.ai')
  ) {
    return 'OpenRouter';
  }
  return settings.provider === 'openai' ? 'OpenAI-compatible' : 'Procedural';
}

function providerModel(settings: AppSettings): string {
  if (settings.model.trim()) return settings.model.trim();
  if (settings.provider === 'browser') return DEFAULT_BROWSER_MODEL;
  if (settings.provider === 'anthropic') return DEFAULT_ANTHROPIC_MODEL;
  return DEFAULT_OPENROUTER_MODEL;
}

function supportsJsonMode(baseUrl: string): boolean {
  const base = baseUrl.toLowerCase();
  return base.includes('openrouter.ai') || base.includes('api.openai.com');
}

function failureSummary(message: string): string {
  if (/timed out/i.test(message)) return 'timed out';
  const status = message.match(/(?:error|status)\s+(\d{3})/i)?.[1];
  if (status) return `returned HTTP ${status}`;
  if (/failed to fetch|networkerror|network request|load failed|cors/i.test(message)) {
    return 'hit a network/CORS error';
  }
  if (/empty/i.test(message)) return 'returned an empty response';
  if (/unusable|parse|json/i.test(message)) return 'returned unusable direction';
  return 'request failed';
}

function withSettingsConstraints(
  ctx: GenerationContext,
  settings: AppSettings,
): GenerationContext {
  return {
    ...ctx,
    allowGore: settings.allowGore,
    noFlashingLights: settings.noFlashingLights,
    noLowLight: settings.noLowLight,
  };
}

function cacheKey(ctx: GenerationContext, settings: AppSettings): string {
  const base = settings.baseUrl.trim().replace(/\/$/, '').toLowerCase();
  const model = settings.model.trim() || 'default';
  return `v29|${settings.provider}|${base}|${model}|${settings.aiDepth}|${ctx.seed}|g=${ctx.allowGore ? 1 : 0}|f=${ctx.noFlashingLights ? 1 : 0}|l=${ctx.noLowLight ? 1 : 0}`;
}

function buildPrompt(ctx: GenerationContext, depth: AiDepth): { system: string; user: string } {
  const goreLine = ctx.allowGore
    ? 'Mild blood/gore allowed sparingly.'
    : 'No blood or gore.';
  const flashingLine = ctx.noFlashingLights
    ? 'Do not request flashing, flickering, strobing, or pulsing lights.'
    : 'Atmospheric pulsing light is permitted.';
  const lowLightLine = ctx.noLowLight
    ? 'Keep the room clearly illuminated; do not request dim or low-light treatment.'
    : 'Low-light atmosphere is permitted.';
  const shaderOptions = ROOM_SHADER_VALUES
    .filter((shader) => !ctx.noFlashingLights || shader !== 'strobe')
    .join('|');
  const modifierFields = [
    'grainAmount',
    'channelShift',
    'edgeFade',
    'banding',
    'textureScale',
    'inkSpread',
    'highlightBloom',
    'colorBleed',
    'speckleAmount',
    'weaveAmount',
  ].join(', ');

  if (depth === 'light') {
    return {
      system: [
        'Direct one liminal dream room. Return one JSON object only; no markdown or analysis.',
        'Schema: themeId, title, blurb, mood, environment, condition, visuals.',
        'mood: upper|downer|static|dynamic.',
        'environment: interior|open-hall|outdoor.',
        `visuals.shader must be one of ${shaderOptions}.`,
        `visuals may also contain lighting, tint, wireframe, ${modifierFields}; modifier values range from 0 to 1.`,
        goreLine,
        flashingLine,
        lowLightLine,
        'Invent actual values. Never repeat the schema or use placeholders. Never sexual or obscene.',
      ].join(' '),
      user: [
        `seed=${ctx.seed}`,
        `moodBias=${ctx.moodBias}`,
        `linkIndex=${ctx.linkIndex}`,
        `avoidTitles=${JSON.stringify(ctx.previousTitles.slice(-5))}`,
        `themeOptions=${listThemeIds().join(',')}`,
        'Return a different room as JSON now.',
      ].join('\n'),
    };
  }

  // Rich director mode chooses semantic controls; the client owns safe placement.
  const system = [
    'You are an art director for a liminal WebGL game.',
    'Return ONE JSON object only. No markdown. No analysis.',
    'Do NOT invent meshes. SELECT preferredAssets from the supplied catalog by exact assetId.',
    'The client owns coordinates and collision-safe placement.',
    'Schema: themeId, title, blurb, mood, tags, environment, layoutStyle, architecture, scaleProfile, worldScale, condition, density, width, depth, height, fogNear, fogFar, linkColor, palette, physics, visuals, preferredAssets, roomRule, signs, npcLines, npcBehavior.',
    'environment: interior|open-hall|outdoor. layoutStyle: clusters|perimeter|axial|scattered|sparse.',
    'architecture: chamber|colonnade|atrium|arena|concourse|courtyard|causeway|field|basin.',
    'scaleProfile: closet|human|grand|monumental|colossal. condition: normal|bloodied|slimed|scorched|burning|ruined|overgrown|frozen|flooded|dusty|moldy|electrified|haunted|gilded|bioluminescent|stormbound.',
    'mood: upper|downer|static|dynamic. npcBehavior: idle|wander|orbit|stare.',
    `visuals.shader must be one of ${shaderOptions}.`,
    `visuals: lighting, tint, effectStrength, distortion, colorCycle, ${modifierFields}, wireframe. Modifier values range from 0 to 1.`,
    'Write a complete 40-65 word blurb in three unnumbered atmospheric sentences, a strange roomRule, 2-4 signs with a 3-7 word headline and an 8-18 word informational caption, and 1-4 short npcLines.',
    'Choose 4-10 preferredAssets. Do not select doors or portals; the player changes dreams with R.',
    goreLine,
    flashingLine,
    lowLightLine,
    'Never sexual or obscene.',
  ].join(' ');

  const user = [
    `seed=${ctx.seed}`,
    `moodBias=${ctx.moodBias}`,
    `linkIndex=${ctx.linkIndex}`,
    `avoidTitles=${JSON.stringify(ctx.previousTitles.slice(-5))}`,
    'CATALOG (choose only these assetId values):',
    catalogPromptSummary(),
    'Direct a new room. Use actual invented values, not schema descriptions or placeholders. JSON only.',
  ].join('\n');

  return { system, user };
}

function passCount(depth: AiDepth, provider: 'browser' | 'cloud'): number {
  if (provider === 'browser') return depth === 'light' ? 1 : depth === 'standard' ? 2 : 3;
  return depth === 'deep' ? 2 : 1;
}

function parseDirectedOrLegacy(text: string, ctx: GenerationContext): RoomSpec | null {
  const json = extractJsonObject(text);
  if (!json) return null;
  const directed = parseRoomDirection(json, ctx.seed, ctx);
  if (directed) return assembleRoomSpec(directed);
  // Legacy full RoomSpec path still accepted.
  return normalizeRoomSpec(json, ctx.seed);
}

function parseBrowserDirection(text: string, ctx: GenerationContext): RoomSpec | null {
  const steering = parseSteeringDirection(text, ctx);
  if (steering.modelDigitCount > 0) {
    if (steering.fallbackFields.length > 0) {
      console.warn(
        `[Kettermean] Browser model used procedural steering for: ${steering.fallbackFields.join(', ')}.`,
        `Resolved code: ${steering.code}. Preview: ${responsePreview(text)}`,
      );
    }
    return assembleRoomSpec(steering.direction);
  }

  // Model fields only steer; the procedural director fills any invalid fields and
  // always owns the full room structure. Retain the previous format for cached or
  // manually tested model responses during the protocol transition.
  const qa = parseQaDirection(text, ctx.seed, ctx, (fields) => {
    console.warn(
      `[Kettermean] Browser model used procedural fallback for fields: ${fields.join(', ')}.`,
      `Preview: ${responsePreview(text)}`,
    );
  });
  if (qa) return assembleRoomSpec(qa);

  // JSON salvage also goes through director via parseRoomDirection.
  const legacy = parseDirectedOrLegacy(text, ctx);
  if (legacy && !isBadDisplayText(legacy.title) && !isBadDisplayText(legacy.blurb)) {
    return legacy;
  }

  // A malformed completion is not an engine failure. Use every procedural digit,
  // cache the result, and continue asking the model on later room seeds.
  console.warn(
    `[Kettermean] Browser model steering code missing; used procedural code ${steering.code}.`,
    `Preview: ${responsePreview(text)}`,
  );
  return assembleRoomSpec(steering.direction);
}

function responsePreview(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 180);
}

function isBadDisplayText(s: string): boolean {
  const t = (s || '').toLowerCase().trim();
  if (!t || t.length < 2) return true;
  // Only quotes/punctuation left
  if (!/[a-z0-9]/i.test(t)) return true;
  return (
    t.includes('step by step') ||
    t.includes("let's tackle") ||
    t.includes('let’s tackle') ||
    t.startsWith('okay') ||
    t.startsWith('the title is')
  );
}

function ensureLeadingBrace(text: string): string {
  const t = text.trim();
  if (!t) return '{';
  if (t.startsWith('{')) return t;
  // Model continued after prefilled "{".
  if (t.startsWith('"') || t.startsWith("'") || /^[a-zA-Z_]/.test(t)) return `{${t}`;
  const idx = t.indexOf('{');
  if (idx >= 0) return t.slice(idx);
  return `{${t}`;
}

function extractChatText(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const root = data as Record<string, unknown>;
  const choices = root.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const c0 = choices[0] as Record<string, unknown>;
    const msg = c0.message;
    if (msg && typeof msg === 'object') {
      const m = msg as Record<string, unknown>;
      const fromContent = normalizeContent(m.content);
      if (fromContent) return fromContent;
      const reasoning =
        normalizeContent(m.reasoning) ||
        normalizeContent(m.reasoning_content) ||
        normalizeContent((m as { reasoning_details?: unknown }).reasoning_details);
      if (reasoning) return reasoning;
    }
    const text = normalizeContent(c0.text);
    if (text) return text;
  }
  return normalizeContent(root.output_text) || normalizeContent(root.content);
}

function normalizeContent(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const part of content) {
      if (typeof part === 'string') parts.push(part);
      else if (part && typeof part === 'object') {
        const p = part as Record<string, unknown>;
        if (typeof p.text === 'string') parts.push(p.text);
        else if (typeof p.content === 'string') parts.push(p.content);
      }
    }
    return parts.join('\n').trim();
  }
  if (content && typeof content === 'object') {
    const o = content as Record<string, unknown>;
    if (typeof o.text === 'string') return o.text.trim();
  }
  return '';
}
