import type { EntityBehavior, MoodAxis } from '../types';
import type { AssetCategory, AssetDef } from './assetCatalog';
import { sceneSetIdsForTags } from './sceneSets';

export type SemanticModelKind =
  | 'conference_table'
  | 'dentist_chair'
  | 'barber_chair'
  | 'reading_table'
  | 'bunk_bed'
  | 'card_table'
  | 'lectern'
  | 'coat_rack'
  | 'grandfather_clock'
  | 'jukebox'
  | 'luggage_carousel'
  | 'ticket_booth'
  | 'laundry_folding_table'
  | 'patio_table'
  | 'figure_dentist'
  | 'figure_cashier'
  | 'figure_projectionist'
  | 'figure_choir_member'
  | 'figure_park_ranger'
  | 'figure_hotel_guest'
  | 'figure_crossing_guard'
  | 'figure_bingo_caller';

interface SemanticFamily {
  id: string;
  kind: SemanticModelKind;
  label: string;
  category: AssetCategory;
  tags: string[];
  scale: { x: number; y: number; z: number };
  renderCost: number;
  behavior?: EntityBehavior;
}

const VARIANT_LABELS = [
  'faded',
  'municipal',
  'vinyl',
  'lacquered',
  'floral',
  'chrome',
  'child-sized',
  'ceremonial',
] as const;

/**
 * A separate semantic catalog batch. Meaning stays here while geometry stays in
 * semanticModels.ts, preventing the main catalog and model builder from becoming
 * a single unreviewable file.
 */
const FAMILIES: SemanticFamily[] = [
  prop('conference_table', 'conference table', ['office', 'civic', 'convention', 'meeting'], { x: 3.8, y: 1.05, z: 1.45 }, 4),
  prop('dentist_chair', 'dentist chair', ['clinic', 'hospital', 'observation', 'dental'], { x: 2.1, y: 1.65, z: 0.95 }, 4),
  prop('barber_chair', 'barber chair', ['retail', 'service', 'motel', 'salon'], { x: 0.95, y: 1.65, z: 0.95 }, 4),
  prop('reading_table', 'library reading table', ['archive', 'school', 'museum', 'library'], { x: 2.4, y: 1.15, z: 1.25 }, 4),
  prop('bunk_bed', 'institutional bunk bed', ['home', 'motel', 'clinic', 'abandoned'], { x: 2.15, y: 2.15, z: 1.0 }, 4),
  prop('card_table', 'folding card table', ['leisure', 'motel', 'banquet', 'home'], { x: 1.35, y: 0.95, z: 1.35 }, 3),
  prop('lectern', 'public lectern', ['school', 'convention', 'chapel', 'ceremonial'], { x: 0.95, y: 1.45, z: 0.72 }, 3),
  prop('coat_rack', 'standing coat rack', ['hotel', 'office', 'school', 'lobby'], { x: 0.9, y: 2.0, z: 0.9 }, 3),
  prop('grandfather_clock', 'grandfather clock', ['home', 'motel', 'ceremonial', 'haunted'], { x: 0.85, y: 2.25, z: 0.5 }, 4),
  prop('jukebox', 'silent jukebox', ['food', 'motel', 'retail', 'leisure'], { x: 1.05, y: 1.85, z: 0.72 }, 4),
  prop('luggage_carousel', 'baggage carousel', ['airport', 'terminal', 'transit', 'concourse'], { x: 4.2, y: 1.15, z: 2.8 }, 5),
  prop('ticket_booth', 'closed ticket booth', ['transit', 'cinema', 'leisure', 'station'], { x: 2.1, y: 2.6, z: 1.55 }, 5),
  prop('laundry_folding_table', 'laundry folding table', ['laundry', 'motel', 'service', 'home'], { x: 2.1, y: 1.05, z: 1.0 }, 4),
  prop('patio_table', 'umbrella patio table', ['outdoor', 'food', 'motel', 'plaza'], { x: 2.3, y: 2.9, z: 2.3 }, 4),
  npc('npc_dentist', 'figure_dentist', 'waiting dentist', ['clinic', 'hospital', 'observation', 'dental'], 'stare'),
  npc('npc_cashier', 'figure_cashier', 'off-shift cashier', ['retail', 'supermarket', 'mall', 'food'], 'idle'),
  npc('npc_projectionist', 'figure_projectionist', 'last projectionist', ['cinema', 'convention', 'leisure', 'museum'], 'orbit'),
  npc('npc_choir_member', 'figure_choir_member', 'silent choir member', ['chapel', 'cathedral', 'ceremonial', 'school'], 'stare'),
  npc('npc_park_ranger', 'figure_park_ranger', 'night park ranger', ['park', 'outdoor', 'meadow', 'garden'], 'wander'),
  npc('npc_hotel_guest', 'figure_hotel_guest', 'unregistered hotel guest', ['motel', 'hotel', 'lobby', 'home'], 'wander'),
  npc('npc_crossing_guard', 'figure_crossing_guard', 'crossing guard', ['roadside', 'school', 'parking', 'civic'], 'orbit'),
  npc('npc_bingo_caller', 'figure_bingo_caller', 'bingo caller', ['leisure', 'banquet', 'convention', 'civic'], 'idle'),
];

export const SEMANTIC_ASSETS: AssetDef[] = FAMILIES.flatMap((assetFamily) =>
  Array.from({ length: 8 }, (_, variant) => ({
    id: `${assetFamily.id}_${String(variant + 1).padStart(2, '0')}`,
    kind: assetFamily.kind,
    label: `${VARIANT_LABELS[variant]} ${assetFamily.label}`,
    category: assetFamily.category,
    tags: [...assetFamily.tags],
    setIds: sceneSetIdsForTags(assetFamily.tags),
    moods: ['upper', 'downer', 'static', 'dynamic'] as MoodAxis[],
    defaultScale: { ...assetFamily.scale },
    scaleRange: {
      min: 0.74,
      max: assetFamily.category === 'npc' ? 1.6 : 1.8,
    },
    defaultBehavior: assetFamily.behavior,
    linksByDefault: false,
    solidDefault: assetFamily.category !== 'npc',
    weight: assetFamily.category === 'npc' ? 0.6 : 0.74,
    renderCost: assetFamily.renderCost,
    family: assetFamily.id,
    variant,
  })),
);

export const SEMANTIC_ASSET_COUNT = SEMANTIC_ASSETS.length;

function prop(
  kind: SemanticModelKind,
  label: string,
  tags: string[],
  scale: { x: number; y: number; z: number },
  renderCost: number,
): SemanticFamily {
  return { id: kind, kind, label, category: 'furniture', tags, scale, renderCost };
}

function npc(
  id: string,
  kind: SemanticModelKind,
  label: string,
  tags: string[],
  behavior: EntityBehavior,
): SemanticFamily {
  return {
    id,
    kind,
    label,
    category: 'npc',
    tags,
    scale: { x: 0.82, y: 2.4, z: 0.64 },
    renderCost: 5,
    behavior,
  };
}
