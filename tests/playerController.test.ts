import { describe, expect, it } from 'vitest';
import { PLAYER } from '../src/config';
import { PlayerController } from '../src/player/PlayerController';
import type { ColliderBox, InputFrame } from '../src/types';

const still: InputFrame = {
  moveX: 0,
  moveZ: 0,
  lookX: 0,
  lookY: 0,
  sprint: false,
  jump: false,
  pausePressed: false,
};

const floor: ColliderBox = {
  minX: -10,
  maxX: 10,
  minY: -0.3,
  maxY: 0,
  minZ: -10,
  maxZ: 10,
  label: 'floor',
};

describe('player vertical collision', () => {
  it('lands on a non-link floor and can jump a second time', () => {
    const player = new PlayerController(1);
    player.spawnAt(0, PLAYER.eyeHeight, 0);

    player.update(1 / 60, { ...still, jump: true }, [floor]);
    expect(player.velocity.y).toBeCloseTo(PLAYER.jumpVelocity, 5);

    for (let i = 0; i < 240; i += 1) player.update(1 / 60, still, [floor]);
    expect(player.position.y).toBeCloseTo(PLAYER.eyeHeight, 5);

    player.update(1 / 60, { ...still, jump: true }, [floor]);
    expect(player.velocity.y).toBeGreaterThan(0);
  });

  it('cannot pass through a low ceiling', () => {
    const player = new PlayerController(1);
    const ceiling: ColliderBox = {
      minX: -10,
      maxX: 10,
      minY: 2.5,
      maxY: 2.7,
      minZ: -10,
      maxZ: 10,
      label: 'ceiling',
    };
    player.spawnAt(0, PLAYER.eyeHeight, 0);
    player.update(1 / 60, { ...still, jump: true }, [floor, ceiling]);

    let maxEyeY = player.position.y;
    for (let i = 0; i < 120; i += 1) {
      player.update(1 / 60, still, [floor, ceiling]);
      maxEyeY = Math.max(maxEyeY, player.position.y);
    }
    expect(maxEyeY).toBeLessThanOrEqual(2.3 + 1e-6);
  });
});
