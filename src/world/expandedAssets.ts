import type { EntityBehavior, MoodAxis } from '../types';
import type { AssetCategory, AssetDef } from './assetCatalog';

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
];

export const EXPANDED_ASSETS: AssetDef[] = [...PROP_FAMILIES, ...NPC_FAMILIES].flatMap(
  (assetFamily) =>
    Array.from({ length: VARIANTS_PER_FAMILY }, (_, variant) => ({
      id: `${assetFamily.id}_${String(variant + 1).padStart(2, '0')}`,
      kind: assetFamily.kind,
      label: `${VARIANT_LABELS[variant]} ${assetFamily.label}`,
      category: assetFamily.category,
      tags: [...assetFamily.tags],
      moods: [...assetFamily.moods],
      defaultScale: { ...assetFamily.scale },
      scaleRange: { min: 0.78, max: assetFamily.category === 'npc' ? 1.45 : 1.5 },
      defaultBehavior: assetFamily.behavior,
      linksByDefault: false,
      solidDefault: assetFamily.category !== 'npc',
      weight: assetFamily.weight ?? (assetFamily.category === 'npc' ? 0.62 : 0.78),
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
  if (['bookcase', 'bus_shelter', 'swing_set', 'server_rack', 'aquarium_tank'].includes(kind)) return 5;
  if (['locker', 'hospital_bed', 'gurney', 'barrier', 'planter', 'bleacher', 'tree', 'reception_desk', 'sectional', 'hotel_bed', 'phone_booth', 'lifeguard_chair', 'pallet_stack'].includes(kind)) {
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
