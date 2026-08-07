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
  type ThemePreset,
  getAsset,
  getTheme,
} from './assetCatalog';

/** Optional high-level steer from an LLM. Layout/placement always done here. */
export interface DirectorSteer {
  themeId?: string;
  mood?: MoodAxis;
  title?: string;
  blurb?: string;
  /** Extra asset ids the LLM wants present. */
  preferAssets?: string[];
  giant?: boolean;
  width?: number;
  depth?: number;
  height?: number;
}

type LayoutKind = 'scatter' | 'perimeter' | 'spine' | 'corners' | 'centerpiece' | 'pairs';

/**
 * Offline / hybrid director: pick theme + place many catalog assets with layout patterns.
 * This is the source of room variety — LLM only optionally steers theme/mood/title.
 */
export function generateOfflineDirection(ctx: GenerationContext, steer?: DirectorSteer): RoomDirection {
  const rng = new SeededRng(ctx.seed);
  const recent = new Set(ctx.previousTitles.slice(-8));
  const pool = THEME_PRESETS.filter((t) => !recent.has(t.title) && t.id !== steer?.themeId);
  let theme =
    (steer?.themeId ? getTheme(steer.themeId) : undefined) ||
    rng.pick(pool.length ? pool : THEME_PRESETS);

  // If LLM keeps picking the same theme, force rotation every other room.
  if (steer?.themeId && recent.has(theme.title) && pool.length) {
    theme = rng.pick(pool);
  }

  const mood = steer?.mood || (rng.chance(0.65) ? theme.mood : biasMood(rng, ctx.moodBias));
  const layout = rng.pick(['scatter', 'perimeter', 'spine', 'corners', 'centerpiece', 'pairs'] as const);

  const sizeJitterW = rng.float(0.72, 1.38);
  const sizeJitterD = rng.float(0.72, 1.38);
  const sizeJitterH = rng.float(0.82, 1.4);
  const width = clamp(steer?.width ?? theme.width * sizeJitterW, 8, 28);
  const depth = clamp(steer?.depth ?? theme.depth * sizeJitterD, 8, 28);
  const height = clamp(steer?.height ?? theme.height * sizeJitterH, 2.5, 9);

  const pickIds = buildAssetList(rng, theme, mood, steer);
  const placements: DirectedPlacement[] = [];

  // 1–3 doors depending on room size
  const doorCount = width * depth > 220 ? 3 : width * depth > 120 ? 2 : 1;
  placeDoors(rng, placements, width, depth, doorCount);

  const propsOnly = pickIds.filter((id) => {
    const a = getAsset(id);
    return a && a.category !== 'portal';
  });

  const count = clamp(
    rng.int(Math.min(7, propsOnly.length), Math.min(14, Math.max(7, propsOnly.length))),
    5,
    14,
  );

  for (let i = 0; i < count; i += 1) {
    const assetId = propsOnly[i % propsOnly.length]!;
    const asset = getAsset(assetId);
    if (!asset) continue;

    let scaleMul = rng.float(0.9, 1.2);
    if (asset.id === 'anomaly_giant_baby' || (steer?.giant && asset.category === 'anomaly' && i === 0)) {
      scaleMul = rng.float(2.3, 3.8);
    } else if (asset.category === 'anomaly') {
      scaleMul = rng.float(1.15, Math.min(asset.scaleRange.max, 2.5));
    } else if (asset.category === 'npc' && rng.chance(0.25)) {
      scaleMul = rng.float(1.25, 1.85);
    } else if (rng.chance(0.08)) {
      scaleMul = rng.float(1.4, Math.min(asset.scaleRange.max, 2.2));
    }
    scaleMul = clamp(scaleMul, asset.scaleRange.min, asset.scaleRange.max);

    const pos = layoutPosition(rng, layout, i, count, width, depth, asset.defaultScale.x * scaleMul);
    placements.push({
      assetId,
      x: pos.x,
      z: pos.z,
      rotY: pos.rotY ?? rng.float(0, Math.PI * 2),
      scaleMul,
      linksOnTouch: false,
      solid:
        asset.solidDefault !== false &&
        asset.category !== 'npc' &&
        asset.category !== 'creature' &&
        asset.category !== 'anomaly',
      behavior: asset.defaultBehavior,
      labelOverride:
        scaleMul >= 2.2 && asset.id === 'anomaly_giant_baby' ? 'impossibly large baby' : undefined,
    });
  }

  // Door-only links
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

  const title = cleanSteerText(steer?.title) || varyTitle(rng, theme.title, mood);
  const blurb = cleanSteerText(steer?.blurb) || varyBlurb(rng, theme.blurb, mood, layout);

  return {
    seed: ctx.seed,
    themeId: theme.id,
    title,
    blurb,
    mood,
    tags: [...theme.tags, mood, layout],
    width,
    depth,
    height,
    fogNear: mood === 'downer' ? 7 : mood === 'upper' ? 16 : 11,
    fogFar: mood === 'downer' ? 26 : mood === 'upper' ? 62 : 44,
    linkColor: moodLinkColor(mood),
    openSides: [],
    palette: tintPalette(rng, theme.palette, mood),
    physics: physicsForMood(rng, mood),
    placements,
    offline: !steer,
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
    const isPortal = asset.category === 'portal';

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
        linksOnTouch: false,
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
        linksOnTouch: isPortal,
        solid: p.solid ?? asset.solidDefault ?? true,
        kind: asset.kind,
      });
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
    openSides: dir.openSides ?? [],
    offline: Boolean(dir.offline),
  };
}

/** Parse LLM JSON into a RoomDirection (catalog-aware). Falls back fields safely. */
export function parseRoomDirection(raw: unknown, seed: string): RoomDirection | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const themeId = typeof o.themeId === 'string' ? o.themeId : typeof o.theme === 'string' ? o.theme : undefined;
  const theme = themeId ? getTheme(themeId) : undefined;
  const title = str(o.title, theme?.title || 'Unnamed Room');
  const blurb = str(o.blurb, theme?.blurb || 'The room waits.');
  const mood = moodOf(o.mood, theme?.mood || 'static');

  // Prefer converting LLM output into a steer and rebuilding with the rich director.
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

function buildAssetList(
  rng: SeededRng,
  theme: ThemePreset,
  mood: MoodAxis,
  steer?: DirectorSteer,
): string[] {
  const ids: string[] = [];
  const add = (id: string) => {
    if (!getAsset(id) || ids.includes(id)) return;
    ids.push(id);
  };

  for (const id of steer?.preferAssets ?? []) add(id);
  for (const id of theme.preferredAssets) add(id);

  // Pull more from catalog by shared tags / mood so rooms fill up.
  const tagSet = new Set(theme.tags);
  const extras = ASSETS.filter(
    (a) =>
      a.category !== 'portal' &&
      (a.moods.includes(mood) || a.tags.some((t) => tagSet.has(t))),
  );
  // shuffle
  for (let i = extras.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const tmp = extras[i]!;
    extras[i] = extras[j]!;
    extras[j] = tmp;
  }
  for (const a of extras) {
    add(a.id);
    if (ids.length >= 18) break;
  }

  if (steer?.giant) add('anomaly_giant_baby');
  if (rng.chance(0.18)) add('anomaly_giant_baby');

  // Always have at least one portal id available for placeDoors
  add('door_fake');
  if (rng.chance(0.5)) add('door_service');
  if (rng.chance(0.35)) add('door_glass');
  if (rng.chance(0.25)) add('arch_portal');

  return ids;
}

function placeDoors(
  rng: SeededRng,
  placements: DirectedPlacement[],
  width: number,
  depth: number,
  count: number,
): void {
  const order: Array<'n' | 's' | 'e' | 'w'> = ['n', 's', 'e', 'w'];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const t = order[i]!;
    order[i] = order[j]!;
    order[j] = t;
  }
  const doorIds = ['door_fake', 'door_service', 'door_glass', 'arch_portal'] as const;
  for (let i = 0; i < count; i += 1) {
    const side = order[i % order.length]!;
    const doorId = doorIds[i % doorIds.length]!;
    let x = 0;
    let z = 0;
    let rotY = 0;
    const along = rng.float(-0.35, 0.35);
    if (side === 'w') {
      x = -width / 2 + 0.4;
      z = depth * along;
      rotY = Math.PI / 2;
    } else if (side === 'e') {
      x = width / 2 - 0.4;
      z = depth * along;
      rotY = -Math.PI / 2;
    } else if (side === 'n') {
      z = -depth / 2 + 0.4;
      x = width * along;
      rotY = 0;
    } else {
      z = depth / 2 - 0.4;
      x = width * along;
      rotY = Math.PI;
    }
    placements.push({
      assetId: getAsset(doorId) ? doorId : 'door_fake',
      x,
      z,
      rotY,
      scaleMul: doorId === 'arch_portal' ? rng.float(1.0, 1.35) : 1,
      linksOnTouch: true,
      solid: true,
    });
  }
}

function layoutPosition(
  rng: SeededRng,
  layout: LayoutKind,
  i: number,
  n: number,
  width: number,
  depth: number,
  footprint: number,
): { x: number; z: number; rotY?: number } {
  const margin = 1.5 + footprint * 0.35;
  const hw = width / 2 - margin;
  const hd = depth / 2 - margin;
  const t = n <= 1 ? 0 : i / (n - 1);

  let x = 0;
  let z = 0;
  let rotY: number | undefined;

  switch (layout) {
    case 'perimeter': {
      const edge = i % 4;
      const u = rng.float(-0.85, 0.85);
      if (edge === 0) {
        x = -hw;
        z = hd * u;
        rotY = Math.PI / 2;
      } else if (edge === 1) {
        x = hw;
        z = hd * u;
        rotY = -Math.PI / 2;
      } else if (edge === 2) {
        z = -hd;
        x = hw * u;
        rotY = 0;
      } else {
        z = hd;
        x = hw * u;
        rotY = Math.PI;
      }
      break;
    }
    case 'spine': {
      x = rng.float(-hw * 0.25, hw * 0.25);
      z = -hd + t * 2 * hd;
      rotY = rng.chance(0.5) ? 0 : Math.PI;
      break;
    }
    case 'corners': {
      const cx = i % 2 === 0 ? -hw * 0.75 : hw * 0.75;
      const cz = i % 4 < 2 ? -hd * 0.75 : hd * 0.75;
      x = cx + rng.float(-1, 1);
      z = cz + rng.float(-1, 1);
      break;
    }
    case 'centerpiece': {
      if (i === 0) {
        x = rng.float(-1.2, 1.2);
        z = rng.float(-1.2, 1.2);
      } else {
        const ang = (i / Math.max(1, n - 1)) * Math.PI * 2 + rng.float(-0.2, 0.2);
        const r = Math.min(hw, hd) * rng.float(0.45, 0.9);
        x = Math.cos(ang) * r;
        z = Math.sin(ang) * r;
      }
      break;
    }
    case 'pairs': {
      const pair = Math.floor(i / 2);
      const side = i % 2 === 0 ? -1 : 1;
      x = side * hw * 0.55 + rng.float(-0.8, 0.8);
      z = -hd + ((pair + 0.5) / Math.ceil(n / 2)) * 2 * hd;
      rotY = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      break;
    }
    default: {
      x = rng.float(-hw, hw);
      z = rng.float(-hd, hd);
      break;
    }
  }

  if (Math.hypot(x, z) < 1.7) {
    x += Math.sign(x || 1) * 2.2;
    z += Math.sign(z || 1) * 2.2;
  }
  x = clamp(x, -hw, hw);
  z = clamp(z, -hd, hd);
  return { x, z, rotY };
}

function tintPalette(
  rng: SeededRng,
  base: ThemePreset['palette'],
  mood: MoodAxis,
): ThemePreset['palette'] {
  // Small per-room shifts so two rooms of same theme don't look identical.
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

function varyBlurb(rng: SeededRng, base: string, mood: MoodAxis, layout: LayoutKind): string {
  const tails = [
    'Something left recently.',
    'The lights remember a different hour.',
    'Footsteps do not echo the way they should.',
    'You have been here, or somewhere like it.',
    'The air tastes like dust and old coffee.',
  ];
  if (rng.chance(0.5)) return `${base} ${rng.pick(tails)}`;
  if (rng.chance(0.3)) return `${base} (${mood}, ${layout})`.replace(` (${mood}, ${layout})`, ` ${rng.pick(tails)}`);
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
