import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { ASSETS, catalogPromptSummary } from '../src/world/assetCatalog';
import {
  DETAILED_MODEL_KINDS,
  LOW_POLY_MODEL_KINDS,
  MIXED_MEDIA_ASSET_COUNT,
  MIXED_MEDIA_ASSETS,
  VOXEL_MODEL_KINDS,
} from '../src/world/mixedMediaAssets';
import { generateOfflineRoom } from '../src/world/offlineGenerator';
import {
  boundsForKind,
  buildModel,
  clearModelMaterialCache,
  type PropKind,
} from '../src/world/models';

const RASTER_MODEL_ASSETS = import.meta.glob(
  '../src/assets/*.{png,jpg,jpeg,webp,avif}',
  { eager: true, query: '?url', import: 'default' },
);

afterAll(() => clearModelMaterialCache());

describe('mixed-media model expansion', () => {
  it('contains 224 all-3D variants across 28 tagged eight-member families', () => {
    expect(MIXED_MEDIA_ASSET_COUNT).toBe(224);
    expect(new Set(MIXED_MEDIA_ASSETS.map((asset) => asset.id)).size).toBe(224);

    const families = Map.groupBy(MIXED_MEDIA_ASSETS, (asset) => asset.family);
    expect(families.size).toBe(28);
    for (const variants of families.values()) {
      expect(variants).toHaveLength(8);
      expect(new Set(variants.map((asset) => asset.variant))).toEqual(
        new Set([0, 1, 2, 3, 4, 5, 6, 7]),
      );
      expect(variants.every((asset) => asset.tags.length >= 5)).toBe(true);
      expect(variants.every((asset) => asset.setIds.length > 0)).toBe(true);
    }

    const countKinds = (kinds: readonly string[]): number =>
      MIXED_MEDIA_ASSETS.filter((asset) => kinds.includes(asset.kind)).length;
    expect(countKinds(DETAILED_MODEL_KINDS)).toBe(96);
    expect(countKinds(LOW_POLY_MODEL_KINDS)).toBe(64);
    expect(countKinds(VOXEL_MODEL_KINDS)).toBe(64);
    expect(MIXED_MEDIA_ASSETS.some((asset) => asset.kind.startsWith('sprite_'))).toBe(false);
    expect(ASSETS).toEqual(expect.arrayContaining(MIXED_MEDIA_ASSETS));
  });

  it('builds the intended detailed, cheap, and voxel render styles without 2D sprites', () => {
    const familySignatures = new Map<string, Set<string>>();

    for (const asset of MIXED_MEDIA_ASSETS) {
      const kind = asset.kind as PropKind;
      const model = buildModel(kind, '#6a7a8a', '#c4b59a', asset.id);
      const meshes: THREE.Mesh[] = [];
      const instances: THREE.InstancedMesh[] = [];
      const signatureParts: string[] = [];
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) meshes.push(child);
        if (child instanceof THREE.InstancedMesh) instances.push(child);
        if (!(child instanceof THREE.Mesh)) return;
        const material = Array.isArray(child.material) ? child.material[0] : child.material;
        const color = 'color' in material && material.color instanceof THREE.Color
          ? material.color.getHexString()
          : 'none';
        const instanceSignature = child instanceof THREE.InstancedMesh
          ? `${child.count}:${Array.from(child.instanceMatrix.array.slice(0, 16)).join(',')}`
          : '';
        signatureParts.push([
          child.type,
          child.name,
          ...child.scale.toArray(),
          ...child.position.toArray(),
          color,
          instanceSignature,
        ].join(':'));
      });

      expect(boundsForKind(kind).h, asset.id).toBeGreaterThan(0);
      if (DETAILED_MODEL_KINDS.includes(asset.kind as never)) {
        const minimum = asset.category === 'npc' ? 30 : 12;
        expect(meshes.length, asset.id).toBeGreaterThanOrEqual(minimum);
      }
      if (LOW_POLY_MODEL_KINDS.includes(asset.kind as never)) {
        expect(meshes.length, asset.id).toBeGreaterThanOrEqual(3);
        expect(meshes.length, asset.id).toBeLessThanOrEqual(16);
        expect(asset.renderCost, asset.id).toBeLessThanOrEqual(2);
      }
      if (VOXEL_MODEL_KINDS.includes(asset.kind as never)) {
        expect(instances.length, asset.id).toBeGreaterThanOrEqual(2);
        expect(instances.reduce((sum, mesh) => sum + mesh.count, 0), asset.id).toBeGreaterThan(25);
        expect(Math.max(boundsForKind(kind).w, boundsForKind(kind).h, boundsForKind(kind).d), asset.id).toBeGreaterThanOrEqual(7);
      }
      expect(model.getObjectByName('sprite-actor'), asset.id).toBeUndefined();

      const signatures = familySignatures.get(asset.family!) ?? new Set<string>();
      signatures.add(signatureParts.join('|'));
      familySignatures.set(asset.family!, signatures);
    }

    for (const [family, signatures] of familySignatures) {
      expect(signatures.size, family).toBe(8);
    }
  });

  it('ships no raster model artwork that could restore the removed sprite actors', () => {
    expect(Object.keys(RASTER_MODEL_ASSETS)).toEqual([]);
  });

  it('keeps every family available to cloud direction without expanding every variant', () => {
    const prompt = catalogPromptSummary();
    const families = new Set(MIXED_MEDIA_ASSETS.map((asset) => asset.family));

    for (const family of families) expect(prompt).toContain(`${family}|`);
    expect(prompt).not.toContain('npc_sprite_');
    expect(prompt).toContain('FAMILIES (IDs end 01-08):');
    expect(prompt.length).toBeLessThan(16_000);
  });

  it('draws broadly from the mixed-media families during ordinary generation', () => {
    const newIds = new Set(MIXED_MEDIA_ASSETS.map((asset) => asset.id));
    const used = new Set<string>();
    for (let index = 0; index < 2_000; index += 1) {
      const room = generateOfflineRoom({
        seed: `mixed-media-coverage-${index}`,
        previousTitles: [],
        moodBias: index % 2 ? 'dynamic' : 'static',
        allowGore: false,
        linkIndex: index,
      });
      for (const item of [...room.props, ...room.entities]) {
        if (item.assetId && newIds.has(item.assetId)) used.add(item.assetId);
      }
    }

    expect(used.size).toBeGreaterThanOrEqual(190);
  }, 20_000);
});
