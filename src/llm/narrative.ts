import { sanitizeDisplayText } from '../core/contentSafety';
import { hashString } from '../core/rng';
import type {
  EntityBehavior,
  GenerationContext,
  RoomSignText,
  RoomSpec,
} from '../types';

export type BrowserNarrativePass = 'language' | 'inhabitants';

export interface RoomNarrativePatch {
  title?: string;
  blurb?: string;
  roomRule?: string;
  signs?: RoomSignText[];
  npcLines?: string[];
  npcBehavior?: EntityBehavior;
}

const BEHAVIORS = new Set<EntityBehavior>(['idle', 'wander', 'orbit', 'stare']);

export function browserNarrativePrompt(
  pass: BrowserNarrativePass,
  ctx: GenerationContext,
  room: RoomSpec,
): { marker: string; system: string; user: string } {
  const marker = narrativeMarker(ctx.seed, pass);
  const shared = [
    `Room title: ${room.title}.`,
    `Mood: ${room.mood}.`,
    `Tags: ${room.themeTags.slice(0, 10).join(', ')}.`,
    `Condition: ${room.condition}.`,
    `Avoid these old titles: ${ctx.previousTitles.slice(-5).join(', ') || 'none'}.`,
  ];

  if (pass === 'language') {
    return {
      marker,
      system: [
        'Write compact, uncanny language for one liminal dream room.',
        `Begin with the exact response tag ${marker}.`,
        'Then write exactly four adjacent labeled lines: BLURB, TITLE, SIGN, SIGN.',
        'Do not put blank lines between fields.',
        'TITLE is two to five invented words.',
        'BLURB is two short atmospheric sentences that combine the supplied ideas.',
        'Each SIGN is HEADLINE | CAPTION using actual sign text.',
        'Do not repeat instructions, placeholders, examples, markdown, or analysis.',
      ].join(' '),
      user: [
        ...shared,
        `${marker}`,
        'BLURB=',
        'TITLE=',
        'SIGN=',
        'SIGN=',
      ].join('\n'),
    };
  }

  return {
    marker,
    system: [
      'Invent one strange social rule and tiny inhabitant reactions for a liminal room.',
      `Begin with the exact response tag ${marker}.`,
      'Then write exactly four labeled lines: RULE, BEHAVIOR, NPC, NPC.',
      'BEHAVIOR must be idle, wander, orbit, or stare.',
      'NPC lines must be short things an inhabitant might say to the player.',
      'Do not repeat instructions, placeholders, examples, markdown, or analysis.',
    ].join(' '),
    user: [
      ...shared,
      `Inhabitants: ${room.entities.slice(0, 6).map((entity) => entity.label).join(', ') || 'unseen staff'}.`,
      `${marker}`,
      'RULE=',
      'BEHAVIOR=',
      'NPC=',
      'NPC=',
    ].join('\n'),
  };
}

export function parseBrowserNarrative(
  text: string,
  marker: string,
): RoomNarrativePatch {
  const payload = payloadAfterMarker(text, marker);
  const fields = extractFields(payload);
  const title = cleanText(fields.get('TITLE')?.[0], 80);
  const blurb = cleanText(fields.get('BLURB')?.[0], 320);
  const roomRule = cleanText(fields.get('RULE')?.[0], 180);
  const signs = (fields.get('SIGN') ?? [])
    .map(parseSign)
    .filter((sign): sign is RoomSignText => Boolean(sign));
  const npcLines = (fields.get('NPC') ?? [])
    .map((line) => cleanText(line, 140))
    .filter((line): line is string => Boolean(line));
  const behaviorRaw = fields.get('BEHAVIOR')?.[0]?.trim().toLowerCase();
  const npcBehavior = behaviorRaw && BEHAVIORS.has(behaviorRaw as EntityBehavior)
    ? behaviorRaw as EntityBehavior
    : undefined;

  return {
    ...(title ? { title } : {}),
    ...(blurb ? { blurb } : {}),
    ...(roomRule ? { roomRule } : {}),
    ...(signs.length ? { signs: signs.slice(0, 6) } : {}),
    ...(npcLines.length ? { npcLines: npcLines.slice(0, 6) } : {}),
    ...(npcBehavior ? { npcBehavior } : {}),
  };
}

export function narrativePatchFromObject(raw: unknown): RoomNarrativePatch {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const value = raw as Record<string, unknown>;
  const title = cleanText(value.title, 80);
  const blurb = cleanText(value.blurb ?? value.description, 320);
  const roomRule = cleanText(value.roomRule ?? value.rule, 180);
  const rawSigns = Array.isArray(value.signs) ? value.signs : [];
  const signs = rawSigns.map((sign) => {
    if (typeof sign === 'string') return parseSign(sign);
    if (!sign || typeof sign !== 'object') return null;
    const object = sign as Record<string, unknown>;
    const headline = cleanText(object.headline ?? object.text, 64);
    const caption = cleanText(object.caption ?? object.subtext, 48);
    return headline && caption ? { headline, caption } : null;
  }).filter((sign): sign is RoomSignText => Boolean(sign)).slice(0, 6);
  const npcLines = (Array.isArray(value.npcLines) ? value.npcLines : [])
    .map((line) => cleanText(line, 140))
    .filter((line): line is string => Boolean(line))
    .slice(0, 6);
  const behaviorRaw = typeof value.npcBehavior === 'string'
    ? value.npcBehavior.trim().toLowerCase()
    : '';
  const npcBehavior = BEHAVIORS.has(behaviorRaw as EntityBehavior)
    ? behaviorRaw as EntityBehavior
    : undefined;
  return {
    ...(title ? { title } : {}),
    ...(blurb ? { blurb } : {}),
    ...(roomRule ? { roomRule } : {}),
    ...(signs.length ? { signs } : {}),
    ...(npcLines.length ? { npcLines } : {}),
    ...(npcBehavior ? { npcBehavior } : {}),
  };
}

/** Merge each valid field independently; unusable fields leave the compiled room intact. */
export function applyNarrativePatch(room: RoomSpec, patch: RoomNarrativePatch): string[] {
  const applied: string[] = [];
  if (patch.title) {
    room.title = patch.title;
    applied.push('title');
  }
  if (patch.blurb) {
    room.blurb = patch.blurb;
    applied.push('blurb');
  }
  if (patch.roomRule) {
    room.roomRule = patch.roomRule;
    applied.push('room rule');
  }
  if (patch.signs?.length) {
    room.signs = patch.signs;
    applied.push(`${patch.signs.length} signs`);
  }
  if (patch.npcBehavior) {
    for (const entity of room.entities) entity.behavior = patch.npcBehavior;
    if (room.entities.length) applied.push('inhabitant behavior');
  }
  if (patch.npcLines?.length && room.entities.length) {
    room.entities.forEach((entity, index) => {
      entity.dialogue = patch.npcLines?.[index % patch.npcLines.length];
    });
    applied.push(`${Math.min(patch.npcLines.length, room.entities.length)} inhabitant lines`);
  }
  return applied;
}

export function cloudNarrativePrompt(
  ctx: GenerationContext,
  room: RoomSpec,
): { system: string; user: string } {
  const marker = narrativeMarker(ctx.seed, 'cloud');
  return {
    system: [
      'You are the dialogue and environmental-writing pass for a liminal dream game.',
      'Return one JSON object only, with no markdown or analysis.',
      `Set responseTag to exactly ${marker}.`,
      'Schema: responseTag, title, blurb, roomRule, signs, npcLines, npcBehavior.',
      'blurb is two or three concise atmospheric sentences.',
      'signs is 3-6 objects with headline and caption.',
      'npcLines is 2-6 short reactions. npcBehavior is idle|wander|orbit|stare.',
      'Invent actual content. Never return instructions or placeholders.',
      'Never sexual or obscene.',
    ].join(' '),
    user: JSON.stringify({
      responseTag: marker,
      seed: ctx.seed,
      title: room.title,
      mood: room.mood,
      tags: room.themeTags.slice(0, 12),
      condition: room.condition,
      environment: room.environment,
      architecture: room.architecture,
      inhabitants: room.entities.slice(0, 6).map((entity) => entity.label),
      avoidTitles: ctx.previousTitles.slice(-5),
    }),
  };
}

function narrativeMarker(seed: string, pass: string): string {
  return `K${pass === 'language' ? 'TXT' : pass === 'inhabitants' ? 'CAST' : 'CLOUD'}${hashString(`${seed}:${pass}`).toString(36).toUpperCase()}`;
}

function payloadAfterMarker(text: string, marker: string): string {
  const cleaned = (text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/```[a-z0-9_-]*/gi, ' ')
    .replace(/```/g, ' ')
    .trim();
  const index = cleaned.toUpperCase().lastIndexOf(marker.toUpperCase());
  return index >= 0 ? cleaned.slice(index + marker.length) : cleaned;
}

function extractFields(text: string): Map<string, string[]> {
  const fields = new Map<string, string[]>();
  const pattern = /(?:^|\n|\s)(TITLE|BLURB|SIGN|RULE|BEHAVIOR|NPC)\s*[:=]\s*([\s\S]*?)(?=(?:\n|\s)+(?:TITLE|BLURB|SIGN|RULE|BEHAVIOR|NPC)\s*[:=]|$)/gi;
  for (const match of text.matchAll(pattern)) {
    const key = match[1]!.toUpperCase();
    const value = match[2]!.replace(/\s+/g, ' ').trim();
    if (!value) continue;
    const current = fields.get(key) ?? [];
    current.push(value);
    fields.set(key, current);
  }
  return fields;
}

function parseSign(value: string): RoomSignText | null {
  const [rawHeadline, rawCaption] = value.split('|', 2);
  const headline = cleanText(rawHeadline, 64);
  const caption = cleanText(rawCaption, 48);
  return headline && caption ? { headline, caption } : null;
}

function cleanText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = sanitizeDisplayText(value, '', maxLength).replace(/^[-*`"']+|[-*`"']+$/g, '').trim();
  if (cleaned.length < 2 || isPlaceholder(cleaned)) return undefined;
  return cleaned;
}

function isPlaceholder(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    /^<[^>]+>$/.test(normalized) ||
    /^(?:a |one )?short (?:atmospheric )?(?:title|blurb|description|sentence)\b/.test(normalized) ||
    /\b(?:2|two)\s*(?:-|–|to)\s*(?:5|five)\s+words?\b/.test(normalized) ||
    /^(?:invent|write|choose|select|return|use exactly)\b/.test(normalized) ||
    normalized.includes('here is the requested') ||
    normalized.includes('as an ai')
  );
}
