import { describe, expect, it } from 'vitest';
import { PLAYER, ROOM } from '../src/config';
import type { RoomProp } from '../src/types';
import { generateOfflineRoom } from '../src/world/offlineGenerator';

describe('offline room invariants', () => {
  it('keeps the spawn island clear and respects logical object budgets', () => {
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

      for (const prop of room.props.filter((candidate) => candidate.solid !== false)) {
        expect(overlapsSpawn(prop)).toBe(false);
      }
    }
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
