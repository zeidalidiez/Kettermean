import type { EntityBehavior, MoodAxis } from '../types';
import type { AssetCategory, AssetDef } from './assetCatalog';
import { sceneSetIdsForTags } from './sceneSets';

export const MASTERWORK_PROP_KINDS = [
  'detail_baroque_writing_bureau',
  'detail_hotel_key_cabinet',
  'detail_hydraulic_barber_chair',
  'detail_shoe_shine_throne',
  'detail_astronomical_orrery',
  'detail_planetarium_projector',
  'detail_phonograph_cabinet',
  'detail_gramophone_horn',
  'detail_telegraph_station',
  'detail_pneumatic_tube_terminal',
  'detail_pharmacy_soda_fountain',
  'detail_pastry_trolley',
  'detail_tea_service_cart',
  'detail_funeral_flower_stand',
  'detail_folding_room_divider',
  'detail_coat_check_island',
  'detail_train_compartment_seat',
  'detail_nautical_chart_table',
  'detail_observatory_telescope',
  'detail_diving_helmet_stand',
  'detail_aquarium_filter_bank',
  'detail_taxidermy_case',
  'detail_insect_display_drawers',
  'detail_reliquary_pedestal',
  'detail_votive_candle_rack',
  'detail_music_box_cabinet',
  'detail_automaton_stage',
  'detail_puppet_theater',
  'detail_mannequin_fitting_platform',
  'detail_banquet_sideboard',
  'detail_loom_workstation',
  'detail_ceramic_kiln',
  'detail_printing_press',
  'detail_letterpress_type_case',
  'detail_clockmaker_bench',
  'detail_watchmaker_lamp',
  'detail_electrotherapy_machine',
  'detail_iron_lung',
] as const;

export const MASTERWORK_HUMANOID_KINDS = [
  'detail_figure_clockmaker',
  'detail_figure_deep_sea_diver',
  'detail_figure_beekeeper',
  'detail_figure_seamstress',
  'detail_figure_radio_operator',
  'detail_figure_undertaker',
  'detail_figure_stage_magician',
  'detail_figure_night_archivist',
  'detail_figure_lamplighter',
] as const;

export const MASTERWORK_CREATURE_KINDS = [
  'detail_animal_hare',
  'detail_animal_badger',
  'detail_animal_raven',
  'detail_animal_eel',
  'detail_animal_axolotl',
  'detail_animal_peacock',
  'detail_animal_lobster',
  'detail_animal_spider',
  'detail_animal_bat',
  'detail_animal_tortoise',
] as const;

export type MasterworkPropKind = (typeof MASTERWORK_PROP_KINDS)[number];
export type MasterworkHumanoidKind = (typeof MASTERWORK_HUMANOID_KINDS)[number];
export type MasterworkCreatureKind = (typeof MASTERWORK_CREATURE_KINDS)[number];
export type MasterworkModelKind =
  | MasterworkPropKind
  | MasterworkHumanoidKind
  | MasterworkCreatureKind;

export type MasterworkPropForm =
  | 'casework'
  | 'chair'
  | 'celestial'
  | 'audio'
  | 'communication'
  | 'service'
  | 'cart'
  | 'divider'
  | 'transit'
  | 'optical'
  | 'aquatic'
  | 'specimen'
  | 'ritual'
  | 'automaton'
  | 'display'
  | 'textile'
  | 'press'
  | 'workshop'
  | 'medical';

export interface MasterworkFamilyDefinition {
  id: string;
  kind: MasterworkModelKind;
  label: string;
  category: AssetCategory;
  tags: string[];
  scale: { x: number; y: number; z: number };
  form?: MasterworkPropForm;
  behavior?: EntityBehavior;
}

const prop = (
  id: string,
  kind: MasterworkPropKind,
  label: string,
  category: 'furniture' | 'fixture' | 'decor' | 'anomaly',
  tags: string[],
  scale: { x: number; y: number; z: number },
  form: MasterworkPropForm,
): MasterworkFamilyDefinition => ({ id, kind, label, category, tags, scale, form });

export const MASTERWORK_PROP_FAMILIES: MasterworkFamilyDefinition[] = [
  prop('masterwork_writing_bureau', 'detail_baroque_writing_bureau', 'baroque writing bureau', 'furniture', ['home', 'archive', 'hotel', 'ceremonial'], { x: 1.9, y: 2.05, z: 0.95 }, 'casework'),
  prop('masterwork_key_cabinet', 'detail_hotel_key_cabinet', 'numbered hotel key cabinet', 'furniture', ['hotel', 'lobby', 'archive', 'motel'], { x: 1.65, y: 2.25, z: 0.55 }, 'casework'),
  prop('masterwork_barber_chair', 'detail_hydraulic_barber_chair', 'hydraulic barber chair', 'furniture', ['retail', 'service', 'clinic', 'hotel'], { x: 1.15, y: 1.65, z: 1.45 }, 'chair'),
  prop('masterwork_shoe_throne', 'detail_shoe_shine_throne', 'shoe-shine throne', 'furniture', ['station', 'hotel', 'service', 'lobby'], { x: 1.35, y: 1.85, z: 1.55 }, 'chair'),
  prop('masterwork_orrery', 'detail_astronomical_orrery', 'clockwork astronomical orrery', 'fixture', ['museum', 'school', 'tech', 'ceremonial'], { x: 1.8, y: 2.1, z: 1.8 }, 'celestial'),
  prop('masterwork_planetarium', 'detail_planetarium_projector', 'many-lensed planetarium projector', 'fixture', ['museum', 'cinema', 'tech', 'school'], { x: 1.65, y: 2.35, z: 1.65 }, 'celestial'),
  prop('masterwork_phonograph', 'detail_phonograph_cabinet', 'phonograph record cabinet', 'furniture', ['home', 'hotel', 'archive', 'leisure'], { x: 1.55, y: 1.5, z: 0.82 }, 'audio'),
  prop('masterwork_gramophone', 'detail_gramophone_horn', 'oversized gramophone horn', 'fixture', ['hotel', 'museum', 'cinema', 'haunted'], { x: 1.55, y: 1.85, z: 1.35 }, 'audio'),
  prop('masterwork_telegraph', 'detail_telegraph_station', 'brass telegraph station', 'fixture', ['office', 'station', 'archive', 'tech'], { x: 1.75, y: 1.55, z: 0.88 }, 'communication'),
  prop('masterwork_pneumatic_tubes', 'detail_pneumatic_tube_terminal', 'pneumatic message terminal', 'fixture', ['office', 'hospital', 'industrial', 'tech'], { x: 1.7, y: 2.25, z: 0.75 }, 'communication'),
  prop('masterwork_soda_fountain', 'detail_pharmacy_soda_fountain', 'pharmacy soda fountain', 'furniture', ['food', 'clinic', 'retail', 'hotel'], { x: 2.65, y: 1.55, z: 1.15 }, 'service'),
  prop('masterwork_pastry_trolley', 'detail_pastry_trolley', 'glass-domed pastry trolley', 'fixture', ['food', 'hotel', 'banquet', 'retail'], { x: 1.7, y: 1.45, z: 0.9 }, 'service'),
  prop('masterwork_tea_cart', 'detail_tea_service_cart', 'silver tea service cart', 'fixture', ['hotel', 'banquet', 'home', 'service'], { x: 1.65, y: 1.35, z: 0.9 }, 'cart'),
  prop('masterwork_funeral_flowers', 'detail_funeral_flower_stand', 'funeral flower stand', 'decor', ['chapel', 'ceremonial', 'hotel', 'haunted'], { x: 1.45, y: 2.15, z: 0.85 }, 'cart'),
  prop('masterwork_room_divider', 'detail_folding_room_divider', 'embroidered folding room divider', 'furniture', ['home', 'hotel', 'clinic', 'ceremonial'], { x: 2.8, y: 2.35, z: 0.38 }, 'divider'),
  prop('masterwork_coat_check', 'detail_coat_check_island', 'rotating coat-check island', 'furniture', ['hotel', 'lobby', 'station', 'theater'], { x: 2.1, y: 2.35, z: 2.1 }, 'divider'),
  prop('masterwork_train_seat', 'detail_train_compartment_seat', 'upholstered train compartment seat', 'furniture', ['transit', 'station', 'hotel', 'night'], { x: 2.25, y: 1.65, z: 1.15 }, 'transit'),
  prop('masterwork_chart_table', 'detail_nautical_chart_table', 'illuminated nautical chart table', 'furniture', ['aquarium', 'office', 'museum', 'wet'], { x: 2.1, y: 1.35, z: 1.35 }, 'transit'),
  prop('masterwork_telescope', 'detail_observatory_telescope', 'observatory telescope', 'fixture', ['museum', 'school', 'field', 'tech'], { x: 1.65, y: 2.55, z: 2.3 }, 'optical'),
  prop('masterwork_diving_helmet', 'detail_diving_helmet_stand', 'antique diving helmet display', 'decor', ['aquarium', 'museum', 'wet', 'industrial'], { x: 1.1, y: 2.0, z: 1.1 }, 'optical'),
  prop('masterwork_filter_bank', 'detail_aquarium_filter_bank', 'aquarium filter bank', 'fixture', ['aquarium', 'industrial', 'lab', 'wet'], { x: 2.25, y: 2.05, z: 0.95 }, 'aquatic'),
  prop('masterwork_taxidermy', 'detail_taxidermy_case', 'taxidermy habitat case', 'decor', ['museum', 'archive', 'garden', 'uncanny'], { x: 2.15, y: 2.0, z: 1.05 }, 'aquatic'),
  prop('masterwork_insect_drawers', 'detail_insect_display_drawers', 'entomology display drawers', 'furniture', ['museum', 'lab', 'archive', 'garden'], { x: 1.8, y: 1.85, z: 0.72 }, 'specimen'),
  prop('masterwork_reliquary', 'detail_reliquary_pedestal', 'glass reliquary pedestal', 'anomaly', ['chapel', 'museum', 'ceremonial', 'haunted'], { x: 1.25, y: 2.15, z: 1.25 }, 'specimen'),
  prop('masterwork_votive_rack', 'detail_votive_candle_rack', 'tiered votive candle rack', 'fixture', ['chapel', 'cathedral', 'ceremonial', 'haunted'], { x: 1.85, y: 1.75, z: 0.82 }, 'ritual'),
  prop('masterwork_music_box', 'detail_music_box_cabinet', 'mechanical music-box cabinet', 'anomaly', ['home', 'museum', 'hotel', 'haunted'], { x: 1.45, y: 1.65, z: 0.82 }, 'ritual'),
  prop('masterwork_automaton_stage', 'detail_automaton_stage', 'clockwork automaton stage', 'anomaly', ['museum', 'theater', 'ceremonial', 'uncanny'], { x: 2.25, y: 2.45, z: 1.15 }, 'automaton'),
  prop('masterwork_puppet_theater', 'detail_puppet_theater', 'velvet puppet theater', 'anomaly', ['theater', 'school', 'hotel', 'uncanny'], { x: 2.15, y: 2.65, z: 1.0 }, 'automaton'),
  prop('masterwork_fitting_platform', 'detail_mannequin_fitting_platform', 'mannequin fitting platform', 'fixture', ['retail', 'theater', 'hotel', 'uncanny'], { x: 1.75, y: 2.45, z: 1.75 }, 'display'),
  prop('masterwork_sideboard', 'detail_banquet_sideboard', 'carved banquet sideboard', 'furniture', ['banquet', 'hotel', 'home', 'ceremonial'], { x: 2.35, y: 1.65, z: 0.75 }, 'display'),
  prop('masterwork_loom', 'detail_loom_workstation', 'threaded floor loom', 'fixture', ['industrial', 'home', 'museum', 'school'], { x: 2.05, y: 2.2, z: 1.25 }, 'textile'),
  prop('masterwork_kiln', 'detail_ceramic_kiln', 'glazed ceramic kiln', 'fixture', ['industrial', 'school', 'museum', 'home'], { x: 1.45, y: 1.75, z: 1.45 }, 'textile'),
  prop('masterwork_press', 'detail_printing_press', 'cast-iron printing press', 'fixture', ['industrial', 'archive', 'office', 'school'], { x: 2.05, y: 2.15, z: 1.35 }, 'press'),
  prop('masterwork_type_case', 'detail_letterpress_type_case', 'letterpress type cabinet', 'furniture', ['archive', 'industrial', 'office', 'school'], { x: 1.85, y: 2.0, z: 0.72 }, 'press'),
  prop('masterwork_clock_bench', 'detail_clockmaker_bench', 'clockmaker repair bench', 'furniture', ['industrial', 'museum', 'archive', 'tech'], { x: 2.05, y: 1.65, z: 0.95 }, 'workshop'),
  prop('masterwork_watch_lamp', 'detail_watchmaker_lamp', 'articulated watchmaker lamp', 'fixture', ['industrial', 'museum', 'office', 'tech'], { x: 1.15, y: 2.05, z: 1.15 }, 'workshop'),
  prop('masterwork_electrotherapy', 'detail_electrotherapy_machine', 'dial-covered electrotherapy machine', 'fixture', ['clinic', 'hospital', 'lab', 'tech'], { x: 1.55, y: 2.15, z: 0.9 }, 'medical'),
  prop('masterwork_iron_lung', 'detail_iron_lung', 'riveted iron lung', 'fixture', ['clinic', 'hospital', 'industrial', 'observation'], { x: 2.65, y: 1.65, z: 1.25 }, 'medical'),
];

const being = (
  id: string,
  kind: MasterworkHumanoidKind | MasterworkCreatureKind,
  label: string,
  category: 'npc' | 'creature',
  tags: string[],
  scale: { x: number; y: number; z: number },
  behavior: EntityBehavior,
): MasterworkFamilyDefinition => ({ id, kind, label, category, tags, scale, behavior });

export const MASTERWORK_BEING_FAMILIES: MasterworkFamilyDefinition[] = [
  being('masterwork_npc_clockmaker', 'detail_figure_clockmaker', 'midnight clockmaker', 'npc', ['industrial', 'museum', 'archive', 'haunted'], { x: 0.9, y: 2.4, z: 0.72 }, 'stare'),
  being('masterwork_npc_diver', 'detail_figure_deep_sea_diver', 'indoor deep-sea diver', 'npc', ['aquarium', 'industrial', 'museum', 'wet'], { x: 1.15, y: 2.55, z: 0.88 }, 'wander'),
  being('masterwork_npc_beekeeper', 'detail_figure_beekeeper', 'hotel beekeeper', 'npc', ['garden', 'hotel', 'field', 'uncanny'], { x: 0.98, y: 2.45, z: 0.78 }, 'orbit'),
  being('masterwork_npc_seamstress', 'detail_figure_seamstress', 'corridor seamstress', 'npc', ['home', 'hotel', 'industrial', 'theater'], { x: 0.9, y: 2.38, z: 0.7 }, 'stare'),
  being('masterwork_npc_radio_operator', 'detail_figure_radio_operator', 'numbers-station radio operator', 'npc', ['tech', 'office', 'archive', 'night'], { x: 0.94, y: 2.42, z: 0.74 }, 'idle'),
  being('masterwork_npc_undertaker', 'detail_figure_undertaker', 'after-hours undertaker', 'npc', ['chapel', 'ceremonial', 'hotel', 'haunted'], { x: 0.96, y: 2.55, z: 0.76 }, 'stare'),
  being('masterwork_npc_magician', 'detail_figure_stage_magician', 'empty-theater magician', 'npc', ['theater', 'hotel', 'ceremonial', 'uncanny'], { x: 0.96, y: 2.52, z: 0.76 }, 'orbit'),
  being('masterwork_npc_archivist', 'detail_figure_night_archivist', 'night-shift archivist', 'npc', ['archive', 'office', 'museum', 'night'], { x: 0.92, y: 2.4, z: 0.72 }, 'wander'),
  being('masterwork_npc_lamplighter', 'detail_figure_lamplighter', 'interior lamplighter', 'npc', ['hotel', 'station', 'night', 'ceremonial'], { x: 0.94, y: 2.5, z: 0.74 }, 'wander'),
  being('masterwork_creature_hare', 'detail_animal_hare', 'velvet corridor hare', 'creature', ['garden', 'hotel', 'field', 'night'], { x: 0.85, y: 1.3, z: 1.15 }, 'wander'),
  being('masterwork_creature_badger', 'detail_animal_badger', 'archive badger', 'creature', ['garden', 'archive', 'night', 'industrial'], { x: 1.05, y: 0.95, z: 1.55 }, 'wander'),
  being('masterwork_creature_raven', 'detail_animal_raven', 'reception raven', 'creature', ['outdoor', 'hotel', 'archive', 'night'], { x: 0.92, y: 1.25, z: 1.05 }, 'stare'),
  being('masterwork_creature_eel', 'detail_animal_eel', 'carpet-swimming eel', 'creature', ['aquarium', 'hotel', 'wet', 'dream'], { x: 0.75, y: 0.72, z: 2.65 }, 'orbit'),
  being('masterwork_creature_axolotl', 'detail_animal_axolotl', 'waiting-room axolotl', 'creature', ['aquarium', 'clinic', 'wet', 'dream'], { x: 0.95, y: 0.75, z: 1.45 }, 'stare'),
  being('masterwork_creature_peacock', 'detail_animal_peacock', 'banquet peacock', 'creature', ['garden', 'banquet', 'hotel', 'ceremonial'], { x: 1.25, y: 1.85, z: 1.55 }, 'orbit'),
  being('masterwork_creature_lobster', 'detail_animal_lobster', 'brass lobby lobster', 'creature', ['aquarium', 'hotel', 'industrial', 'wet'], { x: 1.35, y: 0.72, z: 1.65 }, 'wander'),
  being('masterwork_creature_spider', 'detail_animal_spider', 'chandelier spider', 'creature', ['hotel', 'museum', 'night', 'uncanny'], { x: 1.55, y: 0.72, z: 1.55 }, 'orbit'),
  being('masterwork_creature_bat', 'detail_animal_bat', 'cloakroom bat', 'creature', ['hotel', 'chapel', 'night', 'uncanny'], { x: 1.45, y: 0.85, z: 0.55 }, 'orbit'),
  being('masterwork_creature_tortoise', 'detail_animal_tortoise', 'carpeted tortoise', 'creature', ['garden', 'hotel', 'museum', 'liminal'], { x: 1.25, y: 0.82, z: 1.65 }, 'wander'),
];

export const MASTERWORK_FAMILY_DEFINITIONS = [
  ...MASTERWORK_PROP_FAMILIES,
  ...MASTERWORK_BEING_FAMILIES,
];

export const MASTERWORK_BOUNDS: Record<MasterworkModelKind, { w: number; h: number; d: number }> =
  Object.fromEntries(MASTERWORK_FAMILY_DEFINITIONS.map((family) => [
    family.kind,
    { w: family.scale.x, h: family.scale.y, d: family.scale.z },
  ])) as Record<MasterworkModelKind, { w: number; h: number; d: number }>;

const VARIANT_LABELS = [
  'hand-polished',
  'storm-tarnished',
  'velvet-appointed',
  'nickel-plated',
  'archive-numbered',
  'electrically adapted',
  'mourning-black',
  'impossibly intricate',
] as const;

const VARIANTS_PER_FAMILY = 8;
const ALL_MOODS: MoodAxis[] = ['upper', 'downer', 'static', 'dynamic'];

export const MASTERWORK_ASSETS: AssetDef[] = MASTERWORK_FAMILY_DEFINITIONS.flatMap(
  (family) => Array.from({ length: VARIANTS_PER_FAMILY }, (_, variant) => ({
    id: `${family.id}_${String(variant + 1).padStart(2, '0')}`,
    kind: family.kind,
    label: `${VARIANT_LABELS[variant]} ${family.label}`,
    category: family.category,
    tags: [...family.tags, 'high-detail', 'masterwork'],
    setIds: sceneSetIdsForTags(family.tags),
    moods: [...ALL_MOODS],
    defaultScale: { ...family.scale },
    scaleRange: {
      min: family.category === 'npc' || family.category === 'creature' ? 0.84 : 0.76,
      max: family.category === 'npc' || family.category === 'creature' ? 1.65 : 1.58,
    },
    defaultBehavior: family.behavior,
    linksByDefault: false,
    solidDefault: family.category !== 'npc' && family.category !== 'creature',
    weight: family.category === 'npc' ? 0.92 : family.category === 'creature' ? 0.82 : 1.08,
    renderCost: family.category === 'npc' ? 8 : family.category === 'creature' ? 7 : 5,
    family: family.id,
    variant,
  })),
);

export const MASTERWORK_PROP_ASSET_COUNT = MASTERWORK_ASSETS.filter(
  (asset) => asset.category !== 'npc' && asset.category !== 'creature',
).length;
export const MASTERWORK_BEING_ASSET_COUNT = MASTERWORK_ASSETS.filter(
  (asset) => asset.category === 'npc' || asset.category === 'creature',
).length;
export const MASTERWORK_ASSET_COUNT = MASTERWORK_ASSETS.length;

export function isMasterworkModelKind(kind: string): kind is MasterworkModelKind {
  return kind in MASTERWORK_BOUNDS;
}

export function masterworkFamilyForKind(kind: MasterworkModelKind): MasterworkFamilyDefinition {
  return MASTERWORK_FAMILY_DEFINITIONS.find((family) => family.kind === kind)!;
}
