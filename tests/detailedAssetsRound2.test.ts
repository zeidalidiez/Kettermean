import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { ASSETS, catalogPromptSummary } from '../src/world/assetCatalog';
import {
  MASTERWORK_ASSET_COUNT,
  MASTERWORK_ASSETS,
  MASTERWORK_BEING_ASSET_COUNT,
  MASTERWORK_BEING_FAMILIES,
  MASTERWORK_CREATURE_KINDS,
  MASTERWORK_HUMANOID_KINDS,
  MASTERWORK_PROP_ASSET_COUNT,
  MASTERWORK_PROP_FAMILIES,
} from '../src/world/detailedAssetsRound2';
import { faceKitDecision } from '../src/world/faceKits';
import { generateOfflineRoom } from '../src/world/offlineGenerator';
import {
  boundsForKind,
  buildModel,
  clearModelMaterialCache,
  type PropKind,
} from '../src/world/models';

afterAll(() => clearModelMaterialCache());

describe('second high-detail masterwork expansion', () => {
  it('adds another 304 props and 152 beings as 456 unique assets', () => {
    expect(MASTERWORK_PROP_FAMILIES).toHaveLength(38);
    expect(MASTERWORK_BEING_FAMILIES).toHaveLength(19);
    expect(MASTERWORK_PROP_ASSET_COUNT).toBe(304);
    expect(MASTERWORK_BEING_ASSET_COUNT).toBe(152);
    expect(MASTERWORK_ASSET_COUNT).toBe(456);
    expect(new Set(MASTERWORK_ASSETS.map((asset) => asset.id)).size).toBe(456);
    expect(MASTERWORK_ASSETS.filter((asset) => asset.category === 'npc')).toHaveLength(72);
    expect(MASTERWORK_ASSETS.filter((asset) => asset.category === 'creature')).toHaveLength(80);
    expect(ASSETS).toEqual(expect.arrayContaining(MASTERWORK_ASSETS));
    const composedVariants = ASSETS.filter((asset) => asset.family);
    expect(composedVariants).toHaveLength(2_328);
    expect(new Set(composedVariants.map((asset) => asset.family)).size).toBe(291);
    expect(ASSETS.filter((asset) => asset.tags.includes('high-detail'))).toHaveLength(912);

    const families = Map.groupBy(MASTERWORK_ASSETS, (asset) => asset.family);
    expect(families.size).toBe(57);
    for (const variants of families.values()) {
      expect(variants).toHaveLength(8);
      expect(new Set(variants.map((asset) => asset.variant))).toEqual(
        new Set([0, 1, 2, 3, 4, 5, 6, 7]),
      );
      expect(variants.every((asset) => asset.tags.includes('high-detail'))).toBe(true);
      expect(variants.every((asset) => asset.tags.includes('masterwork'))).toBe(true);
      expect(variants.every((asset) => asset.setIds.length > 0)).toBe(true);
    }
  });

  it('builds every addition as dense geometry with eight distinct variants per family', () => {
    const signaturesByFamily = new Map<string, Set<string>>();
    const representativeFamilySignatures = new Set<string>();

    for (const asset of MASTERWORK_ASSETS) {
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

      const minimum = asset.category === 'npc' ? 38 : asset.category === 'creature' ? 30 : 22;
      expect(meshes.length, asset.id).toBeGreaterThanOrEqual(minimum);
      expect(model.userData.detailTier, asset.id).toBe('masterwork');
      expect(boundsForKind(kind).h, asset.id).toBeGreaterThan(0);

      const signature = signatureParts.join('|');
      const signatures = signaturesByFamily.get(asset.family!) ?? new Set<string>();
      signatures.add(signature);
      signaturesByFamily.set(asset.family!, signatures);
      if (asset.variant === 0) representativeFamilySignatures.add(signature);
    }

    for (const [family, signatures] of signaturesByFamily) {
      expect(signatures.size, family).toBe(8);
    }
    expect(representativeFamilySignatures.size).toBe(57);
  }, 30_000);

  it('keeps the cross-category face policy active on the entire second batch', () => {
    for (const kind of MASTERWORK_HUMANOID_KINDS) {
      const decisions = Array.from({ length: 8 }, (_, variant) =>
        faceKitDecision(kind, variant, 'humanoid'),
      );
      expect(decisions.filter((decision) => decision.origin === 'animal')).toHaveLength(3);
      expect(decisions.every((decision) => decision.mounted)).toBe(true);
    }

    for (const kind of MASTERWORK_CREATURE_KINDS) {
      const decisions = Array.from({ length: 8 }, (_, variant) =>
        faceKitDecision(kind, variant, 'animal'),
      );
      expect(decisions.filter((decision) => decision.origin === 'human')).toHaveLength(3);
      expect(decisions.every((decision) => decision.mounted)).toBe(true);
    }

    const facedObjects = MASTERWORK_PROP_FAMILIES.flatMap((family) =>
      Array.from({ length: 8 }, (_, variant) => faceKitDecision(family.kind, variant, 'object')),
    );
    expect(facedObjects.filter((decision) => decision.mounted).length).toBeGreaterThanOrEqual(76);
    expect(facedObjects.some((decision) => decision.origin === 'human' && decision.mounted)).toBe(true);
    expect(facedObjects.some((decision) => decision.origin === 'animal' && decision.mounted)).toBe(true);
  });

  it('removes every generated 2D sprite actor from the catalog', () => {
    expect(ASSETS.some((asset) => asset.kind.startsWith('sprite_'))).toBe(false);
    expect(ASSETS.some((asset) => asset.id.includes('_sprite_'))).toBe(false);
    expect(ASSETS.some((asset) => asset.tags.includes('sprite'))).toBe(false);
  });

  it('advertises every second-round family compactly to model directors', () => {
    const prompt = catalogPromptSummary();
    for (const family of [...MASTERWORK_PROP_FAMILIES, ...MASTERWORK_BEING_FAMILIES]) {
      expect(prompt).toContain(`${family.id}|`);
    }
    expect(prompt).not.toContain('masterwork_writing_bureau_02');
    expect(prompt).not.toContain('npc_sprite_');
    expect(prompt.length).toBeLessThan(20_000);
  });

  it('makes every new family and most variants reachable in ordinary rooms', () => {
    const ids = new Set(MASTERWORK_ASSETS.map((asset) => asset.id));
    const familyById = new Map(MASTERWORK_ASSETS.map((asset) => [asset.id, asset.family!]));
    const used = new Set<string>();
    const usedFamilies = new Set<string>();

    for (let index = 0; index < 3_500; index += 1) {
      const room = generateOfflineRoom({
        seed: `masterwork-coverage-${index}`,
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

    expect(usedFamilies.size, `families reached: ${usedFamilies.size}`).toBe(57);
    expect(used.size, `variants reached: ${used.size}`).toBeGreaterThanOrEqual(420);
  }, 30_000);
});
