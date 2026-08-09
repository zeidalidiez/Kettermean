import { describe, expect, it } from 'vitest';
import { NPC_DIALOGUE_VOCABULARY, generateNpcDialogue } from '../src/world/npcDialogue';
import { generateOfflineRoom } from '../src/world/offlineGenerator';
import { wordCount } from '../src/world/textQuality';

describe('procedural NPC dialogue', () => {
  it('provides a broad deterministic default vocabulary', () => {
    expect(NPC_DIALOGUE_VOCABULARY.size).toBe(942);
    const expandedTags = [
      ['hotel', 'archive'], ['garden', 'aquarium'], ['observatory', 'celestial'],
      ['broadcast', 'cinema'], ['nursery', 'domestic'], ['subterranean', 'industrial'],
      ['botanical', 'maritime'],
    ] as const;
    const lines = Array.from({ length: 1_200 }, (_, index) =>
      generateNpcDialogue({
        seed: `dialogue-variety-${index}`,
        label: index % 2 ? 'night clerk' : 'waiting animal',
        tags: expandedTags[index % expandedTags.length]!,
        mood: index % 2 ? 'static' : 'dynamic',
        condition: index % 4 ? 'normal' : 'haunted',
      }),
    );

    expect(new Set(lines).size).toBeGreaterThan(1_175);
    expect(lines.every((line) => line.length <= 140)).toBe(true);
    expect(lines.every((line) => wordCount(line) >= 7)).toBe(true);
    expect(lines.every((line) => /[.!?]$/.test(line))).toBe(true);
    expect(lines[17]).toBe(generateNpcDialogue({
      seed: 'dialogue-variety-17',
      label: 'night clerk',
      tags: expandedTags[17 % expandedTags.length]!,
      mood: 'static',
      condition: 'normal',
    }));
  });

  it('gives every procedurally placed inhabitant something to say', () => {
    const lines = new Set<string>();
    let inhabitants = 0;
    for (let index = 0; index < 300; index += 1) {
      const room = generateOfflineRoom({
        seed: `offline-dialogue-${index}`,
        previousTitles: [],
        moodBias: index % 2 ? 'upper' : 'downer',
        allowGore: false,
        linkIndex: index,
      });
      for (const entity of room.entities) {
        inhabitants += 1;
        expect(entity.dialogue, `${room.seed}:${entity.label}`).toBeTruthy();
        lines.add(entity.dialogue!);
      }
    }

    expect(inhabitants).toBeGreaterThan(100);
    expect(lines.size).toBeGreaterThan(100);
  });
});
