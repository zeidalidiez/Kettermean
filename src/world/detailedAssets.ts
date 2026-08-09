import type { EntityBehavior, MoodAxis } from '../types';
import type { AssetCategory, AssetDef } from './assetCatalog';
import { sceneSetIdsForTags } from './sceneSets';

export const DETAILED_PROP_KINDS = [
  'detail_tufted_settee',
  'detail_chaise_longue',
  'detail_canopy_bed',
  'detail_rolltop_desk',
  'detail_drafting_table',
  'detail_vanity_dresser',
  'detail_apothecary_cabinet',
  'detail_map_cabinet',
  'detail_china_hutch',
  'detail_sewing_station',
  'detail_typewriter_desk',
  'detail_library_ladder',
  'detail_cocktail_bar',
  'detail_diner_counter',
  'detail_confessional',
  'detail_pipe_organ',
  'detail_record_console',
  'detail_switchboard',
  'detail_analog_console',
  'detail_museum_diorama',
  'detail_specimen_cabinet',
  'detail_xray_machine',
  'detail_operating_lamp',
  'detail_dental_cabinet',
  'detail_microscope_station',
  'detail_oscilloscope_cart',
  'detail_film_projector',
  'detail_camera_tripod',
  'detail_reel_rack',
  'detail_weather_station',
  'detail_greenhouse_hutch',
  'detail_botanical_case',
  'detail_aviary',
  'detail_terrarium',
  'detail_bakery_case',
  'detail_luggage_trunks',
  'detail_shrine_cabinet',
  'detail_mechanical_clock',
] as const;

export const DETAILED_HUMANOID_KINDS = [
  'detail_figure_apothecary',
  'detail_figure_astronomer',
  'detail_figure_projectionist',
  'detail_figure_switchboard_operator',
  'detail_figure_botanist',
  'detail_figure_surgeon',
  'detail_figure_detective',
  'detail_figure_choir_member',
  'detail_figure_hotel_porter',
] as const;

export const DETAILED_CREATURE_KINDS = [
  'detail_animal_fox',
  'detail_animal_owl',
  'detail_animal_moth',
  'detail_animal_goat',
  'detail_animal_seal',
  'detail_animal_frog',
  'detail_animal_octopus',
  'detail_animal_snail',
  'detail_animal_beetle',
  'detail_animal_crane',
] as const;

export type DetailedPropKind = (typeof DETAILED_PROP_KINDS)[number];
export type DetailedHumanoidKind = (typeof DETAILED_HUMANOID_KINDS)[number];
export type DetailedCreatureKind = (typeof DETAILED_CREATURE_KINDS)[number];
export type DetailedModelKind = DetailedPropKind | DetailedHumanoidKind | DetailedCreatureKind;

export type DetailedPropForm =
  | 'upholstered'
  | 'bed'
  | 'desk'
  | 'cabinet'
  | 'counter'
  | 'organ'
  | 'console'
  | 'display'
  | 'medical'
  | 'instrument'
  | 'tripod'
  | 'rack'
  | 'station'
  | 'habitat'
  | 'stack'
  | 'clock';

export interface DetailedFamilyDefinition {
  id: string;
  kind: DetailedModelKind;
  label: string;
  category: AssetCategory;
  tags: string[];
  scale: { x: number; y: number; z: number };
  form?: DetailedPropForm;
  behavior?: EntityBehavior;
}

const prop = (
  id: string,
  kind: DetailedPropKind,
  label: string,
  category: 'furniture' | 'fixture' | 'decor' | 'anomaly',
  tags: string[],
  scale: { x: number; y: number; z: number },
  form: DetailedPropForm,
): DetailedFamilyDefinition => ({ id, kind, label, category, tags, scale, form });

export const DETAILED_PROP_FAMILIES: DetailedFamilyDefinition[] = [
  prop('artisan_tufted_settee', 'detail_tufted_settee', 'deep-button tufted settee', 'furniture', ['hotel', 'lobby', 'home', 'ceremonial'], { x: 2.25, y: 1.28, z: 1.02 }, 'upholstered'),
  prop('artisan_chaise_longue', 'detail_chaise_longue', 'asymmetrical chaise longue', 'furniture', ['hotel', 'home', 'museum', 'uncanny'], { x: 2.35, y: 1.18, z: 0.92 }, 'upholstered'),
  prop('artisan_canopy_bed', 'detail_canopy_bed', 'ornate canopy bed', 'furniture', ['hotel', 'home', 'ceremonial', 'haunted'], { x: 2.45, y: 2.65, z: 1.85 }, 'bed'),
  prop('artisan_rolltop_desk', 'detail_rolltop_desk', 'roll-top writing desk', 'furniture', ['office', 'archive', 'home', 'civic'], { x: 1.75, y: 1.55, z: 0.92 }, 'desk'),
  prop('artisan_drafting_table', 'detail_drafting_table', 'precision drafting table', 'furniture', ['office', 'school', 'lab', 'tech'], { x: 1.95, y: 1.45, z: 1.15 }, 'desk'),
  prop('artisan_vanity_dresser', 'detail_vanity_dresser', 'three-mirror vanity dresser', 'furniture', ['hotel', 'home', 'motel', 'haunted'], { x: 1.75, y: 1.85, z: 0.82 }, 'cabinet'),
  prop('artisan_apothecary_cabinet', 'detail_apothecary_cabinet', 'many-drawer apothecary cabinet', 'furniture', ['clinic', 'archive', 'lab', 'ceremonial'], { x: 1.75, y: 2.15, z: 0.62 }, 'cabinet'),
  prop('artisan_map_cabinet', 'detail_map_cabinet', 'flat-file map cabinet', 'furniture', ['archive', 'office', 'museum', 'school'], { x: 1.95, y: 1.25, z: 1.02 }, 'cabinet'),
  prop('artisan_china_hutch', 'detail_china_hutch', 'glass-front china hutch', 'furniture', ['home', 'hotel', 'banquet', 'haunted'], { x: 1.55, y: 2.25, z: 0.62 }, 'cabinet'),
  prop('artisan_sewing_station', 'detail_sewing_station', 'treadle sewing station', 'furniture', ['home', 'hotel', 'industrial', 'archive'], { x: 1.45, y: 1.35, z: 0.82 }, 'desk'),
  prop('artisan_typewriter_desk', 'detail_typewriter_desk', 'typewriter correspondence desk', 'furniture', ['office', 'archive', 'hotel', 'civic'], { x: 1.55, y: 1.22, z: 0.82 }, 'desk'),
  prop('artisan_library_ladder', 'detail_library_ladder', 'rolling library ladder', 'furniture', ['archive', 'school', 'museum', 'office'], { x: 1.05, y: 2.85, z: 0.82 }, 'rack'),
  prop('artisan_cocktail_bar', 'detail_cocktail_bar', 'mirrored cocktail bar', 'furniture', ['hotel', 'food', 'banquet', 'leisure'], { x: 2.75, y: 2.15, z: 1.15 }, 'counter'),
  prop('artisan_diner_counter', 'detail_diner_counter', 'chrome diner counter', 'furniture', ['food', 'retail', 'motel', 'roadside'], { x: 3.05, y: 1.35, z: 1.1 }, 'counter'),
  prop('artisan_confessional', 'detail_confessional', 'carved confession booth', 'furniture', ['chapel', 'cathedral', 'ceremonial', 'haunted'], { x: 1.65, y: 2.55, z: 1.25 }, 'cabinet'),
  prop('artisan_pipe_organ', 'detail_pipe_organ', 'compact pipe organ', 'fixture', ['chapel', 'cathedral', 'museum', 'ceremonial'], { x: 2.75, y: 3.2, z: 1.25 }, 'organ'),
  prop('artisan_record_console', 'detail_record_console', 'walnut record console', 'fixture', ['home', 'hotel', 'leisure', 'haunted'], { x: 1.75, y: 1.15, z: 0.72 }, 'console'),
  prop('artisan_switchboard', 'detail_switchboard', 'manual telephone switchboard', 'fixture', ['office', 'hotel', 'tech', 'archive'], { x: 1.95, y: 1.75, z: 0.92 }, 'console'),
  prop('artisan_analog_console', 'detail_analog_console', 'wall-sized analog control console', 'fixture', ['tech', 'industrial', 'server', 'lab'], { x: 2.75, y: 2.05, z: 1.05 }, 'console'),
  prop('artisan_museum_diorama', 'detail_museum_diorama', 'illuminated museum diorama', 'decor', ['museum', 'exhibition', 'school', 'uncanny'], { x: 2.25, y: 1.65, z: 1.15 }, 'display'),
  prop('artisan_specimen_cabinet', 'detail_specimen_cabinet', 'labeled specimen cabinet', 'fixture', ['museum', 'lab', 'clinic', 'archive'], { x: 1.65, y: 2.15, z: 0.62 }, 'display'),
  prop('artisan_xray_machine', 'detail_xray_machine', 'articulated X-ray machine', 'fixture', ['clinic', 'hospital', 'lab', 'observation'], { x: 1.65, y: 2.3, z: 1.45 }, 'medical'),
  prop('artisan_operating_lamp', 'detail_operating_lamp', 'multi-lens operating lamp', 'fixture', ['clinic', 'hospital', 'lab', 'observation'], { x: 1.75, y: 2.45, z: 1.55 }, 'medical'),
  prop('artisan_dental_cabinet', 'detail_dental_cabinet', 'instrumented dental cabinet', 'fixture', ['clinic', 'hospital', 'dental', 'observation'], { x: 1.65, y: 1.85, z: 0.72 }, 'medical'),
  prop('artisan_microscope_station', 'detail_microscope_station', 'laboratory microscope station', 'fixture', ['lab', 'school', 'clinic', 'tech'], { x: 1.65, y: 1.55, z: 0.92 }, 'instrument'),
  prop('artisan_oscilloscope_cart', 'detail_oscilloscope_cart', 'oscilloscope diagnostic cart', 'fixture', ['lab', 'tech', 'industrial', 'clinic'], { x: 1.25, y: 1.65, z: 0.82 }, 'instrument'),
  prop('artisan_film_projector', 'detail_film_projector', 'twin-reel cinema projector', 'fixture', ['cinema', 'museum', 'school', 'projection'], { x: 1.55, y: 1.75, z: 1.05 }, 'instrument'),
  prop('artisan_camera_tripod', 'detail_camera_tripod', 'bellows camera on tripod', 'fixture', ['museum', 'cinema', 'archive', 'projection'], { x: 1.35, y: 2.05, z: 1.25 }, 'tripod'),
  prop('artisan_reel_rack', 'detail_reel_rack', 'loaded film reel rack', 'fixture', ['cinema', 'archive', 'museum', 'industrial'], { x: 1.65, y: 2.15, z: 0.62 }, 'rack'),
  prop('artisan_weather_station', 'detail_weather_station', 'mechanical weather station', 'fixture', ['outdoor', 'tech', 'school', 'field'], { x: 1.75, y: 2.85, z: 1.75 }, 'station'),
  prop('artisan_greenhouse_hutch', 'detail_greenhouse_hutch', 'greenhouse propagation hutch', 'furniture', ['garden', 'lab', 'school', 'overgrown'], { x: 1.95, y: 2.05, z: 0.82 }, 'habitat'),
  prop('artisan_botanical_case', 'detail_botanical_case', 'pressed botanical display case', 'decor', ['garden', 'museum', 'school', 'archive'], { x: 1.75, y: 2.05, z: 0.42 }, 'display'),
  prop('artisan_aviary', 'detail_aviary', 'ornamental empty aviary', 'fixture', ['garden', 'museum', 'hotel', 'uncanny'], { x: 1.55, y: 2.35, z: 1.55 }, 'habitat'),
  prop('artisan_terrarium', 'detail_terrarium', 'humid glass terrarium', 'fixture', ['garden', 'museum', 'lab', 'aquarium'], { x: 1.85, y: 1.65, z: 1.05 }, 'habitat'),
  prop('artisan_bakery_case', 'detail_bakery_case', 'curved bakery display case', 'fixture', ['food', 'retail', 'hotel', 'mall'], { x: 2.15, y: 1.45, z: 1.05 }, 'display'),
  prop('artisan_luggage_trunks', 'detail_luggage_trunks', 'stack of travel trunks', 'decor', ['hotel', 'motel', 'terminal', 'archive'], { x: 1.75, y: 1.65, z: 1.25 }, 'stack'),
  prop('artisan_shrine_cabinet', 'detail_shrine_cabinet', 'illuminated shrine cabinet', 'anomaly', ['chapel', 'ceremonial', 'museum', 'uncanny'], { x: 1.65, y: 2.35, z: 0.82 }, 'cabinet'),
  prop('artisan_mechanical_clock', 'detail_mechanical_clock', 'exposed mechanical clock', 'fixture', ['hotel', 'station', 'museum', 'haunted'], { x: 1.55, y: 2.55, z: 0.72 }, 'clock'),
];

const being = (
  id: string,
  kind: DetailedHumanoidKind | DetailedCreatureKind,
  label: string,
  category: 'npc' | 'creature',
  tags: string[],
  scale: { x: number; y: number; z: number },
  behavior: EntityBehavior,
): DetailedFamilyDefinition => ({ id, kind, label, category, tags, scale, behavior });

export const DETAILED_BEING_FAMILIES: DetailedFamilyDefinition[] = [
  being('artisan_npc_apothecary', 'detail_figure_apothecary', 'after-hours apothecary', 'npc', ['clinic', 'retail', 'archive', 'uncanny'], { x: 0.82, y: 2.35, z: 0.62 }, 'stare'),
  being('artisan_npc_astronomer', 'detail_figure_astronomer', 'indoor astronomer', 'npc', ['tech', 'museum', 'field', 'school'], { x: 0.84, y: 2.38, z: 0.64 }, 'orbit'),
  being('artisan_npc_projectionist', 'detail_figure_projectionist', 'last projectionist', 'npc', ['cinema', 'archive', 'museum', 'projection'], { x: 0.82, y: 2.32, z: 0.62 }, 'wander'),
  being('artisan_npc_switchboard_operator', 'detail_figure_switchboard_operator', 'silent switchboard operator', 'npc', ['office', 'hotel', 'tech', 'archive'], { x: 0.84, y: 2.28, z: 0.64 }, 'stare'),
  being('artisan_npc_botanist', 'detail_figure_botanist', 'greenhouse botanist', 'npc', ['garden', 'lab', 'school', 'overgrown'], { x: 0.85, y: 2.36, z: 0.65 }, 'wander'),
  being('artisan_npc_surgeon', 'detail_figure_surgeon', 'waiting surgeon', 'npc', ['clinic', 'hospital', 'lab', 'observation'], { x: 0.84, y: 2.34, z: 0.64 }, 'stare'),
  being('artisan_npc_detective', 'detail_figure_detective', 'corridor detective', 'npc', ['office', 'hotel', 'civic', 'night'], { x: 0.86, y: 2.4, z: 0.66 }, 'orbit'),
  being('artisan_npc_choir_member', 'detail_figure_choir_member', 'single choir member', 'npc', ['chapel', 'cathedral', 'ceremonial', 'haunted'], { x: 0.88, y: 2.38, z: 0.68 }, 'idle'),
  being('artisan_npc_hotel_porter', 'detail_figure_hotel_porter', 'unclaimed hotel porter', 'npc', ['hotel', 'motel', 'lobby', 'terminal'], { x: 0.86, y: 2.36, z: 0.66 }, 'wander'),
  being('artisan_creature_fox', 'detail_animal_fox', 'red corridor fox', 'creature', ['outdoor', 'garden', 'motel', 'night'], { x: 0.92, y: 1.0, z: 1.55 }, 'wander'),
  being('artisan_creature_owl', 'detail_animal_owl', 'lobby owl', 'creature', ['outdoor', 'museum', 'archive', 'night'], { x: 0.95, y: 1.35, z: 0.88 }, 'stare'),
  being('artisan_creature_moth', 'detail_animal_moth', 'velvet atlas moth', 'creature', ['garden', 'night', 'hotel', 'dream'], { x: 1.75, y: 1.05, z: 0.42 }, 'orbit'),
  being('artisan_creature_goat', 'detail_animal_goat', 'ceremonial white goat', 'creature', ['outdoor', 'chapel', 'field', 'ceremonial'], { x: 1.05, y: 1.65, z: 1.7 }, 'wander'),
  being('artisan_creature_seal', 'detail_animal_seal', 'carpeted harbor seal', 'creature', ['aquarium', 'pool', 'hotel', 'wet'], { x: 1.05, y: 0.92, z: 1.75 }, 'idle'),
  being('artisan_creature_frog', 'detail_animal_frog', 'reception frog', 'creature', ['garden', 'wet', 'clinic', 'dream'], { x: 0.92, y: 0.82, z: 1.0 }, 'stare'),
  being('artisan_creature_octopus', 'detail_animal_octopus', 'ceiling octopus', 'creature', ['aquarium', 'wet', 'museum', 'dream'], { x: 1.75, y: 1.25, z: 1.75 }, 'orbit'),
  being('artisan_creature_snail', 'detail_animal_snail', 'luggage-sized snail', 'creature', ['garden', 'hotel', 'wet', 'liminal'], { x: 1.1, y: 1.0, z: 1.65 }, 'wander'),
  being('artisan_creature_beetle', 'detail_animal_beetle', 'brass stag beetle', 'creature', ['garden', 'museum', 'industrial', 'gilded'], { x: 1.25, y: 0.72, z: 1.55 }, 'wander'),
  being('artisan_creature_crane', 'detail_animal_crane', 'waiting-room crane', 'creature', ['outdoor', 'clinic', 'wet', 'ceremonial'], { x: 0.92, y: 2.25, z: 1.05 }, 'stare'),
];

export const DETAILED_FAMILY_DEFINITIONS = [
  ...DETAILED_PROP_FAMILIES,
  ...DETAILED_BEING_FAMILIES,
];

export const DETAILED_BOUNDS: Record<DetailedModelKind, { w: number; h: number; d: number }> =
  Object.fromEntries(DETAILED_FAMILY_DEFINITIONS.map((family) => [
    family.kind,
    { w: family.scale.x, h: family.scale.y, d: family.scale.z },
  ])) as Record<DetailedModelKind, { w: number; h: number; d: number }>;

const VARIANT_LABELS = [
  'lacquered',
  'brass-trimmed',
  'water-stained',
  'velvet-lined',
  'museum-grade',
  'overwired',
  'funereal',
  'impossibly restored',
] as const;

const VARIANTS_PER_FAMILY = 8;
const ALL_MOODS: MoodAxis[] = ['upper', 'downer', 'static', 'dynamic'];

export const DETAILED_PROP_RENDER_COST_BY_VARIANT = [18, 13, 24, 13, 13, 13, 26, 13] as const;
export const DETAILED_NPC_RENDER_COST_BY_VARIANT = [23, 24, 21, 22, 22, 21, 22, 21] as const;
export const DETAILED_CREATURE_RENDER_COST_BY_VARIANT = [20, 20, 21, 20, 21, 21, 19, 23] as const;

function detailedRenderCost(category: AssetCategory, variant: number): number {
  if (category === 'npc') return DETAILED_NPC_RENDER_COST_BY_VARIANT[variant]!;
  if (category === 'creature') return DETAILED_CREATURE_RENDER_COST_BY_VARIANT[variant]!;
  return DETAILED_PROP_RENDER_COST_BY_VARIANT[variant]!;
}

export const DETAILED_ASSETS: AssetDef[] = DETAILED_FAMILY_DEFINITIONS.flatMap(
  (family) => Array.from({ length: VARIANTS_PER_FAMILY }, (_, variant) => ({
    id: `${family.id}_${String(variant + 1).padStart(2, '0')}`,
    kind: family.kind,
    label: `${VARIANT_LABELS[variant]} ${family.label}`,
    category: family.category,
    tags: [...family.tags, 'high-detail'],
    setIds: sceneSetIdsForTags(family.tags),
    moods: [...ALL_MOODS],
    defaultScale: { ...family.scale },
    scaleRange: {
      min: family.category === 'npc' || family.category === 'creature' ? 0.82 : 0.74,
      max: family.category === 'npc' || family.category === 'creature' ? 1.7 : 1.65,
    },
    defaultBehavior: family.behavior,
    linksByDefault: false,
    solidDefault: family.category !== 'npc' && family.category !== 'creature',
    weight: family.category === 'npc' ? 0.9 : family.category === 'creature' ? 0.78 : 1.05,
    renderCost: detailedRenderCost(family.category, variant),
    family: family.id,
    variant,
  })),
);

export const DETAILED_PROP_ASSET_COUNT = DETAILED_ASSETS.filter(
  (asset) => asset.category !== 'npc' && asset.category !== 'creature',
).length;
export const DETAILED_BEING_ASSET_COUNT = DETAILED_ASSETS.filter(
  (asset) => asset.category === 'npc' || asset.category === 'creature',
).length;
export const DETAILED_ASSET_COUNT = DETAILED_ASSETS.length;

export function isDetailedModelKind(kind: string): kind is DetailedModelKind {
  return kind in DETAILED_BOUNDS;
}

export function detailedFamilyForKind(kind: DetailedModelKind): DetailedFamilyDefinition {
  return DETAILED_FAMILY_DEFINITIONS.find((family) => family.kind === kind)!;
}
