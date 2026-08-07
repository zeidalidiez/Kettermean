import { PLAYER } from '../config';
import { SeededRng } from '../core/rng';
import type {
  EntityBehavior,
  GenerationContext,
  MoodAxis,
  RoomEntity,
  RoomProp,
  RoomSpec,
} from '../types';
import {
  ASSETS,
  THEME_PRESETS,
  type DirectedPlacement,
  type RoomDirection,
  getAsset,
  getTheme,
} from './assetCatalog';

/**
 * Offline director: pick a theme + place preferred assets with atmospheric scales.
 * LLM directors should emit the same RoomDirection shape.
 */
export function generateOfflineDirection(ctx: GenerationContext): RoomDirection {
  const rng = new SeededRng(ctx.seed);
  const pool = THEME_PRESETS.filter((t) => !ctx.previousTitles.includes(t.title));
  const theme = rng.pick(pool.length ? pool : THEME_PRESETS);
  const mood = rng.chance(0.7) ? theme.mood : biasMood(rng, ctx.moodBias);
  const scaleRoom = 0.92 + rng.float(0, 0.2);
  const width = theme.width * scaleRoom;
  const depth = theme.depth * scaleRoom;
  const height = theme.height;

  const placements: DirectedPlacement[] = [];
  const preferred = [...theme.preferredAssets];
  // Shuffle lightly
  for (let i = preferred.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const tmp = preferred[i]!;
    preferred[i] = preferred[j]!;
    preferred[j] = tmp;
  }

  const count = Math.min(preferred.length, rng.int(6, Math.min(12, preferred.length)));
  for (let i = 0; i < count; i += 1) {
    const assetId = preferred[i]!;
    const asset = getAsset(assetId);
    if (!asset) continue;

    // Giant anomaly bias for atmosphere.
    let scaleMul = rng.float(0.95, 1.15);
    if (asset.id === 'anomaly_giant_baby') scaleMul = rng.float(2.2, 3.6);
    else if (asset.category === 'anomaly') scaleMul = rng.float(1.2, Math.min(asset.scaleRange.max, 2.4));
    else if (asset.category === 'npc' && rng.chance(0.2)) scaleMul = rng.float(1.3, 1.8);

    scaleMul = clamp(scaleMul, asset.scaleRange.min, asset.scaleRange.max);

    const margin = 1.6 + asset.defaultScale.x * scaleMul * 0.35;
    let x = rng.float(-width / 2 + margin, width / 2 - margin);
    let z = rng.float(-depth / 2 + margin, depth / 2 - margin);
    // Keep spawn clear
    if (Math.hypot(x, z) < 1.8) {
      x += Math.sign(x || 1) * 2.4;
      z += Math.sign(z || 1) * 2.4;
    }

    placements.push({
      assetId,
      x,
      z,
      rotY: rng.float(0, Math.PI * 2),
      scaleMul,
      linksOnTouch: asset.linksByDefault ?? asset.category === 'portal',
      solid: asset.solidDefault !== false && asset.category !== 'npc' && asset.category !== 'creature' && asset.category !== 'anomaly',
      behavior: asset.defaultBehavior,
      labelOverride: scaleMul >= 2 && asset.id === 'anomaly_giant_baby' ? 'impossibly large baby' : undefined,
    });
  }

  // Ensure a portal-ish link exists.
  if (!placements.some((p) => p.linksOnTouch)) {
    placements.push({
      assetId: 'door_fake',
      x: -width / 2 + 1.2,
      z: 0,
      rotY: Math.PI / 2,
      scaleMul: 1,
      linksOnTouch: true,
      solid: true,
    });
  }

  return {
    seed: ctx.seed,
    themeId: theme.id,
    title: theme.title,
    blurb: theme.blurb,
    mood,
    tags: [...theme.tags, mood],
    width,
    depth,
    height,
    fogNear: mood === 'downer' ? 10 : 14,
    fogFar: mood === 'downer' ? 36 : 55,
    linkColor: moodLinkColor(mood),
    openSides: theme.openSides,
    palette: theme.palette,
    physics: physicsForMood(rng, mood),
    placements,
    offline: true,
  };
}

export function assembleRoomSpec(dir: RoomDirection): RoomSpec {
  const props: RoomProp[] = [];
  const entities: RoomEntity[] = [];

  dir.placements.forEach((p, i) => {
    const asset = getAsset(p.assetId);
    if (!asset) return;
    const mul = clamp(p.scaleMul ?? 1, asset.scaleRange.min, asset.scaleRange.max);
    const scale = p.scale ?? {
      x: asset.defaultScale.x * mul,
      y: asset.defaultScale.y * mul,
      z: asset.defaultScale.z * mul,
    };
    const isActor =
      asset.category === 'npc' || asset.category === 'creature' || asset.category === 'anomaly';

    if (isActor) {
      entities.push({
        id: `e${i}`,
        label: p.labelOverride || asset.label,
        shape: 'box',
        position: { x: p.x, y: p.y ?? 0, z: p.z },
        scale,
        color: dir.palette?.accent || '#cccccc',
        behavior: (p.behavior || asset.defaultBehavior || 'idle') as EntityBehavior,
        speed: 0.45 + (i % 3) * 0.2,
        linksOnTouch: p.linksOnTouch ?? asset.linksByDefault ?? true,
        kind: asset.kind,
      });
    } else {
      props.push({
        id: `p${i}`,
        label: p.labelOverride || asset.label,
        shape: 'box',
        position: { x: p.x, y: p.y ?? 0, z: p.z },
        rotationY: p.rotY ?? 0,
        scale,
        color: dir.palette?.accent || '#888888',
        linksOnTouch: p.linksOnTouch ?? asset.linksByDefault ?? false,
        solid: p.solid ?? asset.solidDefault ?? true,
        kind: asset.kind,
      });
    }
  });

  // Guarantee at least one prop for renderer assumptions.
  if (props.length === 0) {
    props.push({
      id: 'p_fallback',
      label: 'chair',
      shape: 'box',
      position: { x: 2, y: 0, z: 2 },
      scale: { x: 0.6, y: 1.2, z: 0.6 },
      color: '#888',
      solid: true,
      kind: 'chair',
    });
  }

  const theme = dir.themeId ? getTheme(dir.themeId) : undefined;
  const palette = dir.palette || theme?.palette || {
    floor: '#9a8458',
    ceiling: '#e8e0cc',
    walls: '#d2c08a',
    accent: '#6a7a8a',
    fog: '#c8b890',
    light: '#fff2c9',
    ambient: '#a09070',
  };

  return {
    id: `room-${dir.seed}`,
    seed: dir.seed,
    title: dir.title,
    blurb: dir.blurb,
    themeTags: dir.tags,
    mood: dir.mood,
    width: dir.width,
    depth: dir.depth,
    height: dir.height,
    palette,
    fogNear: dir.fogNear ?? 12,
    fogFar: dir.fogFar ?? 42,
    physics: {
      gravity: dir.physics?.gravity ?? 1,
      moveSpeed: dir.physics?.moveSpeed ?? 1,
      friction: dir.physics?.friction ?? 1,
      bounce: dir.physics?.bounce ?? 0,
      sway: dir.physics?.sway ?? 0.3,
    },
    linkColor: dir.linkColor ?? moodLinkColor(dir.mood),
    props,
    entities,
    openSides: dir.openSides,
    offline: Boolean(dir.offline),
  };
}

/** Parse LLM JSON into a RoomDirection (catalog-aware). Falls back fields safely. */
export function parseRoomDirection(raw: unknown, seed: string): RoomDirection | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  // Support both new direction format and legacy full RoomSpec-ish payloads.
  const themeId = typeof o.themeId === 'string' ? o.themeId : typeof o.theme === 'string' ? o.theme : undefined;
  const theme = themeId ? getTheme(themeId) : undefined;

  const title = str(o.title, theme?.title || 'Unnamed Room');
  const blurb = str(o.blurb, theme?.blurb || 'The room waits.');
  const mood = moodOf(o.mood, theme?.mood || 'static');
  const tags = arrStr(o.tags ?? o.themeTags, theme?.tags || ['liminal']);

  const placementsRaw = Array.isArray(o.placements)
    ? o.placements
    : Array.isArray(o.assets)
      ? o.assets
      : null;

  let placements: DirectedPlacement[] = [];
  if (placementsRaw) {
    placements = placementsRaw
      .map((p) => parsePlacement(p))
      .filter((p): p is DirectedPlacement => Boolean(p))
      .slice(0, 16);
  } else if (typeof o.AssetIds === 'string' || typeof o.assetIds === 'string' || Array.isArray(o.AssetIds) || Array.isArray(o.assetIds)) {
    // Tiny models sometimes emit: { mood, AssetIds: "a,b,c" } with no placements.
    const rawList = o.AssetIds ?? o.assetIds;
    const ids = Array.isArray(rawList)
      ? rawList.filter((x): x is string => typeof x === 'string')
      : String(rawList)
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);
    const fromIds: DirectedPlacement[] = [];
    ids.forEach((id, i) => {
      const asset = getAsset(id) || matchAssetByLabel(id);
      if (!asset) return;
      fromIds.push({
        assetId: asset.id,
        x: ((i % 4) - 1.5) * 2.4,
        z: (Math.floor(i / 4) - 0.5) * 3,
        scaleMul: asset.id === 'anomaly_giant_baby' ? 3 : 1,
        linksOnTouch: asset.linksByDefault,
      });
    });
    placements = fromIds.slice(0, 16);
  } else if (Array.isArray(o.props) || Array.isArray(o.entities)) {
    // Legacy: map props/entities labels to nearest assets.
    const legacy = [...(Array.isArray(o.props) ? o.props : []), ...(Array.isArray(o.entities) ? o.entities : [])];
    placements = legacy
      .map((item, i) => legacyToPlacement(item, i))
      .filter((p): p is DirectedPlacement => Boolean(p))
      .slice(0, 16);
  }

  if (placements.length < 1 && theme) {
    // Minimal: use theme preferred list if LLM only sent themeId/title.
    placements = theme.preferredAssets.slice(0, 8).map((assetId, i) => ({
      assetId,
      x: ((i % 4) - 1.5) * 2.5,
      z: (Math.floor(i / 4) - 0.5) * 3,
      scaleMul: assetId === 'anomaly_giant_baby' ? 2.8 : 1,
      linksOnTouch: getAsset(assetId)?.linksByDefault,
    }));
  }

  if (placements.length < 1) return null;

  return {
    seed,
    themeId: theme?.id,
    title,
    blurb,
    mood,
    tags,
    width: num(o.width, theme?.width ?? 14, 8, 28),
    depth: num(o.depth, theme?.depth ?? 14, 8, 28),
    height: num(o.height, theme?.height ?? 3.5, 2.4, 10),
    fogNear: num(o.fogNear, 12, 2, 40),
    fogFar: num(o.fogFar, 40, 10, 80),
    linkColor: typeof o.linkColor === 'string' ? o.linkColor : moodLinkColor(mood),
    openSides: Array.isArray(o.openSides)
      ? o.openSides.filter((s): s is 'north' | 'south' | 'east' | 'west' =>
          typeof s === 'string' && ['north', 'south', 'east', 'west'].includes(s),
        )
      : theme?.openSides,
    palette: parsePalette(o.palette) || theme?.palette,
    physics: parsePhysics(o.physics),
    placements,
    offline: false,
  };
}

function parsePlacement(raw: unknown): DirectedPlacement | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const assetIdRaw =
    typeof o.assetId === 'string'
      ? o.assetId
      : typeof o.id === 'string'
        ? o.id
        : typeof o.asset === 'string'
          ? o.asset
          : '';
  const assetId = assetIdRaw.trim();
  const asset = getAsset(assetId) || matchAssetByLabel(assetId);
  if (!asset) return null;
  const scaleMul = clamp(
    parseLooseNumber(o.scaleMul ?? o.scale, 1),
    asset.scaleRange.min,
    asset.scaleRange.max,
  );
  return {
    assetId: asset.id,
    x: clamp(parseLooseNumber(o.x ?? (o.position as { x?: unknown } | undefined)?.x, 0), -40, 40),
    z: clamp(parseLooseNumber(o.z ?? (o.position as { z?: unknown } | undefined)?.z, 0), -40, 40),
    y: clamp(parseLooseNumber(o.y ?? (o.position as { y?: unknown } | undefined)?.y, 0), 0, 10),
    rotY: parseLooseNumber(o.rotY ?? o.rotationY, 0),
    scaleMul,
    linksOnTouch: o.linksOnTouch === undefined ? asset.linksByDefault : Boolean(o.linksOnTouch),
    solid: o.solid === undefined ? asset.solidDefault : Boolean(o.solid),
    behavior: typeof o.behavior === 'string' ? (o.behavior as EntityBehavior) : asset.defaultBehavior,
    labelOverride: typeof o.label === 'string' ? o.label : undefined,
  };
}

/** Accept numbers, numeric strings, and ranges like "2.5-3.5". */
function parseLooseNumber(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return fallback;
    const range = t.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      if (Number.isFinite(a) && Number.isFinite(b)) return (a + b) / 2;
    }
    const n = Number(t);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function legacyToPlacement(raw: unknown, index: number): DirectedPlacement | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const label = typeof o.label === 'string' ? o.label : typeof o.kind === 'string' ? o.kind : '';
  const asset = matchAssetByLabel(label) || ASSETS[index % ASSETS.length]!;
  const pos = (o.position && typeof o.position === 'object' ? o.position : {}) as Record<string, unknown>;
  let scaleMul = 1;
  if (o.scale && typeof o.scale === 'object') {
    const s = o.scale as Record<string, unknown>;
    const sy = Number(s.y);
    if (Number.isFinite(sy) && asset.defaultScale.y > 0) scaleMul = sy / asset.defaultScale.y;
  }
  scaleMul = clamp(scaleMul, asset.scaleRange.min, asset.scaleRange.max);
  return {
    assetId: asset.id,
    x: num(pos.x, ((index % 5) - 2) * 2, -40, 40),
    z: num(pos.z, (Math.floor(index / 5) - 1) * 2.5, -40, 40),
    rotY: num(o.rotationY, 0, -10, 10),
    scaleMul,
    linksOnTouch: Boolean(o.linksOnTouch) || asset.linksByDefault,
    solid: o.solid === undefined ? asset.solidDefault : Boolean(o.solid),
    behavior: typeof o.behavior === 'string' ? (o.behavior as EntityBehavior) : asset.defaultBehavior,
    labelOverride: label || asset.label,
  };
}

function matchAssetByLabel(label: string) {
  const l = label.toLowerCase();
  return (
    ASSETS.find((a) => a.id === l) ||
    ASSETS.find((a) => a.label.toLowerCase() === l) ||
    ASSETS.find((a) => l.includes(a.label.toLowerCase()) || a.label.toLowerCase().includes(l)) ||
    ASSETS.find((a) => a.kind === l || l.includes(a.kind))
  );
}

function parsePalette(raw: unknown): RoomDirection['palette'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const need = ['floor', 'ceiling', 'walls', 'accent', 'fog', 'light', 'ambient'] as const;
  const out: Record<string, string> = {};
  for (const k of need) {
    if (typeof o[k] !== 'string') return undefined;
    out[k] = o[k] as string;
  }
  return out as RoomDirection['palette'];
}

function parsePhysics(raw: unknown): RoomDirection['physics'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  return {
    gravity: num(o.gravity, 1, 0.2, 2.2),
    moveSpeed: num(o.moveSpeed, 1, 0.4, 2),
    friction: num(o.friction, 1, 0.2, 2),
    bounce: num(o.bounce, 0, 0, 0.8),
    sway: num(o.sway, 0.3, 0, 2),
  };
}

function biasMood(rng: SeededRng, bias: MoodAxis): MoodAxis {
  if (rng.chance(0.55)) return bias;
  return rng.pick(['upper', 'downer', 'static', 'dynamic'] as const);
}

function physicsForMood(rng: SeededRng, mood: MoodAxis) {
  switch (mood) {
    case 'upper':
      return { gravity: rng.float(0.7, 0.95), moveSpeed: rng.float(1.05, 1.25), friction: 0.9, bounce: 0.05, sway: 0.25 };
    case 'downer':
      return { gravity: rng.float(1.05, 1.3), moveSpeed: rng.float(0.75, 0.95), friction: 1.2, bounce: 0, sway: 0.55 };
    case 'dynamic':
      return { gravity: rng.float(0.6, 1.35), moveSpeed: rng.float(0.9, 1.3), friction: 0.8, bounce: 0.2, sway: 0.7 };
    default:
      return { gravity: 1, moveSpeed: 1, friction: 1, bounce: 0, sway: 0.25 };
  }
}

function moodLinkColor(mood: MoodAxis): string {
  if (mood === 'downer') return '#15203f';
  if (mood === 'upper') return '#eef2ff';
  if (mood === 'dynamic') return '#2dd4bf';
  return '#c4a35a';
}

function moodOf(v: unknown, fallback: MoodAxis): MoodAxis {
  return typeof v === 'string' && ['upper', 'downer', 'static', 'dynamic'].includes(v)
    ? (v as MoodAxis)
    : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : fallback;
}

function arrStr(v: unknown, fallback: string[]): string[] {
  if (!Array.isArray(v)) return fallback;
  const out = v.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 32));
  return out.length ? out.slice(0, 8) : fallback;
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function defaultSpawnHeight(): number {
  return PLAYER.eyeHeight;
}
