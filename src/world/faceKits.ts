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
  | 'cephalopod';

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
];

export type FaceEyeShape = 'round' | 'narrow' | 'wide' | 'vertical' | 'faceted' | 'sleeping';
export type FaceBrowStyle = 'arched' | 'straight' | 'split' | 'heavy' | 'feathered' | 'absent';
export type FaceNoseStyle = 'button' | 'long' | 'flat' | 'hooked' | 'double' | 'absent';
export type FaceMouthStyle = 'smile' | 'frown' | 'open' | 'stitched' | 'whisper' | 'radial';
export type FaceHairStyle = 'crop' | 'wave' | 'braids' | 'spikes' | 'halo' | 'bare';

export interface FaceFeatureProfile {
  eyeShape: FaceEyeShape;
  eyeCount: 1 | 2 | 3 | 4;
  browStyle: FaceBrowStyle;
  noseStyle: FaceNoseStyle;
  mouthStyle: FaceMouthStyle;
  hairStyle: FaceHairStyle;
  markingCount: number;
}

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
  const hash = hashString(`${seedKey}:face-features:${variant}:${style}`);
  const eyes: readonly FaceEyeShape[] = ['round', 'narrow', 'wide', 'vertical', 'faceted', 'sleeping'];
  const brows: readonly FaceBrowStyle[] = ['arched', 'straight', 'split', 'heavy', 'feathered', 'absent'];
  const noses: readonly FaceNoseStyle[] = ['button', 'long', 'flat', 'hooked', 'double', 'absent'];
  const mouths: readonly FaceMouthStyle[] = ['smile', 'frown', 'open', 'stitched', 'whisper', 'radial'];
  const hair: readonly FaceHairStyle[] = ['crop', 'wave', 'braids', 'spikes', 'halo', 'bare'];
  const eyeCounts = [1, 2, 2, 2, 3, 4] as const;
  return {
    eyeShape: eyes[hash % eyes.length]!,
    eyeCount: eyeCounts[(hash >>> 3) % eyeCounts.length]!,
    browStyle: brows[(hash >>> 6) % brows.length]!,
    noseStyle: noses[(hash >>> 9) % noses.length]!,
    mouthStyle: mouths[(hash >>> 12) % mouths.length]!,
    hairStyle: hair[(hash >>> 15) % hair.length]!,
    markingCount: (hash >>> 18) % 7,
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
  root.userData.faceFeatureCount =
    features.eyeCount + features.markingCount + (features.browStyle === 'absent' ? 0 : 2);

  const eyeScale: Record<FaceEyeShape, [number, number]> = {
    round: [0.105, 0.105],
    narrow: [0.14, 0.055],
    wide: [0.16, 0.09],
    vertical: [0.06, 0.15],
    faceted: [0.12, 0.12],
    sleeping: [0.16, 0.025],
  };
  const [eyeW, eyeH] = eyeScale[features.eyeShape];
  if (features.eyeCount === 1) {
    add([eyeW * 1.35, eyeH * 1.35, 0.055], [0, 0.27, 0.36], iris, { shape: features.eyeShape === 'faceted' ? 'torus' : 'sphere', emissive: iris, emissiveIntensity: 0.16, name: 'face-generated-single-eye' });
  } else if (features.eyeCount >= 3) {
    add([eyeW, eyeH, 0.05], [0, 0.38, 0.35], iris, { shape: features.eyeShape === 'faceted' ? 'torus' : 'sphere', emissive: iris, emissiveIntensity: 0.15, name: 'face-generated-third-eye' });
    if (features.eyeCount === 4) {
      add([eyeW * 0.78, eyeH * 0.78, 0.045], [-0.13, 0.39, 0.34], shifted(iris, `${seedKey}:fourth-eye`, 0.05), { shape: 'sphere', name: 'face-generated-fourth-eye-left' });
      add([eyeW * 0.78, eyeH * 0.78, 0.045], [0.13, 0.39, 0.34], shifted(iris, `${seedKey}:fifth-eye`, -0.05), { shape: 'sphere', name: 'face-generated-fourth-eye-right' });
    }
  }

  if (features.browStyle !== 'absent') {
    const rotations: Record<Exclude<FaceBrowStyle, 'absent'>, number> = {
      arched: 0.16,
      straight: 0,
      split: -0.11,
      heavy: 0.05,
      feathered: 0.22,
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
    case 'absent': break;
  }

  switch (features.mouthStyle) {
    case 'smile': add([0.38, 0.07, 0.04], [0, -0.3, 0.37], shifted('#87404e', seedKey, 0.03), { shape: 'capsule', rotation: [0, 0, 0.04], name: 'face-generated-smile' }); break;
    case 'frown': add([0.38, 0.07, 0.04], [0, -0.27, 0.37], dark, { shape: 'capsule', rotation: [0, 0, -0.04], name: 'face-generated-frown' }); break;
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
  }

  for (let marking = 0; marking < features.markingCount; marking += 1) {
    const side = marking % 2 ? 1 : -1;
    const row = Math.floor(marking / 2);
    add([0.045 + row * 0.008, 0.035 + row * 0.006, 0.02], [side * (0.29 + row * 0.035), -0.08 - row * 0.08, 0.37], shifted(accent, `${seedKey}:marking:${marking}`, 0.08), { shape: marking % 3 ? 'sphere' : 'torus', rotation: [Math.PI / 2, 0, 0], name: 'face-generated-marking' });
  }

  switch (features.hairStyle) {
    case 'crop': add([0.84, 0.18, 0.15], [0, 0.48, 0.02], dark, { shape: 'sphere', name: 'face-generated-crop-hair' }); break;
    case 'wave':
      for (let wave = -3; wave <= 3; wave += 1) add([0.15, 0.2 + Math.abs(wave) * 0.025, 0.11], [wave * 0.13, 0.48 - Math.abs(wave) * 0.025, 0.03], shifted(dark, `${seedKey}:wave:${wave}`, 0.03), { shape: 'sphere', name: 'face-generated-wave-hair' });
      break;
    case 'braids':
      for (const side of [-1, 1]) for (let braid = 0; braid < 5; braid += 1) add([0.08, 0.13, 0.08], [side * 0.44, 0.31 - braid * 0.12, 0.03], shifted(dark, `${seedKey}:braid:${side}:${braid}`, 0.025), { shape: 'sphere', name: 'face-generated-braid' });
      break;
    case 'spikes':
      for (let spike = -3; spike <= 3; spike += 1) add([0.1, 0.32 + Math.abs(spike) * 0.02, 0.09], [spike * 0.13, 0.57 - Math.abs(spike) * 0.025, 0], dark, { shape: 'cone', rotation: [0, 0, spike * -0.08], name: 'face-generated-hair-spike' });
      break;
    case 'halo': add([0.92, 0.92, 0.08], [0, 0.18, -0.08], shifted(accent, `${seedKey}:halo`, 0.08), { shape: 'torus', rotation: [Math.PI / 2, 0, 0], emissive: accent, emissiveIntensity: 0.22 + variant * 0.02, name: 'face-generated-halo' }); break;
    case 'bare': break;
  }
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
    default: return new THREE.BoxGeometry(1, 1, 1);
  }
}

function shifted(color: string, key: string, amount: number): string {
  const hash = hashString(key);
  const hue = ((hash % 17) - 8) * amount * 0.004;
  const lightness = (((hash >>> 5) % 9) - 4) * amount * 0.02;
  return new THREE.Color(color).offsetHSL(hue, 0, lightness).getStyle();
}
