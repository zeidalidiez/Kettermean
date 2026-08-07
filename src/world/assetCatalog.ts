import type { EntityBehavior, MoodAxis } from '../types';

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
}

export interface ThemePreset {
  id: string;
  title: string;
  blurb: string;
  mood: MoodAxis;
  tags: string[];
  preferredAssets: string[];
  width: number;
  depth: number;
  height: number;
  openSides?: Array<'north' | 'south' | 'east' | 'west'>;
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
  tags: string[];
  width: number;
  depth: number;
  height: number;
  fogNear?: number;
  fogFar?: number;
  linkColor?: string;
  openSides?: Array<'north' | 'south' | 'east' | 'west'>;
  palette?: ThemePreset['palette'];
  physics?: {
    gravity?: number;
    moveSpeed?: number;
    friction?: number;
    bounce?: number;
    sway?: number;
  };
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
  a('npc_clerk', 'figure_clerk', 'hallway clerk', 'npc', ['lobby', 'clinic', 'office'], ['static', 'downer'], { x: 0.8, y: 2.2, z: 0.55 }, 0.8, 1.6, { defaultBehavior: 'stare', linksByDefault: true, solidDefault: false }),
  a('npc_guide', 'figure_guide', 'lost tour guide', 'npc', ['mall', 'chapel'], ['dynamic', 'static'], { x: 0.8, y: 2.2, z: 0.55 }, 0.8, 1.7, { defaultBehavior: 'stare', linksByDefault: true, solidDefault: false }),
  a('npc_raincoat', 'figure_raincoat', 'figure in a raincoat', 'npc', ['pool', 'night'], ['downer', 'static'], { x: 0.85, y: 2.2, z: 0.6 }, 0.9, 1.8, { defaultBehavior: 'wander', linksByDefault: true, solidDefault: false }),
  a('npc_mannequin', 'figure_mannequin', 'too-tall mannequin', 'npc', ['mall', 'uncanny'], ['downer', 'static'], { x: 1.0, y: 2.35, z: 0.5 }, 1.0, 2.8, { defaultBehavior: 'idle', linksByDefault: true, solidDefault: false }),
  a('npc_shadow', 'figure_shadow', 'security shadow', 'anomaly', ['backrooms', 'corridor'], ['downer', 'static'], { x: 0.7, y: 2.4, z: 0.5 }, 0.9, 2.2, { defaultBehavior: 'orbit', linksByDefault: true, solidDefault: false }),
  a('creature_deer', 'figure_deer', 'soft-eyed deer', 'creature', ['courtyard', 'dream'], ['upper', 'static'], { x: 0.9, y: 2.2, z: 1.4 }, 0.8, 2.0, { defaultBehavior: 'wander', linksByDefault: true, solidDefault: false }),
  a('creature_balloon', 'figure_balloon', 'floating balloon dog', 'creature', ['mall', 'party', 'uncanny'], ['dynamic', 'upper'], { x: 1.0, y: 2.0, z: 0.7 }, 0.7, 2.5, { defaultBehavior: 'orbit', linksByDefault: false, solidDefault: false }),
  a('anomaly_giant_baby', 'figure_baby', 'giant baby', 'anomaly', ['nursery', 'uncanny', 'horror-lite'], ['downer', 'dynamic'], { x: 2.2, y: 3.1, z: 1.8 }, 1.2, 4.0, { defaultBehavior: 'idle', linksByDefault: true, solidDefault: false, weight: 0.6 }),
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
    openSides: ['east'],
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
    openSides: ['north', 'south'],
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
  const lines = ASSETS.map(
    (a) =>
      `${a.id}|${a.category}|${a.label}|tags:${a.tags.join(',')}|moods:${a.moods.join(',')}|scale:${a.scaleRange.min}-${a.scaleRange.max}`,
  );
  const themes = THEME_PRESETS.map((t) => `${t.id}|${t.mood}|${t.tags.join(',')}`);
  return `ASSETS:\n${lines.join('\n')}\nTHEMES:\n${themes.join('\n')}`;
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
