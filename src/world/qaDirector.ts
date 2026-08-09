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

export type QaFallbackField = 'THEME_ID' | 'TITLE' | 'MOOD' | 'GIANT' | 'BLURB';

/**
 * Parse the fenced keyed record (or legacy numbered answers), then hand its usable
 * fields to the procedural director for layout and per-field fallback values.
 */
export function parseQaDirection(
  text: string,
  seed: string,
  ctx?: Pick<
    GenerationContext,
    | 'previousTitles'
    | 'moodBias'
    | 'allowGore'
    | 'noFlashingLights'
    | 'noLowLight'
    | 'linkIndex'
    | 'recentRooms'
  >,
  onFieldFallback?: (fields: QaFallbackField[]) => void,
): RoomDirection | null {
  if (!text?.trim()) return null;

  const cleaned = stripModelNoise(extractBestPayload(text));
  const byNum = extractNumberedAnswers(cleaned);
  const byKey = extractKeyedAnswers(cleaned);
  const byTable = extractTableAnswers(cleaned);
  const answerCount = new Set([
    ...byNum.keys(),
    ...byKey.keys(),
    ...byTable.keys(),
  ]).size;

  // Only structured records are data. Treating arbitrary prose as a partial
  // answer lets a model's echoed prompt masquerade as a generated room.
  if (answerCount < 1) return null;

  const get = (n: number): string =>
    sanitizeAnswer(byKey.get(n) ?? byTable.get(n) ?? byNum.get(n) ?? '');

  const themeRaw = get(1);
  const titleRaw = get(2);
  const moodRaw = get(3);
  const blurbRaw = get(5) || get(9);
  const recognizedTheme = findTheme(themeRaw);
  const validTitle = isUsableTitle(titleRaw);
  const parsedMood = parseMoodAnswer(moodRaw);
  const validBlurb = isUsableBlurb(blurbRaw);
  // Support both short form (4=giant, 5=blurb) and older 9-field form.
  const giantField = get(4);
  const legacyAssets = get(7);
  const legacyGiant = get(8);
  const preferAssets = tokenizeAssets(legacyAssets);
  const parsedGiant =
    parseBooleanAnswer(giantField) ?? parseBooleanAnswer(legacyGiant);
  const giantFromAsset = preferAssets.includes('anomaly_giant_baby');

  // Reject a copied questionnaire only when it contributed nothing usable. If even
  // one field is real, preserve it and let the seeded director fill the bad fields.
  if (
    answerCount > 0 &&
    !recognizedTheme &&
    !validTitle &&
    !parsedMood &&
    !validBlurb &&
    parsedGiant === null &&
    !giantFromAsset
  ) {
    return null;
  }

  const theme = recognizedTheme ?? resolveTheme('', seed);
  const mood = parsedMood ?? theme.mood;
  const giant = parsedGiant === true || giantFromAsset;

  const fallbackFields: QaFallbackField[] = [];
  if (!recognizedTheme) fallbackFields.push('THEME_ID');
  if (!validTitle) fallbackFields.push('TITLE');
  if (!parsedMood) fallbackFields.push('MOOD');
  if (parsedGiant === null && !giantFromAsset) fallbackFields.push('GIANT');
  if (!validBlurb) fallbackFields.push('BLURB');
  if (fallbackFields.length > 0) onFieldFallback?.(fallbackFields);

  const steer: DirectorSteer = {
    themeId: theme.id,
    mood,
    title: validTitle ? cleanTitle(titleRaw, theme.title) : undefined,
    blurb: validBlurb ? cleanBlurb(blurbRaw, theme.blurb) : undefined,
    preferAssets,
    giant,
  };

  // Offline director owns placement density, door landmarks, packs, and palette jitter.
  const dir = generateOfflineDirection(
    {
      seed,
      previousTitles: ctx?.previousTitles ?? [],
      moodBias: ctx?.moodBias ?? mood,
      allowGore: ctx?.allowGore ?? false,
      noFlashingLights: ctx?.noFlashingLights ?? false,
      noLowLight: ctx?.noLowLight ?? false,
      linkIndex: ctx?.linkIndex ?? 0,
      recentRooms: ctx?.recentRooms,
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
    /(?:^|[\s;])(?:q\s*)?[1-5]\s*[:.)\-\]](?=\s|$)/i.test(text) ||
    /^\s*=+\s*(?:theme(?:_id)?|title|mood|giant(?:_baby)?|blurb)\s*=+/im.test(
      text,
    ) ||
    /^\s*\|?\s*theme_id\s*\|\s*title\s*\|\s*mood\s*\|\s*giant\s*\|\s*blurb\s*\|?\s*$/im.test(
      text,
    )
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
  const byKey = new Map<number, string>();
  const lines = text.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const marker = keyedFieldMarker(lines[lineIndex] || '');
    if (!marker || byKey.has(marker.number)) continue;

    let raw = marker.inline;
    if (!sanitizeAnswer(raw)) {
      const following: string[] = [];
      for (let valueIndex = lineIndex + 1; valueIndex < lines.length; valueIndex += 1) {
        const line = lines[valueIndex] || '';
        if (keyedFieldMarker(line)) break;
        const value = line.trim();
        if (value && !/^[-=]{3,}$/.test(value)) following.push(value);
      }
      raw = following.join(' ');
    }

    const answer = sanitizeAnswer(raw);
    if (answer) byKey.set(marker.number, answer);
  }
  return byKey;
}

function keyedFieldMarker(line: string): { number: number; inline: string } | null {
  const cleaned = line
    .trim()
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*]\s+/, '')
    .replace(/\*\*/g, '')
    .trim();
  const heading =
    /^=+\s*(theme(?:_id)?|title|mood|giant(?:_baby)?|blurb)\s*=+\s*(.*?)\s*$/i.exec(
      cleaned,
    );
  const keyed =
    /^(theme(?:_id)?|title|mood|giant(?:_baby)?|blurb)\s*[:=]\s*(.*?)\s*$/i.exec(
      cleaned,
    );
  const match = heading || keyed;
  const number = FIELD_NUMBERS[(match?.[1] || '').toLowerCase()];
  return match && number ? { number, inline: match[2] || '' } : null;
}

const FIELD_NUMBERS: Record<string, number> = {
  theme: 1,
  theme_id: 1,
  title: 2,
  mood: 3,
  giant: 4,
  giant_baby: 4,
  blurb: 5,
};

/** Accept the compact Markdown table that some instruct models prefer to emit. */
function extractTableAnswers(text: string): Map<number, string> {
  const lines = text.split(/\r?\n/);
  for (let headerIndex = 0; headerIndex < lines.length; headerIndex += 1) {
    const headers = tableCells(lines[headerIndex] || '');
    const columns = headers.map((header) => FIELD_NUMBERS[normalizeFieldName(header)]);
    if (![1, 2, 3, 4, 5].every((field) => columns.includes(field))) continue;

    for (let rowIndex = headerIndex + 1; rowIndex < lines.length; rowIndex += 1) {
      const cells = tableCells(lines[rowIndex] || '');
      if (!cells.length || cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
      if (cells.length < headers.length) break;

      const byTable = new Map<number, string>();
      columns.forEach((field, columnIndex) => {
        const answer = sanitizeAnswer(cells[columnIndex] || '');
        if (field && answer && !byTable.has(field)) byTable.set(field, answer);
      });
      return byTable;
    }
  }
  return new Map();
}

function tableCells(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return [];
  return trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function normalizeFieldName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[*`]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_');
}

export function browserQaPrompt(ctx: {
  seed: string;
  moodBias: MoodAxis;
  previousTitles: string[];
  allowGore: boolean;
}): { system: string; user: string } {
  const themes = selectThemeIds(ctx.seed, 5).join(', ');
  const system = [
    'Generate one tiny room record.',
    'Return only one Markdown block labeled kettermean.',
    'Inside it, write five equals-sign lines named THEME_ID, TITLE, MOOD, GIANT, and BLURB, in that order.',
    'Choose a supplied theme. Invent a two-to-five-word title and one short atmospheric sentence.',
    'MOOD is upper, downer, static, or dynamic. GIANT is yes or no.',
    'Do not repeat the request or explain your answer.',
    'No JSON. No thinking. No okay. No extra fields.',
    ctx.allowGore ? 'Mild gore ok.' : 'No gore.',
  ].join('\n');

  const user = [
    `Preferred mood: ${ctx.moodBias}.`,
    `Theme options: ${themes}.`,
    `Avoid title: ${ctx.previousTitles.at(-1) || 'none'}.`,
    'Complete the five-field room block now.',
  ].join('\n');

  return { system, user };
}

function selectThemeIds(seed: string, count: number): string[] {
  const pool = listThemeIds();
  const rng = new SeededRng(`${seed}:browser-theme-options`);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.int(0, index);
    [pool[index], pool[swapIndex]] = [pool[swapIndex]!, pool[index]!];
  }
  return pool.slice(0, count);
}

function findTheme(raw: string) {
  const value = raw.trim();
  if (!value || isInstructionEcho(value)) return undefined;

  const direct = getTheme(value);
  if (direct) return direct;

  const normalized = value.toLowerCase().replace(/[\s-]+/g, '_');
  return THEME_PRESETS.find(
    (theme) =>
      normalized === theme.id.toLowerCase() ||
      normalized === theme.title.toLowerCase().replace(/[\s-]+/g, '_'),
  );
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
  const words = value.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word));
  return (
    value.length >= 2 &&
    words.length >= 2 &&
    words.length <= 5 &&
    !isChatJunk(value) &&
    !isInstructionEcho(value)
  );
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

function clip(s: string, n: number): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, n);
}
