import { describe, expect, it } from 'vitest';
import { assembleRoomSpec, parseRoomDirection } from '../src/world/roomDirector';

describe('AI room direction contract', () => {
  it('preserves validated environmental, visual, narrative, and behavior direction', () => {
    const direction = parseRoomDirection({
      themeId: 'fluorescent_lobby',
      title: 'Cinder Benefits Office',
      blurb: 'The receptionists file smoke into alphabetical drawers. Nobody remembers requesting the fire.',
      mood: 'dynamic',
      tags: ['office', 'fire', 'bureaucracy'],
      environment: 'open-hall',
      layoutStyle: 'axial',
      architecture: 'concourse',
      scaleProfile: 'monumental',
      worldScale: 3.4,
      condition: 'burning',
      density: 1.2,
      fogNear: 18,
      fogFar: 120,
      linkColor: '#ff5522',
      visuals: {
        shader: 'heatwave',
        lighting: 'warm',
        tint: '#ff8844',
        distortion: 0.72,
        wireframe: false,
      },
      roomRule: 'Every inhabitant must apologize to the nearest flame.',
      signs: [
        { headline: 'CINDER BENEFITS', caption: 'CLAIMS NEVER CLOSE' },
        { headline: 'SMOKE RECORDS', caption: 'TAKE A NUMBER' },
      ],
      npcLines: ['Your appointment burned yesterday.', 'Please initial the ash.'],
      npcBehavior: 'stare',
      placements: [
        { assetId: 'npc_clerk' },
        { assetId: 'desk_security' },
      ],
    }, 'rich-ai-direction', {
      allowGore: false,
      previousTitles: [],
      moodBias: 'static',
      linkIndex: 1,
    });
    expect(direction!.width).toBeGreaterThanOrEqual(105);
    expect(direction!.depth).toBeGreaterThanOrEqual(105);
    expect(direction!.height).toBeGreaterThanOrEqual(28);

    expect(direction).not.toBeNull();
    expect(direction).toMatchObject({
      title: 'Cinder Benefits Office',
      mood: 'dynamic',
      environment: 'open-hall',
      layoutStyle: 'axial',
      architecture: 'concourse',
      scaleProfile: 'monumental',
      worldScale: 3.4,
      condition: 'burning',
      fogNear: 18,
      fogFar: 120,
      linkColor: '#ff5522',
      roomRule: 'Every inhabitant must apologize to the nearest flame.',
      visuals: expect.objectContaining({
        shader: 'heatwave',
        lighting: 'warm',
        tint: '#ff8844',
      }),
    });

    const room = assembleRoomSpec(direction!);
    expect(room.blurb.length).toBeGreaterThan(80);
    expect(room.signs).toHaveLength(2);
    expect(room.themeTags).toEqual(expect.arrayContaining(['bureaucracy', 'condition:burning']));
    expect(room.entities.every((entity) => entity.behavior === 'stare')).toBe(true);
    expect(room.entities.some((entity) => Boolean(entity.dialogue))).toBe(true);
  });

  it('rejects empty or copied-placeholder payloads instead of labeling them AI-authored', () => {
    expect(parseRoomDirection({}, 'empty-direction')).toBeNull();
    expect(parseRoomDirection({
      title: 'short title (2-5 words)',
      blurb: '<invented atmospheric sentence>',
    }, 'copied-example')).toBeNull();
  });

  it('enforces comfort constraints over hostile model controls', () => {
    const direction = parseRoomDirection({
      title: 'Unsafe Controls',
      condition: 'bloodied',
      visuals: { shader: 'strobe', lighting: 'dim', flashStrength: 0.24 },
    }, 'comfort-wins', {
      allowGore: false,
      noFlashingLights: true,
      noLowLight: true,
    });

    expect(direction?.condition).not.toBe('bloodied');
    expect(direction?.visuals?.shader).not.toBe('strobe');
    expect(direction?.visuals?.lighting).not.toBe('dim');
    expect(direction?.visuals?.flashStrength).toBe(0);
  });
});
