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
  /** BoxGeometry(widthSegments, heightSegments). Kept as a tuple for parity. */
  box: [number, number];
  /** LatheGeometry(profile, radialSegments). */
  lathe: [number];
}

const DENSITY: Record<ModelQuality, ShapeDensity> = {
  low: {
    sphere: [8, 6],
    cylinder: [8, 1],
    cone: [8, 1],
    torus: [6, 10],
    capsule: [3, 8],
    box: [1, 1],
    lathe: [8],
  },
  medium: {
    sphere: [12, 8],
    cylinder: [10, 1],
    cone: [10, 1],
    torus: [8, 14],
    capsule: [4, 10],
    box: [1, 1],
    lathe: [12],
  },
  high: {
    sphere: [16, 12],
    cylinder: [12, 1],
    cone: [12, 1],
    torus: [10, 18],
    capsule: [6, 12],
    box: [1, 1],
    lathe: [16],
  },
  ultra: {
    sphere: [24, 16],
    cylinder: [18, 1],
    cone: [18, 1],
    torus: [12, 24],
    capsule: [8, 16],
    box: [1, 1],
    lathe: [24],
  },
};

const GEOMETRY_CACHE = new Map<string, THREE.BufferGeometry>();

/** A turned-wood profile: swelling near the top, taper to a small foot. */
function latheTurnedProfile(): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.02, 0.0),
    new THREE.Vector2(0.1, 0.02),
    new THREE.Vector2(0.14, 0.08),
    new THREE.Vector2(0.12, 0.16),
    new THREE.Vector2(0.16, 0.3),
    new THREE.Vector2(0.14, 0.5),
    new THREE.Vector2(0.12, 0.68),
    new THREE.Vector2(0.13, 0.8),
    new THREE.Vector2(0.09, 0.9),
    new THREE.Vector2(0.06, 0.97),
    new THREE.Vector2(0.03, 1.0),
  ];
}

/** A tapered cone profile for contemporary legs. */
function latheTaperProfile(): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.04, 0.0),
    new THREE.Vector2(0.07, 0.04),
    new THREE.Vector2(0.09, 0.18),
    new THREE.Vector2(0.1, 0.4),
    new THREE.Vector2(0.1, 0.7),
    new THREE.Vector2(0.08, 0.9),
    new THREE.Vector2(0.05, 1.0),
  ];
}

/** A column profile with capital, shaft, and base. */
function latheColumnProfile(): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.16, 0.0),
    new THREE.Vector2(0.18, 0.03),
    new THREE.Vector2(0.12, 0.06),
    new THREE.Vector2(0.11, 0.9),
    new THREE.Vector2(0.15, 0.94),
    new THREE.Vector2(0.18, 0.97),
    new THREE.Vector2(0.17, 1.0),
  ];
}

/** A vase/bowl profile with a rounded belly and flared rim. */
function latheVaseProfile(): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.1, 0.0),
    new THREE.Vector2(0.12, 0.02),
    new THREE.Vector2(0.22, 0.12),
    new THREE.Vector2(0.3, 0.34),
    new THREE.Vector2(0.26, 0.55),
    new THREE.Vector2(0.17, 0.72),
    new THREE.Vector2(0.1, 0.82),
    new THREE.Vector2(0.06, 0.88),
    new THREE.Vector2(0.09, 0.93),
    new THREE.Vector2(0.16, 0.97),
    new THREE.Vector2(0.15, 1.0),
  ];
}

const LATHE_PROFILES = [
  latheTurnedProfile,
  latheTaperProfile,
  latheColumnProfile,
  latheVaseProfile,
];

export type LatheProfile = 'turned' | 'taper' | 'column' | 'vase';

const LATHE_PROFILE_INDEX: Record<LatheProfile, number> = {
  turned: 0,
  taper: 1,
  column: 2,
  vase: 3,
};

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
    case 'lathe':
      geometry = new THREE.LatheGeometry(LATHE_PROFILES[0]!(), d[0]);
      break;
    default:
      // Real furniture, cabinets, appliances, and architecture need planar
      // faces and readable corners. Rounding every box made unrelated objects
      // look inflated while multiplying triangles without adding information.
      geometry = new THREE.BoxGeometry(1, 1, 1, d[0], d[1], 1);
  }
  geometry.userData.cacheOwned = true;
  GEOMETRY_CACHE.set(key, geometry);
  return geometry;
}

/** A lathe-turned part selected by profile name, cached per quality. */
export function geometryForLathe(profile: LatheProfile): THREE.BufferGeometry {
  const d = DENSITY[activeQuality].lathe;
  const key = `${activeQuality}:lathe:${profile}`;
  const cached = GEOMETRY_CACHE.get(key);
  if (cached) return cached;
  const geometry = new THREE.LatheGeometry(LATHE_PROFILES[LATHE_PROFILE_INDEX[profile]]!(), d[0]);
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
