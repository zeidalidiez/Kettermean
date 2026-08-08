import {
  DEFAULT_ANTHROPIC_BASE,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_BROWSER_MODEL,
  DEFAULT_OPENAI_BASE,
  DEFAULT_OPENROUTER_MODEL,
  LLM_BUDGET,
  STORAGE_KEYS,
} from '../config';
import type { AppSettings, GenerationContext, RoomSpec } from '../types';
import { catalogPromptSummary } from '../world/assetCatalog';
import {
  assembleRoomSpec,
  generateOfflineRoom,
  parseRoomDirection,
} from '../world/offlineGenerator';
import { browserQaPrompt, parseQaDirection } from '../world/qaDirector';
import { browserChatCompletion } from './browserEngine';
import { extractJsonObject, normalizeRoomSpec } from './schema';

interface CacheEntry {
  spec: RoomSpec;
  savedAt: number;
}

/**
 * Cost-aware room generation with FULL structural RoomSpec output.
 * Provider failures fall back offline without shrinking the game design.
 */
export class RoomGenerator {
  private memory = new Map<string, RoomSpec>();
  private inflight = new Map<string, Promise<RoomSpec>>();
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
    const providerChanged =
      settings.provider !== this.settings.provider ||
      settings.model !== this.settings.model ||
      settings.baseUrl !== this.settings.baseUrl ||
      settings.apiKey !== this.settings.apiKey;
    this.settings = settings;
    if (providerChanged) this.sessionFailures = 0;
  }

  getApiCallCount(): number {
    return this.apiCallsThisSession;
  }

  getOrOffline(ctx: GenerationContext): RoomSpec {
    const key = cacheKey(ctx);
    const cached = this.memory.get(key);
    if (cached) return cached;
    const offline = generateOfflineRoom(ctx);
    if (!this.inflight.has(key)) this.remember(ctx, offline);
    return offline;
  }

  hasLlmRoom(ctx: GenerationContext): boolean {
    const spec = this.memory.get(cacheKey(ctx));
    return Boolean(spec && !spec.offline);
  }

  async get(ctx: GenerationContext): Promise<RoomSpec> {
    const key = cacheKey(ctx);
    const cached = this.memory.get(key);
    if (cached && (!cached.offline || this.settings.provider === 'offline')) {
      return cached;
    }

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const job = this.generate(ctx)
      .then((spec) => {
        this.remember(ctx, spec);
        return spec;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, job);
    return job;
  }

  prefetch(ctx: GenerationContext): void {
    if (this.settings.provider === 'offline') return;
    if (
      (this.settings.provider === 'openai' || this.settings.provider === 'anthropic') &&
      !this.settings.apiKey.trim()
    ) {
      return;
    }
    if (this.inflight.size >= LLM_BUDGET.maxInFlight) return;
    const existing = this.memory.get(cacheKey(ctx));
    if (existing && !existing.offline) return;
    if (this.sessionFailures >= LLM_BUDGET.maxConsecutiveFailures) return;
    void this.get(ctx);
  }

  private async generate(ctx: GenerationContext): Promise<RoomSpec> {
    if (this.settings.provider === 'offline') {
      return generateOfflineRoom(ctx);
    }
    if (
      (this.settings.provider === 'openai' || this.settings.provider === 'anthropic') &&
      !this.settings.apiKey.trim()
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
      let text = await this.callProvider(ctx, 'initial');
      this.apiCallsThisSession += 1;
      let normalized =
        this.settings.provider === 'browser'
          ? parseBrowserDirection(text, ctx)
          : parseDirectedOrLegacy(text, ctx.seed);

      // One cheap repair pass if the first reply was unusable.
      if (!normalized) {
        text = await this.callProvider(ctx, 'repair', text);
        this.apiCallsThisSession += 1;
        normalized =
          this.settings.provider === 'browser'
            ? parseBrowserDirection(text, ctx)
            : parseDirectedOrLegacy(text, ctx.seed);
      }

      if (!normalized) {
        throw new Error(
          `LLM room direction unusable (need numbered 1-5 answers). Preview: ${text.slice(0, 220)}`,
        );
      }
      normalized.offline = false;
      this.sessionFailures = 0;
      return normalized;
    } catch (err) {
      this.sessionFailures += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[Kettermean] LLM room generation failed; using offline.', message, err);
      return generateOfflineRoom(ctx);
    }
  }

  private async callProvider(
    ctx: GenerationContext,
    mode: 'initial' | 'repair',
    previousText = '',
  ): Promise<string> {
    const { system, user } = buildPrompt(ctx, this.settings.allowGore, mode, previousText);
    // Soft timeout only — do not AbortController-kill free routes mid-flight.
    const call =
      this.settings.provider === 'browser'
        ? this.callBrowser(ctx, mode, previousText)
        : this.settings.provider === 'anthropic'
          ? this.callAnthropic(system, user, true)
          : this.callOpenAI(system, user, true);

    const timeoutMs =
      this.settings.provider === 'browser'
        ? LLM_BUDGET.browserRequestTimeoutMs
        : LLM_BUDGET.requestTimeoutMs;

    let timer: number | undefined;
    try {
      return await Promise.race([
        call,
        new Promise<string>((_, reject) => {
          timer = window.setTimeout(() => {
            reject(
              new Error(
                `LLM timed out after ${timeoutMs}ms (request may still complete server-side)`,
              ),
            );
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timer !== undefined) window.clearTimeout(timer);
    }
  }

  /** Kick off WebLLM weight download before the first room race. */
  async preloadBrowserModel(): Promise<void> {
    if (this.settings.provider !== 'browser') return;
    const model = this.settings.model.trim() || DEFAULT_BROWSER_MODEL;
    const { ensureBrowserEngine } = await import('./browserEngine');
    await ensureBrowserEngine(model, (msg) => this.onStatus?.(msg));
  }

  private async callBrowser(
    ctx: GenerationContext,
    mode: 'initial' | 'repair',
    previousText = '',
  ): Promise<string> {
    const model = this.settings.model.trim() || DEFAULT_BROWSER_MODEL;
    // Tiny models answer numbered questions; client builds RoomDirection/JSON.
    const qa = browserQaPrompt({
      seed: ctx.seed,
      moodBias: ctx.moodBias,
      previousTitles: ctx.previousTitles,
      allowGore: this.settings.allowGore,
    });
    const user =
      mode === 'repair'
        ? `${qa.user}

Previous answers were incomplete. Answer lines 1-5 again only.
bad=${JSON.stringify(previousText.slice(0, 240))}`
        : qa.user;
    const text = await browserChatCompletion({
      modelId: model,
      system: qa.system,
      user,
      // Enough room if the model still emits a short think prefix.
      maxTokens: 220,
      temperature: 0.2,
      forceJson: false,
      onProgress: (msg) => this.onStatus?.(msg),
    });
    return text;
  }

  private async callOpenAI(system: string, user: string, prefillJson = true): Promise<string> {
    const base = (this.settings.baseUrl || DEFAULT_OPENAI_BASE).replace(/\/$/, '');
    const model = this.settings.model || DEFAULT_OPENROUTER_MODEL;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.settings.apiKey}`,
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
    if (prefillJson) {
      messages.push({ role: 'assistant', content: '{' });
    }

    const body: Record<string, unknown> = {
      model,
      temperature: Math.min(LLM_BUDGET.temperature, 0.7),
      max_tokens: LLM_BUDGET.maxTokens,
      messages,
    };

    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers,
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
    if (prefillJson) text = ensureLeadingBrace(text);
    return text;
  }

  private async callAnthropic(system: string, user: string, prefillJson = true): Promise<string> {
    const base = (this.settings.baseUrl || DEFAULT_ANTHROPIC_BASE).replace(/\/$/, '');
    const model = this.settings.model || DEFAULT_ANTHROPIC_MODEL;
    const messages: Array<{ role: string; content: string }> = [{ role: 'user', content: user }];
    if (prefillJson) messages.push({ role: 'assistant', content: '{' });

    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: LLM_BUDGET.maxTokens,
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

  private remember(ctx: GenerationContext, spec: RoomSpec): void {
    const key = cacheKey(ctx);
    this.memory.set(key, spec);
    if (this.memory.size > LLM_BUDGET.cacheLimit) {
      const first = this.memory.keys().next().value;
      if (first) this.memory.delete(first);
    }
    this.persistCache();
  }

  private hydrateCache(): void {
    try {
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
}

function cacheKey(ctx: GenerationContext): string {
  return `${ctx.seed}|g=${ctx.allowGore ? 1 : 0}`;
}

function buildPrompt(
  ctx: GenerationContext,
  allowGore: boolean,
  mode: 'initial' | 'repair' = 'initial',
  previousText = '',
): { system: string; user: string } {
  const goreLine = allowGore
    ? 'Mild blood/gore allowed sparingly.'
    : 'No blood or gore.';

  // Director mode: pick catalog assets + atmospheric scale. Client builds meshes.
  const system = [
    'You are an art director for a liminal WebGL game.',
    'Return ONE JSON object only. No markdown. No analysis.',
    'Do NOT invent meshes. SELECT assets from the catalog by assetId.',
    'You may scale assets for atmosphere (e.g. anomaly_giant_baby scaleMul 2.5-3.8).',
    'Schema: themeId?, title, blurb, mood, tags, width, depth, height, fogNear, fogFar, linkColor, openSides, palette?, physics?, placements[].',
    'placements item: {assetId,x,z,rotY,scaleMul,linksOnTouch,behavior?}.',
    'mood: upper|downer|static|dynamic. Keep spawn center clear (no solid near 0,0 within 1.8).',
    '6-12 placements. Include at least one portal/link asset (door_fake often).',
    goreLine,
    'Never sexual or obscene.',
  ].join(' ');

  if (mode === 'repair') {
    return {
      system,
      user: [
        'Previous reply was not valid director JSON. Reply with pure JSON only.',
        `seed=${ctx.seed}`,
        `moodBias=${ctx.moodBias}`,
        `bad=${JSON.stringify(previousText.slice(0, 350))}`,
        'Start with {',
      ].join('\n'),
    };
  }

  const example = {
    themeId: 'wrong_nursery',
    title: 'Wrong Nursery',
    blurb: 'The crib is empty. Something else is not.',
    mood: 'downer',
    tags: ['nursery', 'uncanny'],
    width: 12,
    depth: 12,
    height: 3.4,
    fogNear: 10,
    fogFar: 34,
    linkColor: '#15203f',
    openSides: ['east'],
    placements: [
      { assetId: 'crib_empty', x: -2, z: -1.5, rotY: 0.2, scaleMul: 1 },
      { assetId: 'anomaly_giant_baby', x: 1.5, z: 2, scaleMul: 3.1, linksOnTouch: true, behavior: 'idle' },
      { assetId: 'bottle_giant', x: 3, z: -2.5, scaleMul: 1.4 },
      { assetId: 'door_fake', x: -5.2, z: 0, rotY: 1.57, linksOnTouch: true },
      { assetId: 'lamp_floor', x: -3.5, z: 3, scaleMul: 1 },
      { assetId: 'mirror_tall', x: 5, z: 0, rotY: -1.57, scaleMul: 1.1 },
    ],
  };

  const user = [
    `seed=${ctx.seed}`,
    `moodBias=${ctx.moodBias}`,
    `linkIndex=${ctx.linkIndex}`,
    `avoidTitles=${JSON.stringify(ctx.previousTitles.slice(-5))}`,
    'CATALOG (choose only these assetId values):',
    catalogPromptSummary(),
    `example=${JSON.stringify(example)}`,
    'Direct a different room. JSON only.',
  ].join('\n');

  return { system, user };
}

function parseDirectedOrLegacy(text: string, seed: string): RoomSpec | null {
  const json = extractJsonObject(text);
  if (!json) return null;
  const directed = parseRoomDirection(json, seed);
  if (directed) return assembleRoomSpec(directed);
  // Legacy full RoomSpec path still accepted.
  return normalizeRoomSpec(json, seed);
}

function parseBrowserDirection(text: string, ctx: GenerationContext): RoomSpec | null {
  // Q&A only steers; offline director builds the full room (density/layouts/doors).
  const qa = parseQaDirection(text, ctx.seed, ctx);
  if (qa) return assembleRoomSpec(qa);

  // JSON salvage also goes through director via parseRoomDirection.
  const legacy = parseDirectedOrLegacy(text, ctx.seed);
  if (!legacy) return null;
  if (isBadDisplayText(legacy.title) || isBadDisplayText(legacy.blurb)) return null;
  return legacy;
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
