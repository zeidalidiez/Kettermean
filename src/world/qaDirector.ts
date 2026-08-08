import type { GenerationContext, MoodAxis } from '../types';
import {
  ASSETS,
  THEME_PRESETS,
  getAsset,
  getTheme,
  listThemeIds,
  type RoomDirection,
} from './assetCatalog';
import { SeededRng } from '../core/rng';
import { sanitizeDisplayText } from '../core/contentSafety';
import { generateOfflineDirection, type DirectorSteer } from './roomDirector';

/**
 * Parse numbered Q&A answers, then hand off to the offline director for real layout variety.
 * ONLY numbered lines count (1. … 9.). Chat preamble is ignored.
 */
export function parseQaDirection(
  text: string,
  seed: string,
  ctx?: Pick<GenerationContext, 'previousTitles' | 'moodBias' | 'allowGore' | 'linkIndex'>,
): RoomDirection | null {
  if (!text?.trim()) return null;

  const cleaned = stripModelNoise(extractBestPayload(text));
  const byNum = extractNumberedAnswers(cleaned);
  const byKey = extractKeyedAnswers(cleaned);
  const answerCount = new Set([...byNum.keys(), ...byKey.keys()]).size;

  // Prefer the fenced keyed record, retain numbered replies for compatibility,
  // and only soft-salvage prose when no structured fields were found.
  const soft = answerCount < 1 ? softExtractSteer(cleaned, seed) : null;
  if (answerCount < 1 && !soft) return null;

  const get = (n: number): string => sanitizeAnswer(byKey.get(n) ?? byNum.get(n) ?? '');

  const themeRaw = get(1);
  const titleRaw = get(2) || soft?.title || '';
  const moodRaw = get(3);
  const blurbRaw = get(5) || get(9) || soft?.blurb || '';
  const recognizedTheme = findTheme(themeRaw || soft?.themeId || '');
  const validTitle = isUsableTitle(titleRaw);
  const parsedMood = parseMoodAnswer(moodRaw);
  const validBlurb = isUsableBlurb(blurbRaw);

  // A model that repeats the questionnaire has markers but no actual answers.
  // Reject it rather than putting phrases such as "short title (2-5 words)" in the HUD.
  if (answerCount > 0 && !recognizedTheme && !validTitle && !parsedMood) return null;

  const theme = recognizedTheme ?? resolveTheme('', seed);
  const mood = parsedMood ?? soft?.mood ?? theme.mood;
  // Support both short form (4=giant, 5=blurb) and older 9-field form.
  const giantField = get(4);
  const legacyAssets = get(7);
  const legacyGiant = get(8);

  const preferAssets = tokenizeAssets(legacyAssets);
  const giant =
    parseBooleanAnswer(giantField) === true ||
    parseBooleanAnswer(legacyGiant) === true ||
    preferAssets.includes('anomaly_giant_baby');

  const steer: DirectorSteer = {
    themeId: theme.id,
    mood,
    title: validTitle ? cleanTitle(titleRaw, theme.title) : undefined,
    blurb: validBlurb ? cleanBlurb(blurbRaw, theme.blurb) : undefined,
    preferAssets,
    giant,
  };

  // Offline director owns placement density, doors, packs, palette jitter.
  const dir = generateOfflineDirection(
    {
      seed,
      previousTitles: ctx?.previousTitles ?? [],
      moodBias: ctx?.moodBias ?? mood,
      allowGore: ctx?.allowGore ?? false,
      linkIndex: ctx?.linkIndex ?? 0,
    },
    steer,
  );
  dir.offline = false;
  return dir;
}

/** Prefer an explicitly labeled answer block so echoed prompts outside it cannot become data. */
function extractBestPayload(text: string): string {
  const named = /```[ \t]*kettermean[ \t]*\r?\n([\s\S]*?)```/i.exec(text);
  if (named?.[1]?.trim()) return named[1];

  const danglingNamed = /```[ \t]*kettermean[ \t]*\r?\n([\s\S]*)$/i.exec(text);
  if (danglingNamed?.[1]?.trim()) return danglingNamed[1];

  const genericFences = text.matchAll(
    /```[ \t]*(?:[a-z0-9_-]+)?[ \t]*\r?\n([\s\S]*?)```/gi,
  );
  for (const match of genericFences) {
    const candidate = match[1]?.trim() || '';
    if (looksStructured(candidate)) return candidate;
  }

  return text;
}

function looksStructured(text: string): boolean {
  return (
    /^\s*(?:theme(?:_id)?|title|mood|giant(?:_baby)?|blurb)\s*[:=]/im.test(text) ||
    /(?:^|[\s;])(?:q\s*)?[1-5]\s*[:.)\-\]](?=\s|$)/i.test(text)
  );
}

function stripModelNoise(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/<think>[\s\S]*$/gi, ' ')
    .replace(/<\/think>/gi, ' ')
    // Preserve answers inside markdown fences; remove only the fence markers.
    .replace(/```(?:[a-z0-9_-]+)?/gi, ' ')
    // Drop a leading brace we used to wrongly inject for Q&A.
    .replace(/^\{\s*/, '')
    .trim();
}

/** Last-resort: pull a known themeId / mood out of rambling prose. */
function softExtractSteer(
  text: string,
  seed: string,
): { themeId?: string; mood?: MoodAxis; title?: string; blurb?: string } | null {
  const lower = text.toLowerCase();
  const theme =
    THEME_PRESETS.find((t) => lower.includes(t.id.toLowerCase())) ||
    THEME_PRESETS.find((t) => lower.includes(t.title.toLowerCase()));
  const mood = moodOf(lower);
  if (!theme && mood === 'static' && !/\b(upper|downer|dynamic|static)\b/.test(lower)) {
    // Truly nothing useful — let caller fail/repair.
    return null;
  }
  return {
    themeId: theme?.id || resolveTheme('', seed).id,
    mood: /\b(upper|downer|dynamic|static)\b/.test(lower) ? mood : theme?.mood,
  };
}

/** Pull only `N. answer` / `N) answer` / `N: answer` lines into a map keyed by N. */
export function extractNumberedAnswers(text: string): Map<number, string> {
  const byNum = new Map<number, string>();
  const markers = [
    ...text.matchAll(/(?:^|[\s;])(?:q\s*)?(\d{1,2})\s*[:.\)\-\]](?=\s|$)\s*/gi),
  ];
  for (let i = 0; i < markers.length; i += 1) {
    const marker = markers[i]!;
    const n = Number(marker[1]);
    if (!Number.isFinite(n) || n < 1 || n > 12) continue;
    const start = (marker.index ?? 0) + marker[0].length;
    const end = markers[i + 1]?.index ?? text.length;
    const ans = sanitizeAnswer(text.slice(start, end));
    if (!ans) continue;
    // First good answer wins per index (ignore later duplicates/corrections noise).
    if (!byNum.has(n)) byNum.set(n, ans);
  }
  return byNum;
}

function extractKeyedAnswers(text: string): Map<number, string> {
  const fieldNumbers: Record<string, number> = {
    theme: 1,
    theme_id: 1,
    title: 2,
    mood: 3,
    giant: 4,
    giant_baby: 4,
    blurb: 5,
  };
  const byKey = new Map<number, string>();
  const fields = text.matchAll(
    /^\s*(theme(?:_id)?|title|mood|giant(?:_baby)?|blurb)\s*[:=]\s*(.*?)\s*$/gim,
  );
  for (const match of fields) {
    const number = fieldNumbers[(match[1] || '').toLowerCase()];
    const answer = sanitizeAnswer(match[2] || '');
    if (number && answer && !byKey.has(number)) byKey.set(number, answer);
  }
  return byKey;
}

export function browserQaPrompt(ctx: {
  seed: string;
  moodBias: MoodAxis;
  previousTitles: string[];
  allowGore: boolean;
}): { system: string; user: string } {
  const themes = listThemeIds().join(', ');
  const system = [
    'You generate one tiny room record, not conversation or analysis.',
    'Return exactly one Markdown code block labeled kettermean and no text outside it.',
    'Inside it, output exactly five lines using the shown field names and equals signs.',
    'Invent the values. Never copy instructions, rules, angle-bracket placeholders, or field descriptions as values.',
    'Template (replace every angle-bracket value):',
    '```kettermean',
    'THEME_ID=<one allowed theme id>',
    'TITLE=<invented atmospheric title>',
    'MOOD=<upper, downer, static, or dynamic>',
    'GIANT=<yes or no>',
    'BLURB=<invented atmospheric sentence>',
    '```',
    'No JSON. No thinking. No okay. No extra fields.',
    ctx.allowGore ? 'Mild gore ok.' : 'No gore.',
  ].join('\n');

  const user = [
    `Create a different room record for seed ${ctx.seed}.`,
    `Mood preference: ${ctx.moodBias}.`,
    `Titles to avoid: ${ctx.previousTitles.slice(-5).join(' | ') || 'none'}.`,
    `Allowed THEME_ID values: ${themes}.`,
    'TITLE rule: invent an atmospheric title of two to five words.',
    'MOOD rule: use exactly upper, downer, static, or dynamic.',
    'GIANT rule: use exactly yes or no.',
    'BLURB rule: invent one short atmospheric sentence.',
    'Return the completed kettermean block now.',
  ].join('\n');

  return { system, user };
}

function findTheme(raw: string) {
  const t = raw.toLowerCase().trim().replace(/\s+/g, '_');
  if (t && !isInstructionEcho(raw)) {
    const direct = getTheme(t) || getTheme(raw.trim());
    if (direct) return direct;
    const fuzzy = THEME_PRESETS.find(
      (theme) =>
        t.includes(theme.id) ||
        (t.length >= 4 && theme.id.includes(t.slice(0, 8))) ||
        t.includes(theme.title.toLowerCase().replace(/\s+/g, '_')),
    );
    if (fuzzy) return fuzzy;
  }
  return undefined;
}

function resolveTheme(raw: string, seed: string) {
  const matched = findTheme(raw);
  if (matched) return matched;
  // Deterministic theme from seed when model fails Q1 but other answers exist.
  const rng = new SeededRng(`${seed}:theme`);
  return rng.pick(THEME_PRESETS);
}

function sanitizeAnswer(s: string): string {
  return s
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^\s*(?:answer\s*)?(?:is|=)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(raw: string, fallback: string): string {
  let t = sanitizeAnswer(raw)
    .replace(/^the title is\s*/i, '')
    .replace(/^title\s*[:=]\s*/i, '')
    .replace(/^["""']+|["""']+$/g, '')
    .trim();
  if (!t || isChatJunk(t) || t.length < 2) return fallback;
  // Strip trailing mood tags the model sometimes glues on
  t = t.replace(/\s*[-–—|·]\s*(upper|downer|static|dynamic)\s*$/i, '').trim();
  return sanitizeDisplayText(clip(t, 48), fallback, 48);
}

function cleanBlurb(raw: string, fallback: string): string {
  const t = sanitizeAnswer(raw);
  if (!t || isChatJunk(t) || t.length < 4) return fallback;
  return sanitizeDisplayText(clip(t, 120), fallback, 120);
}

function isUsableTitle(raw: string): boolean {
  const value = sanitizeAnswer(raw);
  return value.length >= 2 && !isChatJunk(value) && !isInstructionEcho(value);
}

function isUsableBlurb(raw: string): boolean {
  const value = sanitizeAnswer(raw);
  return value.length >= 4 && !isChatJunk(value) && !isInstructionEcho(value);
}

function parseMoodAnswer(raw: string): MoodAxis | null {
  const value = sanitizeAnswer(raw).toLowerCase().replace(/[.!]+$/, '').trim();
  return ['upper', 'downer', 'static', 'dynamic'].includes(value)
    ? (value as MoodAxis)
    : null;
}

function parseBooleanAnswer(raw: string): boolean | null {
  const value = sanitizeAnswer(raw).toLowerCase().replace(/[.!]+$/, '').trim();
  if (value === 'yes' || value === 'true') return true;
  if (value === 'no' || value === 'false') return false;
  return null;
}

function isInstructionEcho(raw: string): boolean {
  const value = sanitizeAnswer(raw).toLowerCase();
  return (
    /^(?:a\s+)?short\s+title\b/.test(value) ||
    /\b(?:2|two)\s*(?:-|–|to)\s*(?:5|five)\s+words?\b/.test(value) ||
    /^(?:one\s+)?short\s+blurb\b/.test(value) ||
    /^theme(?:_?id)?\b.*\b(?:one of|allowed|choose|select)\b/.test(value) ||
    /^mood\b.*\b(?:one of|upper|downer|static|dynamic)\b/.test(value) ||
    /^giant(?:\s+baby)?\??\s+(?:yes\s+or\s+no|true\s+or\s+false)\b/.test(value) ||
    /^(?:invent|write|choose|select|use exactly|value)\b/.test(value) ||
    /^<[^>]+>$/.test(value)
  );
}

function isChatJunk(s: string): boolean {
  const t = s.toLowerCase();
  if (!t.trim()) return true;
  if (/^["'`.\s]+$/.test(s)) return true;
  return (
    isInstructionEcho(s) ||
    t.includes('let’s tackle') ||
    t.includes("let's tackle") ||
    t.includes('step by step') ||
    t.includes('as an ai') ||
    t.includes('i will answer') ||
    t.includes('here are the answers') ||
    t.includes('here is the') ||
    t.startsWith('okay') ||
    t.startsWith('ok,') ||
    t.startsWith('sure') ||
    t.startsWith('of course') ||
    t.startsWith('certainly') ||
    /^the title is\b/.test(t) ||
    t === 'none' ||
    t === 'n/a' ||
    t === 'null' ||
    t === 'undefined'
  );
}

function tokenizeAssets(line: string): string[] {
  return line
    .split(/[,|/;]+/)
    .map((s) => sanitizeAnswer(s))
    .filter(Boolean)
    .map((s) => s.replace(/\s+/g, '_').toLowerCase())
    .map((s) => {
      const direct = getAsset(s);
      if (direct) return direct.id;
      const byLabel = ASSETS.find((a) => a.label.toLowerCase().replace(/\s+/g, '_') === s);
      return byLabel?.id || s;
    })
    .filter((id) => Boolean(getAsset(id)));
}

function moodOf(v: string): MoodAxis {
  const t = v.toLowerCase();
  if (/\bupper\b/.test(t)) return 'upper';
  if (/\bdowner\b/.test(t)) return 'downer';
  if (/\bdynamic\b/.test(t)) return 'dynamic';
  if (/\bstatic\b/.test(t)) return 'static';
  return 'static';
}

function clip(s: string, n: number): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, n);
}
