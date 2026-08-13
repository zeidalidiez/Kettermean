import * as THREE from 'three';
import { geometryForShape } from './modelQuality';
import {
  DETAILED_MODEL_KINDS,
  LOW_POLY_MODEL_KINDS,
  VOXEL_MODEL_KINDS,
  type MixedMediaModelKind,
} from './mixedMediaAssets';

export const MIXED_MEDIA_BOUNDS: Record<MixedMediaModelKind, { w: number; h: number; d: number }> = {
  ornate_settee: { w: 2.35, h: 1.35, d: 0.95 },
  grand_piano: { w: 2.9, h: 1.55, d: 2.1 },
  diner_counter: { w: 3.8, h: 1.45, d: 1.6 },
  pipe_organ: { w: 3.4, h: 4.4, d: 1.25 },
  control_console: { w: 3.1, h: 1.9, d: 1.45 },
  operating_lamp: { w: 2.2, h: 3.2, d: 2.2 },
  greenhouse_cart: { w: 2.1, h: 1.8, d: 1.05 },
  funeral_casket: { w: 2.45, h: 1.05, d: 0.95 },
  subway_kiosk: { w: 1.55, h: 2.35, d: 1.05 },
  hotel_luggage_stack: { w: 1.55, h: 1.75, d: 1.15 },
  figure_bride: { w: 1.35, h: 2.65, d: 0.9 },
  figure_porter: { w: 1.05, h: 2.55, d: 0.78 },
  lowpoly_car: { w: 3.8, h: 1.45, d: 1.85 },
  lowpoly_tree: { w: 2.2, h: 5.2, d: 2.2 },
  lowpoly_tv: { w: 1.25, h: 1.45, d: 0.75 },
  lowpoly_toilet: { w: 0.85, h: 1.05, d: 1.15 },
  lowpoly_robot: { w: 0.95, h: 2.05, d: 0.8 },
  lowpoly_person: { w: 0.8, h: 2.2, d: 0.55 },
  lowpoly_bird: { w: 0.75, h: 0.72, d: 0.95 },
  lowpoly_dog: { w: 1.15, h: 1.25, d: 1.65 },
  voxel_giant: { w: 7, h: 15, d: 4 },
  voxel_whale: { w: 14, h: 7, d: 5 },
  voxel_hand: { w: 7, h: 12, d: 4 },
  voxel_head: { w: 8, h: 8, d: 6 },
  voxel_crawler: { w: 8, h: 4, d: 10 },
  voxel_cat: { w: 6, h: 7, d: 10 },
  voxel_watcher: { w: 5, h: 16, d: 5 },
  voxel_train: { w: 8, h: 6, d: 24 },
};

type Shape = 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus';

interface PartOptions {
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
  rotation?: [number, number, number];
  name?: string;
  flat?: boolean;
  segments?: number;
}

type VoxelPoint = [number, number, number, number];

const DETAILED = new Set<string>(DETAILED_MODEL_KINDS);
const LOW_POLY = new Set<string>(LOW_POLY_MODEL_KINDS);
const VOXEL = new Set<string>(VOXEL_MODEL_KINDS);

export function buildMixedMediaModel(
  kind: string,
  variant: number,
  accent: string,
  body: string,
): THREE.Group | null {
  if (!(kind in MIXED_MEDIA_BOUNDS)) return null;
  const typedKind = kind as MixedMediaModelKind;
  if (VOXEL.has(typedKind)) return buildVoxelModel(typedKind, variant, accent, body);
  if (LOW_POLY.has(typedKind)) return buildLowPolyModel(typedKind, variant, accent, body);
  if (DETAILED.has(typedKind)) return buildDetailedModel(typedKind, variant, accent, body);
  return null;
}

function buildDetailedModel(
  kind: MixedMediaModelKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  if (kind === 'figure_bride' || kind === 'figure_porter') {
    return buildDetailedFigure(kind, variant, accent, body);
  }

  const root = new THREE.Group();
  root.name = kind;
  root.userData.mediaStyle = 'detailed';
  root.userData.variant = variant;
  const primary = variantColor(body, variant, -0.04);
  const secondary = variantColor(accent, variant, 0.08);
  const dark = variantColor('#28262b', variant, -0.06);
  const light = variantColor('#e4d9bf', variant, 0.04);
  const add = partAdder(root);

  switch (kind) {
    case 'ornate_settee': {
      add('box', [2.2, 0.18, 0.76], [0, 0.48, 0], primary);
      add('box', [2.12, 0.72, 0.18], [0, 0.93, -0.36], primary, { roughness: 0.62 });
      for (const x of [-0.7, 0, 0.7]) {
        add('box', [0.64, 0.16, 0.72], [x, 0.61 + Math.abs(x) * 0.015, 0.02], variantColor(primary, variant + Math.round(x * 3), 0.025), { rotation: [0.035, 0, 0] });
      }
      for (const side of [-1, 1]) {
        add('box', [0.2, 0.55, 0.84], [side * 1.08, 0.72, 0], secondary);
        add('sphere', [0.32, 0.28, 0.82], [side * 1.08, 0.98, 0], primary);
        for (const z of [-0.28, 0.28]) add('cylinder', [0.11, 0.46, 0.11], [side * 0.94, 0.23, z], dark, { segments: 12 });
      }
      for (let button = 0; button < 10; button += 1) {
        const x = -0.84 + (button % 5) * 0.42;
        const y = 0.78 + Math.floor(button / 5) * 0.28;
        add('sphere', [0.055, 0.055, 0.035], [x, y, -0.27], secondary, { metalness: 0.35 });
      }
      add('torus', [2.08, 0.75, 0.08], [0, 0.94, -0.43], secondary, { rotation: [Math.PI / 2, 0, 0], metalness: 0.5, segments: 28 });
      break;
    }
    case 'grand_piano': {
      add('box', [2.7, 0.36, 1.78], [0, 0.92, -0.08], dark, { roughness: 0.25, metalness: 0.18 });
      add('box', [2.58, 0.12, 1.68], [0, 1.24, -0.08], primary, { rotation: [0.035 + variant * 0.008, 0, -0.04], roughness: 0.2 });
      add('box', [2.62, 0.18, 0.6], [0, 0.82, 0.78], primary);
      add('box', [2.48, 0.07, 0.48], [0, 0.94, 0.86], light);
      for (let key = 0; key < 18; key += 1) {
        add('box', [0.12, 0.035, 0.38], [-1.08 + key * 0.127, 0.99, 0.92], key % 3 === 1 ? dark : '#eee9db');
      }
      for (const [x, z] of [[-1.0, -0.6], [1.0, -0.6], [0.9, 0.62]] as const) {
        add('cylinder', [0.13, 0.86, 0.13], [x, 0.43, z], secondary, { segments: 16, metalness: 0.38 });
        add('sphere', [0.2, 0.09, 0.2], [x, 0.04, z], dark);
      }
      add('box', [0.08, 1.18, 0.08], [-0.9, 1.74, -0.42], secondary, { rotation: [0, 0, -0.24] });
      add('box', [1.05, 0.08, 0.72], [-0.28, 1.78, -0.32], primary, { rotation: [0, 0, -0.23] });
      for (const x of [-0.16, 0, 0.16]) add('box', [0.08, 0.04, 0.26], [x, 0.32, 0.27], secondary, { rotation: [0.25, 0, 0] });
      break;
    }
    case 'diner_counter': {
      add('box', [3.75, 0.82, 0.78], [0, 0.42, -0.32], primary);
      add('box', [3.8, 0.13, 1.1], [0, 0.9, -0.1], light, { metalness: 0.48, roughness: 0.25 });
      add('box', [3.55, 0.16, 0.08], [0, 0.58, 0.12], secondary, { metalness: 0.68 });
      for (let panel = 0; panel < 6; panel += 1) {
        add('box', [0.48, 0.46, 0.035], [-1.45 + panel * 0.58, 0.42, 0.085], variantColor(primary, variant + panel, 0.02));
      }
      for (const x of [-1.25, 0, 1.25]) {
        add('cylinder', [0.5, 0.12, 0.5], [x, 0.77, 0.65], secondary, { segments: 20 });
        add('cylinder', [0.1, 0.68, 0.1], [x, 0.38, 0.65], dark, { metalness: 0.72, segments: 12 });
        add('torus', [0.42, 0.42, 0.09], [x, 0.25, 0.65], dark, { rotation: [Math.PI / 2, 0, 0], metalness: 0.7 });
      }
      add('box', [0.85, 0.62, 0.55], [1.25, 1.23, -0.18], '#182126');
      add('box', [0.7, 0.48, 0.035], [1.25, 1.25, 0.11], secondary, { emissive: secondary, emissiveIntensity: 0.34 });
      break;
    }
    case 'pipe_organ': {
      add('box', [3.3, 2.2, 0.95], [0, 1.1, -0.12], primary);
      add('box', [2.25, 0.85, 0.78], [0, 1.0, 0.3], dark);
      add('box', [2.0, 0.12, 0.52], [0, 1.4, 0.52], light);
      for (let key = 0; key < 15; key += 1) {
        add('box', [0.115, 0.045, 0.42], [-0.82 + key * 0.118, 1.48, 0.57], key % 3 === 1 ? dark : '#eee7d2');
      }
      for (let pipe = 0; pipe < 15; pipe += 1) {
        const distance = Math.abs(pipe - 7);
        const height = 1.45 + (7 - distance) * 0.26 + (variant % 3) * 0.06;
        const x = -1.4 + pipe * 0.2;
        add('cylinder', [0.12, height, 0.12], [x, 2.15 + height * 0.5, -0.02], pipe % 3 === 0 ? secondary : light, { metalness: 0.72, roughness: 0.22, segments: 12 });
      }
      for (const x of [-1.1, 1.1]) for (let stop = 0; stop < 4; stop += 1) {
        add('sphere', [0.09, 0.09, 0.12], [x, 1.05 + stop * 0.2, 0.52], variantColor(secondary, variant + stop, 0.05));
      }
      add('box', [1.5, 0.15, 0.5], [0, 0.48, 0.68], secondary);
      add('box', [0.12, 0.48, 0.42], [-0.62, 0.24, 0.68], dark);
      add('box', [0.12, 0.48, 0.42], [0.62, 0.24, 0.68], dark);
      break;
    }
    case 'control_console': {
      add('box', [3.05, 0.75, 1.05], [0, 0.4, 0], dark);
      add('box', [2.95, 0.16, 1.25], [0, 0.84, 0.08], primary, { rotation: [-0.13, 0, 0] });
      add('box', [2.9, 0.95, 0.22], [0, 1.38, -0.48], primary);
      for (let screen = 0; screen < 3; screen += 1) {
        const x = -0.9 + screen * 0.9;
        add('box', [0.72, 0.48, 0.045], [x, 1.47, -0.34], '#101a20');
        add('box', [0.6, 0.36, 0.025], [x, 1.48, -0.305], variantColor(secondary, variant + screen, 0.12), { emissive: secondary, emissiveIntensity: 0.62 });
      }
      for (let control = 0; control < 18; control += 1) {
        const x = -1.28 + (control % 9) * 0.32;
        const z = 0.17 + Math.floor(control / 9) * 0.3;
        add(control % 4 === 0 ? 'cylinder' : 'sphere', [0.075, 0.055, 0.075], [x, 0.98, z], variantColor(secondary, variant + control, 0.16), { emissive: secondary, emissiveIntensity: control % 3 === 0 ? 0.55 : 0.12, segments: 10 });
      }
      for (const x of [-1.25, 1.25]) add('box', [0.16, 0.74, 0.9], [x, 0.38, 0], secondary);
      break;
    }
    case 'operating_lamp': {
      add('cylinder', [0.9, 0.14, 0.9], [0, 0.07, 0], dark, { metalness: 0.72, segments: 24 });
      add('cylinder', [0.16, 2.15, 0.16], [0, 1.12, 0], light, { metalness: 0.78, segments: 16 });
      add('cylinder', [0.12, 1.15, 0.12], [0.38, 2.18, 0], light, { rotation: [0, 0, -0.72], metalness: 0.78, segments: 14 });
      add('cylinder', [0.1, 0.95, 0.1], [0.96, 2.64, 0], light, { rotation: [0, 0, 0.42], metalness: 0.78, segments: 14 });
      add('torus', [1.55, 1.55, 0.22], [0.9, 2.82, 0], secondary, { rotation: [Math.PI / 2, 0, 0], metalness: 0.62, segments: 32 });
      add('cylinder', [1.45, 0.18, 1.45], [0.9, 2.82, 0], light, { rotation: [Math.PI / 2, 0, 0], segments: 28 });
      for (let bulb = 0; bulb < 8; bulb += 1) {
        const angle = (bulb / 8) * Math.PI * 2 + variant * 0.04;
        add('sphere', [0.2, 0.2, 0.08], [0.9 + Math.cos(angle) * 0.52, 2.82 + Math.sin(angle) * 0.52, 0.13], '#fff4ce', { emissive: '#fff0a0', emissiveIntensity: 0.9 });
      }
      break;
    }
    case 'greenhouse_cart': {
      add('box', [2.0, 0.12, 0.92], [0, 0.72, 0], secondary, { metalness: 0.5 });
      add('box', [1.9, 0.08, 0.82], [0, 1.35, 0], primary);
      for (const x of [-0.9, 0.9]) for (const z of [-0.36, 0.36]) {
        add('cylinder', [0.08, 1.35, 0.08], [x, 0.68, z], dark, { metalness: 0.62, segments: 12 });
      }
      for (const x of [-0.78, 0.78]) for (const z of [-0.36, 0.36]) {
        add('torus', [0.32, 0.32, 0.09], [x, 0.22, z], dark, { rotation: [0, Math.PI / 2, 0], metalness: 0.55 });
      }
      for (let pot = 0; pot < 6; pot += 1) {
        const x = -0.72 + (pot % 3) * 0.72;
        const y = pot < 3 ? 1.52 : 0.9;
        const z = pot % 2 ? 0.2 : -0.18;
        add('cone', [0.38, 0.34, 0.38], [x, y, z], variantColor('#79533d', variant + pot));
        add('cylinder', [0.06, 0.32, 0.06], [x, y + 0.28, z], '#315e3d', { segments: 8 });
        for (const side of [-1, 1]) add('sphere', [0.22, 0.08, 0.12], [x + side * 0.12, y + 0.4, z], variantColor('#4e8b55', variant + pot + side, 0.04), { rotation: [0, 0, side * 0.52] });
      }
      break;
    }
    case 'funeral_casket': {
      add('box', [2.25, 0.48, 0.82], [0, 0.34, 0], primary, { roughness: 0.32 });
      add('box', [1.8, 0.18, 0.92], [-0.12, 0.64, 0], variantColor(primary, variant, 0.04), { rotation: [0, 0, variant % 2 ? 0.03 : -0.03] });
      add('box', [0.42, 0.14, 0.78], [1.0, 0.61, 0], primary);
      for (const side of [-1, 1]) {
        add('box', [1.62, 0.07, 0.07], [-0.08, 0.42, side * 0.48], secondary, { metalness: 0.68 });
        for (const x of [-0.72, 0.52]) {
          add('torus', [0.28, 0.36, 0.07], [x, 0.42, side * 0.5], secondary, { rotation: [Math.PI / 2, 0, 0], metalness: 0.68 });
        }
      }
      for (const x of [-0.82, 0.82]) for (const z of [-0.28, 0.28]) {
        add('sphere', [0.13, 0.1, 0.13], [x, 0.08, z], dark);
      }
      add('torus', [0.52, 0.33, 0.05], [0.25, 0.75, 0.47], secondary, { rotation: [Math.PI / 2, 0, 0], metalness: 0.5 });
      break;
    }
    case 'subway_kiosk': {
      add('box', [1.45, 2.25, 0.95], [0, 1.125, 0], primary, { metalness: 0.28 });
      add('box', [1.3, 0.92, 0.08], [0, 1.63, 0.49], '#151c21');
      add('box', [1.12, 0.72, 0.035], [0, 1.66, 0.54], secondary, { emissive: secondary, emissiveIntensity: 0.5 });
      add('box', [1.2, 0.12, 0.22], [0, 1.07, 0.5], dark, { rotation: [-0.28, 0, 0] });
      for (let button = 0; button < 9; button += 1) {
        add('sphere', [0.075, 0.055, 0.04], [-0.34 + (button % 3) * 0.34, 0.89 - Math.floor(button / 3) * 0.18, 0.54], variantColor(secondary, variant + button, 0.12), { emissive: secondary, emissiveIntensity: button % 4 === 0 ? 0.55 : 0.1 });
      }
      add('box', [0.78, 0.1, 0.08], [0, 0.32, 0.5], dark);
      for (const x of [-0.55, 0.55]) add('cylinder', [0.1, 0.18, 0.1], [x, 0.05, 0], dark, { segments: 12 });
      break;
    }
    case 'hotel_luggage_stack': {
      const cases = [
        { x: -0.28, y: 0.3, z: 0.05, w: 1.0, h: 0.58, d: 0.78 },
        { x: 0.34, y: 0.83, z: -0.08, w: 0.82, h: 0.62, d: 0.65 },
        { x: -0.24, y: 1.3, z: 0.06, w: 0.72, h: 0.52, d: 0.58 },
      ];
      for (let index = 0; index < cases.length; index += 1) {
        const item = cases[index]!;
        const color = variantColor(index % 2 ? primary : secondary, variant + index, 0.04);
        add('box', [item.w, item.h, item.d], [item.x, item.y, item.z], color, { roughness: 0.62 });
        for (const strap of [-0.24, 0.24]) add('box', [0.055, item.h * 0.96, item.d * 1.02], [item.x + strap * item.w, item.y, item.z], dark);
        add('torus', [0.28, 0.36, 0.06], [item.x, item.y + item.h * 0.58, item.z], dark, { rotation: [Math.PI / 2, 0, 0], metalness: 0.32 });
        for (const corner of [-1, 1]) add('sphere', [0.08, 0.08, 0.08], [item.x + corner * item.w * 0.42, item.y - item.h * 0.48, item.z + item.d * 0.42], dark);
      }
      add('box', [0.48, 0.08, 0.34], [0.34, 1.6, -0.08], light);
      break;
    }
    default:
      break;
  }

  return root;
}

function buildDetailedFigure(
  kind: 'figure_bride' | 'figure_porter',
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const root = new THREE.Group();
  root.name = kind;
  root.userData.mediaStyle = 'detailed';
  root.userData.variant = variant;
  const skin = variantColor(['#d2a27f', '#8a5c43', '#e2bea0', '#704838'][variant % 4]!, variant, 0.01);
  const cloth = variantColor(kind === 'figure_bride' ? '#ddd8cf' : body, variant, 0.04);
  const trim = variantColor(accent, variant, 0.09);
  const dark = variantColor('#2b2528', variant, -0.03);
  const add = partAdder(root);

  add('box', [0.68, 0.72, 0.42], [0, 1.48, 0], cloth, { name: 'torso-tailored' });
  add('box', [0.52, 0.28, 0.38], [0, 1.02, 0], dark, { name: 'pelvis' });
  add('box', [0.58, 0.08, 0.45], [0, 1.16, 0.02], trim, { metalness: 0.3 });

  for (const side of [-1, 1] as const) {
    const arm = new THREE.Group();
    arm.name = side < 0 ? 'rig-arm-left' : 'rig-arm-right';
    arm.position.set(side * 0.43, 1.72, 0);
    arm.userData.baseRotation = { x: 0, y: 0, z: side * -0.04 };
    root.add(arm);
    const armAdd = partAdder(arm);
    armAdd('cylinder', [0.18, 0.62, 0.18], [0, -0.28, 0], cloth, { segments: 16 });
    armAdd('cylinder', [0.15, 0.54, 0.15], [0, -0.82, 0.04], kind === 'figure_bride' ? skin : cloth, { segments: 16 });
    armAdd('sphere', [0.2, 0.22, 0.16], [0, -1.12, 0.06], skin, { segments: 18 });

    const leg = new THREE.Group();
    leg.name = side < 0 ? 'rig-leg-left' : 'rig-leg-right';
    leg.position.set(side * 0.2, 0.98, 0);
    leg.userData.baseRotation = { x: 0, y: 0, z: 0 };
    root.add(leg);
    const legAdd = partAdder(leg);
    legAdd('cylinder', [0.22, 0.62, 0.22], [0, -0.25, 0], kind === 'figure_bride' ? '#d7d3ca' : dark, { segments: 16 });
    legAdd('cylinder', [0.19, 0.58, 0.19], [0, -0.78, 0], kind === 'figure_bride' ? '#d7d3ca' : dark, { segments: 16 });
    legAdd('box', [0.3, 0.14, 0.48], [0, -1.08, 0.1], dark);
  }

  const head = new THREE.Group();
  head.name = 'rig-head';
  head.position.set(0, 2.15, 0);
  head.userData.baseRotation = { x: 0, y: 0, z: 0 };
  root.add(head);
  const headAdd = partAdder(head);
  headAdd('sphere', [0.56, 0.68, 0.52], [0, 0, 0], skin, { segments: 24 });
  const eyeSpacing = 0.1 + (variant % 4) * 0.012;
  const eyeHeight = 0.06 + (variant % 3 - 1) * 0.014;
  for (const side of [-1, 1]) {
    headAdd('sphere', [0.085, 0.065, 0.045], [side * eyeSpacing, eyeHeight, 0.25], '#f0e9d9', { segments: 16 });
    headAdd('sphere', [0.036, 0.042, 0.025], [side * eyeSpacing, eyeHeight, 0.285], variant % 2 ? '#252a33' : '#55412d', { segments: 12 });
    headAdd('box', [0.16, 0.035, 0.025], [side * eyeSpacing, 0.16 + (variant % 2) * 0.02, 0.27], dark, { rotation: [0, 0, side * (variant - 3.5) * 0.014] });
  }
  headAdd('cone', [0.13, 0.23, 0.14], [(variant % 3 - 1) * 0.012, -0.03, 0.31], skin, { rotation: [Math.PI / 2, 0, 0], segments: 14 });
  headAdd('box', [0.22 + (variant % 2) * 0.04, 0.035, 0.028], [0, -0.17, 0.29], variant % 3 === 0 ? '#793e46' : dark);
  headAdd('sphere', [0.58, 0.28 + (variant % 3) * 0.04, 0.5], [0, 0.25, -0.05], dark, { segments: 22 });

  if (kind === 'figure_bride') {
    add('cone', [1.28, 1.52, 1.12], [0, 0.78, -0.01], cloth, { segments: 28 });
    add('torus', [0.78, 0.78, 0.08], [0, 1.74, 0.05], trim, { rotation: [Math.PI / 2, 0, 0], metalness: 0.28, segments: 28 });
    add('box', [1.1, 1.55, 0.035], [0, 1.75, -0.3], '#e5e0d7', { roughness: 0.82 });
    for (let flower = 0; flower < 7; flower += 1) {
      const angle = (flower / 7) * Math.PI * 2;
      add('sphere', [0.15, 0.1, 0.15], [0.4 + Math.cos(angle) * 0.2, 1.05 + Math.sin(angle) * 0.2, 0.3], variantColor(trim, variant + flower, 0.12), { segments: 14 });
    }
  } else {
    add('box', [0.76, 0.86, 0.46], [0, 1.45, -0.02], variantColor('#623d47', variant, 0.04));
    add('box', [0.42, 0.62, 0.28], [0.52, 0.62, 0.05], variantColor('#75523b', variant));
    add('torus', [0.28, 0.35, 0.055], [0.52, 1.0, 0.04], dark, { rotation: [Math.PI / 2, 0, 0], metalness: 0.35 });
    add('cylinder', [0.7, 0.1, 0.7], [0, 2.45, 0], variantColor('#633c43', variant), { segments: 24 });
    add('box', [0.46, 0.22, 0.4], [0.16, 2.5, 0.15], variantColor('#633c43', variant));
    for (const x of [-0.19, 0.19]) add('sphere', [0.06, 0.06, 0.035], [x, 1.48, 0.25], '#d4b552', { metalness: 0.65 });
  }

  return root;
}

function buildLowPolyModel(
  kind: MixedMediaModelKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const root = new THREE.Group();
  root.name = kind;
  root.userData.mediaStyle = 'lowpoly';
  root.userData.variant = variant;
  const primary = variantColor(body, variant, -0.08);
  const secondary = variantColor(accent, variant, 0.1);
  const dark = variantColor('#27292d', variant, -0.08);
  const add = partAdder(root, true);

  switch (kind) {
    case 'lowpoly_car':
      add('box', [3.6, 0.62, 1.7], [0, 0.53, 0], primary);
      add('box', [1.9, 0.62, 1.45], [-0.25, 1.03, 0], secondary, { rotation: [0, 0, -0.04] });
      add('box', [0.72, 0.4, 1.47], [0.78, 1.03, 0], '#33424b');
      for (const x of [-1.25, 1.25]) for (const z of [-0.78, 0.78]) add('cylinder', [0.5, 0.22, 0.5], [x, 0.28, z], dark, { rotation: [Math.PI / 2, 0, 0], segments: 6 });
      for (const z of [-0.6, 0.6]) add('box', [0.12, 0.22, 0.28], [1.84, 0.62, z], variant % 2 ? '#ffe08a' : '#ff6b5c', { emissive: variant % 2 ? '#ffe08a' : '#ff6b5c', emissiveIntensity: 0.45 });
      break;
    case 'lowpoly_tree':
      add('cylinder', [0.52, 2.6, 0.52], [0, 1.3, 0], variantColor('#684a34', variant), { segments: 5 });
      add('cone', [2.1, 2.4, 2.1], [0, 3.25, 0], variantColor('#3b6842', variant, 0.04), { segments: 5 });
      add('cone', [1.65, 2.0, 1.65], [0.16, 4.25, -0.12], variantColor('#47784a', variant, 0.08), { segments: 6 });
      if (variant % 2) add('box', [0.2, 0.8, 0.2], [0.72, 2.4, 0], dark, { rotation: [0, 0, -0.72] });
      break;
    case 'lowpoly_tv':
      add('box', [1.2, 0.95, 0.7], [0, 0.76, 0], primary);
      add('box', [0.84, 0.62, 0.06], [-0.12, 0.82, 0.38], '#142128', { emissive: variant % 3 === 0 ? secondary : '#000000', emissiveIntensity: 0.32 });
      add('cylinder', [0.12, 0.12, 0.08], [0.47, 0.86, 0.4], secondary, { rotation: [Math.PI / 2, 0, 0], segments: 6 });
      for (const x of [-0.42, 0.42]) add('box', [0.12, 0.42, 0.12], [x, 0.21, 0], dark, { rotation: [0, 0, x * 0.2] });
      for (const x of [-0.18, 0.18]) add('cylinder', [0.035, 0.62, 0.035], [x, 1.33, 0], dark, { rotation: [0, 0, x * 1.3], segments: 5 });
      break;
    case 'lowpoly_toilet':
      add('cylinder', [0.78, 0.52, 0.9], [0, 0.38, 0.18], primary, { segments: 8 });
      add('torus', [0.72, 0.92, 0.16], [0, 0.68, 0.2], lightColor(primary), { rotation: [Math.PI / 2, 0, 0], segments: 8 });
      add('box', [0.72, 0.78, 0.38], [0, 0.66, -0.36], primary);
      add('box', [0.75, 0.08, 0.42], [0, 1.04, -0.36], secondary);
      add('sphere', [0.1, 0.1, 0.06], [0.2, 0.84, -0.58], dark, { metalness: 0.5, segments: 6 });
      break;
    case 'lowpoly_robot':
      addLowPolyBiped(root, variant, primary, secondary, dark, true);
      break;
    case 'lowpoly_person':
      addLowPolyBiped(root, variant, primary, secondary, dark, false);
      break;
    case 'lowpoly_bird':
      add('sphere', [0.58, 0.5, 0.8], [0, 0.42, 0], primary, { segments: 5 });
      add('sphere', [0.38, 0.36, 0.42], [0, 0.64, 0.38], secondary, { segments: 5 });
      add('cone', [0.18, 0.36, 0.18], [0, 0.62, 0.72], variantColor('#d69b42', variant), { rotation: [Math.PI / 2, 0, 0], segments: 4 });
      for (const side of [-1, 1]) add('cone', [0.44, 0.65, 0.18], [side * 0.34, 0.42, -0.02], dark, { rotation: [0, 0, side * 0.9], segments: 4 });
      for (const x of [-0.12, 0.12]) add('cylinder', [0.04, 0.34, 0.04], [x, 0.17, 0], dark, { segments: 4 });
      break;
    case 'lowpoly_dog':
      add('box', [0.72, 0.72, 1.15], [0, 0.72, -0.08], primary);
      add('sphere', [0.68, 0.68, 0.62], [0, 1.0, 0.58], secondary, { segments: 5 });
      add('box', [0.46, 0.34, 0.48], [0, 0.86, 0.93], primary);
      for (const side of [-1, 1]) add('cone', [0.24, 0.48, 0.2], [side * 0.24, 1.33, 0.52], dark, { rotation: [0, 0, side * 0.3], segments: 4 });
      for (const x of [-0.25, 0.25]) for (const z of [-0.36, 0.25]) add('box', [0.18, 0.62, 0.18], [x, 0.31, z], dark);
      add('cylinder', [0.12, 0.92, 0.12], [0, 1.04, -0.82], primary, { rotation: [0.7, 0, 0], segments: 5 });
      break;
    default:
      break;
  }
  return root;
}

function addLowPolyBiped(
  root: THREE.Group,
  variant: number,
  primary: string,
  secondary: string,
  dark: string,
  robot: boolean,
): void {
  const add = partAdder(root, true);
  add(robot ? 'box' : 'cone', [0.62, 0.78, 0.42], [0, 1.36, 0], primary, { segments: 5 });
  const head = new THREE.Group();
  head.name = 'rig-head';
  head.position.set(0, 1.86, 0);
  head.userData.baseRotation = { x: 0, y: 0, z: 0 };
  root.add(head);
  const headAdd = partAdder(head, true);
  headAdd(robot ? 'box' : 'sphere', [0.48, 0.48, 0.44], [0, 0, 0], robot ? secondary : lightColor(primary), { segments: 5 });
  for (const x of [-0.12, 0.12]) headAdd('sphere', [0.055, 0.055, 0.035], [x, 0.05, 0.23], robot ? '#9df6ff' : dark, { emissive: robot ? '#56ddeb' : '#000000', emissiveIntensity: robot ? 0.72 : 0, segments: 4 });
  for (const side of [-1, 1] as const) {
    const arm = new THREE.Group();
    arm.name = side < 0 ? 'rig-arm-left' : 'rig-arm-right';
    arm.position.set(side * 0.41, 1.56, 0);
    arm.userData.baseRotation = { x: 0, y: 0, z: 0 };
    root.add(arm);
    partAdder(arm, true)('box', [0.16, 0.8, 0.16], [0, -0.36, 0], robot ? secondary : primary);
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'rig-leg-left' : 'rig-leg-right';
    leg.position.set(side * 0.18, 1.02, 0);
    leg.userData.baseRotation = { x: 0, y: 0, z: 0 };
    root.add(leg);
    const legAdd = partAdder(leg, true);
    legAdd('box', [0.2, 0.82, 0.2], [0, -0.36, 0], robot ? dark : secondary);
    legAdd('box', [0.28, 0.14, 0.42], [0, -0.8, 0.08], dark);
  }
  if (robot) add('cylinder', [0.08, 0.3, 0.08], [0, 2.14, 0], dark, { segments: 4 });
  if (variant % 2) add('box', [0.42, 0.16, 0.05], [0, 1.32, 0.24], secondary);
}

function buildVoxelModel(
  kind: MixedMediaModelKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const root = new THREE.Group();
  root.name = kind;
  root.userData.mediaStyle = 'voxel';
  root.userData.variant = variant;
  const content = new THREE.Group();
  content.name = 'voxel-content';
  root.add(content);
  const points = voxelPoints(kind, variant);
  const colors = [
    variantColor(body, variant, -0.08),
    variantColor(accent, variant, 0.1),
    variantColor('#242733', variant, -0.06),
    variantColor('#d9cba8', variant, 0.08),
  ];
  const matrix = new THREE.Matrix4();
  for (let palette = 0; palette < colors.length; palette += 1) {
    const selected = points.filter((point) => point[3] === palette);
    if (!selected.length) continue;
    const geometry = new THREE.BoxGeometry(0.94, 0.94, 0.94);
    const material = new THREE.MeshStandardMaterial({
      color: colors[palette],
      roughness: palette === 1 ? 0.48 : 0.82,
      metalness: palette === 1 ? 0.28 : 0.04,
      flatShading: true,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, selected.length);
    mesh.name = `voxel-layer-${palette}`;
    selected.forEach((point, index) => {
      matrix.makeTranslation(point[0], point[1], point[2]);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    content.add(mesh);
  }

  const bounds = MIXED_MEDIA_BOUNDS[kind];
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const zs = points.map((point) => point[2]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const sx = bounds.w / Math.max(1, maxX - minX + 0.94);
  const sy = bounds.h / Math.max(1, maxY - minY + 0.94);
  const sz = bounds.d / Math.max(1, maxZ - minZ + 0.94);
  content.scale.set(sx, sy, sz);
  content.position.set(
    -((minX + maxX) * 0.5) * sx,
    -(minY - 0.47) * sy,
    -((minZ + maxZ) * 0.5) * sz,
  );
  return root;
}

function voxelPoints(kind: MixedMediaModelKind, variant: number): VoxelPoint[] {
  const points: VoxelPoint[] = [];
  const add = (x: number, y: number, z: number, palette = 0): void => {
    if ((x * 3 + y * 5 + z * 7 + variant) % 29 === 0 && palette === 0) return;
    points.push([x, y, z, palette]);
  };
  const fill = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    palette = 0,
  ): void => {
    for (let x = x0; x <= x1; x += 1) for (let y = y0; y <= y1; y += 1) for (let z = z0; z <= z1; z += 1) add(x, y, z, palette);
  };

  switch (kind) {
    case 'voxel_giant':
      fill(-1, 1, 5, 10, -1, 1);
      fill(-1, -1, 0, 5, -1, 0, 2);
      fill(1, 1, 0, 5, -1, 0, 2);
      fill(-3, -2, 5, 9, 0, 0, 0);
      fill(2, 3, 5, 9, 0, 0, 0);
      fill(-1, 1, 11, 14, -1, 1, 3);
      add(-1, 12, 1, 2);
      add(1, 12, 1, 2);
      fill(-1, 1, 10, 10, 1, 1, 1);
      if (variant % 2) fill(-2, 2, 15, 15, 0, 0, 1);
      break;
    case 'voxel_whale':
      for (let x = -7; x <= 6; x += 1) for (let y = -2; y <= 2; y += 1) for (let z = -2; z <= 2; z += 1) {
        const shape = (x / 7) ** 2 + (y / 2.5) ** 2 + (z / 2.6) ** 2;
        if (shape <= 1) add(x, y, z, y < -1 ? 3 : 0);
      }
      fill(7, 9, -1, 1, -1, 1, 0);
      for (const side of [-1, 1]) fill(9, 11, side, side, -2, 2, 1);
      for (const side of [-1, 1]) fill(-1, 2, -2, -2, side * 3, side * 4, 1);
      add(-5, 1, 2, 2);
      break;
    case 'voxel_hand':
      fill(-2, 2, 0, 5, -1, 1, 0);
      for (let finger = -2; finger <= 2; finger += 1) {
        const height = 7 + ((finger + variant) % 3 + 3) % 3;
        fill(finger, finger, 6, height, 0, 1, finger === 0 ? 1 : 0);
      }
      fill(3, 4, 1, 5, 0, 1, 0);
      if (variant % 2) fill(-2, 2, 2, 2, 2, 2, 1);
      break;
    case 'voxel_head':
      for (let x = -4; x <= 4; x += 1) for (let y = -4; y <= 4; y += 1) for (let z = -3; z <= 3; z += 1) {
        const shape = (x / 4.5) ** 2 + (y / 4.5) ** 2 + (z / 3.5) ** 2;
        if (shape <= 1 && shape >= 0.46) add(x, y, z, 3);
      }
      fill(-3, -1, 1, 1, 3, 3, 2);
      fill(1, 3, 1, 1, 3, 3, 2);
      fill(-2, 2, -2, -2, 3, 3, 1);
      add(0, 0, 4, 0);
      if (variant % 3 === 0) fill(-4, 4, 4, 4, -1, 1, 1);
      break;
    case 'voxel_crawler':
      fill(-3, 3, 2, 4, -2, 2, 0);
      fill(-2, 2, 1, 1, -4, 4, 0);
      for (const x of [-4, -2, 2, 4]) for (const z of [-3, 0, 3]) fill(x, x, 0, 2, z, z, 2);
      fill(-1, 1, 3, 5, 2, 4, 3);
      add(-1, 4, 5, 1);
      add(1, 4, 5, 1);
      break;
    case 'voxel_cat':
      fill(-2, 2, 2, 5, -3, 2, 0);
      fill(-2, 2, 3, 6, 3, 5, 3);
      for (const x of [-2, 2]) fill(x, x, 6, 8, 4, 4, 1);
      for (const x of [-2, 2]) for (const z of [-2, 1]) fill(x, x, 0, 2, z, z, 2);
      for (let step = 0; step < 7; step += 1) add(2 + Math.floor(step / 2), 4 + step, -4 - step, 0);
      add(-1, 5, 6, 2);
      add(1, 5, 6, 2);
      break;
    case 'voxel_watcher':
      fill(-1, 1, 0, 11, -1, 1, 0);
      fill(-2, 2, 12, 15, -2, 2, 3);
      fill(-2, 2, 13, 14, 2, 2, 2);
      fill(-1, 1, 13, 14, 3, 3, 1);
      for (const side of [-1, 1]) fill(side * 2, side * 2, 5, 10, 0, 0, 0);
      if (variant % 2) fill(-2, 2, 16, 16, 0, 0, 1);
      break;
    case 'voxel_train':
      fill(-3, 3, 1, 4, -10, 10, 0);
      fill(-2, 2, 5, 6, -9, 9, 1);
      fill(-3, 3, 3, 6, 8, 11, 0);
      for (let z = -8; z <= 8; z += 4) for (const x of [-4, 4]) add(x, 1, z, 2);
      for (let z = -7; z <= 7; z += 3) for (const x of [-3, 3]) fill(x, x, 4, 5, z, z, 2);
      fill(-1, 1, 4, 5, 12, 12, 1);
      break;
    default:
      add(0, 0, 0, 0);
  }
  return points;
}

function partAdder(parent: THREE.Object3D, flat = false) {
  return (
    shape: Shape,
    scale: [number, number, number],
    position: [number, number, number],
    color: string,
    options: PartOptions = {},
  ): THREE.Mesh => {
    const mesh = makePart(shape, scale, position, color, { ...options, flat: options.flat ?? flat });
    parent.add(mesh);
    return mesh;
  };
}

function makePart(
  shape: Shape,
  scale: [number, number, number],
  position: [number, number, number],
  color: string,
  options: PartOptions,
): THREE.Mesh {
  const geometry = geometryForShape(shape);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: options.emissive ?? '#000000',
    emissiveIntensity: options.emissiveIntensity ?? 0,
    metalness: options.metalness ?? 0.08,
    roughness: options.roughness ?? 0.74,
    flatShading: options.flat ?? false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  mesh.name = options.name ?? `${shape}-part`;
  mesh.userData.baseRotation = {
    x: mesh.rotation.x,
    y: mesh.rotation.y,
    z: mesh.rotation.z,
  };
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function variantColor(color: string, variant: number, offset = 0): string {
  return new THREE.Color(color)
    .offsetHSL(
      ((variant * 0.071 + offset) % 1) - 0.12,
      (variant % 3 - 1) * 0.045,
      (variant - 3.5) * 0.018,
    )
    .getStyle();
}

function lightColor(color: string): string {
  return new THREE.Color(color).lerp(new THREE.Color('#f4efe3'), 0.62).getStyle();
}
