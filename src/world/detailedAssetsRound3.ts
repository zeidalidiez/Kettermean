import type { EntityBehavior, MoodAxis } from '../types';
import type { AssetCategory, AssetDef } from './assetCatalog';
import { sceneSetIdsForTags } from './sceneSets';

export const EXHIBITION_PROP_KINDS = [
  'detail_steamer_trunk',
  'detail_hotel_luggage_rack',
  'detail_magic_lantern',
  'detail_stereoscope_cabinet',
  'detail_seismograph_desk',
  'detail_rooftop_weather_station',
  'detail_wardian_plant_case',
  'detail_seed_archive_carousel',
  'detail_rotary_deli_slicer',
  'detail_banquet_dessert_tower',
  'detail_fortune_teller_cabinet',
  'detail_mechanical_racing_game',
  'detail_switchboard_console',
  'detail_dictation_station',
  'detail_ticket_punching_desk',
  'detail_railway_signal_frame',
  'detail_pipe_organ_console',
  'detail_processional_canopy',
  'detail_anesthesia_trolley',
  'detail_optometrist_phoropter',
  'detail_player_piano',
  'detail_reel_to_reel_tower',
  'exhibition_vanity_dresser',
  'detail_grandfather_clock',
  'detail_turbine_governor',
  'detail_pressure_manifold',
  'detail_ship_engine_telegraph',
  'detail_fresnel_lighthouse_lens',
  'detail_theater_spotlight_rig',
  'detail_costume_wardrobe',
  'detail_mineral_specimen_cabinet',
  'detail_map_drawer_chest',
  'detail_topiary_frame',
  'detail_fountain_mechanism',
  'detail_cathedral_radio_cabinet',
  'detail_telephone_exchange',
  'detail_shoemaker_bench',
  'detail_laundry_mangle_press',
  'detail_billiards_table',
  'detail_carousel_horse',
  'detail_star_chart_projector',
  'detail_lunar_globe',
  'detail_dream_recording_chair',
  'detail_memory_weighing_scale',
  'detail_reception_pigeonholes',
  'detail_room_service_dumbwaiter',
  'detail_anatomy_model_cabinet',
  'exhibition_drafting_table',
  'detail_spiral_stair_fragment',
  'detail_stained_glass_kiosk',
] as const;

export const EXHIBITION_HUMANOID_KINDS = [
  'exhibition_figure_projectionist',
  'detail_figure_perfumer',
  'detail_figure_elevator_operator',
  'detail_figure_surveyor',
  'detail_figure_somnambulist',
  'detail_figure_conservator',
  'detail_figure_florist',
  'detail_figure_bell_ringer',
  'detail_figure_cartographer',
  'detail_figure_stationmaster',
  'detail_figure_optician',
  'exhibition_figure_astronomer',
  'detail_figure_locksmith',
  'detail_figure_pastry_chef',
  'detail_figure_telephone_operator',
] as const;

export const EXHIBITION_CREATURE_KINDS = [
  'exhibition_animal_fox',
  'exhibition_animal_owl',
  'exhibition_animal_moth',
  'exhibition_animal_frog',
  'exhibition_animal_snail',
  'detail_animal_stag',
  'detail_animal_seahorse',
  'detail_animal_mantis',
  'exhibition_animal_goat',
  'detail_animal_swan',
] as const;

export type ExhibitionPropKind = (typeof EXHIBITION_PROP_KINDS)[number];
export type ExhibitionHumanoidKind = (typeof EXHIBITION_HUMANOID_KINDS)[number];
export type ExhibitionCreatureKind = (typeof EXHIBITION_CREATURE_KINDS)[number];
export type ExhibitionModelKind =
  | ExhibitionPropKind
  | ExhibitionHumanoidKind
  | ExhibitionCreatureKind;

export type ExhibitionPropForm =
  | 'travel'
  | 'optical'
  | 'scientific'
  | 'botanical'
  | 'service'
  | 'arcade'
  | 'office'
  | 'transit'
  | 'ceremonial'
  | 'medical'
  | 'audio'
  | 'domestic'
  | 'industrial'
  | 'maritime'
  | 'theatrical'
  | 'display'
  | 'garden'
  | 'communication'
  | 'workshop'
  | 'leisure'
  | 'celestial'
  | 'anomaly'
  | 'hospitality'
  | 'classroom'
  | 'architectural';

export interface ExhibitionFamilyDefinition {
  id: string;
  kind: ExhibitionModelKind;
  label: string;
  category: AssetCategory;
  tags: string[];
  scale: { x: number; y: number; z: number };
  form?: ExhibitionPropForm;
  behavior?: EntityBehavior;
}

const prop = (
  id: string,
  kind: ExhibitionPropKind,
  label: string,
  category: 'furniture' | 'fixture' | 'decor' | 'anomaly',
  tags: string[],
  scale: { x: number; y: number; z: number },
  form: ExhibitionPropForm,
): ExhibitionFamilyDefinition => ({ id, kind, label, category, tags, scale, form });

export const EXHIBITION_PROP_FAMILIES: ExhibitionFamilyDefinition[] = [
  prop('exhibition_steamer_trunk', 'detail_steamer_trunk', 'brass-cornered steamer trunk', 'furniture', ['hotel', 'transit', 'archive', 'motel'], { x: 1.65, y: 1.15, z: 0.95 }, 'travel'),
  prop('exhibition_luggage_rack', 'detail_hotel_luggage_rack', 'carpeted hotel luggage rack', 'furniture', ['hotel', 'lobby', 'transit', 'motel'], { x: 1.8, y: 1.45, z: 0.78 }, 'travel'),
  prop('exhibition_magic_lantern', 'detail_magic_lantern', 'many-slide magic lantern', 'fixture', ['cinema', 'museum', 'school', 'projection'], { x: 1.45, y: 1.85, z: 1.65 }, 'optical'),
  prop('exhibition_stereoscope', 'detail_stereoscope_cabinet', 'stereoscope viewing cabinet', 'furniture', ['museum', 'archive', 'cinema', 'hotel'], { x: 1.55, y: 2.05, z: 0.92 }, 'optical'),
  prop('exhibition_seismograph', 'detail_seismograph_desk', 'continuous-paper seismograph', 'fixture', ['lab', 'office', 'tech', 'archive'], { x: 2.15, y: 1.45, z: 1.0 }, 'scientific'),
  prop('exhibition_weather_station', 'detail_rooftop_weather_station', 'rooftop weather instrument station', 'fixture', ['outdoor', 'school', 'tech', 'storm'], { x: 1.8, y: 2.55, z: 1.8 }, 'scientific'),
  prop('exhibition_wardian_case', 'detail_wardian_plant_case', 'ornate Wardian plant case', 'decor', ['garden', 'museum', 'hotel', 'overgrown'], { x: 1.75, y: 2.1, z: 1.05 }, 'botanical'),
  prop('exhibition_seed_carousel', 'detail_seed_archive_carousel', 'rotating seed archive carousel', 'fixture', ['garden', 'archive', 'lab', 'school'], { x: 1.65, y: 2.2, z: 1.65 }, 'botanical'),
  prop('exhibition_deli_slicer', 'detail_rotary_deli_slicer', 'handwheel delicatessen slicer', 'fixture', ['food', 'retail', 'industrial', 'service'], { x: 1.55, y: 1.45, z: 1.0 }, 'service'),
  prop('exhibition_dessert_tower', 'detail_banquet_dessert_tower', 'mirrored banquet dessert tower', 'decor', ['food', 'banquet', 'hotel', 'ceremonial'], { x: 1.45, y: 2.05, z: 1.45 }, 'service'),
  prop('exhibition_fortune_cabinet', 'detail_fortune_teller_cabinet', 'mechanical fortune-teller cabinet', 'anomaly', ['arcade', 'retail', 'uncanny', 'cinema'], { x: 1.4, y: 2.35, z: 1.0 }, 'arcade'),
  prop('exhibition_racing_game', 'detail_mechanical_racing_game', 'clockwork racing arcade', 'anomaly', ['arcade', 'mall', 'leisure', 'tech'], { x: 2.1, y: 1.7, z: 1.25 }, 'arcade'),
  prop('exhibition_switchboard', 'detail_switchboard_console', 'cord-filled switchboard console', 'fixture', ['office', 'hotel', 'communication', 'tech'], { x: 2.25, y: 1.95, z: 0.82 }, 'office'),
  prop('exhibition_dictation', 'detail_dictation_station', 'wax-cylinder dictation station', 'furniture', ['office', 'archive', 'communication', 'hotel'], { x: 1.75, y: 1.55, z: 0.95 }, 'office'),
  prop('exhibition_ticket_desk', 'detail_ticket_punching_desk', 'ticket-punching clerk desk', 'furniture', ['station', 'terminal', 'transit', 'office'], { x: 2.15, y: 1.55, z: 1.05 }, 'transit'),
  prop('exhibition_signal_frame', 'detail_railway_signal_frame', 'railway signal lever frame', 'fixture', ['station', 'transit', 'industrial', 'service'], { x: 2.5, y: 1.9, z: 1.0 }, 'transit'),
  prop('exhibition_organ_console', 'detail_pipe_organ_console', 'cathedral pipe-organ console', 'furniture', ['cathedral', 'chapel', 'ceremonial', 'theater'], { x: 2.25, y: 2.25, z: 1.2 }, 'ceremonial'),
  prop('exhibition_canopy', 'detail_processional_canopy', 'embroidered processional canopy', 'decor', ['chapel', 'hotel', 'ceremonial', 'theater'], { x: 2.4, y: 2.75, z: 1.8 }, 'ceremonial'),
  prop('exhibition_anesthesia', 'detail_anesthesia_trolley', 'brass anesthesia trolley', 'fixture', ['clinic', 'hospital', 'industrial', 'observation'], { x: 1.45, y: 1.8, z: 0.9 }, 'medical'),
  prop('exhibition_phoropter', 'detail_optometrist_phoropter', 'many-lensed optometrist phoropter', 'fixture', ['clinic', 'hospital', 'optical', 'tech'], { x: 1.45, y: 2.15, z: 1.3 }, 'medical'),
  prop('exhibition_player_piano', 'detail_player_piano', 'self-playing upright piano', 'anomaly', ['hotel', 'theater', 'home', 'haunted'], { x: 2.1, y: 2.1, z: 1.0 }, 'audio'),
  prop('exhibition_reel_tower', 'detail_reel_to_reel_tower', 'reel-to-reel broadcast tower', 'fixture', ['communication', 'archive', 'tech', 'cinema'], { x: 1.65, y: 2.25, z: 0.88 }, 'audio'),
  prop('exhibition_vanity', 'exhibition_vanity_dresser', 'three-mirror vanity dresser', 'furniture', ['home', 'hotel', 'theater', 'uncanny'], { x: 2.05, y: 2.0, z: 0.85 }, 'domestic'),
  prop('exhibition_clock', 'detail_grandfather_clock', 'astronomical grandfather clock', 'anomaly', ['home', 'hotel', 'archive', 'haunted'], { x: 1.2, y: 2.75, z: 0.72 }, 'domestic'),
  prop('exhibition_governor', 'detail_turbine_governor', 'flywheel turbine governor', 'fixture', ['industrial', 'service', 'tech', 'warehouse'], { x: 1.85, y: 2.0, z: 1.55 }, 'industrial'),
  prop('exhibition_manifold', 'detail_pressure_manifold', 'gauge-covered pressure manifold', 'fixture', ['industrial', 'service', 'lab', 'tech'], { x: 2.2, y: 1.9, z: 0.78 }, 'industrial'),
  prop('exhibition_engine_telegraph', 'detail_ship_engine_telegraph', 'ship engine-order telegraph', 'fixture', ['aquarium', 'transit', 'industrial', 'wet'], { x: 1.25, y: 2.05, z: 1.05 }, 'maritime'),
  prop('exhibition_fresnel_lens', 'detail_fresnel_lighthouse_lens', 'rotating Fresnel lighthouse lens', 'fixture', ['museum', 'aquarium', 'optical', 'outdoor'], { x: 1.75, y: 2.45, z: 1.75 }, 'maritime'),
  prop('exhibition_spotlight', 'detail_theater_spotlight_rig', 'counterweighted theater spotlight', 'fixture', ['theater', 'cinema', 'industrial', 'ceremonial'], { x: 1.65, y: 2.35, z: 1.65 }, 'theatrical'),
  prop('exhibition_costume_wardrobe', 'detail_costume_wardrobe', 'overfilled costume wardrobe', 'furniture', ['theater', 'hotel', 'home', 'uncanny'], { x: 2.05, y: 2.5, z: 0.9 }, 'theatrical'),
  prop('exhibition_minerals', 'detail_mineral_specimen_cabinet', 'illuminated mineral specimen cabinet', 'decor', ['museum', 'lab', 'archive', 'gilded'], { x: 2.05, y: 2.15, z: 0.82 }, 'display'),
  prop('exhibition_map_chest', 'detail_map_drawer_chest', 'wide cartographic drawer chest', 'furniture', ['archive', 'museum', 'office', 'school'], { x: 2.45, y: 1.45, z: 1.0 }, 'display'),
  prop('exhibition_topiary', 'detail_topiary_frame', 'unfinished topiary wireframe', 'decor', ['garden', 'outdoor', 'hotel', 'overgrown'], { x: 1.75, y: 2.55, z: 1.75 }, 'garden'),
  prop('exhibition_fountain', 'detail_fountain_mechanism', 'exposed fountain mechanism', 'fixture', ['garden', 'plaza', 'industrial', 'water'], { x: 2.15, y: 1.65, z: 2.15 }, 'garden'),
  prop('exhibition_radio', 'detail_cathedral_radio_cabinet', 'cathedral radio receiver cabinet', 'anomaly', ['communication', 'chapel', 'archive', 'haunted'], { x: 1.8, y: 2.15, z: 0.88 }, 'communication'),
  prop('exhibition_exchange', 'detail_telephone_exchange', 'automatic telephone exchange', 'fixture', ['communication', 'office', 'industrial', 'tech'], { x: 2.2, y: 2.2, z: 0.92 }, 'communication'),
  prop('exhibition_shoemaker', 'detail_shoemaker_bench', 'last-shift shoemaker bench', 'furniture', ['workshop', 'retail', 'hotel', 'industrial'], { x: 2.1, y: 1.55, z: 1.0 }, 'workshop'),
  prop('exhibition_mangle', 'detail_laundry_mangle_press', 'cast-iron laundry mangle', 'fixture', ['laundry', 'service', 'industrial', 'motel'], { x: 1.85, y: 1.75, z: 1.0 }, 'workshop'),
  prop('exhibition_billiards', 'detail_billiards_table', 'ornate pocket billiards table', 'furniture', ['leisure', 'hotel', 'community', 'ceremonial'], { x: 2.75, y: 1.15, z: 1.55 }, 'leisure'),
  prop('exhibition_carousel_horse', 'detail_carousel_horse', 'stationary carousel horse', 'anomaly', ['leisure', 'mall', 'theater', 'uncanny'], { x: 1.25, y: 2.35, z: 2.0 }, 'leisure'),
  prop('exhibition_star_projector', 'detail_star_chart_projector', 'rotating star-chart projector', 'fixture', ['museum', 'school', 'tech', 'night'], { x: 1.75, y: 2.3, z: 1.75 }, 'celestial'),
  prop('exhibition_lunar_globe', 'detail_lunar_globe', 'internally lit lunar globe', 'decor', ['museum', 'school', 'night', 'dream'], { x: 1.65, y: 2.15, z: 1.65 }, 'celestial'),
  prop('exhibition_dream_chair', 'detail_dream_recording_chair', 'dream-recording restraint chair', 'anomaly', ['clinic', 'tech', 'observation', 'uncanny'], { x: 1.45, y: 2.15, z: 1.65 }, 'anomaly'),
  prop('exhibition_memory_scale', 'detail_memory_weighing_scale', 'memory-weighing balance', 'anomaly', ['archive', 'ceremonial', 'clinic', 'dream'], { x: 1.9, y: 2.4, z: 1.15 }, 'anomaly'),
  prop('exhibition_pigeonholes', 'detail_reception_pigeonholes', 'hotel reception pigeonhole desk', 'furniture', ['hotel', 'lobby', 'office', 'archive'], { x: 2.35, y: 2.25, z: 0.95 }, 'hospitality'),
  prop('exhibition_dumbwaiter', 'detail_room_service_dumbwaiter', 'room-service dumbwaiter station', 'fixture', ['hotel', 'food', 'service', 'industrial'], { x: 1.55, y: 2.35, z: 0.9 }, 'hospitality'),
  prop('exhibition_anatomy', 'detail_anatomy_model_cabinet', 'sectioned anatomy model cabinet', 'decor', ['school', 'clinic', 'museum', 'observation'], { x: 1.65, y: 2.25, z: 0.92 }, 'classroom'),
  prop('exhibition_drafting', 'exhibition_drafting_table', 'counterweighted drafting table', 'furniture', ['school', 'office', 'archive', 'workshop'], { x: 2.2, y: 1.65, z: 1.15 }, 'classroom'),
  prop('exhibition_stair', 'detail_spiral_stair_fragment', 'freestanding spiral stair fragment', 'anomaly', ['architecture', 'hotel', 'industrial', 'uncanny'], { x: 2.4, y: 3.0, z: 2.4 }, 'architectural'),
  prop('exhibition_glass_kiosk', 'detail_stained_glass_kiosk', 'stained-glass information kiosk', 'fixture', ['architecture', 'lobby', 'cathedral', 'public'], { x: 2.0, y: 2.65, z: 1.6 }, 'architectural'),
];

const being = (
  id: string,
  kind: ExhibitionHumanoidKind | ExhibitionCreatureKind,
  label: string,
  category: 'npc' | 'creature',
  tags: string[],
  scale: { x: number; y: number; z: number },
  behavior: EntityBehavior,
): ExhibitionFamilyDefinition => ({ id, kind, label, category, tags, scale, behavior });

export const EXHIBITION_BEING_FAMILIES: ExhibitionFamilyDefinition[] = [
  being('exhibition_npc_projectionist', 'exhibition_figure_projectionist', 'last-reel projectionist', 'npc', ['cinema', 'theater', 'archive', 'night'], { x: 0.96, y: 2.48, z: 0.76 }, 'stare'),
  being('exhibition_npc_perfumer', 'detail_figure_perfumer', 'hotel corridor perfumer', 'npc', ['hotel', 'retail', 'garden', 'uncanny'], { x: 0.94, y: 2.42, z: 0.74 }, 'wander'),
  being('exhibition_npc_elevator_operator', 'detail_figure_elevator_operator', 'between-floors elevator operator', 'npc', ['hotel', 'lobby', 'transit', 'night'], { x: 0.93, y: 2.48, z: 0.72 }, 'stare'),
  being('exhibition_npc_surveyor', 'detail_figure_surveyor', 'interior land surveyor', 'npc', ['office', 'outdoor', 'industrial', 'uncanny'], { x: 0.98, y: 2.45, z: 0.78 }, 'orbit'),
  being('exhibition_npc_somnambulist', 'detail_figure_somnambulist', 'sleepwalking hotel guest', 'npc', ['hotel', 'home', 'night', 'dream'], { x: 0.92, y: 2.4, z: 0.7 }, 'wander'),
  being('exhibition_npc_conservator', 'detail_figure_conservator', 'after-hours art conservator', 'npc', ['museum', 'archive', 'lab', 'night'], { x: 0.94, y: 2.43, z: 0.74 }, 'idle'),
  being('exhibition_npc_florist', 'detail_figure_florist', 'closed-lobby florist', 'npc', ['garden', 'hotel', 'retail', 'ceremonial'], { x: 0.98, y: 2.5, z: 0.8 }, 'wander'),
  being('exhibition_npc_bell_ringer', 'detail_figure_bell_ringer', 'indoor bell ringer', 'npc', ['chapel', 'cathedral', 'industrial', 'haunted'], { x: 1.02, y: 2.58, z: 0.82 }, 'orbit'),
  being('exhibition_npc_cartographer', 'detail_figure_cartographer', 'lost-building cartographer', 'npc', ['archive', 'office', 'museum', 'transit'], { x: 0.96, y: 2.46, z: 0.76 }, 'stare'),
  being('exhibition_npc_stationmaster', 'detail_figure_stationmaster', 'platformless stationmaster', 'npc', ['station', 'terminal', 'transit', 'night'], { x: 0.98, y: 2.54, z: 0.78 }, 'stare'),
  being('exhibition_npc_optician', 'detail_figure_optician', 'many-spectacled optician', 'npc', ['clinic', 'retail', 'optical', 'uncanny'], { x: 0.95, y: 2.43, z: 0.74 }, 'idle'),
  being('exhibition_npc_astronomer', 'exhibition_figure_astronomer', 'ceiling astronomer', 'npc', ['museum', 'school', 'night', 'tech'], { x: 0.98, y: 2.52, z: 0.78 }, 'orbit'),
  being('exhibition_npc_locksmith', 'detail_figure_locksmith', 'doorless-building locksmith', 'npc', ['hotel', 'industrial', 'service', 'archive'], { x: 0.96, y: 2.45, z: 0.76 }, 'wander'),
  being('exhibition_npc_pastry_chef', 'detail_figure_pastry_chef', 'banquet pastry chef', 'npc', ['food', 'hotel', 'banquet', 'night'], { x: 1.02, y: 2.58, z: 0.82 }, 'wander'),
  being('exhibition_npc_operator', 'detail_figure_telephone_operator', 'unconnected telephone operator', 'npc', ['communication', 'office', 'hotel', 'tech'], { x: 0.94, y: 2.44, z: 0.74 }, 'stare'),
  being('exhibition_creature_fox', 'exhibition_animal_fox', 'carpet-colored fox', 'creature', ['hotel', 'garden', 'night', 'outdoor'], { x: 1.05, y: 1.05, z: 1.7 }, 'wander'),
  being('exhibition_creature_owl', 'exhibition_animal_owl', 'records-room owl', 'creature', ['archive', 'museum', 'night', 'school'], { x: 1.0, y: 1.35, z: 0.9 }, 'stare'),
  being('exhibition_creature_moth', 'exhibition_animal_moth', 'chandelier atlas moth', 'creature', ['hotel', 'garden', 'night', 'dream'], { x: 1.75, y: 0.85, z: 0.52 }, 'orbit'),
  being('exhibition_creature_frog', 'exhibition_animal_frog', 'waiting-room tree frog', 'creature', ['clinic', 'garden', 'water', 'dream'], { x: 0.9, y: 0.78, z: 1.05 }, 'idle'),
  being('exhibition_creature_snail', 'exhibition_animal_snail', 'marble lobby snail', 'creature', ['hotel', 'garden', 'wet', 'liminal'], { x: 0.92, y: 0.82, z: 1.55 }, 'wander'),
  being('exhibition_creature_stag', 'detail_animal_stag', 'ballroom stag', 'creature', ['hotel', 'garden', 'ceremonial', 'uncanny'], { x: 1.45, y: 2.65, z: 2.2 }, 'stare'),
  being('exhibition_creature_seahorse', 'detail_animal_seahorse', 'air-swimming seahorse', 'creature', ['aquarium', 'hotel', 'wet', 'dream'], { x: 0.85, y: 1.65, z: 0.68 }, 'orbit'),
  being('exhibition_creature_mantis', 'detail_animal_mantis', 'reception-desk mantis', 'creature', ['garden', 'office', 'uncanny', 'night'], { x: 1.0, y: 1.55, z: 0.82 }, 'stare'),
  being('exhibition_creature_goat', 'exhibition_animal_goat', 'service-corridor goat', 'creature', ['service', 'outdoor', 'industrial', 'liminal'], { x: 1.15, y: 1.55, z: 1.75 }, 'wander'),
  being('exhibition_creature_swan', 'detail_animal_swan', 'carpet-gliding swan', 'creature', ['hotel', 'water', 'garden', 'ceremonial'], { x: 1.35, y: 1.5, z: 1.75 }, 'orbit'),
];

export const EXHIBITION_FAMILY_DEFINITIONS = [
  ...EXHIBITION_PROP_FAMILIES,
  ...EXHIBITION_BEING_FAMILIES,
];

export const EXHIBITION_BOUNDS: Record<ExhibitionModelKind, { w: number; h: number; d: number }> =
  Object.fromEntries(EXHIBITION_FAMILY_DEFINITIONS.map((family) => [
    family.kind,
    { w: family.scale.x, h: family.scale.y, d: family.scale.z },
  ])) as Record<ExhibitionModelKind, { w: number; h: number; d: number }>;

const VARIANT_LABELS = [
  'museum-restored',
  'rain-patina',
  'velvet-trimmed',
  'chrome-inlaid',
  'archive-stamped',
  'impossibly articulated',
] as const;

export const EXHIBITION_VARIANTS_PER_FAMILY = 6;
const ALL_MOODS: MoodAxis[] = ['upper', 'downer', 'static', 'dynamic'];

export const EXHIBITION_PROP_RENDER_COST_BY_VARIANT = [21, 18, 28, 24, 17, 24] as const;
export const EXHIBITION_NPC_RENDER_COST_BY_VARIANT = [23, 24, 25, 25, 24, 26] as const;
export const EXHIBITION_CREATURE_RENDER_COST_BY_VARIANT = [21, 21, 25, 24, 26, 27] as const;

function exhibitionRenderCost(category: AssetCategory, variant: number): number {
  if (category === 'npc') return EXHIBITION_NPC_RENDER_COST_BY_VARIANT[variant]!;
  if (category === 'creature') return EXHIBITION_CREATURE_RENDER_COST_BY_VARIANT[variant]!;
  return EXHIBITION_PROP_RENDER_COST_BY_VARIANT[variant]!;
}

export const EXHIBITION_ASSETS: AssetDef[] = EXHIBITION_FAMILY_DEFINITIONS.flatMap(
  (family) => Array.from({ length: EXHIBITION_VARIANTS_PER_FAMILY }, (_, variant) => ({
    id: `${family.id}_${String(variant + 1).padStart(2, '0')}`,
    kind: family.kind,
    label: `${VARIANT_LABELS[variant]} ${family.label}`,
    category: family.category,
    tags: [...family.tags, 'high-detail', 'exhibition'],
    setIds: sceneSetIdsForTags(family.tags),
    moods: [...ALL_MOODS],
    defaultScale: { ...family.scale },
    scaleRange: {
      min: family.category === 'npc' || family.category === 'creature' ? 0.84 : 0.74,
      max: family.category === 'npc' || family.category === 'creature' ? 1.68 : 1.62,
    },
    defaultBehavior: family.behavior,
    linksByDefault: false,
    solidDefault: family.category !== 'npc' && family.category !== 'creature',
    weight: family.category === 'npc' ? 0.98 : family.category === 'creature' ? 0.9 : 1.18,
    renderCost: exhibitionRenderCost(family.category, variant),
    family: family.id,
    variant,
  })),
);

export const EXHIBITION_PROP_ASSET_COUNT = EXHIBITION_ASSETS.filter(
  (asset) => asset.category !== 'npc' && asset.category !== 'creature',
).length;
export const EXHIBITION_BEING_ASSET_COUNT = EXHIBITION_ASSETS.filter(
  (asset) => asset.category === 'npc' || asset.category === 'creature',
).length;
export const EXHIBITION_ASSET_COUNT = EXHIBITION_ASSETS.length;

export function isExhibitionModelKind(kind: string): kind is ExhibitionModelKind {
  return kind in EXHIBITION_BOUNDS;
}

export function exhibitionFamilyForKind(kind: ExhibitionModelKind): ExhibitionFamilyDefinition {
  return EXHIBITION_FAMILY_DEFINITIONS.find((family) => family.kind === kind)!;
}
