import { describe, expect, it } from 'vitest';
import { ROOM_MODE_MAP } from '../src/game/RoomPostProcessor';
import { ROOM_SHADER_VALUES } from '../src/world/roomDirector';

describe('shader pipeline parity', () => {
  it('maps every shader prompt value to a post-process mode', () => {
    for (const shader of ROOM_SHADER_VALUES) {
      expect(typeof ROOM_MODE_MAP[shader], shader).toBe('number');
    }
  });

  it('exposes a mode for every key in the shader type map', () => {
    const modeKeys = Object.keys(ROOM_MODE_MAP);
    const promptValues = new Set(ROOM_SHADER_VALUES);
    for (const key of modeKeys) {
      expect(promptValues.has(key as never), key).toBe(true);
    }
  });

  it('keeps both lists the same size so neither can drift unnoticed', () => {
    expect(Object.keys(ROOM_MODE_MAP).length).toBe(ROOM_SHADER_VALUES.length);
    expect(new Set(Object.keys(ROOM_MODE_MAP)).size).toBe(ROOM_SHADER_VALUES.length);
  });
});
