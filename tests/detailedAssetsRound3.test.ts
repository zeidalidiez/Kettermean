import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { ASSETS, catalogPromptSummary } from '../src/world/assetCatalog';
import {
  EXHIBITION_ASSET_COUNT,
  EXHIBITION_ASSETS,
  EXHIBITION_BEING_ASSET_COUNT,
  EXHIBITION_BEING_FAMILIES,
  EXHIBITION_CREATURE_KINDS,
  EXHIBITION_HUMANOID_KINDS,
  EXHIBITION_PROP_ASSET_COUNT,
  EXHIBITION_PROP_FAMILIES,
  EXHIBITION_VARIANTS_PER_FAMILY,
} from '../src/world/detailedAssetsRound3';
import { faceKitDecision } from '../src/world/faceKits';
import { generateOfflineRoom } from '../src/world/offlineGenerator';
import {
  boundsForKind,
  buildModel,
  clearModelMaterialCache,
  type PropKind,
} from '../src/world/models';

afterAll(() => clearModelMaterialCache());

describe('third high-detail exhibition expansion', () => {
  it('adds exactly 300 items and 150 beings across 75 new families', () => {
    expect(EXHIBITION_PROP_FAMILIES).toHaveLength(50);
    expect(EXHIBITION_BEING_FAMILIES).toHaveLength(25);
    expect(EXHIBITION_VARIANTS_PER_FAMILY).toBe(6);
    expect(EXHIBITION_PROP_ASSET_COUNT).toBe(300);
    expect(EXHIBITION_BEING_ASSET_COUNT).toBe(150);
    expect(EXHIBITION_ASSET_COUNT).toBe(450);
    expect(new Set(EXHIBITION_ASSETS.map((asset) => asset.id)).size).toBe(450);
    expect(EXHIBITION_ASSETS.filter((asset) => asset.category === 'npc')).toHaveLength(90);
    expect(EXHIBITION_ASSETS.filter((asset) => asset.category === 'creature')).toHaveLength(60);
    expect(ASSETS).toEqual(expect.arrayContaining(EXHIBITION_ASSETS));

    const composedVariants = ASSETS.filter((asset) => asset.family);
    expect(composedVariants).toHaveLength(4_636);
    expect(new Set(composedVariants.map((asset) => asset.family)).size).toBe(617);
    expect(ASSETS.filter((asset) => asset.tags.includes('high-detail'))).toHaveLength(3_220);

    const exhibitionIds = new Set(EXHIBITION_ASSETS.map((asset) => asset.id));
    const exhibitionKinds = new Set(EXHIBITION_ASSETS.map((asset) => asset.kind));
    expect(ASSETS.filter(
      (asset) => !exhibitionIds.has(asset.id) && exhibitionKinds.has(asset.kind),
    )).toEqual([]);

    const families = Map.groupBy(EXHIBITION_ASSETS, (asset) => asset.family);
    expect(families.size).toBe(75);
    for (const variants of families.values()) {
      expect(variants).toHaveLength(6);
      expect(new Set(variants.map((asset) => asset.variant))).toEqual(
        new Set([0, 1, 2, 3, 4, 5]),
      );
      expect(variants.every((asset) => asset.tags.includes('high-detail'))).toBe(true);
      expect(variants.every((asset) => asset.tags.includes('exhibition'))).toBe(true);
      expect(variants.every((asset) => asset.setIds.length > 0)).toBe(true);
    }
  });

  it('builds every addition as dense 3D geometry with distinct family variants', () => {
    const signaturesByFamily = new Map<string, Set<string>>();
    const representativeFamilySignatures = new Set<string>();

    for (const asset of EXHIBITION_ASSETS) {
      const kind = asset.kind as PropKind;
      const model = buildModel(kind, '#607c91', '#c0a27e', asset.id);
      const meshes: THREE.Mesh[] = [];
      const signatureParts: string[] = [];
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        meshes.push(object);
        signatureParts.push([
          object.name,
          object.geometry.type,
          ...object.scale.toArray(),
          ...object.position.toArray(),
          ...object.rotation.toArray().slice(0, 3),
        ].join(':'));
      });

      const minimum = asset.category === 'npc' ? 45 : asset.category === 'creature' ? 38 : 34;
      expect(meshes.length, asset.id).toBeGreaterThanOrEqual(minimum);
      expect(asset.renderCost, asset.id).toBeGreaterThanOrEqual(Math.ceil(meshes.length / 5));
      expect(model.userData.detailTier, asset.id).toBe('exhibition');
      expectModelFitsDeclaredBounds(model, boundsForKind(kind), asset.id);

      const signature = signatureParts.join('|');
      const signatures = signaturesByFamily.get(asset.family!) ?? new Set<string>();
      signatures.add(signature);
      signaturesByFamily.set(asset.family!, signatures);
      if (asset.variant === 0) representativeFamilySignatures.add(signature);
    }

    for (const [family, signatures] of signaturesByFamily) {
      expect(signatures.size, family).toBe(6);
    }
    expect(representativeFamilySignatures.size).toBe(75);
  }, 45_000);

  it('keeps cross-category faces on people, animals, and selected objects', () => {
    for (const kind of EXHIBITION_HUMANOID_KINDS) {
      const decisions = Array.from({ length: 6 }, (_, variant) =>
        faceKitDecision(kind, variant, 'humanoid'),
      );
      expect(decisions.filter((decision) => decision.origin === 'animal')).toHaveLength(2);
      expect(decisions.every((decision) => decision.mounted)).toBe(true);
    }

    for (const kind of EXHIBITION_CREATURE_KINDS) {
      const decisions = Array.from({ length: 6 }, (_, variant) =>
        faceKitDecision(kind, variant, 'animal'),
      );
      expect(decisions.filter((decision) => decision.origin === 'human')).toHaveLength(2);
      expect(decisions.every((decision) => decision.mounted)).toBe(true);
    }

    const facedObjects = EXHIBITION_PROP_FAMILIES.flatMap((family) =>
      Array.from({ length: 6 }, (_, variant) => faceKitDecision(family.kind, variant, 'object')),
    );
    expect(facedObjects.filter((decision) => decision.mounted).length).toBeGreaterThanOrEqual(50);
    expect(facedObjects.some((decision) => decision.origin === 'human' && decision.mounted)).toBe(true);
    expect(facedObjects.some((decision) => decision.origin === 'animal' && decision.mounted)).toBe(true);
  });

  it('advertises every family compactly without listing all 450 variants', () => {
    const prompt = catalogPromptSummary();
    for (const family of [...EXHIBITION_PROP_FAMILIES, ...EXHIBITION_BEING_FAMILIES]) {
      expect(prompt).toContain(`${family.id}|`);
    }
    expect(prompt).not.toContain('exhibition_steamer_trunk_02');
    expect(prompt.length).toBeLessThan(30_000);
  });

  it('makes every new family and most variants reachable in ordinary rooms', () => {
    const ids = new Set(EXHIBITION_ASSETS.map((asset) => asset.id));
    const familyById = new Map(EXHIBITION_ASSETS.map((asset) => [asset.id, asset.family!]));
    const used = new Set<string>();
    const usedFamilies = new Set<string>();

    for (let index = 0; index < 6_000; index += 1) {
      const room = generateOfflineRoom({
        seed: `exhibition-coverage-${index}`,
        previousTitles: [],
        moodBias: index % 2 ? 'dynamic' : 'static',
        allowGore: false,
        linkIndex: index,
      });
      for (const object of [...room.props, ...room.entities]) {
        if (!object.assetId || !ids.has(object.assetId)) continue;
        used.add(object.assetId);
        usedFamilies.add(familyById.get(object.assetId)!);
      }
    }

    expect(usedFamilies.size, `families reached: ${usedFamilies.size}`).toBe(75);
    expect(used.size, `variants reached: ${used.size}`).toBeGreaterThanOrEqual(410);
  }, 45_000);
});

function expectModelFitsDeclaredBounds(
  model: THREE.Group,
  declared: { w: number; h: number; d: number },
  assetId: string,
): void {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  expect(size.x, `${assetId}:width`).toBeCloseTo(declared.w, 5);
  expect(size.y, `${assetId}:height`).toBeCloseTo(declared.h, 5);
  expect(size.z, `${assetId}:depth`).toBeCloseTo(declared.d, 5);
  expect(box.min.y, `${assetId}:feet`).toBeCloseTo(0, 5);
  expect(center.x, `${assetId}:center-x`).toBeCloseTo(0, 5);
  expect(center.z, `${assetId}:center-z`).toBeCloseTo(0, 5);
}
