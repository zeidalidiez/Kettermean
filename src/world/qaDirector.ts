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

/**
 * Parse numbered Q&A answers from a tiny browser model into a RoomDirection.
 * Tolerates "1. foo", "1) foo", "1: foo", missing numbers, and freeform lines.
 */
export function parseQaDirection(text: string, seed: string): RoomDirection | null {
  if (!text?.trim()) return null;
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .trim();

  const byNum = new Map<number, string>();
  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const m = line.match(/^\s*(?:q\s*)?(\d{1,2})\s*[\:\.\)\-\]]\s*(.+)$/i);
    if (m) {
      byNum.set(Number(m[1]), m[2]!.trim());
      continue;
    }
  }

  // If numbering failed, take first non-empty lines in order.
  const ordered: string[] = [];
  for (let i = 1; i <= 10; i += 1) {
    if (byNum.has(i)) ordered.push(byNum.get(i)!);
  }
  if (ordered.length < 4) {
    for (const line of lines) {
      if (/^\s*(?:answer|a)\s*\d/i.test(line)) continue;
      ordered.push(line.replace(/^\s*[-*•]\s*/, ''));
    }
  }

  const get = (n: number, fallback = ''): string =>
    (byNum.get(n) ?? ordered[n - 1] ?? fallback).trim();

  const themeIdRaw = get(1);
  const theme =
    getTheme(themeIdRaw) ||
    getTheme(themeIdRaw.toLowerCase().replace(/\s+/g, '_')) ||
    THEME_PRESETS.find((t) => themeIdRaw.toLowerCase().includes(t.id.replace(/_/g, ' '))) ||
    THEME_PRESETS.find((t) => t.id.includes(themeIdRaw.toLowerCase().slice(0, 6))) ||
    undefined;

  const title = clip(get(2, theme?.title || 'Drift Room'), 48);
  const mood = moodOf(get(3, theme?.mood || 'static'));
  const width = numIn(get(4), theme?.width ?? 14, 8, 28);
  const depth = numIn(get(5), theme?.depth ?? 14, 8, 28);
  const height = numIn(get(6), theme?.height ?? 3.5, 2.4, 9);
  const assetLine = get(7, (theme?.preferredAssets || []).join(','));
  const giantLine = get(8, 'none');
  const blurb = clip(get(9, theme?.blurb || 'The room waits.'), 120);

  const ids = tokenizeAssets(assetLine);
  if (giantLine && !/^none$/i.test(giantLine)) {
    const g = tokenizeAssets(giantLine);
    for (const id of g) if (!ids.includes(id)) ids.push(id);
  }
  // Always ensure a door portal.
  if (!ids.includes('door_fake')) ids.push('door_fake');

  const rng = new SeededRng(`${seed}:qa`);
  const placements: DirectedPlacement[] = [];
  const usable = ids
    .map((id) => getAsset(id) || ASSETS.find((a) => a.label.toLowerCase() === id.toLowerCase()))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  if (usable.length < 2 && theme) {
    for (const id of theme.preferredAssets.slice(0, 8)) {
      const a = getAsset(id);
      if (a && !usable.some((u) => u.id === a.id)) usable.push(a);
    }
  }
  if (usable.length < 1) return null;

  usable.slice(0, 10).forEach((asset, i) => {
    let scaleMul = 1;
    if (asset.id === 'anomaly_giant_baby' || /giant/i.test(giantLine)) {
      scaleMul = asset.id === 'anomaly_giant_baby' ? rng.float(2.4, 3.6) : rng.float(1.2, 1.8);
    } else if (asset.category === 'anomaly') {
      scaleMul = rng.float(1.1, Math.min(2.2, asset.scaleRange.max));
    } else {
      scaleMul = rng.float(0.9, 1.2);
    }
    scaleMul = clamp(scaleMul, asset.scaleRange.min, asset.scaleRange.max);

    const margin = 1.4 + asset.defaultScale.x * scaleMul * 0.3;
    let x = rng.float(-width / 2 + margin, width / 2 - margin);
    let z = rng.float(-depth / 2 + margin, depth / 2 - margin);
    if (Math.hypot(x, z) < 1.8) {
      x += Math.sign(x || 1) * 2.2;
      z += Math.sign(z || 1) * 2.2;
    }

    // Doors sit on walls.
    const isDoor = asset.category === 'portal' || asset.id === 'door_fake';
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
    }

    placements.push({
      assetId: asset.id,
      x,
      z,
      rotY,
      scaleMul,
      // ONLY doors/portals link rooms.
      linksOnTouch: isDoor,
      solid: asset.solidDefault !== false && asset.category !== 'npc' && asset.category !== 'creature' && asset.category !== 'anomaly',
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
    themeId: theme?.id,
    title: title || theme?.title || 'Unnamed Room',
    blurb,
    mood,
    tags: [...(theme?.tags || ['liminal']), mood],
    width,
    depth,
    height,
    fogNear: mood === 'downer' ? 8 : mood === 'upper' ? 16 : 12,
    fogFar: mood === 'downer' ? 28 : mood === 'upper' ? 60 : 42,
    openSides: [], // doors only — no open-wall teleports
    palette: theme?.palette,
    physics: physicsForMood(mood),
    placements,
    offline: false,
  };
}

export function browserQaPrompt(ctx: {
  seed: string;
  moodBias: MoodAxis;
  previousTitles: string[];
  allowGore: boolean;
}): { system: string; user: string } {
  const themes = listThemeIds().join(', ');
  const assets = ASSETS.map((a) => a.id).join(', ');
  const system = [
    'Answer the numbered questions only.',
    'One short answer per line like: 1. value',
    'No JSON. No markdown. No explanation.',
    ctx.allowGore ? 'Mild gore ok.' : 'No gore.',
    'Never sexual content.',
  ].join(' ');

  const user = [
    `seed=${ctx.seed}`,
    `moodBias=${ctx.moodBias}`,
    `avoidTitles=${ctx.previousTitles.slice(-4).join(' | ') || 'none'}`,
    '',
    '1. themeId (exact id from list)',
    `themes: ${themes}`,
    '2. room title (3-6 words)',
    '3. mood (upper OR downer OR static OR dynamic)',
    '4. room width meters (number 8-28)',
    '5. room depth meters (number 8-28)',
    '6. room height meters (number 2.5-8)',
    '7. 6-10 asset ids comma-separated from list (must include door_fake)',
    `assets: ${assets}`,
    '8. giant prop id or none (anomaly_giant_baby allowed)',
    '9. one-sentence blurb',
  ].join('\n');

  return { system, user };
}

function tokenizeAssets(line: string): string[] {
  return line
    .split(/[,|/;]+/)
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
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
  if (t.includes('upper')) return 'upper';
  if (t.includes('downer')) return 'downer';
  if (t.includes('dynamic')) return 'dynamic';
  if (t.includes('static')) return 'static';
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
