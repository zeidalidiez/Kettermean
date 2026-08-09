import { SeededRng } from '../core/rng';
import type {
  GenerationContext,
  MoodAxis,
  RoomLightingStyle,
  RoomShaderStyle,
} from '../types';
import { listThemeIds, type RoomDirection } from './assetCatalog';
import { generateOfflineDirection } from './roomDirector';

export const STEERING_FIELDS = [
  'THEME',
  'MOOD',
  'ANOMALY',
  'SHADER',
  'LIGHTING',
  'TINT',
  'DENSITY',
  'WIREFRAME',
] as const;

export type SteeringField = (typeof STEERING_FIELDS)[number];

export interface SteeringResult {
  direction: RoomDirection;
  code: string;
  modelDigitCount: number;
  fallbackFields: SteeringField[];
}

const MOODS: MoodAxis[] = ['static', 'upper', 'downer', 'dynamic'];
const SHADER_FAMILIES: readonly (readonly RoomShaderStyle[])[] = [
  ['none', 'fisheye', 'mirror', 'posterize'],
  ['retro', 'vhs', 'dither'],
  ['tint', 'thermal', 'prism', 'duotone'],
  ['dream', 'acid', 'underwater', 'solarize'],
  ['noir', 'mirror', 'tunnel'],
  ['crt', 'prism', 'strobe'],
];
const LIGHTING: RoomLightingStyle[] = [
  'fluorescent',
  'dim',
  'cold',
  'warm',
  'emergency',
  'pulse',
];
const TINTS = ['#ffffff', '#78c8ff', '#ff786f', '#83f28f', '#c89cff', '#ffc36f'];
const DENSITIES = [0.7, 0.85, 1, 1.15, 1.3];

export function browserSteeringPrompt(
  ctx: GenerationContext,
): { system: string; user: string } {
  const themes = themeShortlist(ctx.seed);
  const dimChoice = ctx.noLowLight ? 'fluorescent' : 'dim';
  const pulseChoice = ctx.noFlashingLights ? 'static emergency' : 'pulse';
  const emergencyChoice = ctx.noFlashingLights ? 'static emergency' : 'emergency';
  const system = [
    'Choose eight controls for one liminal room.',
    'Reply on one line with KMR immediately followed by exactly eight digits.',
    'Use one digit from each category in the listed order.',
    'No prose, punctuation, markdown, repetition, or explanation.',
  ].join(' ');
  const user = [
    'Theme digit:',
    ...themes.map((theme, index) => `${index} = ${theme}`),
    'Mood digit: 0 static, 1 upper, 2 downer, 3 dynamic.',
    'Anomaly digit: 0 ordinary scale, 1 giant anomaly.',
    `Shader family digit: 0 clean/lens/poster, 1 retro/VHS/dither, 2 tint/thermal/duotone, 3 dream/acid/solar, 4 noir/mirror/tunnel, 5 ${ctx.noFlashingLights ? 'CRT/prism' : 'CRT/prism/strobe'}.`,
    `Lighting digit: 0 fluorescent, 1 ${dimChoice}, 2 cold, 3 warm, 4 ${emergencyChoice}, 5 ${pulseChoice}.`,
    'Tint digit: 0 neutral, 1 blue, 2 red, 3 green, 4 violet, 5 amber.',
    'Density digit: 0 sparse, 1 open, 2 normal, 3 busy, 4 crowded.',
    'Wireframe digit: 0 solid, 1 wireframe.',
    'Return the KMR code now.',
  ].join('\n');
  return { system, user };
}

/**
 * Convert any completion into bounded room steering. A recognizable prefix can
 * contribute one to eight digits; every missing position is filled from the seed.
 */
export function parseSteeringDirection(
  text: string,
  ctx: GenerationContext,
): SteeringResult {
  const modelDigits = extractSteeringDigits(text);
  const rng = new SeededRng(`${ctx.seed}:browser-steering-fallback`);
  const digits = STEERING_FIELDS.map((_, index) =>
    modelDigits[index] ?? fallbackDigit(index, rng),
  );
  const themes = themeShortlist(ctx.seed);
  const shader = shaderForDigit(digits[3]!, ctx);
  const lighting = constrainLighting(
    LIGHTING[digits[4]! % LIGHTING.length]!,
    ctx,
  );
  const density = DENSITIES[digits[6]! % DENSITIES.length]!;
  const direction = generateOfflineDirection(ctx, {
    themeId: themes[digits[0]! % themes.length],
    mood: MOODS[digits[1]! % MOODS.length],
    giant: digits[2]! % 2 === 1,
    density,
    visuals: {
      shader,
      lighting,
      tint: TINTS[digits[5]! % TINTS.length],
      effectStrength: 0.48 + (digits[5]! % 5) * 0.08,
      pixelSize: 3 + (digits[6]! % 6),
      wireframe: digits[7]! % 2 === 1,
    },
  });
  // A browser inference did occur even when some or all steering positions fell back.
  direction.offline = false;

  return {
    direction,
    code: `KMR${digits.join('')}`,
    modelDigitCount: modelDigits.length,
    fallbackFields: STEERING_FIELDS.slice(modelDigits.length),
  };
}

function shaderForDigit(digit: number, ctx: GenerationContext): RoomShaderStyle {
  const family = SHADER_FAMILIES[digit % SHADER_FAMILIES.length]!;
  const allowed = family.filter(
    (shader) => !ctx.noFlashingLights || shader !== 'strobe',
  );
  return new SeededRng(`${ctx.seed}:browser-shader-family:${digit}`).pick(allowed);
}

function constrainLighting(
  lighting: RoomLightingStyle,
  ctx: GenerationContext,
): RoomLightingStyle {
  if (ctx.noLowLight && lighting === 'dim') return 'fluorescent';
  if (ctx.noFlashingLights && lighting === 'pulse') return 'emergency';
  return lighting;
}

function extractSteeringDigits(text: string): number[] {
  const compact = (text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const match = /KMR(\d{1,8})/.exec(compact);
  return match?.[1]?.split('').map(Number) ?? [];
}

function fallbackDigit(index: number, rng: SeededRng): number {
  switch (index) {
    case 0:
      return rng.int(0, 4);
    case 1:
      return rng.int(0, 3);
    case 2:
      return rng.chance(0.16) ? 1 : 0;
    case 3:
    case 4:
    case 5:
      return rng.int(0, 5);
    case 6:
      return rng.int(0, 4);
    default:
      return rng.chance(0.1) ? 1 : 0;
  }
}

function themeShortlist(seed: string): string[] {
  const pool = listThemeIds();
  const rng = new SeededRng(`${seed}:browser-theme-options`);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.int(0, index);
    [pool[index], pool[swapIndex]] = [pool[swapIndex]!, pool[index]!];
  }
  return pool.slice(0, 5);
}
