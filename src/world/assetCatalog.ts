import type {
  EntityBehavior,
  MoodAxis,
  RoomEnvironment,
  RoomLayoutStyle,
  RoomVisuals,
} from '../types';
import { EXPANDED_ASSETS } from './expandedAssets';

/**
 * Curated kit library. LLMs (cloud or tiny browser models) should SELECT and
 * CONFIGURE these IDs — not invent freeform meshes.
 */
export type AssetCategory =
  | 'furniture'
  | 'fixture'
  | 'decor'
  | 'npc'
  | 'creature'
  | 'anomaly'
  | 'portal';

export interface AssetDef {
  id: string;
  /** Maps to composed kit builder id. */
  kind: string;
  label: string;
  category: AssetCategory;
  tags: string[];
  moods: MoodAxis[];
  /** Default footprint used for layout / collision. */
  defaultScale: { x: number; y: number; z: number };
  /** Allowed uniform/non-uniform scale range for atmosphere (e.g. giant baby). */
  scaleRange: { min: number; max: number };
  defaultBehavior?: EntityBehavior;
  linksByDefault?: boolean;
  solidDefault?: boolean;
  /** Weight for offline random picks. */
  weight?: number;
  /** Approximate render cost in five-mesh units for per-room performance budgets. */
  renderCost?: number;
  /** Variants in one family share a semantic role but have different geometry. */
  family?: string;
  variant?: number;
}

export interface ThemePreset {
  id: string;
  title: string;
  blurb: string;
  mood: MoodAxis;
  environment?: RoomEnvironment;
  tags: string[];
  preferredAssets: string[];
  width: number;
  depth: number;
  height: number;
  palette: {
    floor: string;
    ceiling: string;
    walls: string;
    accent: string;
    fog: string;
    light: string;
    ambient: string;
  };
}

/** Placement instruction produced by LLM / offline director. */
export interface DirectedPlacement {
  assetId: string;
  x: number;
  z: number;
  y?: number;
  rotY?: number;
  /** Multiplier against asset defaultScale. Giant baby = 2.5–4. */
  scaleMul?: number;
  scale?: { x: number; y: number; z: number };
  linksOnTouch?: boolean;
  solid?: boolean;
  behavior?: EntityBehavior;
  labelOverride?: string;
}

export interface RoomDirection {
  seed: string;
  themeId?: string;
  title: string;
  blurb: string;
  mood: MoodAxis;
  environment?: RoomEnvironment;
  layoutStyle?: RoomLayoutStyle;
  tags: string[];
  width: number;
  depth: number;
  height: number;
  fogNear?: number;
  fogFar?: number;
  linkColor?: string;
  palette?: ThemePreset['palette'];
  physics?: {
    gravity?: number;
    moveSpeed?: number;
    friction?: number;
    bounce?: number;
    sway?: number;
  };
  visuals?: RoomVisuals;
  placements: DirectedPlacement[];
  /** true if assembled without live LLM */
  offline?: boolean;
}

export const ASSETS: AssetDef[] = [
  // Furniture
  a('chair_office', 'chair', 'office chair', 'furniture', ['office', 'lobby'], ['static', 'upper'], { x: 0.6, y: 1.2, z: 0.6 }, 0.7, 1.4),
  a('chair_plastic', 'chair', 'plastic chair', 'furniture', ['mall', 'clinic'], ['static', 'downer'], { x: 0.55, y: 1.1, z: 0.55 }, 0.8, 1.6),
  a('desk_security', 'desk', 'security desk', 'furniture', ['lobby', 'office'], ['static', 'downer'], { x: 1.9, y: 1.0, z: 0.9 }, 0.8, 1.5),
  a('desk_intake', 'desk', 'intake desk', 'furniture', ['clinic', 'office'], ['static', 'downer'], { x: 1.8, y: 1.0, z: 0.85 }, 0.8, 1.4),
  a('table_food', 'table', 'food court table', 'furniture', ['mall', 'food'], ['downer', 'static'], { x: 1.3, y: 0.85, z: 1.3 }, 0.7, 1.5),
  a('bench_wait', 'bench', 'waiting bench', 'furniture', ['lobby', 'clinic', 'station'], ['static', 'downer', 'upper'], { x: 1.7, y: 1.0, z: 0.6 }, 0.8, 2.0),
  a('bench_pew', 'bench', 'pew bench', 'furniture', ['chapel', 'odd'], ['dynamic', 'static'], { x: 1.8, y: 1.0, z: 0.65 }, 0.8, 2.2),
  a('cabinet_file', 'cabinet', 'filing cabinet', 'furniture', ['office', 'clinic'], ['static', 'downer'], { x: 1.1, y: 1.9, z: 0.6 }, 0.8, 1.6),
  a('cabinet_util', 'cabinet', 'utility cabinet', 'fixture', ['service', 'corridor'], ['static', 'downer'], { x: 1.0, y: 1.8, z: 0.55 }, 0.8, 1.5),
  a('shelf_toy', 'shelf', 'toy shelf', 'furniture', ['nursery'], ['downer', 'static'], { x: 1.6, y: 1.9, z: 0.5 }, 0.8, 1.8),
  a('crib_empty', 'crib', 'empty crib', 'furniture', ['nursery', 'uncanny'], ['downer'], { x: 1.4, y: 1.15, z: 0.85 }, 0.8, 2.5),
  a('mattress_stack', 'mattress', 'stacked mattresses', 'furniture', ['abandoned', 'backrooms'], ['downer', 'static'], { x: 1.9, y: 0.75, z: 1.0 }, 0.8, 2.0),

  // Fixtures
  a('vending_blue', 'vending', 'vending machine', 'fixture', ['mall', 'chapel', 'liminal'], ['static', 'dynamic', 'downer'], { x: 1.1, y: 2.2, z: 0.95 }, 0.9, 1.8),
  a('cooler_water', 'cooler', 'water cooler', 'fixture', ['office', 'lobby'], ['static', 'upper'], { x: 0.5, y: 1.55, z: 0.5 }, 0.8, 1.5),
  a('payphone_wall', 'payphone', 'payphone', 'fixture', ['corridor', 'station'], ['downer', 'static'], { x: 0.65, y: 1.6, z: 0.45 }, 0.8, 1.4),
  a('lamp_floor', 'lamp', 'floor lamp', 'fixture', ['lobby', 'clinic', 'home'], ['static', 'upper', 'downer'], { x: 0.6, y: 1.7, z: 0.6 }, 0.7, 2.0),
  a('tv_muted', 'tv', 'muted television', 'fixture', ['clinic', 'mall', 'home'], ['downer', 'static'], { x: 1.3, y: 1.5, z: 0.4 }, 0.8, 2.5),
  a('sign_wet', 'sign', 'wet floor sign', 'decor', ['lobby', 'mall', 'service'], ['static', 'dynamic'], { x: 0.8, y: 1.5, z: 0.2 }, 0.7, 1.8),
  a('door_fake', 'door_fake', 'painted exit door', 'portal', ['any', 'liminal'], ['static', 'downer', 'dynamic', 'upper'], { x: 1.15, y: 2.3, z: 0.2 }, 0.9, 1.4, { linksByDefault: true }),
  a('mirror_tall', 'mirror', 'tall mirror', 'decor', ['nursery', 'clinic', 'uncanny'], ['downer', 'static'], { x: 1.2, y: 2.0, z: 0.2 }, 0.8, 2.0),
  a('plant_fern', 'plant', 'potted fern', 'decor', ['lobby', 'office'], ['static', 'upper'], { x: 0.8, y: 1.2, z: 0.8 }, 0.6, 2.5),
  a('cart_janitor', 'cart', 'janitor cart', 'fixture', ['service', 'mall'], ['static', 'downer'], { x: 1.0, y: 1.05, z: 0.65 }, 0.8, 1.6),
  a('pillar_support', 'pillar', 'support pillar', 'fixture', ['backrooms', 'courtyard'], ['static', 'downer', 'upper'], { x: 1.0, y: 3.3, z: 1.0 }, 0.7, 1.8),
  a('bottle_giant', 'bottle_giant', 'giant baby bottle', 'anomaly', ['nursery', 'uncanny'], ['downer', 'dynamic'], { x: 1.0, y: 2.6, z: 1.0 }, 1.0, 3.5),

  // NPCs / creatures / anomalies
  a('npc_clerk', 'figure_clerk', 'hallway clerk', 'npc', ['lobby', 'clinic', 'office'], ['static', 'downer'], { x: 0.8, y: 2.2, z: 0.55 }, 0.8, 1.6, { defaultBehavior: 'stare', linksByDefault: false, solidDefault: false }),
  a('npc_guide', 'figure_guide', 'lost tour guide', 'npc', ['mall', 'chapel'], ['dynamic', 'static'], { x: 0.8, y: 2.2, z: 0.55 }, 0.8, 1.7, { defaultBehavior: 'stare', linksByDefault: false, solidDefault: false }),
  a('npc_raincoat', 'figure_raincoat', 'figure in a raincoat', 'npc', ['pool', 'night'], ['downer', 'static'], { x: 0.85, y: 2.2, z: 0.6 }, 0.9, 1.8, { defaultBehavior: 'wander', linksByDefault: false, solidDefault: false }),
  a('npc_mannequin', 'figure_mannequin', 'too-tall mannequin', 'npc', ['mall', 'uncanny'], ['downer', 'static'], { x: 1.0, y: 2.35, z: 0.5 }, 1.0, 2.8, { defaultBehavior: 'idle', linksByDefault: false, solidDefault: false }),
  a('npc_shadow', 'figure_shadow', 'security shadow', 'anomaly', ['backrooms', 'corridor'], ['downer', 'static'], { x: 0.7, y: 2.4, z: 0.5 }, 0.9, 2.2, { defaultBehavior: 'orbit', linksByDefault: false, solidDefault: false }),
  a('creature_deer', 'figure_deer', 'soft-eyed deer', 'creature', ['courtyard', 'dream'], ['upper', 'static'], { x: 0.9, y: 2.2, z: 1.4 }, 0.8, 2.0, { defaultBehavior: 'wander', linksByDefault: false, solidDefault: false }),
  a('creature_balloon', 'figure_balloon', 'floating balloon dog', 'creature', ['mall', 'party', 'uncanny'], ['dynamic', 'upper'], { x: 1.0, y: 2.0, z: 0.7 }, 0.7, 2.5, { defaultBehavior: 'orbit', linksByDefault: false, solidDefault: false }),
  a('anomaly_giant_baby', 'figure_baby', 'giant baby', 'anomaly', ['nursery', 'uncanny', 'horror-lite'], ['downer', 'dynamic'], { x: 2.2, y: 3.1, z: 1.8 }, 1.2, 4.0, { defaultBehavior: 'idle', linksByDefault: false, solidDefault: false, weight: 0.6 }),
  // Extra portals / decor for variety
  a('door_service', 'door_fake', 'service door', 'portal', ['service', 'corridor', 'parking'], ['static', 'downer', 'dynamic'], { x: 1.1, y: 2.2, z: 0.18 }, 0.9, 1.3, { linksByDefault: true }),
  a('door_glass', 'door_fake', 'glass lobby door', 'portal', ['lobby', 'mall', 'clinic'], ['static', 'upper'], { x: 1.3, y: 2.4, z: 0.16 }, 0.9, 1.35, { linksByDefault: true }),
  a('arch_portal', 'door_fake', 'wrong archway', 'portal', ['courtyard', 'chapel', 'dream'], ['dynamic', 'upper', 'downer'], { x: 2.0, y: 3.0, z: 0.25 }, 0.9, 1.6, { linksByDefault: true }),
  ...EXPANDED_ASSETS,
];

const EXPANSION_THEMES: ThemePreset[] = [
  t('moonlit_field', 'Moonlit Empty Field', 'Wind moves through grass in a circle around you.', 'upper', 'outdoor', ['outdoor', 'meadow', 'night', 'open'], ['bench_wait', 'lamp_floor', 'plant_fern', 'creature_deer', 'arch_portal'], 52, 44, 18, p('#30442d', '#101827', '#18243a', '#a9c8ff', '#182035', '#d9e8ff', '#40506a')),
  t('empty_boardwalk', 'Boardwalk After Closing', 'Every shutter is down except the one behind you.', 'static', 'outdoor', ['outdoor', 'boardwalk', 'night', 'open'], ['bench_wait', 'vending_blue', 'sign_wet', 'lamp_floor', 'arch_portal'], 52, 18, 14, p('#554735', '#132032', '#253950', '#ffd07a', '#172538', '#ffe2a8', '#4c5668')),
  t('rain_plaza', 'Rainless Wet Plaza', 'The paving stones shine beneath a perfectly dry sky.', 'dynamic', 'outdoor', ['outdoor', 'plaza', 'wet', 'open'], ['bench_wait', 'pillar_support', 'sign_wet', 'cart_janitor', 'arch_portal'], 40, 40, 16, p('#4a5860', '#17222c', '#304651', '#67d8e8', '#1c2c34', '#b8f4ff', '#486872')),
  t('rooftop_garden', 'Rooftop Garden', 'The city below has windows but no streets.', 'upper', 'outdoor', ['outdoor', 'rooftop', 'garden', 'open'], ['plant_fern', 'bench_wait', 'lamp_floor', 'door_glass', 'creature_balloon'], 44, 32, 15, p('#52694a', '#20304c', '#466d55', '#ffa9cc', '#27364a', '#ffe1ef', '#607a70')),
  t('highway_rest', 'Rest Stop Beyond the Highway', 'Headlights pass where no road is visible.', 'downer', 'outdoor', ['outdoor', 'highway', 'parking', 'night'], ['vending_blue', 'bench_wait', 'sign_wet', 'lamp_floor', 'npc_raincoat'], 66, 38, 17, p('#555452', '#10151d', '#42464b', '#ffcf58', '#171c24', '#ffe5a0', '#52565e')),
  t('sculpture_park', 'Unfinished Sculpture Park', 'Plaques describe monuments that were never installed.', 'static', 'outdoor', ['outdoor', 'park', 'courtyard', 'open'], ['pillar_support', 'bench_wait', 'plant_fern', 'mirror_tall', 'creature_deer'], 52, 52, 19, p('#697064', '#b9c5d2', '#778276', '#d9eef8', '#9ca9b6', '#ffffff', '#7d8b91')),
  t('fog_playground', 'Playground in the Fog', 'A swing returns slowly to center.', 'downer', 'outdoor', ['outdoor', 'playground', 'fog', 'open'], ['bench_wait', 'sign_wet', 'lamp_floor', 'creature_balloon', 'arch_portal'], 38, 44, 14, p('#596056', '#aeb9b5', '#727b70', '#e8a96b', '#9eaaa6', '#f6eee0', '#74807a')),
  t('salt_flats', 'Salt Flats Terminal', 'Departure gates stand alone beneath a white horizon.', 'dynamic', 'outdoor', ['outdoor', 'salt', 'terminal', 'vast'], ['bench_wait', 'pillar_support', 'door_glass', 'npc_guide', 'arch_portal'], 70, 60, 20, p('#d2cdbc', '#8bb7d4', '#ede8d6', '#fff6cb', '#b7ced8', '#ffffff', '#b8c6c8')),
  t('airport_hangar', 'Airport Hangar Without Planes', 'Painted taxi lines converge beneath an empty gantry.', 'static', 'open-hall', ['hangar', 'airport', 'vast', 'open'], ['pillar_support', 'cart_janitor', 'bench_wait', 'door_service', 'npc_guide'], 60, 46, 17, p('#62696f', '#30363d', '#7b8388', '#f5c44d', '#424a50', '#f4f7f8', '#737b80')),
  t('museum_atrium', 'Museum Atrium', 'The information desk lists an exhibition called You Are Here.', 'upper', 'open-hall', ['museum', 'atrium', 'open', 'marble'], ['bench_wait', 'pillar_support', 'mirror_tall', 'plant_fern', 'npc_clerk'], 46, 38, 15, p('#d5d0c5', '#ebe8df', '#c9c2b5', '#8ba7bd', '#d8d7d0', '#ffffff', '#aaa9a3')),
  t('empty_supermarket', 'Supermarket After Inventory', 'Every aisle marker points to aisle zero.', 'downer', 'open-hall', ['supermarket', 'retail', 'open', 'fluorescent'], ['shelf_toy', 'cart_janitor', 'vending_blue', 'sign_wet', 'npc_mannequin'], 54, 36, 8, p('#7b776b', '#d9d7c9', '#b6b2a4', '#ed5e55', '#9c9a91', '#fffde9', '#97958c')),
  t('convention_hall', 'Unbooked Convention Hall', 'Miles of carpet wait beneath blank hanging signs.', 'static', 'open-hall', ['convention', 'carpet', 'vast', 'open'], ['table_food', 'chair_plastic', 'pillar_support', 'sign_wet', 'npc_clerk'], 62, 50, 13, p('#554d68', '#24232f', '#6d6380', '#65d2c5', '#302d3e', '#e6f5f0', '#625b74')),
  t('indoor_stadium', 'Stadium Between Games', 'The scoreboard counts down from a number too large to read.', 'dynamic', 'open-hall', ['stadium', 'gym', 'vast', 'echo'], ['bench_wait', 'pillar_support', 'sign_wet', 'npc_guide', 'creature_balloon'], 68, 54, 20, p('#5e4438', '#241a18', '#8a5a42', '#ff944d', '#38231d', '#ffd8b8', '#704d3e')),
  t('warehouse_cavern', 'Warehouse Cavern', 'Pallet marks continue across an otherwise empty floor.', 'downer', 'open-hall', ['warehouse', 'industrial', 'vast', 'service'], ['cabinet_util', 'cart_janitor', 'pillar_support', 'mattress_stack', 'npc_shadow'], 56, 44, 12, p('#4e5150', '#242727', '#686d6b', '#e4a655', '#323635', '#f2d4a4', '#5e6562')),
  t('glass_terminal', 'Glass Bus Terminal', 'The arrival board changes whenever you look away.', 'upper', 'open-hall', ['terminal', 'station', 'glass', 'open'], ['bench_wait', 'door_glass', 'vending_blue', 'payphone_wall', 'npc_raincoat'], 50, 30, 11, p('#607985', '#b8d5dd', '#8fb5bf', '#d7f7ff', '#8eb0bb', '#ffffff', '#71939e')),
  t('cathedral_concourse', 'Cathedral Concourse', 'Announcements arrive as chords from hidden speakers.', 'dynamic', 'open-hall', ['cathedral', 'chapel', 'echo', 'open'], ['bench_pew', 'pillar_support', 'vending_blue', 'arch_portal', 'npc_guide'], 36, 62, 18, p('#343044', '#171521', '#504768', '#c5a7ff', '#211d30', '#eee2ff', '#5b526d')),
];

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'fluorescent_lobby',
    title: 'Fluorescent Lobby',
    blurb: 'The receptionist left years ago. The plants did not notice.',
    mood: 'static',
    tags: ['lobby', 'liminal', 'fluorescent'],
    preferredAssets: ['desk_security', 'chair_office', 'plant_fern', 'bench_wait', 'cooler_water', 'door_fake', 'lamp_floor', 'sign_wet', 'npc_clerk'],
    width: 16,
    depth: 14,
    height: 3.6,
    palette: p('#9a8458', '#e8e0cc', '#d2c08a', '#6a7a8a', '#c8b890', '#fff2c9', '#a09070'),
  },
  {
    id: 'wrong_nursery',
    title: 'Wrong Nursery',
    blurb: 'The mobile above the crib turns with no draft.',
    mood: 'downer',
    tags: ['nursery', 'uncanny', 'liminal'],
    preferredAssets: ['crib_empty', 'bottle_giant', 'chair_plastic', 'lamp_floor', 'shelf_toy', 'mirror_tall', 'anomaly_giant_baby'],
    width: 12,
    depth: 12,
    height: 3.2,
    palette: p('#2a2430', '#1a1620', '#3a3144', '#5a6a88', '#1c1822', '#c8b8a0', '#6a6070'),
  },
  {
    id: 'dry_pool',
    title: 'Pool With No Water',
    blurb: 'Chlorine memory hangs in dry air.',
    mood: 'static',
    tags: ['pool', 'humid', 'abandoned'],
    preferredAssets: ['bench_wait', 'sign_wet', 'lamp_floor', 'chair_plastic', 'door_fake', 'npc_raincoat'],
    width: 20,
    depth: 14,
    height: 5,
    palette: p('#6a8a9a', '#d0e0e8', '#8ab0c0', '#4a7080', '#b0c8d0', '#e8f4ff', '#90a8b8'),
  },
  {
    id: 'backrooms_annex',
    title: 'Backrooms Annex',
    blurb: 'The hum is not electrical. It is patient.',
    mood: 'static',
    tags: ['backrooms', 'yellow', 'liminal'],
    preferredAssets: ['pillar_support', 'desk_security', 'chair_plastic', 'cooler_water', 'sign_wet', 'door_fake', 'npc_shadow', 'mattress_stack'],
    width: 22,
    depth: 18,
    height: 3.0,
    palette: p('#9a8458', '#e8e0cc', '#d2c08a', '#6a7a8a', '#c8b890', '#fff2c9', '#a09070'),
  },
  {
    id: 'vending_chapel',
    title: 'Vending Machine Chapel',
    blurb: 'Offerings are accepted in exact change only.',
    mood: 'dynamic',
    tags: ['vending', 'chapel', 'fluorescent'],
    preferredAssets: ['vending_blue', 'bench_pew', 'plant_fern', 'lamp_floor', 'npc_guide'],
    width: 11,
    depth: 14,
    height: 4.2,
    palette: p('#3a3550', '#2a2040', '#4a4070', '#5eead4', '#2a2440', '#e0d0ff', '#7060a0'),
  },
  {
    id: 'food_court',
    title: 'Abandoned Food Court',
    blurb: 'Trays remain stacked for a rush that never comes.',
    mood: 'downer',
    tags: ['mall', 'food court', 'abandoned'],
    preferredAssets: ['table_food', 'chair_plastic', 'cart_janitor', 'vending_blue', 'sign_wet', 'tv_muted', 'npc_mannequin', 'creature_balloon'],
    width: 18,
    depth: 16,
    height: 4,
    palette: p('#2a2430', '#1a1620', '#3a3144', '#6b3038', '#1c1822', '#c8b8a0', '#6a6070'),
  },
  {
    id: 'soft_clinic',
    title: 'Soft Clinic',
    blurb: 'The magazines are from a year that has not happened.',
    mood: 'downer',
    tags: ['clinic', 'waiting room', 'liminal'],
    preferredAssets: ['bench_wait', 'desk_intake', 'chair_office', 'plant_fern', 'cabinet_file', 'door_fake', 'tv_muted', 'npc_clerk'],
    width: 13,
    depth: 11,
    height: 3.1,
    palette: p('#d8d2c8', '#f0ece4', '#e6e0d6', '#8a9aaa', '#d0ccc4', '#fff8f0', '#b0a8a0'),
  },
  {
    id: 'service_b',
    title: 'Service Corridor B',
    blurb: 'Pipes tick like a clock under the floor.',
    mood: 'static',
    tags: ['corridor', 'service', 'narrow'],
    preferredAssets: ['cabinet_util', 'sign_wet', 'cooler_water', 'cart_janitor', 'door_fake', 'lamp_floor', 'npc_shadow'],
    width: 8,
    depth: 24,
    height: 2.8,
    palette: p('#4a4a52', '#2a2a32', '#5a5a66', '#8a9098', '#3a3a44', '#d0d4d8', '#707880'),
  },
  {
    id: 'midnight_court',
    title: 'Midnight Courtyard',
    blurb: 'The fountain is full of coins and no wishes.',
    mood: 'upper',
    tags: ['courtyard', 'night', 'open'],
    preferredAssets: ['pillar_support', 'bench_wait', 'plant_fern', 'lamp_floor', 'creature_deer'],
    width: 18,
    depth: 18,
    height: 6,
    palette: p('#d8c8a8', '#f0e8d8', '#e6dcc4', '#6aa8c8', '#d8e0e8', '#fff6d8', '#b0c0c8'),
  },
  {
    id: 'observation',
    title: 'Observation Room',
    blurb: 'One-way glass only works if someone is watching.',
    mood: 'downer',
    tags: ['observation', 'clinical', 'uncanny'],
    preferredAssets: ['mirror_tall', 'chair_plastic', 'table_food', 'lamp_floor', 'cabinet_file', 'door_fake', 'npc_mannequin'],
    width: 10,
    depth: 10,
    height: 3.4,
    palette: p('#2a2430', '#1a1620', '#3a3144', '#5a6a88', '#1c1822', '#c8b8a0', '#6a6070'),
  },
  {
    id: 'red_stairwell',
    title: 'Red Stairwell Landing',
    blurb: 'The stairs go up and down into the same floor number.',
    mood: 'dynamic',
    tags: ['stairwell', 'red', 'narrow'],
    preferredAssets: ['door_fake', 'lamp_floor', 'sign_wet', 'cabinet_util', 'npc_shadow', 'cooler_water'],
    width: 9,
    depth: 11,
    height: 7,
    palette: p('#4a2020', '#2a1010', '#6a2828', '#ff6a4a', '#3a1818', '#ffd0c0', '#804040'),
  },
  {
    id: 'teal_aquarium',
    title: 'Empty Aquarium Hall',
    blurb: 'Glass tanks hold only dust and a slow blue light.',
    mood: 'upper',
    tags: ['aquarium', 'teal', 'wet'],
    preferredAssets: ['bench_wait', 'plant_fern', 'lamp_floor', 'door_fake', 'mirror_tall', 'creature_deer', 'sign_wet'],
    width: 22,
    depth: 12,
    height: 5.5,
    palette: p('#1a4048', '#0e2430', '#245860', '#5eead4', '#143038', '#c8fff4', '#3a7080'),
  },
  {
    id: 'parking_B2',
    title: 'Parking Level B2',
    blurb: 'Concrete pillars repeat past the painted arrows.',
    mood: 'static',
    tags: ['parking', 'concrete', 'cold'],
    preferredAssets: ['pillar_support', 'door_fake', 'sign_wet', 'cart_janitor', 'npc_raincoat', 'lamp_floor', 'chair_plastic'],
    width: 26,
    depth: 20,
    height: 3.2,
    palette: p('#5a5a58', '#2e2e30', '#6e6e6a', '#c9a227', '#3a3a3c', '#e8e4d8', '#8a8a86'),
  },
  {
    id: 'school_after',
    title: 'After-Hours Classroom',
    blurb: 'Desks face a blackboard that still has tomorrow\'s date.',
    mood: 'downer',
    tags: ['school', 'classroom', 'quiet'],
    preferredAssets: ['desk_intake', 'chair_plastic', 'shelf_toy', 'door_fake', 'tv_muted', 'lamp_floor', 'npc_mannequin', 'plant_fern'],
    width: 14,
    depth: 12,
    height: 3.3,
    palette: p('#c8b090', '#efe6d4', '#d8c8a8', '#4a6a8a', '#d0c8b0', '#fff8e8', '#a09070'),
  },
  {
    id: 'violet_server',
    title: 'Server Room Without Servers',
    blurb: 'Raised floor tiles click. The racks are gone.',
    mood: 'dynamic',
    tags: ['server', 'violet', 'tech'],
    preferredAssets: ['cabinet_file', 'cabinet_util', 'door_fake', 'lamp_floor', 'cooler_water', 'npc_shadow', 'sign_wet'],
    width: 12,
    depth: 16,
    height: 2.7,
    palette: p('#1a1228', '#0e0a18', '#2a1a44', '#a78bfa', '#140e22', '#e9d5ff', '#5b4a7a'),
  },
  {
    id: 'green_greenhouse',
    title: 'Locked Greenhouse',
    blurb: 'Condensation writes on glass that no longer opens.',
    mood: 'upper',
    tags: ['greenhouse', 'green', 'humid'],
    preferredAssets: ['plant_fern', 'bench_wait', 'lamp_floor', 'door_glass', 'cart_janitor', 'creature_deer', 'sign_wet'],
    width: 15,
    depth: 15,
    height: 5.2,
    palette: p('#3a5a30', '#d8f0d0', '#5a8a48', '#8fef7a', '#c8e8c0', '#f0ffe8', '#6a9a58'),
  },
  {
    id: 'subway_end',
    title: 'Subway End of Line',
    blurb: 'The map still shows stations that were never built.',
    mood: 'static',
    tags: ['subway', 'station', 'tile'],
    preferredAssets: ['bench_wait', 'payphone_wall', 'door_fake', 'sign_wet', 'npc_raincoat', 'lamp_floor', 'vending_blue', 'pillar_support'],
    width: 24,
    depth: 10,
    height: 4.0,
    palette: p('#3a3a42', '#1e1e24', '#4a4a55', '#f0c040', '#2a2a32', '#e8e0c8', '#6a6a74'),
  },
  {
    id: 'pink_motel',
    title: 'Pink Motel Hall',
    blurb: 'Ice machines hum behind doors that all say 12.',
    mood: 'downer',
    tags: ['motel', 'pink', 'night'],
    preferredAssets: ['door_fake', 'door_service', 'lamp_floor', 'plant_fern', 'tv_muted', 'mattress_stack', 'npc_mannequin', 'cooler_water'],
    width: 20,
    depth: 8,
    height: 3.0,
    palette: p('#8a5a68', '#2a1820', '#b87888', '#ffb0c8', '#3a2030', '#ffe0ea', '#a07080'),
  },
  {
    id: 'blue_archive',
    title: 'Blue Archive Stacks',
    blurb: 'Every folder is labeled with tomorrow\'s date.',
    mood: 'static',
    tags: ['archive', 'blue', 'office'],
    preferredAssets: ['cabinet_file', 'cabinet_util', 'desk_security', 'chair_office', 'door_fake', 'lamp_floor', 'shelf_toy', 'npc_clerk'],
    width: 14,
    depth: 18,
    height: 3.6,
    palette: p('#2a3a58', '#101828', '#3a4a6a', '#7ab0ff', '#182030', '#d8e8ff', '#4a6088'),
  },
  {
    id: 'orange_gym',
    title: 'Orange Gym After Hours',
    blurb: 'The scoreboard is stuck on a game that never started.',
    mood: 'dynamic',
    tags: ['gym', 'orange', 'echo'],
    preferredAssets: ['bench_wait', 'door_fake', 'sign_wet', 'cooler_water', 'cart_janitor', 'lamp_floor', 'npc_guide', 'pillar_support'],
    width: 22,
    depth: 16,
    height: 7.5,
    palette: p('#8a4a20', '#2a180c', '#b86830', '#ff9a40', '#3a2010', '#ffe0c0', '#a06030'),
  },
  ...EXPANSION_THEMES,
];

const byId = new Map(ASSETS.map((x) => [x.id, x]));
const themeById = new Map(THEME_PRESETS.map((t) => [t.id, t]));

export function getAsset(id: string): AssetDef | undefined {
  return byId.get(id);
}

export function getTheme(id: string): ThemePreset | undefined {
  return themeById.get(id);
}

export function listAssetIds(): string[] {
  return ASSETS.map((a) => a.id);
}

export function listThemeIds(): string[] {
  return THEME_PRESETS.map((t) => t.id);
}

/** Compact catalog summary for LLM prompts (keeps tokens low). */
export function catalogPromptSummary(): string {
  const baseLines = ASSETS.filter((asset) => !asset.family).map(
    (a) =>
      `${a.id}|${a.category}|${a.label}|tags:${a.tags.join(',')}|moods:${a.moods.join(',')}|scale:${a.scaleRange.min}-${a.scaleRange.max}`,
  );
  const families = new Map<string, AssetDef[]>();
  for (const asset of ASSETS) {
    if (!asset.family) continue;
    const values = families.get(asset.family) ?? [];
    values.push(asset);
    families.set(asset.family, values);
  }
  const familyLines = [...families.entries()].map(([family, variants]) => {
    const first = variants[0]!;
    const last = variants.at(-1)!;
    return `${family}|${first.category}|ids:${first.id}..${last.id}|variants:${variants.length}|tags:${first.tags.join(',')}|moods:${first.moods.join(',')}`;
  });
  const themes = THEME_PRESETS.map((t) => `${t.id}|${t.mood}|${t.tags.join(',')}`);
  return `ASSETS:\n${[...baseLines, ...familyLines].join('\n')}\nTHEMES:\n${themes.join('\n')}`;
}

function a(
  id: string,
  kind: string,
  label: string,
  category: AssetCategory,
  tags: string[],
  moods: MoodAxis[],
  defaultScale: { x: number; y: number; z: number },
  minS: number,
  maxS: number,
  extra?: Partial<AssetDef>,
): AssetDef {
  return {
    id,
    kind,
    label,
    category,
    tags,
    moods,
    defaultScale,
    scaleRange: { min: minS, max: maxS },
    weight: 1,
    solidDefault: true,
    ...extra,
  };
}

function p(
  floor: string,
  ceiling: string,
  walls: string,
  accent: string,
  fog: string,
  light: string,
  ambient: string,
): ThemePreset['palette'] {
  return { floor, ceiling, walls, accent, fog, light, ambient };
}

function t(
  id: string,
  title: string,
  blurb: string,
  mood: MoodAxis,
  environment: RoomEnvironment,
  tags: string[],
  preferredAssets: string[],
  width: number,
  depth: number,
  height: number,
  palette: ThemePreset['palette'],
): ThemePreset {
  return {
    id,
    title,
    blurb,
    mood,
    environment,
    tags,
    preferredAssets,
    width,
    depth,
    height,
    palette,
  };
}
