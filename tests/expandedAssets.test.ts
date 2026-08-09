import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { ASSETS, catalogPromptSummary } from '../src/world/assetCatalog';
import { EXPANDED_ASSET_COUNT, EXPANDED_ASSETS } from '../src/world/expandedAssets';
import { generateOfflineRoom } from '../src/world/offlineGenerator';
import {
  boundsForKind,
  buildModel,
  clearModelMaterialCache,
  type PropKind,
} from '../src/world/models';

afterAll(() => clearModelMaterialCache());

describe('expanded procedural asset catalog', () => {
  it('contains 240 unique variants across 30 eight-member families', () => {
    expect(EXPANDED_ASSET_COUNT).toBe(240);
    expect(new Set(EXPANDED_ASSETS.map((asset) => asset.id)).size).toBe(240);

    const families = Map.groupBy(EXPANDED_ASSETS, (asset) => asset.family);
    expect(families.size).toBe(30);
    for (const variants of families.values()) {
      expect(variants).toHaveLength(8);
      expect(new Set(variants.map((asset) => asset.variant))).toEqual(
        new Set([0, 1, 2, 3, 4, 5, 6, 7]),
      );
    }

    expect(EXPANDED_ASSETS.filter((asset) => asset.category === 'npc')).toHaveLength(80);
    expect(EXPANDED_ASSETS.filter((asset) => asset.category !== 'npc')).toHaveLength(160);
    expect(ASSETS).toEqual(expect.arrayContaining(EXPANDED_ASSETS));
  });

  it('builds every variant as a composed, visibly distinct model', () => {
    const familySignatures = new Map<string, Set<string>>();

    for (const asset of EXPANDED_ASSETS) {
      const kind = asset.kind as PropKind;
      const model = buildModel(kind, '#6a7a8a', '#c4b59a', asset.id);
      const meshes: THREE.Mesh[] = [];
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) meshes.push(child);
      });

      expect(meshes.length, asset.id).toBeGreaterThanOrEqual(
        asset.category === 'npc' ? 15 : 5,
      );
      expect(boundsForKind(kind).h, asset.id).toBeGreaterThan(0);

      const signature = meshes
        .map((mesh) => {
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
        })
        .join('|');
      const signatures = familySignatures.get(asset.family!) ?? new Set<string>();
      signatures.add(signature);
      familySignatures.set(asset.family!, signatures);

      for (const mesh of meshes) mesh.geometry.dispose();
    }

    for (const [family, signatures] of familySignatures) {
      expect(signatures.size, family).toBe(8);
    }
  });

  it('keeps the LLM catalog compact while advertising every family', () => {
    const prompt = catalogPromptSummary();
    const families = new Set(EXPANDED_ASSETS.map((asset) => asset.family));

    for (const family of families) expect(prompt).toContain(`${family}|`);
    expect(prompt).not.toContain('npc_nurse_02');
    expect(prompt.length).toBeLessThan(12_000);
  });

  it('draws broadly from the new library during procedural generation', () => {
    const used = new Set<string>();
    for (let index = 0; index < 1_200; index += 1) {
      const room = generateOfflineRoom({
        seed: `asset-coverage-${index}`,
        previousTitles: [],
        moodBias: 'static',
        allowGore: false,
        linkIndex: index,
      });
      for (const item of [...room.props, ...room.entities]) {
        if (item.assetId && EXPANDED_ASSETS.some((asset) => asset.id === item.assetId)) {
          used.add(item.assetId);
        }
      }
    }

    expect(used.size).toBeGreaterThanOrEqual(220);
  });
});
