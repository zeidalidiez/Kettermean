import { PLAYER, ROOM } from '../config';
import { SeededRng } from '../core/rng';
import { sanitizeDisplayText } from '../core/contentSafety';
import type {
  EntityBehavior,
  GenerationContext,
  MoodAxis,
  RoomEnvironment,
  RoomEntity,
  RoomHistoryEntry,
  RoomLayoutStyle,
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
  environment?: RoomEnvironment;
  layoutStyle?: RoomLayoutStyle;
}

/**
 * Offline / hybrid director.
 * Rooms are composed from many small layout packs (10-30), scored by tags/mood
 * with intentional liminal clash — not a handful of whole-room layouts.
 */
export function generateOfflineDirection(ctx: GenerationContext, steer?: DirectorSteer): RoomDirection {
  const rng = new SeededRng(ctx.seed);
  const recentRooms = ctx.recentRooms ?? [];
  const theme = selectNovelTheme(rng, recentRooms, steer?.themeId);
  const environment = steer?.environment ?? environmentForTheme(theme);
  const layoutStyle = steer?.layoutStyle ?? selectNovelLayout(rng, recentRooms, environment);

  const proposedMood =
    steer?.mood || (rng.chance(0.65) ? theme.mood : biasMood(rng, ctx.moodBias));
  const mood = selectNovelMood(rng, recentRooms, proposedMood);

  const sizeJitterW = rng.float(0.72, 1.4);
  const sizeJitterD = rng.float(0.72, 1.4);
  const sizeJitterH = rng.float(0.82, 1.45);
  const width = clamp(steer?.width ?? theme.width * sizeJitterW, ROOM.minSize, ROOM.maxSize);
  const depth = clamp(steer?.depth ?? theme.depth * sizeJitterD, ROOM.minSize, ROOM.maxSize);
  const height = clamp(steer?.height ?? theme.height * sizeJitterH, 2.5, 22);

  const area = width * depth;
  const density = clamp(steer?.density ?? 1, 0.65, 1.4);
  const targetPacks = clamp(
    Math.round((10 + area / 48 + rng.float(-2, 3)) * density),
    10,
    environment === 'outdoor' ? 42 : 50,
  );

  const placements = stampRoomPacks(rng, {
    width,
    depth,
    themeTags: theme.tags,
    mood,
    preferAssets: [...new Set([...theme.preferredAssets, ...(steer?.preferAssets ?? [])])],
    giant: steer?.giant,
    targetPacks,
    layoutStyle,
    avoidAssets: recentRooms.slice(-2).flatMap((room) => room.assetIds),
    environment,
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
    environment,
    layoutStyle,
    fogNear: mood === 'downer' ? 10 : mood === 'upper' ? 18 : 13,
    fogFar: Math.max(
      mood === 'downer' ? 36 : mood === 'upper' ? 68 : 48,
      Math.max(width, depth) * 1.45,
    ),
    linkColor: moodLinkColor(mood),
    palette: tintPalette(rng, theme.palette, mood),
    physics: physicsForMood(rng, mood),
    visuals: resolveRoomVisuals(ctx.seed, mood, steer?.visuals, recentRooms, ctx),
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
  let propRenderCost = 0;
  let entityRenderCost = 0;

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
      const renderCost = asset.renderCost ?? 3;
      if (
        entities.length >= ROOM.entityCountMax ||
        entityRenderCost + renderCost > ROOM.entityRenderCostMax
      ) return;
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
        assetId: asset.id,
      });
      entityRenderCost += renderCost;
    } else {
      const renderCost = asset.renderCost ?? 1;
      if (
        isPortal
          ? props.length >= ROOM.propCountMax
          : nonPortalProps >= nonPortalBudget ||
            propRenderCost + renderCost > ROOM.propRenderCostMax
      ) return;
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
        assetId: asset.id,
      });
      if (!isPortal) {
        nonPortalProps += 1;
        propRenderCost += renderCost;
      }
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
    themeId: dir.themeId,
    themeTags: dir.tags.map((tag) => sanitizeDisplayText(tag, 'liminal', 32)),
    mood: dir.mood,
    environment: dir.environment ?? (theme ? environmentForTheme(theme) : 'interior'),
    layoutStyle: dir.layoutStyle ?? 'clusters',
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
  'none',
  'tint',
  'retro',
  'dream',
  'noir',
  'crt',
  'underwater',
  'kaleidoscope',
  'acid',
  'fisheye',
  'thermal',
  'prism',
  'vhs',
  'strobe',
  'mirror',
  'tunnel',
];
const LIGHTING_STYLES: RoomVisuals['lighting'][] = [
  'fluorescent',
  'fluorescent',
  'fluorescent',
  'cold',
  'cold',
  'warm',
  'warm',
  'emergency',
  'pulse',
  'dim',
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
  recentRooms: RoomHistoryEntry[] = [],
  preferences: Pick<GenerationContext, 'noFlashingLights' | 'noLowLight'> = {},
): RoomVisuals {
  const rng = new SeededRng(`${seed}:visuals`);
  const recentShaders = recentRooms.slice(-2).map((room) => room.shader);
  const recentLighting = recentRooms.slice(-2).map((room) => room.lighting);
  const flashingDisabled = preferences.noFlashingLights === true;
  const highVisibility = preferences.noLowLight === true;
  const availableShaders = SHADER_STYLES.filter(
    (style) => !flashingDisabled || style !== 'strobe',
  );
  const shader = pickNovelVisual(rng, availableShaders, recentShaders, override?.shader);
  const availableLighting = LIGHTING_STYLES.filter(
    (style) =>
      (!flashingDisabled || style !== 'pulse') &&
      (!highVisibility || style !== 'dim'),
  );
  const moodLighting: RoomVisuals['lighting'] =
    mood === 'downer'
      ? 'cold'
      : mood === 'upper'
        ? 'warm'
        : mood === 'dynamic'
          ? 'pulse'
          : 'fluorescent';
  const proposedLighting = rng.chance(0.32) ? moodLighting : undefined;
  const lighting = pickNovelVisual(
    rng,
    availableLighting,
    recentLighting,
    override?.lighting ?? proposedLighting,
  );
  const defaultExposure =
    lighting === 'dim'
      ? 1.16
      : lighting === 'emergency'
        ? 1.13
        : lighting === 'cold'
          ? 1.1
          : lighting === 'warm'
            ? 1.12
            : lighting === 'pulse'
              ? 1.14
              : 1.08;

  const previousWasWireframe = recentRooms.at(-1)?.wireframe === true;
  const wireframe =
    override?.wireframe === true && !previousWasWireframe
      ? true
      : override?.wireframe === false
        ? false
        : !previousWasWireframe && rng.chance(0.12);

  return {
    shader,
    lighting,
    tint: override?.tint ?? rng.pick(EFFECT_TINTS),
    effectStrength: clamp(override?.effectStrength ?? rng.float(0.36, 0.68), 0, 0.78),
    pixelSize: clamp(Math.round(override?.pixelSize ?? rng.int(3, 8)), 2, 12),
    wireframe,
    exposure: clamp(
      override?.exposure ?? defaultExposure + rng.float(-0.03, 0.07),
      highVisibility ? 1.2 : 1.02,
      highVisibility ? 1.38 : 1.35,
    ),
    motionSpeed: clamp(override?.motionSpeed ?? rng.float(0.22, 1.45), 0.05, 2.4),
    distortion: clamp(override?.distortion ?? rng.float(0.12, 0.74), 0, 1),
    colorCycle: clamp(override?.colorCycle ?? rng.float(0.08, 0.86), 0, 1),
    viewScale: clamp(override?.viewScale ?? rng.float(1.015, 1.13), 1, 1.24),
    mirrorSegments: clamp(Math.round(override?.mirrorSegments ?? rng.int(3, 9)), 2, 12),
    rotationSpeed: clamp(override?.rotationSpeed ?? rng.float(-0.11, 0.11), -0.22, 0.22),
    angleOffset: clamp(override?.angleOffset ?? rng.float(-Math.PI, Math.PI), -Math.PI, Math.PI),
    flashStrength: flashingDisabled
      ? 0
      : clamp(override?.flashStrength ?? rng.float(0.08, 0.2), 0, 0.24),
    flashingDisabled,
    highVisibility,
  };
}

/** Convert LLM JSON into a steer, then rebuild with pack director. */
export function parseRoomDirection(
  raw: unknown,
  seed: string,
  ctx?: Partial<GenerationContext>,
): RoomDirection | null {
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
  if (rng.chance(0.35)) return `${base} ${rng.pick(['Annex', 'B', 'North', 'After', 'Mezzanine'])}`;
  return base;
}

function varyBlurb(rng: SeededRng, base: string, mood: MoodAxis): string {
  const tails = [
    'Something left recently.',
    'The lights remember a different hour.',
    'Footsteps do not echo the way they should.',
    'A distant intercom clears its throat.',
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

const LAYOUT_STYLES: RoomLayoutStyle[] = [
  'clusters',
  'perimeter',
  'axial',
  'scattered',
  'sparse',
];

function selectNovelTheme(
  rng: SeededRng,
  recentRooms: RoomHistoryEntry[],
  requestedThemeId?: string,
): ThemePreset {
  const recent = recentRooms.slice(-8);
  const recentThemeIds = new Set(
    recent.map((room) => room.themeId).filter((id): id is string => Boolean(id)),
  );
  const recentEnvironments = recent.slice(-2).map((room) => room.environment);
  const requested = requestedThemeId ? getTheme(requestedThemeId) : undefined;

  const ranked = THEME_PRESETS.map((theme) => {
    let score = rng.float(0, 1);
    if (requested?.id === theme.id) score += 2.4;
    if (recentThemeIds.has(theme.id)) score -= 9;
    const environment = environmentForTheme(theme);
    score -= recentEnvironments.filter((value) => value === environment).length * 1.45;
    const sizeClass = sizeClassForDimensions(theme.width, theme.depth);
    score -= recent
      .slice(-2)
      .filter((room) => room.sizeClass === sizeClass).length * 1.35;
    return { theme, score };
  }).sort((a, b) => b.score - a.score);

  // With a healthy catalog an exact theme cannot recur inside the recent window.
  return ranked.find(({ theme }) => !recentThemeIds.has(theme.id))?.theme ?? ranked[0]!.theme;
}

function environmentForTheme(theme: ThemePreset): RoomEnvironment {
  if (theme.environment) return theme.environment;
  if (theme.tags.includes('outdoor')) return 'outdoor';
  if (
    theme.tags.includes('open') ||
    theme.tags.includes('courtyard') ||
    theme.tags.includes('greenhouse') ||
    theme.tags.includes('gym')
  ) {
    return 'open-hall';
  }
  return 'interior';
}

function selectNovelLayout(
  rng: SeededRng,
  recentRooms: RoomHistoryEntry[],
  environment: RoomEnvironment,
): RoomLayoutStyle {
  const suitable =
    environment === 'outdoor'
      ? LAYOUT_STYLES.filter((style) => style !== 'perimeter')
      : environment === 'open-hall'
        ? LAYOUT_STYLES.filter((style) => style !== 'sparse' || rng.chance(0.5))
        : LAYOUT_STYLES;
  const recent = new Set(recentRooms.slice(-2).map((room) => room.layoutStyle));
  const fresh = suitable.filter((style) => !recent.has(style));
  return rng.pick(fresh.length ? fresh : suitable);
}

function selectNovelMood(
  rng: SeededRng,
  recentRooms: RoomHistoryEntry[],
  proposed: MoodAxis,
): MoodAxis {
  const recent = new Set(recentRooms.slice(-2).map((room) => room.mood));
  if (!recent.has(proposed)) return proposed;
  const moods: MoodAxis[] = ['upper', 'downer', 'static', 'dynamic'];
  return rng.pick(moods.filter((mood) => !recent.has(mood)));
}

function sizeClassForDimensions(width: number, depth: number): RoomHistoryEntry['sizeClass'] {
  const longestSide = Math.max(width, depth);
  return longestSide >= 46
    ? 'vast'
    : longestSide >= 28
      ? 'large'
      : longestSide <= 11
        ? 'compact'
        : 'standard';
}

function pickNovelVisual<T extends string>(
  rng: SeededRng,
  source: readonly T[],
  recent: readonly T[],
  preferred?: T,
): T {
  const recentSet = new Set(recent);
  const unique = [...new Set(source)];
  if (preferred && unique.includes(preferred) && !recentSet.has(preferred)) return preferred;
  const fresh = unique.filter((value) => !recentSet.has(value));
  return rng.pick(fresh.length ? fresh : unique);
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

export function roomHistoryEntryFor(spec: RoomSpec): RoomHistoryEntry {
  return {
    themeId: spec.themeId,
    environment: spec.environment ?? 'interior',
    layoutStyle: spec.layoutStyle ?? 'clusters',
    sizeClass: sizeClassForDimensions(spec.width, spec.depth),
    mood: spec.mood,
    shader: spec.visuals?.shader ?? 'none',
    lighting: spec.visuals?.lighting ?? 'fluorescent',
    wireframe: spec.visuals?.wireframe ?? false,
    assetIds: [
      ...spec.props.map((prop) => prop.assetId).filter((id): id is string => Boolean(id)),
      ...spec.entities.map((entity) => entity.assetId).filter((id): id is string => Boolean(id)),
    ],
  };
}
