import type { MoodAxis, RoomComposition } from '../types';
import type { SeededRng } from '../core/rng';

export type SceneSetId =
  | 'institutional'
  | 'workplace'
  | 'hospitality'
  | 'domestic'
  | 'transit'
  | 'retail'
  | 'education'
  | 'industrial'
  | 'aquatic'
  | 'greenspace'
  | 'roadside'
  | 'ceremonial'
  | 'technology'
  | 'leisure'
  | 'liminal';

export interface SceneSetDefinition {
  id: SceneSetId;
  label: string;
  tags: readonly string[];
  /** Curated contradictions that read as deliberate rather than random noise. */
  contrasts: readonly SceneSetId[];
}

export interface PlannedSceneComposition extends RoomComposition {
  primarySet: SceneSetId;
  supportingSet?: SceneSetId;
  contrastSet?: SceneSetId;
}

export const SCENE_SETS: readonly SceneSetDefinition[] = [
  set('institutional', 'clinical institution', ['clinic', 'clinical', 'observation', 'waiting room', 'hospital'], ['leisure', 'domestic', 'ceremonial']),
  set('workplace', 'office workplace', ['office', 'archive', 'civic', 'security', 'reception'], ['aquatic', 'leisure', 'greenspace']),
  set('hospitality', 'hotel hospitality', ['motel', 'hotel', 'lobby', 'banquet', 'reception'], ['industrial', 'institutional', 'roadside']),
  set('domestic', 'domestic interior', ['home', 'nursery', 'bedroom', 'laundry'], ['industrial', 'transit', 'technology']),
  set('transit', 'public transit', ['station', 'terminal', 'subway', 'airport', 'concourse', 'commuter'], ['domestic', 'ceremonial', 'aquatic']),
  set('retail', 'retail and food service', ['mall', 'retail', 'supermarket', 'arcade', 'food', 'food court'], ['institutional', 'ceremonial', 'industrial']),
  set('education', 'school and study', ['school', 'classroom', 'university', 'gym', 'lab'], ['hospitality', 'industrial', 'roadside']),
  set('industrial', 'industrial service', ['industrial', 'warehouse', 'service', 'hangar', 'loading'], ['domestic', 'ceremonial', 'aquatic']),
  set('aquatic', 'pool and aquarium', ['pool', 'aquarium', 'wet', 'waterpark', 'lifeguard'], ['workplace', 'industrial', 'transit']),
  set('greenspace', 'park and garden', ['park', 'garden', 'meadow', 'courtyard', 'playground', 'plaza', 'outdoor'], ['technology', 'institutional', 'workplace']),
  set('roadside', 'roadside infrastructure', ['highway', 'parking', 'boardwalk', 'carpark', 'roadside'], ['hospitality', 'ceremonial', 'education']),
  set('ceremonial', 'ceremonial public space', ['chapel', 'cathedral', 'museum', 'convention', 'stadium', 'exhibition'], ['retail', 'industrial', 'transit']),
  set('technology', 'technical infrastructure', ['server', 'tech', 'data', 'terminal_console'], ['greenspace', 'domestic', 'ceremonial']),
  set('leisure', 'leisure and entertainment', ['party', 'cinema', 'stadium', 'arcade', 'playground', 'gym'], ['institutional', 'workplace', 'roadside']),
  set('liminal', 'liminal anomaly', ['liminal', 'uncanny', 'backrooms', 'odd', 'abandoned', 'dream', 'horror-lite'], ['domestic', 'institutional', 'ceremonial']),
] as const;

const BY_ID = new Map(SCENE_SETS.map((sceneSet) => [sceneSet.id, sceneSet]));
const GENERIC_TAGS = new Set([
  'outdoor',
  'open',
  'vast',
  'night',
  'static',
  'dynamic',
  'upper',
  'downer',
  'fluorescent',
  'cold',
  'echo',
  'fog',
]);

export function getSceneSet(id?: string): SceneSetDefinition | undefined {
  return id ? BY_ID.get(id as SceneSetId) : undefined;
}

export function sceneSetIdsForTags(tags: readonly string[]): SceneSetId[] {
  const normalized = new Set(tags.map(normalizeTag));
  const matches = SCENE_SETS.filter((sceneSet) =>
    sceneSet.tags.some((tag) => normalized.has(normalizeTag(tag))),
  ).map((sceneSet) => sceneSet.id);
  return matches.length ? matches : ['liminal'];
}

export function planSceneComposition(
  rng: SeededRng,
  options: {
    themeTags: readonly string[];
    preferredSetIds?: readonly string[];
    avoidSetIds?: readonly string[];
    mood: MoodAxis;
    targetPacks: number;
  },
): PlannedSceneComposition {
  const themeTags = new Set(options.themeTags.map(normalizeTag));
  const preferred = new Set(options.preferredSetIds ?? []);
  const avoided = new Set(options.avoidSetIds ?? []);
  const ranked = SCENE_SETS.map((sceneSet) => {
    const themeScore = sceneSet.tags.reduce(
      (score, tag) => score + (themeTags.has(normalizeTag(tag)) ? tagWeight(tag) : 0),
      0,
    );
    const score =
      themeScore +
      (preferred.has(sceneSet.id) ? 0.55 : 0) -
      (avoided.has(sceneSet.id) ? 0.48 : 0) +
      rng.float(0, 0.16);
    return { sceneSet, score, themeScore };
  }).sort((a, b) => b.score - a.score);

  const primary = ranked[0]!.sceneSet;
  const supportingCandidate = ranked.find(
    (candidate) => candidate.sceneSet.id !== primary.id && candidate.themeScore >= 0.9,
  );
  const supporting = supportingCandidate?.sceneSet;

  const baseContrastChance =
    options.mood === 'dynamic'
      ? 0.62
      : options.mood === 'downer'
        ? 0.52
        : options.mood === 'static'
          ? 0.4
          : 0.34;
  const contrastCandidates = primary.contrasts
    .map((id) => getSceneSet(id))
    .filter((sceneSet): sceneSet is SceneSetDefinition =>
      Boolean(sceneSet && sceneSet.id !== supporting?.id && !avoided.has(sceneSet.id)),
    );
  const contrast =
    contrastCandidates.length && rng.chance(baseContrastChance)
      ? rng.pick(contrastCandidates)
      : undefined;

  return {
    primarySet: primary.id,
    ...(supporting ? { supportingSet: supporting.id } : {}),
    ...(contrast ? { contrastSet: contrast.id } : {}),
    contrastBudget: contrast
      ? clamp(Math.round(options.targetPacks * rng.float(0.07, 0.12)), 1, 4)
      : 0,
  };
}

export function setAffinity(
  setIds: readonly string[] | undefined,
  composition: PlannedSceneComposition,
): 'primary' | 'supporting' | 'contrast' | 'unrelated' {
  if (!setIds?.length) return 'unrelated';
  if (setIds.includes(composition.primarySet)) return 'primary';
  if (composition.supportingSet && setIds.includes(composition.supportingSet)) return 'supporting';
  if (composition.contrastSet && setIds.includes(composition.contrastSet)) return 'contrast';
  return 'unrelated';
}

export function compositionSetIds(
  composition: PlannedSceneComposition,
  lane: 'coherent' | 'contrast' = 'coherent',
): SceneSetId[] {
  if (lane === 'contrast') {
    return composition.contrastSet ? [composition.contrastSet] : [];
  }
  return [
    composition.primarySet,
    ...(composition.supportingSet ? [composition.supportingSet] : []),
  ];
}

function set(
  id: SceneSetId,
  label: string,
  tags: readonly string[],
  contrasts: readonly SceneSetId[],
): SceneSetDefinition {
  return { id, label, tags, contrasts };
}

function tagWeight(tag: string): number {
  return GENERIC_TAGS.has(normalizeTag(tag)) ? 0.28 : 1;
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/[_-]+/g, ' ');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
