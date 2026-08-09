import { describe, expect, it } from 'vitest';
import {
  BROWSER_MODEL_DEPTH_GROUPS,
  BROWSER_MODEL_OPTIONS,
  DEFAULT_BROWSER_MODEL,
} from '../src/config';

describe('browser model direction-depth choices', () => {
  it('offers one valid suggestion for each of three direction depths', () => {
    expect(BROWSER_MODEL_DEPTH_GROUPS).toHaveLength(3);
    expect(BROWSER_MODEL_DEPTH_GROUPS.map((group) => group.suggestedModel)).toEqual([
      DEFAULT_BROWSER_MODEL,
      'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
      'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    ]);
    for (const group of BROWSER_MODEL_DEPTH_GROUPS) {
      expect(group.models).toContain(group.suggestedModel);
    }
  });

  it('keeps the flat compatibility list complete and duplicate-free', () => {
    const grouped = BROWSER_MODEL_DEPTH_GROUPS.flatMap((group) => [...group.models]);
    expect(BROWSER_MODEL_OPTIONS).toEqual(grouped);
    expect(new Set(BROWSER_MODEL_OPTIONS).size).toBe(BROWSER_MODEL_OPTIONS.length);
  });
});
