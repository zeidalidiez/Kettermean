import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { ASSETS, catalogPromptSummary } from '../src/world/assetCatalog';
import { EXPANDED_ASSET_COUNT, EXPANDED_ASSETS } from '../src/world/expandedAssets';
import { generateOfflineRoom } from '../src/world/offlineGenerator';
import {
  boundsForKind,
  buildModel,
  clearModelMaterialCache,
  faceParametersFor,
  type PropKind,
} from '../src/world/models';

afterAll(() => clearModelMaterialCache());

describe('expanded procedural asset catalog', () => {
  it('contains 920 unique variants across 115 eight-member families', () => {
    expect(EXPANDED_ASSET_COUNT).toBe(920);
    expect(new Set(EXPANDED_ASSETS.map((asset) => asset.id)).size).toBe(920);

    const families = Map.groupBy(EXPANDED_ASSETS, (asset) => asset.family);
    expect(families.size).toBe(115);
    for (const variants of families.values()) {
      expect(variants).toHaveLength(8);
      expect(new Set(variants.map((asset) => asset.variant))).toEqual(
        new Set([0, 1, 2, 3, 4, 5, 6, 7]),
      );
    }

    expect(EXPANDED_ASSETS.filter((asset) => asset.category === 'npc')).toHaveLength(208);
    expect(EXPANDED_ASSETS.filter((asset) => asset.category === 'creature')).toHaveLength(48);
    expect(EXPANDED_ASSETS.filter((asset) => asset.category !== 'npc')).toHaveLength(712);
    expect(ASSETS).toEqual(expect.arrayContaining(EXPANDED_ASSETS));
  });

  it('mixes bounded eye, nose, mouth, hair, spacing, and placement presets for NPC faces', () => {
    const npcKinds = [...new Set(
      EXPANDED_ASSETS
        .filter((asset) => asset.category === 'npc')
        .map((asset) => asset.kind as PropKind),
    )];
    const faces = npcKinds.flatMap((kind) =>
      Array.from({ length: 8 }, (_, variant) => faceParametersFor(kind, variant)),
    );
    const signatures = new Set(faces.map((face) => JSON.stringify(face)));

    expect(signatures.size).toBe(faces.length);
    expect(new Set(faces.map((face) => face.eyePreset))).toEqual(new Set([0, 1, 2, 3]));
    expect(new Set(faces.map((face) => face.nosePreset))).toEqual(new Set([0, 1, 2, 3]));
    expect(new Set(faces.map((face) => face.mouthPreset))).toEqual(new Set([0, 1, 2, 3]));
    expect(new Set(faces.map((face) => face.hairPreset))).toEqual(new Set([0, 1, 2, 3, 4]));
    expect(faces.every((face) => face.eyeSpacing >= 0.078 && face.eyeSpacing <= 0.14)).toBe(true);
    expect(faces.every((face) => Math.abs(face.noseOffsetX) <= 0.024)).toBe(true);
    expect(faces.every((face) => Math.abs(face.eyeHeightOffset) <= 0.032)).toBe(true);
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
        asset.category === 'npc' ? 24 : 5,
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
  }, 15_000);

  it('reuses geometry without sharing mutable transforms between repeated instances', () => {
    const first = buildModel('figure_nurse', '#6a7a8a', '#c4b59a', 'npc_nurse_04');
    const second = buildModel('figure_nurse', '#6a7a8a', '#c4b59a', 'npc_nurse_04');
    const firstArm = first.getObjectByName('rig-arm-left') as THREE.Mesh;
    const secondArm = second.getObjectByName('rig-arm-left') as THREE.Mesh;

    expect(first).not.toBe(second);
    expect(firstArm).not.toBe(secondArm);
    expect(firstArm.geometry).toBe(secondArm.geometry);
    firstArm.rotation.x = 0.75;
    expect(secondArm.rotation.x).not.toBe(0.75);
  });

  it('keeps the LLM catalog compact while advertising every family', () => {
    const prompt = catalogPromptSummary();
    const families = new Set(EXPANDED_ASSETS.map((asset) => asset.family));

    for (const family of families) expect(prompt).toContain(`${family}|`);
    expect(prompt).not.toContain('npc_nurse_02');
    expect(prompt.length).toBeLessThan(16_000);
  });

  it('draws broadly from the new library during procedural generation', () => {
    const used = new Set<string>();
    for (let index = 0; index < 2_000; index += 1) {
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

    expect(used.size).toBeGreaterThanOrEqual(860);
  }, 30_000);
});
