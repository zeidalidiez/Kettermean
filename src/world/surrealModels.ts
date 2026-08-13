import * as THREE from 'three';
import { geometryForShape } from './modelQuality';

export type SurrealModelKind =
  | 'elevator_bank'
  | 'escalator'
  | 'gas_pump'
  | 'playground_slide'
  | 'satellite_dish'
  | 'motel_sign'
  | 'newsstand'
  | 'shipping_container'
  | 'upright_piano'
  | 'chandelier'
  | 'cemetery_gate'
  | 'water_tower';

export const SURREAL_BOUNDS: Record<SurrealModelKind, { w: number; h: number; d: number }> = {
  elevator_bank: { w: 4.8, h: 3.1, d: 0.55 },
  escalator: { w: 2.6, h: 2.8, d: 5.2 },
  gas_pump: { w: 1.15, h: 2.15, d: 0.8 },
  playground_slide: { w: 2.2, h: 2.6, d: 4.4 },
  satellite_dish: { w: 3.4, h: 3.5, d: 3.4 },
  motel_sign: { w: 3.2, h: 5.4, d: 0.7 },
  newsstand: { w: 3.2, h: 2.8, d: 2.2 },
  shipping_container: { w: 2.5, h: 2.6, d: 5.8 },
  upright_piano: { w: 1.75, h: 1.45, d: 0.72 },
  chandelier: { w: 2.2, h: 2.8, d: 2.2 },
  cemetery_gate: { w: 5.8, h: 3.8, d: 1.0 },
  water_tower: { w: 4.8, h: 8.5, d: 4.8 },
};

interface MeshOptions {
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
  rotation?: [number, number, number];
  name?: string;
}

/** Geometry module for the expansion; semantic tags remain in surrealAssets.ts. */
export function buildSurrealModel(
  kind: string,
  variant: number,
  accent: string,
  body: string,
): THREE.Group | null {
  if (!(kind in SURREAL_BOUNDS)) return null;
  const typedKind = kind as SurrealModelKind;
  const group = new THREE.Group();
  group.name = typedKind;
  const primary = variantColor(body, variant, -0.05);
  const secondary = variantColor(accent, variant, 0.08);
  const dark = variantColor('#30343a', variant, -0.08);
  const light = variantColor('#dfe5df', variant, 0.08);
  const add = (
    shape: 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus',
    scale: [number, number, number],
    position: [number, number, number],
    color: string,
    options: MeshOptions = {},
  ): THREE.Mesh => {
    const object = makePart(shape, scale, position, color, options);
    group.add(object);
    return object;
  };

  switch (typedKind) {
    case 'elevator_bank': {
      add('box', [4.7, 3.05, 0.3], [0, 1.525, 0], dark);
      const doors = variant % 3 === 0 ? 2 : 3;
      const doorWidth = 3.9 / doors;
      for (let door = 0; door < doors; door += 1) {
        const x = (door - (doors - 1) * 0.5) * (doorWidth + 0.08);
        add('box', [doorWidth, 2.52, 0.12], [x, 1.3, 0.2], primary, { metalness: 0.68, roughness: 0.28 });
        add('box', [0.025, 2.4, 0.04], [x, 1.3, 0.272], secondary, { emissive: secondary, emissiveIntensity: 0.18 });
        add('box', [0.5, 0.2, 0.06], [x, 2.76, 0.26], dark);
        add('sphere', [0.1 + variant * 0.006, 0.1, 0.06], [x, 2.76, 0.31], secondary, { emissive: secondary, emissiveIntensity: 0.7 });
      }
      add('box', [0.15, 0.38, 0.09], [2.15, 1.35, 0.25], light, { metalness: 0.8 });
      break;
    }
    case 'escalator': {
      add('box', [2.55, 0.22, 5.1], [0, 0.12, 0], dark, { rotation: [-0.42, 0, 0] });
      const steps = 12;
      for (let step = 0; step < steps; step += 1) {
        const t = step / (steps - 1);
        add('box', [1.65, 0.16, 0.42], [0, 0.22 + t * 2.25, 2.2 - t * 4.4], variant % 2 ? secondary : primary, { metalness: 0.65, roughness: 0.32 });
      }
      for (const side of [-1, 1]) {
        add('box', [0.12, 0.7, 5.25], [side * 1.08, 1.35, 0], secondary, { rotation: [-0.42, 0, 0], emissive: secondary, emissiveIntensity: 0.12 });
        add('box', [0.1, 0.1, 5.35], [side * 1.08, 1.75, 0], dark, { rotation: [-0.42, 0, 0] });
      }
      break;
    }
    case 'gas_pump': {
      add('box', [0.82, 0.18, 0.65], [0, 0.09, 0], dark);
      add('box', [0.94, 1.58, 0.68], [0, 0.92, 0], primary, { metalness: 0.45 });
      add('box', [0.72, 0.46, 0.08], [0, 1.35, 0.37], '#18232a');
      add('box', [0.56, 0.26, 0.04], [0, 1.36, 0.42], secondary, { emissive: secondary, emissiveIntensity: 0.58 });
      add('box', [1.08, 0.2, 0.78], [0, 1.78, 0], secondary);
      add('torus', [0.62 + variant * 0.025, 0.85, 0.18], [0.58, 0.95, 0], dark, { rotation: [0, Math.PI / 2, 0] });
      add('box', [0.16, 0.54, 0.14], [0.72, 0.72, 0.08], dark, { rotation: [0, 0, -0.25] });
      break;
    }
    case 'playground_slide': {
      add('box', [1.55, 0.18, 1.5], [0, 2.05, -1.25], secondary);
      for (const x of [-0.65, 0.65]) for (const z of [-1.8, -0.7]) {
        add('cylinder', [0.12, 2.1, 0.12], [x, 1.05, z], dark, { metalness: 0.48 });
      }
      for (let rung = 0; rung < 6; rung += 1) {
        add('box', [1.2, 0.1, 0.1], [0, 0.35 + rung * 0.3, -1.84], light, { metalness: 0.55 });
      }
      add('box', [1.15 + variant * 0.025, 0.14, 3.15], [0, 1.03, 0.66], primary, { rotation: [0.58, 0, 0], metalness: 0.28 });
      for (const side of [-1, 1]) add('box', [0.12, 0.42, 3.2], [side * 0.58, 1.2, 0.65], secondary, { rotation: [0.58, 0, 0] });
      break;
    }
    case 'satellite_dish': {
      add('cylinder', [0.7, 0.2, 0.7], [0, 0.1, 0], dark, { metalness: 0.65 });
      add('cylinder', [0.16, 2.25, 0.16], [0, 1.2, 0], light, { metalness: 0.8, rotation: [0, 0, variant % 2 ? 0.12 : -0.12] });
      add('sphere', [3.0, 0.38 + variant * 0.018, 3.0], [0, 2.65, 0], primary, { metalness: 0.6, roughness: 0.3, rotation: [0.9, variant * 0.12, 0] });
      add('cylinder', [0.08, 1.2, 0.08], [0, 2.75, 0.62], dark, { rotation: [0.72, 0, 0] });
      add('sphere', [0.24, 0.24, 0.24], [0, 3.18, 1.05], secondary, { emissive: secondary, emissiveIntensity: 0.25 });
      for (const side of [-1, 1]) add('box', [0.1, 1.2, 0.1], [side * 0.65, 0.65, 0], dark, { rotation: [0, 0, side * 0.52] });
      break;
    }
    case 'motel_sign': {
      for (const side of [-1, 1]) add('box', [0.14, 4.7, 0.14], [side * 1.18, 2.35, 0], dark, { metalness: 0.5 });
      add('box', [3.05, 1.45 + variant * 0.035, 0.26], [0, 3.9, 0], primary, { metalness: 0.3 });
      add('box', [2.72, 0.82, 0.08], [0, 3.95, 0.18], secondary, { emissive: secondary, emissiveIntensity: 0.74 });
      add('box', [2.25, 0.42, 0.22], [0, 2.9, 0], dark);
      for (let bulb = 0; bulb < 7; bulb += 1) add('sphere', [0.09, 0.09, 0.07], [-1.25 + bulb * 0.42, 4.52, 0.22], light, { emissive: light, emissiveIntensity: 0.65 });
      break;
    }
    case 'newsstand': {
      add('box', [3.0, 0.22, 2.0], [0, 0.11, 0], dark);
      add('box', [3.0, 2.3, 0.18], [0, 1.25, -0.91], primary);
      add('box', [0.18, 2.3, 1.8], [-1.41, 1.25, 0], primary);
      add('box', [0.18, 2.3, 1.8], [1.41, 1.25, 0], primary);
      add('box', [3.25, 0.24, 2.2], [0, 2.48, 0], secondary);
      add('box', [3.0, 0.18, 0.8], [0, 1.05, 0.58], light);
      for (let row = 0; row < 3; row += 1) for (let column = 0; column < 5; column += 1) {
        add('box', [0.38, 0.48 + (variant % 3) * 0.03, 0.035], [-0.94 + column * 0.47, 1.25 + row * 0.48, -0.8], variantColor(column % 2 ? secondary : light, variant + row, 0.04));
      }
      break;
    }
    case 'shipping_container': {
      add('box', [2.42, 2.48, 5.65], [0, 1.24, 0], primary, { metalness: 0.5, roughness: 0.56 });
      for (let rib = 0; rib < 8; rib += 1) {
        const z = -2.55 + rib * 0.73;
        for (const side of [-1, 1]) add('box', [0.055, 2.25, 0.08], [side * 1.23, 1.28, z], secondary, { metalness: 0.62 });
      }
      for (const x of [-0.58, 0.58]) add('box', [0.08, 2.25, 0.08], [x, 1.25, 2.86], dark, { metalness: 0.75 });
      add('box', [2.1, 0.06, 0.05], [0, 1.25, 2.91], dark);
      for (const x of [-1.12, 1.12]) for (const y of [0.12, 2.38]) add('box', [0.14, 0.14, 0.14], [x, y, 2.86], secondary, { metalness: 0.8 });
      break;
    }
    case 'upright_piano': {
      add('box', [1.68, 1.34, 0.58], [0, 0.7, -0.04], dark);
      add('box', [1.74, 0.12, 0.72], [0, 0.82, 0.18], primary);
      add('box', [1.56, 0.56, 0.18], [0, 1.05, 0.19], primary);
      const keys = 14;
      for (let key = 0; key < keys; key += 1) {
        const x = -0.72 + key * (1.44 / (keys - 1));
        add('box', [0.09, 0.045, 0.31], [x, 0.91, 0.41], key % 2 && (key + variant) % 3 === 0 ? dark : light);
      }
      for (const x of [-0.58, 0.58]) add('box', [0.12, 0.62, 0.12], [x, 0.31, 0.15], primary);
      for (const x of [-0.14, 0, 0.14]) add('box', [0.08, 0.05, 0.22], [x, 0.18, 0.28], secondary, { metalness: 0.72, rotation: [0.18, 0, 0] });
      break;
    }
    case 'chandelier': {
      add('cylinder', [0.1, 1.45, 0.1], [0, 2.08, 0], dark, { metalness: 0.75 });
      add('sphere', [0.34, 0.34, 0.34], [0, 1.35, 0], secondary, { metalness: 0.65 });
      add('torus', [1.45 + variant * 0.04, 1.45 + variant * 0.04, 0.12], [0, 0.92, 0], secondary, { metalness: 0.72, rotation: [Math.PI / 2, 0, 0] });
      const arms = 6 + (variant % 3);
      for (let arm = 0; arm < arms; arm += 1) {
        const angle = (arm / arms) * Math.PI * 2;
        const x = Math.cos(angle) * 0.72;
        const z = Math.sin(angle) * 0.72;
        add('cylinder', [0.07, 0.9, 0.07], [x * 0.5, 0.95, z * 0.5], secondary, { metalness: 0.7, rotation: [z * 0.45, 0, -x * 0.45] });
        add('sphere', [0.22, 0.32, 0.22], [x, 0.72, z], light, { emissive: light, emissiveIntensity: 0.7 });
      }
      break;
    }
    case 'cemetery_gate': {
      for (const side of [-1, 1]) {
        add('box', [0.72, 3.45, 0.72], [side * 2.38, 1.72, 0], primary);
        add('box', [0.95, 0.22, 0.95], [side * 2.38, 3.52, 0], secondary);
        add('cone', [0.62, 0.72 + variant * 0.025, 0.62], [side * 2.38, 3.86, 0], dark);
      }
      const bars = 10;
      for (let bar = 0; bar < bars; bar += 1) {
        const x = -1.85 + bar * (3.7 / (bars - 1));
        add('box', [0.08, 2.65 + Math.sin((bar / bars) * Math.PI) * 0.55, 0.08], [x, 1.38, 0], dark, { metalness: 0.78 });
      }
      add('torus', [4.2, 2.25, 0.13], [0, 2.65, 0], dark, { metalness: 0.78 });
      add('box', [4.6, 0.12, 0.12], [0, 0.18, 0], dark, { metalness: 0.78 });
      break;
    }
    case 'water_tower': {
      for (const x of [-1.35, 1.35]) for (const z of [-1.35, 1.35]) {
        add('cylinder', [0.15, 5.8, 0.15], [x, 2.9, z], dark, { metalness: 0.72, rotation: [z * 0.008, 0, -x * 0.008] });
      }
      add('cylinder', [4.25, 2.25 + variant * 0.045, 4.25], [0, 6.55, 0], primary, { metalness: 0.58, roughness: 0.4 });
      add('cone', [4.45, 1.15, 4.45], [0, 8.18, 0], secondary, { metalness: 0.5 });
      add('cylinder', [0.16, 1.1, 0.16], [0, 8.55, 0], dark, { metalness: 0.75 });
      for (const y of [1.4, 3.0, 4.6]) {
        add('box', [3.6, 0.1, 0.1], [0, y, 0], dark, { metalness: 0.7, rotation: [0, Math.PI / 4 + variant * 0.025, 0] });
        add('box', [0.1, 0.1, 3.6], [0, y, 0], dark, { metalness: 0.7, rotation: [0, Math.PI / 4 + variant * 0.025, 0] });
      }
      break;
    }
  }

  return group;
}

function makePart(
  shape: 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus',
  scale: [number, number, number],
  position: [number, number, number],
  color: string,
  options: MeshOptions,
): THREE.Mesh {
  const geometry = geometryForShape(shape);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: options.emissive ?? '#000000',
    emissiveIntensity: options.emissiveIntensity ?? 0,
    metalness: options.metalness ?? 0.08,
    roughness: options.roughness ?? 0.74,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  mesh.name = options.name ?? `${shape}-part`;
  mesh.userData.baseRotation = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function variantColor(color: string, variant: number, offset = 0): string {
  return new THREE.Color(color)
    .offsetHSL(((variant * 0.073 + offset) % 1) - 0.12, (variant % 3 - 1) * 0.045, (variant - 3.5) * 0.022)
    .getStyle();
}
