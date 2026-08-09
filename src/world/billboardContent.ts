import type { RoomSignText } from '../types';
import { ensureSignCaption } from './textQuality';

export type BillboardSource = 'ai' | 'offline';

export interface BillboardText extends RoomSignText {
  source: BillboardSource;
}

/**
 * Keep both writing systems visible in the same room. Interleaving prevents a
 * six-sign AI response from crowding procedural context off the walls (or vice
 * versa), while normalized deduplication avoids literal repeats.
 */
export function combineBillboardSigns(
  authored: readonly RoomSignText[],
  procedural: readonly RoomSignText[],
  maximum = 12,
): BillboardText[] {
  const ai = authored.map((sign, index) => ({
    ...sign,
    caption: ensureSignCaption(sign.caption, `ai:${index}:${sign.headline}`),
    source: 'ai' as const,
  }));
  const offline = procedural.map((sign, index) => ({
    ...sign,
    caption: ensureSignCaption(sign.caption, `offline:${index}:${sign.headline}`),
    source: 'offline' as const,
  }));
  const combined: BillboardText[] = [];
  const seen = new Set<string>();
  const length = Math.max(ai.length, offline.length);

  for (let index = 0; index < length && combined.length < maximum; index += 1) {
    for (const candidate of [ai[index], offline[index]]) {
      if (!candidate || combined.length >= maximum) continue;
      const key = `${normalize(candidate.headline)}|${normalize(candidate.caption)}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      combined.push(candidate);
    }
  }

  return combined;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
