import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { ASSETS, catalogPromptSummary } from '../src/world/assetCatalog';
import {
  ATELIER_ASSET_COUNT,
  ATELIER_ASSETS,
  ATELIER_BEING_ASSET_COUNT,
  ATELIER_BEING_FAMILIES,
  ATELIER_CREATURE_KINDS,
  ATELIER_HUMANOID_KINDS,
  ATELIER_PROP_ASSET_COUNT,
  ATELIER_PROP_FAMILIES,
  ATELIER_VARIANTS_PER_FAMILY,
} from '../src/world/detailedAssetsRound4';
import { faceKitDecision } from '../src/world/faceKits';
import { generateOfflineRoom } from '../src/world/offlineGenerator';
import {
  boundsForKind,
  buildModel,
  clearModelMaterialCache,
  type PropKind,
} from '../src/world/models';

afterAll(() => clearModelMaterialCache());

describe('fourth high-detail atelier expansion', () => {
  it('adds exactly 300 items and 150 beings across 75 collision-free families', () => {
    expect(ATELIER_PROP_FAMILIES).toHaveLength(50);
    expect(ATELIER_BEING_FAMILIES).toHaveLength(25);
    expect(ATELIER_HUMANOID_KINDS).toHaveLength(15);
    expect(ATELIER_CREATURE_KINDS).toHaveLength(10);
    expect(ATELIER_VARIANTS_PER_FAMILY).toBe(6);
    expect(ATELIER_PROP_ASSET_COUNT).toBe(300);
    expect(ATELIER_BEING_ASSET_COUNT).toBe(150);
    expect(ATELIER_ASSET_COUNT).toBe(450);
    expect(new Set(ATELIER_ASSETS.map((asset) => asset.id)).size).toBe(450);
    expect(ATELIER_ASSETS.filter((asset) => asset.category === 'npc')).toHaveLength(90);
    expect(ATELIER_ASSETS.filter((asset) => asset.category === 'creature')).toHaveLength(60);
    expect(ASSETS).toEqual(expect.arrayContaining(ATELIER_ASSETS));
    expect(ASSETS).toHaveLength(3_263);

    const composedVariants = ASSETS.filter((asset) => asset.family);
    expect(composedVariants).toHaveLength(3_228);
    expect(new Set(composedVariants.map((asset) => asset.family)).size).toBe(441);
    expect(ASSETS.filter((asset) => asset.tags.includes('high-detail'))).toHaveLength(1_812);

    const atelierIds = new Set(ATELIER_ASSETS.map((asset) => asset.id));
    const atelierKinds = new Set(ATELIER_ASSETS.map((asset) => asset.kind));
    expect(atelierKinds.size).toBe(75);
    expect(ASSETS.filter(
      (asset) => !atelierIds.has(asset.id) && atelierKinds.has(asset.kind),
    )).toEqual([]);

    const families = Map.groupBy(ATELIER_ASSETS, (asset) => asset.family);
    expect(families.size).toBe(75);
    for (const variants of families.values()) {
      expect(variants).toHaveLength(6);
      expect(new Set(variants.map((asset) => asset.variant))).toEqual(
        new Set([0, 1, 2, 3, 4, 5]),
      );
      expect(variants.every((asset) => asset.tags.includes('high-detail'))).toBe(true);
      expect(variants.every((asset) => asset.tags.includes('atelier'))).toBe(true);
      expect(variants.every((asset) => asset.setIds.length > 0)).toBe(true);
      expect(variants.every((asset) => asset.renderCost! >= 22)).toBe(true);
    }
  });

  it('builds every addition as layered 3D geometry above the prior detail floor', () => {
    const signaturesByFamily = new Map<string, Set<string>>();
    const representativeFamilySignatures = new Set<string>();

    for (const asset of ATELIER_ASSETS) {
      const kind = asset.kind as PropKind;
      const model = buildModel(kind, '#607c91', '#c0a27e', asset.id);
      const meshes: THREE.Mesh[] = [];
      const signatureParts: string[] = [];
      const materialColors = new Set<string>();
      const geometryTypes = new Set<string>();
      let sprites = 0;
      let texturedMeshes = 0;
      model.traverse((object) => {
        if (object instanceof THREE.Sprite) sprites += 1;
        if (!(object instanceof THREE.Mesh)) return;
        meshes.push(object);
        geometryTypes.add(object.geometry.type);
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) {
            materialColors.add(material.color.getHexString());
            if (material.map) texturedMeshes += 1;
          }
        }
        signatureParts.push([
          object.name,
          object.geometry.type,
          ...object.scale.toArray(),
          ...object.position.toArray(),
          ...object.rotation.toArray().slice(0, 3),
        ].join(':'));
      });

      // Round three guaranteed 34 prop, 45 humanoid, and 38 creature meshes.
      // This collection raises those construction floors materially.
      const minimum = asset.category === 'npc' ? 93 : asset.category === 'creature' ? 63 : 68;
      expect(meshes.length, asset.id).toBeGreaterThanOrEqual(minimum);
      expect(geometryTypes.size, asset.id).toBeGreaterThanOrEqual(4);
      expect(materialColors.size, asset.id).toBeGreaterThanOrEqual(6);
      expect(sprites, asset.id).toBe(0);
      expect(texturedMeshes, asset.id).toBe(0);
      expect(asset.renderCost, asset.id).toBeGreaterThanOrEqual(Math.ceil(meshes.length / 5));
      expect(model.userData.detailTier, asset.id).toBe('atelier');
      expect(model.userData.geometryOnly, asset.id).toBe(true);
      expect(model.userData.normalizedToDeclaredBounds, asset.id).toBe(true);
      expect(model.userData.faceKitDecision.host, asset.id).toBe(
        asset.category === 'npc'
          ? 'humanoid'
          : asset.category === 'creature'
            ? 'animal'
            : 'object',
      );
      const declaredBounds = boundsForKind(kind);
      const actualBounds = new THREE.Box3().setFromObject(model);
      const actualSize = actualBounds.getSize(new THREE.Vector3());
      const actualCenter = actualBounds.getCenter(new THREE.Vector3());
      expect(actualSize.x, `${asset.id}:width`).toBeCloseTo(declaredBounds.w, 5);
      expect(actualSize.y, `${asset.id}:height`).toBeCloseTo(declaredBounds.h, 5);
      expect(actualSize.z, `${asset.id}:depth`).toBeCloseTo(declaredBounds.d, 5);
      expect(actualBounds.min.y, `${asset.id}:feet`).toBeCloseTo(0, 5);
      expect(actualCenter.x, `${asset.id}:center-x`).toBeCloseTo(0, 5);
      expect(actualCenter.z, `${asset.id}:center-z`).toBeCloseTo(0, 5);
      if (kind === 'atelier_prop_polar_expedition_sledge') {
        const runner = model.getObjectByName('expedition-sledge-runner') as THREE.Mesh;
        expect(runner.scale.y, `${asset.id}:runner-length-axis`).toBeGreaterThan(
          runner.scale.z * 10,
        );
      }

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
  }, 60_000);

  it('classifies face hosts and preserves cross-category face mounting', () => {
    for (const kind of ATELIER_HUMANOID_KINDS) {
      const decisions = Array.from({ length: 6 }, (_, variant) =>
        faceKitDecision(kind, variant, 'humanoid'),
      );
      expect(decisions.filter((decision) => decision.origin === 'animal')).toHaveLength(2);
      expect(decisions.every((decision) => decision.mounted)).toBe(true);
    }

    for (const kind of ATELIER_CREATURE_KINDS) {
      const decisions = Array.from({ length: 6 }, (_, variant) =>
        faceKitDecision(kind, variant, 'animal'),
      );
      expect(decisions.filter((decision) => decision.origin === 'human')).toHaveLength(2);
      expect(decisions.every((decision) => decision.mounted)).toBe(true);
    }

    const facedObjects = ATELIER_PROP_FAMILIES.flatMap((family) =>
      Array.from({ length: 6 }, (_, variant) => faceKitDecision(family.kind, variant, 'object')),
    );
    expect(facedObjects.filter((decision) => decision.mounted).length).toBeGreaterThanOrEqual(50);
    expect(facedObjects.some((decision) => decision.origin === 'human' && decision.mounted)).toBe(true);
    expect(facedObjects.some((decision) => decision.origin === 'animal' && decision.mounted)).toBe(true);
  });

  it('advertises all families compactly without expanding 450 variant lines', () => {
    const prompt = catalogPromptSummary();
    for (const family of [...ATELIER_PROP_FAMILIES, ...ATELIER_BEING_FAMILIES]) {
      expect(prompt).toContain(`${family.id}|`);
    }
    expect(prompt).not.toContain('atelier_cloud_atlas_02');
    expect(prompt.length).toBeLessThan(16_000);
  });

  it('makes every family and most variants reachable in ordinary offline rooms', () => {
    const ids = new Set(ATELIER_ASSETS.map((asset) => asset.id));
    const familyById = new Map(ATELIER_ASSETS.map((asset) => [asset.id, asset.family!]));
    const used = new Set<string>();
    const usedFamilies = new Set<string>();

    for (let index = 0; index < 7_000; index += 1) {
      const room = generateOfflineRoom({
        seed: `atelier-coverage-${index}`,
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
    expect(used.size, `variants reached: ${used.size}`).toBeGreaterThanOrEqual(420);
  }, 60_000);
});
