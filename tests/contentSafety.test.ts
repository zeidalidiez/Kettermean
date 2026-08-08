import { describe, expect, it } from 'vitest';
import { containsBlockedContent, sanitizeDisplayText } from '../src/core/contentSafety';
import { assembleRoomSpec, parseRoomDirection } from '../src/world/roomDirector';

describe('content safety at room direction boundaries', () => {
  it.each([
    'Sexual content title',
    'An explicit sexual scene',
    'NSFW nursery',
    'Underage sexual content',
  ])('blocks unsafe display text: %s', (value) => {
    expect(containsBlockedContent(value)).toBe(true);
    expect(sanitizeDisplayText(value, 'Safe fallback')).toBe('Safe fallback');
  });

  it('sanitizes high-level LLM directions before they reach the HUD', () => {
    const direction = parseRoomDirection(
      {
        themeId: 'fluorescent_lobby',
        title: 'Sexual content title',
        blurb: 'Explicit sexual content',
        mood: 'static',
        placements: [{ assetId: 'door_fake' }],
      },
      'unsafe-direction',
    );

    expect(direction).not.toBeNull();
    const room = assembleRoomSpec(direction!);
    expect(room.title).not.toMatch(/sexual/i);
    expect(room.blurb).not.toMatch(/sexual|explicit/i);
  });

  it('does not block benign words containing the same letters', () => {
    expect(sanitizeDisplayText('The Essex Terminal', 'fallback')).toBe('The Essex Terminal');
  });

  it('sanitizes placement labels at final room assembly', () => {
    const room = assembleRoomSpec({
      seed: 'unsafe-label',
      title: 'Safe title',
      blurb: 'Safe blurb',
      mood: 'static',
      tags: ['liminal'],
      width: 12,
      depth: 12,
      height: 4,
      placements: [
        { assetId: 'chair_plastic', x: 2, z: 2, labelOverride: 'Explicit sexual prop' },
      ],
    });

    expect(room.props[0]?.label).toBe('plastic chair');
  });
});
