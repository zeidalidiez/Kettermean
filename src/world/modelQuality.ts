import * as THREE from 'three';
import { ROOM } from '../config';

/**
 * Graphics quality drives model geometry density, decorative detail passes, and
 * per-room render budgets. Models are always built at the active quality; a
 * session changing the slider rebuilds the model cache so rooms reflect it.
 *
 * The presets mirror common game graphics settings: low targets weak GPUs,
 * ultra targets fast desktops, and high is the default.
 */

export type ModelQuality = 'low' | 'medium' | 'high' | 'ultra';

export const QUALITY_LEVELS: readonly ModelQuality[] = ['low', 'medium', 'high', 'ultra'];

export interface ShapeDensity {
  /** SphereGeometry(radius, widthSegments, heightSegments). */
  sphere: [number, number];
  /** CylinderGeometry(..., radialSegments, heightSegments). */
  cylinder: [number, number];
  /** ConeGeometry(..., radialSegments, heightSegments). */
  cone: [number, number];
  /** TorusGeometry(..., radialSegments, tubularSegments). */
  torus: [number, number];
  /** CapsuleGeometry(..., capSegments, radialSegments). */
  capsule: [number, number];
  /** BoxGeometry(..., widthSegments, heightSegments, depthSegments). */
  box: [number, number, number];
}

const DENSITY: Record<ModelQuality, ShapeDensity> = {
  low: {
    sphere: [12, 8],
    cylinder: [12, 1],
    cone: [12, 1],
    torus: [8, 12],
    capsule: [6, 10],
    box: [1, 1, 1],
  },
  medium: {
    sphere: [18, 12],
    cylinder: [18, 2],
    cone: [18, 2],
    torus: [10, 20],
    capsule: [8, 12],
    box: [2, 2, 2],
  },
  high: {
    sphere: [28, 20],
    cylinder: [28, 3],
    cone: [28, 3],
    torus: [14, 32],
    capsule: [10, 18],
    box: [4, 4, 4],
  },
  ultra: {
    sphere: [36, 24],
    cylinder: [36, 4],
    cone: [36, 4],
    torus: [18, 48],
    capsule: [14, 26],
    box: [5, 5, 5],
  },
};

const GEOMETRY_CACHE = new Map<string, THREE.BufferGeometry>();

/**
 * Shared primitives keyed by the active quality. Geometry is only allocated once
 * per density, and the model cache rebuild clears it alongside the model cache.
 */
export function geometryForShape(
  shape: keyof ShapeDensity,
): THREE.BufferGeometry {
  const d = DENSITY[activeQuality][shape];
  const key = `${activeQuality}:${shape}`;
  const cached = GEOMETRY_CACHE.get(key);
  if (cached) return cached;
  let geometry: THREE.BufferGeometry;
  switch (shape) {
    case 'sphere':
      geometry = new THREE.SphereGeometry(0.5, d[0], d[1]);
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, d[0], d[1]);
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(0.5, 1, d[0], d[1]);
      break;
    case 'torus':
      geometry = new THREE.TorusGeometry(0.5, 0.14, d[0], d[1]);
      break;
    case 'capsule':
      geometry = new THREE.CapsuleGeometry(0.36, 0.28, d[0], d[1]);
      break;
    default:
      geometry = new THREE.BoxGeometry(1, 1, 1, d[0], d[1], d[2]);
  }
  geometry.userData.cacheOwned = true;
  GEOMETRY_CACHE.set(key, geometry);
  return geometry;
}

/** Drop quality-keyed shared geometry when the model cache is rebuilt. */
export function clearModelQualityGeometries(): void {
  for (const geometry of GEOMETRY_CACHE.values()) geometry.dispose();
  GEOMETRY_CACHE.clear();
}

/** How many of a room's render-cost budget the active quality allows. */
const BUDGET_SCALE: Record<ModelQuality, number> = {
  low: 0.55,
  medium: 0.75,
  high: 1.0,
  ultra: 1.35,
};

/** Low skips decorative finish passes to preserve geometry and material churn. */
function detailPassesEnabled(quality: ModelQuality): boolean {
  return quality !== 'low';
}

let activeQuality: ModelQuality = 'high';

export function setModelQuality(quality: ModelQuality): void {
  const next = QUALITY_LEVELS.includes(quality) ? quality : 'high';
  if (next !== activeQuality) {
    activeQuality = next;
    clearModelQualityGeometries();
  }
}

export function getModelQuality(): ModelQuality {
  return activeQuality;
}

export function getShapeDensity(): ShapeDensity {
  return DENSITY[activeQuality];
}

export function highDetailPassesEnabled(): boolean {
  return detailPassesEnabled(activeQuality);
}

/** Room budgets scaled by the active quality, rounded to whole units. */
export function roomBudget(): {
  propCountMax: number;
  propRenderCostMax: number;
  entityCountMax: number;
  entityRenderCostMax: number;
} {
  const scale = BUDGET_SCALE[activeQuality];
  return {
    propCountMax: Math.round(ROOM.propCountMax * scale),
    propRenderCostMax: Math.round(ROOM.propRenderCostMax * scale),
    entityCountMax: Math.round(ROOM.entityCountMax * scale),
    entityRenderCostMax: Math.round(ROOM.entityRenderCostMax * scale),
  };
}
