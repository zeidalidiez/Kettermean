import { describe, expect, it } from 'vitest';
import { PLAYER, ROOM } from '../src/config';
import { childSeed, randomSeed } from '../src/core/rng';
import type { RoomHistoryEntry, RoomProp } from '../src/types';
import { generateOfflineDirection, generateOfflineRoom } from '../src/world/offlineGenerator';
import { getAsset, THEME_PRESETS } from '../src/world/assetCatalog';
import { resolveRoomVisuals, roomHistoryEntryFor } from '../src/world/roomDirector';

describe('offline room invariants', () => {
  it('keeps the spawn island clear and respects logical object budgets', () => {
    const shaderStyles = new Set<string>();
    const lightingStyles = new Set<string>();
    const wireframeModes = new Set<boolean>();
    const environments = new Set<string>();
    const architectures = new Set<string>();
    const scaleProfiles = new Set<string>();
    const conditions = new Set<string>();
    let dimRooms = 0;
    let largestSide = 0;
    let smallestSide = Infinity;
    let largestWorldScale = 0;

    for (let index = 0; index < 1_000; index += 1) {
      const room = generateOfflineRoom({
        seed: `invariant-${index}`,
        previousTitles: [],
        moodBias: 'static',
        allowGore: false,
        linkIndex: index,
      });

      expect(room.props.length).toBeLessThanOrEqual(ROOM.propCountMax);
      expect(room.entities.length).toBeLessThanOrEqual(ROOM.entityCountMax);
      expect(
        room.props.reduce((total, prop) => {
          const asset = prop.assetId ? getAsset(prop.assetId) : undefined;
          return total + (asset?.category === 'portal' ? 0 : asset?.renderCost ?? 1);
        }, 0),
      ).toBeLessThanOrEqual(ROOM.propRenderCostMax);
      expect(
        room.entities.reduce(
          (total, entity) => total + (entity.assetId ? getAsset(entity.assetId)?.renderCost ?? 3 : 3),
          0,
        ),
      ).toBeLessThanOrEqual(ROOM.entityRenderCostMax);
      expect(room.props.some((prop) => prop.linksOnTouch)).toBe(false);
      expect(
        room.props.some((prop) => prop.assetId && getAsset(prop.assetId)?.category === 'portal'),
      ).toBe(false);
      expect(`${room.title} ${room.blurb}`).not.toMatch(/\bagain\b|you have been here/i);
      environments.add(room.environment ?? 'interior');
      architectures.add(room.architecture ?? 'chamber');
      scaleProfiles.add(room.scaleProfile ?? 'human');
      conditions.add(room.condition);
      expect(room.condition).not.toBe('bloodied');
      expect(room.themeTags).toContain(`condition:${room.condition}`);
      largestSide = Math.max(largestSide, room.width, room.depth);
      smallestSide = Math.min(smallestSide, room.width, room.depth);
      largestWorldScale = Math.max(largestWorldScale, room.worldScale ?? 1);
      if (room.scaleProfile === 'colossal') {
        expect(room.environment).not.toBe('interior');
      }
      expect(room.visuals).toBeDefined();
      if (room.visuals) {
        shaderStyles.add(room.visuals.shader);
        lightingStyles.add(room.visuals.lighting);
        if (room.visuals.lighting === 'dim') dimRooms += 1;
        wireframeModes.add(room.visuals.wireframe);
        expect(room.visuals.effectStrength).toBeGreaterThanOrEqual(0);
        expect(room.visuals.effectStrength).toBeLessThanOrEqual(1);
        expect(room.visuals.exposure).toBeGreaterThanOrEqual(1.02);
        expect(room.visuals.exposure).toBeLessThanOrEqual(1.35);
      }

      for (const prop of room.props.filter((candidate) => candidate.solid !== false)) {
        expect(overlapsSpawn(prop)).toBe(false);
      }
    }

    expect(shaderStyles).toEqual(
      new Set([
        'none',
        'retro',
        'tint',
        'dream',
        'noir',
        'crt',
        'underwater',
        'kaleidoscope',
        'acid',
        'fisheye',
        'thermal',
        'prism',
        'vhs',
        'strobe',
        'mirror',
        'tunnel',
        'posterize',
        'duotone',
        'dither',
        'solarize',
        'heatwave',
        'negative',
        'halftone',
        'smear',
      ]),
    );
    expect(lightingStyles).toEqual(
      new Set(['fluorescent', 'dim', 'cold', 'warm', 'emergency', 'pulse']),
    );
    expect(wireframeModes).toEqual(new Set([false, true]));
    expect(environments).toEqual(new Set(['interior', 'open-hall', 'outdoor']));
    expect(architectures).toEqual(
      new Set(['chamber', 'colonnade', 'atrium', 'arena', 'concourse', 'courtyard', 'causeway', 'field', 'basin']),
    );
    expect(scaleProfiles).toEqual(
      new Set(['closet', 'human', 'grand', 'monumental', 'colossal']),
    );
    expect(conditions).toEqual(
      new Set(['normal', 'slimed', 'scorched', 'burning', 'ruined', 'overgrown', 'frozen']),
    );
    expect(smallestSide).toBeLessThan(6);
    expect(largestSide).toBeGreaterThan(320);
    expect(largestWorldScale).toBeGreaterThan(15);
    expect(dimRooms).toBeLessThan(150);
  });

  it('actively avoids recent themes, layouts, shaders, and lighting treatments', () => {
    const recentRooms: RoomHistoryEntry[] = [];
    let seed = 'novelty-chain';

    for (let index = 0; index < 24; index += 1) {
      const room = generateOfflineRoom({
        seed,
        previousTitles: recentRooms.map((_, roomIndex) => `room-${roomIndex}`),
        moodBias: 'static',
        allowGore: false,
        linkIndex: index,
        recentRooms,
      });
      const lastSix = recentRooms.slice(-6);
      const lastTwo = recentRooms.slice(-2);

      expect(lastSix.some((entry) => entry.themeId === room.themeId)).toBe(false);
      expect(lastTwo.some((entry) => entry.layoutStyle === room.layoutStyle)).toBe(false);
      expect(lastTwo.some((entry) => entry.architecture === room.architecture)).toBe(false);
      expect(lastTwo.some((entry) => entry.shader === room.visuals?.shader)).toBe(false);
      expect(lastTwo.some((entry) => entry.lighting === room.visuals?.lighting)).toBe(false);
      expect(lastTwo.some((entry) => entry.mood === room.mood)).toBe(false);
      recentRooms.push(roomHistoryEntryFor(room));
      if (recentRooms.length > 12) recentRooms.shift();
      seed = childSeed(seed, `room-${index}`);
    }
  });

  it('makes ordinary room scales common and both extremes genuinely rare', () => {
    const counts = new Map<string, number>();
    const sampleSize = 5_000;

    for (let index = 0; index < sampleSize; index += 1) {
      const room = generateOfflineRoom({
        seed: `scale-rate-${index}`,
        previousTitles: [],
        moodBias: 'static',
        allowGore: false,
        linkIndex: index,
      });
      const profile = room.scaleProfile ?? 'human';
      counts.set(profile, (counts.get(profile) ?? 0) + 1);
    }

    expect((counts.get('closet') ?? 0) / sampleSize).toBeLessThan(0.04);
    expect((counts.get('colossal') ?? 0) / sampleSize).toBeLessThan(0.02);
    expect(((counts.get('human') ?? 0) + (counts.get('grand') ?? 0)) / sampleSize).toBeGreaterThan(0.86);
    expect(counts.get('closet')).toBeGreaterThan(0);
    expect(counts.get('colossal')).toBeGreaterThan(0);
  }, 15_000);

  it('only enables bloodied scene treatments when gore is allowed', () => {
    let goreEnabledRoomFound = false;
    for (let index = 0; index < 600; index += 1) {
      const room = generateOfflineRoom({
        seed: `gore-condition-${index}`,
        previousTitles: [],
        moodBias: 'downer',
        allowGore: true,
        linkIndex: index,
      });
      if (room.condition === 'bloodied') {
        goreEnabledRoomFound = true;
        expect(room.themeTags).toContain('condition:bloodied');
        break;
      }
    }
    expect(goreEnabledRoomFound).toBe(true);
  });

  it.each([
    ['burning_hotel', 'burning'],
    ['wildfire_service_station', 'burning'],
    ['ash_city_plaza', 'scorched'],
    ['collapsed_cathedral', 'ruined'],
    ['slime_substation', 'slimed'],
    ['overgrown_greenhouse_lab', 'overgrown'],
    ['frozen_observatory', 'frozen'],
  ] as const)('keeps %s visually coherent with its %s condition', (themeId, condition) => {
    const direction = generateOfflineDirection(
      {
        seed: `condition-theme-${themeId}`,
        previousTitles: [],
        moodBias: 'static',
        allowGore: false,
        linkIndex: 0,
      },
      { themeId },
    );

    expect(direction.themeId).toBe(themeId);
    expect(direction.condition).toBe(condition);
  });

  it('keeps every theme preference attached to a real catalog asset', () => {
    for (const theme of THEME_PRESETS) {
      for (const assetId of theme.preferredAssets) {
        expect(getAsset(assetId), `${theme.id}:${assetId}`).toBeDefined();
      }
    }
  });

  it('derives the same visual treatment from the same seed', () => {
    const context = {
      seed: 'repeatable-visuals',
      previousTitles: [],
      moodBias: 'dynamic' as const,
      allowGore: false,
      linkIndex: 7,
    };

    expect(generateOfflineRoom(context).visuals).toEqual(
      generateOfflineRoom(context).visuals,
    );
  });

  it('keeps navigation-heavy kaleidoscope rooms genuinely rare', () => {
    let kaleidoscopeRooms = 0;
    const sampleSize = 4_000;
    for (let index = 0; index < sampleSize; index += 1) {
      if (resolveRoomVisuals(`kaleidoscope-rate-${index}`, 'dynamic').shader === 'kaleidoscope') {
        kaleidoscopeRooms += 1;
      }
    }

    expect(kaleidoscopeRooms).toBeGreaterThan(0);
    expect(kaleidoscopeRooms / sampleSize).toBeLessThan(0.02);
  });

  it('keeps atmospheric lighting by default but removes flashing when requested', () => {
    const defaultLighting = new Set<string>();

    for (let index = 0; index < 500; index += 1) {
      const base = {
        seed: `no-flashing-${index}`,
        previousTitles: [],
        moodBias: 'dynamic' as const,
        allowGore: false,
        linkIndex: index,
      };
      defaultLighting.add(generateOfflineRoom(base).visuals?.lighting ?? '');
      const safeRoom = generateOfflineRoom({
        ...base,
        noFlashingLights: true,
      });

      expect(safeRoom.visuals?.lighting).not.toBe('pulse');
      expect(safeRoom.visuals?.shader).not.toBe('strobe');
      expect(safeRoom.visuals?.flashStrength).toBe(0);
      expect(safeRoom.visuals?.flashingDisabled).toBe(true);
    }

    expect(defaultLighting).toContain('pulse');
    expect(defaultLighting).toContain('emergency');
  });

  it('removes dim rooms and raises the visibility floor when requested', () => {
    for (let index = 0; index < 500; index += 1) {
      const room = generateOfflineRoom({
        seed: `no-low-light-${index}`,
        previousTitles: [],
        moodBias: 'downer',
        allowGore: false,
        noLowLight: true,
        linkIndex: index,
      });

      expect(room.visuals?.lighting).not.toBe('dim');
      expect(room.visuals?.highVisibility).toBe(true);
      expect(room.visuals?.exposure).toBeGreaterThanOrEqual(1.2);
    }
  });

  it('randomizes dynamic treatment parameters while keeping each seed stable', () => {
    const treatments = Array.from({ length: 120 }, (_, index) =>
      generateOfflineRoom({
        seed: `treatment-values-${index}`,
        previousTitles: [],
        moodBias: 'dynamic',
        allowGore: false,
        linkIndex: index,
      }).visuals,
    );
    const signatures = new Set(
      treatments.map((visuals) =>
        [
          visuals?.motionSpeed.toFixed(3),
          visuals?.distortion.toFixed(3),
          visuals?.colorCycle.toFixed(3),
          visuals?.viewScale.toFixed(3),
          visuals?.mirrorSegments,
          visuals?.rotationSpeed.toFixed(3),
        ].join('|'),
      ),
    );

    expect(signatures.size).toBeGreaterThan(110);
    expect(generateOfflineRoom({
      seed: 'stable-treatment-values',
      previousTitles: [],
      moodBias: 'dynamic',
      allowGore: false,
      linkIndex: 0,
    }).visuals).toEqual(generateOfflineRoom({
      seed: 'stable-treatment-values',
      previousTitles: [],
      moodBias: 'dynamic',
      allowGore: false,
      linkIndex: 0,
    }).visuals);
  });
});

describe('random run seeds', () => {
  it('include high-entropy suffixes and do not collide in a practical sample', () => {
    const seeds = Array.from({ length: 300 }, () => randomSeed());
    expect(new Set(seeds).size).toBe(seeds.length);
    expect(seeds.every((seed) => /-[a-z0-9]{6,9}$/.test(seed))).toBe(true);
  });
});

function overlapsSpawn(prop: RoomProp): boolean {
  const rotation = prop.rotationY ?? 0;
  const cos = Math.abs(Math.cos(rotation));
  const sin = Math.abs(Math.sin(rotation));
  const halfX = prop.scale.x * 0.5 * cos + prop.scale.z * 0.5 * sin;
  const halfZ = prop.scale.x * 0.5 * sin + prop.scale.z * 0.5 * cos;
  const clearance = PLAYER.radius + 0.18;
  return (
    Math.abs(prop.position.x) < halfX + clearance &&
    Math.abs(prop.position.z) < halfZ + clearance
  );
}
