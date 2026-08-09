import { describe, expect, it } from 'vitest';
import type { GenerationContext, RoomSpec } from '../src/types';
import { generateOfflineRoom } from '../src/world/offlineGenerator';
import {
  applyNarrativePatch,
  browserNarrativePrompt,
  narrativePatchFromObject,
  parseBrowserNarrative,
} from '../src/llm/narrative';

function context(seed: string): GenerationContext {
  return {
    seed,
    previousTitles: ['Old Hall'],
    moodBias: 'static',
    allowGore: false,
    linkIndex: 1,
  };
}

function room(seed: string): RoomSpec {
  return generateOfflineRoom(context(seed));
}

describe('adaptive AI narrative packets', () => {
  it('uses a seed-specific marker and salvages keyed browser fields independently', () => {
    const ctx = context('marker-room');
    const spec = room(ctx.seed);
    const prompt = browserNarrativePrompt('language', ctx, spec);
    const patch = parseBrowserNarrative([
      'unwanted preamble',
      prompt.marker,
      'TITLE=Municipal Moon Orchard',
      'BLURB=The fruit is stamped and filed. The trees are waiting for lunch.',
      'SIGN=ORCHARD CLAIMS | TAKE ONE NUMBER',
      'SIGN=<headline> | ACTUAL CAPTION',
    ].join('\n'), prompt.marker);

    expect(prompt.system).toContain(prompt.marker);
    expect(patch).toMatchObject({
      title: 'Municipal Moon Orchard',
      blurb: 'The fruit is stamped and filed. The trees are waiting for lunch.',
    });
    expect(patch.signs).toEqual([
      { headline: 'ORCHARD CLAIMS', caption: 'TAKE ONE NUMBER' },
    ]);
  });

  it('puts the blurb first so an early-stop response still improves room text', () => {
    const ctx = context('early-stop-room');
    const spec = room(ctx.seed);
    const prompt = browserNarrativePrompt('language', ctx, spec);
    const packet = prompt.user.slice(prompt.user.lastIndexOf(prompt.marker));

    expect(packet.indexOf('BLURB=')).toBeLessThan(packet.indexOf('TITLE='));
    expect(parseBrowserNarrative([
      prompt.marker,
      'BLURB=The ceiling keeps its own calendar. Every tile marks the same lost Tuesday.',
    ].join('\n'), prompt.marker)).toEqual({
      blurb: 'The ceiling keeps its own calendar. Every tile marks the same lost Tuesday.',
    });
  });

  it('applies valid fields without erasing procedural fallbacks', () => {
    const spec = room('patch-room');
    spec.entities = spec.entities.length ? spec.entities : [{
      id: 'test-npc',
      label: 'clerk',
      shape: 'box',
      position: { x: 2, y: 0, z: 2 },
      scale: { x: 1, y: 2, z: 1 },
      color: '#ffffff',
      behavior: 'idle',
    }];
    const originalPropCount = spec.props.length;
    const applied = applyNarrativePatch(spec, {
      roomRule: 'Nobody may face the same direction twice.',
      npcBehavior: 'stare',
      npcLines: ['Your direction has already been used.'],
    });

    expect(applied).toEqual(expect.arrayContaining([
      'room rule',
      'inhabitant behavior',
      '1 inhabitant lines',
    ]));
    expect(spec.props).toHaveLength(originalPropCount);
    expect(spec.entities[0]).toMatchObject({
      behavior: 'stare',
      dialogue: 'Your direction has already been used.',
    });
  });

  it('sanitizes rich cloud narrative objects', () => {
    expect(narrativePatchFromObject({
      title: 'Archive of Rain',
      blurb: 'Every file is wet. The cabinets insist it has never rained.',
      roomRule: 'Speak only when the lights are blue.',
      signs: [{ headline: 'WATER RECORDS', caption: 'DRY FORMS ONLY' }],
      npcLines: ['Your umbrella is overdue.'],
      npcBehavior: 'orbit',
    })).toEqual({
      title: 'Archive of Rain',
      blurb: 'Every file is wet. The cabinets insist it has never rained.',
      roomRule: 'Speak only when the lights are blue.',
      signs: [{ headline: 'WATER RECORDS', caption: 'DRY FORMS ONLY' }],
      npcLines: ['Your umbrella is overdue.'],
      npcBehavior: 'orbit',
    });
  });
});
