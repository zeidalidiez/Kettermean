import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { ASSETS, getAsset } from '../src/world/assetCatalog';
import { generateOfflineRoom } from '../src/world/offlineGenerator';
import { buildModel, clearModelMaterialCache, type PropKind } from '../src/world/models';
import {
  SURREAL_ASSET_COUNT,
  SURREAL_ASSETS,
  SURREAL_THEMES,
} from '../src/world/surrealAssets';

afterAll(() => clearModelMaterialCache());

describe('surreal scene expansion', () => {
  it('adds 96 unique variants across twelve complete families', () => {
    expect(SURREAL_ASSET_COUNT).toBe(96);
    expect(new Set(SURREAL_ASSETS.map((asset) => asset.id)).size).toBe(96);

    const families = Map.groupBy(SURREAL_ASSETS, (asset) => asset.family);
    expect(families.size).toBe(12);
    for (const variants of families.values()) {
      expect(variants).toHaveLength(8);
      expect(new Set(variants.map((asset) => asset.variant))).toEqual(
        new Set([0, 1, 2, 3, 4, 5, 6, 7]),
      );
    }
    expect(ASSETS).toEqual(expect.arrayContaining(SURREAL_ASSETS));
  });

  it('builds each family as eight visibly distinct composed models', () => {
    const signaturesByFamily = new Map<string, Set<string>>();

    for (const asset of SURREAL_ASSETS) {
      const model = buildModel(asset.kind as PropKind, '#6a7a8a', '#c4b59a', asset.id);
      const meshes: THREE.Mesh[] = [];
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) meshes.push(object);
      });
      expect(meshes.length, asset.id).toBeGreaterThanOrEqual(5);

      const signature = meshes.map((mesh) => {
        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const color = material instanceof THREE.MeshStandardMaterial
          ? material.color.getHexString()
          : 'none';
        return [
          mesh.geometry.type,
          ...mesh.scale.toArray(),
          ...mesh.position.toArray(),
          ...mesh.rotation.toArray().slice(0, 3),
          color,
        ].join(':');
      }).join('|');

      const signatures = signaturesByFamily.get(asset.family!) ?? new Set<string>();
      signatures.add(signature);
      signaturesByFamily.set(asset.family!, signatures);
    }

    for (const [family, signatures] of signaturesByFamily) {
      expect(signatures.size, family).toBe(8);
    }
  }, 30_000);

  it('keeps every new archetype preference attached to a real asset', () => {
    expect(SURREAL_THEMES).toHaveLength(16);
    for (const theme of SURREAL_THEMES) {
      expect(theme.preferredAssets.length, theme.id).toBeGreaterThanOrEqual(5);
      for (const assetId of theme.preferredAssets) {
        expect(getAsset(assetId), `${theme.id}:${assetId}`).toBeDefined();
      }
    }
  });

  it('makes the new variants reachable through ordinary procedural generation', () => {
    const newIds = new Set(SURREAL_ASSETS.map((asset) => asset.id));
    const used = new Set<string>();
    for (let index = 0; index < 2_000; index += 1) {
      const room = generateOfflineRoom({
        seed: `surreal-coverage-${index}`,
        previousTitles: [],
        moodBias: 'static',
        allowGore: false,
        linkIndex: index,
      });
      for (const object of [...room.props, ...room.entities]) {
        if (object.assetId && newIds.has(object.assetId)) used.add(object.assetId);
      }
    }

    expect(used.size).toBeGreaterThanOrEqual(80);
  }, 30_000);
});
