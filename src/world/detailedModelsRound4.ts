import * as THREE from 'three';
import { hashString } from '../core/rng';
import {
  ATELIER_BOUNDS,
  ATELIER_CREATURE_KINDS,
  ATELIER_HUMANOID_KINDS,
  ATELIER_PROP_FAMILIES,
  atelierFamilyForKind,
  isAtelierModelKind,
  type AtelierCreatureKind,
  type AtelierHumanoidKind,
  type AtelierModelKind,
  type AtelierPropKind,
} from './detailedAssetsRound4';

type Shape = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'capsule';
type Bounds = { w: number; h: number; d: number };

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
  jewel: string;
}

export { ATELIER_BOUNDS };

/** Build one fourth-round model. All surfaces are real meshes; no canvases or sprites. */
export function buildAtelierModel(
  kind: string,
  variant: number,
  accent: string,
  body: string,
): THREE.Group | null {
  if (!isAtelierModelKind(kind)) return null;
  const model = ATELIER_HUMANOID_KINDS.includes(kind as AtelierHumanoidKind)
    ? buildAtelierHumanoid(kind as AtelierHumanoidKind, variant, accent, body)
    : ATELIER_CREATURE_KINDS.includes(kind as AtelierCreatureKind)
      ? buildAtelierCreature(kind as AtelierCreatureKind, variant, accent, body)
      : buildAtelierProp(kind as AtelierPropKind, variant, accent, body);
  model.name = `${kind}-${variant}`;
  model.userData.detailTier = 'atelier';
  model.userData.detailVariant = variant;
  model.userData.modelFamily = atelierFamilyForKind(kind).id;
  model.userData.geometryOnly = true;
  return model;
}

function buildAtelierProp(
  kind: AtelierPropKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const familyIndex = ATELIER_PROP_FAMILIES.findIndex((family) => family.kind === kind);
  const form = Math.floor(familyIndex / 2);
  const profile = familyIndex % 2;
  const bounds = ATELIER_BOUNDS[kind];
  const palette = paletteFor(kind, variant, accent, body);
  const root = new THREE.Group();
  buildArchitecturalChassis(root, bounds, palette, variant, familyIndex);
  addPropIdentity(root, bounds, palette, variant, form, profile);
  addLayeredFinish(root, bounds, palette, variant, familyIndex);
  return root;
}

function buildArchitecturalChassis(
  root: THREE.Group,
  b: Bounds,
  p: Palette,
  variant: number,
  family: number,
): void {
  const add = partAdder(root);
  // A three-step plinth, rear structural frame, and front inlay make every prop
  // read as assembled rather than a single primitive with decorations.
  add([b.w * 0.98, b.h * 0.035, b.d * 0.94], [0, b.h * 0.025, 0], p.dark, { name: 'atelier-shadow-plinth' });
  add([b.w * 0.91, b.h * 0.055, b.d * 0.87], [0, b.h * 0.07, 0], p.trim, { metalness: 0.58, name: 'atelier-inlaid-plinth' });
  add([b.w * 0.82, b.h * 0.045, b.d * 0.78], [0, b.h * 0.115, 0], p.jewel, { metalness: 0.38, name: 'atelier-inner-plinth' });
  for (const side of [-1, 1]) {
    for (const depth of [-1, 1]) {
      add([b.w * 0.045, b.h * 0.7, b.d * 0.045], [side * b.w * 0.42, b.h * 0.46, depth * b.d * 0.38], p.trim, { shape: 'capsule', metalness: 0.66, name: 'atelier-structural-upright' });
      add([b.w * 0.075, b.h * 0.075, b.d * 0.075], [side * b.w * 0.42, b.h * 0.82, depth * b.d * 0.38], p.glow, { shape: variant % 2 ? 'sphere' : 'torus', emissive: variant === 5 ? p.glow : undefined, emissiveIntensity: 0.16, name: 'atelier-frame-knuckle' });
    }
  }

  switch (family % 6) {
    case 0:
      add([b.w * 0.76, b.h * 0.72, b.d * 0.68], [0, b.h * 0.49, 0], p.primary, { name: 'atelier-casework-core' });
      for (let row = 0; row < 4; row += 1) for (let column = -1; column <= 1; column += 1) {
        add([b.w * 0.205, b.h * 0.125, b.d * 0.045], [column * b.w * 0.235, b.h * (0.28 + row * 0.155), b.d * 0.365], (row + column) % 2 ? p.primary : p.secondary, { name: 'atelier-casework-recess' });
        add([b.w * 0.035, b.w * 0.035, b.d * 0.025], [column * b.w * 0.235, b.h * (0.28 + row * 0.155), b.d * 0.405], p.glow, { shape: 'sphere', metalness: 0.72, name: 'atelier-casework-pull' });
      }
      break;
    case 1:
      add([b.w * 0.9, b.h * 0.09, b.d * 0.8], [0, b.h * 0.55, 0], p.primary, { name: 'atelier-instrument-deck' });
      add([b.w * 0.76, b.h * 0.28, b.d * 0.12], [0, b.h * 0.76, -b.d * 0.28], p.secondary, { rotation: [-0.16, 0, 0], name: 'atelier-sloped-control-bank' });
      for (let control = 0; control < 12; control += 1) {
        const x = ((control % 6) - 2.5) * b.w * 0.105;
        const y = b.h * (0.72 + Math.floor(control / 6) * 0.14);
        add([b.w * 0.038, b.w * 0.038, b.d * 0.025], [x, y, -b.d * 0.205], control % 2 ? p.glow : p.light, { shape: control % 3 ? 'cylinder' : 'torus', rotation: [Math.PI / 2, 0, 0], emissive: control % 2 ? p.glow : undefined, emissiveIntensity: 0.16, name: 'atelier-console-control' });
      }
      break;
    case 2:
      add([b.w * 0.7, b.h * 0.1, b.d * 0.7], [0, b.h * 0.2, 0], p.primary, { shape: 'cylinder', name: 'atelier-radial-deck' });
      add([b.w * 0.12, b.h * 0.67, b.w * 0.12], [0, b.h * 0.45, 0], p.trim, { shape: 'cylinder', metalness: 0.68, name: 'atelier-radial-spine' });
      for (let ring = 0; ring < 7; ring += 1) {
        add([b.w * (0.18 + ring * 0.055), b.w * (0.18 + ring * 0.055), b.w * 0.024], [0, b.h * (0.51 + (ring - 3) * 0.045), 0], ring % 2 ? p.glow : p.secondary, { shape: 'torus', rotation: [Math.PI / 2 + ring * 0.095, ring * 0.17, ring * 0.08], metalness: 0.6, name: 'atelier-concentric-gimbal' });
      }
      break;
    case 3:
      add([b.w * 0.9, b.h * 0.08, b.d * 0.84], [0, b.h * 0.45, 0], p.primary, { name: 'atelier-gantry-deck' });
      for (const side of [-1, 1]) {
        add([b.w * 0.075, b.h * 0.75, b.w * 0.075], [side * b.w * 0.35, b.h * 0.53, 0], p.trim, { shape: 'capsule', name: 'atelier-gantry-pillar' });
        add([b.w * 0.12, b.h * 0.12, b.d * 0.72], [side * b.w * 0.35, b.h * 0.88, 0], p.jewel, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'atelier-gantry-crosshead' });
      }
      for (let tooth = -4; tooth <= 4; tooth += 1) add([b.w * 0.055, b.h * 0.21, b.d * 0.055], [tooth * b.w * 0.085, b.h * (0.58 + Math.abs(tooth) * 0.035), 0], tooth % 2 ? p.secondary : p.glow, { shape: 'capsule', name: 'atelier-gantry-tool' });
      break;
    case 4:
      add([b.w * 0.66, b.h * 0.72, b.d * 0.66], [0, b.h * 0.48, 0], p.secondary, { shape: 'cylinder', name: 'atelier-columnar-core' });
      for (let band = 0; band < 8; band += 1) add([b.w * (0.35 + (band % 2) * 0.035), b.w * (0.35 + (band % 2) * 0.035), b.h * 0.025], [0, b.h * (0.2 + band * 0.09), 0], band % 2 ? p.glow : p.trim, { shape: 'torus', rotation: [Math.PI / 2, 0, band * 0.09], metalness: 0.62, name: 'atelier-column-band' });
      for (let pane = 0; pane < 8; pane += 1) {
        const angle = pane / 8 * Math.PI * 2;
        add([b.w * 0.13, b.h * 0.42, b.d * 0.035], [Math.cos(angle) * b.w * 0.34, b.h * 0.54, Math.sin(angle) * b.d * 0.34], pane % 2 ? p.glass : p.jewel, { rotation: [0, -angle, 0], opacity: 0.58, emissive: pane % 2 ? p.glow : undefined, emissiveIntensity: 0.1, name: 'atelier-column-pane' });
      }
      break;
    default:
      add([b.w * 0.78, b.h * 0.12, b.d * 0.7], [0, b.h * 0.38, 0], p.primary, { name: 'atelier-throne-seat' });
      add([b.w * 0.72, b.h * 0.55, b.d * 0.11], [0, b.h * 0.67, -b.d * 0.3], p.secondary, { name: 'atelier-throne-back' });
      for (const side of [-1, 1]) {
        add([b.w * 0.09, b.h * 0.62, b.w * 0.09], [side * b.w * 0.35, b.h * 0.4, -b.d * 0.27], p.trim, { shape: 'capsule', name: 'atelier-throne-standard' });
        for (let joint = 0; joint < 5; joint += 1) add([b.w * 0.065, b.w * 0.065, b.d * 0.045], [side * b.w * 0.35, b.h * (0.25 + joint * 0.13), -b.d * 0.205], joint % 2 ? p.glow : p.light, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'atelier-throne-joint' });
      }
  }
}

function addPropIdentity(
  root: THREE.Group,
  b: Bounds,
  p: Palette,
  variant: number,
  form: number,
  profile: number,
): void {
  const add = partAdder(root);
  const front = b.d * 0.49;
  switch (form) {
    case 0:
      for (let cell = 0; cell < 18; cell += 1) {
        const x = ((cell % 6) - 2.5) * b.w * 0.1;
        const y = b.h * (0.27 + Math.floor(cell / 6) * 0.19);
        add([b.w * 0.07, b.h * 0.1, b.d * 0.045], [x, y, front], profile ? shifted(p.jewel, cell) : shifted(p.glass, cell), { shape: profile && cell % 3 === 0 ? 'sphere' : 'box', opacity: profile ? 0.78 : 0.58, name: profile ? 'specimen-pneumatic-cell' : 'cloud-atlas-slide' });
      }
      break;
    case 1:
      for (let gimbal = 0; gimbal < 9; gimbal += 1) add([b.w * (0.18 + gimbal * 0.038), b.w * (0.18 + gimbal * 0.038), b.w * 0.022], [0, b.h * (0.62 + (gimbal - 4) * 0.025), b.d * 0.06], gimbal % 2 ? p.glow : p.trim, { shape: 'torus', rotation: [Math.PI / 2 + gimbal * 0.11, gimbal * 0.17, 0], name: profile ? 'portrait-camera-gimbal' : 'reading-chair-gimbal' });
      add([b.w * 0.34, b.h * 0.42, b.d * 0.11], [0, b.h * 0.67, front], p.glass, { shape: profile ? 'cylinder' : 'sphere', rotation: profile ? [Math.PI / 2, 0, 0] : [0, 0, 0], opacity: 0.52, name: profile ? 'portrait-lens-plate' : 'reading-head-cushion' });
      break;
    case 2:
      for (let dial = 0; dial < 12; dial += 1) {
        const angle = dial / 12 * Math.PI * 2;
        add([b.w * (0.055 + (dial % 3) * 0.012), b.w * (0.055 + (dial % 3) * 0.012), b.d * 0.04], [Math.cos(angle) * b.w * 0.29, b.h * 0.65 + Math.sin(angle) * b.h * 0.2, front], dial % 2 ? p.light : p.glow, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: profile ? 'eclipse-orbital-dial' : 'tide-clock-dial' });
      }
      for (let orbit = 0; orbit < 5 + profile * 2; orbit += 1) add([b.w * (0.17 + orbit * 0.055), b.w * (0.17 + orbit * 0.055), b.w * 0.018], [0, b.h * 0.65, 0], orbit % 2 ? p.jewel : p.trim, { shape: 'torus', rotation: [orbit * 0.24, orbit * 0.17, orbit * 0.31], name: 'forecast-orbit' });
      break;
    case 3:
      if (!profile) for (let string = -7; string <= 7; string += 1) add([b.w * 0.018, b.h * (0.62 - Math.abs(string) * 0.035), b.w * 0.018], [string * b.w * 0.05, b.h * 0.62, front], string % 2 ? p.glow : p.light, { shape: 'cylinder', name: 'weather-harp-string' });
      else for (let horn = 0; horn < 14; horn += 1) {
        const angle = horn / 14 * Math.PI * 2;
        add([b.w * 0.15, b.h * 0.36, b.d * 0.15], [Math.cos(angle) * b.w * 0.3, b.h * (0.58 + Math.sin(angle * 2) * 0.18), Math.sin(angle) * b.d * 0.28], horn % 2 ? p.glow : p.secondary, { shape: 'cone', rotation: [Math.sin(angle) * 0.5, 0, -angle], metalness: 0.48, name: 'resonance-array-horn' });
      }
      break;
    case 4:
      for (let tube = 0; tube < 14; tube += 1) {
        const x = ((tube % 7) - 3) * b.w * 0.08;
        const y = b.h * (0.38 + Math.floor(tube / 7) * 0.29);
        add([b.w * 0.045, b.h * (0.21 + (tube % 4) * 0.04), b.w * 0.045], [x, y, front], tube % 2 ? p.glass : p.glow, { shape: profile ? 'capsule' : 'torus', rotation: profile ? [0, 0, (tube - 7) * 0.035] : [Math.PI / 2, 0, 0], opacity: profile ? 0.76 : 1, name: profile ? 'teletype-key-and-arm' : 'mail-sorter-tube' });
      }
      break;
    case 5:
      for (let vial = 0; vial < 20; vial += 1) {
        const angle = vial / 20 * Math.PI * 2;
        const radius = b.w * (0.18 + (vial % 2) * 0.13);
        add([b.w * 0.055, b.h * (0.12 + (vial % 4) * 0.025), b.w * 0.055], [Math.cos(angle) * radius, b.h * (0.48 + (vial % 5) * 0.08), Math.sin(angle) * b.d * 0.32], shifted(vial % 2 ? p.glass : p.jewel, vial + variant), { shape: 'cylinder', opacity: 0.62, emissive: vial % 4 === 0 ? p.glow : undefined, emissiveIntensity: 0.12, name: profile ? 'apothecary-compound-vial' : 'perfumery-note-vial' });
      }
      break;
    case 6:
      for (let arm = 0; arm < 12; arm += 1) {
        const angle = arm / 12 * Math.PI * 2;
        add([b.w * 0.045, b.h * 0.45, b.w * 0.045], [Math.cos(angle) * b.w * 0.27, b.h * 0.67, Math.sin(angle) * b.d * 0.27], arm % 2 ? p.trim : p.glow, { shape: 'capsule', rotation: [0, 0, angle], name: profile ? 'dental-jaw-articulation' : 'surgical-tool-arm' });
        add([b.w * 0.08, b.h * 0.13, b.d * 0.06], [Math.cos(angle) * b.w * 0.4, b.h * (0.68 + Math.sin(angle) * 0.2), Math.sin(angle) * b.d * 0.4], p.light, { shape: profile ? 'cone' : 'capsule', rotation: [0, angle, 0], name: profile ? 'dental-phantom-tooth' : 'surgical-instrument-head' });
      }
      break;
    case 7:
      for (let prism = 0; prism < 18; prism += 1) {
        const angle = prism / 18 * Math.PI * 2;
        add([b.w * (0.045 + (prism % 3) * 0.012), b.h * (0.18 + (prism % 4) * 0.05), b.w * 0.045], [Math.cos(angle) * b.w * 0.32, b.h * (0.61 + Math.sin(angle * 3) * 0.2), Math.sin(angle) * b.d * 0.32], shifted(p.glass, prism + variant), { shape: profile ? 'cylinder' : 'cone', rotation: [0, angle, angle * 0.08], opacity: 0.7, emissive: p.glow, emissiveIntensity: 0.1, name: profile ? 'light-organ-pipe' : 'kinetic-chandelier-prism' });
      }
      break;
    case 8:
      for (let tile = 0; tile < 20; tile += 1) {
        const x = ((tile % 5) - 2) * b.w * 0.13;
        const z = (Math.floor(tile / 5) - 1.5) * b.d * 0.17;
        const y = b.h * (0.57 + Math.sin((tile + variant) * 1.7) * 0.065);
        add([b.w * 0.105, b.h * 0.04, b.d * 0.13], [x, y, z], shifted(tile % 2 ? p.primary : p.secondary, tile), { name: profile ? 'subway-model-platform' : 'relief-map-contour' });
        if (profile && tile % 3 === 0) add([b.w * 0.045, b.h * 0.1, b.d * 0.18], [x, y + b.h * 0.06, z], p.glow, { shape: 'capsule', rotation: [Math.PI / 2, 0, tile * 0.12], name: 'subway-model-train' });
      }
      break;
    case 9:
      for (let drop = 0; drop < 18; drop += 1) {
        const x = ((drop % 6) - 2.5) * b.w * 0.1;
        const row = Math.floor(drop / 6);
        add([b.w * 0.025, b.h * (0.25 + row * 0.09), b.w * 0.025], [x, b.h * (0.55 + row * 0.12), front], drop % 2 ? p.glass : p.trim, { shape: 'capsule', name: profile ? 'thunder-hammer-link' : 'rain-orchestra-drop' });
        add([b.w * 0.07, b.h * 0.07, b.d * 0.04], [x, b.h * (0.39 + row * 0.07), front], p.glow, { shape: profile ? 'box' : 'sphere', emissive: profile ? undefined : p.glow, emissiveIntensity: 0.12, name: profile ? 'thunder-sheet-hammer' : 'rain-glass-drop' });
      }
      break;
    case 10:
      for (let specimen = 0; specimen < 22; specimen += 1) {
        const angle = specimen / 22 * Math.PI * 2;
        const radius = b.w * (0.15 + (specimen % 3) * 0.075);
        add([b.w * (0.045 + specimen % 3 * 0.012), b.h * (0.11 + specimen % 4 * 0.025), b.d * 0.05], [Math.cos(angle) * radius, b.h * (0.38 + specimen % 6 * 0.09), Math.sin(angle) * b.d * 0.27], shifted(profile ? '#b4a98e' : '#658354', specimen), { shape: profile && specimen % 2 ? 'sphere' : 'capsule', rotation: [0, angle, angle * 0.12], name: profile ? 'mycology-fruiting-body' : 'seed-index-capsule' });
      }
      break;
    case 11:
      for (let occupant = 0; occupant < 18; occupant += 1) {
        const angle = occupant / 18 * Math.PI * 2;
        add([b.w * 0.065, b.h * (0.18 + occupant % 3 * 0.04), b.d * 0.055], [Math.cos(angle) * b.w * 0.31, b.h * (0.5 + Math.sin(angle * 2) * 0.22), Math.sin(angle) * b.d * 0.3], shifted(profile ? '#6e9b62' : p.jewel, occupant), { shape: profile ? 'capsule' : occupant % 3 ? 'sphere' : 'cone', rotation: [0, angle, angle * 0.2], name: profile ? 'robotic-orchid-bloom' : 'mechanical-aviary-bird' });
        if (!profile && occupant % 3 === 0) add([b.w * 0.16, b.h * 0.06, b.d * 0.035], [Math.cos(angle) * b.w * 0.36, b.h * (0.5 + Math.sin(angle * 2) * 0.22), Math.sin(angle) * b.d * 0.3], p.glow, { shape: 'capsule', rotation: [0, angle, angle * 0.45], name: 'mechanical-bird-wing' });
      }
      break;
    case 12:
      for (let service = 0; service < 18; service += 1) {
        const angle = service / 18 * Math.PI * 2;
        add([b.w * (0.07 + service % 4 * 0.014), b.h * (0.055 + service % 3 * 0.014), b.d * (0.07 + service % 4 * 0.014)], [Math.cos(angle) * b.w * 0.28, b.h * (0.54 + service % 4 * 0.08), Math.sin(angle) * b.d * 0.28], service % 2 ? p.light : p.glow, { shape: 'cylinder', metalness: 0.48, name: profile ? 'banquet-fountain-tier' : 'tea-robot-service-cup' });
      }
      break;
    case 13:
      for (let record = 0; record < 21; record += 1) {
        const x = ((record % 7) - 3) * b.w * 0.085;
        const y = b.h * (0.3 + Math.floor(record / 7) * 0.2);
        add([b.w * 0.06, b.h * (profile ? 0.1 : 0.025), b.d * 0.045], [x, y, front], record % 2 ? p.glow : p.light, { shape: profile ? 'box' : 'capsule', rotation: profile ? [0, 0, 0] : [0, 0, -0.45 + record * 0.045], name: profile ? 'mnemonic-file-cell' : 'dream-trace-stylus' });
      }
      break;
    case 14:
      if (!profile) for (let spoke = 0; spoke < 16; spoke += 1) {
        const angle = spoke / 16 * Math.PI * 2;
        add([b.w * 0.035, b.h * 0.45, b.w * 0.035], [Math.cos(angle) * b.w * 0.27, b.h * 0.67, Math.sin(angle) * b.d * 0.27], spoke % 2 ? p.glow : p.trim, { shape: 'capsule', rotation: [Math.sin(angle), 0, -angle], name: 'navigation-compass-spoke' });
      }
      else {
        for (const side of [-1, 1]) add([b.w * 0.06, b.h * 0.15, b.d * 0.92], [side * b.w * 0.34, b.h * 0.2, 0], p.trim, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'expedition-sledge-runner' });
        for (let lash = -6; lash <= 6; lash += 1) add([b.w * 0.025, b.h * 0.28, b.w * 0.025], [lash * b.w * 0.055, b.h * 0.48, 0], lash % 2 ? p.glow : p.light, { shape: 'capsule', rotation: [0, 0, lash * 0.025], name: 'expedition-cargo-lashing' });
      }
      break;
    case 15:
      for (let sample = 0; sample < 22; sample += 1) {
        const angle = sample / 22 * Math.PI * 2;
        add([b.w * (0.04 + sample % 4 * 0.014), b.h * (0.12 + sample % 3 * 0.045), b.d * (0.04 + sample % 2 * 0.015)], [Math.cos(angle) * b.w * 0.3, b.h * (0.53 + Math.sin(angle * 3) * 0.18), Math.sin(angle) * b.d * 0.3], shifted(profile ? p.glass : p.light, sample), { shape: profile ? 'cone' : 'capsule', rotation: [angle * 0.2, angle, -angle * 0.25], opacity: profile ? 0.78 : 1, name: profile ? 'assay-crystal-prism' : 'fossil-articulated-bone' });
      }
      break;
    case 16:
      for (let aquatic = 0; aquatic < 20; aquatic += 1) {
        const angle = aquatic / 20 * Math.PI * 2;
        const y = b.h * (0.34 + aquatic % 5 * 0.105);
        add([b.w * (0.055 + aquatic % 3 * 0.014), b.h * (0.08 + aquatic % 4 * 0.02), b.d * 0.045], [Math.cos(angle) * b.w * 0.3, y, Math.sin(angle) * b.d * 0.3], shifted(p.glass, aquatic), { shape: profile ? 'sphere' : 'torus', rotation: [Math.PI / 2, angle, 0], opacity: 0.6, emissive: aquatic % 4 === 0 ? p.glow : undefined, emissiveIntensity: 0.15, name: profile ? 'observation-jelly-bell' : 'tidal-clock-ring' });
      }
      break;
    case 17:
      for (let performer = 0; performer < 18; performer += 1) {
        const x = ((performer % 9) - 4) * b.w * 0.075;
        const row = Math.floor(performer / 9);
        add([b.w * 0.05, b.h * (0.18 + performer % 3 * 0.035), b.d * 0.04], [x, b.h * (0.42 + row * 0.26), front], performer % 2 ? p.glow : p.light, { shape: profile ? 'capsule' : performer % 3 ? 'sphere' : 'cone', name: profile ? 'shadow-orchestra-puppet' : 'proscenium-clockwork-actor' });
        add([b.w * 0.018, b.h * 0.28, b.w * 0.018], [x, b.h * (0.59 + row * 0.23), front - b.d * 0.03], p.trim, { shape: 'cylinder', name: 'theater-control-rod' });
      }
      break;
    case 18:
      for (let fitting = 0; fitting < 18; fitting += 1) {
        const angle = fitting / 18 * Math.PI * 2;
        add([b.w * (0.07 + fitting % 3 * 0.018), b.h * 0.22, b.d * 0.045], [Math.cos(angle) * b.w * 0.31, b.h * (0.58 + Math.sin(angle) * 0.25), Math.sin(angle) * b.d * 0.3], fitting % 2 ? p.glass : p.secondary, { shape: profile ? 'capsule' : 'box', rotation: [0, angle, -angle * 0.12], opacity: profile ? 1 : 0.55, name: profile ? 'glove-carousel-hand' : 'haberdashery-mirror-facet' });
      }
      break;
    case 19:
      for (let civic = 0; civic < 20; civic += 1) {
        const x = ((civic % 5) - 2) * b.w * 0.12;
        const y = b.h * (0.31 + Math.floor(civic / 5) * 0.14);
        add([b.w * 0.07, b.h * 0.075, b.d * 0.05], [x, y, front], civic % 2 ? p.glow : p.dark, { shape: profile ? 'torus' : 'box', rotation: profile ? [Math.PI / 2, 0, 0] : [0, 0, 0], name: profile ? 'voting-pneumatic-port' : 'complaint-kiosk-slot' });
      }
      break;
    case 20:
      for (let relic = 0; relic < 22; relic += 1) {
        const angle = relic / 22 * Math.PI * 2;
        add([b.w * 0.04, b.h * (0.13 + relic % 4 * 0.025), b.d * 0.035], [Math.cos(angle) * b.w * 0.28, b.h * (0.55 + Math.sin(angle * 2) * 0.22), Math.sin(angle) * b.d * 0.28], relic % 2 ? p.glass : p.light, { shape: profile ? 'sphere' : 'capsule', rotation: [angle * 0.2, angle, -angle], opacity: profile ? 0.6 : 0.85, emissive: relic % 5 === 0 ? p.glow : undefined, emissiveIntensity: 0.17, name: profile ? 'ectoplasm-condensation-flask' : 'relic-xray-bone' });
      }
      break;
    case 21:
      for (let textile = 0; textile < 22; textile += 1) {
        const x = ((textile % 11) - 5) * b.w * 0.055;
        const y = b.h * (0.38 + Math.floor(textile / 11) * 0.34);
        add([b.w * 0.022, b.h * (0.42 + textile % 3 * 0.04), b.w * 0.022], [x, y, front], shifted(textile % 2 ? p.glow : p.secondary, textile), { shape: 'capsule', rotation: [0, 0, profile ? Math.sin(textile) * 0.12 : (textile - 11) * 0.012], name: profile ? 'carpet-loom-thread' : 'folding-automaton-finger' });
      }
      break;
    case 22:
      for (let weather = 0; weather < 18; weather += 1) {
        const angle = weather / 18 * Math.PI * 2;
        add([b.w * 0.045, b.h * (0.2 + weather % 4 * 0.04), b.w * 0.045], [Math.cos(angle) * b.w * 0.3, b.h * (0.58 + Math.sin(angle) * 0.21), Math.sin(angle) * b.d * 0.3], weather % 2 ? p.glow : p.trim, { shape: profile ? 'cylinder' : 'capsule', rotation: [0, angle, -angle], name: profile ? 'storm-altar-barometer' : 'weather-vane-arrow' });
      }
      break;
    case 23:
      for (let room = 0; room < 24; room += 1) {
        const column = room % 6;
        const row = Math.floor(room / 6);
        add([b.w * (profile ? 0.09 : 0.105), b.h * 0.1, b.d * (profile ? 0.1 : 0.055)], [(column - 2.5) * b.w * 0.11, b.h * (0.27 + row * 0.17), front - (profile ? (room % 3) * b.d * 0.12 : 0)], room % 2 ? p.glow : p.glass, { opacity: 0.62, emissive: room % 5 === 0 ? p.glow : undefined, emissiveIntensity: 0.14, name: profile ? 'recursive-dollhouse-room' : 'hotel-cutaway-window' });
      }
      break;
    default:
      for (let step = 0; step < 24; step += 1) {
        const angle = step / 24 * Math.PI * 3.5;
        const radius = b.w * (0.09 + step / 24 * 0.29);
        add([b.w * 0.08, b.h * 0.045, b.d * (profile ? 0.14 : 0.07)], [Math.cos(angle) * radius, b.h * (0.28 + step * 0.022), Math.sin(angle) * b.d * (0.1 + step / 24 * 0.25)], step % 2 ? p.secondary : p.glow, { rotation: [0, -angle, profile ? angle * 0.06 : 0], name: profile ? 'impossible-floorplan-tile' : 'spiral-archive-shelf' });
      }
  }
}

function addLayeredFinish(
  root: THREE.Group,
  b: Bounds,
  p: Palette,
  variant: number,
  family: number,
): void {
  const add = partAdder(root);
  for (const side of [-1, 1]) {
    add([b.w * 0.023, b.h * 0.72, b.w * 0.023], [side * b.w * 0.465, b.h * 0.49, b.d * 0.455], p.glow, { shape: 'cylinder', metalness: 0.78, name: 'atelier-edge-inlay' });
    for (let fastener = 0; fastener < 8; fastener += 1) add([b.w * 0.027, b.w * 0.027, b.d * 0.018], [side * b.w * 0.465, b.h * (0.18 + fastener * 0.095), b.d * 0.49], fastener % 2 ? p.light : p.jewel, { shape: fastener % 3 ? 'sphere' : 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.76, name: 'atelier-hand-set-fastener' });
  }
  for (let mark = 0; mark < 12; mark += 1) {
    const angle = mark / 12 * Math.PI * 2 + family * 0.137;
    add([b.w * (0.025 + mark % 3 * 0.006), b.h * (0.035 + mark % 2 * 0.012), b.d * 0.018], [Math.cos(angle) * b.w * 0.28, b.h * (0.18 + mark * 0.062), b.d * 0.515], mark % 2 ? p.secondary : p.glow, { shape: mark % 3 ? 'sphere' : 'cone', rotation: [Math.PI / 2, angle, 0], name: `atelier-family-${family}-maker-mark` });
  }
  // Count and position change on every variant, ensuring silhouettes as well as
  // materials differ across all six versions of a family.
  for (let flourish = 0; flourish < 8 + variant * 2; flourish += 1) {
    const angle = flourish / (8 + variant * 2) * Math.PI * 2;
    const radius = b.w * (0.18 + variant * 0.018);
    add([b.w * (0.025 + flourish % 3 * 0.007), b.h * (0.06 + flourish % 4 * 0.012), b.d * 0.025], [Math.cos(angle) * radius, b.h * (0.9 + Math.sin(angle * 2) * 0.055), Math.sin(angle) * b.d * 0.16], shifted(p.glow, flourish + family), { shape: flourish % 3 === 0 ? 'cone' : flourish % 2 ? 'sphere' : 'torus', rotation: [angle, variant * 0.14, -angle], emissive: variant === 5 ? p.glow : undefined, emissiveIntensity: 0.14, name: `atelier-variant-${variant}-finial` });
  }
}

function buildAtelierHumanoid(
  kind: AtelierHumanoidKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const b = ATELIER_BOUNDS[kind];
  const p = paletteFor(kind, variant, accent, body);
  const role = ATELIER_HUMANOID_KINDS.indexOf(kind);
  const root = new THREE.Group();
  const add = partAdder(root);

  add([b.w * 0.5, b.h * 0.31, b.d * 0.52], [0, b.h * 0.59, 0], p.primary, { shape: 'capsule', name: 'atelier-tailored-torso' });
  add([b.w * 0.43, b.h * 0.25, b.d * 0.46], [0, b.h * 0.63, -b.d * 0.03], p.secondary, { shape: 'capsule', name: 'atelier-layered-waistcoat' });
  add([b.w * 0.34, b.h * 0.22, b.d * 0.38], [0, b.h * 0.88, b.d * 0.02], p.light, { shape: 'sphere', name: 'rig-head' });
  add([b.w * 0.13, b.h * 0.09, b.d * 0.17], [0, b.h * 0.77, 0], p.light, { shape: 'cylinder', name: 'atelier-neck' });
  add([b.w * 0.58, b.h * 0.085, b.d * 0.56], [0, b.h * 0.42, 0], p.trim, { shape: 'capsule', name: 'atelier-tailored-belt' });
  for (const side of [-1, 1]) {
    add([b.w * 0.18, b.h * 0.16, b.d * 0.22], [side * b.w * 0.34, b.h * 0.7, 0], p.secondary, { shape: 'sphere', name: 'atelier-sculpted-shoulder' });
    const upperArm = add([b.w * 0.12, b.h * 0.29, b.w * 0.12], [side * b.w * 0.39, b.h * 0.59, 0], p.secondary, { shape: 'capsule', rotation: [0, 0, side * (0.08 + variant * 0.018)], name: side < 0 ? 'rig-arm-left' : 'rig-arm-right' });
    upperArm.userData.baseRotation = { x: upperArm.rotation.x, y: upperArm.rotation.y, z: upperArm.rotation.z };
    add([b.w * 0.105, b.h * 0.25, b.w * 0.105], [side * b.w * 0.42, b.h * 0.43, b.d * 0.015], p.primary, { shape: 'capsule', rotation: [0, 0, side * -0.08], name: 'atelier-forearm' });
    add([b.w * 0.14, b.h * 0.12, b.w * 0.14], [side * b.w * 0.43, b.h * 0.31, b.d * 0.03], p.light, { shape: 'sphere', name: 'atelier-articulated-hand' });
    for (let finger = -2; finger <= 2; finger += 1) add([b.w * 0.025, b.h * 0.085, b.w * 0.025], [side * (b.w * 0.43 + finger * b.w * 0.012), b.h * 0.27, b.d * 0.045], p.light, { shape: 'capsule', rotation: [0, 0, side * 0.08], name: 'atelier-hand-finger' });
    add([b.w * 0.14, b.h * 0.1, b.d * 0.16], [side * b.w * 0.16, b.h * 0.42, 0], p.dark, { shape: 'sphere', name: 'atelier-tailored-hip' });
    const thigh = add([b.w * 0.145, b.h * 0.28, b.w * 0.145], [side * b.w * 0.16, b.h * 0.31, 0], p.dark, { shape: 'capsule', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
    thigh.userData.baseRotation = { x: 0, y: 0, z: 0 };
    add([b.w * 0.13, b.h * 0.24, b.w * 0.13], [side * b.w * 0.16, b.h * 0.145, 0], p.trim, { shape: 'capsule', name: 'atelier-tailored-shin' });
    add([b.w * 0.19, b.h * 0.085, b.d * 0.39], [side * b.w * 0.16, b.h * 0.035, b.d * 0.08], p.dark, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'atelier-layered-shoe' });
    add([b.w * 0.06, b.h * 0.06, b.d * 0.08], [side * b.w * 0.16, b.h * 0.19, b.d * 0.075], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'atelier-knee-clasp' });
  }
  for (let button = 0; button < 9; button += 1) add([b.w * 0.035, b.w * 0.035, b.d * 0.022], [0, b.h * (0.45 + button * 0.038), b.d * 0.285], button % 2 ? p.glow : p.light, { shape: 'sphere', metalness: 0.68, name: 'atelier-waistcoat-button' });
  for (let lapel = 0; lapel < 8; lapel += 1) {
    const side = lapel % 2 ? 1 : -1;
    const row = Math.floor(lapel / 2);
    add([b.w * 0.075, b.h * 0.12, b.d * 0.035], [side * b.w * (0.08 + row * 0.025), b.h * (0.68 - row * 0.055), b.d * 0.275], lapel % 3 ? p.secondary : p.glow, { rotation: [0, 0, side * (0.32 + row * 0.07)], name: 'atelier-layered-lapel' });
  }
  addHumanoidRoleGear(root, b, p, variant, role);
  addHumanoidFinish(root, b, p, variant, role);
  return root;
}

function addHumanoidRoleGear(root: THREE.Group, b: Bounds, p: Palette, variant: number, role: number): void {
  const add = partAdder(root);
  const front = b.d * 0.42;
  // Every role receives a different iconic instrument silhouette.
  switch (role) {
    case 0:
      for (let gauge = 0; gauge < 10; gauge += 1) add([b.w * 0.065, b.w * 0.065, b.d * 0.03], [((gauge % 5) - 2) * b.w * 0.09, b.h * (0.5 + Math.floor(gauge / 5) * 0.11), front], gauge % 2 ? p.glass : p.glow, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'observer-barometer' });
      add([b.w * 0.035, b.h * 0.62, b.w * 0.035], [b.w * 0.48, b.h * 0.72, 0], p.trim, { shape: 'capsule', rotation: [0, 0, -0.12], name: 'observer-anemometer-staff' });
      break;
    case 1:
      for (let plan = 0; plan < 12; plan += 1) add([b.w * 0.09, b.h * 0.055, b.d * 0.035], [((plan % 4) - 1.5) * b.w * 0.12, b.h * (0.47 + Math.floor(plan / 4) * 0.075), front], plan % 2 ? p.glow : p.light, { rotation: [0, 0, (plan - 6) * 0.045], name: 'sleep-architect-folded-plan' });
      break;
    case 2:
      add([b.w * 0.74, b.h * 0.08, b.d * 0.08], [0, b.h * 0.71, front], p.glow, { name: 'rail-inspector-sash' });
      for (let ticket = 0; ticket < 11; ticket += 1) add([b.w * 0.055, b.h * 0.09, b.d * 0.025], [b.w * (0.27 + ticket % 2 * 0.06), b.h * (0.42 + ticket * 0.035), front], ticket % 2 ? p.light : p.jewel, { name: 'rail-inspector-ticket' });
      break;
    case 3:
      for (let key = 0; key < 13; key += 1) {
        const angle = key / 13 * Math.PI * 2;
        add([b.w * 0.045, b.h * 0.18, b.w * 0.045], [Math.cos(angle) * b.w * 0.3, b.h * (0.58 + Math.sin(angle) * 0.16), front], key % 2 ? p.glow : p.trim, { shape: 'torus', rotation: [Math.PI / 2, 0, angle], name: 'medium-record-key' });
      }
      break;
    case 4:
      for (let leaf = 0; leaf < 14; leaf += 1) {
        const angle = leaf / 14 * Math.PI * 2;
        add([b.w * 0.075, b.h * 0.18, b.d * 0.04], [Math.cos(angle) * b.w * 0.31, b.h * (0.59 + Math.sin(angle * 2) * 0.15), front], shifted('#6f9b61', leaf), { shape: 'capsule', rotation: [0, 0, -angle], name: 'anatomist-specimen-leaf' });
      }
      break;
    case 5:
      for (let tide = 0; tide < 9; tide += 1) add([b.w * (0.12 + tide * 0.025), b.w * (0.12 + tide * 0.025), b.d * 0.02], [0, b.h * (0.57 + (tide - 4) * 0.017), front], tide % 2 ? p.glass : p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, tide * 0.13], name: 'tide-keeper-ring' });
      break;
    case 6:
      for (let vial = 0; vial < 15; vial += 1) add([b.w * 0.04, b.h * (0.1 + vial % 3 * 0.025), b.w * 0.04], [((vial % 5) - 2) * b.w * 0.09, b.h * (0.43 + Math.floor(vial / 5) * 0.095), front], shifted(p.glass, vial), { shape: 'cylinder', opacity: 0.62, name: 'scent-archivist-vial' });
      break;
    case 7:
      for (let glove = 0; glove < 12; glove += 1) add([b.w * 0.075, b.h * 0.15, b.d * 0.035], [((glove % 4) - 1.5) * b.w * 0.12, b.h * (0.42 + Math.floor(glove / 4) * 0.1), front], shifted(glove % 2 ? p.light : p.secondary, glove), { shape: 'capsule', rotation: [0, 0, -0.25 + glove * 0.045], name: 'glove-librarian-catalogued-glove' });
      break;
    case 8:
      add([b.w * 0.58, b.w * 0.58, b.d * 0.055], [0, b.h * 1.02, 0], p.dark, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'eclipse-usher-halo' });
      for (let ray = 0; ray < 12; ray += 1) {
        const angle = ray / 12 * Math.PI * 2;
        add([b.w * 0.025, b.h * 0.16, b.w * 0.025], [Math.cos(angle) * b.w * 0.3, b.h * 1.02 + Math.sin(angle) * b.w * 0.3, 0], p.glow, { shape: 'cone', rotation: [0, 0, -angle], name: 'eclipse-usher-corona' });
      }
      break;
    case 9:
      for (let tube = 0; tube < 12; tube += 1) add([b.w * 0.045, b.h * (0.16 + tube % 4 * 0.03), b.w * 0.045], [((tube % 4) - 1.5) * b.w * 0.11, b.h * (0.43 + Math.floor(tube / 4) * 0.1), front], tube % 2 ? p.glass : p.glow, { shape: 'capsule', rotation: [0, 0, (tube - 6) * 0.045], name: 'courier-message-tube' });
      break;
    case 10:
      for (let crystal = 0; crystal < 14; crystal += 1) add([b.w * 0.06, b.h * (0.12 + crystal % 4 * 0.03), b.d * 0.045], [((crystal % 7) - 3) * b.w * 0.075, b.h * (0.48 + Math.floor(crystal / 7) * 0.13), front], shifted(p.glass, crystal), { shape: 'cone', rotation: [0, 0, (crystal - 7) * 0.055], opacity: 0.76, name: 'mineral-curator-crystal' });
      break;
    case 11:
      for (let tool = 0; tool < 13; tool += 1) add([b.w * 0.04, b.h * (0.16 + tool % 4 * 0.03), b.w * 0.04], [((tool % 5) - 2) * b.w * 0.09, b.h * (0.43 + Math.floor(tool / 5) * 0.1), front], tool % 2 ? p.glow : p.trim, { shape: tool % 3 ? 'capsule' : 'torus', rotation: [0, 0, -0.36 + tool * 0.06], name: 'ballroom-mechanic-tool' });
      break;
    case 12:
      for (let key = 0; key < 16; key += 1) add([b.w * 0.04, b.h * 0.07, b.d * 0.03], [((key % 8) - 3.5) * b.w * 0.065, b.h * (0.48 + Math.floor(key / 8) * 0.1), front], key % 2 ? p.light : p.dark, { name: 'dream-stenographer-key' });
      break;
    case 13:
      for (let tool = 0; tool < 12; tool += 1) add([b.w * 0.055, b.h * (0.15 + tool % 4 * 0.035), b.d * 0.035], [((tool % 4) - 1.5) * b.w * 0.12, b.h * (0.42 + Math.floor(tool / 4) * 0.105), front], shifted(tool % 2 ? p.glass : p.glow, tool), { shape: tool % 2 ? 'sphere' : 'capsule', opacity: tool % 2 ? 0.62 : 1, name: 'aquarium-custodian-tool' });
      break;
    default:
      add([b.w * 0.035, b.h * 0.72, b.w * 0.035], [b.w * 0.5, b.h * 0.64, 0], p.trim, { shape: 'capsule', rotation: [0, 0, -0.14], name: 'clock-conductor-baton' });
      for (let clock = 0; clock < 12; clock += 1) {
        const angle = clock / 12 * Math.PI * 2;
        add([b.w * 0.055, b.w * 0.055, b.d * 0.025], [Math.cos(angle) * b.w * 0.28, b.h * (0.58 + Math.sin(angle) * 0.16), front], clock % 2 ? p.glow : p.light, { shape: 'torus', rotation: [Math.PI / 2, 0, angle], name: 'clock-choir-badge' });
      }
  }
  // Role-specific heraldry makes the family signature explicit without relying
  // on color, and shifts with the variant for visible construction changes.
  add([b.w * (0.09 + role * 0.002), b.h * (0.1 + variant * 0.008), b.d * 0.035], [0, b.h * 0.73, front + b.d * 0.025], p.jewel, { shape: role % 3 === 0 ? 'torus' : role % 3 === 1 ? 'cone' : 'sphere', rotation: [Math.PI / 2, 0, role * 0.11], metalness: 0.64, name: `atelier-role-${role}-heraldry` });
}

function addHumanoidFinish(root: THREE.Group, b: Bounds, p: Palette, variant: number, role: number): void {
  const add = partAdder(root);
  for (const side of [-1, 1]) {
    for (let seam = 0; seam < 8; seam += 1) add([b.w * 0.02, b.h * 0.075, b.d * 0.018], [side * b.w * (0.2 + seam * 0.012), b.h * (0.46 + seam * 0.04), b.d * 0.28], seam % 2 ? p.glow : p.trim, { shape: 'capsule', rotation: [0, 0, side * (0.17 + seam * 0.025)], name: 'atelier-hand-stitched-seam' });
  }
  for (let medal = 0; medal < 7 + variant * 2; medal += 1) {
    const x = (medal - (6 + variant * 2) / 2) * b.w * 0.035;
    add([b.w * 0.025, b.h * (0.045 + medal % 3 * 0.01), b.d * 0.018], [x, b.h * (0.76 + medal % 2 * 0.035), b.d * 0.31], shifted(p.glow, medal + role), { shape: medal % 2 ? 'sphere' : 'cone', emissive: variant === 5 ? p.glow : undefined, emissiveIntensity: 0.13, name: `atelier-variant-${variant}-medal` });
  }
  for (let brim = 0; brim < 10; brim += 1) {
    const angle = brim / 10 * Math.PI * 2;
    add([b.w * 0.055, b.h * 0.055, b.d * 0.035], [Math.cos(angle) * b.w * 0.21, b.h * 0.985 + Math.sin(angle) * b.h * 0.035, Math.sin(angle) * b.d * 0.2], brim % 2 ? p.primary : p.glow, { shape: brim % 3 ? 'sphere' : 'cone', rotation: [0, angle, -angle], name: 'atelier-role-headdress-detail' });
  }
}

function buildAtelierCreature(
  kind: AtelierCreatureKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const b = ATELIER_BOUNDS[kind];
  const p = paletteFor(kind, variant, accent, body);
  const species = ATELIER_CREATURE_KINDS.indexOf(kind);
  const root = new THREE.Group();
  switch (species) {
    case 0: buildPangolin(root, b, p, variant); break;
    case 1: buildCrane(root, b, p, variant); break;
    case 2: buildOctopus(root, b, p, variant); break;
    case 3: buildFireflies(root, b, p, variant); break;
    case 4: buildAntelope(root, b, p, variant); break;
    case 5: buildSeal(root, b, p, variant); break;
    case 6: buildBeetle(root, b, p, variant); break;
    case 7: buildJellyfish(root, b, p, variant); break;
    case 8: buildSalamander(root, b, p, variant); break;
    default: buildCapybara(root, b, p, variant);
  }
  addCreatureFinish(root, b, p, variant, species);
  return root;
}

function buildPangolin(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const segmentCount = 14 + variant;
  for (let segment = 0; segment < segmentCount; segment += 1) {
    const t = segment / (segmentCount - 1);
    add([b.w * (0.42 - t * 0.18), b.h * (0.44 - t * 0.18), b.d * 0.16], [0, b.h * (0.45 + Math.sin(t * Math.PI) * 0.12), b.d * (0.32 - t * 0.68)], shifted(p.primary, segment), { shape: 'sphere', name: segment === 0 ? 'rig-head' : 'pangolin-armored-body-ring' });
    for (const side of [-1, 1]) add([b.w * 0.15, b.h * 0.18, b.d * 0.065], [side * b.w * (0.3 - t * 0.08), b.h * (0.57 + Math.sin(t * Math.PI) * 0.12), b.d * (0.32 - t * 0.68)], segment % 2 ? p.trim : p.glow, { shape: 'cone', rotation: [0, side * 0.4, side * -0.9], name: 'pangolin-overlapping-scale' });
  }
  for (const side of [-1, 1]) for (const z of [-1, 1]) add([b.w * 0.09, b.h * 0.34, b.w * 0.09], [side * b.w * 0.25, b.h * 0.2, z * b.d * 0.2], p.dark, { shape: 'capsule', rotation: [0, 0, side * 0.12], name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
  add([b.w * 0.2, b.h * 0.16, b.d * 0.38], [0, b.h * 0.42, b.d * 0.55], p.light, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'pangolin-tapered-snout' });
}

function buildCrane(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.55, b.h * 0.25, b.d * 0.52], [0, b.h * 0.47, -b.d * 0.05], p.light, { shape: 'sphere', name: 'crane-body' });
  for (let neck = 0; neck < 12; neck += 1) {
    const t = neck / 11;
    add([b.w * (0.09 - t * 0.02), b.h * 0.16, b.w * (0.09 - t * 0.02)], [Math.sin(t * Math.PI) * b.w * 0.13, b.h * (0.58 + t * 0.3), b.d * (0.18 + t * 0.15)], neck % 3 ? p.light : p.glow, { shape: 'sphere', name: neck === 11 ? 'rig-head' : 'crane-neck-vertebra' });
  }
  for (const side of [-1, 1]) {
    add([b.w * 0.035, b.h * 0.62, b.w * 0.035], [side * b.w * 0.13, b.h * 0.21, -b.d * 0.03], side < 0 ? p.trim : p.glow, { shape: 'capsule', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
    for (let feather = 0; feather < 12; feather += 1) add([b.w * 0.1, b.h * (0.2 + feather * 0.015), b.d * 0.06], [side * b.w * (0.2 + feather * 0.018), b.h * (0.51 + feather * 0.008), -b.d * (0.05 + feather * 0.018)], shifted(p.light, feather + variant), { shape: 'capsule', rotation: [0, 0, side * (0.18 + feather * 0.025)], name: side < 0 ? 'rig-wing-left' : 'rig-wing-right' });
  }
  add([b.w * 0.11, b.h * 0.08, b.d * 0.42], [b.w * 0.02, b.h * 0.9, b.d * 0.48], p.glow, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'crane-bill' });
}

function buildOctopus(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.55, b.h * 0.58, b.d * 0.55], [0, b.h * 0.65, 0], p.primary, { shape: 'sphere', name: 'rig-head' });
  add([b.w * 0.38, b.h * 0.35, b.d * 0.4], [0, b.h * 0.5, 0], p.secondary, { shape: 'sphere', name: 'octopus-mantle-layer' });
  for (let tentacle = 0; tentacle < 8; tentacle += 1) {
    const angle = tentacle / 8 * Math.PI * 2;
    const segmentCount = 8 + variant;
    for (let segment = 0; segment < segmentCount; segment += 1) {
      const t = segment / (segmentCount - 1);
      const radius = b.w * (0.18 + t * 0.28);
      add([b.w * (0.075 - t * 0.025), b.h * 0.13, b.w * (0.075 - t * 0.025)], [Math.cos(angle + t * 0.35) * radius, b.h * (0.43 - t * 0.24 + Math.sin(t * Math.PI) * 0.08), Math.sin(angle + t * 0.35) * b.d * (0.18 + t * 0.28)], shifted(p.primary, tentacle + segment), { shape: 'capsule', rotation: [0, angle, angle * 0.12], name: tentacle < 4 ? 'rig-arm-left' : 'rig-arm-right' });
    }
  }
}

function buildFireflies(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const count = 34 + variant;
  for (let insect = 0; insect < count; insect += 1) {
    const angle = insect * 2.399963 + variant * 0.11;
    const radius = b.w * (0.12 + (insect % 9) * 0.035);
    const y = b.h * (0.18 + ((insect * 7) % 29) / 35);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * b.d * (0.15 + (insect % 7) * 0.035);
    add([b.w * 0.035, b.h * 0.05, b.d * 0.035], [x, y, z], p.dark, { shape: 'capsule', rotation: [angle, 0, angle * 0.3], name: insect === 0 ? 'rig-head' : 'firefly-body' });
    add([b.w * 0.045, b.h * 0.04, b.d * 0.025], [x, y - b.h * 0.025, z], p.glow, { shape: 'sphere', emissive: p.glow, emissiveIntensity: 0.62, name: 'firefly-lantern' });
  }
}

function buildAntelope(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.62, b.h * 0.34, b.d * 0.68], [0, b.h * 0.48, -b.d * 0.08], p.primary, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'antelope-body' });
  add([b.w * 0.34, b.h * 0.3, b.d * 0.38], [0, b.h * 0.77, b.d * 0.35], p.secondary, { shape: 'sphere', name: 'rig-head' });
  add([b.w * 0.16, b.h * 0.14, b.d * 0.35], [0, b.h * 0.7, b.d * 0.55], p.light, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'antelope-muzzle' });
  for (const side of [-1, 1]) {
    for (const z of [-1, 1]) add([b.w * 0.075, b.h * 0.54, b.w * 0.075], [side * b.w * 0.24, b.h * 0.24, z * b.d * 0.2], p.dark, { shape: 'capsule', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
    const hornCount = 12 + variant;
    for (let horn = 0; horn < hornCount; horn += 1) {
      const t = horn / (hornCount - 1);
      add([b.w * (0.045 - t * 0.018), b.h * 0.14, b.w * (0.045 - t * 0.018)], [side * b.w * (0.13 + Math.sin(t * Math.PI) * 0.15), b.h * (0.88 + t * 0.24), b.d * (0.29 - t * 0.08)], shifted(p.glass, horn), { shape: 'capsule', rotation: [0, 0, side * (-0.3 + t * 0.5)], opacity: 0.78, name: 'antelope-glass-horn-segment' });
    }
  }
}

function buildSeal(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const segmentCount = 16 + variant;
  for (let segment = 0; segment < segmentCount; segment += 1) {
    const t = segment / (segmentCount - 1);
    add([b.w * (0.48 - t * 0.22), b.h * (0.45 - t * 0.22), b.d * 0.15], [0, b.h * (0.42 - t * 0.11), b.d * (0.32 - t * 0.67)], shifted(p.primary, segment), { shape: 'sphere', name: segment === 0 ? 'rig-head' : 'seal-streamlined-body' });
  }
  for (const side of [-1, 1]) {
    for (let flipper = 0; flipper < 8; flipper += 1) add([b.w * 0.08, b.h * 0.11, b.d * (0.16 + flipper * 0.018)], [side * b.w * (0.24 + flipper * 0.025), b.h * (0.29 - flipper * 0.012), b.d * (0.12 - flipper * 0.035)], shifted(p.secondary, flipper), { shape: 'capsule', rotation: [Math.PI / 2, 0, side * (0.38 + flipper * 0.04)], name: side < 0 ? 'rig-wing-left' : 'rig-wing-right' });
    for (let whisker = -3; whisker <= 3; whisker += 1) add([b.w * 0.23, b.h * 0.012, b.d * 0.012], [side * b.w * 0.27, b.h * (0.43 + whisker * 0.025), b.d * 0.48], p.light, { rotation: [0, 0, side * (0.12 + whisker * 0.06)], name: 'seal-whisker' });
  }
}

function buildBeetle(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.6, b.h * 0.62, b.d * 0.68], [0, b.h * 0.48, -b.d * 0.08], p.jewel, { shape: 'sphere', metalness: 0.46, name: 'beetle-lacquered-carapace' });
  add([b.w * 0.34, b.h * 0.36, b.d * 0.34], [0, b.h * 0.47, b.d * 0.38], p.dark, { shape: 'sphere', name: 'rig-head' });
  const plateCount = 18 + variant;
  for (let plate = 0; plate < plateCount; plate += 1) {
    const angle = plate / plateCount * Math.PI * 2;
    add([b.w * 0.1, b.h * 0.09, b.d * 0.07], [Math.cos(angle) * b.w * 0.26, b.h * (0.59 + Math.sin(angle * 2) * 0.11), Math.sin(angle) * b.d * 0.3], shifted(plate % 2 ? p.glow : p.secondary, plate), { shape: 'sphere', name: 'beetle-carapace-inlay' });
  }
  for (const side of [-1, 1]) for (let leg = 0; leg < 3; leg += 1) {
    add([b.w * 0.045, b.h * 0.38, b.w * 0.045], [side * b.w * (0.34 + leg * 0.07), b.h * (0.35 - leg * 0.035), b.d * (0.25 - leg * 0.25)], p.trim, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * (0.62 + leg * 0.12)], name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
    add([b.w * 0.035, b.h * 0.31, b.w * 0.035], [side * b.w * (0.52 + leg * 0.07), b.h * 0.15, b.d * (0.25 - leg * 0.25)], p.dark, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * -0.48], name: 'beetle-lower-leg' });
  }
}

function buildJellyfish(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.72, b.h * 0.38, b.d * 0.72], [0, b.h * 0.74, 0], p.glass, { shape: 'sphere', opacity: 0.52, emissive: p.glow, emissiveIntensity: 0.16, name: 'rig-head' });
  const radialCount = 24 + variant;
  for (let radial = 0; radial < radialCount; radial += 1) {
    const angle = radial / radialCount * Math.PI * 2;
    add([b.w * 0.055, b.h * 0.18, b.d * 0.055], [Math.cos(angle) * b.w * 0.32, b.h * (0.68 + Math.sin(radial * 1.7) * 0.045), Math.sin(angle) * b.d * 0.32], shifted(p.glass, radial), { shape: 'capsule', rotation: [0, angle, -angle], opacity: 0.64, name: 'jellyfish-bell-radial' });
  }
  for (let tentacle = 0; tentacle < 14; tentacle += 1) {
    const angle = tentacle / 14 * Math.PI * 2;
    for (let segment = 0; segment < 5; segment += 1) add([b.w * 0.025, b.h * 0.16, b.w * 0.025], [Math.cos(angle + segment * 0.12) * b.w * (0.12 + tentacle % 3 * 0.07), b.h * (0.54 - segment * 0.09), Math.sin(angle + segment * 0.12) * b.d * (0.12 + tentacle % 3 * 0.07)], tentacle % 2 ? p.glow : p.glass, { shape: 'capsule', rotation: [0, angle, Math.sin(segment) * 0.2], opacity: 0.65, name: tentacle < 7 ? 'rig-arm-left' : 'rig-arm-right' });
  }
}

function buildSalamander(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (let segment = 0; segment < 18; segment += 1) {
    const t = segment / 17;
    add([b.w * (0.32 - t * 0.14), b.h * (0.34 - t * 0.14), b.d * 0.12], [Math.sin(t * Math.PI * 1.4) * b.w * 0.07, b.h * (0.43 + Math.sin(t * Math.PI) * 0.04), b.d * (0.42 - t * 0.82)], shifted(p.primary, segment), { shape: 'sphere', name: segment === 0 ? 'rig-head' : 'salamander-body-segment' });
    if (segment % 2 === 0) add([b.w * 0.065, b.h * 0.07, b.d * 0.04], [Math.sin(t * Math.PI * 1.4) * b.w * 0.07, b.h * 0.59, b.d * (0.42 - t * 0.82)], shifted(p.glow, segment), { shape: 'cone', rotation: [0, 0, Math.PI], emissive: variant === 5 ? p.glow : undefined, emissiveIntensity: 0.16, name: 'salamander-jewel-crest' });
  }
  for (const side of [-1, 1]) for (const z of [-1, 1]) {
    for (let toe = 0; toe < 5; toe += 1) add([b.w * 0.035, b.h * 0.17, b.w * 0.035], [side * b.w * (0.25 + toe * 0.025), b.h * (0.27 - toe * 0.012), z * b.d * 0.24], p.glow, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * (0.55 + toe * 0.08)], name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
  }
}

function buildCapybara(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.64, b.h * 0.55, b.d * 0.68], [0, b.h * 0.48, -b.d * 0.08], p.primary, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'capybara-body' });
  add([b.w * 0.43, b.h * 0.42, b.d * 0.45], [0, b.h * 0.62, b.d * 0.37], p.secondary, { shape: 'sphere', name: 'rig-head' });
  add([b.w * 0.32, b.h * 0.25, b.d * 0.31], [0, b.h * 0.54, b.d * 0.58], p.light, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'capybara-square-muzzle' });
  for (const side of [-1, 1]) {
    for (const z of [-1, 1]) add([b.w * 0.105, b.h * 0.38, b.w * 0.105], [side * b.w * 0.25, b.h * 0.22, z * b.d * 0.22], p.dark, { shape: 'capsule', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
    add([b.w * 0.13, b.h * 0.13, b.d * 0.09], [side * b.w * 0.22, b.h * 0.8, b.d * 0.29], p.primary, { shape: 'sphere', name: 'capybara-rounded-ear' });
    for (let whisker = -3; whisker <= 3; whisker += 1) add([b.w * 0.24, b.h * 0.012, b.d * 0.012], [side * b.w * 0.27, b.h * (0.53 + whisker * 0.022), b.d * 0.65], p.light, { rotation: [0, 0, side * (0.12 + whisker * 0.055)], name: 'capybara-whisker' });
  }
  const furCount = 20 + variant;
  for (let fur = 0; fur < furCount; fur += 1) {
    const angle = fur / furCount * Math.PI * 2;
    add([b.w * 0.03, b.h * 0.1, b.d * 0.025], [Math.cos(angle) * b.w * 0.3, b.h * (0.55 + Math.sin(angle * 2) * 0.16), Math.sin(angle) * b.d * 0.3], shifted(p.secondary, fur), { shape: 'capsule', rotation: [0, angle, -angle], name: 'capybara-layered-fur' });
  }
}

function addCreatureFinish(
  root: THREE.Group,
  b: Bounds,
  p: Palette,
  variant: number,
  species: number,
): void {
  const add = partAdder(root);
  // Layered skin markings create a second material read over each silhouette.
  for (let mark = 0; mark < 24; mark += 1) {
    const angle = mark / 24 * Math.PI * 2 + species * 0.173;
    add([b.w * (0.025 + mark % 3 * 0.007), b.h * (0.025 + mark % 2 * 0.009), b.d * 0.018], [Math.cos(angle) * b.w * 0.29, b.h * (0.45 + Math.sin(angle * 3) * 0.16), b.d * (0.44 + Math.sin(angle) * 0.06)], mark % 2 ? p.glow : p.light, { shape: mark % 3 ? 'sphere' : 'torus', rotation: [Math.PI / 2, 0, angle], emissive: variant === 5 && mark % 3 === 0 ? p.glow : undefined, emissiveIntensity: 0.17, name: `atelier-species-${species}-marking` });
  }
  for (let crest = 0; crest < 8 + variant * 2; crest += 1) {
    const t = crest / (7 + variant * 2);
    add([b.w * (0.024 + crest % 3 * 0.006), b.h * (0.06 + crest % 4 * 0.012), b.d * 0.024], [(t - 0.5) * b.w * 0.46, b.h * (0.72 + Math.sin(t * Math.PI) * 0.08), -b.d * (0.08 + Math.cos(t * Math.PI) * 0.17)], shifted(p.jewel, crest + species), { shape: crest % 2 ? 'cone' : 'sphere', rotation: [0, variant * 0.12, -0.4 + t * 0.8], name: `atelier-creature-variant-${variant}-crest` });
  }
}

function partAdder(parent: THREE.Object3D) {
  return (
    scale: [number, number, number],
    position: [number, number, number],
    color: string,
    options: PartOptions = {},
  ): THREE.Mesh => {
    const opacity = options.opacity ?? 1;
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.46,
      metalness: options.metalness ?? 0.18,
      emissive: options.emissive ?? '#000000',
      emissiveIntensity: options.emissiveIntensity ?? 0,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 0.5,
    });
    const mesh = new THREE.Mesh(geometryFor(options.shape ?? 'box'), material);
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    if (options.rotation) mesh.rotation.set(...options.rotation);
    mesh.name = options.name ?? 'atelier-detail';
    mesh.userData.baseRotation = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
    mesh.castShadow = opacity > 0.5;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
}

// Shared, high-resolution primitives keep the increased detail affordable. A
// model still consists entirely of independently transformed 3D meshes.
const GEOMETRIES: Record<Shape, THREE.BufferGeometry> = {
  box: new THREE.BoxGeometry(1, 1, 1, 4, 4, 4),
  sphere: new THREE.SphereGeometry(0.5, 28, 20),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 28, 3),
  cone: new THREE.ConeGeometry(0.5, 1, 28, 3),
  torus: new THREE.TorusGeometry(0.5, 0.105, 14, 32),
  capsule: new THREE.CapsuleGeometry(0.32, 0.4, 10, 18),
};

function geometryFor(shape: Shape): THREE.BufferGeometry {
  return GEOMETRIES[shape];
}

function paletteFor(kind: AtelierModelKind, variant: number, accent: string, body: string): Palette {
  const hash = hashString(kind);
  const hue = ((hash % 41) - 20) * 0.0058 + variant * 0.028;
  const primary = new THREE.Color(body).offsetHSL(hue, 0.055, (variant - 2.5) * 0.017).getStyle();
  const secondary = new THREE.Color(accent).offsetHSL(-hue * 0.62, 0.1, (variant % 3 - 1) * 0.035).getStyle();
  const trim = new THREE.Color(primary).multiplyScalar(0.38).getStyle();
  const dark = new THREE.Color(secondary).multiplyScalar(0.2).getStyle();
  const light = new THREE.Color(primary).lerp(new THREE.Color('#faf3e7'), 0.74).getStyle();
  const glow = ['#f5ca62', '#6be9e4', '#ef7daf', '#aee66d', '#fa895f', '#9caeff'][variant]!;
  const jewel = new THREE.Color(glow).lerp(new THREE.Color(secondary), 0.38).getStyle();
  return {
    primary,
    secondary,
    trim,
    dark,
    light,
    glow,
    jewel,
    glass: new THREE.Color(glow).lerp(new THREE.Color('#bce8eb'), 0.7).getStyle(),
  };
}

function shifted(color: string, amount: number): string {
  return new THREE.Color(color).offsetHSL(amount * 0.015, (amount % 3 - 1) * 0.028, (amount % 5 - 2) * 0.019).getStyle();
}
