import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { ASSETS } from '../src/world/assetCatalog';
import {
  buildModel,
  clearModelMaterialCache,
  type PropKind,
} from '../src/world/models';

afterAll(() => clearModelMaterialCache());

describe('cinematic legacy upgrade', () => {
  it('rebuilds everyday base kinds as high-detail layered models', () => {
    // The base catalog props that ride the cinematic legacy path should no
    // longer render as a handful of primitives.
    const everyday = ASSETS.filter(
      (asset) =>
        !asset.family &&
        asset.category !== 'portal' &&
        asset.category !== 'anomaly' &&
        [
          'chair',
          'desk',
          'table',
          'bench',
          'cabinet',
          'shelf',
          'crib',
          'mattress',
          'vending',
          'cooler',
          'payphone',
          'lamp',
          'tv',
          'plant',
          'cart',
        ].includes(asset.kind),
    );
    expect(everyday.length).toBeGreaterThan(5);

    for (const asset of everyday) {
      const model = buildModel(asset.kind as PropKind, '#6a7a8a', '#c4b59a', asset.id);
      let meshes = 0;
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) meshes += 1;
      });
      expect(meshes, asset.id).toBeGreaterThanOrEqual(30);
    }
  });

  it('leaves intentionally simple base props on their cheap builders', () => {
    // Signs, mirrors, pillars, and the bottle stay cheap by design.
    for (const kind of ['sign', 'mirror', 'pillar', 'bottle_giant'] as PropKind[]) {
      const model = buildModel(kind, '#6a7a8a', '#c4b59a', `${kind}_probe`);
      let meshes = 0;
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) meshes += 1;
      });
      expect(meshes, kind).toBeLessThan(15);
    }
  });
});
