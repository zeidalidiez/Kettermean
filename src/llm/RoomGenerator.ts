import {
  DEFAULT_ANTHROPIC_BASE,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OPENAI_BASE,
  DEFAULT_OPENROUTER_MODEL,
  LLM_BUDGET,
  STORAGE_KEYS,
} from '../config';
import type { AppSettings, GenerationContext, RoomSpec } from '../types';
import { generateOfflineRoom } from '../world/offlineGenerator';
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

  constructor(private settings: AppSettings) {
    this.hydrateCache();
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
    if (!this.settings.apiKey.trim()) return;
    if (this.inflight.size >= LLM_BUDGET.maxInFlight) return;
    const existing = this.memory.get(cacheKey(ctx));
    if (existing && !existing.offline) return;
    if (this.sessionFailures >= LLM_BUDGET.maxConsecutiveFailures) return;
    void this.get(ctx);
  }

  private async generate(ctx: GenerationContext): Promise<RoomSpec> {
    if (this.settings.provider === 'offline' || !this.settings.apiKey.trim()) {
      return generateOfflineRoom(ctx);
    }
    if (
      LLM_BUDGET.failOpenToOffline &&
      this.sessionFailures >= LLM_BUDGET.maxConsecutiveFailures
    ) {
      return generateOfflineRoom(ctx);
    }

    try {
      const text = await this.callProvider(ctx);
      this.apiCallsThisSession += 1;
      const json = extractJsonObject(text);
      const normalized = json ? normalizeRoomSpec(json, ctx.seed) : null;
      if (!normalized) {
        throw new Error(`LLM room JSON unusable. Preview: ${text.slice(0, 200)}`);
      }
      normalized.offline = false;
      this.sessionFailures = 0;
      return normalized;
    } catch (err) {
      this.sessionFailures += 1;
      console.warn('[Kettermean] LLM room generation failed; using offline.', err);
      return generateOfflineRoom(ctx);
    }
  }

  private async callProvider(ctx: GenerationContext): Promise<string> {
    const { system, user } = buildPrompt(ctx, this.settings.allowGore);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), LLM_BUDGET.requestTimeoutMs);
    try {
      if (this.settings.provider === 'anthropic') {
        return await this.callAnthropic(system, user, controller.signal);
      }
      return await this.callOpenAI(system, user, controller.signal);
    } finally {
      window.clearTimeout(timer);
    }
  }

  private async callOpenAI(system: string, user: string, signal: AbortSignal): Promise<string> {
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

    const body: Record<string, unknown> = {
      model,
      temperature: LLM_BUDGET.temperature,
      max_tokens: LLM_BUDGET.maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    };

    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal,
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`OpenAI-compatible error ${res.status}: ${errBody.slice(0, 280)}`);
    }
    const data = (await res.json()) as unknown;
    const text = extractChatText(data);
    if (!text) {
      const preview = JSON.stringify(data).slice(0, 280);
      throw new Error(`Empty OpenAI response. Payload: ${preview}`);
    }
    return text;
  }

  private async callAnthropic(system: string, user: string, signal: AbortSignal): Promise<string> {
    const base = (this.settings.baseUrl || DEFAULT_ANTHROPIC_BASE).replace(/\/$/, '');
    const model = this.settings.model || DEFAULT_ANTHROPIC_MODEL;
    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: LLM_BUDGET.maxTokens,
        temperature: LLM_BUDGET.temperature,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic error ${res.status}: ${body.slice(0, 280)}`);
    }
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = data.content?.find((c) => c.type === 'text')?.text;
    if (!text) throw new Error('Empty Anthropic response');
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

function buildPrompt(ctx: GenerationContext, allowGore: boolean): { system: string; user: string } {
  const goreLine = allowGore
    ? 'Mild blood/gore allowed sparingly. Still no torture-porn.'
    : 'No blood, gore, wounds, or graphic violence.';

  const system = [
    'You design ONE liminal first-person dream room as a single JSON object.',
    'Return ONLY JSON. No markdown fences. No commentary.',
    'This JSON is a structural room plan for a WebGL engine with furniture kits.',
    'Style: uncanny, liminal, cinematic interiors. Sometimes unsettling (giant baby ok), not always horror.',
    'Never sexual, pornographic, or obscene.',
    goreLine,
    'Required keys: title, blurb, themeTags, mood, width, depth, height, fogNear, fogFar, linkColor, openSides, palette, physics, props, entities.',
    'mood: upper|downer|static|dynamic.',
    'palette: floor,ceiling,walls,accent,fog,light,ambient as CSS hex colors.',
    'physics: gravity,moveSpeed,friction,bounce,sway numbers.',
    'props items: id,label,shape,position,rotationY,scale,color,linksOnTouch,solid,kind.',
    'entities items: id,label,shape,position,scale,color,behavior,speed,linksOnTouch,kind.',
    'shape: box|sphere|cylinder|cone|torus|plane. behavior: idle|wander|orbit|stare.',
    'kind one of: chair,desk,vending,cabinet,crib,plant,payphone,cooler,cart,door_fake,mattress,sign,bottle_giant,mirror,bench,pillar,lamp,table,shelf,tv,figure_baby,figure_clerk,figure_deer,figure_mannequin,figure_shadow,figure_balloon,figure_guide,figure_raincoat.',
    'Room centered at origin. Floor at y=0. Put prop/entity feet on floor (position.y = 0).',
    'width/depth 10-24, height 2.8-6. props 6-12, entities 1-3.',
    'At least one linksOnTouch true wall-adjacent prop or entity.',
    'Keep spawn center clear of solids within radius 1.8.',
  ].join(' ');

  const user = JSON.stringify({
    seed: ctx.seed,
    parentSeed: ctx.parentSeed ?? null,
    moodBias: ctx.moodBias,
    linkIndex: ctx.linkIndex,
    avoidTitles: ctx.previousTitles.slice(-6),
    note: 'Compose a specific memorable interior, not abstract shapes.',
  });

  return { system, user };
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
