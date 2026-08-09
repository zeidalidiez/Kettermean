import type { EntityBehavior, MoodAxis } from '../types';
import type { AssetCategory, AssetDef } from './assetCatalog';
import { sceneSetIdsForTags } from './sceneSets';

/**
 * Fourth collection: materially denser, exhibition-scale models with a unique
 * internal kind for every family.  The `atelier_` namespace deliberately does
 * not overlap the detail/exhibition builders that preceded it.
 */
export const ATELIER_PROP_KINDS = [
  'atelier_prop_cloud_atlas_cabinet',
  'atelier_prop_specimen_armoire',
  'atelier_prop_gyroscopic_reading_chair',
  'atelier_prop_automated_portrait_chair',
  'atelier_prop_tide_clock_console',
  'atelier_prop_eclipse_forecasting_engine',
  'atelier_prop_weather_harp',
  'atelier_prop_resonance_gramophone_array',
  'atelier_prop_pneumatic_mail_sorter',
  'atelier_prop_cryptographic_teletype',
  'atelier_prop_perfumery_organ',
  'atelier_prop_apothecary_island',
  'atelier_prop_surgical_carousel',
  'atelier_prop_dental_phantom_station',
  'atelier_prop_kinetic_chandelier',
  'atelier_prop_aurora_light_organ',
  'atelier_prop_hydraulic_map_table',
  'atelier_prop_subterranean_transit_model',
  'atelier_prop_rain_orchestra',
  'atelier_prop_thunder_sheet_cabinet',
  'atelier_prop_seed_vault_indexer',
  'atelier_prop_mycology_incubator',
  'atelier_prop_mechanical_aviary',
  'atelier_prop_robotic_orchid_trellis',
  'atelier_prop_ceremonial_tea_robot',
  'atelier_prop_silver_banquet_fountain',
  'atelier_prop_dream_analysis_bureau',
  'atelier_prop_mnemonic_filing_engine',
  'atelier_prop_navigation_throne',
  'atelier_prop_polar_expedition_sledge',
  'atelier_prop_fossil_reconstruction_bench',
  'atelier_prop_mineral_assay_tower',
  'atelier_prop_tidal_aquarium_clock',
  'atelier_prop_jellyfish_observation_column',
  'atelier_prop_clockwork_proscenium',
  'atelier_prop_shadow_puppet_orchestra',
  'atelier_prop_haberdashery_mirror',
  'atelier_prop_glove_fitting_carousel',
  'atelier_prop_municipal_complaint_kiosk',
  'atelier_prop_pneumatic_voting_machine',
  'atelier_prop_relic_xray_cabinet',
  'atelier_prop_ectoplasm_condensation_rig',
  'atelier_prop_laundry_folding_automaton',
  'atelier_prop_carpet_pattern_loom',
  'atelier_prop_indoor_weather_vane',
  'atelier_prop_barometric_storm_altar',
  'atelier_prop_miniature_hotel_cutaway',
  'atelier_prop_recursive_dollhouse',
  'atelier_prop_spiral_archive_lectern',
  'atelier_prop_impossible_floorplan_model',
] as const;

export const ATELIER_HUMANOID_KINDS = [
  'atelier_figure_weather_observer',
  'atelier_figure_sleep_architect',
  'atelier_figure_railway_inspector',
  'atelier_figure_municipal_medium',
  'atelier_figure_botanical_anatomist',
  'atelier_figure_tide_keeper',
  'atelier_figure_scent_archivist',
  'atelier_figure_glove_librarian',
  'atelier_figure_eclipse_usher',
  'atelier_figure_pneumatic_courier',
  'atelier_figure_mineral_curator',
  'atelier_figure_ballroom_mechanic',
  'atelier_figure_dream_stenographer',
  'atelier_figure_aquarium_custodian',
  'atelier_figure_clock_choir_conductor',
] as const;

export const ATELIER_CREATURE_KINDS = [
  'atelier_animal_pangolin',
  'atelier_animal_crane',
  'atelier_animal_octopus',
  'atelier_animal_firefly_swarm',
  'atelier_animal_antelope',
  'atelier_animal_seal',
  'atelier_animal_beetle',
  'atelier_animal_jellyfish',
  'atelier_animal_salamander',
  'atelier_animal_capybara',
] as const;

export type AtelierPropKind = (typeof ATELIER_PROP_KINDS)[number];
export type AtelierHumanoidKind = (typeof ATELIER_HUMANOID_KINDS)[number];
export type AtelierCreatureKind = (typeof ATELIER_CREATURE_KINDS)[number];
export type AtelierModelKind = AtelierPropKind | AtelierHumanoidKind | AtelierCreatureKind;

export type AtelierPropForm =
  | 'archive'
  | 'portrait'
  | 'forecast'
  | 'acoustic'
  | 'message'
  | 'apothecary'
  | 'clinical'
  | 'illumination'
  | 'cartographic'
  | 'weather'
  | 'botanical'
  | 'aviary'
  | 'service'
  | 'memory'
  | 'expedition'
  | 'geological'
  | 'aquatic'
  | 'theatrical'
  | 'tailoring'
  | 'civic'
  | 'paranormal'
  | 'textile'
  | 'meteorological'
  | 'architectural'
  | 'recursive';

export interface AtelierFamilyDefinition {
  id: string;
  kind: AtelierModelKind;
  label: string;
  category: AssetCategory;
  tags: string[];
  scale: { x: number; y: number; z: number };
  form?: AtelierPropForm;
  behavior?: EntityBehavior;
}

const prop = (
  id: string,
  kind: AtelierPropKind,
  label: string,
  category: 'furniture' | 'fixture' | 'decor' | 'anomaly',
  tags: string[],
  scale: { x: number; y: number; z: number },
  form: AtelierPropForm,
): AtelierFamilyDefinition => ({ id, kind, label, category, tags, scale, form });

export const ATELIER_PROP_FAMILIES: AtelierFamilyDefinition[] = [
  prop('atelier_cloud_atlas', 'atelier_prop_cloud_atlas_cabinet', 'illuminated cloud-atlas cabinet', 'furniture', ['archive', 'museum', 'weather', 'school'], { x: 2.05, y: 2.45, z: 0.86 }, 'archive'),
  prop('atelier_specimen_armoire', 'atelier_prop_specimen_armoire', 'pneumatic specimen armoire', 'furniture', ['archive', 'lab', 'museum', 'industrial'], { x: 1.85, y: 2.55, z: 0.92 }, 'archive'),
  prop('atelier_gyro_chair', 'atelier_prop_gyroscopic_reading_chair', 'gyroscopic reading chair', 'furniture', ['library', 'home', 'tech', 'dream'], { x: 1.55, y: 1.8, z: 1.65 }, 'portrait'),
  prop('atelier_portrait_chair', 'atelier_prop_automated_portrait_chair', 'automated portrait-sitting chair', 'anomaly', ['museum', 'hotel', 'tech', 'uncanny'], { x: 1.45, y: 2.25, z: 1.45 }, 'portrait'),
  prop('atelier_tide_console', 'atelier_prop_tide_clock_console', 'tide-clock forecasting console', 'fixture', ['aquarium', 'museum', 'tech', 'wet'], { x: 2.25, y: 1.85, z: 1.05 }, 'forecast'),
  prop('atelier_eclipse_engine', 'atelier_prop_eclipse_forecasting_engine', 'eclipse forecasting engine', 'anomaly', ['museum', 'school', 'tech', 'night'], { x: 2.15, y: 2.5, z: 1.75 }, 'forecast'),
  prop('atelier_weather_harp', 'atelier_prop_weather_harp', 'self-tuning weather harp', 'anomaly', ['garden', 'museum', 'night', 'weather'], { x: 2.15, y: 2.75, z: 1.25 }, 'acoustic'),
  prop('atelier_resonance_array', 'atelier_prop_resonance_gramophone_array', 'many-horn resonance array', 'fixture', ['cinema', 'hotel', 'museum', 'haunted'], { x: 2.35, y: 2.35, z: 1.65 }, 'acoustic'),
  prop('atelier_mail_sorter', 'atelier_prop_pneumatic_mail_sorter', 'pneumatic hotel mail sorter', 'fixture', ['hotel', 'office', 'industrial', 'communication'], { x: 2.55, y: 2.3, z: 0.98 }, 'message'),
  prop('atelier_teletype', 'atelier_prop_cryptographic_teletype', 'cryptographic teletype bureau', 'furniture', ['office', 'archive', 'tech', 'night'], { x: 2.25, y: 1.65, z: 1.05 }, 'message'),
  prop('atelier_perfumery_organ', 'atelier_prop_perfumery_organ', 'forty-note perfumery organ', 'furniture', ['retail', 'hotel', 'garden', 'archive'], { x: 2.45, y: 2.05, z: 1.05 }, 'apothecary'),
  prop('atelier_apothecary_island', 'atelier_prop_apothecary_island', 'rotating apothecary island', 'fixture', ['clinic', 'retail', 'lab', 'hotel'], { x: 2.2, y: 2.15, z: 2.2 }, 'apothecary'),
  prop('atelier_surgical_carousel', 'atelier_prop_surgical_carousel', 'articulated surgical instrument carousel', 'fixture', ['clinic', 'hospital', 'observation', 'industrial'], { x: 1.85, y: 2.35, z: 1.85 }, 'clinical'),
  prop('atelier_dental_station', 'atelier_prop_dental_phantom_station', 'many-jawed dental phantom station', 'anomaly', ['clinic', 'hospital', 'school', 'uncanny'], { x: 1.8, y: 2.25, z: 1.35 }, 'clinical'),
  prop('atelier_kinetic_chandelier', 'atelier_prop_kinetic_chandelier', 'counterweighted kinetic chandelier', 'decor', ['hotel', 'theater', 'ceremonial', 'tech'], { x: 2.4, y: 2.85, z: 2.4 }, 'illumination'),
  prop('atelier_aurora_organ', 'atelier_prop_aurora_light_organ', 'aurora-colored light organ', 'anomaly', ['theater', 'cinema', 'tech', 'dream'], { x: 2.5, y: 2.3, z: 1.2 }, 'illumination'),
  prop('atelier_map_table', 'atelier_prop_hydraulic_map_table', 'hydraulic relief-map table', 'furniture', ['office', 'museum', 'transit', 'industrial'], { x: 2.75, y: 1.45, z: 1.65 }, 'cartographic'),
  prop('atelier_transit_model', 'atelier_prop_subterranean_transit_model', 'working subterranean transit model', 'anomaly', ['station', 'transit', 'museum', 'tech'], { x: 2.85, y: 1.55, z: 1.75 }, 'cartographic'),
  prop('atelier_rain_orchestra', 'atelier_prop_rain_orchestra', 'indoor rain orchestra', 'anomaly', ['hotel', 'wet', 'theater', 'dream'], { x: 2.55, y: 2.65, z: 1.35 }, 'weather'),
  prop('atelier_thunder_cabinet', 'atelier_prop_thunder_sheet_cabinet', 'automated thunder-sheet cabinet', 'fixture', ['theater', 'industrial', 'storm', 'haunted'], { x: 2.1, y: 2.6, z: 1.15 }, 'weather'),
  prop('atelier_seed_indexer', 'atelier_prop_seed_vault_indexer', 'spiral seed-vault indexer', 'fixture', ['garden', 'archive', 'lab', 'school'], { x: 2.15, y: 2.45, z: 2.15 }, 'botanical'),
  prop('atelier_mycology_incubator', 'atelier_prop_mycology_incubator', 'moonlit mycology incubator', 'anomaly', ['garden', 'lab', 'clinic', 'dream'], { x: 2.15, y: 2.35, z: 1.25 }, 'botanical'),
  prop('atelier_mechanical_aviary', 'atelier_prop_mechanical_aviary', 'clockwork mechanical aviary', 'anomaly', ['garden', 'museum', 'tech', 'uncanny'], { x: 2.5, y: 2.75, z: 1.75 }, 'aviary'),
  prop('atelier_orchid_trellis', 'atelier_prop_robotic_orchid_trellis', 'robot-tended orchid trellis', 'decor', ['garden', 'hotel', 'tech', 'ceremonial'], { x: 2.35, y: 2.65, z: 1.15 }, 'aviary'),
  prop('atelier_tea_robot', 'atelier_prop_ceremonial_tea_robot', 'ceremonial tea-serving automaton', 'anomaly', ['hotel', 'banquet', 'home', 'tech'], { x: 1.65, y: 2.1, z: 1.55 }, 'service'),
  prop('atelier_banquet_fountain', 'atelier_prop_silver_banquet_fountain', 'silver banquet fountain', 'decor', ['banquet', 'hotel', 'food', 'ceremonial'], { x: 2.2, y: 2.25, z: 2.2 }, 'service'),
  prop('atelier_dream_bureau', 'atelier_prop_dream_analysis_bureau', 'dream-analysis writing bureau', 'anomaly', ['clinic', 'archive', 'office', 'dream'], { x: 2.35, y: 2.15, z: 1.05 }, 'memory'),
  prop('atelier_mnemonic_engine', 'atelier_prop_mnemonic_filing_engine', 'mnemonic filing engine', 'anomaly', ['archive', 'office', 'tech', 'uncanny'], { x: 2.35, y: 2.45, z: 1.05 }, 'memory'),
  prop('atelier_navigation_throne', 'atelier_prop_navigation_throne', 'celestial navigation throne', 'furniture', ['transit', 'museum', 'night', 'ceremonial'], { x: 1.8, y: 2.4, z: 1.85 }, 'expedition'),
  prop('atelier_polar_sledge', 'atelier_prop_polar_expedition_sledge', 'museum-lit polar expedition sledge', 'decor', ['museum', 'outdoor', 'transit', 'night'], { x: 1.95, y: 1.55, z: 3.1 }, 'expedition'),
  prop('atelier_fossil_bench', 'atelier_prop_fossil_reconstruction_bench', 'fossil reconstruction workbench', 'furniture', ['museum', 'lab', 'school', 'archive'], { x: 2.7, y: 1.75, z: 1.15 }, 'geological'),
  prop('atelier_assay_tower', 'atelier_prop_mineral_assay_tower', 'prismatic mineral assay tower', 'fixture', ['museum', 'lab', 'industrial', 'tech'], { x: 1.65, y: 2.75, z: 1.65 }, 'geological'),
  prop('atelier_aquarium_clock', 'atelier_prop_tidal_aquarium_clock', 'tidal aquarium clock', 'anomaly', ['aquarium', 'museum', 'wet', 'tech'], { x: 2.05, y: 2.45, z: 1.05 }, 'aquatic'),
  prop('atelier_jelly_column', 'atelier_prop_jellyfish_observation_column', 'jellyfish observation column', 'decor', ['aquarium', 'hotel', 'wet', 'dream'], { x: 1.65, y: 2.75, z: 1.65 }, 'aquatic'),
  prop('atelier_proscenium', 'atelier_prop_clockwork_proscenium', 'tabletop clockwork proscenium', 'anomaly', ['theater', 'museum', 'ceremonial', 'tech'], { x: 2.75, y: 2.5, z: 1.15 }, 'theatrical'),
  prop('atelier_shadow_orchestra', 'atelier_prop_shadow_puppet_orchestra', 'self-playing shadow-puppet orchestra', 'anomaly', ['theater', 'cinema', 'hotel', 'uncanny'], { x: 2.65, y: 2.35, z: 1.15 }, 'theatrical'),
  prop('atelier_haberdashery_mirror', 'atelier_prop_haberdashery_mirror', 'many-angled haberdashery mirror', 'furniture', ['retail', 'hotel', 'theater', 'uncanny'], { x: 2.15, y: 2.6, z: 0.85 }, 'tailoring'),
  prop('atelier_glove_carousel', 'atelier_prop_glove_fitting_carousel', 'mechanical glove-fitting carousel', 'fixture', ['retail', 'hotel', 'theater', 'tech'], { x: 2.0, y: 2.35, z: 2.0 }, 'tailoring'),
  prop('atelier_complaint_kiosk', 'atelier_prop_municipal_complaint_kiosk', 'brass municipal complaint kiosk', 'fixture', ['civic', 'office', 'lobby', 'uncanny'], { x: 1.65, y: 2.5, z: 1.25 }, 'civic'),
  prop('atelier_voting_machine', 'atelier_prop_pneumatic_voting_machine', 'pneumatic voting machine', 'anomaly', ['civic', 'office', 'industrial', 'tech'], { x: 2.05, y: 2.25, z: 1.05 }, 'civic'),
  prop('atelier_relic_xray', 'atelier_prop_relic_xray_cabinet', 'reliquary X-ray cabinet', 'anomaly', ['chapel', 'clinic', 'museum', 'observation'], { x: 2.15, y: 2.5, z: 1.0 }, 'paranormal'),
  prop('atelier_ectoplasm_rig', 'atelier_prop_ectoplasm_condensation_rig', 'ectoplasm condensation apparatus', 'anomaly', ['lab', 'hotel', 'haunted', 'tech'], { x: 2.2, y: 2.5, z: 1.65 }, 'paranormal'),
  prop('atelier_folding_automaton', 'atelier_prop_laundry_folding_automaton', 'linen-folding automaton', 'fixture', ['laundry', 'hotel', 'industrial', 'service'], { x: 2.25, y: 2.15, z: 1.25 }, 'textile'),
  prop('atelier_carpet_loom', 'atelier_prop_carpet_pattern_loom', 'endless carpet-pattern loom', 'anomaly', ['hotel', 'industrial', 'home', 'uncanny'], { x: 2.55, y: 2.45, z: 1.5 }, 'textile'),
  prop('atelier_weather_vane', 'atelier_prop_indoor_weather_vane', 'indoor forecasting weather vane', 'anomaly', ['hotel', 'outdoor', 'tech', 'dream'], { x: 2.25, y: 2.75, z: 2.25 }, 'meteorological'),
  prop('atelier_storm_altar', 'atelier_prop_barometric_storm_altar', 'barometric storm altar', 'anomaly', ['chapel', 'museum', 'storm', 'tech'], { x: 2.35, y: 2.4, z: 1.45 }, 'meteorological'),
  prop('atelier_hotel_cutaway', 'atelier_prop_miniature_hotel_cutaway', 'inhabited miniature hotel cutaway', 'anomaly', ['hotel', 'museum', 'architecture', 'uncanny'], { x: 2.65, y: 2.55, z: 1.15 }, 'architectural'),
  prop('atelier_dollhouse', 'atelier_prop_recursive_dollhouse', 'recursive corridor dollhouse', 'anomaly', ['home', 'hotel', 'nursery', 'dream'], { x: 2.15, y: 2.35, z: 1.45 }, 'architectural'),
  prop('atelier_spiral_lectern', 'atelier_prop_spiral_archive_lectern', 'spiral archive lectern', 'furniture', ['archive', 'museum', 'school', 'architecture'], { x: 1.95, y: 2.35, z: 1.95 }, 'recursive'),
  prop('atelier_floorplan', 'atelier_prop_impossible_floorplan_model', 'impossible rotating floorplan', 'anomaly', ['architecture', 'office', 'museum', 'dream'], { x: 2.65, y: 1.85, z: 2.15 }, 'recursive'),
];

const being = (
  id: string,
  kind: AtelierHumanoidKind | AtelierCreatureKind,
  label: string,
  category: 'npc' | 'creature',
  tags: string[],
  scale: { x: number; y: number; z: number },
  behavior: EntityBehavior,
): AtelierFamilyDefinition => ({ id, kind, label, category, tags, scale, behavior });

export const ATELIER_BEING_FAMILIES: AtelierFamilyDefinition[] = [
  being('atelier_npc_weather_observer', 'atelier_figure_weather_observer', 'indoor weather observer', 'npc', ['museum', 'outdoor', 'tech', 'storm'], { x: 1.02, y: 2.58, z: 0.82 }, 'stare'),
  being('atelier_npc_sleep_architect', 'atelier_figure_sleep_architect', 'licensed sleep architect', 'npc', ['hotel', 'office', 'dream', 'uncanny'], { x: 0.98, y: 2.52, z: 0.8 }, 'wander'),
  being('atelier_npc_rail_inspector', 'atelier_figure_railway_inspector', 'platformless railway inspector', 'npc', ['station', 'transit', 'industrial', 'night'], { x: 1.0, y: 2.56, z: 0.8 }, 'stare'),
  being('atelier_npc_medium', 'atelier_figure_municipal_medium', 'municipal records medium', 'npc', ['civic', 'office', 'archive', 'haunted'], { x: 0.98, y: 2.5, z: 0.78 }, 'orbit'),
  being('atelier_npc_anatomist', 'atelier_figure_botanical_anatomist', 'botanical anatomist', 'npc', ['garden', 'lab', 'museum', 'uncanny'], { x: 1.02, y: 2.56, z: 0.84 }, 'wander'),
  being('atelier_npc_tide_keeper', 'atelier_figure_tide_keeper', 'indoor tide keeper', 'npc', ['aquarium', 'hotel', 'wet', 'ceremonial'], { x: 1.0, y: 2.62, z: 0.82 }, 'orbit'),
  being('atelier_npc_scent_archivist', 'atelier_figure_scent_archivist', 'sealed-vial scent archivist', 'npc', ['archive', 'retail', 'hotel', 'garden'], { x: 0.98, y: 2.5, z: 0.78 }, 'stare'),
  being('atelier_npc_glove_librarian', 'atelier_figure_glove_librarian', 'lost-glove librarian', 'npc', ['archive', 'retail', 'hotel', 'uncanny'], { x: 0.96, y: 2.48, z: 0.78 }, 'wander'),
  being('atelier_npc_eclipse_usher', 'atelier_figure_eclipse_usher', 'eclipse theater usher', 'npc', ['theater', 'cinema', 'night', 'ceremonial'], { x: 1.0, y: 2.6, z: 0.8 }, 'stare'),
  being('atelier_npc_courier', 'atelier_figure_pneumatic_courier', 'pneumatic message courier', 'npc', ['office', 'transit', 'industrial', 'tech'], { x: 1.02, y: 2.57, z: 0.84 }, 'wander'),
  being('atelier_npc_mineral_curator', 'atelier_figure_mineral_curator', 'prismatic mineral curator', 'npc', ['museum', 'lab', 'archive', 'ceremonial'], { x: 1.0, y: 2.54, z: 0.82 }, 'idle'),
  being('atelier_npc_ballroom_mechanic', 'atelier_figure_ballroom_mechanic', 'ballroom machinery mechanic', 'npc', ['hotel', 'industrial', 'banquet', 'tech'], { x: 1.04, y: 2.6, z: 0.86 }, 'wander'),
  being('atelier_npc_stenographer', 'atelier_figure_dream_stenographer', 'dream-court stenographer', 'npc', ['office', 'civic', 'dream', 'archive'], { x: 0.98, y: 2.51, z: 0.8 }, 'stare'),
  being('atelier_npc_aquarium_custodian', 'atelier_figure_aquarium_custodian', 'after-hours aquarium custodian', 'npc', ['aquarium', 'service', 'night', 'wet'], { x: 1.02, y: 2.56, z: 0.84 }, 'wander'),
  being('atelier_npc_clock_conductor', 'atelier_figure_clock_choir_conductor', 'clock-choir conductor', 'npc', ['museum', 'theater', 'ceremonial', 'haunted'], { x: 1.02, y: 2.64, z: 0.82 }, 'orbit'),
  being('atelier_creature_pangolin', 'atelier_animal_pangolin', 'brass-scaled archive pangolin', 'creature', ['archive', 'garden', 'industrial', 'night'], { x: 1.2, y: 0.98, z: 1.85 }, 'wander'),
  being('atelier_creature_crane', 'atelier_animal_crane', 'lobby reflecting-pool crane', 'creature', ['hotel', 'garden', 'wet', 'ceremonial'], { x: 1.1, y: 2.35, z: 1.25 }, 'stare'),
  being('atelier_creature_octopus', 'atelier_animal_octopus', 'carpet-walking velvet octopus', 'creature', ['aquarium', 'hotel', 'wet', 'dream'], { x: 1.65, y: 1.25, z: 1.65 }, 'orbit'),
  being('atelier_creature_fireflies', 'atelier_animal_firefly_swarm', 'numbered firefly constellation', 'creature', ['garden', 'night', 'tech', 'dream'], { x: 1.85, y: 1.75, z: 1.85 }, 'orbit'),
  being('atelier_creature_antelope', 'atelier_animal_antelope', 'ballroom glass-horn antelope', 'creature', ['hotel', 'garden', 'ceremonial', 'uncanny'], { x: 1.35, y: 2.45, z: 2.1 }, 'stare'),
  being('atelier_creature_seal', 'atelier_animal_seal', 'dry aquarium harbor seal', 'creature', ['aquarium', 'hotel', 'wet', 'liminal'], { x: 1.25, y: 1.05, z: 2.05 }, 'wander'),
  being('atelier_creature_beetle', 'atelier_animal_beetle', 'lacquered service-tunnel beetle', 'creature', ['industrial', 'garden', 'service', 'uncanny'], { x: 1.35, y: 0.85, z: 1.7 }, 'wander'),
  being('atelier_creature_jellyfish', 'atelier_animal_jellyfish', 'air-swimming chandelier jellyfish', 'creature', ['aquarium', 'hotel', 'night', 'dream'], { x: 1.55, y: 1.9, z: 1.55 }, 'orbit'),
  being('atelier_creature_salamander', 'atelier_animal_salamander', 'boiler-room jeweled salamander', 'creature', ['industrial', 'wet', 'garden', 'tech'], { x: 1.1, y: 0.75, z: 1.85 }, 'wander'),
  being('atelier_creature_capybara', 'atelier_animal_capybara', 'waiting-room capybara', 'creature', ['clinic', 'garden', 'hotel', 'liminal'], { x: 1.3, y: 1.15, z: 1.75 }, 'idle'),
];

export const ATELIER_FAMILY_DEFINITIONS = [
  ...ATELIER_PROP_FAMILIES,
  ...ATELIER_BEING_FAMILIES,
];

export const ATELIER_BOUNDS: Record<AtelierModelKind, { w: number; h: number; d: number }> =
  Object.fromEntries(ATELIER_FAMILY_DEFINITIONS.map((family) => [
    family.kind,
    { w: family.scale.x, h: family.scale.y, d: family.scale.z },
  ])) as Record<AtelierModelKind, { w: number; h: number; d: number }>;

const VARIANT_LABELS = [
  'conservatory-restored',
  'midnight-patinated',
  'hand-inlaid',
  'prismatically glazed',
  'institution-numbered',
  'impossibly over-engineered',
] as const;

export const ATELIER_VARIANTS_PER_FAMILY = 6;
const ALL_MOODS: MoodAxis[] = ['upper', 'downer', 'static', 'dynamic'];

export const ATELIER_ASSETS: AssetDef[] = ATELIER_FAMILY_DEFINITIONS.flatMap(
  (family) => Array.from({ length: ATELIER_VARIANTS_PER_FAMILY }, (_, variant) => ({
    id: `${family.id}_${String(variant + 1).padStart(2, '0')}`,
    kind: family.kind,
    label: `${VARIANT_LABELS[variant]} ${family.label}`,
    category: family.category,
    tags: [...family.tags, 'high-detail', 'atelier'],
    setIds: sceneSetIdsForTags(family.tags),
    moods: [...ALL_MOODS],
    defaultScale: { ...family.scale },
    scaleRange: {
      min: family.category === 'npc' || family.category === 'creature' ? 0.82 : 0.72,
      max: family.category === 'npc' || family.category === 'creature' ? 1.72 : 1.66,
    },
    defaultBehavior: family.behavior,
    linksByDefault: false,
    solidDefault: family.category !== 'npc' && family.category !== 'creature',
    weight: family.category === 'npc' ? 1.02 : family.category === 'creature' ? 0.94 : 1.22,
    renderCost: family.category === 'npc' ? 12 : family.category === 'creature' ? 11 : 9,
    family: family.id,
    variant,
  })),
);

export const ATELIER_PROP_ASSET_COUNT = ATELIER_ASSETS.filter(
  (asset) => asset.category !== 'npc' && asset.category !== 'creature',
).length;
export const ATELIER_BEING_ASSET_COUNT = ATELIER_ASSETS.filter(
  (asset) => asset.category === 'npc' || asset.category === 'creature',
).length;
export const ATELIER_ASSET_COUNT = ATELIER_ASSETS.length;

export function isAtelierModelKind(kind: string): kind is AtelierModelKind {
  return kind in ATELIER_BOUNDS;
}

export function atelierFamilyForKind(kind: AtelierModelKind): AtelierFamilyDefinition {
  return ATELIER_FAMILY_DEFINITIONS.find((family) => family.kind === kind)!;
}
