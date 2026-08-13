import { afterEach, describe, expect, it } from 'vitest';
import { ROOM } from '../src/config';
import {
  clearModelQualityGeometries,
  getModelQuality,
  geometryForShape,
  highDetailPassesEnabled,
  QUALITY_LEVELS,
  roomBudget,
  setModelQuality,
  type ModelQuality,
} from '../src/world/modelQuality';
import { buildModel } from '../src/world/models';

describe('graphics quality presets', () => {
  it('exposes low/medium/high/ultra and defaults to high', () => {
    expect(QUALITY_LEVELS).toEqual(['low', 'medium', 'high', 'ultra']);
    expect(getModelQuality()).toBe('high');
  });

  it('scales room budgets upward with quality', () => {
    const low = setAndMeasure('low');
    const ultra = setAndMeasure('ultra');
    expect(ultra.propRenderCostMax).toBeGreaterThan(low.propRenderCostMax);
    expect(ultra.entityRenderCostMax).toBeGreaterThan(low.entityRenderCostMax);
    expect(roomBudget().propCountMax).toBeLessThanOrEqual(ROOM.propCountMax * 1.35);
  });

  it('disables decorative detail passes only on low', () => {
    setModelQuality('low');
    expect(highDetailPassesEnabled()).toBe(false);
    setModelQuality('medium');
    expect(highDetailPassesEnabled()).toBe(true);
    setModelQuality('high');
    expect(highDetailPassesEnabled()).toBe(true);
  });

  it('rejects unknown quality values by falling back to high', () => {
    setModelQuality('bogus' as ModelQuality);
    expect(getModelQuality()).toBe('high');
  });
});

describe('quality-scaled model geometry', () => {
  afterEach(() => {
    clearModelQualityGeometries();
    setModelQuality('high');
  });

  it('returns a higher-resolution sphere at ultra than at low', () => {
    setModelQuality('low');
    const lowAttributes = geometryForShape('sphere').attributes;
    setModelQuality('ultra');
    const ultraAttributes = geometryForShape('sphere').attributes;
    expect(ultraAttributes.position.count).toBeGreaterThan(lowAttributes.position.count);
  });

  it('builds models at the active quality without throwing', () => {
    for (const quality of QUALITY_LEVELS) {
      setModelQuality(quality);
      const model = buildModel('chair', '#6a7a8a', '#c4b59a', 'chair_01');
      expect(model.children.length).toBeGreaterThan(0);
    }
  });
});

function setAndMeasure(quality: ModelQuality) {
  setModelQuality(quality);
  return roomBudget();
}
