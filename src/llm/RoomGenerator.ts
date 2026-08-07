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
      let text = await this.callProvider(ctx, 'initial');
      this.apiCallsThisSession += 1;
      let json = extractJsonObject(text);
      let normalized = json ? normalizeRoomSpec(json, ctx.seed) : null;

      // One cheap repair pass if the model reasoned in prose instead of JSON.
      if (!normalized) {
        text = await this.callProvider(ctx, 'repair', text);
        this.apiCallsThisSession += 1;
        json = extractJsonObject(text);
        normalized = json ? normalizeRoomSpec(json, ctx.seed) : null;
      }

      if (!normalized) {
        throw new Error(`LLM room JSON unusable. Preview: ${text.slice(0, 220)}`);
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
      this.settings.provider === 'anthropic'
        ? this.callAnthropic(system, user, true)
        : this.callOpenAI(system, user, true);

    let timer: number | undefined;
    try {
      return await Promise.race([
        call,
        new Promise<string>((_, reject) => {
          timer = window.setTimeout(() => {
            reject(
              new Error(
                `LLM timed out after ${LLM_BUDGET.requestTimeoutMs}ms (request may still complete server-side)`,
              ),
            );
          }, LLM_BUDGET.requestTimeoutMs);
        }),
      ]);
    } finally {
      if (timer !== undefined) window.clearTimeout(timer);
    }
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
    ? 'Mild blood/gore allowed sparingly. Still no torture-porn.'
    : 'No blood, gore, wounds, or graphic violence.';

  const system = [
    'You are a JSON generator for a WebGL dream game.',
    'Output MUST be one valid JSON object and nothing else.',
    'No markdown. No analysis. No chain-of-thought. No keys outside the schema.',
    'Begin with { and end with }.',
    'Style: uncanny liminal cinematic interiors. Sometimes unsettling (giant baby ok).',
    'Never sexual or obscene.',
    goreLine,
    'Schema: title,blurb,themeTags,mood,width,depth,height,fogNear,fogFar,linkColor,openSides,palette,physics,props,entities.',
    'mood: upper|downer|static|dynamic.',
    'palette hex: floor,ceiling,walls,accent,fog,light,ambient.',
    'physics numbers: gravity,moveSpeed,friction,bounce,sway.',
    'props/entities use kind from furniture kits and position.y=0.',
    'kinds: chair,desk,vending,cabinet,crib,plant,payphone,cooler,cart,door_fake,mattress,sign,bottle_giant,mirror,bench,pillar,lamp,table,shelf,tv,figure_baby,figure_clerk,figure_deer,figure_mannequin,figure_shadow,figure_balloon,figure_guide,figure_raincoat.',
    'width/depth 10-24, height 2.8-6, props 6-12, entities 1-3, clear spawn center.',
  ].join(' ');

  if (mode === 'repair') {
    return {
      system,
      user: [
        'Your previous reply was invalid because it was not pure JSON.',
        'Rewrite as ONE valid JSON object only. No prose before or after.',
        `seed=${ctx.seed}`,
        `moodBias=${ctx.moodBias}`,
        `bad_reply_preview=${JSON.stringify(previousText.slice(0, 400))}`,
        'Start with { now.',
      ].join('\n'),
    };
  }

  const example = {
    title: 'Yellow Security Lobby',
    blurb: 'The ferns are still waiting for a shift change.',
    themeTags: ['lobby', 'fluorescent', 'liminal'],
    mood: 'static',
    width: 16,
    depth: 14,
    height: 3.6,
    fogNear: 10,
    fogFar: 40,
    linkColor: '#d9c27a',
    openSides: [],
    palette: {
      floor: '#9a8458',
      ceiling: '#e8e0cc',
      walls: '#d2c08a',
      accent: '#6a7a8a',
      fog: '#c8b890',
      light: '#fff2c9',
      ambient: '#a09070',
    },
    physics: { gravity: 1, moveSpeed: 1, friction: 1, bounce: 0, sway: 0.3 },
    props: [
      {
        id: 'p0',
        label: 'security desk',
        shape: 'box',
        position: { x: 0, y: 0, z: -4 },
        rotationY: 0,
        scale: { x: 1.9, y: 1, z: 0.9 },
        color: '#8a7a5a',
        linksOnTouch: false,
        solid: true,
        kind: 'desk',
      },
      {
        id: 'p1',
        label: 'exit door',
        shape: 'box',
        position: { x: -7, y: 0, z: 0 },
        rotationY: 1.57,
        scale: { x: 1.1, y: 2.3, z: 0.2 },
        color: '#6e5b45',
        linksOnTouch: true,
        solid: true,
        kind: 'door_fake',
      },
    ],
    entities: [
      {
        id: 'e0',
        label: 'hallway clerk',
        shape: 'cylinder',
        position: { x: 2, y: 0, z: -3 },
        scale: { x: 0.8, y: 2.2, z: 0.55 },
        color: '#cccccc',
        behavior: 'stare',
        speed: 0.5,
        linksOnTouch: true,
        kind: 'figure_clerk',
      },
    ],
  };

  const user = [
    `seed=${ctx.seed}`,
    `parentSeed=${ctx.parentSeed ?? ''}`,
    `moodBias=${ctx.moodBias}`,
    `linkIndex=${ctx.linkIndex}`,
    `avoidTitles=${JSON.stringify(ctx.previousTitles.slice(-6))}`,
    'Create a different room from the example, same schema.',
    `example=${JSON.stringify(example)}`,
    'Respond with JSON only.',
  ].join('\n');

  return { system, user };
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
