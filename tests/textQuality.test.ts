import { describe, expect, it } from 'vitest';
import {
  ensureRoomBlurb,
  ensureSignCaption,
  ROOM_BLURB_MAX_LENGTH,
  ROOM_BLURB_MIN_SENTENCES,
  ROOM_BLURB_MIN_WORDS,
  sentenceCount,
  SIGN_CAPTION_MIN_WORDS,
  wordCount,
} from '../src/world/textQuality';

const context = {
  seed: 'sunken-underpass-467',
  title: 'Bright Pool With No Water',
  mood: 'upper' as const,
  tags: ['pool', 'dry', 'public'],
  condition: 'slimed' as const,
  environment: 'open-hall' as const,
  architecture: 'basin' as const,
};

describe('room text quality floor', () => {
  it('keeps a useful short model blurb and completes it locally', () => {
    const short = 'Chlorine memory hangs in dry air. The air tastes like dust and old coffee.';
    const completed = ensureRoomBlurb(short, context);

    expect(completed.startsWith(short)).toBe(true);
    expect(wordCount(completed)).toBeGreaterThanOrEqual(ROOM_BLURB_MIN_WORDS);
    expect(sentenceCount(completed)).toBeGreaterThanOrEqual(ROOM_BLURB_MIN_SENTENCES);
  });

  it('removes numbered prose and drops a visibly clipped final clause', () => {
    const clipped = '1. The air is fresh and crisp, with a soft breeze rustling the leaves of tall trees in sight. 2. Buildings cluster around this quiet square, their facades painted bright colors against the darkening sky.3. A wooden lattice overhangs one corner of a large rooftop garden amidst towering greenery that reaches near to its';
    const completed = ensureRoomBlurb(clipped, { ...context, seed: 'rooftop-garden-b' });

    expect(completed).not.toMatch(/(?:^|\s)\d+[.)]\s/);
    expect(completed).not.toContain('reaches near to its');
    expect(completed).toMatch(/[.!?…]$/);
    expect(completed.length).toBeLessThanOrEqual(ROOM_BLURB_MAX_LENGTH);
    expect(wordCount(completed)).toBeGreaterThanOrEqual(ROOM_BLURB_MIN_WORDS);
  });

  it('does not shorten already complete rich prose at the old 320-character boundary', () => {
    const rich = [
      'Fresh air crosses the garden in slow layers, moving the tall leaves while every hanging cord remains still.',
      'Painted buildings surround the square with windows lit for different hours, and a wooden lattice holds the shadow of a vine that has not grown there yet.',
      'Near the far parapet, carefully labeled watering cans wait beneath a schedule addressed to visitors who have not arrived.',
    ].join(' ');
    const completed = ensureRoomBlurb(rich, { ...context, seed: 'long-complete-copy' });

    expect(rich.length).toBeGreaterThan(320);
    expect(completed).toBe(rich);
  });

  it('turns one-word model captions into readable supporting notices', () => {
    const caption = ensureSignCaption('AGENDA', 'garden-sleep-processing');

    expect(caption).toMatch(/^AGENDA · /);
    expect(wordCount(caption)).toBeGreaterThanOrEqual(SIGN_CAPTION_MIN_WORDS);
  });
});
