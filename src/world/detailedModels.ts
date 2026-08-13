import * as THREE from 'three';
import { hashString } from '../core/rng';
import { geometryForShape } from './modelQuality';
import {
  DETAILED_BOUNDS,
  DETAILED_CREATURE_KINDS,
  DETAILED_HUMANOID_KINDS,
  DETAILED_PROP_FAMILIES,
  detailedFamilyForKind,
  isDetailedModelKind,
  type DetailedCreatureKind,
  type DetailedHumanoidKind,
  type DetailedModelKind,
  type DetailedPropKind,
} from './detailedAssets';

type Shape = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'capsule';

interface PartOptions {
  shape?: Shape;
  rotation?: [number, number, number];
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  name?: string;
}

interface Palette {
  primary: string;
  secondary: string;
  trim: string;
  dark: string;
  light: string;
  glow: string;
  glass: string;
}

export { DETAILED_BOUNDS };

export function buildDetailedModel(
  kind: string,
  variant: number,
  accent: string,
  body: string,
): THREE.Group | null {
  if (!isDetailedModelKind(kind)) return null;
  const model = DETAILED_HUMANOID_KINDS.includes(kind as DetailedHumanoidKind)
    ? buildDetailedHumanoid(kind as DetailedHumanoidKind, variant, accent, body)
    : DETAILED_CREATURE_KINDS.includes(kind as DetailedCreatureKind)
      ? buildDetailedCreature(kind as DetailedCreatureKind, variant, accent, body)
      : buildDetailedProp(kind as DetailedPropKind, variant, accent, body);
  model.name = `${kind}-${variant}`;
  model.userData.detailTier = 'high';
  model.userData.detailVariant = variant;
  model.userData.modelFamily = detailedFamilyForKind(kind).id;
  return model;
}

function buildDetailedProp(
  kind: DetailedPropKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const family = detailedFamilyForKind(kind);
  const familyIndex = DETAILED_PROP_FAMILIES.findIndex((candidate) => candidate.kind === kind);
  const bounds = DETAILED_BOUNDS[kind];
  const palette = paletteFor(kind, variant, accent, body);
  const root = new THREE.Group();

  switch (family.form) {
    case 'upholstered': buildUpholstered(root, bounds, palette, variant, familyIndex); break;
    case 'bed': buildCanopyBed(root, bounds, palette, variant); break;
    case 'desk': buildDesk(root, bounds, palette, variant, familyIndex); break;
    case 'cabinet': buildCabinet(root, bounds, palette, variant, familyIndex); break;
    case 'counter': buildCounter(root, bounds, palette, variant, familyIndex); break;
    case 'organ': buildOrgan(root, bounds, palette, variant); break;
    case 'console': buildConsole(root, bounds, palette, variant, familyIndex); break;
    case 'display': buildDisplay(root, bounds, palette, variant, familyIndex); break;
    case 'medical': buildMedical(root, bounds, palette, variant, familyIndex); break;
    case 'instrument': buildInstrument(root, bounds, palette, variant, familyIndex); break;
    case 'tripod': buildTripod(root, bounds, palette, variant); break;
    case 'rack': buildRack(root, bounds, palette, variant, familyIndex); break;
    case 'station': buildWeatherStation(root, bounds, palette, variant); break;
    case 'habitat': buildHabitat(root, bounds, palette, variant, familyIndex); break;
    case 'stack': buildTrunkStack(root, bounds, palette, variant); break;
    case 'clock': buildMechanicalClock(root, bounds, palette, variant); break;
    default: buildCabinet(root, bounds, palette, variant, familyIndex);
  }

  addCraftDetails(root, bounds, palette, variant, familyIndex);
  return root;
}

function buildUpholstered(
  root: THREE.Group,
  b: { w: number; h: number; d: number },
  p: Palette,
  variant: number,
  family: number,
): void {
  const add = partAdder(root);
  const chaise = family % 2 === 1;
  const seatY = b.h * 0.34;
  add([b.w * 0.86, b.h * 0.18, b.d * 0.76], [0, seatY, b.d * 0.04], p.primary, { shape: 'capsule', name: 'upholstery-seat' });
  add([b.w * 0.84, b.h * (chaise ? 0.48 : 0.58), b.d * 0.17], [0, b.h * 0.66, -b.d * 0.34], p.primary, { shape: 'capsule', rotation: [chaise ? -0.16 : -0.06, 0, 0], name: 'upholstery-back' });
  add([b.w * 0.9, b.h * 0.07, b.d * 0.78], [0, b.h * 0.23, 0], p.trim, { name: 'carved-seat-rail' });
  for (const side of [-1, 1]) {
    const armHeight = chaise && side > 0 ? b.h * 0.42 : b.h * 0.56;
    add([b.w * 0.09, b.h * 0.16, b.d * 0.72], [side * b.w * 0.455, armHeight, 0], p.secondary, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'rolled-arm' });
    add([b.w * 0.075, b.h * 0.28, b.d * 0.075], [side * b.w * 0.39, b.h * 0.14, -b.d * 0.29], p.trim, { shape: 'cylinder', name: 'turned-leg' });
    add([b.w * 0.075, b.h * 0.28, b.d * 0.075], [side * b.w * 0.39, b.h * 0.14, b.d * 0.29], p.trim, { shape: 'cylinder', name: 'turned-leg' });
  }
  const columns = 4 + (variant % 3);
  for (let row = 0; row < 2; row += 1) for (let column = 0; column < columns; column += 1) {
    const x = (column / Math.max(1, columns - 1) - 0.5) * b.w * 0.65;
    add([0.055, 0.055, 0.035], [x, b.h * (0.61 + row * 0.18), -b.d * 0.245], p.trim, { shape: 'sphere', metalness: 0.42, name: 'tuft-button' });
  }
  add([b.w * 0.78, b.h * 0.025, b.d * 0.69], [0, seatY + b.h * 0.105, b.d * 0.05], p.light, { name: 'seat-piping' });
}

function buildCanopyBed(
  root: THREE.Group,
  b: { w: number; h: number; d: number },
  p: Palette,
  variant: number,
): void {
  const add = partAdder(root);
  add([b.w * 0.88, b.h * 0.09, b.d * 0.86], [0, b.h * 0.22, 0], p.trim, { name: 'bed-frame' });
  add([b.w * 0.82, b.h * 0.16, b.d * 0.8], [0, b.h * 0.33, b.d * 0.02], p.light, { shape: 'capsule', name: 'mattress' });
  add([b.w * 0.79, b.h * 0.035, b.d * 0.48], [0, b.h * 0.43, b.d * 0.11], p.primary, { name: 'folded-coverlet' });
  for (const side of [-1, 1]) {
    add([b.w * 0.32, b.h * 0.1, b.d * 0.26], [side * b.w * 0.2, b.h * 0.47, -b.d * 0.28], p.secondary, { shape: 'capsule', rotation: [0.08, 0, side * 0.03], name: 'pillow' });
    for (const zSide of [-1, 1]) {
      add([b.w * 0.055, b.h * 0.82, b.w * 0.055], [side * b.w * 0.46, b.h * 0.5, zSide * b.d * 0.44], p.trim, { shape: 'cylinder', name: 'canopy-post' });
      add([b.w * 0.105, b.w * 0.105, b.w * 0.105], [side * b.w * 0.46, b.h * 0.93, zSide * b.d * 0.44], p.glow, { shape: variant % 2 ? 'sphere' : 'cone', metalness: 0.48, name: 'canopy-finial' });
    }
  }
  for (const zSide of [-1, 1]) {
    add([b.w * 0.96, b.h * 0.035, b.w * 0.045], [0, b.h * 0.9, zSide * b.d * 0.44], p.trim, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'canopy-rail' });
  }
  for (const xSide of [-1, 1]) {
    add([b.w * 0.045, b.h * 0.035, b.d * 0.92], [xSide * b.w * 0.46, b.h * 0.9, 0], p.trim, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'canopy-rail' });
  }
  add([b.w * 0.9, b.h * 0.4, b.w * 0.05], [0, b.h * 0.62, -b.d * 0.44], p.secondary, { name: 'carved-headboard' });
  for (let spindle = -3; spindle <= 3; spindle += 1) {
    add([b.w * 0.025, b.h * 0.25, b.w * 0.025], [spindle * b.w * 0.105, b.h * 0.65, -b.d * 0.465], p.trim, { shape: 'cylinder', name: 'headboard-spindle' });
  }
}

function buildDesk(
  root: THREE.Group,
  b: { w: number; h: number; d: number },
  p: Palette,
  variant: number,
  family: number,
): void {
  const add = partAdder(root);
  const topY = b.h * 0.55;
  add([b.w * 0.94, b.h * 0.075, b.d * 0.9], [0, topY, 0], p.trim, { roughness: 0.48, name: 'finished-worktop' });
  for (const side of [-1, 1]) {
    add([b.w * 0.26, topY * 0.92, b.d * 0.76], [side * b.w * 0.33, topY * 0.47, -b.d * 0.02], p.primary, { name: 'desk-pedestal' });
    for (let drawer = 0; drawer < 3; drawer += 1) {
      const y = topY * (0.18 + drawer * 0.25);
      add([b.w * 0.22, topY * 0.17, b.d * 0.035], [side * b.w * 0.33, y, b.d * 0.385], p.secondary, { name: 'dovetail-drawer' });
      add([b.w * 0.06, b.h * 0.025, b.d * 0.025], [side * b.w * 0.33, y, b.d * 0.415], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.7, name: 'drawer-pull' });
    }
  }
  if (family === 3) {
    add([b.w * 0.88, b.h * 0.42, b.d * 0.26], [0, b.h * 0.77, -b.d * 0.31], p.primary, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'rolltop-tambour' });
    for (let slat = -5; slat <= 5; slat += 1) add([b.w * 0.018, b.h * 0.35, b.d * 0.02], [slat * b.w * 0.075, b.h * 0.76, -b.d * 0.17], p.trim, { name: 'tambour-slat' });
  } else if (family === 4) {
    add([b.w * 0.82, b.h * 0.08, b.d * 0.72], [0, b.h * 0.78, 0], p.secondary, { rotation: [-0.35 + variant * 0.02, 0, 0], name: 'tilted-drawing-board' });
    add([b.w * 0.72, b.h * 0.025, b.d * 0.025], [0, b.h * 0.8, b.d * 0.32], p.glow, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'parallel-rule' });
  } else if (family === 9) {
    add([b.w * 0.54, b.h * 0.2, b.d * 0.48], [0.05, b.h * 0.7, 0], p.dark, { name: 'sewing-machine-body' });
    add([b.w * 0.3, b.h * 0.35, b.d * 0.16], [-b.w * 0.12, b.h * 0.83, 0], p.primary, { shape: 'capsule', rotation: [0, 0, Math.PI / 2], name: 'sewing-machine-arm' });
    add([b.h * 0.26, b.h * 0.26, b.d * 0.08], [b.w * 0.28, b.h * 0.72, 0], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.62, name: 'hand-wheel' });
    add([b.w * 0.42, b.h * 0.025, b.d * 0.4], [0, b.h * 0.12, 0], p.dark, { name: 'treadle' });
  } else {
    add([b.w * 0.48, b.h * 0.18, b.d * 0.48], [0, b.h * 0.68, b.d * 0.02], p.dark, { name: 'typewriter-body' });
    for (let key = -4; key <= 4; key += 1) add([b.w * 0.035, b.w * 0.035, b.w * 0.02], [key * b.w * 0.052, b.h * (0.76 + Math.abs(key) * 0.004), b.d * 0.27], p.light, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'typewriter-key' });
  }
}

function buildCabinet(
  root: THREE.Group,
  b: { w: number; h: number; d: number },
  p: Palette,
  variant: number,
  family: number,
): void {
  const add = partAdder(root);
  add([b.w * 0.92, b.h * 0.88, b.d * 0.88], [0, b.h * 0.48, 0], p.primary, { name: 'cabinet-carcass' });
  add([b.w, b.h * 0.06, b.d], [0, b.h * 0.94, 0], p.trim, { name: 'cabinet-crown' });
  add([b.w * 0.98, b.h * 0.055, b.d * 0.96], [0, b.h * 0.055, 0], p.trim, { name: 'cabinet-plinth' });
  const drawerHeavy = family === 6 || family === 7;
  const rows = drawerHeavy ? 6 : 4;
  const columns = drawerHeavy ? (family === 6 ? 4 : 2) : 2;
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const panelW = b.w * 0.78 / columns;
    const panelH = b.h * 0.72 / rows;
    const x = (column - (columns - 1) * 0.5) * panelW;
    const y = b.h * 0.16 + row * panelH + panelH * 0.5;
    const glassDoor = !drawerHeavy && row > 1;
    add([panelW * 0.88, panelH * 0.82, b.d * 0.025], [x, y, b.d * 0.455], glassDoor ? p.glass : p.secondary, { opacity: glassDoor ? 0.32 : 1, metalness: glassDoor ? 0.22 : 0.08, name: glassDoor ? 'glass-cabinet-panel' : 'cabinet-drawer' });
    add([Math.min(0.12, panelW * 0.22), Math.min(0.06, panelH * 0.2), b.d * 0.03], [x, y, b.d * 0.49], p.glow, { shape: variant % 2 ? 'torus' : 'cylinder', rotation: [Math.PI / 2, 0, 0], metalness: 0.7, name: 'cabinet-hardware' });
  }
  for (const side of [-1, 1]) {
    add([b.w * 0.045, b.h * 0.86, b.d * 0.045], [side * b.w * 0.46, b.h * 0.48, b.d * 0.44], p.trim, { shape: 'cylinder', name: 'cabinet-column' });
    add([b.w * 0.08, b.h * 0.1, b.d * 0.12], [side * b.w * 0.38, b.h * 0.05, b.d * 0.28], p.trim, { shape: 'sphere', name: 'cabinet-foot' });
  }
}

function buildCounter(
  root: THREE.Group,
  b: { w: number; h: number; d: number },
  p: Palette,
  variant: number,
  family: number,
): void {
  const add = partAdder(root);
  add([b.w * 0.96, b.h * 0.08, b.d * 0.92], [0, b.h * 0.78, 0], p.light, { roughness: 0.32, metalness: family % 2 ? 0.46 : 0.08, name: 'countertop' });
  add([b.w * 0.92, b.h * 0.65, b.d * 0.68], [0, b.h * 0.39, -b.d * 0.08], p.primary, { name: 'counter-body' });
  for (let panel = -2; panel <= 2; panel += 1) {
    add([b.w * 0.15, b.h * 0.46, b.d * 0.035], [panel * b.w * 0.18, b.h * 0.4, b.d * 0.28], panel % 2 ? p.secondary : p.trim, { name: 'counter-front-panel' });
    add([b.w * 0.13, b.h * 0.035, b.d * 0.04], [panel * b.w * 0.18, b.h * 0.41, b.d * 0.32], p.glow, { metalness: 0.62, name: 'counter-inlay' });
  }
  for (const x of [-b.w * 0.34, 0, b.w * 0.34]) {
    add([b.h * 0.18, b.h * 0.18, b.h * 0.18], [x, b.h * 0.98, -b.d * 0.22], p.glow, { shape: 'sphere', emissive: p.glow, emissiveIntensity: 0.18, name: 'bar-globe' });
    add([b.h * 0.035, b.h * 0.22, b.h * 0.035], [x, b.h * 0.87, -b.d * 0.22], p.trim, { shape: 'cylinder', name: 'bar-globe-stem' });
  }
  for (let rail = 0; rail < 2 + (variant % 2); rail += 1) add([b.w * 0.86, b.h * 0.025, b.h * 0.025], [0, b.h * (0.13 + rail * 0.12), b.d * 0.39], p.trim, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], metalness: 0.58, name: 'counter-rail' });
}

function buildOrgan(root: THREE.Group, b: { w: number; h: number; d: number }, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.92, b.h * 0.64, b.d * 0.7], [0, b.h * 0.34, -b.d * 0.08], p.primary, { name: 'organ-case' });
  add([b.w * 0.76, b.h * 0.09, b.d * 0.42], [0, b.h * 0.43, b.d * 0.34], p.light, { name: 'organ-keyboard' });
  for (let key = -7; key <= 7; key += 1) add([b.w * 0.035, b.h * 0.025, b.d * 0.23], [key * b.w * 0.045, b.h * 0.49, b.d * 0.36], key % 2 ? p.dark : '#ece6d8', { name: 'organ-key' });
  for (let pipe = -6; pipe <= 6; pipe += 1) {
    const pipeHeight = b.h * (0.34 + (1 - Math.abs(pipe) / 8) * 0.34 + (variant % 3) * 0.015);
    add([b.w * 0.055, pipeHeight, b.w * 0.055], [pipe * b.w * 0.066, b.h * 0.61 + pipeHeight * 0.5, -b.d * 0.2], pipe % 2 ? p.trim : p.glow, { shape: 'cylinder', metalness: 0.72, name: 'organ-pipe' });
    add([b.w * 0.07, b.w * 0.07, b.w * 0.07], [pipe * b.w * 0.066, b.h * 0.61 + pipeHeight, -b.d * 0.2], p.glow, { shape: 'sphere', metalness: 0.66, name: 'pipe-cap' });
  }
  for (let pedal = -4; pedal <= 4; pedal += 1) add([b.w * 0.055, b.h * 0.035, b.d * 0.4], [pedal * b.w * 0.075, b.h * 0.07, b.d * 0.12], pedal % 2 ? p.dark : p.trim, { rotation: [-0.14, 0, 0], name: 'organ-pedal' });
}

function buildConsole(
  root: THREE.Group,
  b: { w: number; h: number; d: number },
  p: Palette,
  variant: number,
  family: number,
): void {
  const add = partAdder(root);
  add([b.w * 0.94, b.h * 0.72, b.d * 0.78], [0, b.h * 0.38, -b.d * 0.06], p.primary, { name: 'console-carcass' });
  add([b.w * 0.88, b.h * 0.36, b.d * 0.12], [0, b.h * 0.72, b.d * 0.32], p.dark, { rotation: [-0.34, 0, 0], name: 'angled-control-panel' });
  const rows = 3;
  const columns = 7 + (family % 3);
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const x = (column - (columns - 1) * 0.5) * b.w * 0.1;
    const y = b.h * (0.64 + row * 0.1);
    const dial = (row + column + variant) % 3 === 0;
    add([b.w * (dial ? 0.045 : 0.03), b.w * (dial ? 0.045 : 0.03), b.d * 0.025], [x, y, b.d * (0.38 + row * 0.018)], dial ? p.light : shifted(p.glow, column + row + variant), { shape: dial ? 'torus' : 'sphere', rotation: [Math.PI / 2, 0, 0], emissive: dial ? undefined : p.glow, emissiveIntensity: dial ? 0 : 0.32, metalness: dial ? 0.46 : 0.12, name: dial ? 'analog-dial' : 'indicator-lamp' });
  }
  for (let cable = 0; cable < 4; cable += 1) add([b.w * 0.02, b.h * (0.22 + cable * 0.025), b.w * 0.02], [-b.w * 0.34 + cable * b.w * 0.22, b.h * 0.35, b.d * 0.42], shifted(p.secondary, cable + variant), { shape: 'torus', rotation: [0, Math.PI / 2, 0], name: 'patch-cable' });
}

function buildDisplay(
  root: THREE.Group,
  b: { w: number; h: number; d: number },
  p: Palette,
  variant: number,
  family: number,
): void {
  const add = partAdder(root);
  add([b.w * 0.98, b.h * 0.12, b.d * 0.96], [0, b.h * 0.08, 0], p.trim, { name: 'display-plinth' });
  add([b.w * 0.9, b.h * 0.78, b.d * 0.86], [0, b.h * 0.5, 0], p.glass, { opacity: 0.22, roughness: 0.18, metalness: 0.12, name: 'display-glass' });
  for (const x of [-1, 1]) for (const z of [-1, 1]) add([b.w * 0.025, b.h * 0.82, b.w * 0.025], [x * b.w * 0.44, b.h * 0.5, z * b.d * 0.42], p.trim, { shape: 'cylinder', metalness: 0.58, name: 'display-mullion' });
  for (let shelf = 0; shelf < 3; shelf += 1) {
    const y = b.h * (0.25 + shelf * 0.25);
    add([b.w * 0.82, b.h * 0.025, b.d * 0.75], [0, y, 0], p.light, { opacity: 0.72, roughness: 0.24, name: 'glass-shelf' });
    for (let object = -2; object <= 2; object += 1) {
      const shape: Shape = ['sphere', 'cylinder', 'cone', 'capsule'][(object + shelf + family + 8) % 4] as Shape;
      add([b.w * 0.075, b.h * (0.07 + ((object + variant + 8) % 3) * 0.02), b.d * 0.1], [object * b.w * 0.15, y + b.h * 0.07, (shelf % 2 - 0.5) * b.d * 0.18], shifted(p.secondary, object + shelf + variant), { shape, emissive: family % 5 === 0 ? p.glow : undefined, emissiveIntensity: 0.14, name: 'curated-display-object' });
    }
  }
}

function buildMedical(
  root: THREE.Group,
  b: { w: number; h: number; d: number },
  p: Palette,
  variant: number,
  family: number,
): void {
  const add = partAdder(root);
  add([b.w * 0.46, b.h * 0.08, b.d * 0.46], [0, b.h * 0.05, 0], p.dark, { shape: 'cylinder', metalness: 0.54, name: 'medical-base' });
  add([b.w * 0.12, b.h * 0.7, b.w * 0.12], [0, b.h * 0.39, -b.d * 0.12], p.trim, { shape: 'cylinder', metalness: 0.64, name: 'medical-column' });
  for (const side of [-1, 1]) {
    add([b.w * 0.09, b.h * 0.46, b.w * 0.09], [side * b.w * 0.22, b.h * 0.7, 0], p.trim, { shape: 'capsule', rotation: [0, 0, side * (0.48 + variant * 0.018)], metalness: 0.6, name: 'articulated-arm' });
    add([b.w * 0.28, b.w * 0.28, b.w * 0.12], [side * b.w * 0.4, b.h * 0.88, b.d * 0.12], p.light, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'medical-head' });
    for (let lens = 0; lens < 3; lens += 1) {
      const angle = (lens / 3) * Math.PI * 2;
      add([b.w * 0.07, b.w * 0.07, b.w * 0.035], [side * b.w * 0.4 + Math.cos(angle) * b.w * 0.08, b.h * 0.88 + Math.sin(angle) * b.w * 0.08, b.d * 0.19], p.glow, { shape: 'sphere', emissive: p.glow, emissiveIntensity: 0.5, name: 'medical-lens' });
    }
  }
  add([b.w * 0.58, b.h * 0.25, b.d * 0.42], [0, b.h * 0.34, b.d * 0.2], p.primary, { name: 'instrument-console' });
  for (let drawer = 0; drawer < 4; drawer += 1) {
    add([b.w * 0.45, b.h * 0.04, b.d * 0.03], [0, b.h * (0.23 + drawer * 0.07), b.d * 0.43], p.secondary, { name: 'instrument-drawer' });
    add([b.w * 0.1, b.h * 0.018, b.d * 0.018], [0, b.h * (0.23 + drawer * 0.07), b.d * 0.46], p.glow, { metalness: 0.7, name: 'sterile-handle' });
  }
  if (family % 2) add([b.w * 0.52, b.h * 0.18, b.d * 0.05], [0, b.h * 0.57, b.d * 0.31], p.dark, { emissive: p.glow, emissiveIntensity: 0.18, name: 'diagnostic-screen' });
}

function buildInstrument(
  root: THREE.Group,
  b: { w: number; h: number; d: number },
  p: Palette,
  variant: number,
  family: number,
): void {
  const add = partAdder(root);
  add([b.w * 0.78, b.h * 0.08, b.d * 0.72], [0, b.h * 0.42, 0], p.trim, { name: 'instrument-shelf' });
  for (const side of [-1, 1]) for (const z of [-1, 1]) add([b.w * 0.055, b.h * 0.42, b.w * 0.055], [side * b.w * 0.33, b.h * 0.21, z * b.d * 0.26], p.dark, { shape: 'cylinder', name: 'instrument-leg' });
  const projector = family === 26;
  if (projector) {
    for (const side of [-1, 1]) {
      add([b.w * 0.34, b.w * 0.34, b.d * 0.12], [side * b.w * 0.23, b.h * 0.76, 0], p.trim, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.72, name: 'film-reel' });
      for (let spoke = 0; spoke < 5; spoke += 1) add([b.w * 0.025, b.w * 0.27, b.w * 0.025], [side * b.w * 0.23, b.h * 0.76, b.d * 0.075], p.dark, { rotation: [0, 0, (spoke / 5) * Math.PI], name: 'reel-spoke' });
    }
    add([b.w * 0.5, b.h * 0.35, b.d * 0.54], [0, b.h * 0.58, 0], p.primary, { name: 'projector-body' });
    add([b.w * 0.18, b.w * 0.18, b.d * 0.44], [0, b.h * 0.59, b.d * 0.38], p.dark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'projector-lens' });
  } else {
    add([b.w * 0.66, b.h * 0.38, b.d * 0.58], [0, b.h * 0.65, 0], p.primary, { name: 'instrument-case' });
    add([b.w * 0.5, b.h * 0.2, b.d * 0.035], [0, b.h * 0.68, b.d * 0.31], p.dark, { emissive: p.glow, emissiveIntensity: 0.2, name: 'instrument-display' });
    for (let dial = 0; dial < 6; dial += 1) {
      const x = (dial % 3 - 1) * b.w * 0.18;
      const y = b.h * (0.57 + Math.floor(dial / 3) * 0.18);
      add([b.w * 0.07, b.w * 0.07, b.d * 0.035], [x, y, b.d * 0.34], dial % 2 ? p.glow : p.light, { shape: dial % 2 ? 'sphere' : 'torus', rotation: [Math.PI / 2, 0, 0], emissive: dial % 2 ? p.glow : undefined, emissiveIntensity: 0.32, name: 'instrument-control' });
    }
    add([b.w * 0.12, b.h * 0.46, b.w * 0.12], [-b.w * 0.18, b.h * 1.02, 0], p.trim, { shape: 'cylinder', rotation: [0, 0, -0.28], name: 'instrument-arm' });
    add([b.w * 0.22, b.h * 0.28, b.w * 0.22], [-b.w * 0.29, b.h * 1.18, 0], p.dark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'optical-head' });
  }
  for (const x of [-1, 1]) for (const z of [-1, 1]) add([b.w * 0.09, b.w * 0.09, b.w * 0.06], [x * b.w * 0.33, b.h * 0.035, z * b.d * 0.26], p.dark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'caster' });
  if (variant % 2) add([b.w * 0.5, b.h * 0.025, b.d * 0.025], [0, b.h * 0.25, b.d * 0.38], p.glow, { shape: 'torus', rotation: [0, Math.PI / 2, 0], name: 'coiled-lead' });
}

function buildTripod(root: THREE.Group, b: { w: number; h: number; d: number }, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.18, b.h * 0.12, b.w * 0.18], [0, b.h * 0.62, 0], p.trim, { shape: 'sphere', metalness: 0.62, name: 'tripod-head' });
  for (let leg = 0; leg < 3; leg += 1) {
    const angle = (leg / 3) * Math.PI * 2;
    add([b.w * 0.055, b.h * 0.62, b.w * 0.055], [Math.cos(angle) * b.w * 0.22, b.h * 0.31, Math.sin(angle) * b.d * 0.22], p.dark, { shape: 'cylinder', rotation: [Math.sin(angle) * 0.34, 0, -Math.cos(angle) * 0.34], metalness: 0.48, name: 'tripod-leg' });
    add([b.w * 0.12, b.h * 0.035, b.d * 0.18], [Math.cos(angle) * b.w * 0.38, b.h * 0.03, Math.sin(angle) * b.d * 0.38], p.dark, { rotation: [0, -angle, 0], name: 'tripod-foot' });
  }
  add([b.w * 0.58, b.h * 0.34, b.d * 0.52], [0, b.h * 0.78, 0], p.primary, { name: 'camera-body' });
  for (let fold = -3; fold <= 3; fold += 1) add([b.w * (0.26 + (fold + 3) * 0.018), b.h * 0.22, b.d * 0.035], [0, b.h * 0.78, b.d * (0.28 + fold * 0.035)], fold % 2 ? p.secondary : p.dark, { name: 'camera-bellows' });
  add([b.w * 0.26, b.w * 0.26, b.d * 0.32], [0, b.h * 0.78, b.d * 0.48], p.trim, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], metalness: 0.58, name: 'camera-lens-barrel' });
  add([b.w * 0.18, b.w * 0.18, b.d * 0.035], [0, b.h * 0.78, b.d * 0.66], p.glass, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], emissive: variant === 7 ? p.glow : undefined, emissiveIntensity: 0.3, name: 'camera-lens' });
  add([b.w * 0.42, b.h * 0.06, b.d * 0.44], [0, b.h * 1.01, -b.d * 0.02], p.dark, { name: 'camera-focus-cloth' });
}

function buildRack(
  root: THREE.Group,
  b: { w: number; h: number; d: number },
  p: Palette,
  variant: number,
  family: number,
): void {
  const add = partAdder(root);
  for (const side of [-1, 1]) add([b.w * 0.06, b.h * 0.94, b.d * 0.08], [side * b.w * 0.43, b.h * 0.5, 0], p.trim, { shape: 'cylinder', name: 'rack-upright' });
  for (let shelf = 0; shelf < 6; shelf += 1) {
    const y = b.h * (0.08 + shelf * 0.16);
    add([b.w * 0.9, b.h * 0.035, b.d * 0.86], [0, y, 0], p.primary, { name: 'rack-shelf' });
    if (family === 28) {
      for (const x of [-1, 1]) add([b.w * 0.24, b.w * 0.24, b.d * 0.08], [x * b.w * 0.25, y + b.h * 0.07, b.d * 0.12], shifted(p.secondary, shelf + variant), { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.46, name: 'stored-reel' });
    } else {
      for (let rung = -2; rung <= 2; rung += 1) add([b.w * 0.04, b.h * 0.1, b.d * 0.05], [rung * b.w * 0.16, y + b.h * 0.06, 0], shifted(p.secondary, rung + shelf + variant), { rotation: [0, 0, (rung + variant) * 0.025], name: 'shelf-object' });
    }
  }
  add([b.w * 0.96, b.h * 0.055, b.d * 0.94], [0, b.h * 0.98, 0], p.glow, { metalness: 0.55, name: 'rack-header' });
}

function buildWeatherStation(root: THREE.Group, b: { w: number; h: number; d: number }, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.46, b.h * 0.08, b.d * 0.46], [0, b.h * 0.05, 0], p.dark, { shape: 'cylinder', name: 'station-base' });
  add([b.w * 0.1, b.h * 0.78, b.w * 0.1], [0, b.h * 0.44, 0], p.trim, { shape: 'cylinder', metalness: 0.66, name: 'weather-mast' });
  for (let gauge = 0; gauge < 3; gauge += 1) {
    const angle = (gauge / 3) * Math.PI * 2;
    add([b.w * 0.28, b.w * 0.28, b.w * 0.11], [Math.cos(angle) * b.w * 0.28, b.h * (0.45 + gauge * 0.1), Math.sin(angle) * b.d * 0.28], p.light, { shape: 'cylinder', rotation: [Math.PI / 2, 0, -angle], name: 'weather-gauge' });
    add([b.w * 0.035, b.w * 0.2, b.w * 0.025], [Math.cos(angle) * b.w * 0.28, b.h * (0.45 + gauge * 0.1), Math.sin(angle) * b.d * 0.34], p.dark, { rotation: [0, 0, angle + variant * 0.12], name: 'gauge-needle' });
  }
  add([b.w * 0.78, b.h * 0.04, b.w * 0.05], [0, b.h * 0.88, 0], p.trim, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'anemometer-arm' });
  for (const side of [-1, 1]) add([b.w * 0.2, b.h * 0.12, b.w * 0.14], [side * b.w * 0.42, b.h * 0.88, 0], p.secondary, { shape: 'sphere', name: 'anemometer-cup' });
  add([b.w * 0.06, b.h * 0.22, b.w * 0.06], [0, b.h * 0.96, 0], p.dark, { shape: 'cylinder', name: 'vane-pivot' });
  add([b.w * 0.72, b.h * 0.03, b.w * 0.04], [0, b.h * 1.03, 0], p.glow, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'weather-vane' });
  add([b.w * 0.22, b.h * 0.22, b.w * 0.05], [-b.w * 0.36, b.h * 1.03, 0], p.glow, { shape: 'cone', rotation: [0, 0, Math.PI / 2], name: 'vane-arrow' });
}

function buildHabitat(
  root: THREE.Group,
  b: { w: number; h: number; d: number },
  p: Palette,
  variant: number,
  family: number,
): void {
  const add = partAdder(root);
  add([b.w * 0.96, b.h * 0.1, b.d * 0.92], [0, b.h * 0.06, 0], p.trim, { name: 'habitat-plinth' });
  const cage = family === 32;
  const bars = cage ? 9 : 5;
  for (const side of [-1, 1]) for (let index = 0; index < bars; index += 1) {
    const z = (index / Math.max(1, bars - 1) - 0.5) * b.d * 0.8;
    add([b.w * 0.025, b.h * 0.78, b.w * 0.025], [side * b.w * 0.43, b.h * 0.48, z], cage ? p.glow : p.trim, { shape: 'cylinder', metalness: cage ? 0.62 : 0.28, name: cage ? 'aviary-bar' : 'habitat-mullion' });
  }
  for (const zSide of [-1, 1]) for (let index = 0; index < bars; index += 1) {
    const x = (index / Math.max(1, bars - 1) - 0.5) * b.w * 0.8;
    add([b.w * 0.025, b.h * 0.78, b.w * 0.025], [x, b.h * 0.48, zSide * b.d * 0.43], cage ? p.glow : p.trim, { shape: 'cylinder', metalness: cage ? 0.62 : 0.28, name: cage ? 'aviary-bar' : 'habitat-mullion' });
  }
  if (!cage) add([b.w * 0.84, b.h * 0.72, b.d * 0.82], [0, b.h * 0.48, 0], p.glass, { opacity: 0.18, roughness: 0.12, name: 'habitat-glass' });
  add([b.w * 0.82, b.h * 0.08, b.d * 0.78], [0, b.h * 0.15, 0], shifted('#5f4935', variant), { name: 'habitat-soil' });
  for (let plant = 0; plant < 7; plant += 1) {
    const angle = (plant / 7) * Math.PI * 2 + variant * 0.17;
    const radius = b.w * (0.12 + (plant % 3) * 0.07);
    add([b.w * 0.06, b.h * (0.16 + (plant % 3) * 0.045), b.w * 0.06], [Math.cos(angle) * radius, b.h * 0.25, Math.sin(angle) * Math.min(radius, b.d * 0.3)], shifted('#5f8b58', plant + variant), { shape: 'capsule', rotation: [0, 0, Math.cos(angle) * 0.4], name: 'habitat-plant' });
  }
  add([b.w * 0.78, b.h * 0.05, b.d * 0.76], [0, b.h * 0.91, 0], p.glow, { name: 'habitat-canopy' });
}

function buildTrunkStack(root: THREE.Group, b: { w: number; h: number; d: number }, p: Palette, variant: number): void {
  const add = partAdder(root);
  const trunks = 5;
  for (let index = 0; index < trunks; index += 1) {
    const width = b.w * (0.72 - index * 0.045);
    const height = b.h * 0.17;
    const depth = b.d * (0.78 - index * 0.04);
    const y = height * 0.5 + index * b.h * 0.18;
    const x = ((index + variant) % 3 - 1) * b.w * 0.08;
    const rotation = ((index * 2 + variant) % 5 - 2) * 0.055;
    add([width, height, depth], [x, y, 0], shifted(p.primary, index + variant), { rotation: [0, rotation, 0], name: 'travel-trunk' });
    for (const side of [-1, 1]) add([width * 0.07, height * 1.04, depth * 1.02], [x + side * width * 0.28, y, 0], p.trim, { rotation: [0, rotation, 0], name: 'trunk-strap' });
    add([width * 0.22, height * 0.12, depth * 0.04], [x, y, depth * 0.52], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.7, name: 'trunk-handle' });
    add([width * 0.08, height * 0.18, depth * 0.04], [x, y, depth * 0.53], p.dark, { name: 'trunk-lock' });
  }
}

function buildMechanicalClock(root: THREE.Group, b: { w: number; h: number; d: number }, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.88, b.h * 0.92, b.d * 0.82], [0, b.h * 0.49, 0], p.primary, { name: 'clock-cabinet' });
  add([b.w * 0.72, b.w * 0.72, b.d * 0.08], [0, b.h * 0.73, b.d * 0.44], p.light, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'clock-dial' });
  add([b.w * 0.78, b.w * 0.78, b.d * 0.05], [0, b.h * 0.73, b.d * 0.49], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.72, name: 'clock-bezel' });
  for (let marker = 0; marker < 12; marker += 1) {
    const angle = (marker / 12) * Math.PI * 2;
    add([b.w * 0.035, b.w * (marker % 3 === 0 ? 0.09 : 0.055), b.d * 0.025], [Math.sin(angle) * b.w * 0.28, b.h * 0.73 + Math.cos(angle) * b.w * 0.28, b.d * 0.51], p.dark, { rotation: [0, 0, -angle], name: 'hour-marker' });
  }
  add([b.w * 0.035, b.w * 0.26, b.d * 0.025], [0, b.h * 0.77, b.d * 0.53], p.dark, { rotation: [0, 0, variant * 0.28], name: 'minute-hand' });
  add([b.w * 0.035, b.w * 0.19, b.d * 0.03], [0, b.h * 0.75, b.d * 0.54], p.secondary, { rotation: [0, 0, variant * -0.47], name: 'hour-hand' });
  add([b.w * 0.1, b.h * 0.38, b.w * 0.1], [0, b.h * 0.31, b.d * 0.46], p.glow, { shape: 'cylinder', metalness: 0.7, name: 'pendulum-rod' });
  add([b.w * 0.28, b.w * 0.28, b.d * 0.06], [0, b.h * 0.14, b.d * 0.46], p.glow, { shape: 'sphere', metalness: 0.72, name: 'pendulum-bob' });
  for (const side of [-1, 1]) add([b.w * 0.22, b.w * 0.22, b.d * 0.055], [side * b.w * 0.22, b.h * 0.38, b.d * 0.46], p.trim, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.68, name: 'visible-gear' });
}

function addCraftDetails(
  root: THREE.Group,
  b: { w: number; h: number; d: number },
  p: Palette,
  variant: number,
  family: number,
): void {
  const add = partAdder(root);
  const detailCount = 5 + (variant % 4);
  for (let index = 0; index < detailCount; index += 1) {
    const phase = hashString(`${family}:${variant}:craft:${index}`) / 0xffff_ffff;
    const x = (phase - 0.5) * b.w * 0.7;
    const y = b.h * (0.12 + ((index * 0.173 + phase) % 1) * 0.72);
    const z = b.d * 0.505;
    const shape: Shape = ['sphere', 'cylinder', 'torus', 'box'][
      (family + variant + index) % 4
    ] as Shape;
    add([b.w * (0.025 + (index % 3) * 0.012), b.w * (0.025 + ((index + 1) % 3) * 0.012), b.d * 0.018], [x, y, z], index % 2 ? p.glow : p.secondary, { shape, rotation: shape === 'cylinder' || shape === 'torus' ? [Math.PI / 2, 0, 0] : [0, 0, phase * Math.PI], metalness: 0.56, emissive: variant === 5 && index % 3 === 0 ? p.glow : undefined, emissiveIntensity: 0.28, name: 'variant-craft-detail' });
  }
  if (variant >= 4) add([b.w * 0.34, b.h * 0.055, b.d * 0.035], [0, b.h * 0.965, b.d * 0.08], p.glow, { shape: variant % 2 ? 'torus' : 'capsule', rotation: [Math.PI / 2, 0, 0], metalness: 0.62, emissive: variant === 5 ? p.glow : undefined, emissiveIntensity: 0.24, name: 'variant-crown-detail' });
}

function buildDetailedHumanoid(
  kind: DetailedHumanoidKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const root = new THREE.Group();
  const b = DETAILED_BOUNDS[kind];
  const role = DETAILED_HUMANOID_KINDS.indexOf(kind);
  const p = paletteFor(kind, variant, accent, body);
  const add = partAdder(root);
  const torsoY = b.h * 0.61;
  const shoulderY = b.h * 0.69;

  add([b.w * 0.58, b.h * 0.3, b.d * 0.62], [0, torsoY, 0], p.primary, { shape: 'capsule', name: 'tailored-torso' });
  add([b.w * 0.48, b.h * 0.2, b.d * 0.5], [0, b.h * 0.48, 0], p.secondary, { shape: 'capsule', name: 'waistcoat' });
  add([b.w * 0.18, b.h * 0.23, b.d * 0.08], [-b.w * 0.13, b.h * 0.62, b.d * 0.31], p.trim, { rotation: [0, 0, -0.28], name: 'left-lapel' });
  add([b.w * 0.18, b.h * 0.23, b.d * 0.08], [b.w * 0.13, b.h * 0.62, b.d * 0.31], p.trim, { rotation: [0, 0, 0.28], name: 'right-lapel' });
  add([b.w * 0.18, b.h * 0.08, b.d * 0.08], [0, b.h * 0.75, b.d * 0.28], p.light, { name: 'collar' });
  for (let button = 0; button < 4; button += 1) add([b.w * 0.045, b.w * 0.045, b.d * 0.035], [0, b.h * (0.5 + button * 0.07), b.d * 0.34], p.glow, { shape: 'sphere', metalness: 0.58, name: 'coat-button' });

  for (const side of [-1, 1] as const) {
    const arm = new THREE.Group();
    arm.name = side < 0 ? 'rig-arm-left' : 'rig-arm-right';
    arm.position.set(side * b.w * 0.37, shoulderY, 0);
    arm.userData.baseRotation = { x: 0, y: 0, z: side * 0.045 };
    root.add(arm);
    const armAdd = partAdder(arm);
    armAdd([b.w * 0.17, b.h * 0.23, b.d * 0.24], [0, -b.h * 0.1, 0], p.primary, { shape: 'capsule', rotation: [0, 0, side * 0.04], name: 'upper-arm' });
    armAdd([b.w * 0.145, b.h * 0.21, b.d * 0.21], [0, -b.h * 0.29, b.d * 0.025], p.secondary, { shape: 'capsule', rotation: [0.06, 0, side * -0.03], name: 'forearm' });
    armAdd([b.w * 0.17, b.h * 0.07, b.d * 0.22], [0, -b.h * 0.4, b.d * 0.02], p.light, { name: 'cuff' });
    armAdd([b.w * 0.16, b.h * 0.1, b.d * 0.2], [0, -b.h * 0.46, b.d * 0.04], shifted('#c78f6e', variant + role), { shape: 'sphere', name: 'hand' });

    const leg = new THREE.Group();
    leg.name = side < 0 ? 'rig-leg-left' : 'rig-leg-right';
    leg.position.set(side * b.w * 0.17, b.h * 0.42, 0);
    leg.userData.baseRotation = { x: 0, y: 0, z: 0 };
    root.add(leg);
    const legAdd = partAdder(leg);
    legAdd([b.w * 0.2, b.h * 0.24, b.d * 0.26], [0, -b.h * 0.1, 0], p.dark, { shape: 'capsule', name: 'upper-leg' });
    legAdd([b.w * 0.17, b.h * 0.23, b.d * 0.22], [0, -b.h * 0.31, 0], shifted(p.dark, side + variant), { shape: 'capsule', name: 'lower-leg' });
    legAdd([b.w * 0.2, b.h * 0.055, b.d * 0.3], [0, -b.h * 0.45, b.d * 0.08], '#242226', { name: 'shoe' });
    legAdd([b.w * 0.16, b.h * 0.04, b.d * 0.22], [0, -b.h * 0.4, 0], p.light, { name: 'sock-or-gaiter' });
  }

  add([b.w * 0.18, b.h * 0.08, b.w * 0.18], [0, b.h * 0.77, 0], shifted('#b77d61', role + variant), { shape: 'cylinder', name: 'neck' });
  const head = new THREE.Group();
  head.name = 'rig-head';
  head.position.set(0, b.h * 0.855, 0);
  head.userData.baseRotation = { x: 0, y: 0, z: 0 };
  root.add(head);
  partAdder(head)([b.w * 0.46, b.h * 0.16, b.d * 0.48], [0, 0, 0], shifted('#c78f6e', role + variant), { shape: 'sphere', name: 'face-mount-head' });
  addHumanoidRoleDetails(root, b, p, variant, role);
  return root;
}

function addHumanoidRoleDetails(
  root: THREE.Group,
  b: { w: number; h: number; d: number },
  p: Palette,
  variant: number,
  role: number,
): void {
  const add = partAdder(root);
  const hatShapes: Shape[] = ['cylinder', 'sphere', 'cylinder', 'box', 'cone', 'capsule', 'cylinder', 'box', 'cylinder'];
  add([b.w * (0.48 + (role % 3) * 0.06), b.h * (0.05 + (role % 2) * 0.025), b.d * 0.56], [0, b.h * 0.965, 0], p.dark, { shape: hatShapes[role]!, metalness: role === 1 ? 0.24 : 0.06, name: 'role-headwear' });
  add([b.w * 0.22, b.h * 0.12, b.d * 0.06], [-b.w * 0.18, b.h * 0.63, b.d * 0.34], p.light, { name: 'profession-badge' });
  add([b.w * 0.07, b.h * 0.07, b.d * 0.035], [-b.w * 0.18, b.h * 0.63, b.d * 0.38], p.glow, { shape: 'sphere', emissive: role === 1 || role === 2 ? p.glow : undefined, emissiveIntensity: 0.3, name: 'badge-seal' });
  if (role === 0) {
    for (let bottle = 0; bottle < 4; bottle += 1) add([b.w * 0.07, b.h * 0.13, b.w * 0.07], [b.w * (0.34 + bottle * 0.07), b.h * (0.48 + bottle * 0.04), b.d * 0.18], shifted(p.glow, bottle + variant), { shape: 'cylinder', emissive: p.glow, emissiveIntensity: 0.16, name: 'apothecary-vial' });
  } else if (role === 1) {
    add([b.w * 0.38, b.w * 0.38, b.d * 0.1], [b.w * 0.43, b.h * 0.56, b.d * 0.08], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.62, name: 'astrolabe' });
    for (let spoke = 0; spoke < 4; spoke += 1) add([b.w * 0.025, b.w * 0.3, b.w * 0.025], [b.w * 0.43, b.h * 0.56, b.d * 0.14], p.dark, { rotation: [0, 0, spoke * Math.PI / 4], name: 'astrolabe-spoke' });
  } else if (role === 2) {
    add([b.w * 0.42, b.w * 0.42, b.d * 0.1], [b.w * 0.43, b.h * 0.55, b.d * 0.08], p.trim, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.6, name: 'projection-reel' });
  } else if (role === 3) {
    for (let plug = 0; plug < 5; plug += 1) add([b.w * 0.05, b.w * 0.05, b.d * 0.04], [b.w * 0.32, b.h * (0.45 + plug * 0.06), b.d * 0.32], shifted(p.glow, plug + variant), { shape: 'sphere', emissive: p.glow, emissiveIntensity: 0.24, name: 'switchboard-plug' });
  } else if (role === 4) {
    for (let leaf = 0; leaf < 5; leaf += 1) add([b.w * 0.12, b.h * 0.08, b.w * 0.04], [b.w * (0.3 + leaf * 0.035), b.h * (0.46 + leaf * 0.07), b.d * 0.22], shifted('#5d8d5b', leaf + variant), { shape: 'sphere', rotation: [0, 0, leaf * 0.5], name: 'botanical-sample' });
  } else if (role === 5) {
    add([b.w * 0.46, b.h * 0.04, b.d * 0.08], [0, b.h * 0.54, b.d * 0.37], '#d7ece8', { name: 'surgical-tie' });
    for (let tool = 0; tool < 3; tool += 1) add([b.w * 0.035, b.h * 0.18, b.w * 0.035], [b.w * (0.3 + tool * 0.08), b.h * 0.47, b.d * 0.2], p.glow, { shape: 'cylinder', metalness: 0.72, name: 'surgical-tool' });
  } else if (role === 6) {
    add([b.w * 0.56, b.h * 0.28, b.d * 0.08], [0, b.h * 0.43, -b.d * 0.28], p.primary, { name: 'detective-coat-tail' });
    add([b.w * 0.16, b.h * 0.16, b.d * 0.06], [b.w * 0.37, b.h * 0.49, b.d * 0.27], p.glass, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'magnifying-glass' });
  } else if (role === 7) {
    for (let fold = -3; fold <= 3; fold += 1) add([b.w * 0.07, b.h * 0.32, b.d * 0.04], [fold * b.w * 0.08, b.h * 0.37, b.d * 0.31], fold % 2 ? p.primary : p.secondary, { name: 'choir-robe-fold' });
  } else {
    for (let button = -2; button <= 2; button += 1) add([b.w * 0.045, b.w * 0.045, b.d * 0.035], [button * b.w * 0.1, b.h * 0.58, b.d * 0.37], p.glow, { shape: 'sphere', metalness: 0.64, name: 'porter-uniform-button' });
  }
  for (let stitch = 0; stitch < 5 + (variant % 3); stitch += 1) add([b.w * 0.018, b.h * 0.035, b.d * 0.02], [(-0.5 + stitch / 6) * b.w * 0.55, b.h * (0.44 + (stitch % 2) * 0.27), b.d * 0.34], p.trim, { rotation: [0, 0, (stitch + variant) * 0.08], name: 'variant-garment-stitch' });
}

function buildDetailedCreature(
  kind: DetailedCreatureKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const root = new THREE.Group();
  const b = DETAILED_BOUNDS[kind];
  const p = paletteFor(kind, variant, accent, body);
  switch (kind) {
    case 'detail_animal_fox': buildFox(root, b, p, variant); break;
    case 'detail_animal_owl': buildOwl(root, b, p, variant); break;
    case 'detail_animal_moth': buildMoth(root, b, p, variant); break;
    case 'detail_animal_goat': buildGoat(root, b, p, variant); break;
    case 'detail_animal_seal': buildSeal(root, b, p, variant); break;
    case 'detail_animal_frog': buildFrog(root, b, p, variant); break;
    case 'detail_animal_octopus': buildOctopus(root, b, p, variant); break;
    case 'detail_animal_snail': buildSnail(root, b, p, variant); break;
    case 'detail_animal_beetle': buildBeetle(root, b, p, variant); break;
    case 'detail_animal_crane': buildCrane(root, b, p, variant); break;
  }
  addCreatureMarkings(root, b, p, variant, DETAILED_CREATURE_KINDS.indexOf(kind));
  return root;
}

function buildFox(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.62, b.h * 0.55, b.d * 0.64], [0, b.h * 0.54, -b.d * 0.08], p.primary, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'fox-body' });
  add([b.w * 0.5, b.h * 0.44, b.d * 0.32], [0, b.h * 0.72, b.d * 0.35], p.primary, { shape: 'sphere', name: 'rig-head' });
  add([b.w * 0.32, b.h * 0.25, b.d * 0.3], [0, b.h * 0.65, b.d * 0.55], p.light, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'fox-muzzle' });
  for (const side of [-1, 1]) {
    add([b.w * 0.2, b.h * 0.35, b.w * 0.18], [side * b.w * 0.2, b.h * 0.98, b.d * 0.32], p.dark, { shape: 'cone', rotation: [0, 0, side * -0.12], name: 'fox-ear' });
    for (const z of [-1, 1]) {
      add([b.w * 0.13, b.h * 0.34, b.w * 0.13], [side * b.w * 0.24, b.h * 0.25, z * b.d * 0.22], p.dark, { shape: 'capsule', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
      add([b.w * 0.16, b.h * 0.08, b.d * 0.16], [side * b.w * 0.24, b.h * 0.05, z * b.d * 0.22 + b.d * 0.04], p.dark, { name: 'fox-paw' });
    }
  }
  for (let segment = 0; segment < 4; segment += 1) add([b.w * (0.38 - segment * 0.05), b.h * (0.24 - segment * 0.02), b.d * 0.28], [0, b.h * (0.56 + segment * 0.08), -b.d * (0.44 + segment * 0.16)], segment === 3 ? p.light : p.primary, { shape: 'capsule', rotation: [0.55 + segment * 0.12, 0, 0], name: 'fox-tail-segment' });
  if (variant % 2) add([b.w * 0.48, b.h * 0.12, b.d * 0.08], [0, b.h * 0.64, b.d * 0.22], p.secondary, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'fox-ruff' });
}

function buildOwl(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.72, b.h * 0.62, b.d * 0.72], [0, b.h * 0.42, 0], p.primary, { shape: 'sphere', name: 'owl-body' });
  add([b.w * 0.68, b.h * 0.45, b.d * 0.66], [0, b.h * 0.73, b.d * 0.06], p.secondary, { shape: 'sphere', name: 'rig-head' });
  for (const side of [-1, 1]) {
    add([b.w * 0.3, b.h * 0.52, b.d * 0.18], [side * b.w * 0.4, b.h * 0.45, -b.d * 0.04], p.dark, { shape: 'capsule', rotation: [0, 0, side * 0.35], name: 'rig-wing' });
    for (let feather = 0; feather < 5; feather += 1) add([b.w * 0.12, b.h * (0.2 + feather * 0.025), b.d * 0.08], [side * b.w * (0.28 + feather * 0.035), b.h * (0.49 - feather * 0.035), -b.d * 0.06], shifted(p.primary, feather + variant), { shape: 'capsule', rotation: [0, 0, side * (0.2 + feather * 0.06)], name: 'owl-flight-feather' });
    add([b.w * 0.08, b.h * 0.24, b.w * 0.08], [side * b.w * 0.16, b.h * 0.12, b.d * 0.04], p.glow, { shape: 'cylinder', name: 'owl-leg' });
    for (let toe = -1; toe <= 1; toe += 1) add([b.w * 0.035, b.h * 0.035, b.d * 0.2], [side * b.w * 0.16 + toe * b.w * 0.04, b.h * 0.025, b.d * 0.12], p.glow, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'owl-talon' });
  }
  add([b.w * 0.18, b.h * 0.22, b.d * 0.22], [0, b.h * 0.67, b.d * 0.42], p.glow, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'owl-beak' });
}

function buildMoth(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.16, b.h * 0.55, b.d * 0.38], [0, b.h * 0.45, 0], p.dark, { shape: 'capsule', name: 'moth-thorax' });
  add([b.w * 0.13, b.h * 0.38, b.d * 0.3], [0, b.h * 0.17, -b.d * 0.02], p.secondary, { shape: 'capsule', name: 'moth-abdomen' });
  add([b.w * 0.22, b.h * 0.22, b.d * 0.3], [0, b.h * 0.76, b.d * 0.06], p.primary, { shape: 'sphere', name: 'rig-head' });
  for (const side of [-1, 1]) {
    add([b.w * 0.44, b.h * 0.58, b.d * 0.07], [side * b.w * 0.25, b.h * 0.5, 0], shifted(p.primary, side + variant), { shape: 'sphere', rotation: [0, side * 0.08, side * 0.38], name: 'rig-wing' });
    add([b.w * 0.38, b.h * 0.38, b.d * 0.06], [side * b.w * 0.3, b.h * 0.2, 0], shifted(p.secondary, side + variant), { shape: 'sphere', rotation: [0, side * -0.05, side * -0.25], name: 'moth-hindwing' });
    for (let eyeSpot = 0; eyeSpot < 3; eyeSpot += 1) add([b.w * (0.055 + eyeSpot * 0.012), b.h * (0.08 + eyeSpot * 0.015), b.d * 0.025], [side * b.w * (0.22 + eyeSpot * 0.09), b.h * (0.47 + eyeSpot * 0.07), b.d * 0.07], eyeSpot % 2 ? p.glow : p.dark, { shape: 'sphere', emissive: eyeSpot === 2 && variant === 7 ? p.glow : undefined, emissiveIntensity: 0.28, name: 'wing-eyespot' });
    add([b.w * 0.025, b.h * 0.48, b.w * 0.025], [side * b.w * 0.1, b.h * 0.96, b.d * 0.02], p.glow, { shape: 'capsule', rotation: [0, 0, side * -0.48], name: 'moth-antenna' });
    for (let leg = 0; leg < 3; leg += 1) add([b.w * 0.025, b.h * 0.38, b.w * 0.025], [side * b.w * 0.1, b.h * (0.24 + leg * 0.15), 0], p.dark, { shape: 'capsule', rotation: [0.35, 0, side * (0.65 + leg * 0.12)], name: 'moth-leg' });
  }
}

function buildGoat(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.68, b.h * 0.42, b.d * 0.66], [0, b.h * 0.5, -b.d * 0.08], p.light, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'goat-body' });
  add([b.w * 0.52, b.h * 0.35, b.d * 0.36], [0, b.h * 0.77, b.d * 0.32], p.light, { shape: 'sphere', name: 'rig-head' });
  add([b.w * 0.36, b.h * 0.22, b.d * 0.28], [0, b.h * 0.7, b.d * 0.53], p.secondary, { shape: 'sphere', name: 'goat-muzzle' });
  for (const side of [-1, 1]) {
    for (let horn = 0; horn < 3; horn += 1) add([b.w * (0.11 - horn * 0.018), b.h * 0.22, b.w * (0.11 - horn * 0.018)], [side * b.w * (0.18 + horn * 0.06), b.h * (0.96 + horn * 0.11), b.d * (0.25 - horn * 0.05)], p.glow, { shape: 'cone', rotation: [-0.22 + variant * 0.01, 0, side * (0.26 + horn * 0.08 + variant * 0.006)], metalness: 0.24, name: 'goat-horn-segment' });
    for (const z of [-1, 1]) {
      add([b.w * 0.14, b.h * 0.45, b.w * 0.14], [side * b.w * 0.25, b.h * 0.24, z * b.d * 0.23], p.dark, { shape: 'capsule', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
      add([b.w * 0.18, b.h * 0.07, b.d * 0.16], [side * b.w * 0.25, b.h * 0.035, z * b.d * 0.23 + b.d * 0.035], p.dark, { name: 'cloven-hoof' });
    }
  }
  add([b.w * 0.2, b.h * 0.32, b.d * 0.1], [0, b.h * 0.56, b.d * 0.53], p.secondary, { shape: 'cone', rotation: [0.14, 0, 0], name: 'goat-beard' });
  add([b.w * 0.48, b.h * 0.1, b.d * 0.08], [0, b.h * 0.68, b.d * 0.24], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.55, name: 'ceremonial-collar' });
}

function buildSeal(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.82, b.h * 0.58, b.d * 0.76], [0, b.h * 0.42, -b.d * 0.1], p.primary, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'seal-body' });
  add([b.w * 0.68, b.h * 0.58, b.d * 0.42], [0, b.h * 0.56, b.d * 0.36], p.secondary, { shape: 'sphere', name: 'rig-head' });
  for (const side of [-1, 1]) {
    add([b.w * 0.34, b.h * 0.13, b.d * 0.42], [side * b.w * 0.42, b.h * 0.25, b.d * 0.02], p.dark, { shape: 'capsule', rotation: [0, side * 0.2, side * 0.55], name: 'seal-flipper' });
    for (let whisker = -2; whisker <= 2; whisker += 1) add([b.w * 0.34, b.h * 0.018, b.h * 0.018], [side * b.w * 0.25, b.h * (0.48 + whisker * 0.035), b.d * 0.59], p.light, { rotation: [0, 0, side * (0.08 + whisker * 0.07)], name: 'seal-whisker' });
  }
  for (const side of [-1, 1]) add([b.w * 0.35, b.h * 0.14, b.d * 0.4], [side * b.w * 0.18, b.h * 0.28, -b.d * 0.52], p.dark, { shape: 'capsule', rotation: [0, side * 0.42, side * 0.14], name: 'seal-tail-fluke' });
  add([b.w * 0.14, b.h * 0.1, b.d * 0.08], [0, b.h * 0.54, b.d * 0.62], p.dark, { shape: 'sphere', name: 'seal-nose' });
  if (variant % 2) add([b.w * 0.7, b.h * 0.08, b.d * 0.08], [0, b.h * 0.37, b.d * 0.32], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'seal-ribbon' });
}

function buildFrog(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.76, b.h * 0.58, b.d * 0.68], [0, b.h * 0.38, -b.d * 0.05], shifted('#72985e', variant), { shape: 'sphere', name: 'frog-body' });
  add([b.w * 0.7, b.h * 0.46, b.d * 0.55], [0, b.h * 0.58, b.d * 0.22], shifted('#7eaa68', variant), { shape: 'sphere', name: 'rig-head' });
  for (const side of [-1, 1]) {
    add([b.w * 0.28, b.h * 0.28, b.d * 0.22], [side * b.w * 0.26, b.h * 0.77, b.d * 0.25], p.light, { shape: 'sphere', name: 'frog-eye-bulb' });
    add([b.w * 0.18, b.h * 0.2, b.d * 0.08], [side * b.w * 0.26, b.h * 0.78, b.d * 0.39], p.dark, { shape: 'sphere', name: 'frog-eye' });
    for (const z of [-1, 1]) {
      add([b.w * 0.22, b.h * 0.18, b.d * 0.48], [side * b.w * 0.34, b.h * 0.2, z * b.d * 0.18], shifted('#668b54', side + z + variant), { shape: 'capsule', rotation: [Math.PI / 2, 0, side * 0.22], name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
      for (let toe = -1; toe <= 1; toe += 1) add([b.w * 0.05, b.h * 0.035, b.d * 0.28], [side * b.w * 0.4 + toe * b.w * 0.05, b.h * 0.045, z * b.d * 0.32], p.glow, { shape: 'capsule', rotation: [Math.PI / 2, 0, toe * 0.14], name: 'frog-toe' });
    }
  }
  add([b.w * 0.58, b.h * 0.04, b.d * 0.04], [0, b.h * 0.49, b.d * 0.5], p.dark, { shape: 'capsule', name: 'frog-mouth' });
}

function buildOctopus(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.58, b.h * 0.66, b.d * 0.58], [0, b.h * 0.7, 0], p.primary, { shape: 'sphere', name: 'octopus-mantle' });
  add([b.w * 0.62, b.h * 0.42, b.d * 0.62], [0, b.h * 0.5, b.d * 0.08], p.secondary, { shape: 'sphere', name: 'rig-head' });
  for (let tentacle = 0; tentacle < 8; tentacle += 1) {
    const angle = (tentacle / 8) * Math.PI * 2 + variant * 0.04;
    for (let segment = 0; segment < 3; segment += 1) {
      const radius = b.w * (0.25 + segment * 0.15);
      const x = Math.cos(angle + segment * 0.12) * radius;
      const z = Math.sin(angle + segment * 0.12) * Math.min(radius, b.d * 0.44);
      add([b.w * (0.15 - segment * 0.025), b.h * 0.22, b.w * (0.15 - segment * 0.025)], [x, b.h * (0.38 - segment * 0.11), z], shifted(p.primary, tentacle + segment + variant), { shape: 'capsule', rotation: [Math.sin(angle) * 0.45, 0, -Math.cos(angle) * 0.45], name: tentacle < 4 ? 'rig-leg-left' : 'rig-leg-right' });
    }
    add([b.w * 0.065, b.h * 0.035, b.w * 0.065], [Math.cos(angle) * b.w * 0.43, b.h * 0.16, Math.sin(angle) * b.d * 0.4], p.light, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'sucker' });
  }
  for (const side of [-1, 1]) add([b.w * 0.16, b.h * 0.16, b.d * 0.08], [side * b.w * 0.2, b.h * 0.54, b.d * 0.4], p.dark, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
}

function buildSnail(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.5, b.h * 0.28, b.d * 0.86], [0, b.h * 0.19, b.d * 0.05], p.secondary, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'snail-foot' });
  add([b.w * 0.9, b.h * 0.82, b.d * 0.68], [0, b.h * 0.57, -b.d * 0.18], p.primary, { shape: 'sphere', name: 'snail-shell' });
  for (let ring = 0; ring < 4; ring += 1) add([b.w * (0.32 - ring * 0.055), b.w * (0.32 - ring * 0.055), b.d * 0.05], [0, b.h * 0.57, b.d * (0.18 + ring * 0.025)], ring % 2 ? p.glow : p.trim, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.26, name: 'shell-spiral' });
  add([b.w * 0.46, b.h * 0.36, b.d * 0.34], [0, b.h * 0.32, b.d * 0.55], p.secondary, { shape: 'sphere', name: 'rig-head' });
  for (const side of [-1, 1]) {
    add([b.w * 0.055, b.h * 0.52, b.w * 0.055], [side * b.w * 0.16, b.h * 0.62, b.d * 0.58], p.secondary, { shape: 'capsule', rotation: [0, 0, side * -0.15], name: 'snail-eye-stalk' });
    add([b.w * 0.13, b.w * 0.13, b.w * 0.1], [side * b.w * 0.2, b.h * 0.89, b.d * 0.58], p.dark, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
    add([b.w * 0.035, b.h * 0.32, b.w * 0.035], [side * b.w * 0.08, b.h * 0.52, b.d * 0.63], p.secondary, { shape: 'capsule', rotation: [0, 0, side * 0.18], name: 'snail-feeler' });
  }
  for (let spot = 0; spot < 5; spot += 1) add([b.w * 0.07, b.h * 0.06, b.d * 0.025], [((spot % 3) - 1) * b.w * 0.19, b.h * (0.44 + Math.floor(spot / 3) * 0.21), b.d * 0.22], shifted(p.glow, spot + variant), { shape: 'sphere', name: 'shell-inlay' });
}

function buildBeetle(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.66, b.h * 0.58, b.d * 0.58], [0, b.h * 0.36, -b.d * 0.12], p.primary, { shape: 'sphere', metalness: 0.58, name: 'beetle-abdomen' });
  add([b.w * 0.55, b.h * 0.48, b.d * 0.42], [0, b.h * 0.34, b.d * 0.25], p.secondary, { shape: 'sphere', metalness: 0.52, name: 'beetle-thorax' });
  add([b.w * 0.42, b.h * 0.38, b.d * 0.32], [0, b.h * 0.35, b.d * 0.52], p.dark, { shape: 'sphere', metalness: 0.4, name: 'rig-head' });
  add([b.w * 0.035, b.h * 0.48, b.d * 0.05], [0, b.h * 0.51, -b.d * 0.1], p.glow, { metalness: 0.72, name: 'elytra-seam' });
  for (const side of [-1, 1]) {
    for (let leg = 0; leg < 3; leg += 1) {
      const z = b.d * (-0.22 + leg * 0.24);
      add([b.w * 0.055, b.h * 0.42, b.w * 0.055], [side * b.w * 0.42, b.h * 0.27, z], p.dark, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * (0.66 + leg * 0.12)], name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
      add([b.w * 0.04, b.h * 0.32, b.w * 0.04], [side * b.w * 0.57, b.h * 0.12, z + b.d * 0.04], p.dark, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * -0.45], name: 'beetle-tarsus' });
    }
    for (let horn = 0; horn < 3; horn += 1) add([b.w * (0.075 - horn * 0.012), b.h * 0.28, b.w * (0.075 - horn * 0.012)], [side * b.w * (0.12 + horn * 0.07), b.h * (0.39 + horn * 0.07), b.d * (0.68 + horn * 0.07)], p.glow, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * (0.12 + horn * 0.08)], metalness: 0.66, name: 'stag-horn' });
  }
  if (variant % 2) for (const side of [-1, 1]) add([b.w * 0.48, b.h * 0.08, b.d * 0.46], [side * b.w * 0.22, b.h * 0.53, -b.d * 0.08], p.glass, { shape: 'sphere', opacity: 0.3, name: 'beetle-wing' });
}

function buildCrane(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.62, b.h * 0.32, b.d * 0.62], [0, b.h * 0.55, -b.d * 0.08], p.light, { shape: 'sphere', name: 'crane-body' });
  add([b.w * 0.2, b.h * 0.55, b.w * 0.2], [0, b.h * 0.79, b.d * 0.22], p.light, { shape: 'capsule', rotation: [-0.16, 0, 0], name: 'crane-neck' });
  add([b.w * 0.36, b.h * 0.22, b.d * 0.32], [0, b.h * 0.94, b.d * 0.36], p.secondary, { shape: 'sphere', name: 'rig-head' });
  add([b.w * 0.16, b.h * 0.12, b.d * 0.48], [0, b.h * 0.92, b.d * 0.65], p.glow, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'crane-beak' });
  for (const side of [-1, 1]) {
    add([b.w * 0.34, b.h * 0.42, b.d * 0.18], [side * b.w * 0.34, b.h * 0.55, -b.d * 0.08], p.dark, { shape: 'capsule', rotation: [0, 0, side * 0.45], name: 'rig-wing' });
    for (let feather = 0; feather < 4; feather += 1) add([b.w * 0.11, b.h * (0.24 + feather * 0.035), b.d * 0.07], [side * b.w * (0.28 + feather * 0.045), b.h * (0.57 - feather * 0.035), -b.d * 0.08], shifted(p.primary, feather + variant), { shape: 'capsule', rotation: [0, 0, side * (0.35 + feather * 0.08)], name: 'crane-feather' });
    add([b.w * 0.075, b.h * 0.52, b.w * 0.075], [side * b.w * 0.15, b.h * 0.27, 0], p.glow, { shape: 'cylinder', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
    for (let toe = -1; toe <= 1; toe += 1) add([b.w * 0.035, b.h * 0.025, b.d * 0.3], [side * b.w * 0.15 + toe * b.w * 0.04, b.h * 0.018, b.d * 0.08], p.glow, { shape: 'capsule', rotation: [Math.PI / 2, 0, toe * 0.18], name: 'crane-toe' });
  }
  add([b.w * 0.22, b.h * 0.12, b.d * 0.1], [0, b.h * 1.02, b.d * 0.32], variant % 2 ? p.glow : p.dark, { shape: 'sphere', name: 'crane-crown' });
}

function addCreatureMarkings(
  root: THREE.Group,
  b: Bounds,
  p: Palette,
  variant: number,
  species: number,
): void {
  const add = partAdder(root);
  for (let mark = 0; mark < 8; mark += 1) {
    const angle = (mark / 8) * Math.PI * 2 + variant * 0.19;
    add([b.w * (0.035 + (mark % 3) * 0.012), b.h * (0.025 + ((mark + species) % 3) * 0.012), b.d * 0.02], [Math.cos(angle) * b.w * 0.28, b.h * (0.38 + Math.sin(angle) * 0.17), b.d * 0.505], mark % 2 ? p.glow : p.light, { shape: mark % 3 === 0 ? 'torus' : 'sphere', rotation: [Math.PI / 2, 0, angle], emissive: variant === 5 && mark % 2 === 0 ? p.glow : undefined, emissiveIntensity: 0.22, name: 'variant-creature-marking' });
  }
}

type Bounds = { w: number; h: number; d: number };

function partAdder(parent: THREE.Object3D) {
  return (
    scale: [number, number, number],
    position: [number, number, number],
    color: string,
    options: PartOptions = {},
  ): THREE.Mesh => {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.63,
      metalness: options.metalness ?? 0.08,
      emissive: options.emissive ?? '#000000',
      emissiveIntensity: options.emissiveIntensity ?? 0,
      transparent: (options.opacity ?? 1) < 1,
      opacity: options.opacity ?? 1,
      depthWrite: (options.opacity ?? 1) >= 0.5,
    });
    const mesh = new THREE.Mesh(geometryFor(options.shape ?? 'box'), material);
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    if (options.rotation) mesh.rotation.set(...options.rotation);
    mesh.name = options.name ?? 'artisan-detail';
    mesh.userData.baseRotation = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
    mesh.castShadow = (options.opacity ?? 1) > 0.5;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
}

function geometryFor(shape: Shape): THREE.BufferGeometry {
  return geometryForShape(shape);
}

function paletteFor(kind: DetailedModelKind, variant: number, accent: string, body: string): Palette {
  const hash = hashString(kind);
  const hue = ((hash % 23) - 11) * 0.006 + variant * 0.018;
  const primary = new THREE.Color(body).offsetHSL(hue, 0.02, (variant - 3.5) * 0.012).getStyle();
  const secondary = new THREE.Color(accent).offsetHSL(-hue * 0.6, 0.06, (variant % 3 - 1) * 0.025).getStyle();
  const trim = new THREE.Color(primary).multiplyScalar(0.54).getStyle();
  const dark = new THREE.Color(secondary).multiplyScalar(0.3).getStyle();
  const light = new THREE.Color(primary).lerp(new THREE.Color('#f2eee5'), 0.64).getStyle();
  const glow = ['#d8b45f', '#7fd9e8', '#d789b7', '#b1db73', '#e68f62', '#8fa9ef', '#d7d1c0', '#efdf8b'][variant]!;
  return { primary, secondary, trim, dark, light, glow, glass: new THREE.Color(glow).lerp(new THREE.Color('#a9cbd2'), 0.65).getStyle() };
}

function shifted(color: string, amount: number): string {
  return new THREE.Color(color).offsetHSL(amount * 0.021, (amount % 3 - 1) * 0.025, (amount % 5 - 2) * 0.018).getStyle();
}
