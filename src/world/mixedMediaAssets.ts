import type { EntityBehavior, MoodAxis } from '../types';
import type { AssetCategory, AssetDef } from './assetCatalog';
import { sceneSetIdsForTags } from './sceneSets';

export const DETAILED_MODEL_KINDS = [
  'ornate_settee',
  'grand_piano',
  'diner_counter',
  'pipe_organ',
  'control_console',
  'operating_lamp',
  'greenhouse_cart',
  'funeral_casket',
  'subway_kiosk',
  'hotel_luggage_stack',
  'figure_bride',
  'figure_porter',
] as const;

export const LOW_POLY_MODEL_KINDS = [
  'lowpoly_car',
  'lowpoly_tree',
  'lowpoly_tv',
  'lowpoly_toilet',
  'lowpoly_robot',
  'lowpoly_person',
  'lowpoly_bird',
  'lowpoly_dog',
] as const;

export const VOXEL_MODEL_KINDS = [
  'voxel_giant',
  'voxel_whale',
  'voxel_hand',
  'voxel_head',
  'voxel_crawler',
  'voxel_cat',
  'voxel_watcher',
  'voxel_train',
] as const;

export type MixedMediaModelKind =
  | (typeof DETAILED_MODEL_KINDS)[number]
  | (typeof LOW_POLY_MODEL_KINDS)[number]
  | (typeof VOXEL_MODEL_KINDS)[number];

export type MixedMediaStyle = 'detailed' | 'lowpoly' | 'voxel';

interface MixedMediaFamily {
  id: string;
  kind: MixedMediaModelKind;
  label: string;
  category: AssetCategory;
  tags: string[];
  scale: { x: number; y: number; z: number };
  renderCost: number;
  style: MixedMediaStyle;
  behavior?: EntityBehavior;
}

const VARIANT_LABELS = [
  'worn',
  'municipal',
  'velvet',
  'chrome',
  'sun-faded',
  'monolithic',
  'child-made',
  'ceremonial',
] as const;

const FAMILIES: MixedMediaFamily[] = [
  detailed('ornate_settee', 'ornate settee', 'furniture', ['motel', 'hotel', 'lobby', 'ceremonial'], { x: 2.35, y: 1.35, z: 0.95 }, 6),
  detailed('grand_piano', 'grand piano', 'furniture', ['motel', 'chapel', 'banquet', 'leisure'], { x: 2.9, y: 1.55, z: 2.1 }, 7),
  detailed('diner_counter', 'diner counter section', 'furniture', ['food', 'retail', 'motel', 'leisure'], { x: 3.8, y: 1.45, z: 1.6 }, 6),
  detailed('pipe_organ', 'pipe organ console', 'fixture', ['chapel', 'cathedral', 'ceremonial', 'leisure'], { x: 3.4, y: 4.4, z: 1.25 }, 7),
  detailed('control_console', 'control room console', 'fixture', ['tech', 'server', 'industrial', 'office'], { x: 3.1, y: 1.9, z: 1.45 }, 6),
  detailed('operating_lamp', 'surgical operating lamp', 'fixture', ['clinic', 'hospital', 'observation', 'industrial'], { x: 2.2, y: 3.2, z: 2.2 }, 5),
  detailed('greenhouse_cart', 'greenhouse specimen cart', 'fixture', ['garden', 'greenhouse', 'service', 'school'], { x: 2.1, y: 1.8, z: 1.05 }, 5),
  detailed('funeral_casket', 'closed funeral casket', 'furniture', ['ceremonial', 'chapel', 'museum', 'haunted'], { x: 2.45, y: 1.05, z: 0.95 }, 5),
  detailed('subway_kiosk', 'subway service kiosk', 'fixture', ['subway', 'station', 'transit', 'retail'], { x: 1.55, y: 2.35, z: 1.05 }, 5),
  detailed('hotel_luggage_stack', 'stacked hotel luggage', 'decor', ['hotel', 'motel', 'lobby', 'transit'], { x: 1.55, y: 1.75, z: 1.15 }, 5),
  actor('npc_bride', 'figure_bride', 'bride waiting alone', ['ceremonial', 'chapel', 'hotel', 'banquet'], 'detailed', 7, 'stare', { x: 1.35, y: 2.65, z: 0.9 }),
  actor('npc_porter', 'figure_porter', 'night luggage porter', ['hotel', 'motel', 'transit', 'lobby'], 'detailed', 6, 'wander', { x: 1.05, y: 2.55, z: 0.78 }),

  lowPoly('lowpoly_car', 'low-poly parked car', 'fixture', ['roadside', 'parking', 'outdoor', 'highway'], { x: 3.8, y: 1.45, z: 1.85 }, 2),
  lowPoly('lowpoly_tree', 'low-poly tree', 'decor', ['outdoor', 'park', 'garden', 'meadow'], { x: 2.2, y: 5.2, z: 2.2 }, 1),
  lowPoly('lowpoly_tv', 'low-poly television', 'fixture', ['home', 'motel', 'lobby', 'dream'], { x: 1.25, y: 1.45, z: 0.75 }, 1),
  lowPoly('lowpoly_toilet', 'low-poly toilet', 'fixture', ['home', 'clinic', 'service', 'abandoned'], { x: 0.85, y: 1.05, z: 1.15 }, 1),
  actor('npc_lowpoly_robot', 'lowpoly_robot', 'low-poly service robot', ['tech', 'server', 'industrial', 'dream'], 'lowpoly', 2, 'orbit', { x: 0.95, y: 2.05, z: 0.8 }),
  actor('npc_lowpoly_person', 'lowpoly_person', 'low-poly bystander', ['office', 'parking', 'backrooms', 'dream'], 'lowpoly', 2, 'wander', { x: 0.8, y: 2.2, z: 0.55 }),
  actor('creature_lowpoly_bird', 'lowpoly_bird', 'low-poly watching bird', ['outdoor', 'parking', 'park', 'dream'], 'lowpoly', 1, 'orbit', { x: 0.75, y: 0.72, z: 0.95 }, 'creature'),
  actor('creature_lowpoly_dog', 'lowpoly_dog', 'low-poly waiting dog', ['outdoor', 'park', 'station', 'dream'], 'lowpoly', 2, 'wander', { x: 1.15, y: 1.25, z: 1.65 }, 'creature'),

  actor('anomaly_voxel_giant', 'voxel_giant', 'giant voxel pedestrian', ['outdoor', 'field', 'dream', 'liminal'], 'voxel', 6, 'stare', { x: 7, y: 15, z: 4 }, 'anomaly'),
  actor('anomaly_voxel_whale', 'voxel_whale', 'floating voxel whale', ['outdoor', 'aquarium', 'dream', 'liminal'], 'voxel', 6, 'orbit', { x: 14, y: 7, z: 5 }, 'anomaly'),
  actor('anomaly_voxel_hand', 'voxel_hand', 'monumental voxel hand', ['museum', 'field', 'dream', 'liminal'], 'voxel', 5, 'idle', { x: 7, y: 12, z: 4 }, 'anomaly'),
  actor('anomaly_voxel_head', 'voxel_head', 'floating voxel head', ['museum', 'outdoor', 'dream', 'liminal'], 'voxel', 5, 'stare', { x: 8, y: 8, z: 6 }, 'anomaly'),
  actor('creature_voxel_crawler', 'voxel_crawler', 'giant voxel crawler', ['outdoor', 'field', 'industrial', 'dream'], 'voxel', 6, 'wander', { x: 8, y: 4, z: 10 }, 'creature'),
  actor('creature_voxel_cat', 'voxel_cat', 'giant voxel cat', ['outdoor', 'park', 'dream', 'liminal'], 'voxel', 5, 'wander', { x: 6, y: 7, z: 10 }, 'creature'),
  actor('anomaly_voxel_watcher', 'voxel_watcher', 'voxel horizon watcher', ['field', 'tech', 'dream', 'liminal'], 'voxel', 5, 'stare', { x: 5, y: 16, z: 5 }, 'anomaly'),
  detailed('voxel_train', 'giant voxel train', 'fixture', ['transit', 'outdoor', 'field', 'industrial'], { x: 8, y: 6, z: 24 }, 7, 'voxel'),

];

export const MIXED_MEDIA_ASSETS: AssetDef[] = FAMILIES.flatMap((assetFamily) =>
  Array.from({ length: 8 }, (_, variant) => ({
    id: `${assetFamily.id}_${String(variant + 1).padStart(2, '0')}`,
    kind: assetFamily.kind,
    label: `${VARIANT_LABELS[variant]} ${assetFamily.label}`,
    category: assetFamily.category,
    tags: [...assetFamily.tags, assetFamily.style],
    setIds: sceneSetIdsForTags(assetFamily.tags),
    moods: ['upper', 'downer', 'static', 'dynamic'] as MoodAxis[],
    defaultScale: { ...assetFamily.scale },
    scaleRange: {
      min: assetFamily.style === 'voxel' ? 0.64 : 0.74,
      max: assetFamily.style === 'voxel' ? 1.45 : assetFamily.category === 'npc' ? 1.55 : 1.7,
    },
    defaultBehavior: assetFamily.behavior,
    linksByDefault: false,
    solidDefault:
      assetFamily.category !== 'npc' &&
      assetFamily.category !== 'creature' &&
      assetFamily.category !== 'anomaly',
    weight:
      assetFamily.style === 'voxel'
        ? 0.32
        : assetFamily.style === 'lowpoly'
          ? 0.58
          : 0.72,
    renderCost: assetFamily.renderCost,
    family: assetFamily.id,
    variant,
  })),
);

export const MIXED_MEDIA_ASSET_COUNT = MIXED_MEDIA_ASSETS.length;

function detailed(
  kind: MixedMediaModelKind,
  label: string,
  category: AssetCategory,
  tags: string[],
  scale: { x: number; y: number; z: number },
  renderCost: number,
  style: MixedMediaStyle = 'detailed',
): MixedMediaFamily {
  return { id: kind, kind, label, category, tags, scale, renderCost, style };
}

function lowPoly(
  kind: MixedMediaModelKind,
  label: string,
  category: AssetCategory,
  tags: string[],
  scale: { x: number; y: number; z: number },
  renderCost: number,
): MixedMediaFamily {
  return detailed(kind, label, category, tags, scale, renderCost, 'lowpoly');
}

function actor(
  id: string,
  kind: MixedMediaModelKind,
  label: string,
  tags: string[],
  style: MixedMediaStyle,
  renderCost: number,
  behavior: EntityBehavior,
  scale: { x: number; y: number; z: number },
  category: AssetCategory = 'npc',
): MixedMediaFamily {
  return { id, kind, label, category, tags, scale, renderCost, style, behavior };
}
