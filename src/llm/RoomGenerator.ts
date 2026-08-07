import {
  DEFAULT_ANTHROPIC_BASE,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OPENAI_BASE,
  DEFAULT_OPENROUTER_MODEL,
  LLM_BUDGET,
  STORAGE_KEYS,
} from '../config';
import type { AppSettings, GenerationContext, MoodAxis, RoomSpec } from '../types';
import { generateOfflineRoom, applyThemeOverlay } from '../world/offlineGenerator';
import { extractJsonObject } from './schema';

interface CacheEntry {
  spec: RoomSpec;
  savedAt: number;
}

interface ThemeIdea {
  title: string;
  blurb: string;
  mood: MoodAxis;
  tags: string[];
  paletteHint?: string;
  entityHint?: string;
  propHints?: string[];
}

/**
 * Cost-aware room generation:
 * - LLM only authors a tiny theme idea (not full mesh JSON)
 * - offline layout/kits always build the playable room
 * - seed cache + single-flight + fail-open
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
      const idea = parseThemeIdea(text);
      if (!idea) {
        throw new Error(`LLM theme unusable. Preview: ${text.slice(0, 180)}`);
      }
      const base = generateOfflineRoom(ctx);
      const spec = applyThemeOverlay(base, idea);
      spec.offline = false;
      this.sessionFailures = 0;
      return spec;
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
      // Prefer plain chat content; some free models put text only in reasoning otherwise.
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    };
    // OpenRouter free router / many free models: avoid structured-output flags.
    if (base.includes('openrouter.ai')) {
      body.provider = { require_parameters: false };
    }

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
    ? 'Mild blood/gore allowed sparingly.'
    : 'No blood or gore.';

  const system = [
    'Return ONLY one minified JSON object. No markdown. No prose.',
    'You invent a liminal dream room THEME for a walking simulator.',
    'Style: uncanny, liminal, dreamlike. Sometimes unsettling, not always horror.',
    'Never sexual or obscene.',
    goreLine,
    'Schema keys: title, blurb, mood, tags, paletteHint, entityHint, propHints.',
    'mood must be one of: upper, downer, static, dynamic.',
    'title <= 40 chars. blurb <= 90 chars. tags: 2-4 short strings.',
    'propHints: up to 4 short prop names from: chair, desk, vending, crib, plant, lamp, mirror, bench, cart, door, pillar, baby, deer, mannequin, shadow.',
    'entityHint: one short creature/figure name or empty string.',
  ].join(' ');

  const user = [
    `seed=${ctx.seed}`,
    `moodBias=${ctx.moodBias}`,
    `linkIndex=${ctx.linkIndex}`,
    `avoidTitles=${JSON.stringify(ctx.previousTitles.slice(-5))}`,
    'Example: {"title":"Yellow Lobby After Hours","blurb":"The plants still wait for a receptionist.","mood":"static","tags":["lobby","fluorescent"],"paletteHint":"beige","entityHint":"hallway clerk","propHints":["desk","plant","bench","lamp"]}',
  ].join('\n');

  return { system, user };
}

function parseThemeIdea(text: string): ThemeIdea | null {
  const json = extractJsonObject(text);
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const title = typeof o.title === 'string' ? o.title.trim().slice(0, 48) : '';
  const blurb = typeof o.blurb === 'string' ? o.blurb.trim().slice(0, 120) : '';
  if (!title || !blurb) return null;
  const moodRaw = typeof o.mood === 'string' ? o.mood.toLowerCase() : 'static';
  const mood = (['upper', 'downer', 'static', 'dynamic'].includes(moodRaw)
    ? moodRaw
    : 'static') as MoodAxis;
  const tags = Array.isArray(o.tags)
    ? o.tags.filter((t): t is string => typeof t === 'string').map((t) => t.slice(0, 24)).slice(0, 6)
    : [];
  const propHints = Array.isArray(o.propHints)
    ? o.propHints.filter((t): t is string => typeof t === 'string').map((t) => t.slice(0, 32)).slice(0, 6)
    : [];
  return {
    title,
    blurb,
    mood,
    tags,
    paletteHint: typeof o.paletteHint === 'string' ? o.paletteHint.slice(0, 32) : undefined,
    entityHint: typeof o.entityHint === 'string' ? o.entityHint.slice(0, 48) : undefined,
    propHints,
  };
}

/** Pull assistant text from OpenAI-compatible / OpenRouter payload shapes. */
function extractChatText(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const root = data as Record<string, unknown>;

  // Standard chat.completion
  const choices = root.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const c0 = choices[0] as Record<string, unknown>;
    const msg = c0.message;
    if (msg && typeof msg === 'object') {
      const m = msg as Record<string, unknown>;
      const fromContent = normalizeContent(m.content);
      if (fromContent) return fromContent;
      // Reasoning models sometimes only fill these:
      const reasoning =
        normalizeContent(m.reasoning) ||
        normalizeContent(m.reasoning_content) ||
        normalizeContent((m as { reasoning_details?: unknown }).reasoning_details);
      if (reasoning) return reasoning;
    }
    const text = normalizeContent(c0.text);
    if (text) return text;
    const delta = c0.delta;
    if (delta && typeof delta === 'object') {
      const d = normalizeContent((delta as Record<string, unknown>).content);
      if (d) return d;
    }
  }

  // Some gateways put output at top level
  const top = normalizeContent(root.output_text) || normalizeContent(root.content);
  if (top) return top;

  return '';
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
        else if (p.type === 'output_text' && typeof p.text === 'string') parts.push(p.text);
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
