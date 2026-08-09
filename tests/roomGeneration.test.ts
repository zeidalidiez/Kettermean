import { describe, expect, it } from 'vitest';
import { PLAYER, ROOM } from '../src/config';
import type { RoomProp } from '../src/types';
import { generateOfflineRoom } from '../src/world/offlineGenerator';

describe('offline room invariants', () => {
  it('keeps the spawn island clear and respects logical object budgets', () => {
    const shaderStyles = new Set<string>();
    const lightingStyles = new Set<string>();
    const wireframeModes = new Set<boolean>();

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
        wireframeModes.add(room.visuals.wireframe);
        expect(room.visuals.effectStrength).toBeGreaterThanOrEqual(0);
        expect(room.visuals.effectStrength).toBeLessThanOrEqual(1);
        expect(room.visuals.exposure).toBeGreaterThanOrEqual(0.55);
        expect(room.visuals.exposure).toBeLessThanOrEqual(1.3);
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
