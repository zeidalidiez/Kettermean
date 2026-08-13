import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { ASSETS, catalogPromptSummary } from '../src/world/assetCatalog';
import {
  SEMANTIC_ASSET_COUNT,
  SEMANTIC_ASSETS,
} from '../src/world/semanticAssets';
import { generateOfflineRoom } from '../src/world/offlineGenerator';
import {
  boundsForKind,
  buildModel,
  clearModelMaterialCache,
  type PropKind,
} from '../src/world/models';

afterAll(() => clearModelMaterialCache());

describe('semantic furniture and NPC expansion', () => {
  it('contains 176 unique variants across 22 tagged families', () => {
    expect(SEMANTIC_ASSET_COUNT).toBe(176);
    expect(new Set(SEMANTIC_ASSETS.map((asset) => asset.id)).size).toBe(176);

    const families = Map.groupBy(SEMANTIC_ASSETS, (asset) => asset.family);
    expect(families.size).toBe(22);
    for (const variants of families.values()) {
      expect(variants).toHaveLength(8);
      expect(new Set(variants.map((asset) => asset.variant))).toEqual(
        new Set([0, 1, 2, 3, 4, 5, 6, 7]),
      );
      expect(variants.every((asset) => asset.tags.length >= 4)).toBe(true);
      expect(variants.every((asset) => asset.setIds.length > 0)).toBe(true);
    }

    expect(SEMANTIC_ASSETS.filter((asset) => asset.category === 'npc')).toHaveLength(64);
    expect(SEMANTIC_ASSETS.filter((asset) => asset.category !== 'npc')).toHaveLength(112);
    expect(ASSETS).toEqual(expect.arrayContaining(SEMANTIC_ASSETS));
  });

  it('builds every variant as a detailed and visibly distinct model', () => {
    const familySignatures = new Map<string, Set<string>>();

    for (const asset of SEMANTIC_ASSETS) {
      const kind = asset.kind as PropKind;
      const model = buildModel(kind, '#6a7a8a', '#c4b59a', asset.id);
      const meshes: THREE.Mesh[] = [];
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) meshes.push(child);
      });

      expect(meshes.length, asset.id).toBeGreaterThanOrEqual(
        asset.category === 'npc' ? 30 : 5,
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
    }

    for (const [family, signatures] of familySignatures) {
      expect(signatures.size, family).toBe(8);
    }
  }, 30_000);

  it('advertises every new family without letting the cloud prompt sprawl', () => {
    const prompt = catalogPromptSummary();
    const families = new Set(SEMANTIC_ASSETS.map((asset) => asset.family));

    for (const family of families) expect(prompt).toContain(`${family}|`);
    expect(prompt).not.toContain('npc_dentist_02');
    expect(prompt.length).toBeLessThan(30_000);
  });

  it('draws broadly from the new tagged families during ordinary generation', () => {
    const newIds = new Set(SEMANTIC_ASSETS.map((asset) => asset.id));
    const familyById = new Map(SEMANTIC_ASSETS.map((asset) => [asset.id, asset.family!]));
    const used = new Set<string>();
    const usedFamilies = new Set<string>();
    for (let index = 0; index < 1_000; index += 1) {
      const room = generateOfflineRoom({
        seed: `semantic-coverage-${index}`,
        previousTitles: [],
        moodBias: 'static',
        allowGore: false,
        linkIndex: index,
      });
      for (const item of [...room.props, ...room.entities]) {
        if (item.assetId && newIds.has(item.assetId)) {
          used.add(item.assetId);
          usedFamilies.add(familyById.get(item.assetId)!);
        }
      }
    }

    expect(usedFamilies.size).toBe(new Set(SEMANTIC_ASSETS.map((asset) => asset.family)).size);
    expect(used.size).toBeGreaterThanOrEqual(160);
  }, 20_000);
});
