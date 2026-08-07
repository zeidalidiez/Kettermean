import {
  DEFAULT_ANTHROPIC_BASE,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OPENAI_BASE,
  DEFAULT_OPENAI_MODEL,
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
 * Generates rooms with aggressive cost controls:
 * - seed-keyed memory + localStorage cache
 * - single in-flight network request
 * - at most one prefetch
 * - compact prompt / low max_tokens
 * - fail-open to offline generator
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
    this.settings = settings;
  }

  getApiCallCount(): number {
    return this.apiCallsThisSession;
  }

  /** Sync path used when a room must exist immediately (start / link). */
  getOrOffline(ctx: GenerationContext): RoomSpec {
    const cached = this.memory.get(cacheKey(ctx));
    if (cached) return cached;
    const offline = generateOfflineRoom(ctx);
    this.remember(ctx, offline);
    return offline;
  }

  /**
   * Async generation: returns cache hit, joins in-flight promise,
   * or fires at most one LLM call. Never stacks duplicate seed requests.
   */
  async get(ctx: GenerationContext): Promise<RoomSpec> {
    const key = cacheKey(ctx);
    const cached = this.memory.get(key);
    if (cached) return cached;

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

  /** Prefetch next room if none in flight and not cached. */
  prefetch(ctx: GenerationContext): void {
    if (this.settings.provider === 'offline') return;
    if (!this.settings.apiKey.trim()) return;
    if (this.inflight.size >= LLM_BUDGET.maxInFlight) return;
    if (this.memory.has(cacheKey(ctx))) return;
    if (this.sessionFailures > 0 && LLM_BUDGET.failOpenToOffline) return;
    void this.get(ctx);
  }

  private async generate(ctx: GenerationContext): Promise<RoomSpec> {
    if (this.settings.provider === 'offline' || !this.settings.apiKey.trim()) {
      return generateOfflineRoom(ctx);
    }
    if (this.sessionFailures > 0 && LLM_BUDGET.failOpenToOffline) {
      return generateOfflineRoom(ctx);
    }

    try {
      const text = await this.callProvider(ctx);
      this.apiCallsThisSession += 1;
      const json = extractJsonObject(text);
      const normalized = json ? normalizeRoomSpec(json, ctx.seed) : null;
      if (!normalized) {
        throw new Error('LLM returned unusable room JSON');
      }
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
    const model = this.settings.model || DEFAULT_OPENAI_MODEL;
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: LLM_BUDGET.temperature,
        max_tokens: LLM_BUDGET.maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI-compatible error ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty OpenAI response');
    return content;
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
        // Browser calls often need a CORS proxy; document this in README.
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
      throw new Error(`Anthropic error ${res.status}: ${body.slice(0, 200)}`);
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
    // Bound memory
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
      // ignore corrupt cache
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
      // quota errors ignored
    }
  }
}

function cacheKey(ctx: GenerationContext): string {
  // Gore flag affects content; include it so toggles don't reuse wrong rooms.
  return `${ctx.seed}|g=${ctx.allowGore ? 1 : 0}`;
}

function buildPrompt(ctx: GenerationContext, allowGore: boolean): { system: string; user: string } {
  const goreLine = allowGore
    ? 'Mild blood/gore allowed sparingly. Still no torture-porn focus.'
    : 'No blood, gore, wounds, or graphic violence.';

  const system = [
    'You generate ONE liminal dream room as compact JSON for a WebGL game.',
    'Return ONLY a JSON object. No markdown.',
    'Style: uncanny, liminal, dreamlike. Sometimes unsettling (e.g. giant baby), not always horror.',
    'Never sexual, pornographic, or obscene. No minors in sexual contexts.',
    goreLine,
    'Use primitive props only: box|sphere|cylinder|cone|torus|plane.',
    'Entities behaviors: idle|wander|orbit|stare.',
    'mood: upper|downer|static|dynamic.',
    'Keep props<=10, entities<=3. Short title/blurb.',
    'Coordinates: room centered at origin; floor y=0; prop y = scale.y/2.',
  ].join(' ');

  const user = JSON.stringify({
    seed: ctx.seed,
    parentSeed: ctx.parentSeed ?? null,
    moodBias: ctx.moodBias,
    linkIndex: ctx.linkIndex,
    avoidTitles: ctx.previousTitles.slice(-6),
    schema: {
      title: 'string',
      blurb: 'string',
      themeTags: ['string'],
      mood: 'static',
      width: 12,
      depth: 12,
      height: 3.5,
      fogNear: 8,
      fogFar: 28,
      linkColor: '#ccc',
      openSides: ['north'],
      palette: {
        floor: '#',
        ceiling: '#',
        walls: '#',
        accent: '#',
        fog: '#',
        light: '#',
        ambient: '#',
      },
      physics: { gravity: 1, moveSpeed: 1, friction: 1, bounce: 0, sway: 0.3 },
      props: [
        {
          id: 'p0',
          label: 'chair',
          shape: 'box',
          position: { x: 0, y: 0.5, z: 2 },
          scale: { x: 1, y: 1, z: 1 },
          color: '#888',
          linksOnTouch: false,
          solid: true,
        },
      ],
      entities: [
        {
          id: 'e0',
          label: 'figure',
          shape: 'cylinder',
          position: { x: 3, y: 1, z: -2 },
          scale: { x: 1, y: 2, z: 1 },
          color: '#aaa',
          behavior: 'stare',
          speed: 0.5,
          linksOnTouch: true,
        },
      ],
    },
  });

  return { system, user };
}
