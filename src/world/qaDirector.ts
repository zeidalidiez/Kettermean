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

  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .trim();

  const byNum = extractNumberedAnswers(cleaned);
  // Need real indexed answers — never freeform line order.
  if (byNum.size < 1) return null;
  if (!byNum.has(1) && !byNum.has(2) && !byNum.has(3)) return null;

  const get = (n: number): string => sanitizeAnswer(byNum.get(n) ?? '');

  const theme = resolveTheme(get(1), seed);
  const titleRaw = get(2);
  const title = cleanTitle(titleRaw, theme.title);
  const mood = moodOf(get(3) || theme.mood);
  // Support both new short form (4=giant, 5=blurb) and older 9-field form.
  const giantField = get(4);
  const blurbField = get(5) || get(9);
  const legacyAssets = get(7);
  const legacyGiant = get(8);

  if (isChatJunk(titleRaw) && !byNum.has(1) && !byNum.has(3)) return null;

  const preferAssets = tokenizeAssets(legacyAssets);
  const giantText = `${giantField} ${legacyGiant}`.toLowerCase();
  const giant =
    /\byes\b/.test(giantText) ||
    giantText.includes('baby') ||
    giantText.includes('giant') ||
    preferAssets.includes('anomaly_giant_baby');

  const steer: DirectorSteer = {
    themeId: theme.id,
    mood,
    title: isChatJunk(titleRaw) ? undefined : title,
    blurb: isChatJunk(blurbField) ? undefined : cleanBlurb(blurbField, theme.blurb),
    preferAssets,
    giant,
  };

  // Offline director owns placement density, doors, layouts, palette jitter.
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

/** Pull only `N. answer` / `N) answer` / `N: answer` lines into a map keyed by N. */
export function extractNumberedAnswers(text: string): Map<number, string> {
  const byNum = new Map<number, string>();
  // Also accept multiple answers smashed into one line: "1. a 2. b 3. c"
  const re = /(?:^|[\n\r;])\s*(?:q\s*)?(\d{1,2})\s*[:.\)\-\]]\s*([^\n\r]+?)(?=(?:\s*(?:q\s*)?\d{1,2}\s*[:.\)\-\]])|$)/gi;
  let m: RegExpExecArray | null;
  const src = `\n${text}\n`;
  while ((m = re.exec(src)) !== null) {
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n < 1 || n > 12) continue;
    const ans = sanitizeAnswer(m[2] ?? '');
    if (!ans) continue;
    // First good answer wins per index (ignore later duplicates/corrections noise).
    if (!byNum.has(n)) byNum.set(n, ans);
  }
  return byNum;
}

export function browserQaPrompt(ctx: {
  seed: string;
  moodBias: MoodAxis;
  previousTitles: string[];
  allowGore: boolean;
}): { system: string; user: string } {
  // Short form only — client offline director builds full rooms from these steers.
  const themes = listThemeIds().join(', ');
  const system = [
    'Fill the form. Output ONLY numbered lines 1-5.',
    'Format: 1. value',
    'No intro. No okay. No markdown. No JSON.',
    ctx.allowGore ? 'Mild gore ok.' : 'No gore.',
  ].join(' ');

  const user = [
    `seed=${ctx.seed}`,
    `moodBias=${ctx.moodBias}`,
    `avoidTitles=${ctx.previousTitles.slice(-5).join(' | ') || 'none'}`,
    '',
    `1. themeId from: ${themes}`,
    '2. short title (2-5 words)',
    '3. mood: upper OR downer OR static OR dynamic',
    '4. giant baby? yes OR no',
    '5. one-sentence blurb',
    '',
    'Start with 1.',
  ].join('\n');

  return { system, user };
}

function resolveTheme(raw: string, seed: string) {
  const t = raw.toLowerCase().trim().replace(/\s+/g, '_');
  if (t) {
    const direct = getTheme(t) || getTheme(raw.trim());
    if (direct) return direct;
    const fuzzy =
      THEME_PRESETS.find((th) => t.includes(th.id)) ||
      THEME_PRESETS.find((th) => th.id.includes(t.slice(0, 8))) ||
      THEME_PRESETS.find((th) => t.includes(th.title.toLowerCase().replace(/\s+/g, '_')));
    if (fuzzy) return fuzzy;
  }
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
  return clip(t, 48);
}

function cleanBlurb(raw: string, fallback: string): string {
  const t = sanitizeAnswer(raw);
  if (!t || isChatJunk(t) || t.length < 4) return fallback;
  return clip(t, 120);
}

function isChatJunk(s: string): boolean {
  const t = s.toLowerCase();
  if (!t.trim()) return true;
  if (/^["'`.\s]+$/.test(s)) return true;
  return (
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
