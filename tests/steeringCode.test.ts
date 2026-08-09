import { describe, expect, it } from 'vitest';
import type { GenerationContext } from '../src/types';
import {
  STEERING_FIELDS,
  browserSteeringPrompt,
  parseSteeringDirection,
} from '../src/world/steeringCode';

const context: GenerationContext = {
  seed: 'compact-steering-test',
  previousTitles: ['Quiet Lobby'],
  moodBias: 'static',
  allowGore: false,
  linkIndex: 3,
};

describe('compact browser-model steering', () => {
  it('finds a complete control token inside surrounding model chatter', () => {
    const result = parseSteeringDirection(
      'Certainly. The requested result is **KMR12345101**. Hope this helps!',
      context,
    );

    expect(result.modelDigitCount).toBe(8);
    expect(result.fallbackFields).toEqual([]);
    expect(result.code).toBe('KMR12345101');
    expect(result.direction.offline).toBe(false);
    expect(result.direction.visuals).toMatchObject({
      shader: 'noir',
      lighting: 'pulse',
      wireframe: false,
    });
  });

  it('salvages separated partial digits and fills only missing positions', () => {
    const result = parseSteeringDirection('KMR 1-2-3-4', context);

    expect(result.modelDigitCount).toBe(4);
    expect(result.fallbackFields).toEqual(STEERING_FIELDS.slice(4));
    expect(result.code).toMatch(/^KMR\d{8}$/);
    expect(result.direction.offline).toBe(false);
  });

  it('turns repeated junk into a deterministic fully procedural steering result', () => {
    const first = parseSteeringDirection('giants'.repeat(100), context);
    const second = parseSteeringDirection('different unusable output', context);

    expect(first.modelDigitCount).toBe(0);
    expect(first.fallbackFields).toEqual(STEERING_FIELDS);
    expect(first.code).toBe(second.code);
    expect(first.direction).toEqual(second.direction);
    expect(first.direction.offline).toBe(false);
  });

  it('uses a short questionnaire without exposing prose fields or the raw seed', () => {
    const prompt = browserSteeringPrompt(context);
    const full = `${prompt.system}\n${prompt.user}`;

    expect(full).toContain('KMR');
    expect(full).toContain('eight digits');
    expect(full).not.toContain(context.seed);
    expect(full).not.toMatch(/TITLE|BLURB/);
    expect(prompt.user.match(/^\d\s=/gm)).toHaveLength(5);
    expect(full).toContain('0-8 for solid');
    expect(full.length).toBeLessThan(1_200);
  });

  it('treats browser-model wireframe requests as rare suggestions', () => {
    let wireframeRooms = 0;
    const sampleSize = 1_000;

    for (let index = 0; index < sampleSize; index += 1) {
      const result = parseSteeringDirection('KMR00000009', {
        ...context,
        seed: `browser-wireframe-rate-${index}`,
      });
      if (result.direction.visuals?.wireframe) wireframeRooms += 1;
    }

    expect(wireframeRooms).toBeGreaterThan(0);
    expect(wireframeRooms / sampleSize).toBeLessThan(0.11);
  }, 15_000);

  it('locally replaces model-requested pulse and dim modes when opted out', () => {
    const noFlashing = parseSteeringDirection('KMR00005000', {
      ...context,
      noFlashingLights: true,
    });
    const noLowLight = parseSteeringDirection('KMR00001000', {
      ...context,
      noLowLight: true,
    });

    expect(noFlashing.direction.visuals).toMatchObject({
      lighting: 'emergency',
      flashingDisabled: true,
    });
    expect(noLowLight.direction.visuals).toMatchObject({
      lighting: 'fluorescent',
      highVisibility: true,
    });
    expect(noLowLight.direction.visuals?.exposure).toBeGreaterThanOrEqual(1.2);
  });

  it('describes only safe lighting choices to the tiny model when constrained', () => {
    const prompt = browserSteeringPrompt({
      ...context,
      noFlashingLights: true,
      noLowLight: true,
    });

    expect(prompt.user).not.toContain('1 dim');
    expect(prompt.user).not.toContain('5 pulse');
    expect(prompt.user).toContain('static emergency');
  });
});
