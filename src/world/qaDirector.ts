import type { MoodAxis } from '../types';
import {
  ASSETS,
  THEME_PRESETS,
  getAsset,
  getTheme,
  listThemeIds,
  type DirectedPlacement,
  type RoomDirection,
} from './assetCatalog';
import { SeededRng } from '../core/rng';

const PORTAL_IDS = new Set(['door_fake', 'door_service', 'door_glass', 'arch_portal']);

/**
 * Parse numbered Q&A answers from a tiny browser model into a RoomDirection.
 * ONLY numbered lines count (1. … 9.). Freeform chat preamble is ignored.
 * Returns null if the model did not answer enough questions cleanly.
 */
export function parseQaDirection(text: string, seed: string): RoomDirection | null {
  if (!text?.trim()) return null;

  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .trim();

  const byNum = extractNumberedAnswers(cleaned);
  // Require real indexed answers — do NOT fall back to raw line order.
  // Q1 theme and Q2 title (or Q7 assets) are the minimum signal.
  if (byNum.size < 3) return null;
  if (!byNum.has(1) && !byNum.has(7)) return null;

  const get = (n: number): string => sanitizeAnswer(byNum.get(n) ?? '');

  const theme = resolveTheme(get(1), seed);
  if (!theme) return null;

  const title = cleanTitle(get(2), theme.title);
  const mood = moodOf(get(3) || theme.mood);
  const width = numIn(get(4), theme.width, 8, 28);
  const depth = numIn(get(5), theme.depth, 8, 28);
  const height = numIn(get(6), theme.height, 2.5, 9);
  const assetLine = get(7) || theme.preferredAssets.join(', ');
  const giantLine = get(8) || 'none';
  const blurb = cleanBlurb(get(9), theme.blurb);

  // Title/blurb still look like chat filler → reject so caller can repair/offline.
  if (isChatJunk(title) || isChatJunk(blurb)) return null;

  const ids = tokenizeAssets(assetLine);
  if (giantLine && !/^none$/i.test(giantLine)) {
    for (const id of tokenizeAssets(giantLine)) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  // Prefer theme kit if model gave almost nothing usable.
  if (ids.length < 3) {
    for (const id of theme.preferredAssets) {
      if (!ids.includes(id)) ids.push(id);
      if (ids.length >= 8) break;
    }
  }
  if (!ids.some((id) => PORTAL_IDS.has(id))) ids.push('door_fake');

  const rng = new SeededRng(`${seed}:qa`);
  const placements: DirectedPlacement[] = [];
  const usable = ids
    .map((id) => getAsset(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  if (usable.length < 2) return null;

  usable.slice(0, 10).forEach((asset, i) => {
    let scaleMul = 1;
    if (asset.id === 'anomaly_giant_baby') scaleMul = rng.float(2.4, 3.6);
    else if (asset.category === 'anomaly') scaleMul = rng.float(1.1, Math.min(2.2, asset.scaleRange.max));
    else scaleMul = rng.float(0.9, 1.15);
    scaleMul = clamp(scaleMul, asset.scaleRange.min, asset.scaleRange.max);

    const isDoor = asset.category === 'portal' || PORTAL_IDS.has(asset.id);
    let x = 0;
    let z = 0;
    let rotY = rng.float(0, Math.PI * 2);

    if (isDoor) {
      const wall = i % 4;
      if (wall === 0) {
        x = -width / 2 + 0.4;
        z = rng.float(-depth * 0.3, depth * 0.3);
        rotY = Math.PI / 2;
      } else if (wall === 1) {
        x = width / 2 - 0.4;
        z = rng.float(-depth * 0.3, depth * 0.3);
        rotY = -Math.PI / 2;
      } else if (wall === 2) {
        z = -depth / 2 + 0.4;
        x = rng.float(-width * 0.3, width * 0.3);
        rotY = 0;
      } else {
        z = depth / 2 - 0.4;
        x = rng.float(-width * 0.3, width * 0.3);
        rotY = Math.PI;
      }
    } else {
      const margin = 1.4 + asset.defaultScale.x * scaleMul * 0.3;
      x = rng.float(-width / 2 + margin, width / 2 - margin);
      z = rng.float(-depth / 2 + margin, depth / 2 - margin);
      if (Math.hypot(x, z) < 1.8) {
        x += Math.sign(x || 1) * 2.2;
        z += Math.sign(z || 1) * 2.2;
      }
    }

    placements.push({
      assetId: asset.id,
      x,
      z,
      rotY,
      scaleMul,
      linksOnTouch: isDoor,
      solid:
        asset.solidDefault !== false &&
        asset.category !== 'npc' &&
        asset.category !== 'creature' &&
        asset.category !== 'anomaly',
      behavior: asset.defaultBehavior,
    });
  });

  if (!placements.some((p) => p.linksOnTouch)) {
    placements.push({
      assetId: 'door_fake',
      x: -width / 2 + 0.4,
      z: 0,
      rotY: Math.PI / 2,
      scaleMul: 1,
      linksOnTouch: true,
      solid: true,
    });
  }

  return {
    seed,
    themeId: theme.id,
    title,
    blurb,
    mood,
    tags: [...theme.tags, mood],
    width,
    depth,
    height,
    fogNear: mood === 'downer' ? 8 : mood === 'upper' ? 16 : 12,
    fogFar: mood === 'downer' ? 28 : mood === 'upper' ? 60 : 42,
    openSides: [],
    palette: theme.palette,
    physics: physicsForMood(mood),
    placements,
    offline: false,
  };
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
  const themes = listThemeIds().join(', ');
  // Keep asset list shorter for tiny context windows — still enough variety.
  const assets = ASSETS.map((a) => a.id).join(', ');
  const system = [
    'You fill in a form. Output ONLY lines 1-9.',
    'Format exactly:',
    '1. value',
    '2. value',
    '3. value',
    '…',
    '9. value',
    'No intro. No "okay". No "let\'s". No markdown. No JSON. No extra sentences outside the 9 lines.',
    ctx.allowGore ? 'Mild gore ok.' : 'No gore.',
  ].join(' ');

  const user = [
    `seed=${ctx.seed}`,
    `moodBias=${ctx.moodBias}`,
    `avoidTitles=${ctx.previousTitles.slice(-4).join(' | ') || 'none'}`,
    '',
    `1. Pick ONE themeId exactly from: ${themes}`,
    '2. Room title: 2-5 plain words (not a sentence, not quotes)',
    '3. Mood exactly one of: upper, downer, static, dynamic',
    '4. Width number 8-28',
    '5. Depth number 8-28',
    '6. Height number 2.5-8',
    `7. 6-10 asset ids from: ${assets} (comma-separated, must include door_fake)`,
    '8. giant prop id or none',
    '9. Blurb: one short atmospheric sentence',
    '',
    'Start now with line 1.',
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

function physicsForMood(mood: MoodAxis) {
  switch (mood) {
    case 'upper':
      return { gravity: 0.85, moveSpeed: 1.15, friction: 0.9, bounce: 0.05, sway: 0.2 };
    case 'downer':
      return { gravity: 1.2, moveSpeed: 0.85, friction: 1.15, bounce: 0, sway: 0.55 };
    case 'dynamic':
      return { gravity: 1.0, moveSpeed: 1.2, friction: 0.8, bounce: 0.15, sway: 0.7 };
    default:
      return { gravity: 1, moveSpeed: 1, friction: 1, bounce: 0, sway: 0.25 };
  }
}

function numIn(v: string, fallback: number, min: number, max: number): number {
  const m = v.match(/-?\d+(\.\d+)?/);
  const n = m ? Number(m[0]) : fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clip(s: string, n: number): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, n);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
