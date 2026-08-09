import * as THREE from 'three';
import { hashString } from '../core/rng';
import {
  MASTERWORK_BOUNDS,
  MASTERWORK_CREATURE_KINDS,
  MASTERWORK_HUMANOID_KINDS,
  MASTERWORK_PROP_FAMILIES,
  isMasterworkModelKind,
  masterworkFamilyForKind,
  type MasterworkCreatureKind,
  type MasterworkHumanoidKind,
  type MasterworkModelKind,
  type MasterworkPropKind,
} from './detailedAssetsRound2';

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
}

export { MASTERWORK_BOUNDS };

export function buildMasterworkModel(
  kind: string,
  variant: number,
  accent: string,
  body: string,
): THREE.Group | null {
  if (!isMasterworkModelKind(kind)) return null;
  const model = MASTERWORK_HUMANOID_KINDS.includes(kind as MasterworkHumanoidKind)
    ? buildMasterworkHumanoid(kind as MasterworkHumanoidKind, variant, accent, body)
    : MASTERWORK_CREATURE_KINDS.includes(kind as MasterworkCreatureKind)
      ? buildMasterworkCreature(kind as MasterworkCreatureKind, variant, accent, body)
      : buildMasterworkProp(kind as MasterworkPropKind, variant, accent, body);
  model.name = `${kind}-${variant}`;
  model.userData.detailTier = 'masterwork';
  model.userData.detailVariant = variant;
  model.userData.modelFamily = masterworkFamilyForKind(kind).id;
  return model;
}

function buildMasterworkProp(
  kind: MasterworkPropKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const family = masterworkFamilyForKind(kind);
  const familyIndex = MASTERWORK_PROP_FAMILIES.findIndex((candidate) => candidate.kind === kind);
  const profile = familyIndex % 2;
  const bounds = MASTERWORK_BOUNDS[kind];
  const palette = paletteFor(kind, variant, accent, body);
  const root = new THREE.Group();

  switch (family.form) {
    case 'casework': buildCasework(root, bounds, palette, variant, profile); break;
    case 'chair': buildChair(root, bounds, palette, variant, profile); break;
    case 'celestial': buildCelestial(root, bounds, palette, variant, profile); break;
    case 'audio': buildAudio(root, bounds, palette, variant, profile); break;
    case 'communication': buildCommunication(root, bounds, palette, variant, profile); break;
    case 'service': buildService(root, bounds, palette, variant, profile); break;
    case 'cart': buildCart(root, bounds, palette, variant, profile); break;
    case 'divider': buildDivider(root, bounds, palette, variant, profile); break;
    case 'transit': buildTransit(root, bounds, palette, variant, profile); break;
    case 'optical': buildOptical(root, bounds, palette, variant, profile); break;
    case 'aquatic': buildAquatic(root, bounds, palette, variant, profile); break;
    case 'specimen': buildSpecimen(root, bounds, palette, variant, profile); break;
    case 'ritual': buildRitual(root, bounds, palette, variant, profile); break;
    case 'automaton': buildAutomaton(root, bounds, palette, variant, profile); break;
    case 'display': buildDisplay(root, bounds, palette, variant, profile); break;
    case 'textile': buildTextile(root, bounds, palette, variant, profile); break;
    case 'press': buildPress(root, bounds, palette, variant, profile); break;
    case 'workshop': buildWorkshop(root, bounds, palette, variant, profile); break;
    case 'medical': buildMedical(root, bounds, palette, variant, profile); break;
    default: buildCasework(root, bounds, palette, variant, profile);
  }
  addMasterworkFinish(root, bounds, palette, variant, familyIndex);
  return root;
}

function buildCasework(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  add([b.w * 0.92, b.h * 0.84, b.d * 0.82], [0, b.h * 0.46, 0], p.primary, { name: 'casework-carcass' });
  add([b.w, b.h * 0.07, b.d * 0.94], [0, b.h * 0.92, 0], p.trim, { name: 'casework-crown' });
  add([b.w * 0.98, b.h * 0.06, b.d * 0.9], [0, b.h * 0.06, 0], p.trim, { name: 'casework-plinth' });
  const rows = profile ? 6 : 4;
  const columns = profile ? 4 : 2;
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const width = b.w * 0.78 / columns;
    const height = b.h * 0.67 / rows;
    const x = (column - (columns - 1) / 2) * width;
    const y = b.h * 0.16 + (row + 0.5) * height;
    add([width * 0.86, height * 0.78, b.d * 0.035], [x, y, b.d * 0.43], row % 2 ? p.secondary : p.primary, { name: profile ? 'numbered-key-cubby' : 'bureau-drawer' });
    add([width * 0.16, height * 0.13, b.d * 0.035], [x, y, b.d * 0.47], p.glow, { shape: variant % 2 ? 'torus' : 'cylinder', rotation: [Math.PI / 2, 0, 0], metalness: 0.72, name: 'casework-pull' });
  }
  if (!profile) {
    add([b.w * 0.72, b.h * 0.06, b.d * 0.7], [0, b.h * 0.58, b.d * 0.24], p.light, { rotation: [-0.14, 0, 0], name: 'bureau-writing-leaf' });
    for (let slot = -2; slot <= 2; slot += 1) add([b.w * 0.12, b.h * 0.16, b.d * 0.18], [slot * b.w * 0.14, b.h * 0.72, b.d * 0.23], p.dark, { name: 'bureau-pigeonhole' });
  }
}

function buildChair(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  add([b.w * 0.72, b.h * 0.18, b.d * 0.66], [0, b.h * 0.43, 0], p.primary, { shape: 'capsule', name: 'chair-cushion' });
  add([b.w * 0.72, b.h * 0.48, b.d * 0.16], [0, b.h * 0.7, -b.d * 0.3], p.primary, { shape: 'capsule', rotation: [-0.12 + variant * 0.012, 0, 0], name: 'chair-back' });
  add([b.w * 0.3, b.h * 0.09, b.d * 0.34], [0, b.h * 0.98, -b.d * 0.31], p.secondary, { shape: 'capsule', name: 'chair-headrest' });
  for (const side of [-1, 1]) {
    add([b.w * 0.11, b.h * 0.12, b.d * 0.58], [side * b.w * 0.43, b.h * 0.56, 0], p.secondary, { shape: 'capsule', name: 'chair-arm' });
    add([b.w * 0.055, b.h * 0.36, b.w * 0.055], [side * b.w * 0.43, b.h * 0.29, 0], p.trim, { shape: 'cylinder', name: 'chair-arm-bracket' });
  }
  add([b.w * 0.12, b.h * 0.34, b.w * 0.12], [0, b.h * 0.21, 0], p.trim, { shape: 'cylinder', metalness: 0.72, name: 'hydraulic-column' });
  add([b.w * 0.62, b.h * 0.08, b.w * 0.62], [0, b.h * 0.06, 0], p.dark, { shape: 'cylinder', name: 'chair-base' });
  const footZ = profile ? b.d * 0.55 : b.d * 0.42;
  add([b.w * 0.58, b.h * 0.08, b.d * 0.32], [0, b.h * 0.2, footZ], p.light, { rotation: [-0.2, 0, 0], name: 'chair-footrest' });
  for (let button = 0; button < 8; button += 1) {
    const x = ((button % 4) - 1.5) * b.w * 0.14;
    const y = b.h * (0.61 + Math.floor(button / 4) * 0.18);
    add([b.w * 0.035, b.w * 0.035, b.d * 0.025], [x, y, -b.d * 0.205], p.glow, { shape: 'sphere', metalness: 0.55, name: 'chair-tuft' });
  }
}

function buildCelestial(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  add([b.w * 0.55, b.h * 0.08, b.d * 0.55], [0, b.h * 0.06, 0], p.trim, { shape: 'cylinder', name: 'celestial-base' });
  add([b.w * 0.09, b.h * 0.62, b.w * 0.09], [0, b.h * 0.34, 0], p.dark, { shape: 'cylinder', metalness: 0.66, name: 'celestial-column' });
  const centerY = b.h * 0.68;
  add([b.w * 0.24, b.w * 0.24, b.w * 0.24], [0, centerY, 0], p.glow, { shape: 'sphere', emissive: p.glow, emissiveIntensity: 0.24, name: profile ? 'planetarium-core' : 'orrery-sun' });
  const rings = profile ? 7 : 5;
  for (let ring = 0; ring < rings; ring += 1) {
    const radius = b.w * (0.18 + ring * 0.055);
    add([radius * 2, radius * 2, b.w * 0.025], [0, centerY + (ring - rings / 2) * b.h * 0.025, 0], ring % 2 ? p.secondary : p.trim, { shape: 'torus', rotation: [Math.PI / 2 + ring * 0.16, ring * 0.24, 0], metalness: 0.75, name: 'celestial-orbit' });
    const angle = ring * 1.7 + variant * 0.31;
    add([b.w * (0.05 + ring * 0.008), b.w * (0.05 + ring * 0.008), b.w * (0.05 + ring * 0.008)], [Math.cos(angle) * radius, centerY + Math.sin(angle * 0.6) * b.h * 0.12, Math.sin(angle) * radius], shifted(p.primary, ring), { shape: 'sphere', name: profile ? 'projection-lens' : 'orrery-planet' });
  }
  if (profile) for (let lens = 0; lens < 6; lens += 1) {
    const angle = (lens / 6) * Math.PI * 2;
    add([b.w * 0.12, b.h * 0.16, b.w * 0.12], [Math.cos(angle) * b.w * 0.32, centerY, Math.sin(angle) * b.d * 0.32], p.glass, { shape: 'cylinder', rotation: [Math.PI / 2, angle, 0], emissive: p.glow, emissiveIntensity: 0.16, name: 'planetarium-projector-lens' });
  }
}

function buildAudio(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  add([b.w * 0.78, b.h * 0.48, b.d * 0.72], [0, b.h * 0.26, 0], p.primary, { name: 'audio-cabinet' });
  add([b.w * 0.84, b.h * 0.06, b.d * 0.78], [0, b.h * 0.52, 0], p.trim, { name: 'audio-cabinet-top' });
  for (let drawer = 0; drawer < 3; drawer += 1) {
    add([b.w * 0.62, b.h * 0.1, b.d * 0.035], [0, b.h * (0.14 + drawer * 0.13), b.d * 0.38], drawer % 2 ? p.secondary : p.primary, { name: 'record-drawer' });
    add([b.w * 0.12, b.h * 0.025, b.d * 0.025], [0, b.h * (0.14 + drawer * 0.13), b.d * 0.41], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.68, name: 'record-drawer-pull' });
  }
  const hornY = profile ? b.h * 0.68 : b.h * 0.64;
  add([b.w * 0.18, b.h * 0.34, b.w * 0.18], [0, hornY, 0], p.trim, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], metalness: 0.62, name: 'gramophone-neck' });
  for (let layer = 0; layer < 6 + (variant % 3); layer += 1) {
    const size = b.w * (0.18 + layer * (profile ? 0.09 : 0.055));
    add([size, size, b.w * 0.045], [0, hornY + layer * b.h * 0.045, b.d * (0.2 + layer * 0.055)], layer % 2 ? p.glow : p.secondary, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.58, name: 'gramophone-horn-rim' });
  }
  add([b.w * 0.46, b.h * 0.055, b.d * 0.42], [0, b.h * 0.57, -b.d * 0.08], p.dark, { shape: 'cylinder', name: 'turntable-platter' });
  add([b.w * 0.36, b.h * 0.025, b.w * 0.025], [b.w * 0.12, b.h * 0.61, -b.d * 0.04], p.glow, { shape: 'capsule', rotation: [0, 0, -0.45], name: 'tone-arm' });
}

function buildCommunication(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  add([b.w * 0.9, b.h * (profile ? 0.76 : 0.44), b.d * 0.72], [0, b.h * (profile ? 0.44 : 0.25), -b.d * 0.05], p.primary, { name: 'communication-console' });
  add([b.w * 0.84, b.h * 0.07, b.d * 0.68], [0, b.h * (profile ? 0.77 : 0.49), b.d * 0.08], p.light, { rotation: [-0.18, 0, 0], name: 'communication-desk' });
  const controls = profile ? 18 : 10;
  for (let control = 0; control < controls; control += 1) {
    const columns = profile ? 6 : 5;
    const x = ((control % columns) - (columns - 1) / 2) * b.w * 0.12;
    const y = b.h * (profile ? 0.2 + Math.floor(control / columns) * 0.18 : 0.55 + Math.floor(control / columns) * 0.08);
    add([b.w * 0.045, b.w * 0.045, b.d * 0.035], [x, y, b.d * 0.34], control % 3 ? p.glow : p.light, { shape: control % 4 ? 'cylinder' : 'torus', rotation: [Math.PI / 2, 0, 0], emissive: control % 5 === variant % 5 ? p.glow : undefined, emissiveIntensity: 0.2, name: profile ? 'pneumatic-port' : 'telegraph-key' });
  }
  if (profile) for (let tube = -2; tube <= 2; tube += 1) {
    add([b.w * 0.08, b.h * 0.58, b.w * 0.08], [tube * b.w * 0.16, b.h * 0.58, -b.d * 0.22], shifted(p.glass, tube), { shape: 'capsule', opacity: 0.52, name: 'pneumatic-glass-tube' });
  } else {
    add([b.w * 0.28, b.h * 0.24, b.d * 0.08], [-b.w * 0.3, b.h * 0.68, -b.d * 0.02], p.dark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'telegraph-paper-roll' });
    add([b.w * 0.52, b.h * 0.025, b.d * 0.025], [b.w * 0.08, b.h * 0.63, b.d * 0.15], p.trim, { shape: 'capsule', rotation: [0, 0, -0.12], name: 'telegraph-lever' });
  }
}

function buildService(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  add([b.w * 0.92, b.h * 0.54, b.d * 0.76], [0, b.h * 0.31, 0], p.primary, { name: 'service-counter' });
  add([b.w, b.h * 0.08, b.d * 0.9], [0, b.h * 0.61, 0], p.light, { metalness: 0.36, name: 'service-countertop' });
  if (profile) {
    add([b.w * 0.82, b.h * 0.42, b.d * 0.7], [0, b.h * 0.88, 0], p.glass, { shape: 'capsule', opacity: 0.32, name: 'pastry-glass-dome' });
    for (let cake = -2; cake <= 2; cake += 1) {
      add([b.w * 0.13, b.h * 0.09, b.d * 0.24], [cake * b.w * 0.15, b.h * 0.72, 0], shifted(p.secondary, cake + variant), { shape: 'cylinder', name: 'display-pastry' });
      add([b.w * 0.025, b.h * 0.045, b.w * 0.025], [cake * b.w * 0.15, b.h * 0.79, 0], p.glow, { shape: 'sphere', name: 'pastry-garnish' });
    }
  } else {
    for (let tap = -2; tap <= 2; tap += 1) {
      add([b.w * 0.055, b.h * 0.34, b.w * 0.055], [tap * b.w * 0.16, b.h * 0.83, 0], p.trim, { shape: 'cylinder', metalness: 0.7, name: 'soda-tap-column' });
      add([b.w * 0.12, b.h * 0.12, b.w * 0.12], [tap * b.w * 0.16, b.h * 1.0, 0], shifted(p.glow, tap), { shape: 'sphere', name: 'soda-syrup-globe' });
      add([b.w * 0.08, b.h * 0.05, b.d * 0.22], [tap * b.w * 0.16, b.h * 0.77, b.d * 0.18], p.glow, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'soda-spigot' });
    }
  }
  for (let panel = -2; panel <= 2; panel += 1) add([b.w * 0.14, b.h * 0.32, b.d * 0.03], [panel * b.w * 0.17, b.h * 0.3, b.d * 0.39], panel % 2 ? p.secondary : p.trim, { name: 'service-front-panel' });
}

function buildCart(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  for (const y of [0.38, 0.72]) add([b.w * 0.82, b.h * 0.075, b.d * 0.72], [0, b.h * y, 0], y > 0.5 ? p.light : p.primary, { name: 'cart-shelf' });
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    add([b.w * 0.045, b.h * 0.64, b.w * 0.045], [x * b.w * 0.39, b.h * 0.38, z * b.d * 0.32], p.trim, { shape: 'cylinder', metalness: 0.65, name: 'cart-post' });
    add([b.w * 0.13, b.w * 0.13, b.w * 0.055], [x * b.w * 0.39, b.h * 0.06, z * b.d * 0.32], p.dark, { shape: 'torus', rotation: [0, Math.PI / 2, 0], name: 'cart-wheel' });
  }
  if (profile) {
    for (let vase = -2; vase <= 2; vase += 1) {
      add([b.w * 0.1, b.h * 0.22, b.w * 0.1], [vase * b.w * 0.16, b.h * 0.83, 0], p.glass, { shape: 'capsule', opacity: 0.5, name: 'flower-vase' });
      for (let flower = 0; flower < 3; flower += 1) add([b.w * 0.08, b.w * 0.08, b.w * 0.08], [vase * b.w * 0.16 + (flower - 1) * b.w * 0.04, b.h * (1.0 + flower * 0.035), 0], shifted(p.secondary, vase + flower + variant), { shape: 'sphere', name: 'funeral-flower' });
    }
  } else {
    for (let item = -2; item <= 2; item += 1) {
      add([b.w * 0.11, b.h * 0.12, b.w * 0.11], [item * b.w * 0.14, b.h * 0.83, 0], item % 2 ? p.glow : p.light, { shape: item % 2 ? 'cylinder' : 'sphere', metalness: 0.48, name: 'tea-service-piece' });
      add([b.w * 0.035, b.h * 0.09, b.w * 0.035], [item * b.w * 0.14, b.h * 0.94, 0], p.trim, { shape: 'capsule', name: 'tea-service-handle' });
    }
  }
}

function buildDivider(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  if (profile) {
    add([b.w * 0.18, b.h * 0.7, b.d * 0.18], [0, b.h * 0.42, 0], p.trim, { shape: 'cylinder', name: 'coat-island-column' });
    add([b.w * 0.72, b.h * 0.09, b.d * 0.72], [0, b.h * 0.8, 0], p.primary, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'coat-island-ring' });
    for (let hook = 0; hook < 12; hook += 1) {
      const angle = (hook / 12) * Math.PI * 2;
      add([b.w * 0.04, b.h * 0.24, b.w * 0.04], [Math.cos(angle) * b.w * 0.36, b.h * 0.73, Math.sin(angle) * b.d * 0.36], hook % 2 ? p.glow : p.trim, { shape: 'capsule', rotation: [0, 0, Math.cos(angle) * 0.6], metalness: 0.62, name: 'coat-hook' });
    }
    for (let coat = 0; coat < 6; coat += 1) {
      const angle = (coat / 6) * Math.PI * 2 + variant * 0.13;
      add([b.w * 0.24, b.h * 0.48, b.d * 0.12], [Math.cos(angle) * b.w * 0.33, b.h * 0.45, Math.sin(angle) * b.d * 0.33], shifted(p.secondary, coat), { shape: 'capsule', rotation: [0, angle, 0], name: 'checked-coat' });
    }
  } else {
    const panels = 5;
    for (let panel = 0; panel < panels; panel += 1) {
      const x = (panel - 2) * b.w * 0.19;
      const angle = (panel - 2) * 0.11;
      add([b.w * 0.18, b.h * 0.84, b.d * 0.12], [x, b.h * 0.48, Math.abs(panel - 2) * b.d * 0.12], panel % 2 ? p.secondary : p.primary, { rotation: [0, angle, 0], name: 'divider-panel' });
      for (let motif = 0; motif < 4; motif += 1) add([b.w * 0.04, b.h * 0.08, b.d * 0.025], [x, b.h * (0.24 + motif * 0.18), b.d * 0.08 + Math.abs(panel - 2) * b.d * 0.12], motif % 2 ? p.glow : p.light, { shape: motif % 2 ? 'torus' : 'sphere', rotation: [Math.PI / 2, 0, 0], name: 'embroidered-motif' });
      add([b.w * 0.035, b.h * 0.92, b.w * 0.035], [x - b.w * 0.095, b.h * 0.48, 0], p.trim, { shape: 'cylinder', name: 'divider-hinge' });
    }
  }
}

function buildTransit(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  if (profile) {
    add([b.w * 0.86, b.h * 0.12, b.d * 0.82], [0, b.h * 0.58, 0], p.trim, { name: 'chart-table-frame' });
    add([b.w * 0.8, b.h * 0.055, b.d * 0.76], [0, b.h * 0.67, 0], p.glass, { opacity: 0.42, emissive: p.glow, emissiveIntensity: 0.12, name: 'illuminated-chart' });
    for (const x of [-1, 1]) for (const z of [-1, 1]) add([b.w * 0.06, b.h * 0.56, b.w * 0.06], [x * b.w * 0.36, b.h * 0.29, z * b.d * 0.32], p.trim, { shape: 'cylinder', name: 'chart-table-leg' });
    for (let line = -4; line <= 4; line += 1) add([b.w * 0.72, b.h * 0.012, b.d * 0.012], [0, b.h * 0.705, line * b.d * 0.075], line % 2 ? p.glow : p.secondary, { rotation: [0, line * 0.07 + variant * 0.012, 0], emissive: p.glow, emissiveIntensity: 0.15, name: 'chart-course-line' });
    for (let instrument = -2; instrument <= 2; instrument += 1) add([b.w * 0.1, b.h * 0.1, b.w * 0.1], [instrument * b.w * 0.15, b.h * 0.76, -b.d * 0.24], p.glow, { shape: instrument % 2 ? 'torus' : 'cylinder', rotation: [Math.PI / 2, 0, 0], metalness: 0.62, name: 'navigation-instrument' });
  } else {
    add([b.w * 0.84, b.h * 0.18, b.d * 0.72], [0, b.h * 0.34, 0], p.primary, { shape: 'capsule', name: 'compartment-seat' });
    add([b.w * 0.84, b.h * 0.54, b.d * 0.16], [0, b.h * 0.68, -b.d * 0.32], p.primary, { shape: 'capsule', name: 'compartment-back' });
    for (const side of [-1, 1]) {
      add([b.w * 0.09, b.h * 0.54, b.d * 0.72], [side * b.w * 0.46, b.h * 0.44, 0], p.trim, { name: 'compartment-divider' });
      add([b.w * 0.07, b.h * 0.12, b.d * 0.58], [side * b.w * 0.39, b.h * 0.5, 0], p.secondary, { shape: 'capsule', name: 'compartment-arm' });
    }
    for (let tuft = 0; tuft < 12; tuft += 1) add([b.w * 0.03, b.w * 0.03, b.d * 0.022], [((tuft % 6) - 2.5) * b.w * 0.12, b.h * (0.58 + Math.floor(tuft / 6) * 0.2), -b.d * 0.215], p.glow, { shape: 'sphere', name: 'railway-tuft' });
    add([b.w * 0.72, b.h * 0.025, b.d * 0.58], [0, b.h * 0.46, b.d * 0.02], p.light, { name: 'seat-antimacassar' });
  }
}

function buildOptical(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  if (profile) {
    add([b.w * 0.56, b.h * 0.08, b.d * 0.56], [0, b.h * 0.06, 0], p.trim, { shape: 'cylinder', name: 'helmet-plinth' });
    add([b.w * 0.12, b.h * 0.48, b.w * 0.12], [0, b.h * 0.28, 0], p.dark, { shape: 'cylinder', name: 'helmet-stand' });
    add([b.w * 0.66, b.h * 0.48, b.d * 0.62], [0, b.h * 0.68, 0], p.glow, { shape: 'sphere', metalness: 0.72, name: 'diving-helmet' });
    for (const x of [-1, 0, 1]) add([b.w * 0.16, b.w * 0.16, b.d * 0.07], [x * b.w * 0.22, b.h * 0.7, b.d * 0.32], p.glass, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], opacity: 0.5, emissive: p.glow, emissiveIntensity: 0.12, name: 'helmet-porthole' });
    for (let bolt = 0; bolt < 12; bolt += 1) {
      const angle = (bolt / 12) * Math.PI * 2;
      add([b.w * 0.035, b.w * 0.035, b.w * 0.035], [Math.cos(angle) * b.w * 0.38, b.h * 0.5, Math.sin(angle) * b.d * 0.38], p.light, { shape: 'sphere', metalness: 0.82, name: 'helmet-bolt' });
    }
  } else {
    add([b.w * 0.62, b.h * 0.08, b.d * 0.62], [0, b.h * 0.05, 0], p.trim, { shape: 'cylinder', name: 'telescope-base' });
    for (const side of [-1, 1]) add([b.w * 0.06, b.h * 0.72, b.w * 0.06], [side * b.w * 0.25, b.h * 0.36, 0], p.trim, { shape: 'capsule', rotation: [0, 0, side * 0.16], name: 'telescope-tripod' });
    add([b.w * 0.12, b.h * 0.82, b.w * 0.12], [0, b.h * 0.39, -b.d * 0.1], p.trim, { shape: 'capsule', rotation: [-0.35, 0, 0], name: 'telescope-third-leg' });
    add([b.w * 0.26, b.h * 0.24, b.d * 0.9], [0, b.h * 0.74, 0], p.primary, { shape: 'cylinder', rotation: [Math.PI / 2, 0.15 + variant * 0.018, 0], metalness: 0.42, name: 'telescope-tube' });
    for (let ring = -3; ring <= 3; ring += 1) add([b.w * 0.31, b.w * 0.31, b.d * 0.035], [ring * b.d * 0.11, b.h * (0.74 + ring * 0.018), ring * b.d * 0.115], ring % 2 ? p.glow : p.trim, { shape: 'torus', rotation: [0, Math.PI / 2, 0], metalness: 0.7, name: 'telescope-focus-ring' });
    add([b.w * 0.34, b.w * 0.34, b.d * 0.08], [b.d * 0.42, b.h * 0.81, b.d * 0.44], p.glass, { shape: 'cylinder', rotation: [0, Math.PI / 2, 0], opacity: 0.48, emissive: p.glow, emissiveIntensity: 0.16, name: 'telescope-objective' });
  }
}

function buildAquatic(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  add([b.w * 0.9, b.h * 0.82, b.d * 0.78], [0, b.h * 0.46, 0], profile ? p.trim : p.primary, { name: profile ? 'taxidermy-case-frame' : 'filter-bank-body' });
  if (profile) {
    add([b.w * 0.82, b.h * 0.72, b.d * 0.72], [0, b.h * 0.5, b.d * 0.04], p.glass, { opacity: 0.3, name: 'taxidermy-case-glass' });
    add([b.w * 0.74, b.h * 0.13, b.d * 0.62], [0, b.h * 0.16, 0], p.secondary, { name: 'taxidermy-habitat' });
    add([b.w * 0.52, b.h * 0.25, b.d * 0.42], [0, b.h * 0.47, 0], p.light, { shape: 'sphere', name: 'taxidermy-body' });
    for (const side of [-1, 1]) {
      add([b.w * 0.08, b.h * 0.32, b.w * 0.08], [side * b.w * 0.22, b.h * 0.31, side * b.d * 0.12], p.dark, { shape: 'capsule', rotation: [0, 0, side * 0.42], name: 'taxidermy-leg' });
      add([b.w * 0.07, b.h * 0.38, b.w * 0.07], [side * b.w * 0.16, b.h * 0.73, b.d * 0.1], p.trim, { shape: 'capsule', rotation: [0, 0, side * 0.28], name: 'taxidermy-antler' });
    }
    for (let grass = -4; grass <= 4; grass += 1) add([b.w * 0.025, b.h * (0.18 + (grass % 3) * 0.04), b.w * 0.025], [grass * b.w * 0.08, b.h * (0.23 + variant * 0.004), b.d * 0.2], shifted('#71884d', grass), { shape: 'cone', rotation: [0, 0, grass * 0.04], name: 'habitat-grass' });
  } else {
    for (let column = -2; column <= 2; column += 1) {
      add([b.w * 0.13, b.h * 0.62, b.d * 0.38], [column * b.w * 0.17, b.h * 0.5, b.d * 0.16], column % 2 ? p.glass : p.secondary, { shape: 'capsule', opacity: column % 2 ? 0.45 : 1, name: 'filter-cylinder' });
      add([b.w * 0.1, b.w * 0.1, b.d * 0.08], [column * b.w * 0.17, b.h * 0.82, b.d * 0.19], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.6, name: 'filter-gauge' });
    }
    for (let pipe = -3; pipe <= 3; pipe += 1) add([b.w * 0.035, b.h * 0.68, b.w * 0.035], [pipe * b.w * 0.12, b.h * 0.48, -b.d * 0.38], pipe % 2 ? p.glow : p.trim, { shape: 'cylinder', metalness: 0.72, name: 'filter-pipe' });
  }
}

function buildSpecimen(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  if (profile) {
    add([b.w * 0.62, b.h * 0.12, b.d * 0.62], [0, b.h * 0.08, 0], p.trim, { name: 'reliquary-base' });
    add([b.w * 0.35, b.h * 0.54, b.d * 0.35], [0, b.h * 0.39, 0], p.primary, { name: 'reliquary-pedestal' });
    add([b.w * 0.66, b.h * 0.48, b.d * 0.66], [0, b.h * 0.76, 0], p.glass, { shape: 'capsule', opacity: 0.3, name: 'reliquary-vitrine' });
    add([b.w * 0.28, b.h * 0.28, b.d * 0.28], [0, b.h * 0.76, 0], p.glow, { shape: variant % 2 ? 'torus' : 'sphere', emissive: p.glow, emissiveIntensity: 0.38, metalness: 0.55, name: 'reliquary-object' });
    for (let ray = 0; ray < 12; ray += 1) {
      const angle = (ray / 12) * Math.PI * 2;
      add([b.w * 0.025, b.h * 0.2, b.w * 0.025], [Math.cos(angle) * b.w * 0.25, b.h * 0.76 + Math.sin(angle) * b.h * 0.13, b.d * 0.08], p.glow, { shape: 'capsule', rotation: [0, 0, -angle], emissive: p.glow, emissiveIntensity: 0.16, name: 'reliquary-ray' });
    }
  } else {
    add([b.w * 0.9, b.h * 0.84, b.d * 0.76], [0, b.h * 0.47, 0], p.primary, { name: 'specimen-drawer-case' });
    for (let row = 0; row < 6; row += 1) for (let column = 0; column < 3; column += 1) {
      const x = (column - 1) * b.w * 0.25;
      const y = b.h * (0.15 + row * 0.13);
      add([b.w * 0.22, b.h * 0.1, b.d * 0.035], [x, y, b.d * 0.4], row % 2 ? p.secondary : p.primary, { name: 'insect-drawer' });
      add([b.w * 0.06, b.h * 0.025, b.d * 0.025], [x, y, b.d * 0.44], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.68, name: 'insect-drawer-pull' });
      if ((row + column + variant) % 3 === 0) add([b.w * 0.035, b.h * 0.045, b.d * 0.02], [x + b.w * 0.07, y, b.d * 0.45], p.light, { shape: 'sphere', name: 'specimen-label-pin' });
    }
  }
}

function buildRitual(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  if (profile) {
    add([b.w * 0.84, b.h * 0.56, b.d * 0.72], [0, b.h * 0.3, 0], p.primary, { name: 'music-box-case' });
    add([b.w * 0.9, b.h * 0.08, b.d * 0.78], [0, b.h * 0.61, 0], p.trim, { name: 'music-box-lid' });
    add([b.w * 0.48, b.h * 0.08, b.d * 0.46], [0, b.h * 0.67, 0], p.glow, { shape: 'cylinder', metalness: 0.72, name: 'music-box-disc' });
    for (let tooth = 0; tooth < 16; tooth += 1) {
      const angle = (tooth / 16) * Math.PI * 2;
      add([b.w * 0.025, b.h * (0.08 + (tooth % 3) * 0.02), b.w * 0.025], [Math.cos(angle) * b.w * 0.24, b.h * 0.74, Math.sin(angle) * b.d * 0.24], tooth % 2 ? p.light : p.secondary, { shape: 'cylinder', name: 'music-box-pin' });
    }
    for (let dancer = -1; dancer <= 1; dancer += 1) add([b.w * 0.08, b.h * 0.24, b.w * 0.08], [dancer * b.w * 0.18, b.h * 0.84, 0], shifted(p.secondary, dancer + variant), { shape: 'capsule', name: 'music-box-figure' });
  } else {
    for (let tier = 0; tier < 4; tier += 1) {
      const width = b.w * (0.9 - tier * 0.14);
      add([width, b.h * 0.07, b.d * 0.64], [0, b.h * (0.14 + tier * 0.2), 0], p.trim, { name: 'votive-tier' });
      const candles = 7 - tier;
      for (let candle = 0; candle < candles; candle += 1) {
        const x = (candle - (candles - 1) / 2) * width / Math.max(1, candles);
        const y = b.h * (0.23 + tier * 0.2);
        add([b.w * 0.035, b.h * (0.11 + ((candle + variant) % 3) * 0.025), b.w * 0.035], [x, y, 0], candle % 2 ? p.light : p.secondary, { shape: 'cylinder', name: 'votive-candle' });
        add([b.w * 0.028, b.h * 0.055, b.w * 0.028], [x, y + b.h * 0.09, 0], p.glow, { shape: 'cone', emissive: p.glow, emissiveIntensity: 0.5, name: 'votive-flame' });
      }
    }
  }
}

function buildAutomaton(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  add([b.w * 0.94, b.h * 0.08, b.d * 0.88], [0, b.h * 0.08, 0], p.trim, { name: 'stage-base' });
  add([b.w * 0.92, b.h * 0.12, b.d * 0.72], [0, b.h * 0.22, 0], p.primary, { name: 'stage-deck' });
  for (const side of [-1, 1]) {
    add([b.w * 0.09, b.h * 0.72, b.d * 0.12], [side * b.w * 0.44, b.h * 0.58, -b.d * 0.28], p.trim, { name: 'proscenium-column' });
    add([b.w * 0.16, b.h * 0.18, b.d * 0.16], [side * b.w * 0.44, b.h * 0.96, -b.d * 0.28], p.glow, { shape: 'sphere', name: 'proscenium-finial' });
  }
  add([b.w * 0.96, b.h * 0.1, b.d * 0.16], [0, b.h * 0.94, -b.d * 0.28], p.trim, { name: 'proscenium-arch' });
  const actors = profile ? 4 : 3;
  for (let actor = 0; actor < actors; actor += 1) {
    const x = (actor - (actors - 1) / 2) * b.w * 0.2;
    add([b.w * 0.11, b.h * 0.28, b.d * 0.11], [x, b.h * 0.48, 0], shifted(p.secondary, actor + variant), { shape: 'capsule', name: profile ? 'puppet-body' : 'automaton-body' });
    add([b.w * 0.12, b.w * 0.12, b.w * 0.12], [x, b.h * 0.67, 0], p.light, { shape: 'sphere', name: profile ? 'puppet-head' : 'automaton-head' });
    for (const side of [-1, 1]) add([b.w * 0.035, b.h * 0.25, b.w * 0.035], [x + side * b.w * 0.1, b.h * 0.48, 0], p.trim, { shape: 'capsule', rotation: [0, 0, side * (0.3 + actor * 0.08)], name: 'stage-actor-arm' });
    if (profile) add([b.w * 0.012, b.h * 0.42, b.w * 0.012], [x, b.h * 0.82, 0], p.light, { shape: 'cylinder', name: 'puppet-string' });
  }
  for (let gear = 0; gear < 6; gear += 1) add([b.w * (0.09 + (gear % 2) * 0.035), b.w * (0.09 + (gear % 2) * 0.035), b.d * 0.035], [((gear % 3) - 1) * b.w * 0.25, b.h * (0.28 + Math.floor(gear / 3) * 0.18), -b.d * 0.37], gear % 2 ? p.glow : p.trim, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.72, name: 'stage-clockwork' });
}

function buildDisplay(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  if (profile) {
    add([b.w * 0.92, b.h * 0.68, b.d * 0.78], [0, b.h * 0.37, 0], p.primary, { name: 'sideboard-body' });
    add([b.w, b.h * 0.08, b.d * 0.9], [0, b.h * 0.75, 0], p.light, { name: 'sideboard-top' });
    for (let door = -2; door <= 2; door += 1) {
      add([b.w * 0.15, b.h * 0.48, b.d * 0.035], [door * b.w * 0.18, b.h * 0.38, b.d * 0.4], door % 2 ? p.secondary : p.primary, { name: 'sideboard-door' });
      add([b.w * 0.04, b.w * 0.04, b.d * 0.03], [door * b.w * 0.18, b.h * 0.38, b.d * 0.44], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.68, name: 'sideboard-pull' });
    }
    for (let vessel = -3; vessel <= 3; vessel += 1) add([b.w * 0.08, b.h * (0.14 + (vessel % 3) * 0.035), b.w * 0.08], [vessel * b.w * 0.11, b.h * 0.88, 0], shifted(p.glow, vessel + variant), { shape: vessel % 2 ? 'capsule' : 'cylinder', metalness: 0.58, name: 'banquet-vessel' });
  } else {
    add([b.w * 0.7, b.h * 0.1, b.d * 0.7], [0, b.h * 0.08, 0], p.trim, { shape: 'cylinder', name: 'fitting-platform' });
    add([b.w * 0.1, b.h * 0.48, b.w * 0.1], [0, b.h * 0.3, 0], p.dark, { shape: 'cylinder', name: 'mannequin-stand' });
    add([b.w * 0.38, b.h * 0.38, b.d * 0.28], [0, b.h * 0.68, 0], p.light, { shape: 'capsule', name: 'mannequin-torso' });
    add([b.w * 0.24, b.h * 0.24, b.w * 0.24], [0, b.h * 0.93, 0], p.light, { shape: 'sphere', name: 'mannequin-head' });
    for (const side of [-1, 1]) {
      add([b.w * 0.07, b.h * 0.52, b.w * 0.07], [side * b.w * 0.28, b.h * 0.59, 0], p.light, { shape: 'capsule', rotation: [0, 0, side * 0.14], name: 'mannequin-arm' });
      add([b.w * 0.07, b.h * 0.54, b.w * 0.07], [side * b.w * 0.15, b.h * 0.31, 0], p.light, { shape: 'capsule', rotation: [0, 0, side * -0.06], name: 'mannequin-leg' });
    }
    for (let pin = 0; pin < 12; pin += 1) {
      const angle = (pin / 12) * Math.PI * 2;
      add([b.w * 0.025, b.w * 0.025, b.d * 0.018], [Math.cos(angle) * b.w * 0.19, b.h * (0.68 + Math.sin(angle) * 0.15), b.d * 0.16], pin % 2 ? p.glow : p.secondary, { shape: 'sphere', name: 'fitting-pin' });
    }
  }
}

function buildTextile(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  if (profile) {
    add([b.w * 0.78, b.h * 0.1, b.d * 0.78], [0, b.h * 0.06, 0], p.trim, { shape: 'cylinder', name: 'kiln-base' });
    add([b.w * 0.74, b.h * 0.72, b.d * 0.74], [0, b.h * 0.43, 0], p.primary, { shape: 'cylinder', name: 'kiln-body' });
    add([b.w * 0.5, b.h * 0.46, b.d * 0.08], [0, b.h * 0.45, b.d * 0.39], p.dark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], emissive: '#7d250e', emissiveIntensity: 0.2, name: 'kiln-mouth' });
    for (let band = 0; band < 6; band += 1) add([b.w * 0.78, b.w * 0.78, b.h * 0.025], [0, b.h * (0.16 + band * 0.12), 0], band % 2 ? p.glow : p.trim, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.65, name: 'kiln-band' });
    for (let tile = 0; tile < 10; tile += 1) {
      const angle = (tile / 10) * Math.PI * 2;
      add([b.w * 0.09, b.h * 0.1, b.d * 0.025], [Math.cos(angle) * b.w * 0.38, b.h * (0.32 + (tile % 3) * 0.12), Math.sin(angle) * b.d * 0.38], shifted(p.secondary, tile + variant), { rotation: [0, angle, 0], name: 'kiln-glazed-tile' });
    }
  } else {
    for (const side of [-1, 1]) add([b.w * 0.09, b.h * 0.9, b.d * 0.1], [side * b.w * 0.43, b.h * 0.48, 0], p.trim, { name: 'loom-upright' });
    for (const y of [0.1, 0.42, 0.84, 0.94]) add([b.w * 0.94, b.h * 0.055, b.d * 0.1], [0, b.h * y, 0], p.trim, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'loom-crossbar' });
    for (let thread = -8; thread <= 8; thread += 1) add([b.w * 0.012, b.h * 0.7, b.d * 0.012], [thread * b.w * 0.047, b.h * 0.57, 0], shifted(thread % 2 ? p.secondary : p.glow, thread + variant), { shape: 'cylinder', name: 'loom-warp-thread' });
    for (let shuttle = -2; shuttle <= 2; shuttle += 1) add([b.w * 0.28, b.h * 0.035, b.d * 0.08], [shuttle * b.w * 0.12, b.h * (0.32 + shuttle * 0.08), b.d * 0.1], p.light, { shape: 'capsule', rotation: [0, 0, shuttle * 0.06], name: 'loom-shuttle' });
  }
}

function buildPress(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  if (profile) {
    add([b.w * 0.92, b.h * 0.86, b.d * 0.78], [0, b.h * 0.47, 0], p.primary, { name: 'type-case-cabinet' });
    for (let row = 0; row < 8; row += 1) for (let column = 0; column < 5; column += 1) {
      const x = (column - 2) * b.w * 0.15;
      const y = b.h * (0.12 + row * 0.105);
      add([b.w * 0.12, b.h * 0.075, b.d * 0.028], [x, y, b.d * 0.4], (row + column) % 2 ? p.secondary : p.primary, { name: 'type-case-drawer' });
      if ((row + column + variant) % 4 === 0) add([b.w * 0.03, b.h * 0.022, b.d * 0.02], [x, y, b.d * 0.43], p.glow, { shape: 'sphere', name: 'type-case-label' });
    }
  } else {
    add([b.w * 0.88, b.h * 0.08, b.d * 0.78], [0, b.h * 0.08, 0], p.trim, { name: 'press-base' });
    for (const side of [-1, 1]) add([b.w * 0.09, b.h * 0.82, b.d * 0.12], [side * b.w * 0.38, b.h * 0.48, 0], p.trim, { name: 'press-column' });
    add([b.w * 0.86, b.h * 0.09, b.d * 0.16], [0, b.h * 0.9, 0], p.trim, { name: 'press-crown' });
    add([b.w * 0.68, b.h * 0.09, b.d * 0.62], [0, b.h * 0.34, 0], p.light, { name: 'press-bed' });
    add([b.w * 0.62, b.h * 0.13, b.d * 0.56], [0, b.h * 0.61, 0], p.dark, { name: 'press-platen' });
    add([b.w * 0.1, b.h * 0.54, b.w * 0.1], [0, b.h * 0.72, 0], p.glow, { shape: 'cylinder', metalness: 0.72, name: 'press-screw' });
    add([b.w * 0.76, b.h * 0.055, b.w * 0.055], [0, b.h * 0.84, b.d * 0.18], p.glow, { shape: 'capsule', rotation: [0, 0, -0.2 + variant * 0.035], metalness: 0.7, name: 'press-lever' });
    for (let roller = -2; roller <= 2; roller += 1) add([b.w * 0.52, b.h * 0.08, b.h * 0.08], [roller * b.w * 0.08, b.h * (0.42 + roller * 0.055), b.d * 0.2], roller % 2 ? p.secondary : p.glow, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'ink-roller' });
    for (let gear = 0; gear < 8; gear += 1) add([b.w * (0.07 + (gear % 3) * 0.02), b.w * (0.07 + (gear % 3) * 0.02), b.d * 0.03], [((gear % 2) * 2 - 1) * b.w * 0.42, b.h * (0.22 + Math.floor(gear / 2) * 0.14), 0], gear % 2 ? p.glow : p.trim, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.7, name: 'press-gear' });
  }
}

function buildWorkshop(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  if (profile) {
    add([b.w * 0.58, b.h * 0.08, b.d * 0.58], [0, b.h * 0.06, 0], p.trim, { shape: 'cylinder', name: 'lamp-base' });
    add([b.w * 0.1, b.h * 0.58, b.w * 0.1], [0, b.h * 0.34, 0], p.trim, { shape: 'capsule', rotation: [0, 0, -0.12], name: 'lamp-lower-arm' });
    add([b.w * 0.1, b.h * 0.52, b.w * 0.1], [b.w * 0.2, b.h * 0.72, 0], p.trim, { shape: 'capsule', rotation: [0, 0, 0.62], name: 'lamp-upper-arm' });
    for (const joint of [[0, b.h * 0.62], [b.w * 0.38, b.h * 0.9]] as const) add([b.w * 0.16, b.w * 0.16, b.w * 0.16], [joint[0], joint[1], 0], p.glow, { shape: 'sphere', metalness: 0.68, name: 'lamp-joint' });
    add([b.w * 0.5, b.h * 0.28, b.d * 0.5], [b.w * 0.46, b.h * 0.96, 0], p.secondary, { shape: 'cone', rotation: [0, 0, -Math.PI / 2], metalness: 0.5, name: 'watchmaker-shade' });
    add([b.w * 0.2, b.w * 0.2, b.w * 0.08], [b.w * 0.64, b.h * 0.96, 0], p.glass, { shape: 'cylinder', rotation: [0, Math.PI / 2, 0], emissive: p.glow, emissiveIntensity: 0.55, name: 'watchmaker-lens' });
    for (let spring = 0; spring < 10 + variant; spring += 1) add([b.w * 0.08, b.w * 0.08, b.w * 0.02], [b.w * (0.1 + spring * 0.03), b.h * (0.55 + spring * 0.038), b.d * 0.08], spring % 2 ? p.glow : p.trim, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'lamp-spring' });
  } else {
    add([b.w * 0.94, b.h * 0.09, b.d * 0.82], [0, b.h * 0.58, 0], p.light, { name: 'clock-bench-top' });
    for (const side of [-1, 1]) add([b.w * 0.22, b.h * 0.54, b.d * 0.68], [side * b.w * 0.34, b.h * 0.29, 0], p.primary, { name: 'clock-bench-pedestal' });
    for (let drawer = 0; drawer < 6; drawer += 1) add([b.w * 0.18, b.h * 0.11, b.d * 0.035], [((drawer % 2) * 2 - 1) * b.w * 0.34, b.h * (0.13 + Math.floor(drawer / 2) * 0.17), b.d * 0.36], drawer % 2 ? p.secondary : p.primary, { name: 'clock-bench-drawer' });
    for (let gear = 0; gear < 12; gear += 1) add([b.w * (0.06 + (gear % 4) * 0.018), b.w * (0.06 + (gear % 4) * 0.018), b.d * 0.025], [((gear % 6) - 2.5) * b.w * 0.12, b.h * (0.7 + Math.floor(gear / 6) * 0.18), b.d * 0.22], gear % 2 ? p.glow : p.trim, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.72, name: 'loose-clockwork' });
    add([b.w * 0.7, b.h * 0.42, b.d * 0.08], [0, b.h * 0.82, -b.d * 0.24], p.primary, { name: 'tool-board' });
  }
}

function buildMedical(root: THREE.Group, b: Bounds, p: Palette, variant: number, profile: number): void {
  const add = partAdder(root);
  if (profile) {
    add([b.w * 0.82, b.h * 0.62, b.d * 0.82], [0, b.h * 0.48, 0], p.primary, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], metalness: 0.55, name: 'iron-lung-cylinder' });
    for (let band = -4; band <= 4; band += 1) add([b.w * 0.86, b.w * 0.86, b.d * 0.035], [0, b.h * 0.48, band * b.d * 0.095], band % 2 ? p.glow : p.trim, { shape: 'torus', metalness: 0.72, name: 'iron-lung-rib' });
    for (const side of [-1, 1]) {
      add([b.w * 0.08, b.h * 0.32, b.w * 0.08], [side * b.w * 0.36, b.h * 0.18, -b.d * 0.28], p.trim, { shape: 'cylinder', name: 'iron-lung-leg' });
      add([b.w * 0.13, b.w * 0.13, b.w * 0.055], [side * b.w * 0.36, b.h * 0.04, -b.d * 0.28], p.dark, { shape: 'torus', rotation: [0, Math.PI / 2, 0], name: 'iron-lung-wheel' });
    }
    add([b.w * 0.44, b.h * 0.34, b.d * 0.12], [0, b.h * 0.48, b.d * 0.45], p.dark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'iron-lung-aperture' });
    for (let gauge = -2; gauge <= 2; gauge += 1) add([b.w * 0.11, b.w * 0.11, b.d * 0.035], [gauge * b.w * 0.16, b.h * 0.84, 0], p.glass, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], emissive: p.glow, emissiveIntensity: 0.12, name: 'iron-lung-gauge' });
  } else {
    add([b.w * 0.84, b.h * 0.74, b.d * 0.72], [0, b.h * 0.42, 0], p.primary, { name: 'electrotherapy-cabinet' });
    for (let dial = 0; dial < 15; dial += 1) {
      const x = ((dial % 5) - 2) * b.w * 0.14;
      const y = b.h * (0.18 + Math.floor(dial / 5) * 0.22);
      add([b.w * 0.09, b.w * 0.09, b.d * 0.04], [x, y, b.d * 0.38], dial % 2 ? p.glass : p.glow, { shape: dial % 3 ? 'cylinder' : 'torus', rotation: [Math.PI / 2, 0, 0], emissive: dial === variant ? p.glow : undefined, emissiveIntensity: 0.22, name: 'electrotherapy-dial' });
    }
    for (const side of [-1, 1]) {
      add([b.w * 0.06, b.h * 0.42, b.w * 0.06], [side * b.w * 0.34, b.h * 0.92, 0], p.trim, { shape: 'cylinder', name: 'electrode-arm' });
      add([b.w * 0.22, b.h * 0.18, b.d * 0.2], [side * b.w * 0.34, b.h * 1.05, b.d * 0.08], p.glass, { shape: 'sphere', emissive: p.glow, emissiveIntensity: 0.28, opacity: 0.64, name: 'electrode-globe' });
    }
  }
}

function addMasterworkFinish(root: THREE.Group, b: Bounds, p: Palette, variant: number, family: number): void {
  const add = partAdder(root);
  for (const side of [-1, 1]) {
    add([b.w * 0.035, b.h * 0.72, b.w * 0.035], [side * b.w * 0.47, b.h * 0.48, b.d * 0.43], p.glow, { shape: 'cylinder', metalness: 0.7, name: 'masterwork-edge-inlay' });
    for (let corner = 0; corner < 3; corner += 1) add([b.w * 0.045, b.w * 0.045, b.w * 0.03], [side * b.w * 0.47, b.h * (0.17 + corner * 0.31), b.d * 0.47], corner % 2 ? p.light : p.glow, { shape: 'sphere', metalness: 0.72, name: 'masterwork-fastener' });
  }
  for (let mark = 0; mark < 6; mark += 1) {
    const angle = (mark / 6) * Math.PI * 2 + family * 0.13;
    add([b.w * (0.035 + (mark % 2) * 0.012), b.h * 0.04, b.d * 0.022], [Math.cos(angle) * b.w * 0.27, b.h * (0.16 + mark * 0.11), b.d * 0.515], mark % 2 ? p.secondary : p.glow, { shape: mark % 3 ? 'sphere' : 'torus', rotation: [Math.PI / 2, 0, angle], name: 'masterwork-maker-mark' });
  }
  for (let flourish = 0; flourish <= variant; flourish += 1) {
    const x = (flourish - variant / 2) * b.w * 0.065;
    add([b.w * 0.035, b.h * (0.055 + flourish * 0.006), b.d * 0.024], [x, b.h * (0.96 + (flourish % 2) * 0.025), b.d * 0.12], shifted(p.glow, flourish + family), { shape: flourish % 2 ? 'cone' : 'sphere', name: 'variant-masterwork-finial' });
  }
}

function buildMasterworkHumanoid(
  kind: MasterworkHumanoidKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const b = MASTERWORK_BOUNDS[kind];
  const p = paletteFor(kind, variant, accent, body);
  const root = new THREE.Group();
  const add = partAdder(root);
  const role = MASTERWORK_HUMANOID_KINDS.indexOf(kind);
  const shoulderY = b.h * 0.72;
  const hipY = b.h * 0.4;

  add([b.w * 0.48, b.h * 0.34, b.d * 0.56], [0, b.h * 0.58, 0], role === 1 ? p.glow : p.primary, { shape: 'capsule', name: 'masterwork-torso' });
  add([b.w * 0.33, b.h * 0.22, b.d * 0.38], [0, b.h * 0.87, b.d * 0.02], p.light, { shape: 'sphere', name: 'rig-head' });
  add([b.w * 0.14, b.h * 0.09, b.d * 0.2], [0, b.h * 0.76, 0], p.light, { shape: 'cylinder', name: 'neck' });
  add([b.w * 0.54, b.h * 0.12, b.d * 0.6], [0, hipY, 0], p.trim, { shape: 'capsule', name: 'waistcoat-hem' });
  for (const side of [-1, 1]) {
    const arm = add([b.w * 0.13, b.h * 0.42, b.w * 0.13], [side * b.w * 0.38, shoulderY - b.h * 0.14, 0], p.secondary, { shape: 'capsule', rotation: [0, 0, side * 0.08], name: side < 0 ? 'rig-arm-left' : 'rig-arm-right' });
    arm.userData.baseRotation = { x: arm.rotation.x, y: arm.rotation.y, z: arm.rotation.z };
    add([b.w * 0.15, b.h * 0.13, b.w * 0.15], [side * b.w * 0.4, b.h * 0.42, b.d * 0.03], p.light, { shape: 'sphere', name: 'hand' });
    const leg = add([b.w * 0.15, b.h * 0.43, b.w * 0.15], [side * b.w * 0.16, b.h * 0.2, 0], p.dark, { shape: 'capsule', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
    leg.userData.baseRotation = { x: 0, y: 0, z: 0 };
    add([b.w * 0.2, b.h * 0.09, b.d * 0.42], [side * b.w * 0.16, b.h * 0.035, b.d * 0.08], p.trim, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'shoe' });
    add([b.w * 0.12, b.h * 0.06, b.d * 0.1], [side * b.w * 0.3, shoulderY + b.h * 0.03, b.d * 0.22], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.62, name: 'shoulder-clasp' });
  }
  for (let button = 0; button < 6; button += 1) add([b.w * 0.045, b.w * 0.045, b.d * 0.025], [0, b.h * (0.46 + button * 0.055), b.d * 0.3], button % 2 ? p.glow : p.light, { shape: 'sphere', metalness: 0.6, name: 'coat-button' });
  addHumanoidRoleGear(root, b, p, variant, role);
  for (let detail = 0; detail < 8 + variant; detail += 1) {
    const angle = (detail / (8 + variant)) * Math.PI * 2;
    add([b.w * 0.035, b.h * 0.035, b.d * 0.02], [Math.cos(angle) * b.w * 0.24, b.h * (0.57 + Math.sin(angle) * 0.14), b.d * 0.32], detail % 2 ? p.glow : p.light, { shape: detail % 3 ? 'sphere' : 'torus', rotation: [Math.PI / 2, 0, angle], name: 'masterwork-garment-detail' });
  }
  return root;
}

function addHumanoidRoleGear(root: THREE.Group, b: Bounds, p: Palette, variant: number, role: number): void {
  const add = partAdder(root);
  switch (role) {
    case 0:
      for (let gear = 0; gear < 7; gear += 1) add([b.w * (0.07 + gear * 0.008), b.w * (0.07 + gear * 0.008), b.d * 0.025], [((gear % 3) - 1) * b.w * 0.18, b.h * (0.48 + Math.floor(gear / 3) * 0.12), b.d * 0.34], gear % 2 ? p.glow : p.trim, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.72, name: 'clockmaker-gear' });
      add([b.w * 0.45, b.h * 0.12, b.d * 0.45], [0, b.h * 1.0, 0], p.dark, { shape: 'cylinder', name: 'clockmaker-cap' });
      break;
    case 1:
      add([b.w * 0.52, b.h * 0.38, b.d * 0.5], [0, b.h * 0.87, 0], p.glow, { shape: 'sphere', metalness: 0.7, opacity: 0.82, name: 'diver-helmet' });
      for (const side of [-1, 0, 1]) add([b.w * 0.14, b.w * 0.14, b.d * 0.07], [side * b.w * 0.18, b.h * 0.88, b.d * 0.27], p.glass, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], opacity: 0.5, name: 'diver-porthole' });
      for (let hose = 0; hose < 6; hose += 1) add([b.w * 0.07, b.h * 0.22, b.w * 0.07], [b.w * (0.42 + hose * 0.04), b.h * (0.78 - hose * 0.09), -b.d * 0.1], p.trim, { shape: 'torus', rotation: [0, Math.PI / 2, 0], name: 'diver-hose' });
      break;
    case 2:
      add([b.w * 0.58, b.h * 0.34, b.d * 0.5], [0, b.h * 0.9, 0], p.glass, { shape: 'cylinder', opacity: 0.35, name: 'beekeeper-veil' });
      add([b.w * 0.68, b.h * 0.07, b.d * 0.68], [0, b.h * 1.03, 0], p.light, { shape: 'cylinder', name: 'beekeeper-brim' });
      for (let bee = 0; bee < 8; bee += 1) {
        const angle = (bee / 8) * Math.PI * 2 + variant * 0.2;
        add([b.w * 0.055, b.h * 0.035, b.d * 0.035], [Math.cos(angle) * b.w * 0.5, b.h * (0.62 + Math.sin(angle) * 0.25), b.d * 0.25], bee % 2 ? p.glow : p.dark, { shape: 'capsule', rotation: [0, 0, angle], name: 'beekeeper-bee' });
      }
      break;
    case 3:
      for (let spool = -3; spool <= 3; spool += 1) add([b.w * 0.08, b.h * 0.1, b.w * 0.08], [spool * b.w * 0.12, b.h * 0.43, -b.d * 0.28], shifted(p.secondary, spool + variant), { shape: 'cylinder', name: 'seamstress-thread-spool' });
      for (let needle = -2; needle <= 2; needle += 1) add([b.w * 0.012, b.h * 0.28, b.w * 0.012], [needle * b.w * 0.08, b.h * 0.66, b.d * 0.33], p.glow, { shape: 'cylinder', rotation: [0, 0, needle * 0.15], metalness: 0.8, name: 'seamstress-needle' });
      break;
    case 4:
      add([b.w * 0.72, b.h * 0.22, b.d * 0.22], [0, b.h * 0.96, 0], p.dark, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'radio-headset' });
      for (const side of [-1, 1]) add([b.w * 0.18, b.h * 0.2, b.d * 0.12], [side * b.w * 0.29, b.h * 0.88, 0], p.glow, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'radio-earpiece' });
      for (let dial = 0; dial < 8; dial += 1) add([b.w * 0.055, b.w * 0.055, b.d * 0.025], [((dial % 4) - 1.5) * b.w * 0.12, b.h * (0.48 + Math.floor(dial / 4) * 0.14), b.d * 0.34], dial % 2 ? p.glow : p.light, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'radio-chest-dial' });
      break;
    case 5:
      add([b.w * 0.7, b.h * 0.09, b.d * 0.65], [0, b.h * 1.02, 0], p.dark, { shape: 'cylinder', name: 'undertaker-brim' });
      add([b.w * 0.46, b.h * 0.35, b.d * 0.46], [0, b.h * 1.12, 0], p.dark, { shape: 'cylinder', name: 'undertaker-hat' });
      for (let flower = 0; flower < 7; flower += 1) add([b.w * 0.07, b.w * 0.07, b.w * 0.07], [b.w * (0.24 + (flower % 3) * 0.05), b.h * (0.58 + flower * 0.045), b.d * 0.31], shifted('#4a1728', flower + variant), { shape: 'sphere', name: 'undertaker-lapel-flower' });
      break;
    case 6:
      add([b.w * 0.72, b.h * 0.08, b.d * 0.68], [0, b.h * 1.02, 0], p.dark, { shape: 'cylinder', name: 'magician-brim' });
      add([b.w * 0.42, b.h * 0.45, b.d * 0.42], [0, b.h * 1.22, 0], p.dark, { shape: 'cylinder', name: 'magician-top-hat' });
      for (let card = 0; card < 7; card += 1) add([b.w * 0.1, b.h * 0.16, b.d * 0.025], [b.w * (0.28 + card * 0.035), b.h * (0.52 + card * 0.07), b.d * 0.34], card % 2 ? p.light : p.secondary, { rotation: [0, 0, -0.25 + card * 0.08], name: 'magician-card' });
      break;
    case 7:
      for (let book = 0; book < 8; book += 1) add([b.w * 0.22, b.h * 0.07, b.d * 0.3], [((book % 2) * 2 - 1) * b.w * 0.3, b.h * (0.48 + Math.floor(book / 2) * 0.08), b.d * 0.12], shifted(p.secondary, book + variant), { rotation: [0, 0, (book % 3 - 1) * 0.08], name: 'archivist-book' });
      add([b.w * 0.38, b.h * 0.16, b.d * 0.12], [0, b.h * 0.97, b.d * 0.18], p.glass, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'archivist-spectacles' });
      break;
    default:
      add([b.w * 0.08, b.h * 0.72, b.w * 0.08], [b.w * 0.5, b.h * 0.48, 0], p.trim, { shape: 'capsule', rotation: [0, 0, -0.12], name: 'lamplighter-pole' });
      for (let pane = 0; pane < 6; pane += 1) {
        const angle = (pane / 6) * Math.PI * 2;
        add([b.w * 0.13, b.h * 0.22, b.d * 0.04], [b.w * 0.5 + Math.cos(angle) * b.w * 0.13, b.h * 0.93, Math.sin(angle) * b.d * 0.13], p.glass, { rotation: [0, angle, 0], opacity: 0.48, emissive: p.glow, emissiveIntensity: 0.35, name: 'lamplighter-lantern-pane' });
      }
  }
}

function buildMasterworkCreature(
  kind: MasterworkCreatureKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const b = MASTERWORK_BOUNDS[kind];
  const p = paletteFor(kind, variant, accent, body);
  const root = new THREE.Group();
  const species = MASTERWORK_CREATURE_KINDS.indexOf(kind);
  switch (species) {
    case 0: buildHare(root, b, p, variant); break;
    case 1: buildBadger(root, b, p, variant); break;
    case 2: buildRaven(root, b, p, variant); break;
    case 3: buildEel(root, b, p, variant); break;
    case 4: buildAxolotl(root, b, p, variant); break;
    case 5: buildPeacock(root, b, p, variant); break;
    case 6: buildLobster(root, b, p, variant); break;
    case 7: buildSpider(root, b, p, variant); break;
    case 8: buildBat(root, b, p, variant); break;
    default: buildTortoise(root, b, p, variant);
  }
  addCreatureFinish(root, b, p, variant, species);
  return root;
}

function buildHare(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.62, b.h * 0.48, b.d * 0.62], [0, b.h * 0.36, -b.d * 0.08], p.primary, { shape: 'sphere', name: 'hare-body' });
  add([b.w * 0.48, b.h * 0.38, b.d * 0.46], [0, b.h * 0.63, b.d * 0.27], p.secondary, { shape: 'sphere', name: 'rig-head' });
  for (const side of [-1, 1]) {
    add([b.w * 0.15, b.h * 0.58, b.w * 0.12], [side * b.w * 0.16, b.h * 0.95, b.d * 0.18], shifted(p.primary, side + variant), { shape: 'capsule', rotation: [0, 0, side * 0.12], name: 'hare-ear' });
    add([b.w * 0.18, b.h * 0.4, b.d * 0.22], [side * b.w * 0.26, b.h * 0.2, -b.d * 0.08], p.primary, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * 0.25], name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
    add([b.w * 0.18, b.h * 0.12, b.d * 0.38], [side * b.w * 0.26, b.h * 0.05, b.d * 0.18], p.light, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'hare-foot' });
  }
  add([b.w * 0.25, b.w * 0.25, b.w * 0.25], [0, b.h * 0.39, -b.d * 0.43], p.light, { shape: 'sphere', name: 'hare-tail' });
}

function buildBadger(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.72, b.h * 0.58, b.d * 0.74], [0, b.h * 0.38, -b.d * 0.08], p.dark, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'badger-body' });
  add([b.w * 0.54, b.h * 0.5, b.d * 0.48], [0, b.h * 0.47, b.d * 0.42], p.light, { shape: 'sphere', name: 'rig-head' });
  for (const side of [-1, 1]) {
    add([b.w * 0.13, b.h * 0.48, b.d * 0.12], [side * b.w * 0.18, b.h * 0.49, b.d * 0.49], p.dark, { shape: 'capsule', rotation: [0, 0, side * (0.14 + variant * 0.012)], name: 'badger-face-stripe' });
    for (const z of [-1, 1]) {
      add([b.w * 0.13, b.h * 0.32, b.w * 0.13], [side * b.w * 0.33, b.h * 0.19, z * b.d * 0.22], p.primary, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * 0.18], name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
      for (let claw = -1; claw <= 1; claw += 1) add([b.w * 0.025, b.h * 0.05, b.d * 0.17], [side * b.w * 0.35 + claw * b.w * 0.035, b.h * 0.04, z * b.d * 0.32], p.glow, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'badger-claw' });
    }
  }
  add([b.w * 0.28, b.h * 0.24, b.d * 0.36], [0, b.h * 0.41, b.d * 0.68], p.primary, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'badger-muzzle' });
}

function buildRaven(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.56, b.h * 0.56, b.d * 0.58], [0, b.h * 0.46, -b.d * 0.08], p.dark, { shape: 'sphere', name: 'raven-body' });
  add([b.w * 0.4, b.h * 0.36, b.d * 0.38], [0, b.h * 0.72, b.d * 0.24], p.primary, { shape: 'sphere', name: 'rig-head' });
  add([b.w * 0.18, b.h * 0.16, b.d * 0.5], [0, b.h * 0.7, b.d * 0.55], p.glow, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'raven-beak' });
  for (const side of [-1, 1]) {
    add([b.w * 0.34, b.h * 0.52, b.d * 0.18], [side * b.w * 0.31, b.h * 0.47, -b.d * 0.08], p.primary, { shape: 'capsule', rotation: [0, 0, side * 0.38], name: side < 0 ? 'rig-wing-left' : 'rig-wing-right' });
    for (let feather = 0; feather < 6; feather += 1) add([b.w * 0.09, b.h * (0.22 + feather * 0.035), b.d * 0.07], [side * b.w * (0.25 + feather * 0.045), b.h * (0.43 - feather * 0.025), -b.d * 0.05], shifted(p.secondary, feather + variant), { shape: 'capsule', rotation: [0, 0, side * (0.28 + feather * 0.06)], name: 'raven-flight-feather' });
    add([b.w * 0.045, b.h * 0.38, b.w * 0.045], [side * b.w * 0.13, b.h * 0.2, 0], p.glow, { shape: 'cylinder', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
  }
  for (let tail = -2; tail <= 2; tail += 1) add([b.w * 0.1, b.h * 0.12, b.d * 0.44], [tail * b.w * 0.08, b.h * 0.32, -b.d * 0.36], shifted(p.dark, tail), { shape: 'capsule', rotation: [Math.PI / 2, 0, tail * 0.1], name: 'raven-tail-feather' });
}

function buildEel(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const segments = 14 + variant;
  for (let segment = 0; segment < segments; segment += 1) {
    const t = segment / Math.max(1, segments - 1);
    const z = (t - 0.5) * b.d * 0.86;
    const x = Math.sin(t * Math.PI * 2.4 + variant * 0.18) * b.w * 0.2;
    const y = b.h * (0.42 + Math.cos(t * Math.PI * 2) * 0.12);
    const size = (1 - t * 0.55) * b.w * 0.44;
    add([size, b.h * (0.34 - t * 0.13), b.d * 0.12], [x, y, z], shifted(p.primary, segment), { shape: 'sphere', rotation: [0, Math.sin(t * 5) * 0.25, 0], name: segment === 0 ? 'rig-head' : 'eel-body-segment' });
    if (segment % 2 === 0) add([size * 0.5, b.h * 0.12, b.d * 0.06], [x, y + b.h * 0.2, z], p.glow, { shape: 'cone', rotation: [0, 0, Math.PI], name: 'eel-dorsal-fin' });
  }
  for (const side of [-1, 1]) add([b.w * 0.28, b.h * 0.08, b.d * 0.34], [side * b.w * 0.28, b.h * 0.4, b.d * 0.18], p.glass, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * 0.3], opacity: 0.55, name: 'eel-pectoral-fin' });
}

function buildAxolotl(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.64, b.h * 0.48, b.d * 0.66], [0, b.h * 0.34, -b.d * 0.08], p.primary, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'axolotl-body' });
  add([b.w * 0.58, b.h * 0.5, b.d * 0.48], [0, b.h * 0.43, b.d * 0.38], p.light, { shape: 'sphere', name: 'rig-head' });
  for (const side of [-1, 1]) {
    for (let gill = -2; gill <= 2; gill += 1) {
      add([b.w * 0.055, b.h * (0.2 + Math.abs(gill) * 0.035), b.w * 0.055], [side * b.w * (0.3 + Math.abs(gill) * 0.045), b.h * (0.44 + gill * 0.06), b.d * 0.35], shifted(p.secondary, gill + variant), { shape: 'capsule', rotation: [0, 0, side * (0.7 + gill * 0.1)], name: 'axolotl-gill' });
      add([b.w * 0.07, b.w * 0.07, b.w * 0.07], [side * b.w * (0.4 + Math.abs(gill) * 0.045), b.h * (0.5 + gill * 0.08), b.d * 0.35], p.glow, { shape: 'sphere', name: 'axolotl-gill-tip' });
    }
    for (const z of [-1, 1]) add([b.w * 0.11, b.h * 0.28, b.w * 0.11], [side * b.w * 0.3, b.h * 0.18, z * b.d * 0.22], p.primary, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * 0.28], name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
  }
  add([b.w * 0.3, b.h * 0.2, b.d * 0.72], [0, b.h * 0.36, -b.d * 0.58], p.secondary, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'axolotl-tail' });
}

function buildPeacock(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.42, b.h * 0.42, b.d * 0.46], [0, b.h * 0.5, b.d * 0.1], p.primary, { shape: 'sphere', name: 'peacock-body' });
  add([b.w * 0.16, b.h * 0.45, b.w * 0.16], [0, b.h * 0.74, b.d * 0.28], p.secondary, { shape: 'capsule', name: 'peacock-neck' });
  add([b.w * 0.28, b.h * 0.22, b.d * 0.28], [0, b.h * 0.94, b.d * 0.35], p.secondary, { shape: 'sphere', name: 'rig-head' });
  const feathers = 13 + variant;
  for (let feather = 0; feather < feathers; feather += 1) {
    const angle = ((feather / Math.max(1, feathers - 1)) - 0.5) * Math.PI * 1.55;
    const radius = b.w * 0.48;
    const x = Math.sin(angle) * radius;
    const y = b.h * (0.48 + Math.cos(angle) * 0.32);
    add([b.w * 0.075, b.h * 0.62, b.d * 0.055], [x, y, -b.d * 0.3], shifted(p.primary, feather), { shape: 'capsule', rotation: [0, 0, -angle], name: 'peacock-tail-feather' });
    add([b.w * 0.1, b.h * 0.1, b.d * 0.04], [x + Math.sin(angle) * b.w * 0.2, y + Math.cos(angle) * b.h * 0.24, -b.d * 0.27], feather % 2 ? p.glow : p.glass, { shape: 'torus', rotation: [Math.PI / 2, 0, angle], emissive: p.glow, emissiveIntensity: 0.14, name: 'peacock-eye-spot' });
  }
  for (const side of [-1, 1]) add([b.w * 0.055, b.h * 0.48, b.w * 0.055], [side * b.w * 0.12, b.h * 0.23, b.d * 0.08], p.glow, { shape: 'cylinder', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
}

function buildLobster(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.52, b.h * 0.56, b.d * 0.68], [0, b.h * 0.38, 0], p.secondary, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], metalness: 0.36, name: 'lobster-carapace' });
  add([b.w * 0.4, b.h * 0.46, b.d * 0.42], [0, b.h * 0.44, b.d * 0.43], p.primary, { shape: 'sphere', name: 'rig-head' });
  for (const side of [-1, 1]) {
    for (let leg = 0; leg < 4; leg += 1) add([b.w * 0.05, b.h * 0.3, b.d * 0.05], [side * b.w * (0.31 + leg * 0.07), b.h * 0.2, b.d * (-0.22 + leg * 0.14)], p.trim, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * (0.65 + leg * 0.1)], name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
    add([b.w * 0.09, b.h * 0.42, b.w * 0.09], [side * b.w * 0.4, b.h * 0.43, b.d * 0.54], p.secondary, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * 0.45], name: 'lobster-claw-arm' });
    add([b.w * 0.28, b.h * 0.26, b.d * 0.32], [side * b.w * 0.62, b.h * 0.42, b.d * 0.67], p.primary, { shape: 'capsule', rotation: [0, side * 0.35, side * 0.25], name: 'lobster-claw' });
    add([b.w * 0.03, b.h * 0.58, b.w * 0.03], [side * b.w * 0.24, b.h * 0.71, b.d * 0.52], p.glow, { shape: 'capsule', rotation: [0, 0, side * 0.3], name: 'lobster-antenna' });
  }
  for (let tail = 0; tail < 6 + (variant % 3); tail += 1) add([b.w * (0.35 - tail * 0.035), b.h * 0.3, b.d * 0.18], [0, b.h * 0.34, -b.d * (0.32 + tail * 0.12)], shifted(p.secondary, tail), { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'lobster-tail-segment' });
}

function buildSpider(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.48, b.h * 0.58, b.d * 0.52], [0, b.h * 0.4, -b.d * 0.16], p.dark, { shape: 'sphere', name: 'spider-abdomen' });
  add([b.w * 0.38, b.h * 0.48, b.d * 0.38], [0, b.h * 0.39, b.d * 0.24], p.primary, { shape: 'sphere', name: 'rig-head' });
  for (const side of [-1, 1]) for (let leg = 0; leg < 4; leg += 1) {
    const z = b.d * (-0.25 + leg * 0.18);
    add([b.w * 0.055, b.h * 0.48, b.w * 0.055], [side * b.w * 0.38, b.h * 0.35, z], p.trim, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * (0.72 + leg * 0.08)], name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
    add([b.w * 0.045, b.h * 0.42, b.w * 0.045], [side * b.w * 0.63, b.h * 0.16, z + b.d * 0.03], p.dark, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * -0.5], name: 'spider-lower-leg' });
    add([b.w * 0.04, b.h * 0.05, b.d * 0.18], [side * b.w * 0.76, b.h * 0.04, z + b.d * 0.08], p.glow, { shape: 'cone', rotation: [Math.PI / 2, 0, side * -0.22], name: 'spider-foot' });
  }
  for (let eye = 0; eye < 8; eye += 1) add([b.w * 0.055, b.w * 0.055, b.d * 0.035], [((eye % 4) - 1.5) * b.w * 0.08, b.h * (0.42 + Math.floor(eye / 4) * 0.09), b.d * 0.46], eye % 2 ? p.glow : p.glass, { shape: 'sphere', emissive: p.glow, emissiveIntensity: variant === 7 ? 0.32 : 0.1, name: 'spider-eye' });
}

function buildBat(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.28, b.h * 0.58, b.d * 0.36], [0, b.h * 0.42, 0], p.dark, { shape: 'capsule', name: 'bat-body' });
  add([b.w * 0.32, b.h * 0.32, b.d * 0.3], [0, b.h * 0.7, b.d * 0.1], p.primary, { shape: 'sphere', name: 'rig-head' });
  for (const side of [-1, 1]) {
    add([b.w * 0.14, b.h * 0.42, b.d * 0.1], [side * b.w * 0.13, b.h * 0.91, b.d * 0.08], p.primary, { shape: 'cone', rotation: [0, 0, side * -0.1], name: 'bat-ear' });
    for (let bone = 0; bone < 5; bone += 1) {
      const span = b.w * (0.2 + bone * 0.11);
      add([b.w * 0.035, b.h * (0.34 + bone * 0.06), b.w * 0.035], [side * span, b.h * (0.55 - bone * 0.035), 0], p.trim, { shape: 'capsule', rotation: [0, 0, side * (0.75 + bone * 0.06)], name: side < 0 ? 'rig-wing-left' : 'rig-wing-right' });
      add([b.w * 0.16, b.h * (0.32 + bone * 0.04), b.d * 0.035], [side * b.w * (0.24 + bone * 0.1), b.h * (0.5 - bone * 0.03), -b.d * 0.04], shifted(p.secondary, bone + variant), { shape: 'capsule', rotation: [0, 0, side * (0.45 + bone * 0.08)], opacity: 0.72, name: 'bat-wing-membrane' });
    }
    add([b.w * 0.05, b.h * 0.38, b.w * 0.05], [side * b.w * 0.12, b.h * 0.2, 0], p.trim, { shape: 'capsule', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
  }
}

function buildTortoise(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.76, b.h * 0.68, b.d * 0.72], [0, b.h * 0.42, -b.d * 0.08], p.trim, { shape: 'sphere', name: 'tortoise-shell' });
  add([b.w * 0.38, b.h * 0.36, b.d * 0.38], [0, b.h * 0.34, b.d * 0.48], p.primary, { shape: 'sphere', name: 'rig-head' });
  for (const side of [-1, 1]) for (const z of [-1, 1]) add([b.w * 0.18, b.h * 0.3, b.d * 0.2], [side * b.w * 0.39, b.h * 0.17, z * b.d * 0.27], p.primary, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * 0.28], name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
  for (let row = -1; row <= 1; row += 1) for (let column = -2; column <= 2; column += 1) {
    const x = column * b.w * 0.13 + (row % 2 ? b.w * 0.06 : 0);
    const z = row * b.d * 0.14 - b.d * 0.08;
    add([b.w * 0.11, b.h * 0.1, b.d * 0.1], [x, b.h * (0.7 - Math.abs(column) * 0.025 + variant * 0.003), z], (row + column) % 2 ? p.glow : p.secondary, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], metalness: 0.25, name: 'tortoise-shell-scute' });
  }
  add([b.w * 0.12, b.h * 0.18, b.d * 0.22], [0, b.h * 0.28, -b.d * 0.52], p.primary, { shape: 'cone', rotation: [-Math.PI / 2, 0, 0], name: 'tortoise-tail' });
}

function addCreatureFinish(root: THREE.Group, b: Bounds, p: Palette, variant: number, species: number): void {
  const add = partAdder(root);
  for (let mark = 0; mark < 10 + variant; mark += 1) {
    const angle = (mark / (10 + variant)) * Math.PI * 2 + species * 0.17;
    add([b.w * (0.03 + (mark % 3) * 0.009), b.h * (0.028 + (mark % 2) * 0.009), b.d * 0.018], [Math.cos(angle) * b.w * 0.29, b.h * (0.4 + Math.sin(angle) * 0.17), b.d * 0.51], mark % 2 ? p.glow : p.light, { shape: mark % 3 ? 'sphere' : 'torus', rotation: [Math.PI / 2, 0, angle], emissive: variant === 5 && mark % 2 === 0 ? p.glow : undefined, emissiveIntensity: 0.18, name: 'masterwork-creature-marking' });
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
      roughness: options.roughness ?? 0.56,
      metalness: options.metalness ?? 0.12,
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
    mesh.name = options.name ?? 'masterwork-detail';
    mesh.userData.baseRotation = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
    mesh.castShadow = opacity > 0.5;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
}

function geometryFor(shape: Shape): THREE.BufferGeometry {
  switch (shape) {
    case 'sphere': return new THREE.SphereGeometry(0.5, 28, 20);
    case 'cylinder': return new THREE.CylinderGeometry(0.5, 0.5, 1, 28);
    case 'cone': return new THREE.ConeGeometry(0.5, 1, 28);
    case 'torus': return new THREE.TorusGeometry(0.5, 0.115, 14, 32);
    case 'capsule': return new THREE.CapsuleGeometry(0.32, 0.4, 10, 18);
    default: return new THREE.BoxGeometry(1, 1, 1, 3, 3, 3);
  }
}

function paletteFor(kind: MasterworkModelKind, variant: number, accent: string, body: string): Palette {
  const hash = hashString(kind);
  const hue = ((hash % 29) - 14) * 0.006 + variant * 0.021;
  const primary = new THREE.Color(body).offsetHSL(hue, 0.035, (variant - 3.5) * 0.013).getStyle();
  const secondary = new THREE.Color(accent).offsetHSL(-hue * 0.62, 0.075, (variant % 3 - 1) * 0.028).getStyle();
  const trim = new THREE.Color(primary).multiplyScalar(0.48).getStyle();
  const dark = new THREE.Color(secondary).multiplyScalar(0.27).getStyle();
  const light = new THREE.Color(primary).lerp(new THREE.Color('#f4efe3'), 0.68).getStyle();
  const glow = ['#e2b856', '#68d9ee', '#df82ae', '#a6e06f', '#ed825b', '#879ff0', '#ded5c0', '#f2dc72'][variant]!;
  return {
    primary,
    secondary,
    trim,
    dark,
    light,
    glow,
    glass: new THREE.Color(glow).lerp(new THREE.Color('#a8d3d8'), 0.68).getStyle(),
  };
}

function shifted(color: string, amount: number): string {
  return new THREE.Color(color).offsetHSL(amount * 0.019, (amount % 3 - 1) * 0.024, (amount % 5 - 2) * 0.017).getStyle();
}
