import * as THREE from 'three';
import { hashString } from '../core/rng';

export type FaceHostContext = 'humanoid' | 'animal' | 'object';
export type FaceKitOrigin = 'human' | 'animal';
export type FaceKitStyle =
  | 'human'
  | 'mask'
  | 'feline'
  | 'canine'
  | 'avian'
  | 'amphibian'
  | 'insect';

export interface FaceKitDecision {
  mounted: boolean;
  host: FaceHostContext;
  origin: FaceKitOrigin;
  style: FaceKitStyle;
  crossed: boolean;
}

interface FacePartOptions {
  shape?: 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'capsule';
  rotation?: [number, number, number];
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
  name?: string;
}

/**
 * A face kit is intentionally independent from body type. Human hosts receive
 * animal-origin kits on three variants, animals receive human-origin kits on
 * three variants, and a quarter of object variants grow either kind of face.
 */
export function faceKitDecision(
  kind: string,
  variant: number,
  host: FaceHostContext,
): FaceKitDecision {
  const animalStyles: readonly FaceKitStyle[] = [
    'feline',
    'canine',
    'avian',
    'amphibian',
    'insect',
  ];
  const hash = hashString(`${kind}:face-kit:${variant}`);

  if (host === 'humanoid') {
    const crossed = variant === 2 || variant === 5 || variant === 7;
    const style = crossed
      ? animalStyles[hash % animalStyles.length]!
      : variant % 4 === 1 ? 'mask' : 'human';
    return { mounted: true, host, origin: crossed ? 'animal' : 'human', style, crossed };
  }

  if (host === 'animal') {
    const crossed = variant === 1 || variant === 4 || variant === 6;
    const style = crossed
      ? variant === 4 ? 'mask' : 'human'
      : animalStyles[hash % animalStyles.length]!;
    return { mounted: true, host, origin: crossed ? 'human' : 'animal', style, crossed };
  }

  const mounted = variant === 2 || variant === 6 || (variant === 0 && hash % 13 === 0);
  const humanOrigin = (hash >>> 3) % 2 === 0;
  const style = humanOrigin
    ? (hash % 3 === 0 ? 'mask' : 'human')
    : animalStyles[hash % animalStyles.length]!;
  return {
    mounted,
    host,
    origin: humanOrigin ? 'human' : 'animal',
    style,
    crossed: mounted,
  };
}

export function decorateModelWithFaceKit(
  model: THREE.Group,
  options: {
    kind: string;
    variant: number;
    host: FaceHostContext;
    bounds: { w: number; h: number; d: number };
    accent: string;
  },
): FaceKitDecision {
  const decision = faceKitDecision(options.kind, options.variant, options.host);
  model.userData.faceKitDecision = decision;
  if (!decision.mounted) return decision;

  const kit = buildFaceKit(decision.style, options.kind, options.variant, options.accent);
  const { w, h, d } = options.bounds;
  const size = options.host === 'humanoid'
    ? Math.min(0.48, Math.max(0.25, w * 0.47))
    : options.host === 'animal'
      ? Math.min(0.58, Math.max(0.23, Math.min(w, h) * 0.43))
      : Math.min(0.68, Math.max(0.2, Math.min(w, h) * 0.24));
  kit.scale.setScalar(size);
  kit.position.set(
    options.host === 'object' ? ((options.variant % 3) - 1) * w * 0.13 : 0,
    options.host === 'humanoid' ? h * 0.855 : options.host === 'animal' ? h * 0.72 : h * 0.61,
    d * 0.505 + size * 0.08,
  );
  kit.name = 'surreal-face-kit';
  kit.userData.faceKitStyle = decision.style;
  kit.userData.faceKitOrigin = decision.origin;
  kit.userData.faceHost = decision.host;
  kit.userData.crossCategory = decision.crossed;
  model.add(kit);
  return decision;
}

export function buildFaceKit(
  style: FaceKitStyle,
  seedKey: string,
  variant: number,
  accent: string,
): THREE.Group {
  const root = new THREE.Group();
  const skinPalette = ['#e4bfa5', '#b87c5b', '#7d4f3b', '#efd2b8', '#9f684f', '#d5a17c', '#6d4435', '#c58a68'];
  const furPalette = ['#b36b3d', '#d2c5a5', '#383b41', '#86624d', '#c7a05d', '#f0ede4', '#596b75', '#8e4e42'];
  const skin = shifted(skinPalette[variant % skinPalette.length]!, seedKey, 0.025);
  const fur = shifted(furPalette[(variant + hashString(seedKey)) % furPalette.length]!, seedKey, 0.04);
  const dark = shifted('#22242a', seedKey, 0.02);
  const light = shifted('#f3eee3', seedKey, 0.018);
  const iris = shifted(accent, `${seedKey}:iris`, 0.08);
  const add = facePartAdder(root);

  switch (style) {
    case 'human': {
      add([0.88, 1.04, 0.22], [0, 0, 0], skin, { shape: 'sphere', name: 'face-human-plane' });
      for (const side of [-1, 1]) {
        add([0.22, 0.15, 0.08], [side * 0.2, 0.13, 0.115], light, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.095, 0.105, 0.045], [side * 0.2, 0.13, 0.17], iris, { shape: 'sphere' });
        add([0.035, 0.05, 0.02], [side * 0.2, 0.14, 0.2], '#121318', { shape: 'sphere' });
        add([0.27, 0.045, 0.035], [side * 0.2, 0.28, 0.15], dark, { rotation: [0, 0, side * (variant - 3.5) * 0.025] });
        add([0.1, 0.21, 0.08], [side * 0.48, 0, 0], skin, { shape: 'sphere' });
      }
      add([0.15, 0.3, 0.13], [(variant % 3 - 1) * 0.035, -0.02, 0.18], skin, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'face-nose' });
      add([0.34, 0.065, 0.045], [0, -0.27, 0.16], variant % 2 ? '#7f3740' : dark, { shape: 'capsule', rotation: [0, 0, (variant - 3.5) * 0.015], name: 'face-mouth' });
      add([0.9, 0.34, 0.19], [0, 0.43, -0.02], dark, { shape: 'sphere', name: 'face-hair' });
      break;
    }
    case 'mask': {
      add([0.9, 1.08, 0.18], [0, 0, 0], '#e8e0cf', { shape: 'sphere', roughness: 0.28, name: 'face-porcelain-mask' });
      for (const side of [-1, 1]) {
        add([0.26, 0.17, 0.1], [side * 0.21, 0.14, 0.11], '#17191d', { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.055, 0.055, 0.035], [side * 0.21, 0.14, 0.17], iris, { shape: 'sphere', emissive: iris, emissiveIntensity: 0.38 });
      }
      add([0.1, 0.27, 0.1], [0, -0.02, 0.14], '#d7cdbb', { shape: 'cone', rotation: [Math.PI / 2, 0, 0] });
      add([0.42, 0.055, 0.04], [0, -0.29, 0.13], variant % 2 ? '#8d2337' : '#343039', { shape: 'capsule' });
      for (let crack = 0; crack < 4; crack += 1) {
        add([0.018, 0.23 + crack * 0.025, 0.018], [-0.31 + crack * 0.2, -0.06 + crack * 0.06, 0.105], dark, { rotation: [0, 0, -0.5 + crack * 0.31], name: 'face-mask-crack' });
      }
      add([1.0, 0.09, 0.12], [0, 0.55, -0.01], shifted(accent, seedKey, 0.04), { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.45 });
      break;
    }
    case 'feline': {
      add([0.92, 0.86, 0.28], [0, -0.02, 0], fur, { shape: 'sphere', name: 'face-feline-plane' });
      for (const side of [-1, 1]) {
        add([0.31, 0.44, 0.12], [side * 0.31, 0.5, -0.02], fur, { shape: 'cone', rotation: [0, 0, side * -0.16], name: 'face-animal-ear' });
        add([0.25, 0.14, 0.08], [side * 0.21, 0.14, 0.15], light, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.075, 0.12, 0.04], [side * 0.21, 0.14, 0.2], iris, { shape: 'sphere' });
        for (let whisker = -1; whisker <= 1; whisker += 1) {
          add([0.38, 0.018, 0.018], [side * 0.37, -0.17 + whisker * 0.075, 0.2], light, { rotation: [0, 0, side * (0.08 + whisker * 0.12)], name: 'face-whisker' });
        }
      }
      add([0.5, 0.36, 0.2], [0, -0.16, 0.14], shifted(fur, seedKey, 0.1), { shape: 'sphere', name: 'face-muzzle' });
      add([0.15, 0.11, 0.09], [0, -0.09, 0.27], '#33272a', { shape: 'sphere', name: 'face-nose' });
      add([0.22, 0.035, 0.025], [0, -0.28, 0.24], dark, { shape: 'capsule', name: 'face-mouth' });
      break;
    }
    case 'canine': {
      add([0.86, 0.9, 0.28], [0, 0, 0], fur, { shape: 'sphere', name: 'face-canine-plane' });
      for (const side of [-1, 1]) {
        add([0.3, 0.56, 0.16], [side * 0.39, 0.28, -0.02], shifted(fur, `${seedKey}:${side}`, -0.08), { shape: 'capsule', rotation: [0, 0, side * 0.38], name: 'face-animal-ear' });
        add([0.18, 0.15, 0.08], [side * 0.2, 0.17, 0.15], light, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.075, 0.085, 0.04], [side * 0.2, 0.17, 0.2], iris, { shape: 'sphere' });
      }
      add([0.52, 0.42, 0.38], [0, -0.18, 0.2], shifted(fur, seedKey, 0.12), { shape: 'sphere', name: 'face-muzzle' });
      add([0.21, 0.14, 0.13], [0, -0.08, 0.39], '#252126', { shape: 'sphere', name: 'face-nose' });
      add([0.28, 0.045, 0.035], [0, -0.33, 0.36], '#6f3038', { shape: 'capsule', name: 'face-mouth' });
      add([0.12, 0.26, 0.06], [0, -0.41, 0.33], '#b65c67', { shape: 'capsule' });
      break;
    }
    case 'avian': {
      add([0.84, 0.92, 0.26], [0, 0, 0], fur, { shape: 'sphere', name: 'face-avian-plane' });
      for (const side of [-1, 1]) {
        add([0.43, 0.42, 0.1], [side * 0.22, 0.13, 0.14], shifted(light, `${seedKey}:${side}`, 0.03), { shape: 'sphere', name: 'face-eye-disc' });
        add([0.14, 0.15, 0.055], [side * 0.22, 0.13, 0.2], iris, { shape: 'sphere', emissive: iris, emissiveIntensity: variant === 7 ? 0.5 : 0 });
        add([0.055, 0.065, 0.03], [side * 0.22, 0.13, 0.24], '#101216', { shape: 'sphere' });
      }
      add([0.29, 0.48, 0.28], [0, -0.19, 0.26], shifted('#d8a23f', seedKey, 0.05), { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'face-beak' });
      for (let crest = -2; crest <= 2; crest += 1) {
        add([0.09, 0.35 + Math.abs(crest) * 0.035, 0.08], [crest * 0.12, 0.54 - Math.abs(crest) * 0.035, -0.02], shifted(fur, `${seedKey}:crest:${crest}`, 0.06), { shape: 'cone', rotation: [0, 0, crest * -0.08], name: 'face-crest' });
      }
      break;
    }
    case 'amphibian': {
      add([0.96, 0.72, 0.31], [0, -0.06, 0], shifted('#749858', seedKey, 0.08), { shape: 'sphere', name: 'face-amphibian-plane' });
      for (const side of [-1, 1]) {
        add([0.34, 0.34, 0.21], [side * 0.28, 0.28, 0.08], shifted('#91b96c', `${seedKey}:${side}`, 0.08), { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.15, 0.17, 0.08], [side * 0.28, 0.29, 0.22], iris, { shape: 'sphere' });
        add([0.055, 0.08, 0.035], [side * 0.28, 0.29, 0.29], '#101216', { shape: 'sphere' });
      }
      add([0.65, 0.055, 0.045], [0, -0.27, 0.26], '#382a35', { shape: 'capsule', name: 'face-mouth' });
      for (let spot = 0; spot < 5; spot += 1) {
        const angle = (spot / 5) * Math.PI * 2;
        add([0.085, 0.065, 0.025], [Math.cos(angle) * 0.34, Math.sin(angle) * 0.2 - 0.03, 0.3], shifted(accent, `${seedKey}:spot:${spot}`, -0.04), { shape: 'sphere', name: 'face-spot' });
      }
      break;
    }
    case 'insect': {
      add([0.8, 0.88, 0.32], [0, 0, 0], shifted('#3f4b45', seedKey, 0.05), { shape: 'sphere', metalness: 0.32, name: 'face-insect-plane' });
      for (const side of [-1, 1]) {
        for (let facet = 0; facet < 4; facet += 1) {
          const angle = (facet / 4) * Math.PI * 2;
          add([0.17, 0.17, 0.08], [side * 0.27 + Math.cos(angle) * 0.055, 0.13 + Math.sin(angle) * 0.07, 0.22], shifted(iris, `${seedKey}:facet:${side}:${facet}`, 0.08), { shape: 'sphere', metalness: 0.45, emissive: iris, emissiveIntensity: 0.16, name: 'face-compound-eye' });
        }
        add([0.04, 0.72, 0.04], [side * 0.18, 0.48, 0.05], dark, { shape: 'capsule', rotation: [0, 0, side * -0.38], name: 'face-antenna' });
        add([0.11, 0.11, 0.08], [side * 0.34, 0.74, 0.08], shifted(accent, `${seedKey}:tip:${side}`, 0.05), { shape: 'sphere' });
      }
      add([0.2, 0.35, 0.16], [-0.1, -0.25, 0.25], dark, { shape: 'cone', rotation: [Math.PI / 2, 0, -0.35], name: 'face-mandible' });
      add([0.2, 0.35, 0.16], [0.1, -0.25, 0.25], dark, { shape: 'cone', rotation: [Math.PI / 2, 0, 0.35], name: 'face-mandible' });
      break;
    }
  }

  return root;
}

function facePartAdder(parent: THREE.Group) {
  return (
    scale: [number, number, number],
    position: [number, number, number],
    color: string,
    options: FacePartOptions = {},
  ): THREE.Mesh => {
    const geometry = faceGeometry(options.shape ?? 'box');
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.64,
      metalness: options.metalness ?? 0.04,
      emissive: options.emissive ?? '#000000',
      emissiveIntensity: options.emissiveIntensity ?? 0,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    if (options.rotation) mesh.rotation.set(...options.rotation);
    mesh.name = options.name ?? 'face-detail';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
}

function faceGeometry(shape: NonNullable<FacePartOptions['shape']>): THREE.BufferGeometry {
  switch (shape) {
    case 'sphere': return new THREE.SphereGeometry(0.5, 20, 14);
    case 'cylinder': return new THREE.CylinderGeometry(0.5, 0.5, 1, 18);
    case 'cone': return new THREE.ConeGeometry(0.5, 1, 18);
    case 'torus': return new THREE.TorusGeometry(0.5, 0.12, 10, 24);
    case 'capsule': return new THREE.CapsuleGeometry(0.32, 0.4, 7, 14);
    default: return new THREE.BoxGeometry(1, 1, 1);
  }
}

function shifted(color: string, key: string, amount: number): string {
  const hash = hashString(key);
  const hue = ((hash % 17) - 8) * amount * 0.004;
  const lightness = (((hash >>> 5) % 9) - 4) * amount * 0.02;
  return new THREE.Color(color).offsetHSL(hue, 0, lightness).getStyle();
}
