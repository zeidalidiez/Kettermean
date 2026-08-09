import { describe, expect, it } from 'vitest';
import { generateOfflineRoom } from '../src/world/offlineGenerator';
import { ASSETS, getAsset } from '../src/world/assetCatalog';
import { getSceneSet } from '../src/world/sceneSets';

describe('semantic scene composition', () => {
  it('assigns every catalog item to at least one known semantic set', () => {
    for (const asset of ASSETS) {
      expect(asset.setIds.length, asset.id).toBeGreaterThan(0);
      for (const setId of asset.setIds) expect(getSceneSet(setId), asset.id).toBeDefined();
    }
  });

  it('keeps objects coherent while using one bounded contrast motif', () => {
    let contrastRooms = 0;
    let contrastRoomsWithMotif = 0;
    let totalObjects = 0;
    let unrelatedObjects = 0;
    const unrelatedFamilies = new Map<string, number>();

    for (let index = 0; index < 500; index += 1) {
      const room = generateOfflineRoom({
        seed: `semantic-composition-${index}`,
        previousTitles: [],
        moodBias: 'static',
        allowGore: false,
        linkIndex: index,
      });
      const composition = room.composition;
      expect(composition).toBeDefined();
      if (!composition) continue;

      const coherentSets = new Set([
        composition.primarySet,
        ...(composition.supportingSet ? [composition.supportingSet] : []),
      ]);
      let roomContrastObjects = 0;

      for (const item of [...room.props, ...room.entities]) {
        const asset = item.assetId ? getAsset(item.assetId) : undefined;
        if (!asset || asset.category === 'portal') continue;
        totalObjects += 1;
        if (asset.setIds.some((setId) => coherentSets.has(setId))) continue;
        if (composition.contrastSet && asset.setIds.includes(composition.contrastSet)) {
          roomContrastObjects += 1;
          continue;
        }
        unrelatedObjects += 1;
        const family = asset.family ?? asset.id;
        unrelatedFamilies.set(family, (unrelatedFamilies.get(family) ?? 0) + 1);
      }

      if (composition.contrastSet) {
        contrastRooms += 1;
        if (roomContrastObjects > 0) contrastRoomsWithMotif += 1;
        expect(composition.contrastBudget).toBeGreaterThanOrEqual(1);
        expect(composition.contrastBudget).toBeLessThanOrEqual(4);
      } else {
        expect(composition.contrastBudget).toBe(0);
      }
    }

    expect(contrastRooms).toBeGreaterThan(170);
    expect(contrastRoomsWithMotif / contrastRooms).toBeGreaterThan(0.9);
    const topUnrelated = [...unrelatedFamilies.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
    expect(
      unrelatedObjects / totalObjects,
      `top unrelated families: ${JSON.stringify(topUnrelated)}`,
    ).toBeLessThan(0.08);
  }, 20_000);
});
