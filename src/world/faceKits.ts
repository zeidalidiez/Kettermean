import * as THREE from 'three';
import { hashString } from '../core/rng';

export type FaceHostContext = 'humanoid' | 'animal' | 'object';
export type FaceKitOrigin = 'human' | 'animal';
export type FaceKitStyle =
  | 'human'
  | 'mask'
  | 'mechanical'
  | 'feline'
  | 'canine'
  | 'avian'
  | 'amphibian'
  | 'insect'
  | 'cervine'
  | 'lagomorph'
  | 'reptilian'
  | 'piscine'
  | 'cephalopod'
  | 'equine'
  | 'ursine'
  | 'caprine'
  | 'bovine'
  | 'porcine'
  | 'simian'
  | 'mustelid'
  | 'proboscidean'
  | 'crustacean'
  | 'arachnid';

export const FACE_KIT_STYLES: readonly FaceKitStyle[] = [
  'human',
  'mask',
  'mechanical',
  'feline',
  'canine',
  'avian',
  'amphibian',
  'insect',
  'cervine',
  'lagomorph',
  'reptilian',
  'piscine',
  'cephalopod',
  'equine',
  'ursine',
  'caprine',
  'bovine',
  'porcine',
  'simian',
  'mustelid',
  'proboscidean',
  'crustacean',
  'arachnid',
];

export const FACE_EYE_SHAPES = [
  'round', 'narrow', 'wide', 'vertical', 'faceted', 'sleeping', 'ringed', 'teardrop',
  'starburst', 'square',
] as const;
export type FaceEyeShape = typeof FACE_EYE_SHAPES[number];

export const FACE_BROW_STYLES = [
  'arched', 'straight', 'split', 'heavy', 'feathered', 'notched', 'beaded', 'tendrilled',
  'floating', 'absent',
] as const;
export type FaceBrowStyle = typeof FACE_BROW_STYLES[number];

export const FACE_NOSE_STYLES = [
  'button', 'long', 'flat', 'hooked', 'double', 'rosette', 'beaked', 'trunk', 'vented',
  'absent',
] as const;
export type FaceNoseStyle = typeof FACE_NOSE_STYLES[number];

export const FACE_MOUTH_STYLES = [
  'smile', 'frown', 'open', 'stitched', 'whisper', 'radial', 'toothed', 'beaked',
  'proboscis', 'double',
] as const;
export type FaceMouthStyle = typeof FACE_MOUTH_STYLES[number];

export const FACE_HAIR_STYLES = [
  'crop', 'wave', 'braids', 'spikes', 'halo', 'mane', 'tendrils', 'crest', 'crown', 'bare',
] as const;
export type FaceHairStyle = typeof FACE_HAIR_STYLES[number];

export const FACE_MARKING_STYLES = [
  'spots', 'stripes', 'freckles', 'tears', 'stars', 'circuit', 'scales', 'rings', 'none',
] as const;
export type FaceMarkingStyle = typeof FACE_MARKING_STYLES[number];

export const FACE_ACCESSORY_STYLES = [
  'spectacles', 'monocle', 'veil', 'antennae', 'earrings', 'crown', 'respirator', 'third-ear',
  'none',
] as const;
export type FaceAccessoryStyle = typeof FACE_ACCESSORY_STYLES[number];

export interface FaceFeatureProfile {
  eyeShape: FaceEyeShape;
  eyeCount: 1 | 2 | 3 | 4 | 5 | 6;
  browStyle: FaceBrowStyle;
  noseStyle: FaceNoseStyle;
  mouthStyle: FaceMouthStyle;
  hairStyle: FaceHairStyle;
  markingStyle: FaceMarkingStyle;
  markingCount: number;
  accessoryStyle: FaceAccessoryStyle;
}

export interface FaceKitDecision {
  mounted: boolean;
  host: FaceHostContext;
  origin: FaceKitOrigin;
  style: FaceKitStyle;
  crossed: boolean;
}

interface FacePartOptions {
  shape?: 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'capsule' | 'octahedron' | 'dodecahedron';
  rotation?: [number, number, number];
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
  opacity?: number;
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
    'cervine',
    'lagomorph',
    'reptilian',
    'piscine',
    'cephalopod',
    'equine',
    'ursine',
    'caprine',
    'bovine',
    'porcine',
    'simian',
    'mustelid',
    'proboscidean',
    'crustacean',
    'arachnid',
  ];
  const humanStyles: readonly FaceKitStyle[] = ['human', 'mask', 'mechanical'];
  const hash = hashString(`${kind}:face-kit:${variant}`);

  if (host === 'humanoid') {
    const crossed = variant === 2 || variant === 5 || variant === 7;
    const style = crossed
      ? animalStyles[hash % animalStyles.length]!
      : humanStyles[(variant + (hash >>> 5)) % humanStyles.length]!;
    return { mounted: true, host, origin: crossed ? 'animal' : 'human', style, crossed };
  }

  if (host === 'animal') {
    const crossed = variant === 1 || variant === 4 || variant === 6;
    const style = crossed
      ? humanStyles[(variant + (hash >>> 4)) % humanStyles.length]!
      : animalStyles[hash % animalStyles.length]!;
    return { mounted: true, host, origin: crossed ? 'human' : 'animal', style, crossed };
  }

  const mounted = variant === 2 || variant === 6 || (variant === 0 && hash % 13 === 0);
  const humanOrigin = (hash >>> 3) % 2 === 0;
  const style = humanOrigin
    ? humanStyles[hash % humanStyles.length]!
    : animalStyles[hash % animalStyles.length]!;
  return {
    mounted,
    host,
    origin: humanOrigin ? 'human' : 'animal',
    style,
    crossed: mounted,
  };
}

/** Deterministic facial micro-features shared by every body and face style. */
export function faceFeatureProfile(
  seedKey: string,
  variant: number,
  style: FaceKitStyle,
): FaceFeatureProfile {
  const featureKey = `${seedKey}:face-features:${variant}:${style}`;
  const pick = <T>(dimension: string, values: readonly T[]): T =>
    values[hashString(`${featureKey}:${dimension}`) % values.length]!;
  const eyeCounts = [1, 2, 2, 2, 3, 4, 5, 6] as const;
  return {
    eyeShape: pick('eyes', FACE_EYE_SHAPES),
    eyeCount: pick('eye-count', eyeCounts),
    browStyle: pick('brows', FACE_BROW_STYLES),
    noseStyle: pick('nose', FACE_NOSE_STYLES),
    mouthStyle: pick('mouth', FACE_MOUTH_STYLES),
    hairStyle: pick('hair', FACE_HAIR_STYLES),
    markingStyle: pick('marking-style', FACE_MARKING_STYLES),
    markingCount: hashString(`${featureKey}:marking-count`) % 11,
    accessoryStyle: pick('accessory', FACE_ACCESSORY_STYLES),
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
  const features = faceFeatureProfile(seedKey, variant, style);
  root.userData.faceFeatureProfile = features;

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
    case 'mechanical': {
      add([0.88, 1.02, 0.24], [0, 0, 0], shifted('#8b9396', seedKey, 0.05), { shape: 'sphere', metalness: 0.72, roughness: 0.22, name: 'face-mechanical-plate' });
      for (const side of [-1, 1]) {
        add([0.27, 0.21, 0.1], [side * 0.21, 0.14, 0.14], dark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], metalness: 0.82, name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.11, 0.12, 0.055], [side * 0.21, 0.14, 0.22], iris, { shape: 'sphere', emissive: iris, emissiveIntensity: 0.55, name: 'face-mechanical-iris' });
        for (let rivet = 0; rivet < 4; rivet += 1) {
          const angle = rivet / 4 * Math.PI * 2;
          add([0.035, 0.035, 0.025], [side * 0.36 + Math.cos(angle) * 0.07, 0.14 + Math.sin(angle) * 0.08, 0.24], light, { shape: 'sphere', metalness: 0.84, name: 'face-mechanical-rivet' });
        }
      }
      add([0.16, 0.32, 0.14], [0, -0.02, 0.2], shifted('#b99a52', seedKey, 0.04), { shape: 'cone', rotation: [Math.PI / 2, 0, 0], metalness: 0.78, name: 'face-mechanical-nose' });
      for (let tooth = -3; tooth <= 3; tooth += 1) add([0.075, 0.1, 0.04], [tooth * 0.085, -0.29, 0.19], tooth % 2 ? dark : light, { name: 'face-mechanical-mouth-tooth' });
      for (let gear = 0; gear < 5; gear += 1) add([0.08 + gear * 0.012, 0.08 + gear * 0.012, 0.03], [-0.31 + gear * 0.16, 0.4 + (gear % 2) * 0.09, 0.05], gear % 2 ? iris : '#b99a52', { shape: 'torus', rotation: [Math.PI / 2, 0, gear * 0.25], metalness: 0.8, name: 'face-mechanical-gear' });
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
    case 'cervine': {
      add([0.72, 1.02, 0.3], [0, -0.04, 0], fur, { shape: 'capsule', name: 'face-cervine-plane' });
      add([0.46, 0.42, 0.32], [0, -0.28, 0.21], shifted(fur, seedKey, 0.12), { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'face-cervine-muzzle' });
      for (const side of [-1, 1]) {
        add([0.3, 0.18, 0.1], [side * 0.22, 0.14, 0.18], light, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.1, 0.11, 0.05], [side * 0.22, 0.14, 0.24], iris, { shape: 'sphere' });
        add([0.28, 0.18, 0.1], [side * 0.48, 0.35, 0], fur, { shape: 'capsule', rotation: [0, 0, side * 0.62], name: 'face-animal-ear' });
        add([0.055, 0.54, 0.055], [side * 0.2, 0.62, -0.03], dark, { shape: 'capsule', rotation: [0, 0, side * -0.28], name: 'face-cervine-antler' });
        for (let tine = 0; tine < 4; tine += 1) add([0.035, 0.22 + tine * 0.025, 0.035], [side * (0.26 + tine * 0.07), 0.66 + tine * 0.1, -0.02], dark, { shape: 'capsule', rotation: [0, 0, side * (-0.72 + tine * 0.09)], name: 'face-cervine-antler-tine' });
      }
      add([0.18, 0.11, 0.1], [0, -0.25, 0.4], '#33272a', { shape: 'sphere', name: 'face-nose' });
      break;
    }
    case 'lagomorph': {
      add([0.82, 0.83, 0.29], [0, -0.06, 0], fur, { shape: 'sphere', name: 'face-lagomorph-plane' });
      for (const side of [-1, 1]) {
        add([0.18, 0.68, 0.13], [side * 0.18, 0.7, -0.03], fur, { shape: 'capsule', rotation: [0, 0, side * -0.1], name: 'face-animal-ear' });
        add([0.08, 0.49, 0.06], [side * 0.18, 0.71, 0.06], shifted('#d68e9d', seedKey, 0.04), { shape: 'capsule', rotation: [0, 0, side * -0.1], name: 'face-lagomorph-inner-ear' });
        add([0.22, 0.19, 0.09], [side * 0.21, 0.14, 0.16], light, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.085, 0.105, 0.04], [side * 0.21, 0.14, 0.22], iris, { shape: 'sphere' });
        for (let whisker = -2; whisker <= 2; whisker += 1) add([0.38, 0.015, 0.015], [side * 0.36, -0.18 + whisker * 0.055, 0.22], light, { rotation: [0, 0, side * (0.04 + whisker * 0.08)], name: 'face-whisker' });
      }
      add([0.5, 0.34, 0.2], [0, -0.16, 0.18], shifted(fur, seedKey, 0.1), { shape: 'sphere', name: 'face-muzzle' });
      add([0.13, 0.1, 0.08], [0, -0.1, 0.3], shifted('#b36f7a', seedKey, 0.03), { shape: 'sphere', name: 'face-nose' });
      add([0.08, 0.13, 0.035], [-0.045, -0.3, 0.27], light, { name: 'face-lagomorph-tooth' });
      add([0.08, 0.13, 0.035], [0.045, -0.3, 0.27], light, { name: 'face-lagomorph-tooth' });
      break;
    }
    case 'reptilian': {
      add([0.9, 0.84, 0.3], [0, -0.04, 0], shifted('#607c52', seedKey, 0.09), { shape: 'sphere', roughness: 0.48, name: 'face-reptilian-plane' });
      for (const side of [-1, 1]) {
        add([0.27, 0.13, 0.08], [side * 0.22, 0.15, 0.18], shifted('#d6ca77', `${seedKey}:${side}`, 0.05), { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.05, 0.12, 0.035], [side * 0.22, 0.15, 0.24], '#111318', { shape: 'capsule', name: 'face-reptilian-slit-pupil' });
      }
      add([0.56, 0.33, 0.31], [0, -0.18, 0.19], shifted('#718a5d', seedKey, 0.07), { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'face-reptilian-snout' });
      for (let scale = 0; scale < 13; scale += 1) {
        const angle = scale / 13 * Math.PI * 2;
        add([0.07, 0.055, 0.025], [Math.cos(angle) * 0.34, Math.sin(angle) * 0.29, 0.3], shifted(scale % 2 ? fur : accent, `${seedKey}:scale:${scale}`, 0.05), { shape: 'sphere', name: 'face-reptilian-scale' });
      }
      add([0.55, 0.045, 0.035], [0, -0.31, 0.3], dark, { shape: 'capsule', name: 'face-mouth' });
      break;
    }
    case 'piscine': {
      add([0.92, 0.78, 0.34], [0, -0.02, 0], shifted('#5f94a0', seedKey, 0.08), { shape: 'sphere', name: 'face-piscine-plane' });
      for (const side of [-1, 1]) {
        add([0.3, 0.3, 0.18], [side * 0.28, 0.15, 0.12], light, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.13, 0.15, 0.07], [side * 0.28, 0.15, 0.24], iris, { shape: 'sphere', emissive: iris, emissiveIntensity: 0.18 });
        for (let gill = -1; gill <= 1; gill += 1) add([0.03, 0.22, 0.025], [side * 0.42, -0.08 + gill * 0.11, 0.19], dark, { rotation: [0, 0, side * 0.18], name: 'face-piscine-gill' });
        add([0.22, 0.42, 0.06], [side * 0.55, -0.02, -0.02], shifted('#6aa9b2', `${seedKey}:fin:${side}`, 0.06), { shape: 'cone', rotation: [0, 0, side * Math.PI / 2], opacity: 0.7, name: 'face-piscine-fin' });
      }
      add([0.28, 0.2, 0.11], [0, -0.24, 0.29], shifted('#8e5965', seedKey, 0.04), { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'face-mouth' });
      for (let scale = 0; scale < 9; scale += 1) add([0.07, 0.06, 0.025], [((scale % 3) - 1) * 0.18, 0.34 + Math.floor(scale / 3) * 0.1, 0.24], scale % 2 ? iris : light, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'face-piscine-scale' });
      break;
    }
    case 'cephalopod': {
      add([0.84, 0.92, 0.34], [0, 0.06, 0], shifted('#806a91', seedKey, 0.08), { shape: 'sphere', name: 'face-cephalopod-mantle' });
      for (const side of [-1, 1]) {
        add([0.3, 0.24, 0.13], [side * 0.24, 0.18, 0.19], light, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.08, 0.14, 0.055], [side * 0.24, 0.18, 0.28], iris, { shape: 'capsule', emissive: iris, emissiveIntensity: 0.22 });
      }
      for (let tentacle = 0; tentacle < 8; tentacle += 1) {
        const x = (tentacle - 3.5) * 0.1;
        add([0.055, 0.45 + (tentacle % 3) * 0.08, 0.055], [x, -0.43, 0.12 + (tentacle % 2) * 0.05], shifted(tentacle % 2 ? fur : accent, `${seedKey}:tentacle:${tentacle}`, 0.05), { shape: 'capsule', rotation: [0, 0, (tentacle - 3.5) * 0.06], name: 'face-cephalopod-tentacle' });
        for (let sucker = 0; sucker < 3; sucker += 1) add([0.035, 0.035, 0.018], [x + (tentacle - 3.5) * sucker * 0.005, -0.28 - sucker * 0.1, 0.21], light, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'face-cephalopod-sucker' });
      }
      for (let spot = 0; spot < 7; spot += 1) {
        const angle = spot / 7 * Math.PI * 2;
        add([0.065, 0.05, 0.025], [Math.cos(angle) * 0.3, 0.16 + Math.sin(angle) * 0.3, 0.32], shifted(iris, `${seedKey}:ceph-spot:${spot}`, 0.08), { shape: 'sphere', emissive: iris, emissiveIntensity: 0.12, name: 'face-cephalopod-chromatophore' });
      }
      break;
    }
    case 'equine': {
      add([0.74, 1.04, 0.31], [0, 0.02, 0], fur, { shape: 'capsule', name: 'face-equine-plane' });
      add([0.48, 0.62, 0.38], [0, -0.31, 0.23], shifted(fur, `${seedKey}:equine-muzzle`, 0.09), { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'face-equine-muzzle' });
      for (const side of [-1, 1]) {
        add([0.16, 0.48, 0.12], [side * 0.25, 0.63, -0.01], fur, { shape: 'cone', rotation: [0, 0, side * -0.2], name: 'face-equine-ear' });
        add([0.25, 0.17, 0.09], [side * 0.2, 0.17, 0.18], light, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.1, 0.12, 0.05], [side * 0.2, 0.17, 0.25], iris, { shape: 'sphere', name: 'face-equine-iris' });
        add([0.035, 0.075, 0.025], [side * 0.2, 0.17, 0.29], dark, { shape: 'capsule', name: 'face-equine-pupil' });
        add([0.075, 0.095, 0.045], [side * 0.13, -0.36, 0.43], dark, { shape: 'sphere', name: 'face-equine-nostril' });
      }
      for (let lock = -4; lock <= 4; lock += 1) add([0.1, 0.34 + Math.abs(lock) * 0.02, 0.08], [lock * 0.085, 0.56 - Math.abs(lock) * 0.018, -0.05], shifted(dark, `${seedKey}:equine-mane:${lock}`, 0.035), { shape: 'cone', rotation: [0, 0, lock * -0.07], name: 'face-equine-mane' });
      add([0.31, 0.04, 0.03], [0, -0.51, 0.4], dark, { shape: 'capsule', name: 'face-equine-mouth' });
      break;
    }
    case 'ursine': {
      add([0.93, 0.91, 0.33], [0, -0.02, 0], fur, { shape: 'sphere', name: 'face-ursine-plane' });
      add([0.54, 0.4, 0.32], [0, -0.2, 0.23], shifted(fur, `${seedKey}:ursine-muzzle`, 0.12), { shape: 'sphere', name: 'face-ursine-muzzle' });
      for (const side of [-1, 1]) {
        add([0.31, 0.31, 0.15], [side * 0.38, 0.42, -0.01], fur, { shape: 'sphere', name: 'face-ursine-ear' });
        add([0.16, 0.16, 0.09], [side * 0.38, 0.43, 0.1], shifted('#9e6e63', seedKey, 0.04), { shape: 'sphere', name: 'face-ursine-inner-ear' });
        add([0.21, 0.16, 0.08], [side * 0.2, 0.14, 0.2], light, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.08, 0.09, 0.045], [side * 0.2, 0.14, 0.26], iris, { shape: 'sphere', name: 'face-ursine-iris' });
        add([0.03, 0.04, 0.02], [side * 0.2, 0.14, 0.3], dark, { shape: 'sphere', name: 'face-ursine-pupil' });
        for (let tuft = 0; tuft < 3; tuft += 1) add([0.12, 0.25 + tuft * 0.04, 0.08], [side * (0.42 + tuft * 0.045), -0.02 - tuft * 0.11, 0.05], fur, { shape: 'cone', rotation: [0, 0, side * (0.56 + tuft * 0.08)], name: 'face-ursine-cheek-tuft' });
      }
      add([0.2, 0.15, 0.12], [0, -0.15, 0.41], dark, { shape: 'sphere', name: 'face-ursine-nose' });
      add([0.3, 0.045, 0.035], [0, -0.36, 0.38], '#6f3540', { shape: 'capsule', name: 'face-ursine-mouth' });
      break;
    }
    case 'caprine': {
      add([0.76, 1.02, 0.3], [0, -0.02, 0], fur, { shape: 'capsule', name: 'face-caprine-plane' });
      add([0.44, 0.46, 0.32], [0, -0.27, 0.22], shifted(fur, seedKey, 0.11), { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'face-caprine-muzzle' });
      for (const side of [-1, 1]) {
        add([0.24, 0.14, 0.08], [side * 0.2, 0.14, 0.2], light, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.11, 0.055, 0.04], [side * 0.2, 0.14, 0.27], iris, { shape: 'capsule', rotation: [0, 0, Math.PI / 2], name: 'face-caprine-iris' });
        add([0.035, 0.025, 0.02], [side * 0.2, 0.14, 0.31], dark, { shape: 'capsule', rotation: [0, 0, Math.PI / 2], name: 'face-caprine-pupil' });
        add([0.35, 0.17, 0.09], [side * 0.43, 0.37, 0], fur, { shape: 'capsule', rotation: [0, 0, side * 0.7], name: 'face-caprine-ear' });
        add([0.09, 0.7, 0.08], [side * 0.25, 0.65, -0.03], shifted('#8e795f', seedKey, -0.02), { shape: 'capsule', rotation: [0, 0, side * -0.35], name: 'face-caprine-horn' });
        for (let ridge = 0; ridge < 3; ridge += 1) add([0.13, 0.035, 0.1], [side * (0.19 + ridge * 0.07), 0.48 + ridge * 0.16, 0], dark, { shape: 'torus', rotation: [Math.PI / 2, side * 0.2, 0], name: 'face-caprine-horn-ridge' });
      }
      for (let tuft = -2; tuft <= 2; tuft += 1) add([0.075, 0.32 + Math.abs(tuft) * 0.05, 0.06], [tuft * 0.07, -0.57, 0.12], shifted(dark, `${seedKey}:goatee:${tuft}`, 0.03), { shape: 'cone', rotation: [0, 0, tuft * 0.08], name: 'face-caprine-beard' });
      add([0.16, 0.11, 0.09], [0, -0.29, 0.4], dark, { shape: 'sphere', name: 'face-caprine-nose' });
      break;
    }
    case 'bovine': {
      add([0.94, 0.93, 0.31], [0, 0, 0], fur, { shape: 'sphere', name: 'face-bovine-plane' });
      add([0.62, 0.4, 0.35], [0, -0.25, 0.25], shifted('#c7a88b', seedKey, 0.06), { shape: 'sphere', name: 'face-bovine-muzzle' });
      for (const side of [-1, 1]) {
        add([0.23, 0.17, 0.08], [side * 0.21, 0.14, 0.2], light, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.09, 0.1, 0.045], [side * 0.21, 0.14, 0.26], iris, { shape: 'sphere', name: 'face-bovine-iris' });
        add([0.033, 0.045, 0.02], [side * 0.21, 0.14, 0.3], dark, { shape: 'sphere', name: 'face-bovine-pupil' });
        add([0.39, 0.19, 0.1], [side * 0.49, 0.33, 0], fur, { shape: 'capsule', rotation: [0, 0, side * 0.72], name: 'face-bovine-ear' });
        add([0.12, 0.52, 0.1], [side * 0.34, 0.59, -0.02], shifted('#ddd0ad', seedKey, 0.03), { shape: 'cone', rotation: [0, 0, side * -0.52], name: 'face-bovine-horn' });
        add([0.085, 0.065, 0.04], [side * 0.15, -0.28, 0.47], dark, { shape: 'sphere', name: 'face-bovine-nostril' });
      }
      for (let curl = -2; curl <= 2; curl += 1) add([0.14, 0.13, 0.07], [curl * 0.13, 0.45 - Math.abs(curl) * 0.025, 0.18], shifted(fur, `${seedKey}:bovine-curl:${curl}`, -0.07), { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'face-bovine-forelock' });
      add([0.37, 0.045, 0.035], [0, -0.43, 0.43], dark, { shape: 'capsule', name: 'face-bovine-mouth' });
      break;
    }
    case 'porcine': {
      add([0.94, 0.88, 0.32], [0, -0.02, 0], shifted('#c98f91', seedKey, 0.06), { shape: 'sphere', name: 'face-porcine-plane' });
      add([0.5, 0.36, 0.32], [0, -0.18, 0.27], shifted('#e0aaa9', seedKey, 0.05), { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'face-porcine-snout' });
      for (const side of [-1, 1]) {
        add([0.2, 0.17, 0.08], [side * 0.21, 0.16, 0.2], light, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.075, 0.09, 0.04], [side * 0.21, 0.16, 0.26], iris, { shape: 'sphere', name: 'face-porcine-iris' });
        add([0.027, 0.04, 0.018], [side * 0.21, 0.16, 0.3], dark, { shape: 'sphere', name: 'face-porcine-pupil' });
        add([0.3, 0.42, 0.11], [side * 0.37, 0.46, -0.01], shifted('#b9797f', `${seedKey}:pig-ear:${side}`, 0.04), { shape: 'cone', rotation: [0, 0, side * -0.45], name: 'face-porcine-ear' });
        add([0.09, 0.14, 0.055], [side * 0.12, -0.17, 0.46], dark, { shape: 'capsule', name: 'face-porcine-nostril' });
      }
      for (let bristle = -3; bristle <= 3; bristle += 1) add([0.045, 0.25 + Math.abs(bristle) * 0.02, 0.04], [bristle * 0.11, 0.53 - Math.abs(bristle) * 0.02, 0.03], dark, { shape: 'cone', rotation: [0, 0, bristle * -0.07], name: 'face-porcine-bristle' });
      add([0.31, 0.045, 0.03], [0, -0.39, 0.39], '#7f4650', { shape: 'capsule', name: 'face-porcine-mouth' });
      break;
    }
    case 'simian': {
      add([0.86, 0.96, 0.31], [0, 0, 0], fur, { shape: 'sphere', name: 'face-simian-plane' });
      add([0.65, 0.71, 0.25], [0, -0.08, 0.18], skin, { shape: 'sphere', name: 'face-simian-mask' });
      add([0.48, 0.34, 0.29], [0, -0.25, 0.27], shifted(skin, seedKey, 0.08), { shape: 'sphere', name: 'face-simian-muzzle' });
      for (const side of [-1, 1]) {
        add([0.33, 0.4, 0.11], [side * 0.5, 0.03, -0.02], fur, { shape: 'sphere', name: 'face-simian-ear' });
        add([0.18, 0.23, 0.07], [side * 0.5, 0.03, 0.08], shifted(skin, seedKey, 0.04), { shape: 'sphere', name: 'face-simian-inner-ear' });
        add([0.22, 0.16, 0.08], [side * 0.2, 0.17, 0.24], light, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.085, 0.095, 0.04], [side * 0.2, 0.17, 0.3], iris, { shape: 'sphere', name: 'face-simian-iris' });
        add([0.03, 0.04, 0.018], [side * 0.2, 0.17, 0.34], dark, { shape: 'sphere', name: 'face-simian-pupil' });
        add([0.28, 0.045, 0.03], [side * 0.2, 0.31, 0.27], dark, { shape: 'capsule', rotation: [0, 0, side * 0.08], name: 'face-simian-brow' });
        add([0.07, 0.11, 0.05], [side * 0.065, -0.13, 0.43], dark, { shape: 'sphere', name: 'face-simian-nostril' });
      }
      add([0.36, 0.07, 0.04], [0, -0.36, 0.41], '#773d47', { shape: 'capsule', name: 'face-simian-mouth' });
      break;
    }
    case 'mustelid': {
      add([0.82, 0.96, 0.3], [0, 0, 0], fur, { shape: 'capsule', name: 'face-mustelid-plane' });
      add([0.45, 0.43, 0.34], [0, -0.23, 0.25], shifted(fur, seedKey, 0.13), { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'face-mustelid-muzzle' });
      for (const side of [-1, 1]) {
        add([0.34, 0.2, 0.055], [side * 0.22, 0.17, 0.2], dark, { shape: 'sphere', rotation: [0, 0, side * 0.24], opacity: 0.82, name: 'face-mustelid-mask' });
        add([0.24, 0.24, 0.12], [side * 0.34, 0.43, 0], fur, { shape: 'sphere', name: 'face-mustelid-ear' });
        add([0.12, 0.12, 0.07], [side * 0.34, 0.43, 0.09], light, { shape: 'sphere', name: 'face-mustelid-inner-ear' });
        add([0.2, 0.14, 0.08], [side * 0.21, 0.17, 0.25], light, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.075, 0.085, 0.04], [side * 0.21, 0.17, 0.31], iris, { shape: 'sphere', name: 'face-mustelid-iris' });
        add([0.027, 0.035, 0.018], [side * 0.21, 0.17, 0.35], dark, { shape: 'sphere', name: 'face-mustelid-pupil' });
        for (let whisker = -1; whisker <= 1; whisker += 1) add([0.4, 0.014, 0.014], [side * 0.34, -0.22 + whisker * 0.07, 0.38], light, { rotation: [0, 0, side * (0.07 + whisker * 0.11)], name: 'face-mustelid-whisker' });
      }
      add([0.14, 0.1, 0.085], [0, -0.23, 0.47], dark, { shape: 'sphere', name: 'face-mustelid-nose' });
      add([0.25, 0.035, 0.025], [0, -0.37, 0.42], dark, { shape: 'capsule', name: 'face-mustelid-mouth' });
      break;
    }
    case 'proboscidean': {
      add([0.98, 0.94, 0.34], [0, 0, 0], shifted('#7f858d', seedKey, 0.07), { shape: 'sphere', roughness: 0.76, name: 'face-proboscidean-plane' });
      for (const side of [-1, 1]) {
        add([0.53, 0.7, 0.11], [side * 0.5, 0.04, -0.05], shifted('#737b84', `${seedKey}:elephant-ear:${side}`, 0.05), { shape: 'sphere', name: 'face-proboscidean-ear' });
        add([0.22, 0.17, 0.08], [side * 0.2, 0.18, 0.22], light, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.075, 0.085, 0.04], [side * 0.2, 0.18, 0.28], iris, { shape: 'sphere', name: 'face-proboscidean-iris' });
        add([0.027, 0.035, 0.018], [side * 0.2, 0.18, 0.32], dark, { shape: 'sphere', name: 'face-proboscidean-pupil' });
        add([0.1, 0.57, 0.09], [side * 0.2, -0.4, 0.29], light, { shape: 'cone', rotation: [0, 0, side * -0.18], name: 'face-proboscidean-tusk' });
      }
      for (let segment = 0; segment < 6; segment += 1) add([0.2 - segment * 0.017, 0.24, 0.18 - segment * 0.014], [0.025 * Math.sin(segment * 0.9), -0.11 - segment * 0.17, 0.35 - segment * 0.015], shifted('#858c93', `${seedKey}:trunk:${segment}`, 0.025), { shape: 'capsule', rotation: [0, 0, Math.sin(segment * 0.7) * 0.12], name: 'face-proboscidean-trunk' });
      for (let wrinkle = -3; wrinkle <= 3; wrinkle += 1) add([0.35 - Math.abs(wrinkle) * 0.025, 0.018, 0.016], [0, 0.38 + wrinkle * 0.055, 0.31], dark, { rotation: [0, 0, wrinkle * 0.03], opacity: 0.58, name: 'face-proboscidean-wrinkle' });
      break;
    }
    case 'crustacean': {
      add([0.96, 0.79, 0.32], [0, -0.03, 0], shifted('#a84e42', seedKey, 0.09), { shape: 'sphere', metalness: 0.18, roughness: 0.42, name: 'face-crustacean-carapace' });
      for (const side of [-1, 1]) {
        add([0.07, 0.55, 0.07], [side * 0.23, 0.39, 0.08], shifted('#84372f', seedKey, 0.04), { shape: 'capsule', rotation: [0, 0, side * -0.15], name: 'face-crustacean-eye-stalk' });
        add([0.22, 0.22, 0.13], [side * 0.29, 0.65, 0.13], dark, { shape: 'sphere', name: side < 0 ? 'face-eye-left' : 'face-eye-right' });
        add([0.08, 0.09, 0.05], [side * 0.29, 0.65, 0.23], iris, { shape: 'sphere', emissive: iris, emissiveIntensity: 0.2, name: 'face-crustacean-iris' });
        add([0.22, 0.3, 0.14], [side * 0.23, -0.29, 0.26], dark, { shape: 'cone', rotation: [Math.PI / 2, 0, side * 0.38], name: 'face-crustacean-mandible' });
        add([0.28, 0.2, 0.08], [side * 0.44, -0.02, 0.16], shifted('#c46651', `${seedKey}:cheek:${side}`, 0.05), { shape: 'octahedron', name: 'face-crustacean-cheek-plate' });
        for (let segment = 0; segment < 3; segment += 1) add([0.035, 0.33 + segment * 0.08, 0.035], [side * (0.19 + segment * 0.12), 0.55 + segment * 0.16, 0.03], light, { shape: 'capsule', rotation: [0, 0, side * (-0.45 - segment * 0.1)], name: 'face-crustacean-antenna' });
      }
      for (let plate = -3; plate <= 3; plate += 1) add([0.1, 0.05, 0.035], [plate * 0.12, 0.14 - Math.abs(plate) * 0.02, 0.34], plate % 2 ? light : iris, { shape: 'octahedron', name: 'face-crustacean-shell-plate' });
      break;
    }
    case 'arachnid': {
      add([0.84, 0.9, 0.34], [0, 0, 0], shifted('#3d333d', seedKey, 0.06), { shape: 'sphere', roughness: 0.72, name: 'face-arachnid-plane' });
      const eyePositions: readonly [number, number][] = [[-0.23, 0.24], [0.23, 0.24], [-0.09, 0.31], [0.09, 0.31], [-0.3, 0.08], [0.3, 0.08], [-0.1, 0.11], [0.1, 0.11]];
      for (const [eyeIndex, [x, y]] of eyePositions.entries()) add([eyeIndex < 2 ? 0.15 : 0.1, eyeIndex < 2 ? 0.15 : 0.1, 0.065], [x, y, 0.29], eyeIndex % 2 ? iris : light, { shape: 'sphere', emissive: iris, emissiveIntensity: 0.14, name: 'face-arachnid-eye' });
      for (const side of [-1, 1]) {
        add([0.17, 0.42, 0.14], [side * 0.13, -0.3, 0.27], shifted('#8f6b58', seedKey, 0.05), { shape: 'cone', rotation: [Math.PI / 2, 0, side * 0.24], name: 'face-arachnid-fang' });
        for (let palp = 0; palp < 2; palp += 1) add([0.065, 0.35, 0.06], [side * (0.28 + palp * 0.1), -0.26 - palp * 0.1, 0.18], dark, { shape: 'capsule', rotation: [0, 0, side * (0.45 + palp * 0.16)], name: 'face-arachnid-pedipalp' });
      }
      for (let hair = 0; hair < 8; hair += 1) {
        const angle = hair / 8 * Math.PI * 2;
        add([0.025, 0.23, 0.025], [Math.cos(angle) * 0.39, Math.sin(angle) * 0.36, 0.16], shifted(fur, `${seedKey}:spider-hair:${hair}`, 0.04), { shape: 'capsule', rotation: [0, 0, -angle], name: 'face-arachnid-sensory-hair' });
      }
      add([0.25, 0.08, 0.04], [0, -0.37, 0.3], dark, { shape: 'capsule', name: 'face-arachnid-mouth' });
      break;
    }
  }

  addGeneratedFeatures(root, add, features, dark, light, iris, accent, seedKey, variant);

  return root;
}

function addGeneratedFeatures(
  root: THREE.Group,
  add: ReturnType<typeof facePartAdder>,
  features: FaceFeatureProfile,
  dark: string,
  light: string,
  iris: string,
  accent: string,
  seedKey: string,
  variant: number,
): void {
  const generatedStart = root.children.length;

  const eyeScale: Record<FaceEyeShape, [number, number]> = {
    round: [0.105, 0.105],
    narrow: [0.14, 0.055],
    wide: [0.16, 0.09],
    vertical: [0.06, 0.15],
    faceted: [0.12, 0.12],
    sleeping: [0.16, 0.025],
    ringed: [0.13, 0.13],
    teardrop: [0.09, 0.15],
    starburst: [0.14, 0.14],
    square: [0.105, 0.105],
  };
  const [eyeW, eyeH] = eyeScale[features.eyeShape];
  const eyePositions: Readonly<Record<FaceFeatureProfile['eyeCount'], readonly [number, number][]>> = {
    1: [[0, 0.23]],
    2: [[-0.2, 0.2], [0.2, 0.2]],
    3: [[-0.21, 0.18], [0.21, 0.18], [0, 0.39]],
    4: [[-0.22, 0.12], [0.22, 0.12], [-0.14, 0.36], [0.14, 0.36]],
    5: [[-0.25, 0.11], [0, 0.13], [0.25, 0.11], [-0.13, 0.36], [0.13, 0.36]],
    6: [[-0.27, 0.1], [0, 0.11], [0.27, 0.1], [-0.23, 0.34], [0, 0.38], [0.23, 0.34]],
  };
  const eyeGeometry: Partial<Record<FaceEyeShape, NonNullable<FacePartOptions['shape']>>> = {
    faceted: 'octahedron',
    ringed: 'torus',
    teardrop: 'cone',
    starburst: 'dodecahedron',
    square: 'box',
    sleeping: 'capsule',
  };
  for (const [eyeIndex, [x, y]] of eyePositions[features.eyeCount].entries()) {
    const color = shifted(iris, `${seedKey}:profile-eye:${eyeIndex}`, eyeIndex % 2 ? 0.05 : -0.03);
    add([eyeW, eyeH, 0.055], [x, y, 0.39], color, {
      shape: eyeGeometry[features.eyeShape] ?? 'sphere',
      rotation: features.eyeShape === 'teardrop'
        ? [Math.PI / 2, 0, eyeIndex % 2 ? 0.2 : -0.2]
        : features.eyeShape === 'ringed'
          ? [Math.PI / 2, 0, 0]
          : undefined,
      emissive: color,
      emissiveIntensity: features.eyeShape === 'sleeping' ? 0 : 0.13,
      name: `face-generated-eye-${features.eyeShape}`,
    });
    if (features.eyeShape !== 'sleeping' && features.eyeShape !== 'ringed') {
      add([eyeW * 0.28, eyeH * 0.34, 0.018], [x, y, 0.435], dark, {
        shape: features.eyeShape === 'faceted' ? 'octahedron' : 'sphere',
        name: 'face-generated-eye-pupil',
      });
    }
    if (features.eyeShape === 'starburst') {
      add([eyeW * 1.35, 0.018, 0.014], [x, y, 0.43], light, { name: 'face-generated-eye-star-ray' });
      add([0.018, eyeH * 1.35, 0.014], [x, y, 0.43], light, { name: 'face-generated-eye-star-ray' });
    }
  }

  if (features.browStyle !== 'absent') {
    const rotations: Record<Exclude<FaceBrowStyle, 'absent'>, number> = {
      arched: 0.16,
      straight: 0,
      split: -0.11,
      heavy: 0.05,
      feathered: 0.22,
      notched: -0.08,
      beaded: 0.12,
      tendrilled: 0.27,
      floating: -0.16,
    };
    const rotation = rotations[features.browStyle];
    for (const side of [-1, 1]) {
      add([
        features.browStyle === 'heavy' ? 0.32 : 0.25,
        features.browStyle === 'heavy' ? 0.07 : 0.035,
        0.028,
      ], [side * 0.2, 0.31, 0.34], dark, { rotation: [0, 0, side * rotation], name: `face-generated-brow-${features.browStyle}` });
      if (features.browStyle === 'split' || features.browStyle === 'feathered') {
        add([0.11, 0.025, 0.024], [side * 0.29, 0.34, 0.35], dark, { rotation: [0, 0, side * -0.32], name: 'face-generated-brow-detail' });
      }
      if (features.browStyle === 'notched') {
        add([0.035, 0.11, 0.025], [side * 0.2, 0.32, 0.37], light, { rotation: [0, 0, side * 0.44], name: 'face-generated-brow-notch' });
      } else if (features.browStyle === 'beaded') {
        for (let bead = 0; bead < 3; bead += 1) add([0.045, 0.045, 0.025], [side * (0.12 + bead * 0.075), 0.33 + bead % 2 * 0.025, 0.37], iris, { shape: 'sphere', name: 'face-generated-brow-bead' });
      } else if (features.browStyle === 'tendrilled') {
        for (let curl = 0; curl < 3; curl += 1) add([0.035, 0.14 + curl * 0.035, 0.025], [side * (0.22 + curl * 0.06), 0.38 + curl * 0.07, 0.35], dark, { shape: 'capsule', rotation: [0, 0, side * (-0.38 - curl * 0.12)], name: 'face-generated-brow-tendril' });
      } else if (features.browStyle === 'floating') {
        add([0.22, 0.04, 0.03], [side * 0.2, 0.43, 0.4], iris, { shape: 'capsule', emissive: iris, emissiveIntensity: 0.18, name: 'face-generated-floating-brow' });
      }
    }
  }

  const noseColor = shifted(light, `${seedKey}:generated-nose`, -0.035);
  switch (features.noseStyle) {
    case 'button': add([0.13, 0.1, 0.08], [0, -0.05, 0.38], noseColor, { shape: 'sphere', name: 'face-generated-button-nose' }); break;
    case 'long': add([0.11, 0.33, 0.11], [0, -0.04, 0.35], noseColor, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'face-generated-long-nose' }); break;
    case 'flat': add([0.24, 0.08, 0.07], [0, -0.08, 0.37], noseColor, { shape: 'capsule', rotation: [0, 0, Math.PI / 2], name: 'face-generated-flat-nose' }); break;
    case 'hooked': add([0.12, 0.3, 0.1], [0.04, -0.07, 0.37], noseColor, { shape: 'capsule', rotation: [0, 0, -0.28], name: 'face-generated-hooked-nose' }); break;
    case 'double':
      add([0.1, 0.16, 0.08], [-0.07, -0.05, 0.38], noseColor, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'face-generated-double-nose' });
      add([0.1, 0.16, 0.08], [0.07, -0.05, 0.38], noseColor, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'face-generated-double-nose' });
      break;
    case 'rosette':
      add([0.17, 0.17, 0.07], [0, -0.06, 0.39], noseColor, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'face-generated-rosette-nose' });
      for (let petal = 0; petal < 5; petal += 1) {
        const angle = petal / 5 * Math.PI * 2;
        add([0.055, 0.1, 0.035], [Math.cos(angle) * 0.11, -0.06 + Math.sin(angle) * 0.1, 0.42], shifted(iris, `${seedKey}:nose-petal:${petal}`, 0.05), { shape: 'sphere', rotation: [0, 0, -angle], name: 'face-generated-nose-petal' });
      }
      break;
    case 'beaked':
      add([0.16, 0.37, 0.15], [0, -0.09, 0.39], noseColor, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'face-generated-beaked-nose' });
      add([0.18, 0.035, 0.03], [0, -0.14, 0.5], dark, { name: 'face-generated-beak-seam' });
      break;
    case 'trunk':
      for (let segment = 0; segment < 4; segment += 1) add([0.11 - segment * 0.012, 0.17, 0.09 - segment * 0.01], [Math.sin(segment) * 0.018, -0.06 - segment * 0.12, 0.4], shifted(noseColor, `${seedKey}:profile-trunk:${segment}`, 0.02), { shape: 'capsule', rotation: [0, 0, Math.sin(segment * 0.8) * 0.1], name: 'face-generated-trunk-nose' });
      break;
    case 'vented':
      add([0.28, 0.13, 0.075], [0, -0.07, 0.39], shifted('#778189', seedKey, 0.04), { shape: 'capsule', rotation: [0, 0, Math.PI / 2], metalness: 0.7, name: 'face-generated-vented-nose' });
      for (let vent = -2; vent <= 2; vent += 1) add([0.025, 0.07, 0.018], [vent * 0.05, -0.07, 0.44], dark, { name: 'face-generated-nose-vent' });
      break;
    case 'absent': break;
  }

  switch (features.mouthStyle) {
    case 'smile': add([0.38, 0.07, 0.04], [0, -0.3, 0.37], shifted('#87404e', seedKey, 0.03), { shape: 'capsule', rotation: [0, 0, 0.04], name: 'face-generated-mouth-smile' }); break;
    case 'frown': add([0.38, 0.07, 0.04], [0, -0.27, 0.37], dark, { shape: 'capsule', rotation: [0, 0, -0.04], name: 'face-generated-mouth-frown' }); break;
    case 'open': add([0.3, 0.22, 0.055], [0, -0.3, 0.36], dark, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'face-generated-open-mouth' }); break;
    case 'stitched':
      add([0.4, 0.035, 0.03], [0, -0.3, 0.36], dark, { name: 'face-generated-stitched-mouth' });
      for (let stitch = -2; stitch <= 2; stitch += 1) add([0.018, 0.12, 0.018], [stitch * 0.08, -0.3, 0.39], light, { rotation: [0, 0, stitch * 0.06], name: 'face-generated-mouth-stitch' });
      break;
    case 'whisper': add([0.18, 0.1, 0.045], [0.09, -0.3, 0.37], dark, { shape: 'capsule', name: 'face-generated-whisper-mouth' }); break;
    case 'radial':
      for (let ray = 0; ray < 6; ray += 1) {
        const angle = ray / 6 * Math.PI * 2;
        add([0.025, 0.14, 0.022], [Math.cos(angle) * 0.12, -0.3 + Math.sin(angle) * 0.1, 0.38], ray % 2 ? dark : iris, { rotation: [0, 0, -angle], name: 'face-generated-radial-mouth' });
      }
      break;
    case 'toothed':
      add([0.42, 0.16, 0.05], [0, -0.3, 0.36], dark, { shape: 'capsule', name: 'face-generated-toothed-mouth' });
      for (let tooth = -3; tooth <= 3; tooth += 1) add([0.05, 0.08 + Math.abs(tooth) * 0.006, 0.025], [tooth * 0.055, -0.29, 0.405], light, { shape: 'cone', rotation: [Math.PI, 0, 0], name: 'face-generated-mouth-tooth' });
      break;
    case 'beaked':
      add([0.33, 0.15, 0.1], [0, -0.29, 0.38], shifted('#c58b3d', seedKey, 0.04), { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'face-generated-beaked-mouth' });
      add([0.32, 0.025, 0.025], [0, -0.31, 0.47], dark, { name: 'face-generated-beak-mouth-seam' });
      break;
    case 'proboscis':
      for (let segment = 0; segment < 5; segment += 1) add([0.065 - segment * 0.006, 0.14, 0.055 - segment * 0.005], [0.02 * Math.sin(segment * 0.9), -0.28 - segment * 0.1, 0.38], shifted(iris, `${seedKey}:mouth-proboscis:${segment}`, 0.04), { shape: 'capsule', rotation: [0, 0, Math.sin(segment * 0.8) * 0.14], name: 'face-generated-mouth-proboscis' });
      break;
    case 'double':
      add([0.3, 0.045, 0.03], [-0.12, -0.28, 0.38], shifted('#87404e', seedKey, 0.02), { shape: 'capsule', rotation: [0, 0, 0.08], name: 'face-generated-double-mouth' });
      add([0.3, 0.045, 0.03], [0.12, -0.34, 0.38], shifted('#87404e', seedKey, -0.02), { shape: 'capsule', rotation: [0, 0, -0.08], name: 'face-generated-double-mouth' });
      break;
  }

  if (features.markingStyle !== 'none') for (let marking = 0; marking < features.markingCount; marking += 1) {
    const side = marking % 2 ? 1 : -1;
    const row = Math.floor(marking / 2);
    const x = side * (0.27 + row * 0.027);
    const y = -0.03 - row * 0.075;
    const color = shifted(accent, `${seedKey}:marking:${marking}`, 0.08);
    switch (features.markingStyle) {
      case 'spots': add([0.055 + row * 0.006, 0.045 + row * 0.005, 0.022], [x, y, 0.39], color, { shape: 'sphere', name: 'face-generated-marking-spots' }); break;
      case 'stripes': add([0.035, 0.2 - row * 0.01, 0.022], [x, y, 0.39], color, { shape: 'capsule', rotation: [0, 0, side * (0.22 + row * 0.04)], name: 'face-generated-marking-stripes' }); break;
      case 'freckles':
        for (let freckle = 0; freckle < 3; freckle += 1) add([0.024, 0.019, 0.014], [x + side * freckle * 0.035, y + (freckle % 2) * 0.035, 0.4], color, { shape: 'sphere', name: 'face-generated-marking-freckles' });
        break;
      case 'tears': add([0.045, 0.16 + row * 0.012, 0.024], [x * 0.76, -0.01 - row * 0.08, 0.4], color, { shape: 'cone', rotation: [0, 0, Math.PI], name: 'face-generated-marking-tears' }); break;
      case 'stars': add([0.07, 0.07, 0.027], [x, y, 0.4], color, { shape: 'dodecahedron', emissive: color, emissiveIntensity: 0.12, name: 'face-generated-marking-stars' }); break;
      case 'circuit':
        add([0.14, 0.022, 0.018], [x, y, 0.4], color, { rotation: [0, 0, side * Math.PI / 4], metalness: 0.52, name: 'face-generated-marking-circuit' });
        add([0.04, 0.04, 0.022], [x + side * 0.065, y + 0.065, 0.405], light, { shape: 'sphere', metalness: 0.6, name: 'face-generated-marking-circuit-node' });
        break;
      case 'scales': add([0.065, 0.055, 0.022], [x, y, 0.39], color, { shape: 'octahedron', rotation: [0, 0, marking * 0.23], name: 'face-generated-marking-scales' }); break;
      case 'rings': add([0.075, 0.075, 0.025], [x, y, 0.39], color, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'face-generated-marking-rings' }); break;
    }
  }

  switch (features.hairStyle) {
    case 'crop': add([0.84, 0.18, 0.15], [0, 0.48, 0.02], dark, { shape: 'sphere', name: 'face-generated-crop-hair' }); break;
    case 'wave':
      for (let wave = -3; wave <= 3; wave += 1) add([0.15, 0.2 + Math.abs(wave) * 0.025, 0.11], [wave * 0.13, 0.48 - Math.abs(wave) * 0.025, 0.03], shifted(dark, `${seedKey}:wave:${wave}`, 0.03), { shape: 'sphere', name: 'face-generated-wave-hair' });
      break;
    case 'braids':
      for (const side of [-1, 1]) for (let braid = 0; braid < 5; braid += 1) add([0.08, 0.13, 0.08], [side * 0.44, 0.31 - braid * 0.12, 0.03], shifted(dark, `${seedKey}:braid:${side}:${braid}`, 0.025), { shape: 'sphere', name: 'face-generated-hair-braid' });
      break;
    case 'spikes':
      for (let spike = -3; spike <= 3; spike += 1) add([0.1, 0.32 + Math.abs(spike) * 0.02, 0.09], [spike * 0.13, 0.57 - Math.abs(spike) * 0.025, 0], dark, { shape: 'cone', rotation: [0, 0, spike * -0.08], name: 'face-generated-hair-spike' });
      break;
    case 'halo': add([0.92, 0.92, 0.08], [0, 0.18, -0.08], shifted(accent, `${seedKey}:halo`, 0.08), { shape: 'torus', rotation: [Math.PI / 2, 0, 0], emissive: accent, emissiveIntensity: 0.22 + variant * 0.02, name: 'face-generated-halo' }); break;
    case 'mane':
      for (let lock = -5; lock <= 5; lock += 1) add([0.12, 0.42 + Math.abs(lock) * 0.02, 0.1], [lock * 0.105, 0.49 - Math.abs(lock) * 0.025, -0.03], shifted(dark, `${seedKey}:profile-mane:${lock}`, 0.04), { shape: 'cone', rotation: [0, 0, lock * -0.08], name: 'face-generated-mane' });
      break;
    case 'tendrils':
      for (const side of [-1, 1]) for (let curl = 0; curl < 5; curl += 1) add([0.055, 0.31 + curl * 0.045, 0.05], [side * (0.34 + curl * 0.065), 0.43 - curl * 0.12, 0.02], shifted(accent, `${seedKey}:hair-tendril:${side}:${curl}`, 0.06), { shape: 'capsule', rotation: [0, 0, side * (0.28 + curl * 0.1)], name: 'face-generated-hair-tendril' });
      break;
    case 'crest':
      for (let plume = -4; plume <= 4; plume += 1) add([0.085, 0.44 - Math.abs(plume) * 0.025, 0.07], [plume * 0.1, 0.59 - Math.abs(plume) * 0.018, 0], shifted(plume % 2 ? iris : accent, `${seedKey}:crest:${plume}`, 0.05), { shape: 'cone', rotation: [0, 0, plume * -0.09], name: 'face-generated-hair-crest' });
      break;
    case 'crown':
      add([0.88, 0.12, 0.1], [0, 0.52, -0.02], shifted('#bd9141', seedKey, 0.05), { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.68, name: 'face-generated-hair-crown-band' });
      for (let point = -3; point <= 3; point += 1) add([0.09, 0.34 + (3 - Math.abs(point)) * 0.05, 0.075], [point * 0.12, 0.72, -0.01], shifted('#d9ad51', `${seedKey}:crown:${point}`, 0.04), { shape: 'cone', name: 'face-generated-hair-crown-point' });
      break;
    case 'bare': break;
  }

  switch (features.accessoryStyle) {
    case 'spectacles':
      for (const side of [-1, 1]) add([0.32, 0.25, 0.035], [side * 0.2, 0.19, 0.44], shifted('#ba9856', seedKey, 0.04), { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.72, name: 'face-generated-accessory-spectacles' });
      add([0.15, 0.025, 0.02], [0, 0.19, 0.44], dark, { name: 'face-generated-accessory-spectacle-bridge' });
      break;
    case 'monocle':
      add([0.34, 0.28, 0.04], [0.21, 0.19, 0.44], shifted('#d1b166', seedKey, 0.04), { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.78, name: 'face-generated-accessory-monocle' });
      add([0.025, 0.56, 0.022], [0.36, -0.11, 0.43], shifted('#d1b166', seedKey, -0.02), { shape: 'capsule', rotation: [0, 0, 0.08], metalness: 0.72, name: 'face-generated-accessory-monocle-chain' });
      break;
    case 'veil':
      add([0.94, 0.88, 0.025], [0, 0, 0.45], shifted(accent, seedKey, 0.08), { shape: 'sphere', opacity: 0.28, roughness: 0.32, name: 'face-generated-accessory-veil' });
      for (let bead = -4; bead <= 4; bead += 1) add([0.035, 0.035, 0.02], [bead * 0.095, -0.39 + Math.abs(bead) * 0.015, 0.47], light, { shape: 'sphere', name: 'face-generated-accessory-veil-bead' });
      break;
    case 'antennae':
      for (const side of [-1, 1]) {
        add([0.045, 0.63, 0.04], [side * 0.2, 0.69, 0.05], dark, { shape: 'capsule', rotation: [0, 0, side * -0.38], name: 'face-generated-accessory-antenna' });
        add([0.13, 0.13, 0.07], [side * 0.42, 0.96, 0.08], iris, { shape: 'dodecahedron', emissive: iris, emissiveIntensity: 0.2, name: 'face-generated-accessory-antenna-tip' });
      }
      break;
    case 'earrings':
      for (const side of [-1, 1]) {
        add([0.19, 0.19, 0.035], [side * 0.5, -0.12, 0.13], shifted('#d5aa54', `${seedKey}:earring:${side}`, 0.04), { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.74, name: 'face-generated-accessory-earring' });
        add([0.08, 0.08, 0.055], [side * 0.5, -0.3, 0.13], iris, { shape: 'octahedron', name: 'face-generated-accessory-earring-gem' });
      }
      break;
    case 'crown':
      add([0.94, 0.11, 0.1], [0, 0.56, 0], shifted('#d7ab4e', seedKey, 0.05), { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.76, name: 'face-generated-accessory-crown-band' });
      for (let point = -3; point <= 3; point += 1) add([0.08, 0.33 + (3 - Math.abs(point)) * 0.045, 0.07], [point * 0.13, 0.77, 0], point % 2 ? iris : '#e0bd67', { shape: 'cone', metalness: 0.64, name: 'face-generated-accessory-crown-point' });
      break;
    case 'respirator':
      add([0.48, 0.43, 0.22], [0, -0.18, 0.43], shifted('#68747a', seedKey, 0.05), { shape: 'capsule', metalness: 0.52, name: 'face-generated-accessory-respirator' });
      for (const side of [-1, 1]) add([0.16, 0.16, 0.07], [side * 0.22, -0.2, 0.54], dark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], metalness: 0.68, name: 'face-generated-accessory-respirator-filter' });
      for (let vent = -2; vent <= 2; vent += 1) add([0.025, 0.11, 0.02], [vent * 0.055, -0.2, 0.56], light, { name: 'face-generated-accessory-respirator-vent' });
      break;
    case 'third-ear':
      add([0.25, 0.48, 0.12], [0, 0.62, 0.08], shifted(light, seedKey, 0.04), { shape: 'capsule', name: 'face-generated-accessory-third-ear' });
      add([0.1, 0.31, 0.055], [0, 0.63, 0.17], shifted('#b87f82', seedKey, 0.03), { shape: 'capsule', name: 'face-generated-accessory-third-ear-inner' });
      break;
    case 'none': break;
  }

  root.userData.faceFeatureCount = root.children.length - generatedStart;
}

function facePartAdder(parent: THREE.Group) {
  return (
    scale: [number, number, number],
    position: [number, number, number],
    color: string,
    options: FacePartOptions = {},
  ): THREE.Mesh => {
    const geometry = faceGeometry(options.shape ?? 'box');
    const opacity = options.opacity ?? 1;
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.64,
      metalness: options.metalness ?? 0.04,
      emissive: options.emissive ?? '#000000',
      emissiveIntensity: options.emissiveIntensity ?? 0,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 0.5,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    if (options.rotation) mesh.rotation.set(...options.rotation);
    mesh.name = options.name ?? 'face-detail';
    mesh.castShadow = opacity > 0.5;
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
    case 'octahedron': return new THREE.OctahedronGeometry(0.5, 1);
    case 'dodecahedron': return new THREE.DodecahedronGeometry(0.5, 0);
    default: return new THREE.BoxGeometry(1, 1, 1);
  }
}

function shifted(color: string, key: string, amount: number): string {
  const hash = hashString(key);
  const hue = ((hash % 17) - 8) * amount * 0.004;
  const lightness = (((hash >>> 5) % 9) - 4) * amount * 0.02;
  return new THREE.Color(color).offsetHSL(hue, 0, lightness).getStyle();
}
