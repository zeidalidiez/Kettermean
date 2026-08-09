import { describe, expect, it } from 'vitest';
import { combineBillboardSigns } from '../src/world/billboardContent';
import { generateRoomSigns, SIGN_WORDS } from '../src/world/signLexicon';

const tropicalContext = (seed: string) => ({
  seed,
  tags: ['jungle', 'outdoor', 'garden'],
  mood: 'upper' as const,
  condition: 'overgrown' as const,
  environment: 'outdoor' as const,
  architecture: 'field' as const,
  scaleProfile: 'grand' as const,
});

describe('tagged procedural signage', () => {
  it('keeps a broad data-only vocabulary with explicit Jungle correlations', () => {
    expect(SIGN_WORDS.length).toBeGreaterThan(580);
    expect(SIGN_WORDS).toContainEqual(expect.objectContaining({
      text: 'Jungle',
      role: 'place',
      tags: expect.arrayContaining(['environment', 'place', 'warm', 'tropical']),
    }));
    expect(SIGN_WORDS).toContainEqual(expect.objectContaining({
      text: 'Table',
      role: 'place',
      tags: expect.arrayContaining(['furniture', 'meeting', 'banquet']),
    }));
  });

  it('is deterministic while composing multiple different signs per large room', () => {
    const first = generateRoomSigns(tropicalContext('green-sign-test'));
    const second = generateRoomSigns(tropicalContext('green-sign-test'));

    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThanOrEqual(2);
    expect(new Set(first.map((sign) => sign.headline)).size).toBe(first.length);
    expect(first.every((sign) => sign.caption.trim().split(/\s+/).length >= 8)).toBe(true);
  });

  it('strongly favors words correlated with the room without eliminating surprise', () => {
    const related = new Set(['tropical', 'warm', 'nature', 'garden', 'overgrown', 'outdoor']);
    const signs = Array.from({ length: 180 }, (_, index) =>
      generateRoomSigns(tropicalContext(`tropical-sign-${index}`)),
    ).flat();
    const correlated = signs.filter((sign) => sign.tags.some((tag) => related.has(tag)));

    expect(correlated.length / signs.length).toBeGreaterThan(0.72);
    expect(signs.some((sign) => sign.headline.includes('Jungle'))).toBe(true);
  });

  it('keeps authored and offline billboard writing visible at the same time', () => {
    const authored = [
      { headline: 'GARDEN · SLEEP PROCESSING', caption: 'AGENDA' },
      { headline: 'RAIN CLAIMS', caption: 'Present the umbrella assigned to your previous name' },
    ];
    const offline = generateRoomSigns(tropicalContext('combined-sign-test'));
    const combined = combineBillboardSigns(authored, offline);

    expect(combined).toHaveLength(authored.length + offline.length);
    expect(combined.map((sign) => sign.source)).toEqual(
      expect.arrayContaining(['ai', 'offline']),
    );
    expect(combined[0]?.source).toBe('ai');
    expect(combined[1]?.source).toBe('offline');
    expect(combined.every((sign) => sign.caption.trim().split(/\s+/).length >= 8)).toBe(true);
    expect(combined[0]?.caption).toMatch(/^AGENDA · /);
  });
});
