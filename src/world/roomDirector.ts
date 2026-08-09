import { PLAYER, ROOM } from '../config';
import { SeededRng } from '../core/rng';
import { sanitizeDisplayText } from '../core/contentSafety';
import type {
  EntityBehavior,
  GenerationContext,
  MoodAxis,
  RoomEntity,
  RoomProp,
  RoomSpec,
  RoomVisuals,
} from '../types';
import {
  THEME_PRESETS,
  type RoomDirection,
  type ThemePreset,
  getAsset,
  getTheme,
} from './assetCatalog';
import { stampRoomPacks } from './layoutPacks';

/** Optional high-level steer from an LLM. Layout/placement always done here. */
export interface DirectorSteer {
  themeId?: string;
  mood?: MoodAxis;
  title?: string;
  blurb?: string;
  preferAssets?: string[];
  giant?: boolean;
  width?: number;
  depth?: number;
  height?: number;
  density?: number;
  visuals?: Partial<RoomVisuals>;
}

/**
 * Offline / hybrid director.
 * Rooms are composed from many small layout packs (10-30), scored by tags/mood
 * with intentional liminal clash — not a handful of whole-room layouts.
 */
export function generateOfflineDirection(ctx: GenerationContext, steer?: DirectorSteer): RoomDirection {
  const rng = new SeededRng(ctx.seed);
  const recent = new Set(ctx.previousTitles.slice(-8));
  const pool = THEME_PRESETS.filter((t) => !recent.has(t.title));
  let theme =
    (steer?.themeId ? getTheme(steer.themeId) : undefined) ||
    rng.pick(pool.length ? pool : THEME_PRESETS);

  // Avoid repeating the same theme title when possible.
  if (recent.has(theme.title) && pool.length) {
    theme = rng.pick(pool);
  }

  const mood = steer?.mood || (rng.chance(0.65) ? theme.mood : biasMood(rng, ctx.moodBias));

  const sizeJitterW = rng.float(0.72, 1.4);
  const sizeJitterD = rng.float(0.72, 1.4);
  const sizeJitterH = rng.float(0.82, 1.45);
  const width = clamp(steer?.width ?? theme.width * sizeJitterW, 8, 28);
  const depth = clamp(steer?.depth ?? theme.depth * sizeJitterD, 8, 28);
  const height = clamp(steer?.height ?? theme.height * sizeJitterH, 2.5, 9);

  const area = width * depth;
  const density = clamp(steer?.density ?? 1, 0.65, 1.4);
  const targetPacks = clamp(
    Math.round((12 + area / 22 + rng.float(-2, 3)) * density),
    10,
    30,
  );

  const placements = stampRoomPacks(rng, {
    width,
    depth,
    themeTags: theme.tags,
    mood,
    preferAssets: [...new Set([...theme.preferredAssets, ...(steer?.preferAssets ?? [])])],
    giant: steer?.giant,
    targetPacks,
  });

  // Door-only safety net
  for (const p of placements) {
    const a = getAsset(p.assetId);
    p.linksOnTouch = a?.category === 'portal';
  }
  if (!placements.some((p) => p.linksOnTouch)) {
    placements.push({
      assetId: 'door_fake',
      x: -width / 2 + 0.45,
      z: 0,
      rotY: Math.PI / 2,
      scaleMul: 1,
      linksOnTouch: true,
      solid: true,
    });
  }

  const title = sanitizeDisplayText(
    cleanSteerText(steer?.title) || varyTitle(rng, theme.title, mood),
    theme.title,
    80,
  );
  const blurb = sanitizeDisplayText(
    cleanSteerText(steer?.blurb) || varyBlurb(rng, theme.blurb, mood),
    theme.blurb,
    160,
  );

  return {
    seed: ctx.seed,
    themeId: theme.id,
    title,
    blurb,
    mood,
    tags: [...theme.tags, mood, 'packs'],
    width,
    depth,
    height,
    fogNear: mood === 'downer' ? 7 : mood === 'upper' ? 16 : 11,
    fogFar: mood === 'downer' ? 26 : mood === 'upper' ? 62 : 44,
    linkColor: moodLinkColor(mood),
    palette: tintPalette(rng, theme.palette, mood),
    physics: physicsForMood(rng, mood),
    visuals: resolveRoomVisuals(ctx.seed, mood, steer?.visuals),
    placements,
    offline: !steer,
  };
}

export function assembleRoomSpec(dir: RoomDirection): RoomSpec {
  const props: RoomProp[] = [];
  const entities: RoomEntity[] = [];
  const portalReserve = Math.min(
    ROOM.propCountMax,
    dir.placements.filter((placement) => getAsset(placement.assetId)?.category === 'portal').length,
  );
  const nonPortalBudget = ROOM.propCountMax - portalReserve;
  let nonPortalProps = 0;

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
    const isPortal = asset.category === 'portal';
    const label = sanitizeDisplayText(p.labelOverride || asset.label, asset.label, 64);

    if (isActor) {
      if (entities.length >= ROOM.entityCountMax) return;
      entities.push({
        id: `e${i}`,
        label,
        shape: 'box',
        position: { x: p.x, y: p.y ?? 0, z: p.z },
        scale,
        color: dir.palette?.accent || '#cccccc',
        behavior: (p.behavior || asset.defaultBehavior || 'idle') as EntityBehavior,
        speed: 0.45 + (i % 3) * 0.2,
        kind: asset.kind,
      });
    } else {
      if (isPortal ? props.length >= ROOM.propCountMax : nonPortalProps >= nonPortalBudget) return;
      props.push({
        id: `p${i}`,
        label,
        shape: 'box',
        position: { x: p.x, y: p.y ?? 0, z: p.z },
        rotationY: p.rotY ?? 0,
        scale,
        color: dir.palette?.accent || '#888888',
        linksOnTouch: isPortal,
        solid: p.solid ?? asset.solidDefault ?? true,
        kind: asset.kind,
      });
      if (!isPortal) nonPortalProps += 1;
    }
  });

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
    title: sanitizeDisplayText(dir.title, theme?.title || 'Unnamed Room', 80),
    blurb: sanitizeDisplayText(dir.blurb, theme?.blurb || 'The room waits.', 160),
    themeTags: dir.tags.map((tag) => sanitizeDisplayText(tag, 'liminal', 32)),
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
    visuals: dir.visuals ?? resolveRoomVisuals(dir.seed, dir.mood),
    props,
    entities,
    offline: Boolean(dir.offline),
  };
}

const SHADER_STYLES: RoomVisuals['shader'][] = [
  'none',
  'none',
  'tint',
  'retro',
  'dream',
  'noir',
  'crt',
];
const LIGHTING_STYLES: RoomVisuals['lighting'][] = [
  'fluorescent',
  'fluorescent',
  'dim',
  'cold',
  'warm',
  'emergency',
  'pulse',
];
const EFFECT_TINTS = [
  '#ffffff',
  '#78c8ff',
  '#ff786f',
  '#83f28f',
  '#c89cff',
  '#ffc36f',
  '#75f0df',
];

/** Stable visual treatment for every room, whether or not a model contributes. */
export function resolveRoomVisuals(
  seed: string,
  mood: MoodAxis,
  override?: Partial<RoomVisuals>,
): RoomVisuals {
  const rng = new SeededRng(`${seed}:visuals`);
  const shader = override?.shader ?? rng.pick(SHADER_STYLES);
  const moodLighting: RoomVisuals['lighting'] =
    mood === 'downer'
      ? 'dim'
      : mood === 'upper'
        ? 'warm'
        : mood === 'dynamic'
          ? 'pulse'
          : 'fluorescent';
  const lighting =
    override?.lighting ?? (rng.chance(0.45) ? moodLighting : rng.pick(LIGHTING_STYLES));
  const defaultExposure =
    lighting === 'dim'
      ? 0.82
      : lighting === 'emergency'
        ? 0.98
        : lighting === 'cold'
          ? 0.92
          : lighting === 'warm'
            ? 1.08
            : 1;

  return {
    shader,
    lighting,
    tint: override?.tint ?? rng.pick(EFFECT_TINTS),
    effectStrength: clamp(override?.effectStrength ?? rng.float(0.42, 0.78), 0, 1),
    pixelSize: clamp(Math.round(override?.pixelSize ?? rng.int(3, 8)), 2, 12),
    wireframe: override?.wireframe ?? rng.chance(0.1),
    exposure: clamp(override?.exposure ?? defaultExposure + rng.float(-0.08, 0.08), 0.55, 1.3),
  };
}

/** Convert LLM JSON into a steer, then rebuild with pack director. */
export function parseRoomDirection(raw: unknown, seed: string): RoomDirection | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const themeId = typeof o.themeId === 'string' ? o.themeId : typeof o.theme === 'string' ? o.theme : undefined;
  const theme = themeId ? getTheme(themeId) : undefined;
  const title = sanitizeDisplayText(
    str(o.title, theme?.title || 'Unnamed Room'),
    theme?.title || 'Unnamed Room',
    80,
  );
  const blurb = sanitizeDisplayText(
    str(o.blurb, theme?.blurb || 'The room waits.'),
    theme?.blurb || 'The room waits.',
    160,
  );
  const mood = moodOf(o.mood, theme?.mood || 'static');

  const preferAssets: string[] = [];
  const placementsRaw = Array.isArray(o.placements) ? o.placements : Array.isArray(o.assets) ? o.assets : null;
  if (placementsRaw) {
    for (const p of placementsRaw) {
      if (!p || typeof p !== 'object') continue;
      const po = p as Record<string, unknown>;
      const id = typeof po.assetId === 'string' ? po.assetId : typeof po.id === 'string' ? po.id : '';
      if (id && getAsset(id)) preferAssets.push(id);
    }
  }

  const steer: DirectorSteer = {
    themeId: theme?.id,
    mood,
    title,
    blurb,
    preferAssets,
    giant: preferAssets.includes('anomaly_giant_baby'),
    width: typeof o.width === 'number' ? o.width : undefined,
    depth: typeof o.depth === 'number' ? o.depth : undefined,
    height: typeof o.height === 'number' ? o.height : undefined,
  };

  return generateOfflineDirection(
    {
      seed,
      previousTitles: [],
      moodBias: mood,
      allowGore: false,
      linkIndex: 0,
    },
    steer,
  );
}

function tintPalette(
  rng: SeededRng,
  base: ThemePreset['palette'],
  mood: MoodAxis,
): ThemePreset['palette'] {
  const shift = rng.float(-8, 8);
  const moodShift =
    mood === 'downer' ? -10 : mood === 'upper' ? 8 : mood === 'dynamic' ? rng.float(-6, 12) : 0;
  const tweak = (hex: string, amt: number) => shiftHex(hex, amt + shift * 0.15 + moodShift * 0.1);
  return {
    floor: tweak(base.floor, rng.float(-6, 6)),
    ceiling: tweak(base.ceiling, rng.float(-4, 4)),
    walls: tweak(base.walls, rng.float(-8, 8)),
    accent: tweak(base.accent, rng.float(-10, 10)),
    fog: tweak(base.fog, rng.float(-5, 5)),
    light: tweak(base.light, rng.float(-4, 4)),
    ambient: tweak(base.ambient, rng.float(-5, 5)),
  };
}

function shiftHex(hex: string, delta: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const r = clamp(((n >> 16) & 255) + delta, 0, 255);
  const g = clamp(((n >> 8) & 255) + delta * 0.85, 0, 255);
  const b = clamp((n & 255) + delta * 0.7, 0, 255);
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function varyTitle(rng: SeededRng, base: string, mood: MoodAxis): string {
  const prefixes = {
    upper: ['Bright', 'Airy', 'Open', 'Soft'],
    downer: ['Wrong', 'Sour', 'Closed', 'Dim'],
    static: ['Still', 'Quiet', 'Held', 'Paused'],
    dynamic: ['Shifting', 'Unsteady', 'Moving', 'Flicker'],
  } as const;
  if (rng.chance(0.55)) return `${rng.pick(prefixes[mood])} ${base}`;
  if (rng.chance(0.35)) return `${base} ${rng.pick(['Again', 'Annex', 'B', 'North', 'After'])}`;
  return base;
}

function varyBlurb(rng: SeededRng, base: string, mood: MoodAxis): string {
  const tails = [
    'Something left recently.',
    'The lights remember a different hour.',
    'Footsteps do not echo the way they should.',
    'You have been here, or somewhere like it.',
    'The air tastes like dust and old coffee.',
    'A chair faces nothing on purpose.',
  ];
  if (rng.chance(0.55)) return `${base} ${rng.pick(tails)}`;
  void mood;
  return base;
}

function cleanSteerText(v?: string): string | undefined {
  if (!v) return undefined;
  const t = v.replace(/\s+/g, ' ').trim();
  if (t.length < 2) return undefined;
  const low = t.toLowerCase();
  if (
    low.startsWith('okay') ||
    low.includes('step by step') ||
    low.startsWith('the title is') ||
    low.includes("let's tackle")
  ) {
    return undefined;
  }
  return t.slice(0, 80);
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

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function defaultSpawnHeight(): number {
  return PLAYER.eyeHeight;
}
