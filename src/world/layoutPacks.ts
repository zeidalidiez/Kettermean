import type { EntityBehavior, MoodAxis } from '../types';
import type { DirectedPlacement } from './assetCatalog';
import { ASSETS, getAsset } from './assetCatalog';
import { SeededRng } from '../core/rng';

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
}

const PORTALS = new Set(['door_fake', 'door_service', 'door_glass', 'arch_portal']);

/** Build a large combinatorial pack library once. */
let CACHED: LayoutPack[] | null = null;

export function allLayoutPacks(): LayoutPack[] {
  if (CACHED) return CACHED;
  CACHED = buildPackLibrary();
  return CACHED;
}

export function stampRoomPacks(
  rng: SeededRng,
  ctx: PackStampContext,
): DirectedPlacement[] {
  const packs = allLayoutPacks();
  const area = ctx.width * ctx.depth;
  const target = clamp(
    ctx.targetPacks ?? Math.round(8 + area / 28),
    10,
    30,
  );

  const placements: DirectedPlacement[] = [];
  const occupied: Array<{ x: number; z: number; r: number }> = [];

  // Always place doors first as portal packs along walls.
  placeDoors(rng, placements, occupied, ctx);

  // Score packs: theme match + mood + occasional clash.
  const scored = packs
    .map((p) => ({ pack: p, score: scorePack(rng, p, ctx) }))
    .filter((s) => s.score > 0.05)
    .sort((a, b) => b.score - a.score);

  // Weighted sample without replacement-ish: walk shuffled top candidates.
  const pool = weightedShuffle(
    rng,
    scored.slice(0, Math.min(scored.length, 400)),
  );

  let placed = 0;
  let attempts = 0;
  const maxAttempts = target * 14;

  while (placed < target && attempts < maxAttempts && pool.length) {
    attempts += 1;
    const idx = Math.min(pool.length - 1, Math.floor(rng.float(0, 1) ** 1.7 * pool.length));
    const { pack } = pool[idx]!;
    // Soft remove to reduce repeats
    if (rng.chance(0.55)) pool.splice(idx, 1);

    const anchor = findAnchor(rng, pack, ctx, occupied);
    if (!anchor) continue;

    const stamped = stampPack(rng, pack, anchor, ctx);
    if (!stamped.length) continue;

    for (const s of stamped) placements.push(s);
    occupied.push({ x: anchor.x, z: anchor.z, r: pack.radius * anchor.uniformScale });
    placed += 1;
  }

  // Fill leftover with a few lone scatter props for liminal mess.
  scatterFill(rng, placements, occupied, ctx, Math.min(8, Math.max(3, 32 - placements.length)));

  // Door-only links.
  for (const p of placements) {
    const a = getAsset(p.assetId);
    p.linksOnTouch = Boolean(a && (a.category === 'portal' || PORTALS.has(p.assetId)));
  }

  return placements;
}

function buildPackLibrary(): LayoutPack[] {
  const out: LayoutPack[] = [];
  let n = 0;
  const id = (role: string) => `pack_${role}_${(n++).toString(36)}`;

  const seating = ['chair_office', 'chair_plastic', 'bench_wait', 'bench_pew'];
  const desks = ['desk_security', 'desk_intake', 'table_food'];
  const storage = ['cabinet_file', 'cabinet_util', 'shelf_toy'];
  const utility = ['cart_janitor', 'cooler_water', 'sign_wet', 'payphone_wall'];
  const nursery = ['crib_empty', 'bottle_giant', 'shelf_toy'];
  const npcs = ['npc_clerk', 'npc_guide', 'npc_raincoat', 'npc_mannequin', 'npc_shadow'];
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
        { pick: 'plant_fern', x: -s * 0.6, z: s * 0.5, scaleJitter: [0.7, 1.5], omitChance: 0.35 },
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

function scorePack(rng: SeededRng, pack: LayoutPack, ctx: PackStampContext): number {
  let s = pack.weight;

  const themeHits = pack.tags.filter((t) => ctx.themeTags.includes(t)).length;
  s += themeHits * 0.55;

  if (pack.moods.includes(ctx.mood)) s += 0.45;
  else s *= 0.55;

  // Liminal clash: sometimes boost off-theme packs.
  if (pack.clashy && rng.chance(0.22)) s += 1.1;
  if (themeHits === 0 && rng.chance(0.18)) s += 0.7; // wrong furniture in the room

  if (ctx.giant && pack.role === 'anomaly') s += 1.4;
  if (ctx.preferAssets?.length) {
    const picks = pack.slots.map((sl) => sl.pick);
    if (picks.some((p) => ctx.preferAssets!.includes(p))) s += 0.8;
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
): DirectedPlacement[] {
  const out: DirectedPlacement[] = [];
  const cos = Math.cos(anchor.rot);
  const sin = Math.sin(anchor.rot);

  for (const slot of pack.slots) {
    if (slot.omitChance && rng.chance(slot.omitChance)) continue;
    const assetId = resolvePick(rng, slot.pick, ctx);
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

    const lx = slot.x * anchor.uniformScale;
    const lz = slot.z * anchor.uniformScale;
    const x = anchor.x + lx * cos - lz * sin;
    const z = anchor.z + lx * sin + lz * cos;
    const rotY = (slot.rotY ?? 0) + anchor.rot + rng.float(-0.08, 0.08);

    if (overlapsSpawnIsland(x, z, rotY, asset.defaultScale, scaleMul)) continue;

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
  const r = pack.radius * uniformScale;
  const margin = r + 0.9;
  const hw = ctx.width / 2 - margin;
  const hd = ctx.depth / 2 - margin;
  if (hw < 0.5 || hd < 0.5) return null;

  for (let tryN = 0; tryN < 18; tryN += 1) {
    let x = 0;
    let z = 0;
    let rot = rng.float(0, Math.PI * 2);

    const prefer = pack.prefer;
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
  const count = area > 240 ? 3 : area > 130 ? 2 : 1;
  const sides: Array<'n' | 's' | 'e' | 'w'> = ['n', 's', 'e', 'w'];
  for (let i = sides.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const t = sides[i]!;
    sides[i] = sides[j]!;
    sides[j] = t;
  }
  const doorIds = ['door_fake', 'door_service', 'door_glass', 'arch_portal'];
  for (let i = 0; i < count; i += 1) {
    const side = sides[i % sides.length]!;
    const doorId = doorIds[i % doorIds.length]!;
    const along = rng.float(-0.4, 0.4);
    let x = 0;
    let z = 0;
    let rotY = 0;
    if (side === 'w') {
      x = -ctx.width / 2 + 0.4;
      z = ctx.depth * along * 0.5;
      rotY = Math.PI / 2;
    } else if (side === 'e') {
      x = ctx.width / 2 - 0.4;
      z = ctx.depth * along * 0.5;
      rotY = -Math.PI / 2;
    } else if (side === 'n') {
      z = -ctx.depth / 2 + 0.4;
      x = ctx.width * along * 0.5;
      rotY = 0;
    } else {
      z = ctx.depth / 2 - 0.4;
      x = ctx.width * along * 0.5;
      rotY = Math.PI;
    }
    placements.push({
      assetId: getAsset(doorId) ? doorId : 'door_fake',
      x,
      z,
      rotY,
      scaleMul: doorId === 'arch_portal' ? rng.float(1.0, 1.4) : 1,
      linksOnTouch: true,
      solid: true,
    });
    occupied.push({ x, z, r: 1.2 });
  }
}

function scatterFill(
  rng: SeededRng,
  placements: DirectedPlacement[],
  occupied: Array<{ x: number; z: number; r: number }>,
  ctx: PackStampContext,
  count: number,
): void {
  const candidates = ASSETS.filter((a) => a.category !== 'portal');
  const hw = ctx.width / 2 - 1.4;
  const hd = ctx.depth / 2 - 1.4;
  for (let i = 0; i < count; i += 1) {
    const asset = rng.pick(candidates);
    const x = rng.float(-hw, hw);
    const z = rng.float(-hd, hd);
    let blocked = false;
    for (const o of occupied) {
      if (Math.hypot(x - o.x, z - o.z) < o.r + 0.7) {
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
    if (overlapsSpawnIsland(x, z, rotY, asset.defaultScale, scaleMul)) continue;
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
    occupied.push({ x, z, r: 0.8 });
  }
}

function resolvePick(rng: SeededRng, pick: string, ctx: PackStampContext): string | null {
  if (pick.startsWith('tag:')) {
    const tag = pick.slice(4);
    const pool = ASSETS.filter(
      (a) => a.category !== 'portal' && a.tags.includes(tag),
    );
    if (!pool.length) return null;
    // Prefer theme-aligned, sometimes clash
    const themed = pool.filter((a) => a.tags.some((t) => ctx.themeTags.includes(t)));
    const use = themed.length && rng.chance(0.72) ? themed : pool;
    return rng.pick(use).id;
  }
  if (pick.startsWith('category:')) {
    const cat = pick.slice(9);
    const pool = ASSETS.filter((a) => a.category === cat);
    if (!pool.length) return null;
    return rng.pick(pool).id;
  }
  return getAsset(pick) ? pick : null;
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
