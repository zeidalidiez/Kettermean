import * as THREE from 'three';
import { hashString } from '../core/rng';
import { geometryForShape } from './modelQuality';

type Bounds = { w: number; h: number; d: number };

interface AnimalPalette {
  primary: string;
  secondary: string;
  light: string;
  dark: string;
  eye: string;
  accent: string;
}

type AnimalClass =
  | 'canine'
  | 'feline'
  | 'ungulate'
  | 'long-neck'
  | 'bulky'
  | 'small-mammal'
  | 'bird'
  | 'wading-bird'
  | 'fish'
  | 'shark'
  | 'ray'
  | 'marine-mammal'
  | 'cephalopod'
  | 'crustacean'
  | 'snake'
  | 'lizard'
  | 'turtle'
  | 'amphibian';

export function isProductionAnimalKind(kind: string): boolean {
  const value = kind.toLowerCase();
  return value.startsWith('animal_') ||
    value.startsWith('detail_animal_') ||
    value.startsWith('exhibition_animal_') ||
    value.startsWith('atelier_animal_') ||
    value.startsWith('cine_animal_') ||
    value === 'figure_deer';
}

/** Species-led animal silhouettes with bounded, meaningful parts. */
export function buildProductionAnimal(
  kind: string,
  variant: number,
  accent: string,
  body: string,
  bounds: Bounds,
): THREE.Group | null {
  if (!isProductionAnimalKind(kind)) return null;
  const root = new THREE.Group();
  const animalClass = classFor(kind);
  const palette = paletteFor(kind, variant, accent, body);
  switch (animalClass) {
    case 'canine': buildQuadruped(root, kind, variant, bounds, palette, 'canine'); break;
    case 'feline': buildQuadruped(root, kind, variant, bounds, palette, 'feline'); break;
    case 'ungulate': buildQuadruped(root, kind, variant, bounds, palette, 'ungulate'); break;
    case 'long-neck': buildQuadruped(root, kind, variant, bounds, palette, 'long-neck'); break;
    case 'bulky': buildQuadruped(root, kind, variant, bounds, palette, 'bulky'); break;
    case 'small-mammal': buildSmallMammal(root, kind, variant, bounds, palette); break;
    case 'bird': buildBird(root, kind, variant, bounds, palette, false); break;
    case 'wading-bird': buildBird(root, kind, variant, bounds, palette, true); break;
    case 'fish': buildFish(root, kind, variant, bounds, palette, false); break;
    case 'shark': buildFish(root, kind, variant, bounds, palette, true); break;
    case 'ray': buildRay(root, bounds, palette); break;
    case 'marine-mammal': buildMarineMammal(root, kind, bounds, palette); break;
    case 'cephalopod': buildCephalopod(root, bounds, palette, variant); break;
    case 'crustacean': buildCrustacean(root, kind, bounds, palette); break;
    case 'snake': buildSnake(root, bounds, palette, variant); break;
    case 'lizard': buildLizard(root, kind, bounds, palette); break;
    case 'turtle': buildTurtle(root, bounds, palette); break;
    case 'amphibian': buildAmphibian(root, kind, bounds, palette); break;
  }
  root.name = `${kind}-${variant}`;
  root.userData.detailTier = 'production-animal';
  root.userData.detailVariant = variant;
  root.userData.animalClass = animalClass;
  root.userData.productionAnimal = true;
  return root;
}

function buildQuadruped(
  root: THREE.Group,
  kind: string,
  variant: number,
  b: Bounds,
  p: AnimalPalette,
  type: 'canine' | 'feline' | 'ungulate' | 'long-neck' | 'bulky',
): void {
  const h = b.h;
  const bodyY = type === 'long-neck' ? h * 0.38 : type === 'bulky' ? h * 0.52 : h * 0.48;
  const bodyH = type === 'bulky' ? h * 0.46 : type === 'long-neck' ? h * 0.28 : h * 0.36;
  const bodyW = b.w * (type === 'bulky' ? 0.78 : 0.62);
  const bodyD = b.d * (type === 'bulky' ? 0.72 : 0.66);
  add(root, 'animal-ribcage-fur', 'sphere', [bodyW, bodyH, bodyD], [0, bodyY, -b.d * 0.06], p.primary);
  add(root, 'animal-chest-fur', 'sphere', [bodyW * 0.82, bodyH * 0.92, bodyD * 0.46], [0, bodyY + bodyH * 0.08, b.d * 0.25], p.secondary);
  add(root, 'animal-haunch-fur', 'sphere', [bodyW * 0.88, bodyH * 0.96, bodyD * 0.42], [0, bodyY, -b.d * 0.33], p.primary);

  const headY = type === 'long-neck' ? h * 0.83 : type === 'ungulate' ? h * 0.72 : h * 0.7;
  const headZ = b.d * 0.36;
  if (type === 'long-neck') {
    addBetween(root, 'animal-long-neck-fur', new THREE.Vector3(0, bodyY + bodyH * 0.1, b.d * 0.25), new THREE.Vector3(0, headY - h * 0.11, headZ), b.w * 0.22, b.w * 0.18, p.secondary);
  } else {
    addBetween(root, 'animal-neck-fur', new THREE.Vector3(0, bodyY + bodyH * 0.16, b.d * 0.25), new THREE.Vector3(0, headY - h * 0.12, headZ - b.d * 0.06), b.w * (type === 'bulky' ? 0.32 : 0.24), b.w * 0.2, p.secondary);
  }

  const headW = b.w * (type === 'bulky' ? 0.48 : type === 'long-neck' ? 0.32 : 0.42);
  const headH = h * (type === 'long-neck' ? 0.18 : 0.27);
  const headD = b.d * (type === 'feline' ? 0.27 : 0.31);
  add(root, 'animal-head-fur', 'sphere', [headW, headH, headD], [0, headY, headZ], p.secondary);
  const muzzleLong = type === 'ungulate' || type === 'long-neck' ? 0.28 : type === 'canine' ? 0.24 : 0.18;
  add(root, 'animal-muzzle-fur', type === 'ungulate' || type === 'long-neck' ? 'cylinder' : 'sphere', [headW * 0.58, headH * 0.43, b.d * muzzleLong], [0, headY - headH * 0.13, headZ + headD * 0.53], p.light, type === 'ungulate' || type === 'long-neck' ? [Math.PI / 2, 0, 0] : undefined);
  add(root, 'animal-nose-organic', 'sphere', [headW * 0.24, headH * 0.16, headD * 0.18], [0, headY - headH * 0.13, headZ + headD * 0.99], p.dark);

  addAnimalEyes(root, headW, headH, headD, headY, headZ, p, type === 'ungulate' || type === 'long-neck' ? 0.25 : 0.22);
  addQuadrupedEars(root, type, headW, headH, headD, headY, headZ, p);

  const legTopY = bodyY - bodyH * 0.18;
  const footY = h * 0.055;
  const frontZ = b.d * 0.24;
  const rearZ = -b.d * 0.31;
  for (const side of [-1, 1]) {
    for (const front of [-1, 1]) {
      const z = front > 0 ? frontZ : rearZ;
      const x = side * bodyW * 0.34;
      const knee = new THREE.Vector3(x + side * (front > 0 ? 0.01 : -0.015) * b.w, h * 0.23, z + (front > 0 ? -0.02 : 0.025) * b.d);
      addBetween(root, side < 0 ? 'rig-leg-left animal-upper-leg-fur' : 'rig-leg-right animal-upper-leg-fur', new THREE.Vector3(x, legTopY, z), knee, b.w * (type === 'bulky' ? 0.15 : 0.11), b.w * (type === 'bulky' ? 0.13 : 0.09), p.primary);
      addBetween(root, 'animal-lower-leg-fur', knee, new THREE.Vector3(x, footY + h * 0.09, z + b.d * 0.025), b.w * (type === 'bulky' ? 0.12 : 0.085), b.w * (type === 'bulky' ? 0.11 : 0.075), p.secondary);
      add(root, type === 'ungulate' || type === 'long-neck' ? 'animal-hoof-organic' : 'animal-paw-fur', 'box', [b.w * 0.18, h * 0.08, b.d * 0.14], [x, footY, z + b.d * 0.055], p.dark);
    }
  }

  const tailStart = new THREE.Vector3(0, bodyY + bodyH * 0.12, -b.d * 0.43);
  const tailEnd = type === 'feline'
    ? new THREE.Vector3(b.w * 0.18, bodyY + h * 0.12, -b.d * 0.58)
    : new THREE.Vector3(0, bodyY + (variant % 2 ? h * 0.13 : -h * 0.08), -b.d * 0.58);
  addBetween(root, 'animal-tail-fur', tailStart, tailEnd, b.w * (type === 'bulky' ? 0.11 : 0.075), b.w * 0.065, p.primary);

  if (type === 'ungulate' || type === 'long-neck') addHorns(root, kind, headW, headH, headY, headZ, p);
}

function addQuadrupedEars(
  root: THREE.Group,
  type: 'canine' | 'feline' | 'ungulate' | 'long-neck' | 'bulky',
  headW: number,
  headH: number,
  headD: number,
  headY: number,
  headZ: number,
  p: AnimalPalette,
): void {
  for (const side of [-1, 1]) {
    if (type === 'feline') {
      add(root, 'animal-ear-fur', 'cone', [headW * 0.31, headH * 0.46, headD * 0.25], [side * headW * 0.34, headY + headH * 0.46, headZ], p.primary, [0, 0, side * -0.15]);
    } else if (type === 'canine') {
      add(root, 'animal-ear-fur', 'cone', [headW * 0.3, headH * 0.58, headD * 0.22], [side * headW * 0.36, headY + headH * 0.35, headZ - headD * 0.06], p.dark, [0, 0, side * 0.2]);
    } else {
      add(root, 'animal-ear-fur', 'sphere', [headW * 0.42, headH * 0.24, headD * 0.18], [side * headW * 0.5, headY + headH * 0.18, headZ - headD * 0.03], p.primary, [0, 0, side * 0.2]);
    }
  }
}

function addHorns(
  root: THREE.Group,
  kind: string,
  headW: number,
  headH: number,
  headY: number,
  headZ: number,
  p: AnimalPalette,
): void {
  if (/(horse|pony|donkey|zebra|camel|llama|alpaca)/.test(kind)) return;
  const antler = /(deer|elk|moose|caribou)/.test(kind);
  for (const side of [-1, 1]) {
    add(root, antler ? 'animal-antler-organic' : 'animal-horn-organic', antler ? 'cylinder' : 'cone', [headW * 0.12, headH * (antler ? 0.78 : 0.58), headW * 0.1], [side * headW * 0.27, headY + headH * 0.58, headZ - headW * 0.08], p.dark, [0, 0, side * -0.2]);
    if (antler) {
      add(root, 'animal-antler-tine-organic', 'cone', [headW * 0.09, headH * 0.36, headW * 0.08], [side * headW * 0.42, headY + headH * 0.72, headZ - headW * 0.08], p.dark, [0, 0, side * -0.7]);
    }
  }
}

function buildSmallMammal(root: THREE.Group, kind: string, variant: number, b: Bounds, p: AnimalPalette): void {
  const rabbit = /(rabbit|hare)/.test(kind);
  const upright = /(meerkat|kangaroo|wallaby)/.test(kind);
  const bodyY = b.h * (upright ? 0.48 : 0.4);
  add(root, 'animal-small-body-fur', 'sphere', [b.w * 0.62, b.h * (upright ? 0.52 : 0.46), b.d * 0.58], [0, bodyY, -b.d * 0.06], p.primary);
  add(root, 'animal-small-head-fur', 'sphere', [b.w * 0.48, b.h * 0.36, b.d * 0.42], [0, b.h * (upright ? 0.78 : 0.68), b.d * 0.25], p.secondary);
  add(root, 'animal-small-muzzle-fur', 'sphere', [b.w * 0.3, b.h * 0.16, b.d * 0.24], [0, b.h * (upright ? 0.72 : 0.62), b.d * 0.45], p.light);
  add(root, 'animal-nose-organic', 'sphere', [b.w * 0.1, b.h * 0.07, b.d * 0.07], [0, b.h * (upright ? 0.73 : 0.63), b.d * 0.58], p.dark);
  addAnimalEyes(root, b.w * 0.48, b.h * 0.36, b.d * 0.42, b.h * (upright ? 0.78 : 0.68), b.d * 0.25, p, 0.25);
  for (const side of [-1, 1]) {
    add(root, 'animal-small-ear-fur', rabbit ? 'capsule' : 'sphere', [b.w * (rabbit ? 0.16 : 0.2), b.h * (rabbit ? 0.5 : 0.2), b.d * 0.12], [side * b.w * 0.19, b.h * (rabbit ? 1.0 : upright ? 0.94 : 0.84), b.d * 0.18], p.primary, [0, 0, side * (rabbit ? 0.12 : 0.24)]);
    addBetween(root, 'animal-small-leg-fur', new THREE.Vector3(side * b.w * 0.22, bodyY - b.h * 0.08, 0), new THREE.Vector3(side * b.w * 0.24, b.h * 0.08, b.d * (variant % 2 ? 0.05 : -0.03)), b.w * 0.12, b.w * 0.09, p.secondary);
  }
  if (!rabbit) addBetween(root, 'animal-small-tail-fur', new THREE.Vector3(0, bodyY, -b.d * 0.32), new THREE.Vector3(b.w * 0.26, bodyY + b.h * 0.06, -b.d * 0.48), b.w * 0.11, b.w * 0.08, p.primary);
  else add(root, 'animal-rabbit-tail-fur', 'sphere', [b.w * 0.22, b.h * 0.19, b.d * 0.18], [0, bodyY + b.h * 0.03, -b.d * 0.38], p.light);
}

function buildBird(root: THREE.Group, kind: string, variant: number, b: Bounds, p: AnimalPalette, wading: boolean): void {
  const bodyY = b.h * (wading ? 0.62 : 0.48);
  add(root, 'animal-bird-body-feather', 'sphere', [b.w * 0.58, b.h * (wading ? 0.38 : 0.52), b.d * 0.58], [0, bodyY, -b.d * 0.06], p.primary);
  const neckTop = b.h * (wading ? 0.82 : 0.68);
  if (wading) addBetween(root, 'animal-bird-neck-feather', new THREE.Vector3(0, bodyY + b.h * 0.06, b.d * 0.16), new THREE.Vector3(0, neckTop, b.d * 0.24), b.w * 0.15, b.w * 0.12, p.light);
  add(root, 'animal-bird-head-feather', 'sphere', [b.w * 0.34, b.h * 0.28, b.d * 0.32], [0, neckTop, b.d * 0.28], p.secondary);
  const beakLength = /(toucan|pelican|stork|heron|egret|crane|albatross)/.test(kind) ? 0.42 : 0.25;
  add(root, 'animal-bird-beak-organic', 'cone', [b.w * 0.15, b.h * 0.11, b.d * beakLength], [0, neckTop - b.h * 0.02, b.d * (0.47 + beakLength * 0.2)], p.accent, [Math.PI / 2, 0, 0]);
  addAnimalEyes(root, b.w * 0.34, b.h * 0.28, b.d * 0.32, neckTop, b.d * 0.28, p, 0.28);
  for (const side of [-1, 1]) {
    add(root, side < 0 ? 'rig-wing-left animal-wing-feather' : 'rig-wing-right animal-wing-feather', 'sphere', [b.w * 0.18, b.h * 0.38, b.d * 0.5], [side * b.w * 0.31, bodyY, -b.d * 0.08], p.secondary, [0, 0, side * (0.12 + variant * 0.01)]);
    const legStart = new THREE.Vector3(side * b.w * 0.14, bodyY - b.h * 0.15, 0);
    const legEnd = new THREE.Vector3(side * b.w * 0.16, b.h * 0.08, b.d * 0.03);
    addBetween(root, side < 0 ? 'rig-leg-left animal-bird-leg-organic' : 'rig-leg-right animal-bird-leg-organic', legStart, legEnd, b.w * 0.055, b.w * 0.045, p.dark);
    add(root, 'animal-bird-foot-organic', 'box', [b.w * 0.19, b.h * 0.035, b.d * 0.15], [side * b.w * 0.16, b.h * 0.045, b.d * 0.08], p.dark);
  }
  for (const side of [-1, 0, 1]) add(root, 'animal-bird-tail-feather', 'cone', [b.w * 0.13, b.h * 0.18, b.d * 0.34], [side * b.w * 0.13, bodyY, -b.d * 0.39], side === 0 ? p.primary : p.secondary, [-Math.PI / 2, 0, side * 0.1]);
}

function buildFish(root: THREE.Group, _kind: string, variant: number, b: Bounds, p: AnimalPalette, shark: boolean): void {
  add(root, 'animal-fish-body-organic', 'sphere', [b.w * 0.78, b.h * 0.68, b.d * 0.66], [0, b.h * 0.52, 0], p.primary, [0, Math.PI / 2, 0]);
  add(root, 'animal-fish-head-organic', 'sphere', [b.w * 0.38, b.h * 0.58, b.d * 0.58], [0, b.h * 0.52, b.d * 0.3], p.secondary);
  add(root, 'animal-fish-tail-organic', 'cone', [b.w * 0.42, b.h * 0.58, b.d * 0.24], [0, b.h * 0.52, -b.d * 0.45], p.secondary, [-Math.PI / 2, 0, variant % 2 ? 0.08 : -0.08]);
  add(root, 'animal-fish-dorsal-fin-organic', 'cone', [b.w * 0.12, b.h * (shark ? 0.48 : 0.28), b.d * 0.25], [0, b.h * 0.87, -b.d * 0.04], p.dark, [0, 0, shark ? 0 : 0.12]);
  for (const side of [-1, 1]) {
    add(root, 'animal-fish-side-fin-organic', 'cone', [b.w * 0.12, b.h * 0.26, b.d * 0.3], [side * b.w * 0.35, b.h * 0.45, b.d * 0.02], p.secondary, [0, 0, side * Math.PI / 2]);
    add(root, 'animal-eye-organic', 'sphere', [b.w * 0.08, b.h * 0.1, b.d * 0.05], [side * b.w * 0.17, b.h * 0.62, b.d * 0.57], p.eye);
  }
}

function buildRay(root: THREE.Group, b: Bounds, p: AnimalPalette): void {
  add(root, 'animal-ray-body-organic', 'sphere', [b.w * 0.76, b.h * 0.34, b.d * 0.58], [0, b.h * 0.5, b.d * 0.05], p.primary);
  for (const side of [-1, 1]) add(root, 'animal-ray-wing-organic', 'cone', [b.w * 0.62, b.h * 0.18, b.d * 0.52], [side * b.w * 0.34, b.h * 0.5, 0], p.secondary, [0, 0, side * -Math.PI / 2]);
  addBetween(root, 'animal-ray-tail-organic', new THREE.Vector3(0, b.h * 0.5, -b.d * 0.24), new THREE.Vector3(0, b.h * 0.46, -b.d * 0.58), b.w * 0.05, b.w * 0.025, p.dark);
  addAnimalEyes(root, b.w * 0.32, b.h * 0.2, b.d * 0.28, b.h * 0.58, b.d * 0.18, p, 0.3);
}

function buildMarineMammal(root: THREE.Group, kind: string, b: Bounds, p: AnimalPalette): void {
  const seal = /(seal|sea_lion|manatee)/.test(kind);
  add(root, 'animal-marine-body-organic', 'sphere', [b.w * 0.66, b.h * (seal ? 0.62 : 0.5), b.d * 0.74], [0, b.h * 0.5, -b.d * 0.04], p.primary, [0, 0, 0]);
  add(root, 'animal-marine-head-organic', 'sphere', [b.w * 0.45, b.h * 0.4, b.d * 0.4], [0, b.h * 0.62, b.d * 0.33], p.secondary);
  add(root, 'animal-marine-snout-organic', 'sphere', [b.w * 0.28, b.h * 0.18, b.d * 0.22], [0, b.h * 0.56, b.d * 0.53], p.light);
  addAnimalEyes(root, b.w * 0.45, b.h * 0.4, b.d * 0.4, b.h * 0.62, b.d * 0.33, p, 0.24);
  if (!seal) {
    add(root, 'animal-marine-tail-organic', 'cone', [b.w * 0.5, b.h * 0.36, b.d * 0.25], [0, b.h * 0.46, -b.d * 0.47], p.secondary, [-Math.PI / 2, 0, 0]);
    add(root, 'animal-marine-dorsal-organic', 'cone', [b.w * 0.14, b.h * 0.35, b.d * 0.2], [0, b.h * 0.78, -b.d * 0.08], p.dark);
  }
  for (const side of [-1, 1]) add(root, 'animal-marine-flipper-organic', 'cone', [b.w * 0.16, b.h * 0.24, b.d * 0.34], [side * b.w * 0.34, b.h * 0.44, 0], p.secondary, [0, 0, side * Math.PI / 2]);
}

function buildCephalopod(root: THREE.Group, b: Bounds, p: AnimalPalette, variant: number): void {
  add(root, 'animal-octopus-mantle-organic', 'sphere', [b.w * 0.52, b.h * 0.56, b.d * 0.48], [0, b.h * 0.7, 0], p.primary);
  add(root, 'animal-octopus-head-organic', 'sphere', [b.w * 0.58, b.h * 0.3, b.d * 0.54], [0, b.h * 0.5, b.d * 0.05], p.secondary);
  addAnimalEyes(root, b.w * 0.58, b.h * 0.3, b.d * 0.54, b.h * 0.52, b.d * 0.05, p, 0.3);
  for (let arm = 0; arm < 8; arm += 1) {
    const angle = arm / 8 * Math.PI * 2 + variant * 0.04;
    const start = new THREE.Vector3(Math.cos(angle) * b.w * 0.18, b.h * 0.42, Math.sin(angle) * b.d * 0.17);
    const mid = new THREE.Vector3(Math.cos(angle) * b.w * 0.34, b.h * 0.24, Math.sin(angle) * b.d * 0.32);
    const end = new THREE.Vector3(Math.cos(angle + (arm % 2 ? 0.24 : -0.2)) * b.w * 0.48, b.h * 0.08, Math.sin(angle + (arm % 2 ? 0.24 : -0.2)) * b.d * 0.46);
    addBetween(root, 'animal-octopus-arm-organic', start, mid, b.w * 0.1, b.w * 0.07, p.primary);
    addBetween(root, 'animal-octopus-arm-tip-organic', mid, end, b.w * 0.07, b.w * 0.035, p.secondary);
  }
}

function buildCrustacean(root: THREE.Group, kind: string, b: Bounds, p: AnimalPalette): void {
  if (kind.includes('starfish')) {
    for (let arm = 0; arm < 5; arm += 1) {
      const angle = arm / 5 * Math.PI * 2;
      add(root, 'animal-starfish-arm-organic', 'cone', [b.w * 0.22, b.h * 0.16, b.d * 0.5], [Math.sin(angle) * b.w * 0.2, b.h * 0.18, Math.cos(angle) * b.d * 0.2], p.primary, [Math.PI / 2, angle, 0]);
    }
    return;
  }
  add(root, 'animal-crustacean-shell-organic', 'sphere', [b.w * 0.62, b.h * 0.42, b.d * 0.55], [0, b.h * 0.46, 0], p.primary);
  for (const side of [-1, 1]) {
    for (let leg = 0; leg < 4; leg += 1) {
      const z = (leg - 1.5) * b.d * 0.15;
      addBetween(root, 'animal-crustacean-leg-organic', new THREE.Vector3(side * b.w * 0.26, b.h * 0.42, z), new THREE.Vector3(side * b.w * 0.48, b.h * 0.12, z + (leg - 1.5) * b.d * 0.03), b.w * 0.055, b.w * 0.035, p.secondary);
    }
    addBetween(root, 'animal-crustacean-claw-arm-organic', new THREE.Vector3(side * b.w * 0.22, b.h * 0.48, b.d * 0.2), new THREE.Vector3(side * b.w * 0.43, b.h * 0.56, b.d * 0.34), b.w * 0.08, b.w * 0.055, p.primary);
    add(root, 'animal-crustacean-claw-organic', 'cone', [b.w * 0.2, b.h * 0.24, b.d * 0.18], [side * b.w * 0.48, b.h * 0.58, b.d * 0.38], p.secondary, [0, 0, side * Math.PI / 2]);
    add(root, 'animal-eye-organic', 'sphere', [b.w * 0.07, b.h * 0.08, b.d * 0.05], [side * b.w * 0.14, b.h * 0.68, b.d * 0.22], p.eye);
  }
}

function buildSnake(root: THREE.Group, b: Bounds, p: AnimalPalette, variant: number): void {
  const points: THREE.Vector3[] = [];
  for (let segment = 0; segment < 9; segment += 1) {
    const t = segment / 8;
    points.push(new THREE.Vector3(Math.sin(t * Math.PI * 2 + variant * 0.2) * b.w * 0.27, b.h * (0.14 + t * 0.05), (t - 0.5) * b.d * 0.78));
  }
  for (let index = 0; index < points.length - 1; index += 1) addBetween(root, 'animal-snake-body-organic', points[index]!, points[index + 1]!, b.w * (0.14 - index * 0.009), b.w * (0.12 - index * 0.008), index % 2 ? p.primary : p.secondary);
  const head = points[points.length - 1]!;
  add(root, 'animal-snake-head-organic', 'sphere', [b.w * 0.3, b.h * 0.22, b.d * 0.22], [head.x, head.y + b.h * 0.04, head.z + b.d * 0.06], p.secondary);
  for (const side of [-1, 1]) add(root, 'animal-eye-organic', 'sphere', [b.w * 0.055, b.h * 0.06, b.d * 0.04], [head.x + side * b.w * 0.1, head.y + b.h * 0.09, head.z + b.d * 0.16], p.eye);
}

function buildLizard(root: THREE.Group, kind: string, b: Bounds, p: AnimalPalette): void {
  const crocodilian = /(alligator|crocodile)/.test(kind);
  add(root, 'animal-lizard-body-organic', 'sphere', [b.w * 0.58, b.h * 0.42, b.d * 0.58], [0, b.h * 0.42, -b.d * 0.05], p.primary);
  add(root, 'animal-lizard-head-organic', crocodilian ? 'box' : 'sphere', [b.w * 0.42, b.h * 0.28, b.d * (crocodilian ? 0.45 : 0.32)], [0, b.h * 0.48, b.d * 0.36], p.secondary);
  addAnimalEyes(root, b.w * 0.42, b.h * 0.28, b.d * 0.36, b.h * 0.48, b.d * 0.36, p, 0.3);
  for (const side of [-1, 1]) for (const front of [-1, 1]) {
    addBetween(root, 'animal-lizard-leg-organic', new THREE.Vector3(side * b.w * 0.25, b.h * 0.4, front * b.d * 0.18), new THREE.Vector3(side * b.w * 0.45, b.h * 0.1, front * b.d * 0.28), b.w * 0.075, b.w * 0.05, p.secondary);
  }
  addBetween(root, 'animal-lizard-tail-organic', new THREE.Vector3(0, b.h * 0.4, -b.d * 0.32), new THREE.Vector3(0, b.h * 0.2, -b.d * 0.58), b.w * 0.13, b.w * 0.04, p.primary);
}

function buildTurtle(root: THREE.Group, b: Bounds, p: AnimalPalette): void {
  add(root, 'animal-turtle-shell-organic', 'sphere', [b.w * 0.72, b.h * 0.56, b.d * 0.68], [0, b.h * 0.48, -b.d * 0.05], p.dark);
  add(root, 'animal-turtle-plastron-organic', 'sphere', [b.w * 0.58, b.h * 0.24, b.d * 0.54], [0, b.h * 0.3, -b.d * 0.02], p.light);
  add(root, 'animal-turtle-head-organic', 'sphere', [b.w * 0.32, b.h * 0.3, b.d * 0.28], [0, b.h * 0.42, b.d * 0.4], p.secondary);
  addAnimalEyes(root, b.w * 0.32, b.h * 0.3, b.d * 0.28, b.h * 0.42, b.d * 0.4, p, 0.3);
  for (const side of [-1, 1]) for (const front of [-1, 1]) add(root, 'animal-turtle-leg-organic', 'sphere', [b.w * 0.24, b.h * 0.16, b.d * 0.22], [side * b.w * 0.36, b.h * 0.22, front * b.d * 0.28], p.secondary, [0, 0, side * 0.1]);
}

function buildAmphibian(root: THREE.Group, _kind: string, b: Bounds, p: AnimalPalette): void {
  add(root, 'animal-amphibian-body-organic', 'sphere', [b.w * 0.6, b.h * 0.45, b.d * 0.58], [0, b.h * 0.38, -b.d * 0.06], p.primary);
  add(root, 'animal-amphibian-head-organic', 'sphere', [b.w * 0.58, b.h * 0.42, b.d * 0.42], [0, b.h * 0.55, b.d * 0.26], p.secondary);
  for (const side of [-1, 1]) {
    add(root, 'animal-amphibian-eye-organic', 'sphere', [b.w * 0.18, b.h * 0.18, b.d * 0.14], [side * b.w * 0.22, b.h * 0.72, b.d * 0.32], p.light);
    add(root, 'animal-eye-organic', 'sphere', [b.w * 0.075, b.h * 0.08, b.d * 0.05], [side * b.w * 0.22, b.h * 0.74, b.d * 0.4], p.eye);
    addBetween(root, 'animal-amphibian-hind-leg-organic', new THREE.Vector3(side * b.w * 0.26, b.h * 0.34, -b.d * 0.14), new THREE.Vector3(side * b.w * 0.46, b.h * 0.08, -b.d * 0.24), b.w * 0.13, b.w * 0.09, p.primary);
    addBetween(root, 'animal-amphibian-foreleg-organic', new THREE.Vector3(side * b.w * 0.22, b.h * 0.4, b.d * 0.18), new THREE.Vector3(side * b.w * 0.34, b.h * 0.08, b.d * 0.3), b.w * 0.08, b.w * 0.055, p.secondary);
  }
}

function addAnimalEyes(
  root: THREE.Group,
  headW: number,
  headH: number,
  headD: number,
  headY: number,
  headZ: number,
  p: AnimalPalette,
  spacing: number,
): void {
  for (const side of [-1, 1]) {
    add(root, 'animal-eye-sclera-organic', 'sphere', [headW * 0.16, headH * 0.14, headD * 0.08], [side * headW * spacing, headY + headH * 0.12, headZ + headD * 0.49], p.light);
    add(root, 'animal-eye-organic', 'sphere', [headW * 0.075, headH * 0.08, headD * 0.045], [side * headW * spacing, headY + headH * 0.12, headZ + headD * 0.55], p.eye);
  }
}

function add(
  parent: THREE.Object3D,
  name: string,
  shape: 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'capsule',
  scale: [number, number, number],
  position: [number, number, number],
  color: string,
  rotation: [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0 });
  const mesh = new THREE.Mesh(geometryForShape(shape), material);
  mesh.name = name;
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.userData.baseRotation = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBetween(
  parent: THREE.Object3D,
  name: string,
  start: THREE.Vector3,
  end: THREE.Vector3,
  width: number,
  depth: number,
  color: string,
): THREE.Mesh {
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const direction = end.clone().sub(start);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.84, metalness: 0 });
  const mesh = new THREE.Mesh(geometryForShape('cylinder'), material);
  mesh.name = name;
  mesh.scale.set(width, direction.length(), depth);
  mesh.position.copy(midpoint);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.userData.baseRotation = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function classFor(kind: string): AnimalClass {
  const value = kind.toLowerCase();
  if (/(octopus|squid|cuttle|cephalopod)/.test(value)) return 'cephalopod';
  if (/(crab|lobster|shrimp|starfish|urchin)/.test(value)) return 'crustacean';
  if (/(stingray|manta|\bray\b)/.test(value)) return 'ray';
  if (/(shark|swordfish|tuna)/.test(value)) return 'shark';
  if (/(fish|koi|salmon|eel|seahorse|catfish)/.test(value)) return 'fish';
  if (/(dolphin|whale|seal|sea_lion|manatee)/.test(value)) return 'marine-mammal';
  if (/(snake|cobra|python)/.test(value)) return 'snake';
  if (/(turtle|tortoise)/.test(value)) return 'turtle';
  if (/(frog|toad|newt|salamander|axolotl)/.test(value)) return 'amphibian';
  if (/(lizard|gecko|chameleon|iguana|alligator|crocodile)/.test(value)) return 'lizard';
  if (/(flamingo|heron|egret|pelican|crane|stork|ostrich|emu)/.test(value)) return 'wading-bird';
  if (/(bird|crow|raven|parrot|canary|pigeon|robin|sparrow|duck|goose|turkey|chicken|penguin|puffin|peacock|toucan|owl|hawk|falcon|eagle|vulture|swan|seagull|albatross|kiwi)/.test(value)) return 'bird';
  if (/(giraffe|camel|llama|alpaca)/.test(value)) return 'long-neck';
  if (/(cow|bison|buffalo|yak|rhino|elephant|hippo|bear|panda|boar|pig)/.test(value)) return 'bulky';
  if (/(horse|pony|donkey|goat|sheep|deer|elk|moose|caribou|antelope|zebra)/.test(value)) return 'ungulate';
  if (/(cat|lynx|bobcat|puma|cheetah|leopard|tiger|lion)/.test(value)) return 'feline';
  if (/(dog|labrador|collie|fox|wolf|coyote|jackal|hyena)/.test(value)) return 'canine';
  return 'small-mammal';
}

function paletteFor(kind: string, variant: number, accent: string, body: string): AnimalPalette {
  const value = kind.toLowerCase();
  let primary = body;
  let secondary = accent;
  if (/(crow|raven|vulture|badger|skunk)/.test(value)) primary = '#2d3033';
  else if (/(polar|swan|egret|sheep|goat|rabbit|seal)/.test(value)) primary = '#d9d5c8';
  else if (/(fox|orang|red_panda)/.test(value)) primary = '#a75d32';
  else if (/(frog|toad|lizard|iguana|crocodile|alligator|turtle)/.test(value)) primary = '#5f784b';
  else if (/(fish|shark|dolphin|whale|ray|seal|manatee)/.test(value)) primary = '#577a87';
  else if (/(pig|axolotl|flamingo)/.test(value)) primary = '#c88983';
  else if (/(lion|camel|giraffe|deer|horse|cow|bison|yak|llama|alpaca|rabbit|hare|capybara)/.test(value)) primary = '#8a6748';
  primary = shift(primary, (variant - 3.5) * 0.014, (hashString(kind) % 5 - 2) * 0.012);
  secondary = shift(secondary, variant * 0.018, 0.02);
  return {
    primary,
    secondary: mix(primary, secondary, 0.36),
    light: mix(primary, '#ece4d2', 0.58),
    dark: mix(primary, '#17191b', 0.7),
    eye: variant % 4 === 0 ? '#747f43' : '#17191c',
    accent: /(bird|duck|goose|toucan|parrot|flamingo)/.test(value) ? '#d49a3e' : secondary,
  };
}

function mix(a: string, b: string, amount: number): string {
  return new THREE.Color(a).lerp(new THREE.Color(b), amount).getStyle();
}

function shift(color: string, hue: number, saturation: number): string {
  return new THREE.Color(color).offsetHSL(hue, saturation, 0).getStyle();
}
