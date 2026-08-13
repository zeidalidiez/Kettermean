import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { ASSETS, catalogPromptSummary } from '../src/world/assetCatalog';
import {
  CINEMATIC_ASSET_COUNT,
  CINEMATIC_ASSETS,
  CINEMATIC_BEING_ASSET_COUNT,
  CINEMATIC_BEING_FAMILIES,
  CINEMATIC_CREATURE_KINDS,
  CINEMATIC_HUMANOID_KINDS,
  CINEMATIC_PROP_ASSET_COUNT,
  CINEMATIC_PROP_FAMILIES,
  CINEMATIC_VARIANTS_PER_FAMILY,
} from '../src/world/cinematicAssets';
import { generateOfflineRoom } from '../src/world/offlineGenerator';
import {
  boundsForKind,
  buildModel,
  clearModelMaterialCache,
  type PropKind,
} from '../src/world/models';

afterAll(() => clearModelMaterialCache());

describe('fifth high-detail cinematic expansion', () => {
  it('adds 768 items and 640 beings across 176 everyday families', () => {
    expect(CINEMATIC_PROP_FAMILIES).toHaveLength(96);
    expect(CINEMATIC_BEING_FAMILIES).toHaveLength(80);
    expect(CINEMATIC_HUMANOID_KINDS).toHaveLength(40);
    expect(CINEMATIC_CREATURE_KINDS).toHaveLength(40);
    expect(CINEMATIC_VARIANTS_PER_FAMILY).toBe(8);
    expect(CINEMATIC_PROP_ASSET_COUNT).toBe(768);
    expect(CINEMATIC_BEING_ASSET_COUNT).toBe(640);
    expect(CINEMATIC_ASSET_COUNT).toBe(1408);
    expect(new Set(CINEMATIC_ASSETS.map((asset) => asset.id)).size).toBe(1408);
    expect(CINEMATIC_ASSETS.filter((asset) => asset.category === 'npc')).toHaveLength(320);
    expect(CINEMATIC_ASSETS.filter((asset) => asset.category === 'creature')).toHaveLength(320);
    expect(ASSETS).toEqual(expect.arrayContaining(CINEMATIC_ASSETS));

    const families = Map.groupBy(CINEMATIC_ASSETS, (asset) => asset.family);
    expect(families.size).toBe(176);
    for (const variants of families.values()) {
      expect(variants).toHaveLength(8);
      expect(new Set(variants.map((asset) => asset.variant))).toEqual(
        new Set([0, 1, 2, 3, 4, 5, 6, 7]),
      );
      expect(variants.every((asset) => asset.tags.includes('high-detail'))).toBe(true);
      expect(variants.every((asset) => asset.tags.includes('cinematic'))).toBe(true);
      expect(variants.every((asset) => asset.setIds.length > 0)).toBe(true);
      expect(variants.every((asset) => asset.renderCost! >= 12)).toBe(true);
    }
  }, 30_000);

  it('builds every addition as layered 3D geometry with a distinct silhouette per variant', () => {
    const signaturesByFamily = new Map<string, Set<string>>();
    const representativeFamilySignatures = new Set<string>();
    const geometryTypes = new Set<string>();
    const materialColors = new Set<string>();

    for (const asset of CINEMATIC_ASSETS) {
      const kind = asset.kind as PropKind;
      const model = buildModel(kind, '#6a7a8a', '#c4b59a', asset.id);
      const meshes: THREE.Mesh[] = [];
      const signatureParts: string[] = [];
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        meshes.push(object);
        geometryTypes.add(object.geometry.type);
        const material = Array.isArray(object.material) ? object.material[0] : object.material;
        if (material instanceof THREE.MeshStandardMaterial) {
          materialColors.add(material.color.getHexString());
        }
        signatureParts.push([
          object.geometry.type,
          ...object.scale.toArray(),
          ...object.position.toArray(),
        ].join(':'));
      });

      expect(meshes.length, asset.id).toBeGreaterThanOrEqual(
        asset.category === 'npc' ? 45 : asset.category === 'creature' ? 40 : 30,
      );
      expect(boundsForKind(kind).h, asset.id).toBeGreaterThan(0);

      const signatures = signaturesByFamily.get(asset.family!) ?? new Set<string>();
      signatures.add(signatureParts.join('|'));
      signaturesByFamily.set(asset.family!, signatures);
    }

    for (const [family, signatures] of signaturesByFamily) {
      expect(signatures.size, family).toBe(8);
    }
    expect(representativeFamilySignatures.size).toBe(0);
    expect(geometryTypes.size).toBeGreaterThanOrEqual(4);
    expect(materialColors.size).toBeGreaterThanOrEqual(6);
  }, 60_000);

  it('keeps the cloud catalog compact while advertising every cinematic family', () => {
    const prompt = catalogPromptSummary();
    const families = new Set(CINEMATIC_ASSETS.map((asset) => asset.family));
    for (const family of families) expect(prompt).toContain(`${family}|`);
    expect(prompt).not.toContain('cine_prop_umbrella_table_08');
    expect(prompt.length).toBeLessThan(30_000);
  });

  it('draws broadly from the cinematic families during ordinary generation', () => {
    const newIds = new Set(CINEMATIC_ASSETS.map((asset) => asset.id));
    const familyById = new Map(CINEMATIC_ASSETS.map((asset) => [asset.id, asset.family!]));
    const used = new Set<string>();
    const usedFamilies = new Set<string>();
    for (let index = 0; index < 2_000; index += 1) {
      const room = generateOfflineRoom({
        seed: `cinematic-coverage-${index}`,
        previousTitles: [],
        moodBias: index % 2 ? 'dynamic' : 'static',
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

    expect(usedFamilies.size).toBeGreaterThanOrEqual(120);
    expect(used.size).toBeGreaterThanOrEqual(600);
  }, 40_000);
});
