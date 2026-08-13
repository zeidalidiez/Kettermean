import { describe, expect, it } from 'vitest';
import { ATELIER_ASSETS } from '../src/world/detailedAssetsRound4';
import {
  NPC_DIALOGUE_TAG_LINES,
  NPC_DIALOGUE_VOCABULARY,
  generateNpcDialogue,
} from '../src/world/npcDialogue';
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

  it('reaches the newer semantic dialogue pools through real catalog tags', () => {
    const examples = [
      ['observatory', 'atelier_npc_weather_observer_01'],
      ['celestial', 'atelier_npc_eclipse_usher_01'],
      ['broadcast', 'atelier_teletype_01'],
      ['domestic', 'atelier_tea_robot_01'],
      ['subterranean', 'atelier_npc_rail_inspector_01'],
      ['botanical', 'atelier_npc_anatomist_01'],
      ['maritime', 'atelier_npc_tide_keeper_01'],
    ] as const;

    for (const [semanticTag, assetId] of examples) {
      const asset = ATELIER_ASSETS.find((candidate) => candidate.id === assetId)!;
      const lines = Array.from({ length: 180 }, (_, index) => generateNpcDialogue({
        seed: `reachable-${semanticTag}-${index}`,
        label: asset.label,
        tags: asset.tags,
        mood: 'static',
        condition: 'normal',
      }));
      expect(
        lines.some((line) => NPC_DIALOGUE_TAG_LINES[semanticTag]!.some(
          (phrase) => line.includes(phrase),
        )),
        `${semanticTag} through ${asset.tags.join(',')}`,
      ).toBe(true);
    }
  });

  it('gives every procedurally placed inhabitant something to say', () => {
    const lines = new Set<string>();
    let inhabitants = 0;
    for (let index = 0; index < 150; index += 1) {
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

    expect(inhabitants).toBeGreaterThan(50);
    expect(lines.size).toBeGreaterThan(50);
  }, 20_000);
});
