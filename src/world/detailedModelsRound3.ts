import * as THREE from 'three';
import { hashString } from '../core/rng';
import { geometryForShape } from './modelQuality';
import {
  EXHIBITION_BOUNDS,
  EXHIBITION_CREATURE_KINDS,
  EXHIBITION_HUMANOID_KINDS,
  EXHIBITION_PROP_FAMILIES,
  exhibitionFamilyForKind,
  isExhibitionModelKind,
  type ExhibitionCreatureKind,
  type ExhibitionHumanoidKind,
  type ExhibitionModelKind,
  type ExhibitionPropKind,
} from './detailedAssetsRound3';

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

export { EXHIBITION_BOUNDS };

export function buildExhibitionModel(
  kind: string,
  variant: number,
  accent: string,
  body: string,
): THREE.Group | null {
  if (!isExhibitionModelKind(kind)) return null;
  const model = EXHIBITION_HUMANOID_KINDS.includes(kind as ExhibitionHumanoidKind)
    ? buildExhibitionHumanoid(kind as ExhibitionHumanoidKind, variant, accent, body)
    : EXHIBITION_CREATURE_KINDS.includes(kind as ExhibitionCreatureKind)
      ? buildExhibitionCreature(kind as ExhibitionCreatureKind, variant, accent, body)
      : buildExhibitionProp(kind as ExhibitionPropKind, variant, accent, body);
  model.name = `${kind}-${variant}`;
  model.userData.detailTier = 'exhibition';
  model.userData.detailVariant = variant;
  model.userData.modelFamily = exhibitionFamilyForKind(kind).id;
  return model;
}

function buildExhibitionProp(
  kind: ExhibitionPropKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const familyIndex = EXHIBITION_PROP_FAMILIES.findIndex((candidate) => candidate.kind === kind);
  const formIndex = Math.floor(familyIndex / 2);
  const profile = familyIndex % 2;
  const bounds = EXHIBITION_BOUNDS[kind];
  const palette = paletteFor(kind, variant, accent, body);
  const root = new THREE.Group();
  buildPropChassis(root, bounds, palette, variant, formIndex);
  addPropIdentity(root, bounds, palette, variant, formIndex, profile);
  addExhibitionFinish(root, bounds, palette, variant, familyIndex);
  return root;
}

function buildPropChassis(
  root: THREE.Group,
  b: Bounds,
  p: Palette,
  variant: number,
  form: number,
): void {
  const add = partAdder(root);
  switch (form % 5) {
    case 0: {
      add([b.w * 0.86, b.h * 0.76, b.d * 0.74], [0, b.h * 0.45, 0], p.primary, { name: 'exhibition-cabinet-body' });
      add([b.w * 0.96, b.h * 0.07, b.d * 0.86], [0, b.h * 0.86, 0], p.trim, { name: 'exhibition-crown' });
      add([b.w * 0.94, b.h * 0.06, b.d * 0.84], [0, b.h * 0.06, 0], p.trim, { name: 'exhibition-plinth' });
      for (let row = 0; row < 3; row += 1) for (let column = -1; column <= 1; column += 1) {
        add([b.w * 0.23, b.h * 0.17, b.d * 0.045], [column * b.w * 0.27, b.h * (0.24 + row * 0.2), b.d * 0.39], (row + column) % 2 ? p.secondary : p.primary, { name: 'exhibition-cabinet-panel' });
        add([b.w * 0.055, b.w * 0.055, b.d * 0.035], [column * b.w * 0.27, b.h * (0.24 + row * 0.2), b.d * 0.44], p.glow, { shape: variant % 2 ? 'torus' : 'sphere', rotation: [Math.PI / 2, 0, 0], metalness: 0.72, name: 'exhibition-cabinet-pull' });
      }
      break;
    }
    case 1: {
      add([b.w * 0.94, b.h * 0.08, b.d * 0.84], [0, b.h * 0.58, 0], p.primary, { name: 'exhibition-console-deck' });
      for (const x of [-1, 1]) for (const z of [-1, 1]) add([b.w * 0.07, b.h * 0.56, b.d * 0.07], [x * b.w * 0.41, b.h * 0.29, z * b.d * 0.34], p.trim, { shape: 'capsule', name: 'exhibition-console-leg' });
      add([b.w * 0.78, b.h * 0.3, b.d * 0.12], [0, b.h * 0.77, -b.d * 0.27], p.secondary, { rotation: [-0.18, 0, 0], name: 'exhibition-control-bank' });
      add([b.w * 0.76, b.h * 0.05, b.d * 0.62], [0, b.h * 0.18, 0], p.dark, { name: 'exhibition-console-stretcher' });
      for (let control = 0; control < 8; control += 1) {
        const x = ((control % 4) - 1.5) * b.w * 0.17;
        const y = b.h * (0.73 + Math.floor(control / 4) * 0.12);
        add([b.w * 0.055, b.w * 0.055, b.d * 0.035], [x, y, -b.d * 0.19], control % 2 ? p.glow : p.light, { shape: control % 3 ? 'cylinder' : 'torus', rotation: [Math.PI / 2, 0, 0], emissive: control % 2 ? p.glow : undefined, emissiveIntensity: 0.16, name: 'exhibition-console-control' });
      }
      break;
    }
    case 2: {
      add([b.w * 0.78, b.h * 0.76, b.d * 0.72], [0, b.h * 0.46, 0], p.secondary, { name: 'exhibition-machine-body' });
      add([b.w * 0.92, b.h * 0.08, b.d * 0.88], [0, b.h * 0.07, 0], p.trim, { name: 'exhibition-machine-base' });
      add([b.w * 0.86, b.h * 0.07, b.d * 0.82], [0, b.h * 0.88, 0], p.glow, { metalness: 0.68, name: 'exhibition-machine-cap' });
      for (const side of [-1, 1]) {
        add([b.w * 0.055, b.h * 0.68, b.w * 0.055], [side * b.w * 0.39, b.h * 0.47, b.d * 0.32], p.trim, { shape: 'cylinder', metalness: 0.72, name: 'exhibition-machine-column' });
        for (let rivet = 0; rivet < 5; rivet += 1) add([b.w * 0.04, b.w * 0.04, b.d * 0.025], [side * b.w * 0.4, b.h * (0.19 + rivet * 0.14), b.d * 0.38], rivet % 2 ? p.light : p.glow, { shape: 'sphere', metalness: 0.74, name: 'exhibition-rivet' });
      }
      add([b.w * 0.48, b.h * 0.19, b.d * 0.07], [0, b.h * 0.54, b.d * 0.39], p.dark, { name: 'exhibition-machine-window' });
      break;
    }
    case 3: {
      add([b.w * 0.72, b.h * 0.09, b.d * 0.72], [0, b.h * 0.07, 0], p.trim, { shape: 'cylinder', name: 'exhibition-radial-base' });
      add([b.w * 0.11, b.h * 0.68, b.w * 0.11], [0, b.h * 0.39, 0], p.primary, { shape: 'cylinder', metalness: 0.48, name: 'exhibition-radial-post' });
      add([b.w * 0.24, b.w * 0.24, b.w * 0.24], [0, b.h * 0.65, 0], p.glow, { shape: 'sphere', emissive: p.glow, emissiveIntensity: 0.22, name: 'exhibition-radial-core' });
      for (let ring = 0; ring < 4; ring += 1) {
        add([b.w * (0.33 + ring * 0.1), b.w * (0.33 + ring * 0.1), b.w * 0.025], [0, b.h * (0.64 + (ring - 1.5) * 0.055), 0], ring % 2 ? p.secondary : p.trim, { shape: 'torus', rotation: [Math.PI / 2 + ring * 0.16, ring * 0.22, 0], metalness: 0.68, name: 'exhibition-radial-ring' });
      }
      for (let node = 0; node < 8; node += 1) {
        const angle = node / 8 * Math.PI * 2 + variant * 0.08;
        add([b.w * 0.07, b.w * 0.07, b.w * 0.07], [Math.cos(angle) * b.w * 0.38, b.h * (0.65 + Math.sin(angle * 2) * 0.11), Math.sin(angle) * b.d * 0.38], node % 2 ? p.glow : p.light, { shape: 'sphere', name: 'exhibition-radial-node' });
      }
      break;
    }
    default: {
      add([b.w * 0.92, b.h * 0.1, b.d * 0.84], [0, b.h * 0.5, 0], p.primary, { name: 'exhibition-platform-deck' });
      for (const x of [-1, 1]) for (const z of [-1, 1]) add([b.w * 0.07, b.h * 0.5, b.d * 0.07], [x * b.w * 0.4, b.h * 0.25, z * b.d * 0.34], p.trim, { shape: 'capsule', name: 'exhibition-platform-leg' });
      add([b.w * 0.78, b.h * 0.38, b.d * 0.08], [0, b.h * 0.72, -b.d * 0.34], p.secondary, { name: 'exhibition-platform-back' });
      for (let slot = -3; slot <= 3; slot += 1) add([b.w * 0.08, b.h * 0.23, b.d * 0.04], [slot * b.w * 0.11, b.h * 0.72, -b.d * 0.29], slot % 2 ? p.glow : p.dark, { shape: slot % 2 ? 'capsule' : 'box', name: 'exhibition-platform-slot' });
      for (const side of [-1, 1]) add([b.w * 0.05, b.h * 0.44, b.w * 0.05], [side * b.w * 0.46, b.h * 0.69, 0], p.glow, { shape: 'cylinder', metalness: 0.72, name: 'exhibition-platform-rail' });
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
  const front = b.d * 0.48;
  switch (form) {
    case 0:
      for (const side of [-1, 1]) add([b.w * 0.07, b.h * 0.72, b.d * 0.06], [side * b.w * 0.34, b.h * 0.48, front], p.glow, { metalness: 0.75, name: 'travel-trunk-strap' });
      add([b.w * 0.32, b.h * 0.08, b.d * 0.1], [0, b.h * (profile ? 0.88 : 0.62), front], p.trim, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'travel-luggage-handle' });
      break;
    case 1:
      for (let lens = 0; lens < 7 + profile * 3; lens += 1) {
        const angle = lens / (7 + profile * 3) * Math.PI * 2;
        add([b.w * (0.08 + lens * 0.006), b.w * (0.08 + lens * 0.006), b.d * 0.06], [Math.cos(angle) * b.w * 0.27, b.h * (0.58 + Math.sin(angle) * 0.18), front], lens % 2 ? p.glass : p.glow, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], opacity: 0.62, emissive: p.glow, emissiveIntensity: 0.13, name: 'optical-glass-lens' });
      }
      break;
    case 2:
      for (let gauge = 0; gauge < 6; gauge += 1) add([b.w * 0.09, b.w * 0.09, b.d * 0.04], [((gauge % 3) - 1) * b.w * 0.21, b.h * (0.55 + Math.floor(gauge / 3) * 0.2), front], p.light, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'scientific-instrument-dial' });
      for (let needle = 0; needle < 3 + profile * 2; needle += 1) add([b.w * 0.018, b.h * 0.34, b.w * 0.018], [(needle - 1 - profile) * b.w * 0.13, b.h * 0.48, front + b.d * 0.04], p.glow, { shape: 'cylinder', rotation: [0, 0, -0.4 + needle * 0.28], name: 'scientific-recording-needle' });
      break;
    case 3:
      for (let leaf = 0; leaf < 12; leaf += 1) {
        const angle = leaf / 12 * Math.PI * 2;
        add([b.w * 0.12, b.h * (0.22 + (leaf % 3) * 0.05), b.d * 0.07], [Math.cos(angle) * b.w * 0.27, b.h * (0.57 + Math.sin(angle * 2) * 0.22), Math.sin(angle) * b.d * 0.25], shifted('#668b55', leaf + variant), { shape: 'capsule', rotation: [0, angle, angle * 0.16], name: 'botanical-specimen-leaf' });
      }
      break;
    case 4:
      for (let plate = 0; plate < 7; plate += 1) add([b.w * (0.08 + plate * 0.02), b.h * 0.035, b.d * (0.08 + plate * 0.02)], [0, b.h * (0.64 + plate * 0.065), 0], plate % 2 ? p.light : p.secondary, { shape: 'cylinder', metalness: 0.35, name: 'service-tier-plate' });
      if (!profile) add([b.w * 0.42, b.w * 0.42, b.d * 0.055], [0, b.h * 0.66, front], p.glow, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], metalness: 0.82, name: 'service-rotary-blade' });
      break;
    case 5:
      add([b.w * 0.72, b.h * 0.16, b.d * 0.08], [0, b.h * 0.94, front], p.glow, { emissive: p.glow, emissiveIntensity: 0.26, name: 'arcade-marquee' });
      for (let button = 0; button < 10; button += 1) add([b.w * 0.045, b.w * 0.045, b.d * 0.035], [((button % 5) - 2) * b.w * 0.12, b.h * (0.46 + Math.floor(button / 5) * 0.12), front], button % 2 ? p.glow : p.light, { shape: 'sphere', emissive: p.glow, emissiveIntensity: 0.18, name: 'arcade-control-light' });
      break;
    case 6:
      for (let jack = 0; jack < 12; jack += 1) {
        const x = ((jack % 6) - 2.5) * b.w * 0.1;
        const y = b.h * (0.5 + Math.floor(jack / 6) * 0.17);
        add([b.w * 0.035, b.w * 0.035, b.d * 0.035], [x, y, front], jack % 2 ? p.glow : p.light, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'office-switchboard-jack' });
        if (jack % 3 === 0) add([b.w * 0.06, b.h * 0.22, b.w * 0.06], [x + b.w * 0.04, y - b.h * 0.12, front], p.secondary, { shape: 'torus', rotation: [0, Math.PI / 2, 0], name: 'office-switchboard-cord' });
      }
      break;
    case 7:
      for (let lever = 0; lever < 9; lever += 1) {
        const x = (lever - 4) * b.w * 0.085;
        add([b.w * 0.035, b.h * (0.35 + (lever % 3) * 0.05), b.w * 0.035], [x, b.h * 0.72, 0], lever % 2 ? p.secondary : p.trim, { shape: 'capsule', rotation: [0, 0, -0.25 + lever * 0.055], metalness: 0.62, name: 'transit-signal-lever' });
        add([b.w * 0.07, b.w * 0.07, b.w * 0.07], [x - b.w * 0.04, b.h * 0.9, 0], p.glow, { shape: 'sphere', name: 'transit-lever-handle' });
      }
      break;
    case 8:
      for (let pipe = -4; pipe <= 4; pipe += 1) add([b.w * 0.055, b.h * (0.38 + (4 - Math.abs(pipe)) * 0.1), b.w * 0.055], [pipe * b.w * 0.095, b.h * 0.74, -b.d * 0.18], pipe % 2 ? p.light : p.glow, { shape: 'cylinder', metalness: 0.72, name: 'ceremonial-organ-pipe' });
      for (let key = -5; key <= 5; key += 1) add([b.w * 0.06, b.h * 0.035, b.d * 0.16], [key * b.w * 0.065, b.h * 0.53, front], key % 2 ? p.dark : p.light, { name: 'ceremonial-console-key' });
      break;
    case 9:
      for (let vessel = 0; vessel < 5; vessel += 1) add([b.w * 0.13, b.h * (0.24 + vessel * 0.025), b.w * 0.13], [((vessel % 3) - 1) * b.w * 0.22, b.h * (0.52 + Math.floor(vessel / 3) * 0.28), front], vessel % 2 ? p.glass : p.glow, { shape: 'cylinder', opacity: 0.62, emissive: p.glow, emissiveIntensity: 0.15, name: 'medical-glass-vessel' });
      for (let lens = 0; lens < 6 + profile * 2; lens += 1) {
        const angle = lens / (6 + profile * 2) * Math.PI * 2;
        add([b.w * 0.08, b.w * 0.08, b.d * 0.04], [Math.cos(angle) * b.w * 0.28, b.h * 0.72 + Math.sin(angle) * b.h * 0.13, front], p.glass, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], opacity: 0.58, name: 'medical-phoropter-lens' });
      }
      break;
    case 10:
      if (!profile) for (let key = -7; key <= 7; key += 1) add([b.w * 0.045, b.h * 0.035, b.d * 0.22], [key * b.w * 0.05, b.h * 0.5, front], key % 3 === 0 ? p.dark : p.light, { name: 'audio-piano-key' });
      for (const side of [-1, 1]) add([b.w * 0.25, b.w * 0.25, b.d * 0.045], [side * b.w * 0.24, b.h * 0.7, front], side < 0 ? p.secondary : p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.54, name: 'audio-recording-reel' });
      break;
    case 11:
      add([b.w * 0.64, b.h * 0.48, b.d * 0.055], [0, b.h * 0.74, front], p.glass, { shape: profile ? 'cylinder' : 'sphere', rotation: [Math.PI / 2, 0, 0], opacity: 0.46, name: profile ? 'domestic-clock-face' : 'domestic-vanity-mirror' });
      for (let mark = 0; mark < 12; mark += 1) {
        const angle = mark / 12 * Math.PI * 2;
        add([b.w * 0.025, b.h * 0.07, b.d * 0.025], [Math.cos(angle) * b.w * 0.25, b.h * 0.74 + Math.sin(angle) * b.h * 0.19, front + b.d * 0.035], p.glow, { rotation: [0, 0, -angle], name: 'domestic-dial-mark' });
      }
      break;
    case 12:
      for (let gear = 0; gear < 8; gear += 1) {
        const x = ((gear % 4) - 1.5) * b.w * 0.19;
        const y = b.h * (0.47 + Math.floor(gear / 4) * 0.24);
        add([b.w * (0.08 + (gear % 3) * 0.025), b.w * (0.08 + (gear % 3) * 0.025), b.d * 0.04], [x, y, front], gear % 2 ? p.glow : p.trim, { shape: 'torus', rotation: [Math.PI / 2, 0, gear * 0.2], metalness: 0.78, name: 'industrial-gear' });
      }
      break;
    case 13:
      add([b.w * 0.5, b.w * 0.5, b.d * 0.08], [0, b.h * 0.68, front], p.glass, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], opacity: 0.55, emissive: p.glow, emissiveIntensity: 0.2, name: 'maritime-lens' });
      for (let handle = 0; handle < 6; handle += 1) {
        const angle = handle / 6 * Math.PI * 2;
        add([b.w * 0.035, b.h * 0.28, b.w * 0.035], [Math.cos(angle) * b.w * 0.28, b.h * 0.67 + Math.sin(angle) * b.h * 0.18, front + b.d * 0.04], p.glow, { shape: 'capsule', rotation: [0, 0, -angle], name: 'maritime-order-handle' });
      }
      break;
    case 14:
      add([b.w * 0.52, b.h * 0.34, b.d * 0.5], [0, b.h * 0.72, front], p.dark, { shape: profile ? 'box' : 'cylinder', rotation: profile ? [0, 0, 0] : [Math.PI / 2, 0, 0], name: profile ? 'theatrical-costume-bay' : 'theatrical-spotlight-barrel' });
      for (let vane = 0; vane < 8; vane += 1) {
        const angle = vane / 8 * Math.PI * 2;
        add([b.w * 0.11, b.h * 0.2, b.d * 0.035], [Math.cos(angle) * b.w * 0.34, b.h * 0.72 + Math.sin(angle) * b.h * 0.24, front], vane % 2 ? p.secondary : p.glow, { rotation: [0, 0, -angle], name: 'theatrical-radial-detail' });
      }
      break;
    case 15:
      for (let specimen = 0; specimen < 12; specimen += 1) {
        const x = ((specimen % 4) - 1.5) * b.w * 0.17;
        const y = b.h * (0.34 + Math.floor(specimen / 4) * 0.2);
        add([b.w * 0.08, b.h * 0.08, b.d * 0.045], [x, y, front], shifted(specimen % 2 ? p.glow : p.secondary, specimen), { shape: specimen % 3 ? 'sphere' : 'cone', emissive: specimen % 4 === 0 ? p.glow : undefined, emissiveIntensity: 0.16, name: 'display-labeled-specimen' });
      }
      break;
    case 16:
      for (let branch = 0; branch < 12; branch += 1) {
        const angle = branch / 12 * Math.PI * 2;
        add([b.w * 0.055, b.h * (0.32 + (branch % 4) * 0.05), b.w * 0.055], [Math.cos(angle) * b.w * 0.28, b.h * (0.57 + Math.sin(angle * 2) * 0.22), Math.sin(angle) * b.d * 0.28], branch % 2 ? '#567a4b' : p.glow, { shape: 'capsule', rotation: [angle * 0.2, 0, -angle], name: 'garden-topiary-branch' });
      }
      break;
    case 17:
      for (let dial = 0; dial < 10; dial += 1) add([b.w * 0.085, b.w * 0.085, b.d * 0.04], [((dial % 5) - 2) * b.w * 0.14, b.h * (0.53 + Math.floor(dial / 5) * 0.2), front], dial % 2 ? p.glow : p.light, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], emissive: p.glow, emissiveIntensity: 0.12, name: 'communication-tuning-dial' });
      for (const side of [-1, 1]) add([b.w * 0.035, b.h * 0.52, b.w * 0.035], [side * b.w * 0.28, b.h * 1.02, 0], p.glow, { shape: 'capsule', rotation: [0, 0, side * 0.18], name: 'communication-antenna' });
      break;
    case 18:
      for (let tool = -5; tool <= 5; tool += 1) add([b.w * 0.04, b.h * (0.24 + Math.abs(tool % 3) * 0.05), b.w * 0.04], [tool * b.w * 0.07, b.h * 0.68, front], tool % 2 ? p.glow : p.trim, { shape: tool % 3 ? 'capsule' : 'cone', rotation: [0, 0, tool * 0.06], metalness: 0.68, name: 'workshop-hand-tool' });
      break;
    case 19:
      if (!profile) for (const x of [-1, 1]) for (const z of [-1, 1]) add([b.w * 0.11, b.h * 0.05, b.d * 0.11], [x * b.w * 0.38, b.h * 0.57, z * b.d * 0.32], p.dark, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'leisure-billiard-pocket' });
      for (let jewel = 0; jewel < 9; jewel += 1) add([b.w * 0.06, b.w * 0.06, b.d * 0.04], [((jewel % 3) - 1) * b.w * 0.17, b.h * (0.56 + Math.floor(jewel / 3) * 0.13), front], shifted(p.glow, jewel + variant), { shape: 'sphere', name: 'leisure-painted-jewel' });
      break;
    case 20:
      for (let orbit = 0; orbit < 6; orbit += 1) add([b.w * (0.18 + orbit * 0.055), b.w * (0.18 + orbit * 0.055), b.w * 0.022], [0, b.h * (0.68 + (orbit - 2.5) * 0.035), 0], orbit % 2 ? p.secondary : p.glow, { shape: 'torus', rotation: [Math.PI / 2 + orbit * 0.12, orbit * 0.23, 0], name: 'celestial-orbit' });
      break;
    case 21:
      for (const side of [-1, 1]) {
        add([b.w * 0.1, b.h * 0.48, b.w * 0.1], [side * b.w * 0.31, b.h * 0.64, 0], p.glow, { shape: 'capsule', rotation: [0, 0, side * 0.28], name: 'anomaly-electrode-arm' });
        add([b.w * 0.2, b.w * 0.2, b.d * 0.08], [side * b.w * 0.42, b.h * 0.83, front], p.glass, { shape: 'sphere', opacity: 0.6, emissive: p.glow, emissiveIntensity: 0.3, name: 'anomaly-memory-vessel' });
      }
      break;
    case 22:
      for (let cubby = 0; cubby < 15; cubby += 1) {
        const x = ((cubby % 5) - 2) * b.w * 0.14;
        const y = b.h * (0.38 + Math.floor(cubby / 5) * 0.19);
        add([b.w * 0.1, b.h * 0.11, b.d * 0.08], [x, y, front], cubby % 2 ? p.dark : p.secondary, { name: 'hospitality-numbered-cubby' });
      }
      break;
    case 23:
      for (let bone = 0; bone < 11; bone += 1) add([b.w * 0.04, b.h * (0.18 + bone * 0.018), b.w * 0.04], [((bone % 3) - 1) * b.w * 0.12, b.h * (0.38 + Math.floor(bone / 3) * 0.14), front], bone % 2 ? p.light : p.glow, { shape: 'capsule', rotation: [0, 0, -0.3 + bone * 0.06], name: 'classroom-articulated-model' });
      break;
    default:
      for (let panel = 0; panel < 12; panel += 1) {
        const angle = panel / 12 * Math.PI * 2;
        add([b.w * 0.16, b.h * 0.22, b.d * 0.035], [Math.cos(angle) * b.w * 0.3, b.h * (0.55 + Math.sin(angle) * 0.28), Math.sin(angle) * b.d * 0.3], shifted(panel % 2 ? p.glow : p.glass, panel), { rotation: [0, angle, angle * 0.2], opacity: 0.64, emissive: p.glow, emissiveIntensity: 0.12, name: 'architectural-stained-panel' });
      }
  }
}

function addExhibitionFinish(
  root: THREE.Group,
  b: Bounds,
  p: Palette,
  variant: number,
  family: number,
): void {
  const add = partAdder(root);
  for (const side of [-1, 1]) {
    add([b.w * 0.025, b.h * 0.68, b.w * 0.025], [side * b.w * 0.46, b.h * 0.48, b.d * 0.45], p.glow, { shape: 'cylinder', metalness: 0.74, name: 'exhibition-edge-inlay' });
    for (let fastener = 0; fastener < 4; fastener += 1) add([b.w * 0.035, b.w * 0.035, b.d * 0.022], [side * b.w * 0.46, b.h * (0.18 + fastener * 0.22), b.d * 0.49], fastener % 2 ? p.light : p.glow, { shape: 'sphere', metalness: 0.78, name: 'exhibition-fastener' });
  }
  for (let mark = 0; mark < 7; mark += 1) {
    const angle = mark / 7 * Math.PI * 2 + family * 0.11;
    add([b.w * (0.025 + (mark % 3) * 0.008), b.h * 0.035, b.d * 0.018], [Math.cos(angle) * b.w * 0.25, b.h * (0.17 + mark * 0.105), b.d * 0.515], mark % 2 ? p.secondary : p.glow, { shape: mark % 2 ? 'sphere' : 'torus', rotation: [Math.PI / 2, 0, angle], name: 'exhibition-maker-mark' });
  }
  for (let flourish = 0; flourish < 3 + variant; flourish += 1) {
    const x = (flourish - (2 + variant) / 2) * b.w * 0.065;
    add([b.w * 0.032, b.h * (0.05 + flourish * 0.007), b.d * 0.022], [x, b.h * (0.94 + (flourish % 2) * 0.03), b.d * 0.1], shifted(p.glow, flourish + family), { shape: flourish % 2 ? 'cone' : 'sphere', name: 'variant-exhibition-finial' });
  }
}

function buildExhibitionHumanoid(
  kind: ExhibitionHumanoidKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const b = EXHIBITION_BOUNDS[kind];
  const p = paletteFor(kind, variant, accent, body);
  const root = new THREE.Group();
  const add = partAdder(root);
  const role = EXHIBITION_HUMANOID_KINDS.indexOf(kind);

  add([b.w * 0.5, b.h * 0.36, b.d * 0.56], [0, b.h * 0.58, 0], p.primary, { shape: 'capsule', name: 'exhibition-humanoid-torso' });
  add([b.w * 0.34, b.h * 0.22, b.d * 0.38], [0, b.h * 0.87, b.d * 0.02], p.light, { shape: 'sphere', name: 'rig-head' });
  add([b.w * 0.13, b.h * 0.09, b.d * 0.18], [0, b.h * 0.76, 0], p.light, { shape: 'cylinder', name: 'exhibition-neck' });
  add([b.w * 0.56, b.h * 0.1, b.d * 0.58], [0, b.h * 0.41, 0], p.trim, { shape: 'capsule', name: 'exhibition-tailored-waist' });
  for (const side of [-1, 1]) {
    const arm = add([b.w * 0.13, b.h * 0.42, b.w * 0.13], [side * b.w * 0.39, b.h * 0.58, 0], p.secondary, { shape: 'capsule', rotation: [0, 0, side * (0.08 + variant * 0.015)], name: side < 0 ? 'rig-arm-left' : 'rig-arm-right' });
    arm.userData.baseRotation = { x: arm.rotation.x, y: arm.rotation.y, z: arm.rotation.z };
    add([b.w * 0.15, b.h * 0.13, b.w * 0.15], [side * b.w * 0.42, b.h * 0.4, b.d * 0.03], p.light, { shape: 'sphere', name: 'exhibition-hand' });
    const leg = add([b.w * 0.15, b.h * 0.43, b.w * 0.15], [side * b.w * 0.16, b.h * 0.2, 0], p.dark, { shape: 'capsule', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
    leg.userData.baseRotation = { x: 0, y: 0, z: 0 };
    add([b.w * 0.2, b.h * 0.09, b.d * 0.42], [side * b.w * 0.16, b.h * 0.035, b.d * 0.08], p.trim, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'exhibition-shoe' });
    add([b.w * 0.12, b.h * 0.06, b.d * 0.09], [side * b.w * 0.3, b.h * 0.73, b.d * 0.23], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.68, name: 'exhibition-shoulder-clasp' });
  }
  for (let button = 0; button < 7; button += 1) add([b.w * 0.04, b.w * 0.04, b.d * 0.025], [0, b.h * (0.44 + button * 0.052), b.d * 0.3], button % 2 ? p.glow : p.light, { shape: 'sphere', metalness: 0.62, name: 'exhibition-coat-button' });
  addHumanoidRoleGear(root, b, p, variant, role);
  for (let stitch = 0; stitch < 12 + variant; stitch += 1) {
    const angle = stitch / (12 + variant) * Math.PI * 2;
    add([b.w * 0.027, b.h * 0.028, b.d * 0.018], [Math.cos(angle) * b.w * 0.25, b.h * (0.58 + Math.sin(angle) * 0.15), b.d * 0.32], stitch % 2 ? p.glow : p.light, { shape: stitch % 3 ? 'sphere' : 'torus', rotation: [Math.PI / 2, 0, angle], name: 'exhibition-garment-stitch' });
  }
  return root;
}

function addHumanoidRoleGear(
  root: THREE.Group,
  b: Bounds,
  p: Palette,
  variant: number,
  role: number,
): void {
  const add = partAdder(root);
  switch (role) {
    case 0:
      for (const side of [-1, 1]) add([b.w * 0.24, b.w * 0.24, b.d * 0.045], [side * b.w * 0.25, b.h * 0.58, b.d * 0.34], side < 0 ? p.glow : p.secondary, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'projectionist-film-reel' });
      add([b.w * 0.3, b.h * 0.12, b.d * 0.34], [b.w * 0.42, b.h * 0.5, b.d * 0.1], p.dark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'projectionist-lens' });
      break;
    case 1:
      for (let bottle = 0; bottle < 9; bottle += 1) add([b.w * 0.06, b.h * (0.1 + bottle * 0.008), b.w * 0.06], [((bottle % 5) - 2) * b.w * 0.11, b.h * (0.46 + Math.floor(bottle / 5) * 0.17), b.d * 0.33], shifted(bottle % 2 ? p.glow : p.glass, bottle), { shape: 'cylinder', opacity: 0.68, name: 'perfumer-bottle' });
      break;
    case 2:
      add([b.w * 0.58, b.h * 0.09, b.d * 0.52], [0, b.h * 1.01, 0], p.secondary, { shape: 'cylinder', name: 'operator-pillbox-hat' });
      for (let floor = 0; floor < 8; floor += 1) add([b.w * 0.045, b.w * 0.045, b.d * 0.025], [((floor % 4) - 1.5) * b.w * 0.1, b.h * (0.5 + Math.floor(floor / 4) * 0.12), b.d * 0.34], floor % 2 ? p.glow : p.light, { shape: 'sphere', emissive: p.glow, emissiveIntensity: 0.2, name: 'elevator-floor-button' });
      break;
    case 3:
      for (let leg = 0; leg < 3; leg += 1) add([b.w * 0.045, b.h * 0.72, b.w * 0.045], [b.w * (0.42 + leg * 0.08), b.h * 0.37, -b.d * (0.18 - leg * 0.12)], p.trim, { shape: 'capsule', rotation: [0, 0, -0.18 + leg * 0.18], name: 'surveyor-tripod' });
      add([b.w * 0.28, b.h * 0.22, b.d * 0.28], [b.w * 0.5, b.h * 0.8, 0], p.glow, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'surveyor-theodolite' });
      break;
    case 4:
      add([b.w * 0.42, b.h * 0.48, b.d * 0.32], [0, b.h * 1.05, 0], p.secondary, { shape: 'cone', rotation: [0, 0, 0.18], name: 'somnambulist-nightcap' });
      for (let star = 0; star < 9; star += 1) add([b.w * 0.045, b.w * 0.045, b.d * 0.02], [((star % 3) - 1) * b.w * 0.13, b.h * (0.48 + Math.floor(star / 3) * 0.1), b.d * 0.34], p.glow, { shape: 'sphere', emissive: p.glow, emissiveIntensity: 0.22, name: 'somnambulist-robe-star' });
      break;
    case 5:
      add([b.w * 0.3, b.w * 0.3, b.d * 0.05], [b.w * 0.4, b.h * 0.7, b.d * 0.15], p.glass, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'conservator-magnifier' });
      for (let brush = 0; brush < 7; brush += 1) add([b.w * 0.025, b.h * 0.38, b.w * 0.025], [-b.w * 0.42 + brush * b.w * 0.035, b.h * (0.42 + brush * 0.03), b.d * 0.08], brush % 2 ? p.glow : p.trim, { shape: 'capsule', rotation: [0, 0, -0.2 + brush * 0.05], name: 'conservator-brush' });
      break;
    case 6:
      for (let flower = 0; flower < 13; flower += 1) {
        const angle = flower / 13 * Math.PI * 2;
        add([b.w * 0.08, b.w * 0.08, b.w * 0.08], [b.w * 0.42 + Math.cos(angle) * b.w * 0.2, b.h * 0.54 + Math.sin(angle) * b.h * 0.13, b.d * 0.16], shifted(flower % 2 ? p.glow : p.secondary, flower + variant), { shape: flower % 3 ? 'sphere' : 'cone', name: 'florist-bouquet' });
      }
      break;
    case 7:
      add([b.w * 0.48, b.h * 0.42, b.d * 0.4], [b.w * 0.45, b.h * 0.57, 0], p.glow, { shape: 'cylinder', metalness: 0.78, name: 'bell-ringer-bell' });
      for (let loop = 0; loop < 7; loop += 1) add([b.w * 0.09, b.h * 0.22, b.w * 0.09], [-b.w * (0.34 + loop * 0.035), b.h * (0.75 - loop * 0.09), 0], p.secondary, { shape: 'torus', rotation: [0, Math.PI / 2, 0], name: 'bell-ringer-rope-loop' });
      break;
    case 8:
      add([b.w * 0.64, b.h * 0.52, b.d * 0.04], [b.w * 0.38, b.h * 0.54, b.d * 0.16], p.light, { rotation: [0, 0, -0.12], name: 'cartographer-map-sheet' });
      for (let line = 0; line < 8; line += 1) add([b.w * 0.42, b.h * 0.012, b.d * 0.012], [b.w * 0.38, b.h * (0.39 + line * 0.045), b.d * 0.19], line % 2 ? p.glow : p.secondary, { rotation: [0, 0, -0.45 + line * 0.12], name: 'cartographer-map-line' });
      break;
    case 9:
      add([b.w * 0.66, b.h * 0.1, b.d * 0.58], [0, b.h * 1.01, 0], p.dark, { shape: 'cylinder', name: 'stationmaster-cap' });
      add([b.w * 0.08, b.h * 0.72, b.w * 0.08], [b.w * 0.48, b.h * 0.48, 0], p.glow, { shape: 'capsule', rotation: [0, 0, -0.1], name: 'stationmaster-signal-baton' });
      for (let chain = 0; chain < 6; chain += 1) add([b.w * 0.055, b.w * 0.055, b.d * 0.025], [-b.w * 0.22 + chain * b.w * 0.07, b.h * (0.53 - chain * 0.03), b.d * 0.34], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'stationmaster-watch-chain' });
      break;
    case 10:
      for (let lens = 0; lens < 8; lens += 1) {
        const angle = lens / 8 * Math.PI * 2;
        add([b.w * 0.09, b.w * 0.09, b.d * 0.035], [Math.cos(angle) * b.w * 0.25, b.h * 0.87 + Math.sin(angle) * b.h * 0.13, b.d * 0.24], lens % 2 ? p.glass : p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'optician-lens-array' });
      }
      break;
    case 11:
      add([b.w * 0.5, b.h * 0.36, b.d * 0.42], [0, b.h * 1.06, 0], p.dark, { shape: 'cone', name: 'astronomer-hood' });
      for (let star = 0; star < 11; star += 1) add([b.w * 0.04, b.w * 0.04, b.d * 0.02], [((star % 4) - 1.5) * b.w * 0.11, b.h * (0.48 + Math.floor(star / 4) * 0.11), b.d * 0.34], p.glow, { shape: star % 3 ? 'sphere' : 'torus', rotation: [Math.PI / 2, 0, 0], emissive: p.glow, emissiveIntensity: 0.23, name: 'astronomer-star-chart' });
      break;
    case 12:
      for (let key = 0; key < 12; key += 1) {
        const angle = key / 12 * Math.PI * 2;
        add([b.w * 0.03, b.h * 0.17, b.w * 0.03], [Math.cos(angle) * b.w * 0.25, b.h * 0.54 + Math.sin(angle) * b.h * 0.13, b.d * 0.34], key % 2 ? p.glow : p.light, { shape: 'capsule', rotation: [0, 0, -angle], metalness: 0.76, name: 'locksmith-key-ring' });
      }
      break;
    case 13:
      add([b.w * 0.52, b.h * 0.52, b.d * 0.5], [0, b.h * 1.08, 0], p.light, { shape: 'cylinder', name: 'pastry-chef-toque' });
      add([b.w * 0.7, b.h * 0.06, b.d * 0.46], [b.w * 0.38, b.h * 0.48, b.d * 0.16], p.glow, { name: 'pastry-chef-tray' });
      for (let pastry = 0; pastry < 8; pastry += 1) add([b.w * 0.08, b.h * 0.06, b.d * 0.08], [b.w * (0.12 + (pastry % 4) * 0.16), b.h * (0.53 + Math.floor(pastry / 4) * 0.07), b.d * 0.16], shifted(pastry % 2 ? p.secondary : p.light, pastry), { shape: 'torus', name: 'pastry-chef-pastry' });
      break;
    default:
      add([b.w * 0.7, b.h * 0.2, b.d * 0.2], [0, b.h * 0.96, 0], p.dark, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'telephone-operator-headset' });
      for (const side of [-1, 1]) add([b.w * 0.17, b.h * 0.18, b.d * 0.1], [side * b.w * 0.29, b.h * 0.88, 0], p.glow, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'telephone-operator-earpiece' });
      for (let cord = 0; cord < 7; cord += 1) add([b.w * 0.07, b.h * 0.22, b.w * 0.07], [b.w * (0.35 + cord * 0.035), b.h * (0.76 - cord * 0.08), -b.d * 0.12], p.secondary, { shape: 'torus', rotation: [0, Math.PI / 2, 0], name: 'telephone-operator-cord' });
  }
}

function buildExhibitionCreature(
  kind: ExhibitionCreatureKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const b = EXHIBITION_BOUNDS[kind];
  const p = paletteFor(kind, variant, accent, body);
  const root = new THREE.Group();
  const species = EXHIBITION_CREATURE_KINDS.indexOf(kind);
  switch (species) {
    case 0: buildFox(root, b, p, variant); break;
    case 1: buildOwl(root, b, p, variant); break;
    case 2: buildMoth(root, b, p, variant); break;
    case 3: buildFrog(root, b, p, variant); break;
    case 4: buildSnail(root, b, p, variant); break;
    case 5: buildStag(root, b, p, variant); break;
    case 6: buildSeahorse(root, b, p, variant); break;
    case 7: buildMantis(root, b, p, variant); break;
    case 8: buildGoat(root, b, p, variant); break;
    default: buildSwan(root, b, p, variant);
  }
  addCreatureFinish(root, b, p, variant, species);
  return root;
}

function buildFox(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.66, b.h * 0.48, b.d * 0.62], [0, b.h * 0.47, -b.d * 0.08], p.primary, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'fox-body' });
  add([b.w * 0.48, b.h * 0.43, b.d * 0.44], [0, b.h * 0.68, b.d * 0.42], p.secondary, { shape: 'sphere', name: 'rig-head' });
  add([b.w * 0.34, b.h * 0.24, b.d * 0.4], [0, b.h * 0.61, b.d * 0.65], p.light, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'fox-muzzle' });
  for (const side of [-1, 1]) {
    add([b.w * 0.18, b.h * 0.36, b.w * 0.15], [side * b.w * 0.18, b.h * 0.98, b.d * 0.34], p.primary, { shape: 'cone', rotation: [0, 0, side * -0.12], name: 'fox-ear' });
    for (const z of [-1, 1]) add([b.w * 0.12, b.h * 0.52, b.w * 0.12], [side * b.w * 0.29, b.h * 0.25, z * b.d * 0.24], p.dark, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * 0.14], name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
  }
  for (let tail = 0; tail < 9 + variant; tail += 1) {
    const t = tail / (8 + variant);
    add([b.w * (0.22 - t * 0.08), b.h * (0.28 - t * 0.08), b.d * 0.18], [Math.sin(t * 1.8) * b.w * 0.32, b.h * (0.5 + Math.sin(t * Math.PI) * 0.3), -b.d * (0.4 + t * 0.44)], tail > 6 ? p.light : p.primary, { shape: 'capsule', rotation: [Math.PI / 2, 0, -0.4 + t * 0.9], name: 'fox-tail-segment' });
  }
}

function buildOwl(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.62, b.h * 0.58, b.d * 0.62], [0, b.h * 0.42, 0], p.primary, { shape: 'sphere', name: 'owl-body' });
  add([b.w * 0.58, b.h * 0.48, b.d * 0.5], [0, b.h * 0.73, b.d * 0.08], p.secondary, { shape: 'sphere', name: 'rig-head' });
  for (const side of [-1, 1]) {
    add([b.w * 0.25, b.h * 0.22, b.d * 0.08], [side * b.w * 0.2, b.h * 0.76, b.d * 0.33], p.light, { shape: 'sphere', name: 'owl-eye-disc' });
    for (let feather = 0; feather < 8; feather += 1) add([b.w * 0.12, b.h * (0.24 + feather * 0.025), b.d * 0.07], [side * b.w * (0.32 + feather * 0.035), b.h * (0.48 - feather * 0.02), -b.d * 0.02], shifted(p.primary, feather + variant), { shape: 'capsule', rotation: [0, 0, side * (0.18 + feather * 0.045)], name: side < 0 ? 'rig-wing-left' : 'rig-wing-right' });
    add([b.w * 0.04, b.h * 0.34, b.w * 0.04], [side * b.w * 0.13, b.h * 0.17, 0], p.glow, { shape: 'cylinder', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
  }
  add([b.w * 0.16, b.h * 0.2, b.d * 0.26], [0, b.h * 0.66, b.d * 0.48], p.glow, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'owl-beak' });
}

function buildMoth(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (let segment = 0; segment < 9 + variant; segment += 1) add([b.w * (0.12 - segment * 0.004), b.h * 0.11, b.d * 0.18], [0, b.h * (0.18 + segment * 0.065), 0], shifted(p.primary, segment), { shape: 'sphere', name: segment === 8 + variant ? 'rig-head' : 'moth-body-segment' });
  for (const side of [-1, 1]) {
    for (let panel = 0; panel < 8; panel += 1) {
      const t = panel / 7;
      add([b.w * (0.24 - t * 0.07), b.h * (0.42 - t * 0.12), b.d * 0.035], [side * b.w * (0.18 + t * 0.33), b.h * (0.55 + Math.sin(t * Math.PI) * 0.18), -b.d * 0.04], shifted(panel % 2 ? p.secondary : p.glow, panel + variant), { shape: 'capsule', rotation: [0, 0, side * (0.55 + t * 0.4)], opacity: 0.76, name: side < 0 ? 'rig-wing-left' : 'rig-wing-right' });
      add([b.w * 0.055, b.w * 0.055, b.d * 0.025], [side * b.w * (0.22 + t * 0.34), b.h * (0.56 + Math.sin(t * Math.PI) * 0.18), b.d * 0.01], p.dark, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'moth-wing-eye' });
    }
    add([b.w * 0.025, b.h * 0.54, b.w * 0.025], [side * b.w * 0.16, b.h * 0.96, 0], p.glow, { shape: 'capsule', rotation: [0, 0, side * -0.42], name: 'moth-antenna' });
  }
}

function buildFrog(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.7, b.h * 0.55, b.d * 0.68], [0, b.h * 0.35, -b.d * 0.05], p.primary, { shape: 'sphere', name: 'frog-body' });
  add([b.w * 0.6, b.h * 0.48, b.d * 0.48], [0, b.h * 0.5, b.d * 0.38], p.secondary, { shape: 'sphere', name: 'rig-head' });
  for (const side of [-1, 1]) {
    add([b.w * 0.2, b.h * 0.2, b.d * 0.15], [side * b.w * 0.24, b.h * 0.72, b.d * 0.34], p.light, { shape: 'sphere', name: 'frog-eye-bulb' });
    for (const z of [-1, 1]) {
      add([b.w * 0.11, b.h * 0.38, b.w * 0.11], [side * b.w * 0.35, b.h * 0.24, z * b.d * 0.23], p.primary, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * 0.55], name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
      for (let toe = -1; toe <= 1; toe += 1) add([b.w * 0.035, b.h * 0.04, b.d * 0.24], [side * b.w * (0.48 + toe * 0.03), b.h * 0.04, z * b.d * 0.32 + toe * b.d * 0.04], p.glow, { shape: 'capsule', rotation: [Math.PI / 2, 0, toe * 0.2], name: 'frog-toe' });
    }
  }
  for (let spot = 0; spot < 8 + variant; spot += 1) {
    const angle = spot / (8 + variant) * Math.PI * 2;
    add([b.w * 0.055, b.h * 0.04, b.d * 0.025], [Math.cos(angle) * b.w * 0.28, b.h * (0.43 + Math.sin(angle) * 0.16), b.d * 0.49], shifted(p.glow, spot), { shape: 'sphere', name: 'frog-spot' });
  }
}

function buildSnail(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (let segment = 0; segment < 8 + variant; segment += 1) add([b.w * (0.2 - segment * 0.006), b.h * 0.18, b.d * 0.18], [0, b.h * 0.17, b.d * (-0.35 + segment * 0.1)], shifted(p.primary, segment), { shape: 'sphere', name: segment === 7 + variant ? 'rig-head' : 'snail-foot-segment' });
  add([b.w * 0.68, b.h * 0.72, b.d * 0.6], [0, b.h * 0.55, -b.d * 0.12], p.secondary, { shape: 'sphere', name: 'snail-shell' });
  for (let coil = 0; coil < 8; coil += 1) add([b.w * (0.28 - coil * 0.025), b.h * (0.28 - coil * 0.025), b.d * 0.025], [0, b.h * 0.56, -b.d * 0.43 - coil * b.d * 0.006], coil % 2 ? p.glow : p.trim, { shape: 'torus', rotation: [Math.PI / 2, 0, coil * 0.14], name: 'snail-shell-coil' });
  for (const side of [-1, 1]) {
    add([b.w * 0.035, b.h * 0.62, b.w * 0.035], [side * b.w * 0.15, b.h * 0.53, b.d * 0.49], p.primary, { shape: 'capsule', rotation: [0, 0, side * -0.22], name: 'snail-eye-stalk' });
    add([b.w * 0.07, b.w * 0.07, b.w * 0.07], [side * b.w * 0.27, b.h * 0.83, b.d * 0.49], p.glow, { shape: 'sphere', name: 'snail-eye' });
  }
}

function buildStag(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  buildHoofedCreature(root, b, p, variant, true);
}

function buildGoat(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  buildHoofedCreature(root, b, p, variant, false);
}

function buildHoofedCreature(root: THREE.Group, b: Bounds, p: Palette, variant: number, antlers: boolean): void {
  const add = partAdder(root);
  add([b.w * 0.66, b.h * 0.42, b.d * 0.64], [0, b.h * 0.5, -b.d * 0.08], p.primary, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: antlers ? 'stag-body' : 'goat-body' });
  add([b.w * 0.4, b.h * 0.34, b.d * 0.38], [0, b.h * 0.74, b.d * 0.43], p.secondary, { shape: 'sphere', name: 'rig-head' });
  add([b.w * 0.22, b.h * 0.2, b.d * 0.36], [0, b.h * 0.68, b.d * 0.65], p.light, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'hoofed-muzzle' });
  for (const side of [-1, 1]) {
    for (const z of [-1, 1]) add([b.w * 0.1, b.h * 0.58, b.w * 0.1], [side * b.w * 0.27, b.h * 0.28, z * b.d * 0.22], p.dark, { shape: 'capsule', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
    add([b.w * 0.1, b.h * 0.3, b.w * 0.1], [side * b.w * 0.18, b.h * 0.94, b.d * 0.39], p.trim, { shape: 'capsule', rotation: [0, 0, side * -0.28], name: antlers ? 'stag-antler-main' : 'goat-horn' });
    const branches = antlers ? 6 : 3;
    for (let branch = 0; branch < branches; branch += 1) add([b.w * 0.045, b.h * (0.24 + branch * 0.025), b.w * 0.045], [side * b.w * (0.24 + branch * 0.055), b.h * (1.0 + branch * 0.08), b.d * 0.36], p.glow, { shape: 'capsule', rotation: [0, 0, side * (-0.62 + branch * 0.08)], name: antlers ? 'stag-antler-tine' : 'goat-horn-ridge' });
  }
  if (!antlers) for (let beard = 0; beard < 6 + variant; beard += 1) add([b.w * 0.035, b.h * (0.18 + beard * 0.012), b.w * 0.035], [((beard % 3) - 1) * b.w * 0.04, b.h * (0.55 - beard * 0.018), b.d * 0.62], p.light, { shape: 'capsule', name: 'goat-beard' });
}

function buildSeahorse(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const segments = 16 + variant;
  for (let segment = 0; segment < segments; segment += 1) {
    const t = segment / (segments - 1);
    const angle = t * Math.PI * 1.7;
    const x = Math.sin(angle) * b.w * (0.12 + t * 0.18);
    const y = b.h * (0.82 - t * 0.62);
    const z = Math.cos(angle) * b.d * 0.16;
    add([b.w * (0.2 - t * 0.09), b.h * (0.13 - t * 0.04), b.d * (0.18 - t * 0.07)], [x, y, z], shifted(p.primary, segment), { shape: 'sphere', name: segment === 0 ? 'rig-head' : 'seahorse-body-ring' });
    if (segment % 2 === 0) add([b.w * 0.08, b.h * 0.12, b.d * 0.035], [x - b.w * 0.12, y, z], p.glow, { shape: 'cone', rotation: [0, 0, Math.PI / 2], name: 'seahorse-dorsal-spine' });
  }
  add([b.w * 0.22, b.h * 0.13, b.d * 0.42], [0, b.h * 0.82, b.d * 0.28], p.light, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'seahorse-snout' });
  for (let fin = -3; fin <= 3; fin += 1) add([b.w * 0.13, b.h * 0.2, b.d * 0.025], [b.w * (0.24 + Math.abs(fin) * 0.025), b.h * (0.54 + fin * 0.065), 0], shifted(p.glass, fin + variant), { shape: 'capsule', rotation: [0, 0, -0.55 + fin * 0.08], opacity: 0.58, name: 'seahorse-fin-ray' });
}

function buildMantis(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.26, b.h * 0.5, b.d * 0.3], [0, b.h * 0.45, 0], p.primary, { shape: 'capsule', name: 'mantis-thorax' });
  add([b.w * 0.36, b.h * 0.28, b.d * 0.34], [0, b.h * 0.75, b.d * 0.12], p.secondary, { shape: 'sphere', name: 'rig-head' });
  for (let segment = 0; segment < 7 + variant; segment += 1) add([b.w * (0.18 - segment * 0.01), b.h * 0.11, b.d * 0.18], [0, b.h * (0.4 - segment * 0.035), -b.d * (0.13 + segment * 0.085)], shifted(p.primary, segment), { shape: 'sphere', name: 'mantis-abdomen-segment' });
  for (const side of [-1, 1]) {
    for (let leg = 0; leg < 3; leg += 1) {
      add([b.w * 0.045, b.h * 0.52, b.w * 0.045], [side * b.w * (0.3 + leg * 0.08), b.h * (0.36 - leg * 0.04), -b.d * (0.18 - leg * 0.13)], p.trim, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * (0.65 + leg * 0.12)], name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
      add([b.w * 0.035, b.h * 0.42, b.w * 0.035], [side * b.w * (0.52 + leg * 0.08), b.h * 0.16, -b.d * (0.12 - leg * 0.12)], p.dark, { shape: 'capsule', rotation: [Math.PI / 2, 0, side * -0.48], name: 'mantis-lower-leg' });
    }
    add([b.w * 0.08, b.h * 0.64, b.w * 0.08], [side * b.w * 0.32, b.h * 0.62, b.d * 0.18], p.glow, { shape: 'capsule', rotation: [0, 0, side * 0.55], name: 'mantis-raptorial-arm' });
    for (let barb = 0; barb < 6; barb += 1) add([b.w * 0.025, b.h * 0.1, b.w * 0.025], [side * b.w * (0.42 + barb * 0.045), b.h * (0.48 + barb * 0.04), b.d * 0.2], p.light, { shape: 'cone', rotation: [0, 0, side * 0.7], name: 'mantis-arm-barb' });
  }
}

function buildSwan(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.66, b.h * 0.44, b.d * 0.66], [0, b.h * 0.34, -b.d * 0.08], p.light, { shape: 'sphere', name: 'swan-body' });
  for (let neck = 0; neck < 9 + variant; neck += 1) {
    const t = neck / (8 + variant);
    const x = Math.sin(t * Math.PI) * b.w * 0.12;
    const y = b.h * (0.46 + t * 0.42);
    const z = b.d * (0.18 + t * 0.24);
    add([b.w * (0.1 - t * 0.025), b.h * 0.16, b.w * (0.1 - t * 0.025)], [x, y, z], p.light, { shape: 'sphere', name: neck === 8 + variant ? 'rig-head' : 'swan-neck-segment' });
  }
  for (const side of [-1, 1]) {
    for (let feather = 0; feather < 9; feather += 1) add([b.w * 0.11, b.h * (0.24 + feather * 0.025), b.d * 0.08], [side * b.w * (0.24 + feather * 0.035), b.h * (0.39 + feather * 0.018), -b.d * (0.08 + feather * 0.02)], shifted(p.light, feather + variant), { shape: 'capsule', rotation: [0, 0, side * (0.2 + feather * 0.04)], name: side < 0 ? 'rig-wing-left' : 'rig-wing-right' });
    add([b.w * 0.04, b.h * 0.36, b.w * 0.04], [side * b.w * 0.13, b.h * 0.14, 0], p.trim, { shape: 'cylinder', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
  }
  add([b.w * 0.14, b.h * 0.11, b.d * 0.34], [b.w * 0.02, b.h * 0.91, b.d * 0.59], p.glow, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'swan-bill' });
}

function addCreatureFinish(
  root: THREE.Group,
  b: Bounds,
  p: Palette,
  variant: number,
  species: number,
): void {
  const add = partAdder(root);
  for (let mark = 0; mark < 13 + variant; mark += 1) {
    const angle = mark / (13 + variant) * Math.PI * 2 + species * 0.19;
    add([b.w * (0.026 + (mark % 3) * 0.008), b.h * (0.026 + (mark % 2) * 0.008), b.d * 0.018], [Math.cos(angle) * b.w * 0.28, b.h * (0.45 + Math.sin(angle) * 0.17), b.d * 0.51], mark % 2 ? p.glow : p.light, { shape: mark % 3 ? 'sphere' : 'torus', rotation: [Math.PI / 2, 0, angle], emissive: variant === 5 && mark % 3 === 0 ? p.glow : undefined, emissiveIntensity: 0.18, name: 'exhibition-creature-marking' });
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
      roughness: options.roughness ?? 0.52,
      metalness: options.metalness ?? 0.14,
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
    mesh.name = options.name ?? 'exhibition-detail';
    mesh.userData.baseRotation = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
    mesh.castShadow = opacity > 0.5;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
}

function geometryFor(shape: Shape): THREE.BufferGeometry {
  return geometryForShape(shape);
}

function paletteFor(
  kind: ExhibitionModelKind,
  variant: number,
  accent: string,
  body: string,
): Palette {
  const hash = hashString(kind);
  const hue = ((hash % 31) - 15) * 0.0065 + variant * 0.026;
  const primary = new THREE.Color(body).offsetHSL(hue, 0.045, (variant - 2.5) * 0.016).getStyle();
  const secondary = new THREE.Color(accent).offsetHSL(-hue * 0.58, 0.085, (variant % 3 - 1) * 0.032).getStyle();
  const trim = new THREE.Color(primary).multiplyScalar(0.43).getStyle();
  const dark = new THREE.Color(secondary).multiplyScalar(0.24).getStyle();
  const light = new THREE.Color(primary).lerp(new THREE.Color('#f6f0e5'), 0.7).getStyle();
  const glow = ['#e8bd58', '#65ddec', '#e37cae', '#a7e368', '#ee845c', '#91a7f5'][variant]!;
  return {
    primary,
    secondary,
    trim,
    dark,
    light,
    glow,
    glass: new THREE.Color(glow).lerp(new THREE.Color('#a8d7dd'), 0.66).getStyle(),
  };
}

function shifted(color: string, amount: number): string {
  return new THREE.Color(color).offsetHSL(amount * 0.017, (amount % 3 - 1) * 0.026, (amount % 5 - 2) * 0.018).getStyle();
}
