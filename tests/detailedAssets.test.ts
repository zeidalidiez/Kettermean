import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { ASSETS, catalogPromptSummary } from '../src/world/assetCatalog';
import {
  DETAILED_ASSET_COUNT,
  DETAILED_ASSETS,
  DETAILED_BEING_ASSET_COUNT,
  DETAILED_BEING_FAMILIES,
  DETAILED_CREATURE_KINDS,
  DETAILED_HUMANOID_KINDS,
  DETAILED_PROP_ASSET_COUNT,
  DETAILED_PROP_FAMILIES,
} from '../src/world/detailedAssets';
import { faceKitDecision } from '../src/world/faceKits';
import { generateOfflineRoom } from '../src/world/offlineGenerator';
import {
  boundsForKind,
  buildModel,
  clearModelMaterialCache,
  type PropKind,
} from '../src/world/models';

afterAll(() => clearModelMaterialCache());

describe('high-detail artisan expansion', () => {
  it('adds 304 props and 152 beings as 456 unique catalog assets', () => {
    expect(DETAILED_PROP_FAMILIES).toHaveLength(38);
    expect(DETAILED_BEING_FAMILIES).toHaveLength(19);
    expect(DETAILED_PROP_ASSET_COUNT).toBe(304);
    expect(DETAILED_BEING_ASSET_COUNT).toBe(152);
    expect(DETAILED_ASSET_COUNT).toBe(456);
    expect(new Set(DETAILED_ASSETS.map((asset) => asset.id)).size).toBe(456);
    expect(DETAILED_ASSETS.filter((asset) => asset.category === 'npc')).toHaveLength(72);
    expect(DETAILED_ASSETS.filter((asset) => asset.category === 'creature')).toHaveLength(80);
    // Fast membership check instead of vitest's deep arrayContaining, which is
    // quadratic across the multi-thousand-entry catalog.
    const catalogIds = new Set(ASSETS.map((asset) => asset.id));
    expect(DETAILED_ASSETS.every((asset) => catalogIds.has(asset.id))).toBe(true);

    const families = Map.groupBy(DETAILED_ASSETS, (asset) => asset.family);
    expect(families.size).toBe(57);
    for (const variants of families.values()) {
      expect(variants).toHaveLength(8);
      expect(new Set(variants.map((asset) => asset.variant))).toEqual(
        new Set([0, 1, 2, 3, 4, 5, 6, 7]),
      );
      expect(variants.every((asset) => asset.tags.includes('high-detail'))).toBe(true);
      expect(variants.every((asset) => asset.setIds.length > 0)).toBe(true);
    }
  });

  it('builds every addition as a dense, geometry-distinct composed model', () => {
    const signaturesByFamily = new Map<string, Set<string>>();

    for (const asset of DETAILED_ASSETS) {
      const kind = asset.kind as PropKind;
      const model = buildModel(kind, '#667b91', '#bda98c', asset.id);
      const meshes: THREE.Mesh[] = [];
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) meshes.push(object);
      });

      const minimum = asset.category === 'npc' ? 34 : asset.category === 'creature' ? 26 : 18;
      expect(meshes.length, asset.id).toBeGreaterThanOrEqual(minimum);
      expect(asset.renderCost, asset.id).toBeGreaterThanOrEqual(Math.ceil(meshes.length / 5));
      expect(model.userData.detailTier, asset.id).toBe('high');
      expectModelFitsDeclaredBounds(model, boundsForKind(kind), asset.id);

      const signature = meshes.map((mesh) => [
        mesh.name,
        mesh.geometry.type,
        ...mesh.scale.toArray(),
        ...mesh.position.toArray(),
        ...mesh.rotation.toArray().slice(0, 3),
      ].join(':')).join('|');
      const signatures = signaturesByFamily.get(asset.family!) ?? new Set<string>();
      signatures.add(signature);
      signaturesByFamily.set(asset.family!, signatures);
    }

    for (const [family, signatures] of signaturesByFamily) {
      expect(signatures.size, family).toBe(8);
    }
  }, 30_000);

  it('cross-mounts animal faces on people, human faces on animals, and either on objects', () => {
    for (const kind of DETAILED_HUMANOID_KINDS) {
      const decisions = Array.from({ length: 8 }, (_, variant) =>
        faceKitDecision(kind, variant, 'humanoid'),
      );
      expect(decisions.filter((decision) => decision.origin === 'animal')).toHaveLength(3);
      expect(decisions.every((decision) => decision.mounted)).toBe(true);
    }

    for (const kind of DETAILED_CREATURE_KINDS) {
      const decisions = Array.from({ length: 8 }, (_, variant) =>
        faceKitDecision(kind, variant, 'animal'),
      );
      expect(decisions.filter((decision) => decision.origin === 'human')).toHaveLength(3);
      expect(decisions.every((decision) => decision.mounted)).toBe(true);
    }

    const objectDecisions = DETAILED_PROP_FAMILIES.flatMap((family) =>
      Array.from({ length: 8 }, (_, variant) => faceKitDecision(family.kind, variant, 'object')),
    );
    expect(objectDecisions.filter((decision) => decision.mounted).length).toBeGreaterThanOrEqual(76);
    expect(objectDecisions.some((decision) => decision.mounted && decision.origin === 'human')).toBe(true);
    expect(objectDecisions.some((decision) => decision.mounted && decision.origin === 'animal')).toBe(true);

    const crossedPerson = buildModel(
      'detail_figure_apothecary',
      '#667b91',
      '#bda98c',
      'artisan_npc_apothecary_03',
    );
    const crossedAnimal = buildModel(
      'detail_animal_fox',
      '#667b91',
      '#bda98c',
      'artisan_creature_fox_02',
    );
    const facedObject = buildModel(
      'detail_rolltop_desk',
      '#667b91',
      '#bda98c',
      'artisan_rolltop_desk_03',
    );
    expect(crossedPerson.getObjectByName('surreal-face-kit')?.userData.faceKitOrigin).toBe('animal');
    expect(crossedAnimal.getObjectByName('surreal-face-kit')?.userData.faceKitOrigin).toBe('human');
    expect(facedObject.getObjectByName('surreal-face-kit')?.userData.faceHost).toBe('object');
  });

  it('advertises every family compactly to model directors', () => {
    const prompt = catalogPromptSummary();
    for (const family of [...DETAILED_PROP_FAMILIES, ...DETAILED_BEING_FAMILIES]) {
      expect(prompt).toContain(`${family.id}|`);
    }
    expect(prompt).not.toContain('artisan_rolltop_desk_02');
    expect(prompt.length).toBeLessThan(30_000);
  });

  it('makes most families reachable in ordinary procedural rooms', () => {
    const ids = new Set(DETAILED_ASSETS.map((asset) => asset.id));
    const familyById = new Map(DETAILED_ASSETS.map((asset) => [asset.id, asset.family!]));
    const used = new Set<string>();
    const usedFamilies = new Set<string>();

    for (let index = 0; index < 500; index += 1) {
      const room = generateOfflineRoom({
        seed: `artisan-coverage-${index}`,
        previousTitles: [],
        moodBias: 'static',
        allowGore: false,
        linkIndex: index,
      });
      for (const object of [...room.props, ...room.entities]) {
        if (!object.assetId || !ids.has(object.assetId)) continue;
        used.add(object.assetId);
        usedFamilies.add(familyById.get(object.assetId)!);
      }
    }

    expect(usedFamilies.size, `families reached: ${usedFamilies.size}`).toBeGreaterThanOrEqual(50);
    expect(used.size, `variants reached: ${used.size}`).toBeGreaterThanOrEqual(180);
  }, 30_000);
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
