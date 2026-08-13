import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { ROOM } from '../src/config';
import { ASSETS, getAsset } from '../src/world/assetCatalog';
import { buildModel, clearModelMaterialCache, type PropKind } from '../src/world/models';
import { generateOfflineRoom } from '../src/world/offlineGenerator';

afterAll(() => clearModelMaterialCache());

describe('catalog smoke test', () => {
  it('loads the full catalog with unique ids and valid render budgets', () => {
    expect(ASSETS.length).toBeGreaterThan(1_000);
    expect(new Set(ASSETS.map((asset) => asset.id)).size).toBe(ASSETS.length);

    for (const asset of ASSETS) {
      if (asset.category === 'portal') continue;
      const isActor =
        asset.category === 'npc' || asset.category === 'creature' || asset.category === 'anomaly';
      const budget = isActor ? ROOM.entityRenderCostMax : ROOM.propRenderCostMax;
      const defaultCost = isActor ? 3 : 1;
      expect(asset.renderCost ?? defaultCost, asset.id).toBeLessThanOrEqual(budget);
    }
  });

  it('builds every distinct model kind without throwing', () => {
    const kinds = [...new Set(ASSETS.map((asset) => asset.kind))];
    expect(kinds.length).toBeGreaterThan(400);
    for (const kind of kinds) {
      expect(() => buildModel(kind as PropKind, '#6a7a8a', '#c4b59a', `${kind}_smoke`), kind)
        .not.toThrow();
    }
  });

  it('produces playable rooms that respect prop and entity budgets', () => {
    for (let index = 0; index < 25; index += 1) {
      const room = generateOfflineRoom({
        seed: `smoke-${index}`,
        previousTitles: [],
        moodBias: 'static',
        allowGore: false,
        linkIndex: index,
      });

      expect(room.props.length).toBeLessThanOrEqual(ROOM.propCountMax);
      expect(room.entities.length).toBeLessThanOrEqual(ROOM.entityCountMax);
      const propCost = room.props.reduce(
        (total, prop) => total + (prop.assetId ? getAsset(prop.assetId)?.renderCost ?? 1 : 1),
        0,
      );
      const entityCost = room.entities.reduce(
        (total, entity) =>
          total + (entity.assetId ? getAsset(entity.assetId)?.renderCost ?? 3 : 3),
        0,
      );
      expect(propCost).toBeLessThanOrEqual(ROOM.propRenderCostMax);
      expect(entityCost).toBeLessThanOrEqual(ROOM.entityRenderCostMax);
      // No legacy portal assets or touch-links leak into generated scenes.
      expect(room.props.some((prop) => prop.linksOnTouch)).toBe(false);
      expect(
        room.props.some((prop) => prop.assetId && getAsset(prop.assetId)?.category === 'portal'),
      ).toBe(false);
    }
  });

  it('builds a representative sample of actual models as non-empty geometry', () => {
    // A hand-picked spread across prop, NPC, and creature lanes confirms the
    // composed builders return real meshes without iterating the full catalog.
    const samples = [
      'cine_ergo_office_chair_01',
      'cine_bonsai_table_04',
      'cine_creature_house_cat_02',
      'cine_npc_barista_05',
      'atelier_kinetic_chandelier_03',
      'exhibition_steamer_trunk_06',
      'chair_office',
      'plant_fern',
      'creature_deer',
      'anomaly_giant_baby',
    ];
    for (const assetId of samples) {
      const asset = getAsset(assetId);
      expect(asset, assetId).toBeDefined();
      const model = buildModel(asset!.kind as PropKind, '#6a7a8a', '#c4b59a', assetId);
      let meshes = 0;
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) meshes += 1;
      });
      expect(meshes, assetId).toBeGreaterThan(0);
    }
  });
});
