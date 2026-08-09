import type { EntityBehavior, MoodAxis } from '../types';
import type { DirectedPlacement } from './assetCatalog';
import { ASSETS, getAsset } from './assetCatalog';
import { SeededRng } from '../core/rng';
import type { RoomEnvironment, RoomLayoutStyle } from '../types';
import {
  compositionSetIds,
  planSceneComposition,
  sceneSetIdsForTags,
  setAffinity,
  type PlannedSceneComposition,
} from './sceneSets';

/**
 * Layout packs = small local furniture arrangements (relative coords).
 * Rooms stamp many packs; pack catalog is generated combinatorially so the
 * space is huge without hand-authoring thousands of lines.
 */
export type PackRole =
  | 'seating'
  | 'desk_work'
  | 'waiting'
  | 'storage'
  | 'vending'
  | 'utility'
  | 'decor'
  | 'nursery'
  | 'anomaly'
  | 'npc_beat'
  | 'portal_frame'
  | 'pillar_row'
  | 'media'
  | 'plant_cluster'
  | 'sleep';

export interface PackSlot {
  /** Asset id, or category:/tag: selector resolved at stamp time. */
  pick: string;
  x: number;
  z: number;
  rotY?: number;
  scaleMul?: number;
  /** Chance this slot is omitted (0-1). */
  omitChance?: number;
  /** Optional scale jitter range applied after scaleMul. */
  scaleJitter?: [number, number];
  behavior?: EntityBehavior;
  linksOnTouch?: boolean;
}

export interface LayoutPack {
  id: string;
  role: PackRole;
  /** Soft affinity tags (theme/mood/space). */
  tags: string[];
  /** Cached semantic sets derived from tags when the pack library is built. */
  setIds?: string[];
  moods: MoodAxis[];
  /** How much floor this pack wants (approx radius). */
  radius: number;
  /** Prefer wall edge vs open floor. */
  prefer: 'wall' | 'open' | 'corner' | 'center' | 'any';
  weight: number;
  /** If true, pack is a good "clash" inject (wrong for theme). */
  clashy?: boolean;
  slots: PackSlot[];
}

export interface PackStampContext {
  width: number;
  depth: number;
  themeTags: string[];
  mood: MoodAxis;
  preferAssets?: string[];
  giant?: boolean;
  /** How many packs to aim for (clamped by space). */
  targetPacks?: number;
  layoutStyle?: RoomLayoutStyle;
  /** Recent catalog ids to strongly deprioritize. */
  avoidAssets?: string[];
  environment?: RoomEnvironment;
  /** Macro uniform scale for every catalog object in this room. */
  worldScale?: number;
  /** Recent scene sets to lightly deprioritize across linked rooms. */
  avoidSceneSets?: string[];
}

export interface PackStampResult {
  placements: DirectedPlacement[];
  composition: PlannedSceneComposition;
}

const PORTALS = new Set(['door_fake', 'door_service', 'door_glass', 'arch_portal']);

/** Build a large combinatorial pack library once. */
let CACHED: LayoutPack[] | null = null;

const ASSETS_BY_TAG = indexAssets((asset) => asset.tags);
const ASSETS_BY_CATEGORY = indexAssets((asset) => [asset.category]);
const ASSETS_BY_SET = indexAssets((asset) => asset.setIds);
const DIRECT_ALTERNATIVES = new Map<string, typeof ASSETS>();

export function allLayoutPacks(): LayoutPack[] {
  if (CACHED) return CACHED;
  CACHED = buildPackLibrary();
  for (const pack of CACHED) pack.setIds = sceneSetIdsForTags(pack.tags);
  return CACHED;
}

export function stampRoomPacks(
  rng: SeededRng,
  ctx: PackStampContext,
): PackStampResult {
  const packs = allLayoutPacks();
  const area = ctx.width * ctx.depth;
  const densityMultiplier = ctx.layoutStyle === 'sparse' ? 0.62 : 1;
  const target = clamp(
    Math.round((ctx.targetPacks ?? Math.round(8 + area / 28)) * densityMultiplier),
    4,
    52,
  );
  const preferredSetIds = (ctx.preferAssets ?? []).flatMap(
    (assetId) => getAsset(assetId)?.setIds ?? [],
  );
  const composition = planSceneComposition(rng, {
    themeTags: ctx.themeTags,
    preferredSetIds,
    avoidSetIds: ctx.avoidSceneSets,
    mood: ctx.mood,
    targetPacks: target,
  });

  const placements: DirectedPlacement[] = [];
  const occupied: Array<{ x: number; z: number; r: number }> = [];

  // Always place doors first as portal packs along walls.
  placeDoors(rng, placements, occupied, ctx);

  // Score packs: theme match + mood + occasional clash.
  const scored = packs
    .map((pack) => {
      const affinity = setAffinity(pack.setIds, composition);
      return { pack, affinity, score: scorePack(rng, pack, ctx, affinity) };
    })
    .filter((s) => s.score > 0.05)
    .sort((a, b) => b.score - a.score);

  // Coherent packs dominate. One curated contrast set receives a small fixed
  // quota so juxtaposition becomes a readable motif instead of visual soup.
  const pool = weightedShuffle(
    rng,
    scored
      .filter(
        (candidate) =>
          candidate.affinity === 'primary' || candidate.affinity === 'supporting',
      )
      .slice(0, Math.min(scored.length, 400)),
  );
  const contrastPool = weightedShuffle(
    rng,
    scored
      .filter((candidate) => candidate.affinity === 'contrast')
      .slice(0, 140),
  );

  let placed = 0;
  let contrastPlaced = 0;
  let attempts = 0;
  const maxAttempts = target * 14;

  while (
    placed < target &&
    attempts < maxAttempts &&
    (pool.length ||
      (contrastPlaced < composition.contrastBudget && contrastPool.length > 0))
  ) {
    attempts += 1;
    const contrastRemaining = composition.contrastBudget - contrastPlaced;
    const roomsRemaining = target - placed;
    const contrastDueAt = Math.floor(
      ((contrastPlaced + 1) * target) / (composition.contrastBudget + 1),
    );
    const useContrast =
      contrastRemaining > 0 &&
      contrastPool.length > 0 &&
      (placed >= contrastDueAt || roomsRemaining <= contrastRemaining || rng.chance(0.1));
    const activePool = useContrast ? contrastPool : pool;
    if (!activePool.length) break;
    const idx = Math.min(
      activePool.length - 1,
      Math.floor(rng.float(0, 1) ** 1.7 * activePool.length),
    );
    const { pack, affinity } = activePool[idx]!;
    // Soft remove to reduce repeats
    if (rng.chance(0.55)) activePool.splice(idx, 1);

    const anchor = findAnchor(rng, pack, ctx, occupied);
    if (!anchor) continue;

    const lane = affinity === 'contrast' ? 'contrast' : 'coherent';
    const stamped = stampPack(rng, pack, anchor, ctx, composition, lane);
    if (!stamped.length) continue;

    for (const s of stamped) placements.push(s);
    occupied.push({
      x: anchor.x,
      z: anchor.z,
      r: pack.radius * anchor.uniformScale * (ctx.worldScale ?? 1),
    });
    placed += 1;
    if (lane === 'contrast') contrastPlaced += 1;
  }

  // Fill leftover with a few lone scatter props for liminal mess.
  scatterFill(
    rng,
    placements,
    occupied,
    ctx,
    composition,
    Math.min(14, Math.max(4, 54 - placements.length)),
  );

  // Preserve portal semantics for rendering and beacon styling.
  for (const p of placements) {
    const a = getAsset(p.assetId);
    p.linksOnTouch = Boolean(a && (a.category === 'portal' || PORTALS.has(p.assetId)));
  }

  return { placements, composition };
}

function buildPackLibrary(): LayoutPack[] {
  const out: LayoutPack[] = [];
  let n = 0;
  const id = (role: string) => `pack_${role}_${(n++).toString(36)}`;

  const familyVariants = (families: string[], perFamily = 1): string[] =>
    families.flatMap((family) =>
      ASSETS.filter((asset) => asset.family === family)
        .slice(0, perFamily)
        .map((asset) => asset.id),
    );

  const seating = [
    'chair_office',
    'chair_plastic',
    'bench_wait',
    'bench_pew',
    ...familyVariants(['dining_chair', 'office_chair', 'armchair', 'sofa', 'sectional'], 2),
  ];
  const desks = [
    'desk_security',
    'desk_intake',
    'table_food',
    ...familyVariants(['school_desk', 'coffee_table', 'reception_desk'], 2),
  ];
  const storage = [
    'cabinet_file',
    'cabinet_util',
    'shelf_toy',
    ...familyVariants(['filing_cabinet', 'wardrobe', 'locker', 'bookcase', 'server_rack'], 1),
  ];
  const utility = [
    'cart_janitor',
    'cooler_water',
    'sign_wet',
    'payphone_wall',
    ...familyVariants(['washer', 'phone_booth', 'pallet_stack', 'aquarium_tank'], 1),
  ];
  const nursery = ['crib_empty', 'bottle_giant', 'shelf_toy'];
  const npcs = [
    'npc_clerk',
    'npc_guide',
    'npc_raincoat',
    'npc_mannequin',
    'npc_shadow',
    ...familyVariants([
      'npc_teacher',
      'npc_cook',
      'npc_swimmer',
      'npc_groundskeeper',
      'npc_receptionist',
      'npc_courier',
      'npc_usher',
      'npc_tourist',
      'npc_mechanic',
      'npc_lifeguard',
    ]),
  ];
  const creatures = ['creature_deer', 'creature_balloon'];
  const anomalies = ['anomaly_giant_baby', 'bottle_giant', 'npc_shadow'];

  // --- Seating clusters (many variants) ---
  for (const chair of seating) {
    for (const ox of [0.55, 0.7, 0.9]) {
      for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        out.push({
          id: id('seat'),
          role: 'seating',
          tags: tagsForAssets([chair]),
          moods: moodsForAssets([chair]),
          radius: 1.2 + ox,
          prefer: 'any',
          weight: 1.1,
          slots: [
            { pick: chair, x: -ox, z: 0, rotY: facing },
            { pick: chair, x: ox, z: 0, rotY: facing + Math.PI, omitChance: 0.15 },
            { pick: 'tag:decor', x: 0, z: ox * 0.6, scaleMul: 0.9, omitChance: 0.55 },
          ],
        });
      }
    }
  }

  // Desk + chair combos
  for (const desk of desks) {
    for (const chair of seating) {
      for (const side of [-1, 1] as const) {
        out.push({
          id: id('desk'),
          role: 'desk_work',
          tags: tagsForAssets([desk, chair]),
          moods: moodsForAssets([desk, chair]),
          radius: 2.2,
          prefer: 'wall',
          weight: 1.2,
          slots: [
            { pick: desk, x: 0, z: 0, rotY: 0 },
            { pick: chair, x: side * 0.15, z: 0.85, rotY: Math.PI },
            { pick: 'lamp_floor', x: -side * 1.1, z: 0.2, omitChance: 0.4 },
            { pick: 'category:decor', x: side * 1.0, z: -0.4, omitChance: 0.5 },
          ],
        });
      }
    }
  }

  // Waiting row: bench + sign + plant
  for (const bench of ['bench_wait', 'bench_pew']) {
    for (const gap of [1.2, 1.6, 2.0]) {
      out.push({
        id: id('wait'),
        role: 'waiting',
        tags: tagsForAssets([bench, 'sign_wet', 'plant_fern']),
        moods: ['static', 'downer', 'upper'],
        radius: 2.4,
        prefer: 'wall',
        weight: 1,
        slots: [
          { pick: bench, x: -gap * 0.5, z: 0, rotY: 0 },
          { pick: bench, x: gap * 0.5, z: 0, rotY: 0, omitChance: 0.25 },
          { pick: 'sign_wet', x: 0, z: 0.7, omitChance: 0.35 },
          { pick: 'plant_fern', x: gap, z: 0.3, scaleJitter: [0.8, 1.4], omitChance: 0.3 },
        ],
      });
    }
  }

  // Storage stacks
  for (const a of storage) {
    for (const b of storage) {
      out.push({
        id: id('store'),
        role: 'storage',
        tags: tagsForAssets([a, b]),
        moods: moodsForAssets([a, b]),
        radius: 1.8,
        prefer: 'wall',
        weight: 0.95,
        slots: [
          { pick: a, x: -0.65, z: 0 },
          { pick: b, x: 0.65, z: 0, rotY: Math.PI / 2, omitChance: 0.2 },
          { pick: 'cooler_water', x: 0, z: 0.9, omitChance: 0.6 },
        ],
      });
    }
  }

  // Vending corners
  for (const v of ['vending_blue']) {
    out.push({
      id: id('vend'),
      role: 'vending',
      tags: tagsForAssets([v, 'plant_fern', 'sign_wet']),
      moods: ['static', 'dynamic', 'downer'],
      radius: 1.6,
      prefer: 'corner',
      weight: 1,
      slots: [
        { pick: v, x: 0, z: 0 },
        { pick: 'plant_fern', x: 0.9, z: 0.5, omitChance: 0.4 },
        { pick: 'sign_wet', x: -0.7, z: 0.6, omitChance: 0.5 },
      ],
    });
  }

  // Utility clutter
  for (const u of utility) {
    out.push({
      id: id('util'),
      role: 'utility',
      tags: tagsForAssets([u, 'cart_janitor']),
      moods: ['static', 'downer', 'dynamic'],
      radius: 1.4,
      prefer: 'wall',
      weight: 0.9,
      slots: [
        { pick: u, x: 0, z: 0 },
        { pick: 'cart_janitor', x: 0.9, z: 0.2, omitChance: 0.45 },
        { pick: 'sign_wet', x: -0.6, z: 0.5, omitChance: 0.4 },
      ],
    });
  }

  // New high-detail scene beats keep the expanded objects in readable arrangements.
  const authoredBeats: Array<Omit<LayoutPack, 'id'>> = [
    {
      role: 'sleep',
      tags: ['motel', 'home', 'lobby'],
      moods: ['upper', 'downer', 'static'],
      radius: 2.8,
      prefer: 'wall',
      weight: 1.15,
      slots: [
        { pick: 'hotel_bed_01', x: 0, z: 0 },
        { pick: 'nightstand_02', x: 1.45, z: -0.35 },
        { pick: 'wardrobe_03', x: -1.55, z: -0.3, rotY: Math.PI / 2, omitChance: 0.3 },
      ],
    },
    {
      role: 'waiting',
      tags: ['station', 'highway', 'outdoor', 'terminal'],
      moods: ['static', 'downer', 'upper'],
      radius: 3.2,
      prefer: 'open',
      weight: 1.05,
      slots: [
        { pick: 'bus_shelter_01', x: 0, z: 0 },
        { pick: 'streetlight_02', x: 2.15, z: 0.2, omitChance: 0.35 },
        { pick: 'npc_commuter_03', x: 0.4, z: 0.5, behavior: 'idle', omitChance: 0.25 },
      ],
    },
    {
      role: 'seating',
      tags: ['pool', 'outdoor', 'motel'],
      moods: ['upper', 'static', 'dynamic'],
      radius: 3.0,
      prefer: 'open',
      weight: 1.05,
      slots: [
        { pick: 'pool_lounger_01', x: -1.0, z: 0, rotY: Math.PI / 2 },
        { pick: 'pool_lounger_03', x: 1.0, z: 0, rotY: Math.PI / 2, omitChance: 0.25 },
        { pick: 'lifeguard_chair_02', x: 0, z: -1.35, omitChance: 0.4 },
      ],
    },
    {
      role: 'storage',
      tags: ['server', 'tech', 'industrial'],
      moods: ['static', 'dynamic', 'downer'],
      radius: 2.4,
      prefer: 'wall',
      weight: 1.2,
      slots: [
        { pick: 'server_rack_01', x: -0.95, z: 0 },
        { pick: 'server_rack_04', x: 0, z: 0 },
        { pick: 'server_rack_07', x: 0.95, z: 0, omitChance: 0.2 },
        { pick: 'npc_hazmat_03', x: 0.25, z: 1.2, behavior: 'wander', omitChance: 0.45 },
      ],
    },
    {
      role: 'decor',
      tags: ['playground', 'park', 'outdoor', 'fog'],
      moods: ['downer', 'upper', 'static'],
      radius: 3.0,
      prefer: 'open',
      weight: 1.0,
      slots: [
        { pick: 'swing_set_01', x: 0, z: 0 },
        { pick: 'bench_wait', x: 0, z: 1.8, rotY: Math.PI },
        { pick: 'npc_groundskeeper_02', x: -1.5, z: 1.1, behavior: 'wander', omitChance: 0.45 },
      ],
    },
    {
      role: 'desk_work',
      tags: ['lobby', 'clinic', 'motel', 'office'],
      moods: ['upper', 'downer', 'static'],
      radius: 2.5,
      prefer: 'wall',
      weight: 1.25,
      slots: [
        { pick: 'reception_desk_01', x: 0, z: 0 },
        { pick: 'office_chair_02', x: 0, z: -0.9 },
        { pick: 'npc_receptionist_03', x: 0.3, z: -0.6, behavior: 'stare', omitChance: 0.35 },
      ],
    },
    {
      role: 'utility',
      tags: ['laundry', 'service', 'motel'],
      moods: ['static', 'downer', 'dynamic'],
      radius: 2.4,
      prefer: 'wall',
      weight: 1.05,
      slots: [
        { pick: 'washer_01', x: -0.95, z: 0 },
        { pick: 'washer_04', x: 0, z: 0 },
        { pick: 'washer_07', x: 0.95, z: 0, omitChance: 0.2 },
        { pick: 'dining_chair_05', x: 0, z: 1.2, rotY: Math.PI, omitChance: 0.4 },
      ],
    },
    {
      role: 'decor',
      tags: ['aquarium', 'museum', 'wet', 'lobby'],
      moods: ['upper', 'static', 'dynamic'],
      radius: 2.6,
      prefer: 'wall',
      weight: 1.15,
      slots: [
        { pick: 'aquarium_tank_01', x: 0, z: 0 },
        { pick: 'bench_wait', x: 0, z: 1.35, rotY: Math.PI },
        { pick: 'npc_tourist_02', x: 1.15, z: 0.9, behavior: 'idle', omitChance: 0.45 },
      ],
    },
    {
      role: 'utility',
      tags: ['warehouse', 'industrial', 'service', 'parking'],
      moods: ['downer', 'static', 'dynamic'],
      radius: 2.8,
      prefer: 'corner',
      weight: 1.1,
      slots: [
        { pick: 'pallet_stack_01', x: -0.8, z: 0 },
        { pick: 'pallet_stack_05', x: 0.8, z: 0.2, rotY: Math.PI / 2, omitChance: 0.25 },
        { pick: 'barrier_03', x: 0, z: 1.35, omitChance: 0.35 },
        { pick: 'npc_mechanic_02', x: -0.2, z: 1.0, behavior: 'wander', omitChance: 0.45 },
      ],
    },
  ];
  for (const beat of authoredBeats) out.push({ id: id('authored'), ...beat });

  // Plant clusters
  for (const s of [0.7, 1.0, 1.3]) {
    out.push({
      id: id('plant'),
      role: 'plant_cluster',
      tags: ['lobby', 'office', 'courtyard', 'greenhouse'],
      moods: ['upper', 'static'],
      radius: 1.2 + s,
      prefer: 'open',
      weight: 0.85,
      slots: [
        { pick: 'plant_fern', x: 0, z: 0, scaleJitter: [0.8, 1.6] },
        { pick: 'plant_fern', x: s, z: s * 0.4, scaleJitter: [0.6, 1.3], omitChance: 0.2 },
        { pick: 'planter_01', x: -s * 0.6, z: s * 0.5, scaleJitter: [0.7, 1.35], omitChance: 0.35 },
        { pick: 'lamp_floor', x: s * 0.2, z: -s * 0.5, omitChance: 0.5 },
      ],
    });
  }

  // Media nook
  for (const chair of seating) {
    out.push({
      id: id('media'),
      role: 'media',
      tags: tagsForAssets(['tv_muted', chair]),
      moods: ['downer', 'static'],
      radius: 2.0,
      prefer: 'wall',
      weight: 0.8,
      slots: [
        { pick: 'tv_muted', x: 0, z: -0.4 },
        { pick: chair, x: 0, z: 1.0, rotY: Math.PI },
        { pick: chair, x: 0.9, z: 0.9, rotY: Math.PI * 0.9, omitChance: 0.4 },
        { pick: 'lamp_floor', x: -1.0, z: 0.3, omitChance: 0.35 },
      ],
    });
  }

  // Nursery beats
  for (const n0 of nursery) {
    out.push({
      id: id('nurs'),
      role: 'nursery',
      tags: tagsForAssets([n0, 'mirror_tall']),
      moods: ['downer', 'dynamic'],
      radius: 2.1,
      prefer: 'any',
      weight: 0.75,
      clashy: true,
      slots: [
        { pick: n0, x: 0, z: 0 },
        { pick: 'mirror_tall', x: 1.3, z: -0.2, rotY: -Math.PI / 2, omitChance: 0.3 },
        { pick: 'lamp_floor', x: -1.1, z: 0.4, omitChance: 0.35 },
        { pick: 'chair_plastic', x: 0.4, z: 1.2, omitChance: 0.4 },
      ],
    });
  }

  // Anomaly centerpiece packs
  out.push({
    id: id('anom'),
    role: 'anomaly',
    tags: ['uncanny', 'nursery', 'horror-lite', 'liminal'],
    moods: ['downer', 'dynamic'],
    radius: 2.8,
    prefer: 'center',
    weight: 0.45,
    clashy: true,
    slots: [
      { pick: 'anomaly_giant_baby', x: 0, z: 0, scaleMul: 2.8, scaleJitter: [2.2, 3.6] },
      { pick: 'bottle_giant', x: 1.6, z: -1.0, scaleJitter: [1.0, 1.8], omitChance: 0.25 },
      { pick: 'crib_empty', x: -1.5, z: 1.1, omitChance: 0.3 },
    ],
  });
  for (const a of anomalies) {
    out.push({
      id: id('anom2'),
      role: 'anomaly',
      tags: tagsForAssets([a]),
      moods: moodsForAssets([a]),
      radius: 1.8,
      prefer: 'open',
      weight: 0.5,
      clashy: true,
      slots: [
        { pick: a, x: 0, z: 0, scaleJitter: a === 'anomaly_giant_baby' ? [2.0, 3.5] : [1.0, 1.8] },
        { pick: 'tag:decor', x: 1.0, z: 0.6, omitChance: 0.4 },
      ],
    });
  }

  // NPC beats
  for (const npc of npcs) {
    for (const prop of [...desks, ...seating, 'vending_blue', 'payphone_wall']) {
      out.push({
        id: id('npc'),
        role: 'npc_beat',
        tags: tagsForAssets([npc, prop]),
        moods: moodsForAssets([npc]),
        radius: 1.7,
        prefer: 'any',
        weight: 0.7,
        slots: [
          { pick: prop, x: 0, z: 0 },
          { pick: npc, x: 0.2, z: 1.0, behavior: getAsset(npc)?.defaultBehavior },
        ],
      });
    }
  }

  // Creature wander pairs
  for (const c of creatures) {
    out.push({
      id: id('crea'),
      role: 'npc_beat',
      tags: tagsForAssets([c, 'plant_fern']),
      moods: moodsForAssets([c]),
      radius: 1.9,
      prefer: 'open',
      weight: 0.55,
      clashy: true,
      slots: [
        { pick: c, x: 0, z: 0 },
        { pick: 'plant_fern', x: 1.1, z: -0.4, omitChance: 0.3 },
        { pick: 'lamp_floor', x: -0.9, z: 0.5, omitChance: 0.5 },
      ],
    });
  }

  // Pillar rows
  for (const spacing of [2.2, 2.8, 3.4]) {
    out.push({
      id: id('pil'),
      role: 'pillar_row',
      tags: ['backrooms', 'parking', 'courtyard', 'gym'],
      moods: ['static', 'downer', 'upper'],
      radius: spacing + 0.8,
      prefer: 'open',
      weight: 0.8,
      slots: [
        { pick: 'pillar_support', x: -spacing * 0.5, z: 0, scaleJitter: [0.85, 1.25] },
        { pick: 'pillar_support', x: spacing * 0.5, z: 0, scaleJitter: [0.85, 1.25] },
        { pick: 'pillar_support', x: 0, z: spacing * 0.45, omitChance: 0.45, scaleJitter: [0.8, 1.2] },
      ],
    });
  }

  // Sleep / mattress mess
  out.push({
    id: id('sleep'),
    role: 'sleep',
    tags: ['abandoned', 'backrooms', 'motel'],
    moods: ['downer', 'static'],
    radius: 2.0,
    prefer: 'corner',
    weight: 0.6,
    clashy: true,
    slots: [
      { pick: 'mattress_stack', x: 0, z: 0, rotY: 0.3 },
      { pick: 'lamp_floor', x: 1.0, z: 0.6, omitChance: 0.35 },
      { pick: 'chair_plastic', x: -0.9, z: 0.8, omitChance: 0.4 },
    ],
  });

  // Decor duos with many rotations = more unique packs
  const decorPairs: Array<[string, string]> = [
    ['mirror_tall', 'lamp_floor'],
    ['plant_fern', 'lamp_floor'],
    ['sign_wet', 'cooler_water'],
    ['payphone_wall', 'sign_wet'],
    ['mirror_tall', 'plant_fern'],
  ];
  for (const [a, b] of decorPairs) {
    for (const d of [0.8, 1.1, 1.4]) {
      out.push({
        id: id('decor'),
        role: 'decor',
        tags: tagsForAssets([a, b]),
        moods: moodsForAssets([a, b]),
        radius: 1.0 + d,
        prefer: 'wall',
        weight: 0.9,
        slots: [
          { pick: a, x: 0, z: 0 },
          { pick: b, x: d, z: 0.15, omitChance: 0.15 },
        ],
      });
    }
  }

  // Lone single-prop packs (important for density + entropy)
  for (const asset of ASSETS) {
    if (asset.category === 'portal') continue;
    out.push({
      id: id('lone'),
      role: roleForCategory(asset.category),
      tags: [...asset.tags],
      moods: [...asset.moods],
      radius: Math.max(asset.defaultScale.x, asset.defaultScale.z) * 0.9 + 0.5,
      prefer: asset.category === 'npc' || asset.category === 'creature' ? 'open' : 'any',
      weight: 0.35 * (asset.weight ?? 1),
      clashy: asset.category === 'anomaly' || asset.category === 'creature',
      slots: [
        {
          pick: asset.id,
          x: 0,
          z: 0,
          scaleJitter:
            asset.id === 'anomaly_giant_baby' ? [2.0, 3.6] : [0.85, 1.25],
        },
      ],
    });
  }

  return out;
}

function scorePack(
  rng: SeededRng,
  pack: LayoutPack,
  ctx: PackStampContext,
  affinity: ReturnType<typeof setAffinity>,
): number {
  let s = pack.weight;

  const themeHits = pack.tags.filter((t) => ctx.themeTags.includes(t)).length;
  s += themeHits * 0.55;

  if (pack.moods.includes(ctx.mood)) s += 0.45;
  else s *= 0.55;

  if (affinity === 'primary') s += 1.3;
  else if (affinity === 'supporting') s += 0.82;
  else if (affinity === 'contrast') s += 0.92;
  else s *= 0.08;

  // Anomalies stay possible, but only when they belong to one of this room's
  // selected semantic sets (including its one deliberate contrast set).
  if (pack.clashy && affinity !== 'unrelated') s += 0.28;

  if (ctx.giant && pack.role === 'anomaly') s += 1.4;
  if (ctx.preferAssets?.length) {
    const picks = pack.slots.map((sl) => sl.pick);
    if (picks.some((p) => ctx.preferAssets!.includes(p))) s += 0.8;
  }
  if (ctx.avoidAssets?.length) {
    const avoided = new Set(ctx.avoidAssets);
    const repeated = pack.slots.filter(
      (slot) => !slot.pick.includes(':') && avoided.has(slot.pick),
    ).length;
    s *= Math.max(0.18, 1 - repeated * 0.28);
  }

  // Light noise so order isn't stable
  s *= rng.float(0.85, 1.15);
  return s;
}

function stampPack(
  rng: SeededRng,
  pack: LayoutPack,
  anchor: { x: number; z: number; rot: number; uniformScale: number },
  ctx: PackStampContext,
  composition: PlannedSceneComposition,
  lane: 'coherent' | 'contrast',
): DirectedPlacement[] {
  const out: DirectedPlacement[] = [];
  const cos = Math.cos(anchor.rot);
  const sin = Math.sin(anchor.rot);
  const avoided = new Set(ctx.avoidAssets ?? []);
  const laneSetIds = new Set(compositionSetIds(composition, lane));

  for (const slot of pack.slots) {
    if (slot.omitChance && rng.chance(slot.omitChance)) continue;
    const assetId = resolvePick(rng, slot.pick, avoided, laneSetIds);
    if (!assetId) continue;
    const asset = getAsset(assetId);
    if (!asset) continue;

    let scaleMul = (slot.scaleMul ?? 1) * anchor.uniformScale;
    if (slot.scaleJitter) {
      scaleMul *= rng.float(slot.scaleJitter[0], slot.scaleJitter[1]);
    }
    if (ctx.giant && asset.id === 'anomaly_giant_baby') {
      scaleMul = Math.max(scaleMul, rng.float(2.4, 3.7));
    }
    scaleMul = clamp(scaleMul, asset.scaleRange.min, asset.scaleRange.max);

    const worldScale = ctx.worldScale ?? 1;
    const lx = slot.x * anchor.uniformScale * worldScale;
    const lz = slot.z * anchor.uniformScale * worldScale;
    const x = anchor.x + lx * cos - lz * sin;
    const z = anchor.z + lx * sin + lz * cos;
    const rotY = (slot.rotY ?? 0) + anchor.rot + rng.float(-0.08, 0.08);

    if (overlapsSpawnIsland(x, z, rotY, asset.defaultScale, scaleMul * worldScale)) continue;

    out.push({
      assetId,
      x,
      z,
      rotY,
      scaleMul,
      linksOnTouch: false,
      solid:
        asset.solidDefault !== false &&
        asset.category !== 'npc' &&
        asset.category !== 'creature' &&
        asset.category !== 'anomaly',
      behavior: slot.behavior ?? asset.defaultBehavior,
    });
  }
  return out;
}

function findAnchor(
  rng: SeededRng,
  pack: LayoutPack,
  ctx: PackStampContext,
  occupied: Array<{ x: number; z: number; r: number }>,
): { x: number; z: number; rot: number; uniformScale: number } | null {
  const uniformScale = rng.float(0.82, 1.22);
  const r = pack.radius * uniformScale * (ctx.worldScale ?? 1);
  const margin = r + 0.9;
  const hw = ctx.width / 2 - margin;
  const hd = ctx.depth / 2 - margin;
  if (hw < 0.5 || hd < 0.5) return null;

  for (let tryN = 0; tryN < 18; tryN += 1) {
    let x = 0;
    let z = 0;
    let rot = rng.float(0, Math.PI * 2);

    const prefer =
      ctx.layoutStyle === 'perimeter' && (pack.prefer === 'any' || pack.prefer === 'open')
        ? 'wall'
        : pack.prefer;
    if (prefer === 'wall') {
      const side = rng.int(0, 3);
      const u = rng.float(-0.9, 0.9);
      if (side === 0) {
        x = -hw;
        z = hd * u;
        rot = Math.PI / 2;
      } else if (side === 1) {
        x = hw;
        z = hd * u;
        rot = -Math.PI / 2;
      } else if (side === 2) {
        z = -hd;
        x = hw * u;
        rot = 0;
      } else {
        z = hd;
        x = hw * u;
        rot = Math.PI;
      }
    } else if (prefer === 'corner') {
      x = (rng.chance(0.5) ? -1 : 1) * hw * rng.float(0.7, 1);
      z = (rng.chance(0.5) ? -1 : 1) * hd * rng.float(0.7, 1);
    } else if (prefer === 'center') {
      x = rng.float(-hw * 0.35, hw * 0.35);
      z = rng.float(-hd * 0.35, hd * 0.35);
    } else if (ctx.layoutStyle === 'axial') {
      if (rng.chance(0.5)) {
        x = rng.float(-hw, hw);
        z = rng.float(-Math.min(1.2, hd * 0.2), Math.min(1.2, hd * 0.2));
        rot = rng.chance(0.5) ? 0 : Math.PI;
      } else {
        x = rng.float(-Math.min(1.2, hw * 0.2), Math.min(1.2, hw * 0.2));
        z = rng.float(-hd, hd);
        rot = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
      }
    } else {
      x = rng.float(-hw, hw);
      z = rng.float(-hd, hd);
    }

    if (Math.hypot(x, z) < 1.7 + r * 0.25) continue;

    let ok = true;
    for (const o of occupied) {
      const minDist = o.r + r * 0.72;
      if (Math.hypot(x - o.x, z - o.z) < minDist) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    return { x, z, rot, uniformScale };
  }
  return null;
}

function placeDoors(
  rng: SeededRng,
  placements: DirectedPlacement[],
  occupied: Array<{ x: number; z: number; r: number }>,
  ctx: PackStampContext,
): void {
  const area = ctx.width * ctx.depth;
  const count = area > 55_000 ? 5 : area > 18_000 ? 4 : area > 240 ? 3 : area > 130 ? 2 : 1;
  const sides: Array<'n' | 's' | 'e' | 'w'> = ['n', 's', 'e', 'w'];
  for (let i = sides.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const t = sides[i]!;
    sides[i] = sides[j]!;
    sides[j] = t;
  }
  const doorIds =
    ctx.environment === 'outdoor'
      ? ['arch_portal', 'door_glass', 'arch_portal', 'door_fake']
      : ['door_fake', 'door_service', 'door_glass', 'arch_portal'];
  for (let i = 0; i < count; i += 1) {
    const side = sides[i % sides.length]!;
    const doorId = doorIds[i % doorIds.length]!;
    const doorScale = doorId === 'arch_portal' ? rng.float(1.0, 1.4) : 1;
    const worldScale = ctx.worldScale ?? 1;
    const door = getAsset(doorId) ?? getAsset('door_fake');
    const edgeInset = Math.max(
      0.4,
      (door?.defaultScale.z ?? 0.2) * doorScale * worldScale * 0.52,
    );
    const along = rng.float(-0.4, 0.4);
    let x = 0;
    let z = 0;
    let rotY = 0;
    if (side === 'w') {
      x = -ctx.width / 2 + edgeInset;
      z = ctx.depth * along * 0.5;
      rotY = Math.PI / 2;
    } else if (side === 'e') {
      x = ctx.width / 2 - edgeInset;
      z = ctx.depth * along * 0.5;
      rotY = -Math.PI / 2;
    } else if (side === 'n') {
      z = -ctx.depth / 2 + edgeInset;
      x = ctx.width * along * 0.5;
      rotY = 0;
    } else {
      z = ctx.depth / 2 - edgeInset;
      x = ctx.width * along * 0.5;
      rotY = Math.PI;
    }
    placements.push({
      assetId: getAsset(doorId) ? doorId : 'door_fake',
      x,
      z,
      rotY,
      scaleMul: doorScale,
      linksOnTouch: true,
      solid: true,
    });
    occupied.push({ x, z, r: 1.2 * doorScale * worldScale });
  }
}

function scatterFill(
  rng: SeededRng,
  placements: DirectedPlacement[],
  occupied: Array<{ x: number; z: number; r: number }>,
  ctx: PackStampContext,
  composition: PlannedSceneComposition,
  count: number,
): void {
  const avoided = new Set(ctx.avoidAssets ?? []);
  const coherentSetIds = compositionSetIds(composition);
  const alignedCandidates = assetsForSets(coherentSetIds).filter(
    (asset) => asset.category !== 'portal',
  );
  const freshCandidates = alignedCandidates.filter((asset) => !avoided.has(asset.id));
  const candidates = freshCandidates.length
    ? freshCandidates
    : alignedCandidates;
  if (!candidates.length) return;
  const worldScale = ctx.worldScale ?? 1;
  const hw = ctx.width / 2 - 1.4 * worldScale;
  const hd = ctx.depth / 2 - 1.4 * worldScale;
  if (hw <= 0.5 || hd <= 0.5) return;
  for (let i = 0; i < count; i += 1) {
    const asset = rng.pick(candidates);
    const x = rng.float(-hw, hw);
    const z = rng.float(-hd, hd);
    let blocked = false;
    for (const o of occupied) {
      if (Math.hypot(x - o.x, z - o.z) < o.r + 0.7 * worldScale) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    let scaleMul = rng.float(0.85, 1.25);
    if (asset.id === 'anomaly_giant_baby' && (ctx.giant || rng.chance(0.08))) {
      scaleMul = rng.float(2.3, 3.5);
    }
    scaleMul = clamp(scaleMul, asset.scaleRange.min, asset.scaleRange.max);
    const rotY = rng.float(0, Math.PI * 2);
    if (overlapsSpawnIsland(x, z, rotY, asset.defaultScale, scaleMul * worldScale)) continue;
    placements.push({
      assetId: asset.id,
      x,
      z,
      rotY,
      scaleMul,
      linksOnTouch: false,
      solid:
        asset.solidDefault !== false &&
        asset.category !== 'npc' &&
        asset.category !== 'creature' &&
        asset.category !== 'anomaly',
      behavior: asset.defaultBehavior,
    });
    occupied.push({
      x,
      z,
      r: Math.max(asset.defaultScale.x, asset.defaultScale.z) * scaleMul * worldScale * 0.65,
    });
  }
}

function resolvePick(
  rng: SeededRng,
  pick: string,
  avoided: ReadonlySet<string>,
  laneSetIds: ReadonlySet<string>,
): string | null {
  const aligned = (asset: (typeof ASSETS)[number]): boolean =>
    asset.setIds.some((setId) => laneSetIds.has(setId));
  if (pick.startsWith('tag:')) {
    const tag = pick.slice(4);
    const pool = (ASSETS_BY_TAG.get(tag) ?? []).filter((a) => a.category !== 'portal');
    if (!pool.length) return null;
    const themed = pool.filter(aligned);
    if (!themed.length) return null;
    const fresh = themed.filter((asset) => !avoided.has(asset.id));
    return rng.pick(fresh.length ? fresh : themed).id;
  }
  if (pick.startsWith('category:')) {
    const cat = pick.slice(9);
    const pool = ASSETS_BY_CATEGORY.get(cat) ?? [];
    if (!pool.length) return null;
    const matching = pool.filter(aligned);
    if (!matching.length) return null;
    const fresh = matching.filter((asset) => !avoided.has(asset.id));
    return rng.pick(fresh.length ? fresh : matching).id;
  }
  const direct = getAsset(pick);
  if (!direct) return null;
  let baseAlternatives = DIRECT_ALTERNATIVES.get(pick);
  if (!baseAlternatives) {
    baseAlternatives = (ASSETS_BY_CATEGORY.get(direct.category) ?? []).filter(
      (asset) =>
        asset.id !== pick &&
        Boolean(asset.family) &&
        asset.tags.some((tag) => direct.tags.includes(tag)) &&
        Math.max(asset.defaultScale.x, asset.defaultScale.z) <=
          Math.max(direct.defaultScale.x, direct.defaultScale.z) * 2.2,
    );
    DIRECT_ALTERNATIVES.set(pick, baseAlternatives);
  }
  const alternatives = baseAlternatives.filter(
    (asset) => !avoided.has(asset.id) && aligned(asset),
  );
  const directIsAligned = aligned(direct);
  if (!directIsAligned) {
    if (alternatives.length) return rng.pick(alternatives).id;
    const directSize = Math.max(direct.defaultScale.x, direct.defaultScale.z);
    const comparable = (ASSETS_BY_CATEGORY.get(direct.category) ?? []).filter(
      (asset) =>
        asset.id !== pick &&
        !avoided.has(asset.id) &&
        aligned(asset) &&
        Math.max(asset.defaultScale.x, asset.defaultScale.z) <= directSize * 2.2,
    );
    return comparable.length ? rng.pick(comparable).id : null;
  }
  if (avoided.has(pick)) {
    return alternatives.length ? rng.pick(alternatives).id : null;
  }
  return alternatives.length && rng.chance(0.64) ? rng.pick(alternatives).id : pick;
}

function tagsForAssets(ids: string[]): string[] {
  const tags = new Set<string>();
  for (const id of ids) {
    const a = getAsset(id);
    if (!a) continue;
    for (const t of a.tags) tags.add(t);
  }
  return [...tags];
}

function moodsForAssets(ids: string[]): MoodAxis[] {
  const moods = new Set<MoodAxis>();
  for (const id of ids) {
    const a = getAsset(id);
    if (!a) continue;
    for (const m of a.moods) moods.add(m);
  }
  return moods.size ? [...moods] : ['static'];
}

function roleForCategory(cat: string): PackRole {
  switch (cat) {
    case 'npc':
    case 'creature':
      return 'npc_beat';
    case 'anomaly':
      return 'anomaly';
    case 'furniture':
      return 'seating';
    case 'fixture':
      return 'utility';
    default:
      return 'decor';
  }
}

function weightedShuffle<T extends { score: number }>(rng: SeededRng, items: T[]): T[] {
  return items
    .map((it) => ({ it, k: rng.float(0.0001, 1) ** (1 / Math.max(0.15, it.score)) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.it);
}

function indexAssets(
  keysFor: (asset: (typeof ASSETS)[number]) => readonly string[],
): Map<string, typeof ASSETS> {
  const index = new Map<string, typeof ASSETS>();
  for (const asset of ASSETS) {
    for (const key of keysFor(asset)) {
      const values = index.get(key) ?? [];
      values.push(asset);
      index.set(key, values);
    }
  }
  return index;
}

function assetsForSets(setIds: readonly string[]): typeof ASSETS {
  const unique = new Map<string, (typeof ASSETS)[number]>();
  for (const setId of setIds) {
    for (const asset of ASSETS_BY_SET.get(setId) ?? []) unique.set(asset.id, asset);
  }
  return [...unique.values()];
}

function overlapsSpawnIsland(
  x: number,
  z: number,
  rotationY: number,
  scale: { x: number; y: number; z: number },
  scaleMul: number,
): boolean {
  const halfX = Math.max(0.1, scale.x * scaleMul * 0.5);
  const halfZ = Math.max(0.1, scale.z * scaleMul * 0.5);
  const cos = Math.abs(Math.cos(rotationY));
  const sin = Math.abs(Math.sin(rotationY));
  const worldHalfX = halfX * cos + halfZ * sin;
  const worldHalfZ = halfX * sin + halfZ * cos;
  const clearance = 1.15;
  return Math.abs(x) < worldHalfX + clearance && Math.abs(z) < worldHalfZ + clearance;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
