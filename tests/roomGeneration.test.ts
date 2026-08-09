import { describe, expect, it } from 'vitest';
import { PLAYER, ROOM } from '../src/config';
import { childSeed, randomSeed } from '../src/core/rng';
import type { RoomHistoryEntry, RoomProp } from '../src/types';
import { generateOfflineRoom } from '../src/world/offlineGenerator';
import { roomHistoryEntryFor } from '../src/world/roomDirector';

describe('offline room invariants', () => {
  it('keeps the spawn island clear and respects logical object budgets', () => {
    const shaderStyles = new Set<string>();
    const lightingStyles = new Set<string>();
    const wireframeModes = new Set<boolean>();
    let dimRooms = 0;

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
      expect(room.props.some((prop) => prop.linksOnTouch)).toBe(true);
      expect(room.visuals).toBeDefined();
      if (room.visuals) {
        shaderStyles.add(room.visuals.shader);
        lightingStyles.add(room.visuals.lighting);
        if (room.visuals.lighting === 'dim') dimRooms += 1;
        wireframeModes.add(room.visuals.wireframe);
        expect(room.visuals.effectStrength).toBeGreaterThanOrEqual(0);
        expect(room.visuals.effectStrength).toBeLessThanOrEqual(1);
        expect(room.visuals.exposure).toBeGreaterThanOrEqual(0.92);
        expect(room.visuals.exposure).toBeLessThanOrEqual(1.35);
      }

      for (const prop of room.props.filter((candidate) => candidate.solid !== false)) {
        expect(overlapsSpawn(prop)).toBe(false);
      }
    }

    expect(shaderStyles).toEqual(
      new Set(['none', 'retro', 'tint', 'dream', 'noir', 'crt']),
    );
    expect(lightingStyles).toEqual(
      new Set(['fluorescent', 'dim', 'cold', 'warm', 'emergency', 'pulse']),
    );
    expect(wireframeModes).toEqual(new Set([false, true]));
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
      expect(lastTwo.some((entry) => entry.shader === room.visuals?.shader)).toBe(false);
      expect(lastTwo.some((entry) => entry.lighting === room.visuals?.lighting)).toBe(false);

      recentRooms.push(roomHistoryEntryFor(room));
      if (recentRooms.length > 12) recentRooms.shift();
      seed = childSeed(seed, `room-${index}`);
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
