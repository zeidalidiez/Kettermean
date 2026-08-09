import { PLAYER, ROOM } from '../config';
import { SeededRng } from '../core/rng';
import { sanitizeDisplayText } from '../core/contentSafety';
import type {
  EntityBehavior,
  GenerationContext,
  MoodAxis,
  RoomArchitecture,
  RoomCondition,
  RoomEnvironment,
  RoomEntity,
  RoomHistoryEntry,
  RoomLayoutStyle,
  RoomPalette,
  RoomProp,
  RoomScaleProfile,
  RoomSignText,
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
  architecture?: RoomArchitecture;
  scaleProfile?: RoomScaleProfile;
  worldScale?: number;
  condition?: RoomCondition;
  tags?: string[];
  fogNear?: number;
  fogFar?: number;
  linkColor?: string;
  palette?: Partial<RoomPalette>;
  physics?: Partial<RoomSpec['physics']>;
  roomRule?: string;
  signs?: RoomSignText[];
  npcLines?: string[];
  npcBehavior?: EntityBehavior;
}

/**
 * Offline / hybrid director.
 * Rooms are composed from many small layout packs, scored by tags/mood
 * with intentional liminal clash — not a handful of whole-room layouts.
 */
export function generateOfflineDirection(ctx: GenerationContext, steer?: DirectorSteer): RoomDirection {
  const rng = new SeededRng(ctx.seed);
  const recentRooms = ctx.recentRooms ?? [];
  const theme = selectNovelTheme(rng, recentRooms, steer?.themeId);
  const requestedCondition =
    steer?.condition === 'bloodied' && !ctx.allowGore ? undefined : steer?.condition;
  const condition = requestedCondition ?? selectRoomCondition(
    new SeededRng(`${ctx.seed}:condition`),
    theme,
    ctx.allowGore,
    recentRooms,
  );
  const scaleProfile = steer?.scaleProfile ?? selectScaleProfile(rng, recentRooms);
  const worldScale = clamp(
    steer?.worldScale ?? worldScaleForProfile(rng, scaleProfile),
    0.6,
    24,
  );
  const environment = environmentForScale(
    rng,
    steer?.environment ?? environmentForTheme(theme),
    scaleProfile,
  );
  const layoutStyle = steer?.layoutStyle ?? selectNovelLayout(rng, recentRooms, environment);
  const architecture =
    steer?.architecture ??
    selectNovelArchitecture(rng, recentRooms, environment, theme.architecture);

  const proposedMood =
    steer?.mood || (rng.chance(0.65) ? theme.mood : biasMood(rng, ctx.moodBias));
  const mood = selectNovelMood(rng, recentRooms, proposedMood);

  const { width, depth, height } = dimensionsForScale(
    rng,
    theme,
    scaleProfile,
    steer,
  );

  const area = width * depth;
  const effectiveArea = area / Math.max(0.6, worldScale * worldScale);
  const density = clamp(steer?.density ?? 1, 0.65, 1.4);
  const minimumPacks = scaleProfile === 'closet' ? 4 : scaleProfile === 'human' ? 8 : 6;
  const targetPacks = clamp(
    Math.round((6 + effectiveArea / 48 + rng.float(-2, 3)) * density),
    minimumPacks,
    environment === 'outdoor' ? 42 : 50,
  );

  const stamped = stampRoomPacks(rng, {
    width,
    depth,
    themeTags: theme.tags,
    mood,
    preferAssets: [...new Set([...theme.preferredAssets, ...(steer?.preferAssets ?? [])])].filter(
      (assetId) => getAsset(assetId)?.category !== 'portal',
    ),
    giant: steer?.giant,
    targetPacks,
    layoutStyle,
    avoidAssets: recentRooms.slice(-2).flatMap((room) => room.assetIds),
    environment,
    worldScale,
    avoidSceneSets: recentRooms
      .slice(-3)
      .flatMap((room) => [room.primarySet, room.contrastSet])
      .filter((setId): setId is string => Boolean(setId)),
  });
  const placements = steer?.npcBehavior
    ? stamped.placements.map((placement) => {
        const asset = getAsset(placement.assetId);
        const actor = asset?.category === 'npc' || asset?.category === 'creature' || asset?.category === 'anomaly';
        return actor ? { ...placement, behavior: steer.npcBehavior } : placement;
      })
    : stamped.placements;
  const composition = stamped.composition;

  const title = sanitizeDisplayText(
    cleanSteerText(steer?.title, 80) || varyTitle(rng, theme.title, mood),
    theme.title,
    80,
  );
  const blurb = sanitizeDisplayText(
    cleanSteerText(steer?.blurb, 320) || varyBlurb(rng, theme.blurb, mood),
    theme.blurb,
    320,
  );
  const basePalette = conditionPalette(tintPalette(rng, theme.palette, mood), condition);
  const basePhysics = physicsForMood(rng, mood);

  return {
    seed: ctx.seed,
    themeId: theme.id,
    title,
    blurb,
    mood,
    tags: [
      ...theme.tags,
      ...(steer?.tags ?? []),
      mood,
      'packs',
      `scale:${scaleProfile}`,
      `condition:${condition}`,
      `set:${composition.primarySet}`,
      ...(composition.supportingSet ? [`support:${composition.supportingSet}`] : []),
      ...(composition.contrastSet ? [`contrast:${composition.contrastSet}`] : []),
    ],
    width,
    depth,
    height,
    scaleProfile,
    worldScale,
    condition,
    environment,
    layoutStyle,
    architecture,
    composition,
    fogNear: steer?.fogNear ?? (mood === 'downer' ? 10 : mood === 'upper' ? 18 : 13),
    fogFar: steer?.fogFar ?? Math.max(
      mood === 'downer' ? 36 : mood === 'upper' ? 68 : 48,
      Math.max(width, depth) * 1.45,
    ),
    linkColor: steer?.linkColor ?? moodLinkColor(mood),
    palette: { ...basePalette, ...steer?.palette },
    physics: { ...basePhysics, ...steer?.physics },
    visuals: resolveRoomVisuals(ctx.seed, mood, steer?.visuals, recentRooms, ctx, condition),
    roomRule: cleanSteerText(steer?.roomRule, 180),
    signs: steer?.signs,
    npcLines: steer?.npcLines,
    placements,
    offline: !steer,
  };
}

export function assembleRoomSpec(dir: RoomDirection): RoomSpec {
  const props: RoomProp[] = [];
  const entities: RoomEntity[] = [];
  let propRenderCost = 0;
  let entityRenderCost = 0;
  const worldScale = clamp(dir.worldScale ?? 1, 0.6, 24);

  let actorIndex = 0;
  dir.placements.forEach((p, i) => {
    const asset = getAsset(p.assetId);
    if (!asset || asset.category === 'portal') return;
    const mul = clamp(p.scaleMul ?? 1, asset.scaleRange.min, asset.scaleRange.max);
    const localScale = p.scale ?? {
      x: asset.defaultScale.x * mul,
      y: asset.defaultScale.y * mul,
      z: asset.defaultScale.z * mul,
    };
    const scale = {
      x: localScale.x * worldScale,
      y: localScale.y * worldScale,
      z: localScale.z * worldScale,
    };
    const isActor =
      asset.category === 'npc' || asset.category === 'creature' || asset.category === 'anomaly';
    const label = sanitizeDisplayText(p.labelOverride || asset.label, asset.label, 64);

    if (isActor) {
      const renderCost = asset.renderCost ?? 3;
      if (
        entities.length >= ROOM.entityCountMax ||
        entityRenderCost + renderCost > ROOM.entityRenderCostMax
      ) return;
      const dialogue = dir.npcLines?.[actorIndex];
      actorIndex += 1;
      entities.push({
        id: `e${i}`,
        label,
        shape: 'box',
        position: { x: p.x, y: p.y ?? 0, z: p.z },
        scale,
        color: dir.palette?.accent || '#cccccc',
        behavior: (p.behavior || asset.defaultBehavior || 'idle') as EntityBehavior,
        speed: 0.45 + (i % 3) * 0.2,
        dialogue: dialogue
          ? sanitizeDisplayText(dialogue, '', 140) || undefined
          : undefined,
        kind: asset.kind,
        assetId: asset.id,
      });
      entityRenderCost += renderCost;
    } else {
      const renderCost = asset.renderCost ?? 1;
      if (
        props.length >= ROOM.propCountMax ||
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
        linksOnTouch: false,
        solid: p.solid ?? asset.solidDefault ?? true,
        kind: asset.kind,
        assetId: asset.id,
      });
      propRenderCost += renderCost;
    }
  });

  if (props.length === 0) {
    props.push({
      id: 'p_fallback',
      label: 'chair',
      shape: 'box',
      position: { x: 2, y: 0, z: 2 },
      scale: { x: 0.6 * worldScale, y: 1.2 * worldScale, z: 0.6 * worldScale },
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
    blurb: sanitizeDisplayText(dir.blurb, theme?.blurb || 'The room waits.', 320),
    themeId: dir.themeId,
    themeTags: dir.tags.map((tag) => sanitizeDisplayText(tag, 'liminal', 32)),
    mood: dir.mood,
    environment: dir.environment ?? (theme ? environmentForTheme(theme) : 'interior'),
    layoutStyle: dir.layoutStyle ?? 'clusters',
    architecture: dir.architecture ?? theme?.architecture ?? 'chamber',
    composition: dir.composition,
    scaleProfile: dir.scaleProfile ?? 'human',
    worldScale,
    condition: dir.condition ?? 'normal',
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
    visuals: dir.visuals ?? resolveRoomVisuals(dir.seed, dir.mood, undefined, [], {}, dir.condition),
    roomRule: dir.roomRule
      ? sanitizeDisplayText(dir.roomRule, '', 180) || undefined
      : undefined,
    signs: dir.signs?.slice(0, 6).map((sign) => ({
      headline: sanitizeDisplayText(sign.headline, '', 64),
      caption: sanitizeDisplayText(sign.caption, '', 48),
      tags: sign.tags?.map((tag) => sanitizeDisplayText(tag, '', 32)).filter(Boolean),
    })).filter((sign) => Boolean(sign.headline && sign.caption)),
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
  'posterize',
  'duotone',
  'dither',
  'solarize',
  'heatwave',
  'negative',
  'halftone',
  'smear',
  'rain',
  'spectral',
  'mosaic',
  'edgeglow',
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
const CONDITION_SHADER_STYLES: Partial<Record<RoomCondition, readonly RoomVisuals['shader'][]>> = {
  bloodied: ['solarize', 'tint', 'noir'],
  slimed: ['smear', 'acid', 'underwater'],
  scorched: ['heatwave', 'dither', 'noir'],
  burning: ['heatwave', 'thermal', 'smear'],
  ruined: ['halftone', 'dither', 'noir', 'negative'],
  overgrown: ['dream', 'tint', 'duotone'],
  frozen: ['negative', 'duotone', 'prism'],
  flooded: ['rain', 'underwater', 'smear'],
  dusty: ['halftone', 'dither', 'tint'],
  moldy: ['smear', 'duotone', 'acid'],
  electrified: ['edgeglow', 'prism', 'vhs'],
  haunted: ['spectral', 'negative', 'dream'],
  gilded: ['mosaic', 'posterize', 'duotone'],
  bioluminescent: ['edgeglow', 'dream', 'prism'],
  stormbound: ['rain', 'noir', 'vhs'],
};
const CONDITION_LIGHTING_STYLES: Partial<Record<RoomCondition, readonly RoomVisuals['lighting'][]>> = {
  bloodied: ['emergency', 'warm'],
  slimed: ['fluorescent', 'pulse'],
  scorched: ['warm', 'emergency'],
  burning: ['warm', 'emergency'],
  ruined: ['cold', 'emergency'],
  overgrown: ['warm', 'fluorescent'],
  frozen: ['cold', 'fluorescent'],
  flooded: ['cold', 'fluorescent'],
  dusty: ['warm', 'dim'],
  moldy: ['fluorescent', 'dim'],
  electrified: ['pulse', 'cold'],
  haunted: ['cold', 'dim'],
  gilded: ['warm', 'fluorescent'],
  bioluminescent: ['pulse', 'cold'],
  stormbound: ['cold', 'emergency'],
};

/** Stable visual treatment for every room, whether or not a model contributes. */
export function resolveRoomVisuals(
  seed: string,
  mood: MoodAxis,
  override?: Partial<RoomVisuals>,
  recentRooms: RoomHistoryEntry[] = [],
  preferences: Pick<GenerationContext, 'noFlashingLights' | 'noLowLight'> = {},
  condition: RoomCondition = 'normal',
): RoomVisuals {
  const rng = new SeededRng(`${seed}:visuals`);
  const recentShaders = recentRooms.slice(-2).map((room) => room.shader);
  const recentLighting = recentRooms.slice(-2).map((room) => room.lighting);
  const flashingDisabled = preferences.noFlashingLights === true;
  const highVisibility = preferences.noLowLight === true;
  const availableShaders = SHADER_STYLES.filter(
    (style) => !flashingDisabled || style !== 'strobe',
  );
  const conditionShaders = CONDITION_SHADER_STYLES[condition];
  const conditionShader =
    !override?.shader && conditionShaders?.length && rng.chance(0.58)
      ? rng.pick(conditionShaders)
      : undefined;
  const proposedShader = pickNovelVisual(
    rng,
    availableShaders,
    recentShaders,
    override?.shader ?? conditionShader,
  );
  // Kaleidoscope destroys reliable spatial landmarks. Keep it as a rare dream event,
  // including when an LLM explicitly steers toward it; R remains an instant escape.
  const kaleidoscopeAcceptance = override?.shader === 'kaleidoscope' ? 0.04 : 0.16;
  const shader =
    proposedShader === 'kaleidoscope' && !rng.chance(kaleidoscopeAcceptance)
      ? pickNovelVisual(
          rng,
          availableShaders.filter((style) => style !== 'kaleidoscope'),
          recentShaders,
        )
      : proposedShader;
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
  const conditionLightingChoices = CONDITION_LIGHTING_STYLES[condition]?.filter((style) =>
    availableLighting.includes(style),
  );
  const conditionLighting =
    !override?.lighting && conditionLightingChoices?.length && rng.chance(0.58)
      ? rng.pick(conditionLightingChoices)
      : undefined;
  const proposedLighting = conditionLighting ?? (rng.chance(0.32) ? moodLighting : undefined);
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
  const title = directorText(o.title, 80);
  const blurb = directorText(o.blurb ?? o.description, 320);
  const mood = enumValue(o.mood, MOOD_VALUES);

  const preferAssets: string[] = [];
  const placementsRaw = Array.isArray(o.placements)
    ? o.placements
    : Array.isArray(o.assets)
      ? o.assets
      : Array.isArray(o.preferredAssets)
        ? o.preferredAssets
        : Array.isArray(o.preferAssets)
          ? o.preferAssets
          : null;
  if (placementsRaw) {
    for (const p of placementsRaw) {
      if (typeof p === 'string') {
        if (getAsset(p)) preferAssets.push(p);
        continue;
      }
      if (!p || typeof p !== 'object') continue;
      const po = p as Record<string, unknown>;
      const id = typeof po.assetId === 'string' ? po.assetId : typeof po.id === 'string' ? po.id : '';
      if (id && getAsset(id)) preferAssets.push(id);
    }
  }

  const tags = stringList(o.tags ?? o.themeTags, 10, 32);
  const environment = enumValue(o.environment, ENVIRONMENT_VALUES);
  const layoutStyle = enumValue(o.layoutStyle, LAYOUT_VALUES);
  const architecture = enumValue(o.architecture, ARCHITECTURE_VALUES);
  const scaleProfile = enumValue(o.scaleProfile, SCALE_PROFILE_VALUES);
  const conditionCandidate = enumValue(o.condition, CONDITION_VALUES);
  const condition = conditionCandidate === 'bloodied' && ctx?.allowGore !== true
    ? undefined
    : conditionCandidate;
  const visuals = parseVisualSteer(o.visuals ?? o);
  const palette = parsePalette(o.palette);
  const physics = parsePhysics(o.physics);
  const roomRule = directorText(o.roomRule ?? o.rule, 180);
  const signs = parseAuthoredSigns(o.signs, tags.length > 0 ? tags : theme?.tags ?? []);
  const npcLines = stringList(o.npcLines ?? o.dialogue, 6, 140);
  const npcBehavior = enumValue(o.npcBehavior, BEHAVIOR_VALUES);
  const width = boundedNumber(o.width, ROOM.minSize, ROOM.maxSize);
  const depth = boundedNumber(o.depth, ROOM.minSize, ROOM.maxSize);
  const height = boundedNumber(o.height, ROOM.wallHeightMin, ROOM.maxHeight);
  const density = boundedNumber(o.density, 0.65, 1.4);
  const worldScale = boundedNumber(o.worldScale, 0.6, 24);
  const fogNear = boundedNumber(o.fogNear, 2, ROOM.maxSize);
  const fogFar = boundedNumber(o.fogFar, 10, ROOM.maxSize * 3);
  const linkColor = colorValue(o.linkColor);
  const giant = booleanValue(o.giant) ?? preferAssets.includes('anomaly_giant_baby');

  const hasMeaningfulDirection = Boolean(
    theme || title || blurb || mood || preferAssets.length || tags.length ||
    environment || layoutStyle || architecture || scaleProfile || condition ||
    Object.keys(visuals).length || Object.keys(palette).length || Object.keys(physics).length ||
    roomRule || signs.length || npcLines.length || npcBehavior || width || depth || height ||
    density || worldScale || fogNear || fogFar || linkColor || booleanValue(o.giant) !== undefined
  );
  if (!hasMeaningfulDirection) return null;

  const steer: DirectorSteer = {
    themeId: theme?.id,
    mood,
    title,
    blurb,
    preferAssets,
    giant,
    width,
    depth,
    height,
    density,
    visuals,
    environment,
    layoutStyle,
    architecture,
    scaleProfile,
    worldScale,
    condition,
    tags,
    fogNear,
    fogFar,
    linkColor,
    palette,
    physics,
    roomRule,
    signs,
    npcLines,
    npcBehavior,
  };

  return generateOfflineDirection(
    {
      seed,
      previousTitles: ctx?.previousTitles ?? [],
      moodBias: ctx?.moodBias ?? mood ?? theme?.mood ?? 'static',
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

function conditionPalette(
  base: ThemePreset['palette'],
  condition: RoomCondition,
): ThemePreset['palette'] {
  const mix = (key: keyof ThemePreset['palette'], target: string, amount: number): string =>
    mixHex(base[key], target, amount);
  switch (condition) {
    case 'bloodied':
      return {
        floor: mix('floor', '#210509', 0.48),
        ceiling: mix('ceiling', '#351318', 0.25),
        walls: mix('walls', '#481116', 0.34),
        accent: '#8f0918',
        fog: mix('fog', '#23080d', 0.38),
        light: mix('light', '#ffb3aa', 0.28),
        ambient: mix('ambient', '#5b1119', 0.4),
      };
    case 'slimed':
      return {
        floor: mix('floor', '#18321d', 0.46),
        ceiling: mix('ceiling', '#52704b', 0.25),
        walls: mix('walls', '#355b38', 0.3),
        accent: mix('accent', '#73db49', 0.62),
        fog: mix('fog', '#294b2d', 0.35),
        light: mix('light', '#c9ff8a', 0.42),
        ambient: mix('ambient', '#376e3b', 0.4),
      };
    case 'scorched':
      return {
        floor: mix('floor', '#171310', 0.62),
        ceiling: mix('ceiling', '#28201a', 0.46),
        walls: mix('walls', '#30231c', 0.52),
        accent: mix('accent', '#8c4824', 0.46),
        fog: mix('fog', '#29201c', 0.5),
        light: mix('light', '#e7aa72', 0.24),
        ambient: mix('ambient', '#4d3325', 0.52),
      };
    case 'burning':
      return {
        floor: mix('floor', '#160b08', 0.68),
        ceiling: mix('ceiling', '#24100c', 0.56),
        walls: mix('walls', '#35150f', 0.58),
        accent: '#ff5422',
        fog: mix('fog', '#32140e', 0.62),
        light: '#ffad42',
        ambient: mix('ambient', '#7a2f18', 0.66),
      };
    case 'ruined':
      return {
        floor: mix('floor', '#47433c', 0.45),
        ceiling: mix('ceiling', '#69645a', 0.35),
        walls: mix('walls', '#5a564d', 0.4),
        accent: mix('accent', '#766854', 0.45),
        fog: mix('fog', '#68645d', 0.3),
        light: mix('light', '#ded4be', 0.2),
        ambient: mix('ambient', '#5d594f', 0.35),
      };
    case 'overgrown':
      return {
        floor: mix('floor', '#19371e', 0.42),
        ceiling: mix('ceiling', '#76906d', 0.22),
        walls: mix('walls', '#486b49', 0.3),
        accent: mix('accent', '#65a943', 0.48),
        fog: mix('fog', '#54745a', 0.28),
        light: mix('light', '#d8f8ae', 0.3),
        ambient: mix('ambient', '#426844', 0.4),
      };
    case 'frozen':
      return {
        floor: mix('floor', '#89b8c8', 0.42),
        ceiling: mix('ceiling', '#d8f7ff', 0.44),
        walls: mix('walls', '#a8d5e2', 0.38),
        accent: mix('accent', '#72d9f2', 0.58),
        fog: mix('fog', '#c5edf2', 0.5),
        light: '#e8fdff',
        ambient: mix('ambient', '#78aebc', 0.42),
      };
    case 'flooded':
      return {
        floor: mix('floor', '#164c59', 0.5),
        ceiling: mix('ceiling', '#466f78', 0.26),
        walls: mix('walls', '#2e6470', 0.34),
        accent: mix('accent', '#58d7df', 0.58),
        fog: mix('fog', '#285b68', 0.42),
        light: mix('light', '#c9fbff', 0.46),
        ambient: mix('ambient', '#356d78', 0.46),
      };
    case 'dusty':
      return {
        floor: mix('floor', '#6e614c', 0.48),
        ceiling: mix('ceiling', '#b4a68b', 0.34),
        walls: mix('walls', '#918268', 0.4),
        accent: mix('accent', '#c29d5e', 0.42),
        fog: mix('fog', '#9c8e75', 0.42),
        light: mix('light', '#f0d9ac', 0.3),
        ambient: mix('ambient', '#75674f', 0.44),
      };
    case 'moldy':
      return {
        floor: mix('floor', '#28351d', 0.48),
        ceiling: mix('ceiling', '#687158', 0.3),
        walls: mix('walls', '#536044', 0.38),
        accent: mix('accent', '#889649', 0.5),
        fog: mix('fog', '#505b45', 0.36),
        light: mix('light', '#dae4a5', 0.34),
        ambient: mix('ambient', '#596344', 0.44),
      };
    case 'electrified':
      return {
        floor: mix('floor', '#071725', 0.56),
        ceiling: mix('ceiling', '#132b3c', 0.42),
        walls: mix('walls', '#12354b', 0.46),
        accent: '#37e6ff',
        fog: mix('fog', '#10283a', 0.5),
        light: '#baf8ff',
        ambient: mix('ambient', '#154a64', 0.56),
      };
    case 'haunted':
      return {
        floor: mix('floor', '#2a2a37', 0.5),
        ceiling: mix('ceiling', '#777b91', 0.32),
        walls: mix('walls', '#55586e', 0.38),
        accent: mix('accent', '#aeb8e8', 0.52),
        fog: mix('fog', '#62677b', 0.44),
        light: '#e9edff',
        ambient: mix('ambient', '#585d7a', 0.46),
      };
    case 'gilded':
      return {
        floor: mix('floor', '#49360c', 0.44),
        ceiling: mix('ceiling', '#7d6522', 0.3),
        walls: mix('walls', '#725617', 0.36),
        accent: '#e0b233',
        fog: mix('fog', '#5c4a20', 0.36),
        light: '#fff0a0',
        ambient: mix('ambient', '#81651e', 0.5),
      };
    case 'bioluminescent':
      return {
        floor: mix('floor', '#082b28', 0.54),
        ceiling: mix('ceiling', '#143c3b', 0.38),
        walls: mix('walls', '#124a42', 0.44),
        accent: '#55efb2',
        fog: mix('fog', '#123b38', 0.5),
        light: '#b6ffda',
        ambient: mix('ambient', '#176a58', 0.55),
      };
    case 'stormbound':
      return {
        floor: mix('floor', '#26323d', 0.5),
        ceiling: mix('ceiling', '#344250', 0.42),
        walls: mix('walls', '#3d4d5b', 0.4),
        accent: mix('accent', '#8faccc', 0.52),
        fog: mix('fog', '#4c5d6e', 0.48),
        light: '#e5f3ff',
        ambient: mix('ambient', '#536b82', 0.5),
      };
    default:
      return base;
  }
}

function mixHex(from: string, to: string, amount: number): string {
  const parse = (value: string): [number, number, number] | null => {
    const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
    if (!match) return null;
    const number = parseInt(match[1]!, 16);
    return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
  };
  const a = parse(from);
  const b = parse(to);
  if (!a || !b) return from;
  return `#${a
    .map((channel, index) =>
      Math.round(channel + (b[index]! - channel) * clamp(amount, 0, 1))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
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

function cleanSteerText(v?: string, maxLength = 160): string | undefined {
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
  return isDirectorPlaceholder(t) ? undefined : t.slice(0, maxLength);
}

const MOOD_VALUES = ['upper', 'downer', 'static', 'dynamic'] as const;
const ENVIRONMENT_VALUES = ['interior', 'open-hall', 'outdoor'] as const;
const LAYOUT_VALUES = ['clusters', 'perimeter', 'axial', 'scattered', 'sparse'] as const;
const ARCHITECTURE_VALUES = [
  'chamber', 'colonnade', 'atrium', 'arena', 'concourse', 'courtyard', 'causeway', 'field', 'basin',
] as const;
const SCALE_PROFILE_VALUES = ['closet', 'human', 'grand', 'monumental', 'colossal'] as const;
const CONDITION_VALUES = [
  'normal', 'bloodied', 'slimed', 'scorched', 'burning', 'ruined', 'overgrown', 'frozen',
  'flooded', 'dusty', 'moldy', 'electrified', 'haunted', 'gilded', 'bioluminescent', 'stormbound',
] as const;
const SHADER_VALUES = [
  'none', 'retro', 'tint', 'dream', 'noir', 'crt', 'underwater', 'kaleidoscope', 'acid',
  'fisheye', 'thermal', 'prism', 'vhs', 'strobe', 'mirror', 'tunnel', 'posterize', 'duotone',
  'dither', 'solarize', 'heatwave', 'negative', 'halftone', 'smear', 'rain', 'spectral',
  'mosaic', 'edgeglow',
] as const;
const LIGHTING_VALUES = ['fluorescent', 'dim', 'cold', 'warm', 'emergency', 'pulse'] as const;
const BEHAVIOR_VALUES = ['idle', 'wander', 'orbit', 'stare'] as const;

function enumValue<const T extends readonly string[]>(value: unknown, values: T): T[number] | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase().replace(/[ _]+/g, '-');
  return values.find((candidate) => candidate === normalized);
}

function directorText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = sanitizeDisplayText(value, '', maxLength);
  return cleanSteerText(cleaned, maxLength);
}

function isDirectorPlaceholder(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return (
    /^<[^>]+>$/.test(normalized) ||
    /^(?:a |one )?short (?:atmospheric )?(?:title|blurb|description)\b/.test(normalized) ||
    /\b(?:2|two)\s*(?:-|–|to)\s*(?:5|five)\s+words?\b/.test(normalized) ||
    /^(?:invent|write|choose|select|return|use exactly)\b/.test(normalized) ||
    /^(?:upper|downer|static|dynamic)(?:\s+or\s+\w+)+$/.test(normalized)
  );
}

function stringList(value: unknown, maxItems: number, maxLength: number): string[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return [...new Set(values
    .map((item) => directorText(item, maxLength))
    .filter((item): item is string => Boolean(item)))]
    .slice(0, maxItems);
}

function boundedNumber(value: unknown, minimum: number, maximum: number): number | undefined {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? clamp(number, minimum, maximum) : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  if (/^(?:yes|true|1)$/i.test(value.trim())) return true;
  if (/^(?:no|false|0)$/i.test(value.trim())) return false;
  return undefined;
}

function colorValue(value: unknown): string | undefined {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim())
    ? value.trim().toLowerCase()
    : undefined;
}

function parsePalette(value: unknown): Partial<RoomPalette> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const palette: Partial<RoomPalette> = {};
  for (const key of ['floor', 'ceiling', 'walls', 'accent', 'fog', 'light', 'ambient'] as const) {
    const color = colorValue(raw[key]);
    if (color) palette[key] = color;
  }
  return palette;
}

function parsePhysics(value: unknown): Partial<RoomSpec['physics']> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  return {
    ...(boundedNumber(raw.gravity, 0.2, 2.2) !== undefined ? { gravity: boundedNumber(raw.gravity, 0.2, 2.2) } : {}),
    ...(boundedNumber(raw.moveSpeed, 0.4, 2) !== undefined ? { moveSpeed: boundedNumber(raw.moveSpeed, 0.4, 2) } : {}),
    ...(boundedNumber(raw.friction, 0.2, 2) !== undefined ? { friction: boundedNumber(raw.friction, 0.2, 2) } : {}),
    ...(boundedNumber(raw.bounce, 0, 0.8) !== undefined ? { bounce: boundedNumber(raw.bounce, 0, 0.8) } : {}),
    ...(boundedNumber(raw.sway, 0, 2) !== undefined ? { sway: boundedNumber(raw.sway, 0, 2) } : {}),
  };
}

function parseVisualSteer(value: unknown): Partial<RoomVisuals> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const shader = enumValue(raw.shader, SHADER_VALUES);
  const lighting = enumValue(raw.lighting, LIGHTING_VALUES);
  const tint = colorValue(raw.tint);
  const wireframe = booleanValue(raw.wireframe);
  return {
    ...(shader ? { shader } : {}),
    ...(lighting ? { lighting } : {}),
    ...(tint ? { tint } : {}),
    ...(wireframe !== undefined ? { wireframe } : {}),
    ...numberField(raw, 'effectStrength', 0, 0.78),
    ...numberField(raw, 'pixelSize', 2, 12),
    ...numberField(raw, 'exposure', 1.02, 1.38),
    ...numberField(raw, 'motionSpeed', 0.05, 2.4),
    ...numberField(raw, 'distortion', 0, 1),
    ...numberField(raw, 'colorCycle', 0, 1),
    ...numberField(raw, 'viewScale', 1, 1.24),
    ...numberField(raw, 'mirrorSegments', 2, 12),
    ...numberField(raw, 'rotationSpeed', -0.22, 0.22),
    ...numberField(raw, 'flashStrength', 0, 0.24),
  };
}

function numberField<K extends keyof RoomVisuals>(
  raw: Record<string, unknown>,
  key: K,
  minimum: number,
  maximum: number,
): Partial<Pick<RoomVisuals, K>> {
  const value = boundedNumber(raw[key], minimum, maximum);
  return value === undefined ? {} : { [key]: value } as Partial<Pick<RoomVisuals, K>>;
}

function parseAuthoredSigns(value: unknown, fallbackTags: readonly string[]): RoomSignText[] {
  if (!Array.isArray(value)) return [];
  const signs: RoomSignText[] = [];
  for (const item of value.slice(0, 6)) {
    if (typeof item === 'string') {
      const [headline, caption = 'PLEASE PROCEED'] = item.split('|', 2);
      const sign = {
        headline: directorText(headline, 64) ?? '',
        caption: directorText(caption, 48) ?? '',
        tags: [...fallbackTags],
      };
      if (sign.headline && sign.caption) signs.push(sign);
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    const sign: RoomSignText = {
      headline: directorText(raw.headline ?? raw.text, 64) ?? '',
      caption: directorText(raw.caption ?? raw.subtext, 48) ?? '',
      tags: stringList(raw.tags, 8, 32),
    };
    if (sign.headline && sign.caption) signs.push(sign);
  }
  return signs;
}

const LAYOUT_STYLES: RoomLayoutStyle[] = [
  'clusters',
  'perimeter',
  'axial',
  'scattered',
  'sparse',
];

const ARCHITECTURES: Record<RoomEnvironment, RoomArchitecture[]> = {
  interior: ['chamber', 'colonnade', 'atrium', 'concourse', 'basin'],
  'open-hall': ['colonnade', 'atrium', 'arena', 'concourse', 'courtyard', 'basin'],
  outdoor: ['courtyard', 'causeway', 'field', 'basin', 'arena'],
};

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

function selectRoomCondition(
  rng: SeededRng,
  theme: ThemePreset,
  allowGore: boolean,
  recentRooms: RoomHistoryEntry[],
): RoomCondition {
  const tags = new Set(theme.tags.map((tag) => tag.toLowerCase()));
  const hasAny = (...values: string[]): boolean => values.some((value) => tags.has(value));

  // Explicit environmental themes always receive their matching treatment.
  // This keeps every person and prop in a fire dream visibly fire-damaged.
  if (hasAny('burning', 'fire', 'inferno', 'wildfire')) return 'burning';
  if (hasAny('scorched', 'ash', 'charred')) return 'scorched';
  if (hasAny('slime', 'goo', 'slimed')) return 'slimed';
  if (hasAny('overgrown', 'jungle', 'moss')) return 'overgrown';
  if (hasAny('frozen', 'ice', 'frost')) return 'frozen';
  if (hasAny('flooded', 'flood', 'drowned', 'waterlogged')) return 'flooded';
  if (hasAny('dusty', 'dust', 'sandstorm')) return 'dusty';
  if (hasAny('moldy', 'mold', 'mildew', 'fungus')) return 'moldy';
  if (hasAny('electrified', 'electric', 'neon', 'high-voltage')) return 'electrified';
  if (hasAny('haunted', 'ghost', 'spectral')) return 'haunted';
  if (hasAny('gilded', 'gold', 'opulent')) return 'gilded';
  if (hasAny('bioluminescent', 'bioluminescence', 'glow-spores')) return 'bioluminescent';
  if (hasAny('stormbound', 'storm', 'tempest', 'thunder')) return 'stormbound';
  if (hasAny('bloodied', 'blood', 'gore')) return allowGore ? 'bloodied' : 'ruined';
  if (hasAny('ruined', 'desolate', 'derelict')) return 'ruined';

  const previous = recentRooms.at(-1)?.condition;
  const baseWeights: Array<{ condition: RoomCondition; weight: number }> = [
    { condition: 'normal', weight: 0.34 },
    { condition: 'ruined', weight: 0.075 },
    { condition: 'overgrown', weight: 0.065 },
    { condition: 'slimed', weight: 0.05 },
    { condition: 'scorched', weight: 0.055 },
    { condition: 'burning', weight: 0.035 },
    { condition: 'frozen', weight: 0.045 },
    { condition: 'flooded', weight: 0.06 },
    { condition: 'dusty', weight: 0.055 },
    { condition: 'moldy', weight: 0.045 },
    { condition: 'electrified', weight: 0.05 },
    { condition: 'haunted', weight: 0.045 },
    { condition: 'gilded', weight: 0.035 },
    { condition: 'bioluminescent', weight: 0.04 },
    { condition: 'stormbound', weight: 0.045 },
    ...(allowGore ? [{ condition: 'bloodied' as const, weight: 0.035 }] : []),
  ];
  const weighted = baseWeights.map((choice) => ({
    ...choice,
    weight:
      choice.condition === previous
        ? choice.weight * (choice.condition === 'normal' ? 0.55 : 0.22)
        : choice.weight,
  }));

  const total = weighted.reduce((sum, choice) => sum + choice.weight, 0);
  let roll = rng.float(0, total);
  for (const choice of weighted) {
    roll -= choice.weight;
    if (roll <= 0) return choice.condition;
  }
  return 'normal';
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

function selectNovelArchitecture(
  rng: SeededRng,
  recentRooms: RoomHistoryEntry[],
  environment: RoomEnvironment,
  preferred?: RoomArchitecture,
): RoomArchitecture {
  const suitable = ARCHITECTURES[environment];
  const recent = new Set(recentRooms.slice(-3).map((room) => room.architecture));
  if (preferred && suitable.includes(preferred) && !recent.has(preferred)) return preferred;
  const fresh = suitable.filter((architecture) => !recent.has(architecture));
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

const SCALE_PROFILE_WEIGHTS: ReadonlyArray<{
  profile: RoomScaleProfile;
  weight: number;
}> = [
  { profile: 'closet', weight: 0.025 },
  { profile: 'human', weight: 0.62 },
  { profile: 'grand', weight: 0.29 },
  { profile: 'monumental', weight: 0.055 },
  { profile: 'colossal', weight: 0.01 },
];

function selectScaleProfile(
  rng: SeededRng,
  recentRooms: RoomHistoryEntry[],
): RoomScaleProfile {
  const previous = recentRooms.at(-1)?.scaleProfile;
  // Repeats are allowed: excluding the previous profile inflated rare extremes
  // whenever a normal human room was removed from the next draw. A soft repeat
  // penalty keeps variety without turning closets and colossal scenes common.
  const choices = SCALE_PROFILE_WEIGHTS.map((choice) => ({
    ...choice,
    weight: choice.profile === previous ? choice.weight * 0.55 : choice.weight,
  }));
  const total = choices.reduce((sum, choice) => sum + choice.weight, 0);
  let roll = rng.float(0, total);
  for (const choice of choices) {
    roll -= choice.weight;
    if (roll <= 0) return choice.profile;
  }
  return choices.at(-1)?.profile ?? 'human';
}

function worldScaleForProfile(rng: SeededRng, profile: RoomScaleProfile): number {
  switch (profile) {
    case 'closet':
      return rng.float(0.72, 1.04);
    case 'grand':
      return rng.float(1.3, 2.45);
    case 'monumental':
      return rng.float(3.5, 8.5);
    case 'colossal':
      return rng.float(11, 22);
    default:
      return rng.float(0.82, 1.3);
  }
}

function environmentForScale(
  rng: SeededRng,
  proposed: RoomEnvironment,
  profile: RoomScaleProfile,
): RoomEnvironment {
  if (profile === 'closet') return 'interior';
  if (profile === 'colossal') return rng.chance(0.76) ? 'outdoor' : 'open-hall';
  if (profile === 'monumental' && proposed === 'interior') {
    return rng.chance(0.64) ? rng.pick(['open-hall', 'outdoor'] as const) : proposed;
  }
  if (profile === 'grand' && proposed === 'interior' && rng.chance(0.22)) {
    return 'open-hall';
  }
  return proposed;
}

function dimensionsForScale(
  rng: SeededRng,
  theme: ThemePreset,
  profile: RoomScaleProfile,
  steer?: DirectorSteer,
): { width: number; depth: number; height: number } {
  const proposedWidth = steer?.width ?? theme.width;
  const proposedDepth = steer?.depth ?? theme.depth;
  const proposedHeight = steer?.height ?? theme.height;
  if (profile === 'closet') {
    return {
      width: clamp(steer?.width ?? rng.float(5.5, 9.4), ROOM.minSize, 10.2),
      depth: clamp(steer?.depth ?? rng.float(5.5, 10.4), ROOM.minSize, 10.8),
      height: clamp(steer?.height ?? rng.float(2.35, 3.35), 2.3, 3.5),
    };
  }
  if (profile === 'human') {
    return {
      width: clamp(proposedWidth * rng.float(0.72, 1.4), 12, 128),
      depth: clamp(proposedDepth * rng.float(0.72, 1.4), 12, 128),
      height: clamp(proposedHeight * rng.float(0.82, 1.45), 2.5, 22),
    };
  }

  const aspect = Math.sqrt(clamp(proposedWidth / Math.max(1, proposedDepth), 0.45, 2.2));
  const span =
    profile === 'grand'
      ? rng.float(44, 142)
      : profile === 'monumental'
        ? rng.float(128, 246)
        : rng.float(252, 348);
  const minimumSide = profile === 'grand' ? 34 : profile === 'monumental' ? 105 : 220;
  const width = clamp(span * aspect * rng.float(0.88, 1.12), minimumSide, ROOM.maxSize);
  const depth = clamp(span / aspect * rng.float(0.88, 1.12), minimumSide, ROOM.maxSize);
  const height =
    profile === 'grand'
      ? clamp(proposedHeight * rng.float(2.3, 5.2), 8, 40)
      : profile === 'monumental'
        ? rng.float(28, 82)
        : rng.float(65, ROOM.maxHeight);
  return { width, depth, height };
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
    architecture: spec.architecture ?? 'chamber',
    sizeClass: sizeClassForDimensions(spec.width, spec.depth),
    scaleProfile: spec.scaleProfile ?? 'human',
    condition: spec.condition,
    mood: spec.mood,
    shader: spec.visuals?.shader ?? 'none',
    lighting: spec.visuals?.lighting ?? 'fluorescent',
    wireframe: spec.visuals?.wireframe ?? false,
    primarySet: spec.composition?.primarySet,
    contrastSet: spec.composition?.contrastSet,
    assetIds: [
      ...spec.props.map((prop) => prop.assetId).filter((id): id is string => Boolean(id)),
      ...spec.entities.map((entity) => entity.assetId).filter((id): id is string => Boolean(id)),
    ],
  };
}
