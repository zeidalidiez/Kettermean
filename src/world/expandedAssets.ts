import type { EntityBehavior, MoodAxis } from '../types';
import type { AssetCategory, AssetDef } from './assetCatalog';
import { sceneSetIdsForTags } from './sceneSets';

interface AssetFamily {
  id: string;
  kind: string;
  label: string;
  category: AssetCategory;
  tags: string[];
  moods: MoodAxis[];
  scale: { x: number; y: number; z: number };
  behavior?: EntityBehavior;
  weight?: number;
}

const VARIANTS_PER_FAMILY = 8;
const VARIANT_LABELS = [
  'worn',
  'institutional',
  'striped',
  'chrome',
  'patched',
  'oversized',
  'child-sized',
  'ceremonial',
] as const;

const PROP_FAMILIES: AssetFamily[] = [
  family('armchair', 'armchair', 'lounge chair', 'furniture', ['lobby', 'motel', 'home', 'waiting room'], { x: 0.9, y: 1.15, z: 0.9 }),
  family('sofa', 'sofa', 'waiting sofa', 'furniture', ['lobby', 'motel', 'clinic', 'atrium'], { x: 2.2, y: 1.1, z: 0.9 }),
  family('stool', 'stool', 'utility stool', 'furniture', ['food', 'clinic', 'industrial', 'school'], { x: 0.55, y: 0.8, z: 0.55 }),
  family('school_desk', 'school_desk', 'student desk', 'furniture', ['school', 'office', 'classroom'], { x: 1.05, y: 1.1, z: 0.75 }),
  family('locker', 'locker', 'metal locker', 'furniture', ['school', 'gym', 'industrial', 'service'], { x: 0.85, y: 2.0, z: 0.65 }),
  family('bookcase', 'bookcase', 'loaded bookcase', 'furniture', ['archive', 'office', 'school', 'museum'], { x: 1.45, y: 2.05, z: 0.48 }),
  family('display_case', 'display_case', 'museum display case', 'fixture', ['museum', 'atrium', 'retail', 'glass'], { x: 1.45, y: 1.55, z: 0.9 }),
  family('hospital_bed', 'hospital_bed', 'hospital bed', 'furniture', ['clinic', 'observation', 'abandoned'], { x: 2.15, y: 1.15, z: 1.0 }),
  family('gurney', 'gurney', 'empty gurney', 'furniture', ['clinic', 'service', 'corridor'], { x: 2.05, y: 1.0, z: 0.8 }),
  family('arcade', 'arcade', 'arcade cabinet', 'fixture', ['mall', 'arcade', 'party', 'retail'], { x: 0.9, y: 2.0, z: 0.9 }),
  family('checkout', 'checkout', 'checkout counter', 'furniture', ['supermarket', 'retail', 'mall'], { x: 2.2, y: 1.65, z: 0.85 }),
  family('kiosk', 'kiosk', 'information kiosk', 'fixture', ['terminal', 'mall', 'museum', 'lobby'], { x: 1.0, y: 1.7, z: 0.8 }),
  family('terminal_console', 'terminal', 'public terminal', 'fixture', ['airport', 'terminal', 'office', 'tech'], { x: 1.0, y: 1.55, z: 0.75 }),
  family('trash_bin', 'trash', 'public waste bin', 'fixture', ['outdoor', 'mall', 'station', 'service'], { x: 0.7, y: 1.0, z: 0.7 }),
  family('barrier', 'barrier', 'portable barrier', 'fixture', ['parking', 'highway', 'service', 'outdoor'], { x: 1.7, y: 1.15, z: 0.55 }),
  family('planter', 'planter', 'architectural planter', 'decor', ['garden', 'atrium', 'lobby', 'outdoor'], { x: 1.2, y: 1.4, z: 1.2 }),
  family('picnic_table', 'picnic', 'picnic table', 'furniture', ['park', 'outdoor', 'meadow', 'highway'], { x: 2.2, y: 1.05, z: 1.5 }),
  family('bleacher', 'bleacher', 'bleacher section', 'furniture', ['stadium', 'gym', 'school', 'echo'], { x: 2.8, y: 1.6, z: 1.7 }),
  family('tree', 'tree', 'liminal tree', 'decor', ['outdoor', 'park', 'garden', 'meadow'], { x: 1.8, y: 4.6, z: 1.8 }),
  family('fountain', 'fountain', 'dry fountain', 'fixture', ['plaza', 'courtyard', 'park', 'museum'], { x: 2.6, y: 1.7, z: 2.6 }),
  family('dining_chair', 'dining_chair', 'dining chair', 'furniture', ['food', 'motel', 'home', 'banquet'], { x: 0.62, y: 1.12, z: 0.64 }),
  family('office_chair', 'office_chair', 'rolling office chair', 'furniture', ['office', 'terminal', 'school', 'security'], { x: 0.72, y: 1.2, z: 0.72 }),
  family('coffee_table', 'coffee_table', 'low coffee table', 'furniture', ['lobby', 'motel', 'home', 'waiting room'], { x: 1.45, y: 0.58, z: 0.82 }),
  family('side_table', 'side_table', 'small side table', 'furniture', ['motel', 'home', 'lobby', 'clinic'], { x: 0.68, y: 0.72, z: 0.68 }),
  family('filing_cabinet', 'filing_cabinet', 'drawer filing cabinet', 'furniture', ['office', 'archive', 'school', 'clinic'], { x: 0.72, y: 1.45, z: 0.72 }),
  family('reception_desk', 'reception_desk', 'reception counter', 'furniture', ['lobby', 'clinic', 'motel', 'terminal'], { x: 2.8, y: 1.35, z: 1.05 }),
  family('wardrobe', 'wardrobe', 'freestanding wardrobe', 'furniture', ['motel', 'home', 'backrooms', 'abandoned'], { x: 1.55, y: 2.25, z: 0.72 }),
  family('sectional', 'sectional', 'sectional sofa', 'furniture', ['lobby', 'motel', 'atrium', 'home'], { x: 2.85, y: 1.08, z: 1.75 }),
  family('hotel_bed', 'hotel_bed', 'made hotel bed', 'furniture', ['motel', 'home', 'abandoned', 'waiting room'], { x: 2.25, y: 1.25, z: 1.72 }),
  family('nightstand', 'nightstand', 'bedside nightstand', 'furniture', ['motel', 'home', 'clinic'], { x: 0.68, y: 0.78, z: 0.62 }),
  family('washer', 'washer', 'laundromat washer', 'fixture', ['laundry', 'service', 'motel', 'industrial'], { x: 0.95, y: 1.28, z: 0.9 }),
  family('phone_booth', 'phone_booth', 'glass phone booth', 'fixture', ['station', 'highway', 'outdoor', 'terminal'], { x: 1.18, y: 2.45, z: 1.1 }),
  family('bus_shelter', 'bus_shelter', 'empty bus shelter', 'fixture', ['outdoor', 'station', 'highway', 'night'], { x: 3.5, y: 2.55, z: 1.45 }),
  family('swing_set', 'swing_set', 'playground swing set', 'fixture', ['outdoor', 'playground', 'park', 'fog'], { x: 3.2, y: 2.65, z: 1.8 }),
  family('pool_lounger', 'pool_lounger', 'poolside lounger', 'furniture', ['pool', 'outdoor', 'motel', 'rooftop'], { x: 2.05, y: 0.82, z: 0.72 }),
  family('lifeguard_chair', 'lifeguard_chair', 'lifeguard chair', 'furniture', ['pool', 'outdoor', 'stadium'], { x: 1.45, y: 2.8, z: 1.35 }),
  family('streetlight', 'streetlight', 'streetlight', 'fixture', ['outdoor', 'plaza', 'highway', 'parking'], { x: 0.9, y: 5.2, z: 0.9 }),
  family('pallet_stack', 'pallet_stack', 'stacked pallets', 'fixture', ['warehouse', 'industrial', 'service', 'parking'], { x: 1.55, y: 1.45, z: 1.25 }),
  family('server_rack', 'server_rack', 'active server rack', 'fixture', ['server', 'office', 'industrial', 'tech'], { x: 0.9, y: 2.15, z: 0.95 }),
  family('aquarium_tank', 'aquarium_tank', 'lit aquarium tank', 'fixture', ['aquarium', 'museum', 'lobby', 'wet'], { x: 2.15, y: 1.85, z: 0.82 }),
  family('medical_cart', 'medical_cart', 'mobile medical cart', 'fixture', ['clinic', 'hospital', 'observation'], { x: 1.05, y: 1.25, z: 0.72 }),
  family('privacy_screen', 'privacy_screen', 'folding privacy screen', 'fixture', ['clinic', 'hospital', 'observation'], { x: 2.25, y: 1.95, z: 0.5 }),
  family('copy_machine', 'copy_machine', 'office copy machine', 'fixture', ['office', 'archive', 'civic'], { x: 1.15, y: 1.45, z: 0.88 }),
  family('archive_trolley', 'archive_trolley', 'archive book trolley', 'fixture', ['archive', 'office', 'museum'], { x: 1.25, y: 1.35, z: 0.72 }),
  family('ticket_gate', 'ticket_gate', 'transit ticket gate', 'fixture', ['station', 'terminal', 'subway'], { x: 1.55, y: 1.18, z: 0.72 }),
  family('departure_board', 'departure_board', 'departure information board', 'fixture', ['station', 'terminal', 'airport'], { x: 2.25, y: 2.35, z: 0.38 }),
  family('shopping_cart', 'shopping_cart', 'empty shopping cart', 'fixture', ['mall', 'retail', 'supermarket'], { x: 1.35, y: 1.12, z: 0.82 }),
  family('retail_display', 'retail_display', 'retail display island', 'fixture', ['mall', 'retail', 'exhibition'], { x: 1.65, y: 1.7, z: 1.05 }),
  family('chalkboard', 'chalkboard', 'classroom chalkboard', 'fixture', ['school', 'classroom', 'university'], { x: 2.45, y: 1.85, z: 0.32 }),
  family('lab_bench', 'lab_bench', 'laboratory workbench', 'furniture', ['school', 'lab', 'tech'], { x: 2.25, y: 1.55, z: 0.95 }),
  family('tool_chest', 'tool_chest', 'rolling tool chest', 'fixture', ['industrial', 'warehouse', 'service'], { x: 1.15, y: 1.3, z: 0.72 }),
  family('drum_stack', 'drum_stack', 'stacked industrial drums', 'fixture', ['industrial', 'warehouse', 'loading'], { x: 1.65, y: 1.85, z: 1.15 }),
  family('luggage_cart', 'luggage_cart', 'hotel luggage cart', 'fixture', ['hotel', 'motel', 'terminal'], { x: 1.45, y: 2.05, z: 0.88 }),
  family('room_service', 'room_service', 'room service trolley', 'furniture', ['hotel', 'motel', 'food'], { x: 1.35, y: 1.28, z: 0.82 }),
  family('traffic_cone', 'traffic_cone', 'road traffic cone cluster', 'fixture', ['highway', 'parking', 'roadside', 'service'], { x: 1.15, y: 1.05, z: 0.82 }),
  family('exercise_bike', 'exercise_bike', 'stationary exercise bike', 'fixture', ['gym', 'clinic', 'leisure'], { x: 1.45, y: 1.65, z: 0.72 }),
  family('cinema_seat', 'cinema_seat', 'folding cinema seat', 'furniture', ['cinema', 'convention', 'leisure'], { x: 0.78, y: 1.35, z: 0.78 }),
  family('pool_ladder', 'pool_ladder', 'stainless pool ladder', 'fixture', ['pool', 'waterpark', 'wet'], { x: 1.05, y: 1.65, z: 0.72 }),
  family('utility_shelf', 'utility_shelf', 'loaded utility shelf', 'fixture', ['service', 'industrial', 'warehouse', 'storage'], { x: 1.55, y: 2.05, z: 0.62 }),
  family('breaker_panel', 'breaker_panel', 'electrical breaker panel', 'fixture', ['service', 'industrial', 'utility', 'parking'], { x: 0.95, y: 1.65, z: 0.34 }),
  family('boiler', 'boiler', 'mechanical boiler', 'fixture', ['service', 'industrial', 'basement', 'utility'], { x: 1.5, y: 2.35, z: 1.25 }),
  family('pipe_cluster', 'pipe_cluster', 'exposed pipe cluster', 'fixture', ['service', 'industrial', 'basement', 'utility'], { x: 1.6, y: 2.55, z: 0.8 }),
  family('folding_table', 'folding_table', 'folding utility table', 'furniture', ['school', 'convention', 'service', 'banquet'], { x: 1.85, y: 0.95, z: 0.82 }),
  family('cafeteria_table', 'cafeteria_table', 'attached-seat cafeteria table', 'furniture', ['school', 'food', 'mall', 'convention'], { x: 2.3, y: 1.05, z: 1.65 }),
  family('airport_seat', 'airport_seat', 'airport seat row', 'furniture', ['airport', 'terminal', 'station', 'waiting room'], { x: 2.65, y: 1.35, z: 0.82 }),
  family('examination_bed', 'examination_bed', 'examination bed', 'furniture', ['clinic', 'hospital', 'observation', 'lab'], { x: 2.05, y: 1.25, z: 0.88 }),
  family('snack_machine', 'snack_machine', 'spiral snack machine', 'fixture', ['mall', 'school', 'terminal', 'service'], { x: 1.05, y: 2.15, z: 0.92 }),
  family('luggage_pile', 'luggage_pile', 'abandoned luggage pile', 'decor', ['airport', 'terminal', 'motel', 'station'], { x: 1.65, y: 1.45, z: 1.25 }),
  family('garden_bench', 'garden_bench', 'slatted garden bench', 'furniture', ['outdoor', 'park', 'garden', 'plaza'], { x: 1.95, y: 1.2, z: 0.78 }),
  family('market_stall', 'market_stall', 'empty market stall', 'fixture', ['outdoor', 'market', 'plaza', 'retail'], { x: 2.8, y: 2.65, z: 1.8 }),
  family('maintenance_sink', 'maintenance_sink', 'deep maintenance sink', 'fixture', ['service', 'industrial', 'clinic', 'utility'], { x: 1.15, y: 1.55, z: 0.82 }),
  family('rubble_pile', 'rubble_pile', 'collapsed rubble pile', 'decor', ['industrial', 'abandoned', 'ruined', 'service'], { x: 1.8, y: 0.9, z: 1.5 }),
  family('fire_barrel', 'fire_barrel', 'burning barrel', 'fixture', ['industrial', 'outdoor', 'fire', 'roadside'], { x: 1, y: 1.8, z: 1 }),
  family('broken_column', 'broken_column', 'broken stone column', 'fixture', ['cathedral', 'museum', 'ruined', 'courtyard'], { x: 1.5, y: 2.1, z: 1.5 }),
  family('collapsed_beam', 'collapsed_beam', 'collapsed structural beam', 'fixture', ['industrial', 'warehouse', 'ruined', 'service'], { x: 3.2, y: 0.8, z: 1 }),
  family('wooden_barricade', 'wooden_barricade', 'wooden barricade', 'fixture', ['roadside', 'service', 'ruined', 'outdoor'], { x: 2.5, y: 1.7, z: 0.7 }),
  family('altar', 'altar', 'ceremonial altar', 'furniture', ['chapel', 'cathedral', 'museum', 'ceremonial'], { x: 2, y: 1.6, z: 1 }),
  family('office_cubicle', 'office_cubicle', 'office cubicle', 'furniture', ['office', 'civic', 'archive', 'abandoned'], { x: 2.4, y: 1.7, z: 2 }),
  family('restaurant_booth', 'restaurant_booth', 'restaurant booth', 'furniture', ['food', 'mall', 'motel', 'retail'], { x: 2.4, y: 1.4, z: 1.8 }),
  family('warehouse_crate', 'warehouse_crate', 'shipping crate', 'fixture', ['warehouse', 'industrial', 'loading', 'service'], { x: 1.4, y: 1.3, z: 1.4 }),
  family('generator', 'generator', 'portable generator', 'fixture', ['industrial', 'service', 'tech', 'outdoor'], { x: 1.7, y: 1.5, z: 1.1 }),
  family('greenhouse_table', 'greenhouse_table', 'greenhouse worktable', 'furniture', ['garden', 'lab', 'school', 'overgrown'], { x: 2.3, y: 1.5, z: 1.2 }),
  family('telescope', 'telescope', 'observatory telescope', 'fixture', ['tech', 'outdoor', 'museum', 'field'], { x: 1.5, y: 2.4, z: 1.5 }),
];

const NPC_FAMILIES: AssetFamily[] = [
  npc('npc_nurse', 'figure_nurse', 'night nurse', ['clinic', 'observation', 'corridor'], 'stare'),
  npc('npc_janitor', 'figure_janitor', 'night janitor', ['service', 'mall', 'school'], 'wander'),
  npc('npc_commuter', 'figure_commuter', 'waiting commuter', ['station', 'terminal', 'subway'], 'idle'),
  npc('npc_hazmat', 'figure_hazmat', 'hazmat worker', ['industrial', 'server', 'clinic'], 'wander'),
  npc('npc_mascot', 'figure_mascot', 'retired mascot', ['mall', 'party', 'stadium'], 'stare'),
  npc('npc_bellhop', 'figure_bellhop', 'silent bellhop', ['motel', 'lobby', 'atrium'], 'stare'),
  npc('npc_guard', 'figure_guard', 'security guard', ['museum', 'parking', 'office'], 'orbit'),
  npc('npc_worker', 'figure_worker', 'office worker', ['office', 'archive', 'terminal'], 'wander'),
  npc('npc_patient', 'figure_patient', 'waiting patient', ['clinic', 'observation', 'waiting room'], 'idle'),
  npc('npc_conductor', 'figure_conductor', 'last conductor', ['station', 'subway', 'terminal'], 'stare'),
  npc('npc_teacher', 'figure_teacher', 'after-hours teacher', ['school', 'classroom', 'archive'], 'stare'),
  npc('npc_cook', 'figure_cook', 'closed-kitchen cook', ['food', 'motel', 'mall'], 'wander'),
  npc('npc_swimmer', 'figure_swimmer', 'dry-pool swimmer', ['pool', 'aquarium', 'outdoor'], 'idle'),
  npc('npc_groundskeeper', 'figure_groundskeeper', 'night groundskeeper', ['outdoor', 'park', 'garden'], 'wander'),
  npc('npc_receptionist', 'figure_receptionist', 'late receptionist', ['lobby', 'clinic', 'motel'], 'stare'),
  npc('npc_courier', 'figure_courier', 'lost courier', ['office', 'terminal', 'service'], 'wander'),
  npc('npc_usher', 'figure_usher', 'silent usher', ['stadium', 'museum', 'chapel'], 'orbit'),
  npc('npc_tourist', 'figure_tourist', 'stranded tourist', ['museum', 'plaza', 'terminal'], 'idle'),
  npc('npc_mechanic', 'figure_mechanic', 'parking mechanic', ['parking', 'industrial', 'highway'], 'wander'),
  npc('npc_lifeguard', 'figure_lifeguard', 'off-duty lifeguard', ['pool', 'outdoor', 'motel'], 'stare'),
  npc('npc_vendor', 'figure_vendor', 'closed-market vendor', ['market', 'retail', 'plaza'], 'stare'),
  npc('npc_firefighter', 'figure_firefighter', 'waiting firefighter', ['service', 'industrial', 'parking'], 'wander'),
  npc('npc_librarian', 'figure_librarian', 'after-hours librarian', ['archive', 'school', 'museum'], 'stare'),
  npc('npc_lab_tech', 'figure_lab_tech', 'silent lab technician', ['lab', 'clinic', 'tech'], 'wander'),
  npc('npc_coach', 'figure_coach', 'empty-gym coach', ['gym', 'school', 'stadium'], 'orbit'),
  npc('npc_musician', 'figure_musician', 'last concourse musician', ['station', 'convention', 'chapel'], 'idle'),
];

const CREATURE_FAMILIES: AssetFamily[] = [
  creature('creature_cat', 'animal_cat', 'stray cat', ['motel', 'service', 'outdoor'], 'wander', { x: 0.75, y: 0.72, z: 1.05 }),
  creature('creature_dog', 'animal_dog', 'waiting dog', ['park', 'outdoor', 'station'], 'wander', { x: 0.95, y: 1.15, z: 1.4 }),
  creature('creature_crow', 'animal_crow', 'watching crow', ['outdoor', 'parking', 'plaza'], 'orbit', { x: 0.75, y: 0.78, z: 0.85 }),
  creature('creature_rabbit', 'animal_rabbit', 'still rabbit', ['outdoor', 'garden', 'meadow'], 'idle', { x: 0.68, y: 0.92, z: 0.9 }),
  creature('creature_horse', 'animal_horse', 'unattended horse', ['outdoor', 'field', 'highway'], 'wander', { x: 1.35, y: 2.35, z: 2.3 }),
  creature('creature_fish', 'animal_fish', 'floating corridor fish', ['aquarium', 'wet', 'dream'], 'orbit', { x: 1.25, y: 0.72, z: 0.48 }),
];

export const EXPANDED_ASSETS: AssetDef[] = [
  ...PROP_FAMILIES,
  ...NPC_FAMILIES,
  ...CREATURE_FAMILIES,
].flatMap(
  (assetFamily) =>
    Array.from({ length: VARIANTS_PER_FAMILY }, (_, variant) => ({
      id: `${assetFamily.id}_${String(variant + 1).padStart(2, '0')}`,
      kind: assetFamily.kind,
      label: `${VARIANT_LABELS[variant]} ${assetFamily.label}`,
      category: assetFamily.category,
      tags: [...assetFamily.tags],
      setIds: sceneSetIdsForTags(assetFamily.tags),
      moods: [...assetFamily.moods],
      defaultScale: { ...assetFamily.scale },
      scaleRange: {
        min: 0.78,
        max: assetFamily.category === 'npc' || assetFamily.category === 'creature' ? 1.55 : 1.5,
      },
      defaultBehavior: assetFamily.behavior,
      linksByDefault: false,
      solidDefault: assetFamily.category !== 'npc' && assetFamily.category !== 'creature',
      weight: assetFamily.weight ?? (assetFamily.category === 'npc' ? 0.62 : assetFamily.category === 'creature' ? 0.5 : 0.78),
      renderCost: renderCostFor(assetFamily.kind, assetFamily.category),
      family: assetFamily.id,
      variant,
    })),
);

export const EXPANDED_ASSET_COUNT = EXPANDED_ASSETS.length;

function family(
  id: string,
  kind: string,
  label: string,
  category: AssetCategory,
  tags: string[],
  scale: { x: number; y: number; z: number },
): AssetFamily {
  return {
    id,
    kind,
    label,
    category,
    tags,
    moods: ['upper', 'downer', 'static', 'dynamic'],
    scale,
  };
}

function renderCostFor(kind: string, category: AssetCategory): number {
  if (category === 'npc') return 5;
  if (category === 'creature') return 4;
  if (['bookcase', 'bus_shelter', 'swing_set', 'server_rack', 'aquarium_tank'].includes(kind)) return 5;
  if (['locker', 'hospital_bed', 'gurney', 'barrier', 'planter', 'bleacher', 'tree', 'reception_desk', 'sectional', 'hotel_bed', 'phone_booth', 'lifeguard_chair', 'pallet_stack', 'privacy_screen', 'departure_board', 'shopping_cart', 'retail_display', 'lab_bench', 'drum_stack', 'luggage_cart', 'exercise_bike', 'rubble_pile', 'fire_barrel', 'broken_column', 'collapsed_beam', 'wooden_barricade', 'altar', 'office_cubicle', 'restaurant_booth', 'warehouse_crate', 'generator', 'greenhouse_table', 'telescope'].includes(kind)) {
    return 3;
  }
  return 2;
}

function npc(
  id: string,
  kind: string,
  label: string,
  tags: string[],
  behavior: EntityBehavior,
): AssetFamily {
  return {
    id,
    kind,
    label,
    category: 'npc',
    tags,
    moods: ['upper', 'downer', 'static', 'dynamic'],
    scale: { x: 0.78, y: 2.3, z: 0.58 },
    behavior,
  };
}

function creature(
  id: string,
  kind: string,
  label: string,
  tags: string[],
  behavior: EntityBehavior,
  scale: { x: number; y: number; z: number },
): AssetFamily {
  return {
    id,
    kind,
    label,
    category: 'creature',
    tags,
    moods: ['upper', 'downer', 'static', 'dynamic'],
    scale,
    behavior,
  };
}
