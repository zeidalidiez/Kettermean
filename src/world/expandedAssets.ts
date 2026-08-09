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
