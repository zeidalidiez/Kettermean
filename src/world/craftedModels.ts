import * as THREE from 'three';
import { geometryForLathe, geometryForShape } from './modelQuality';
import type { LatheProfile } from './modelQuality';
import type { PropKind } from './models';

/**
 * Crafted everyday furniture tier. These are hand-authored, high-complexity
 * models for the props players see every room: chairs, sofas, tables, beds,
 * cabinets, plants, lamps. Each is assembled from dozens of deliberately placed
 * parts (frames, cushions, trim, hardware, panel gaps, turned legs) so they read
 * as real objects rather than stacked primitives.
 */

type Shape = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'capsule';
type Bounds = { w: number; h: number; d: number };

interface PartOptions {
  shape?: Shape;
  /** Turn the part as a lathe profile (turned legs, vases, columns). */
  lathe?: LatheProfile;
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
  metal: string;
}

const CRAFTED_KINDS = new Set<string>([
  'chair',
  'armchair',
  'sofa',
  'sectional',
  'dining_chair',
  'office_chair',
  'stool',
  'bench',
  'garden_bench',
  'pool_lounger',
  'cinema_seat',
  'airport_seat',
  'desk',
  'reception_desk',
  'coffee_table',
  'side_table',
  'table',
  'cafeteria_table',
  'folding_table',
  'cabinet',
  'filing_cabinet',
  'wardrobe',
  'bookcase',
  'shelf',
  'locker',
  'mattress',
  'crib',
  'hospital_bed',
  'examination_bed',
  'plant',
  'planter',
  'lamp',
  'vending',
  'cooler',
  'washer',
  'cart',
  'trash',
  'tv',
  'terminal',
  'phone_booth',
  'payphone',
]);

export function isCraftedKind(kind: string): boolean {
  return CRAFTED_KINDS.has(kind) || CRAFTED_ANIMAL_KINDS.has(kind);
}

const CRAFTED_ANIMAL_KINDS = new Set<string>([
  'animal_dog',
  'animal_cat',
  'animal_horse',
  'animal_rabbit',
  'animal_crow',
  'animal_fish',
  'figure_deer',
  'figure_baby',
  'figure_balloon',
  'figure_clerk',
  'figure_guide',
  'figure_raincoat',
  'figure_mannequin',
  'figure_shadow',
  'figure_nurse',
  'figure_janitor',
  'figure_commuter',
  'figure_hazmat',
  'figure_mascot',
  'figure_bellhop',
  'figure_guard',
  'figure_worker',
  'figure_patient',
  'figure_conductor',
  'figure_teacher',
  'figure_cook',
  'figure_swimmer',
  'figure_groundskeeper',
  'figure_receptionist',
  'figure_courier',
  'figure_usher',
  'figure_tourist',
  'figure_mechanic',
  'figure_lifeguard',
  'figure_vendor',
  'figure_firefighter',
  'figure_librarian',
  'figure_lab_tech',
  'figure_coach',
  'figure_musician',
]);

/** Build a detailed everyday model, or null when the kind is not crafted here. */
export function buildCraftedModel(
  kind: PropKind,
  variant: number,
  accent: string,
  body: string,
  bounds: Bounds,
): THREE.Group | null {
  if (!isCraftedKind(kind) && !CRAFTED_ANIMAL_KINDS.has(kind)) return null;
  const p = paletteFor(kind, variant, accent, body);
  const root = new THREE.Group();
  if (CRAFTED_ANIMAL_KINDS.has(kind)) {
    buildCraftedAnimal(root, kind, bounds, p, variant);
  } else {
    switch (kind) {
    case 'chair': buildChair(root, bounds, p, variant); break;
    case 'dining_chair': buildDiningChair(root, bounds, p, variant); break;
    case 'office_chair': buildOfficeChair(root, bounds, p, variant); break;
    case 'stool': buildStool(root, bounds, p, variant); break;
    case 'armchair': buildArmchair(root, bounds, p, variant); break;
    case 'sofa': buildSofa(root, bounds, p, variant); break;
    case 'sectional': buildSectional(root, bounds, p, variant); break;
    case 'bench':
    case 'garden_bench':
    case 'cinema_seat':
    case 'airport_seat': buildBench(root, bounds, p, variant); break;
    case 'pool_lounger': buildLounger(root, bounds, p, variant); break;
    case 'desk':
    case 'reception_desk': buildDesk(root, bounds, p, variant); break;
    case 'table':
    case 'cafeteria_table':
    case 'folding_table': buildTable(root, bounds, p, variant); break;
    case 'coffee_table':
    case 'side_table': buildCoffeeTable(root, bounds, p, variant); break;
    case 'cabinet':
    case 'filing_cabinet':
    case 'locker': buildCabinet(root, bounds, p, variant); break;
    case 'wardrobe': buildWardrobe(root, bounds, p, variant); break;
    case 'bookcase':
    case 'shelf': buildBookcase(root, bounds, p, variant); break;
    case 'mattress': buildMattress(root, bounds, p, variant); break;
    case 'crib': buildCrib(root, bounds, p, variant); break;
    case 'hospital_bed':
    case 'examination_bed': buildHospitalBed(root, bounds, p, variant); break;
    case 'plant':
    case 'planter': buildPlant(root, bounds, p, variant); break;
    case 'lamp': buildLamp(root, bounds, p, variant); break;
    case 'vending': buildVending(root, bounds, p, variant); break;
    case 'cooler': buildCooler(root, bounds, p, variant); break;
    case 'washer': buildWasher(root, bounds, p, variant); break;
    case 'cart': buildCart(root, bounds, p, variant); break;
    case 'trash': buildTrash(root, bounds, p, variant); break;
    case 'tv': buildTv(root, bounds, p, variant); break;
    case 'terminal': buildTerminal(root, bounds, p, variant); break;
    case 'phone_booth': buildPhoneBooth(root, bounds, p, variant); break;
    case 'payphone': buildPayphone(root, bounds, p, variant); break;
    default: return null;
    }
  }
  root.name = `${kind}-${variant}`;
  root.userData.detailTier = 'crafted';
  root.userData.detailVariant = variant;
  root.userData.geometryOnly = true;
  return root;
}

// ---------------------------------------------------------------------------
// Animals
// ---------------------------------------------------------------------------

function buildCraftedAnimal(
  root: THREE.Group,
  kind: string,
  b: Bounds,
  p: Palette,
  variant: number,
): void {
  switch (kind) {
    case 'animal_dog': buildDog(root, b, p, variant); break;
    case 'animal_cat': buildCat(root, b, p, variant); break;
    case 'animal_horse': buildHorse(root, b, p, variant); break;
    case 'animal_rabbit': buildRabbit(root, b, p, variant); break;
    case 'animal_fish': buildFish(root, b, p, variant); break;
    case 'animal_crow': buildCrow(root, b, p, variant); break;
    case 'figure_deer': buildDeer(root, b, p, variant); break;
    case 'figure_baby': buildBaby(root, b, p, variant); break;
    case 'figure_balloon': buildBalloonDog(root, b, p, variant); break;
    default: buildCraftedHumanoid(root, b, p, variant);
  }
}

/**
 * A properly built dog: ribcage body with haunches, chest, neck, a head with a
 * real snout and jaw, floppy ears, a tail, and four legs with upper/lower
 * segments, paws, and toe detail.
 */
function buildDog(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  const scale = Math.min(w, h, d);

  // Body: ribcage barrel + haunches + chest. Layered so the torso reads curved.
  add([w * 0.56, h * 0.4, d * 0.5], [0, h * 0.5, d * 0.06], p.primary, { shape: 'sphere', name: 'dg-ribcage' });
  add([w * 0.48, h * 0.34, d * 0.4], [0, h * 0.46, -d * 0.18], p.secondary, { shape: 'sphere', name: 'dg-haunch' });
  add([w * 0.42, h * 0.32, d * 0.3], [0, h * 0.55, d * 0.28], p.secondary, { shape: 'sphere', name: 'dg-chest' });
  // Belly.
  add([w * 0.4, h * 0.18, d * 0.44], [0, h * 0.32, d * 0.05], p.light, { shape: 'sphere', name: 'dg-belly' });

  // Neck.
  add([w * 0.28, h * 0.3, d * 0.22], [0, h * 0.72, d * 0.32], p.primary, { shape: 'cylinder', rotation: [-0.35, 0, 0], name: 'dg-neck' });

  // Head: skull + muzzle + jaw.
  add([w * 0.36, h * 0.34, d * 0.3], [0, h * 0.9, d * 0.46], p.primary, { shape: 'sphere', name: 'dg-skull' });
  add([w * 0.22, h * 0.2, d * 0.32], [0, h * 0.84, d * 0.62], p.light, { shape: 'sphere', name: 'dg-muzzle' });
  add([w * 0.2, h * 0.12, d * 0.26], [0, h * 0.76, d * 0.62], p.dark, { shape: 'sphere', name: 'dg-jaw' });
  // Nose.
  add([w * 0.09, h * 0.08, d * 0.09], [0, h * 0.84, d * 0.78], p.dark, { shape: 'sphere', name: 'dg-nose' });
  // Eyes.
  add([w * 0.07, h * 0.07, d * 0.05], [-w * 0.11, h * 0.96, d * 0.56], p.glow, { shape: 'sphere', name: 'dg-eye-l' });
  add([w * 0.07, h * 0.07, d * 0.05], [w * 0.11, h * 0.96, d * 0.56], p.glow, { shape: 'sphere', name: 'dg-eye-r' });
  // Brows.
  add([w * 0.09, 0.02, 0.02], [-w * 0.11, h * 1.02, d * 0.55], p.dark, { shape: 'cylinder', name: 'dg-brow-l' });
  add([w * 0.09, 0.02, 0.02], [w * 0.11, h * 1.02, d * 0.55], p.dark, { shape: 'cylinder', name: 'dg-brow-r' });
  // Floppy ears.
  for (const side of [-1, 1]) {
    add([w * 0.16, h * 0.22, d * 0.06], [side * w * 0.2, h * 1.06, d * 0.4], p.secondary, { shape: 'capsule', rotation: [0.2, 0, side * 0.35], name: side < 0 ? 'dg-ear-l' : 'dg-ear-r' });
    add([w * 0.12, h * 0.12, d * 0.05], [side * w * 0.22, h * 0.94, d * 0.42], p.light, { shape: 'sphere', name: 'dg-ear-inner' });
  }

  // Tail.
  add([w * 0.08, h * 0.5, d * 0.08], [0, h * 0.62, -d * 0.3], p.primary, { shape: 'capsule', rotation: [-0.9, 0, 0], name: 'dg-tail' });
  add([w * 0.06, h * 0.2, d * 0.06], [0, h * 0.85, -d * 0.42], p.light, { shape: 'sphere', name: 'dg-tail-tip' });

  // Four legs: thigh + shin + paw.
  for (const side of [-1, 1]) for (const front of [-1, 1]) {
    const x = side * w * 0.24;
    const z = front < 0 ? d * 0.24 : -d * 0.18;
    add([w * 0.16, h * 0.3, d * 0.14], [x, h * 0.42, z], p.primary, { shape: 'capsule', name: side < 0 ? 'dg-thigh-l' : 'dg-thigh-r' });
    add([w * 0.12, h * 0.22, d * 0.1], [x, h * 0.16, z], p.secondary, { shape: 'capsule', name: 'dg-shin' });
    add([w * 0.14, h * 0.06, d * 0.14], [x, h * 0.04, z + d * 0.03], p.dark, { shape: 'capsule', name: 'dg-paw' });
    add([w * 0.05, h * 0.03, d * 0.03], [x - w * 0.04, h * 0.035, z + d * 0.05], p.light, { shape: 'sphere', name: 'dg-toe' });
    add([w * 0.05, h * 0.03, d * 0.03], [x + w * 0.04, h * 0.035, z + d * 0.05], p.light, { shape: 'sphere', name: 'dg-toe' });
  }

  // Collar.
  add([w * 0.3, h * 0.08, d * 0.22], [0, h * 0.66, d * 0.34], p.glow, { shape: 'cylinder', rotation: [-0.35, 0, 0], name: 'dg-collar' });
  add([w * 0.05, h * 0.05, d * 0.04], [0, h * 0.62, d * 0.46], p.dark, { shape: 'sphere', name: 'dg-tag' });

  // Fur texture marks.
  for (let i = 0; i < 12; i += 1) {
    const angle = i / 12 * Math.PI * 2;
    add([scale * 0.03, h * 0.08, scale * 0.03], [Math.cos(angle) * w * 0.24, h * (0.5 + Math.sin(angle * 2) * 0.16), Math.sin(angle) * d * 0.24], (i % 2 ? p.light : p.secondary), { shape: 'capsule', rotation: [0, angle, -angle], name: 'dg-fur' });
  }
  void variant;
}

/** A seated / crouching cat with arched back, chest, head, pointed ears, and tail. */
function buildCat(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Crouched body.
  add([w * 0.55, h * 0.45, d * 0.4], [0, h * 0.45, 0], p.primary, { shape: 'sphere', name: 'ct-body' });
  add([w * 0.4, h * 0.35, d * 0.3], [0, h * 0.55, d * 0.22], p.secondary, { shape: 'sphere', name: 'ct-chest' });
  add([w * 0.35, h * 0.4, d * 0.32], [0, h * 0.75, d * 0.34], p.primary, { shape: 'sphere', name: 'ct-head' });
  // Pointed ears.
  for (const side of [-1, 1]) {
    add([w * 0.14, h * 0.2, d * 0.1], [side * w * 0.15, h * 0.98, d * 0.32], p.secondary, { shape: 'cone', rotation: [0, 0, side * -0.25], name: 'ct-ear' });
    add([w * 0.07, h * 0.1, d * 0.05], [side * w * 0.15, h * 0.98, d * 0.34], p.light, { shape: 'sphere', name: 'ct-ear-inner' });
  }
  // Face.
  add([w * 0.06, h * 0.06, d * 0.04], [-w * 0.09, h * 0.82, d * 0.5], p.glow, { shape: 'sphere', name: 'ct-eye-l' });
  add([w * 0.06, h * 0.06, d * 0.04], [w * 0.09, h * 0.82, d * 0.5], p.glow, { shape: 'sphere', name: 'ct-eye-r' });
  add([w * 0.05, h * 0.04, d * 0.04], [0, h * 0.74, d * 0.52], p.dark, { shape: 'sphere', name: 'ct-nose' });
  // Whiskers.
  for (const side of [-1, 1]) for (let i = -1; i <= 1; i += 1) {
    add([w * 0.28, 0.012, 0.012], [side * w * 0.2, h * (0.76 + i * 0.03), d * 0.54], p.light, { shape: 'cylinder', name: 'ct-whisker' });
  }
  // Front paws tucked.
  for (const side of [-1, 1]) add([w * 0.1, h * 0.16, d * 0.12], [side * w * 0.14, h * 0.1, d * 0.3], p.light, { shape: 'capsule', name: 'ct-paw' });
  // Tail wrapped.
  add([w * 0.07, h * 0.4, d * 0.07], [0, h * 0.5, -d * 0.28], p.primary, { shape: 'capsule', rotation: [0.5, 0, 0], name: 'ct-tail' });
  void variant;
}

/** A standing horse with body, neck, head, ears, tail, and four jointed legs. */
function buildHorse(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  add([w * 0.5, h * 0.3, d * 0.5], [0, h * 0.5, 0], p.primary, { shape: 'sphere', name: 'hs-body' });
  add([w * 0.44, h * 0.26, d * 0.42], [0, h * 0.48, -d * 0.16], p.secondary, { shape: 'sphere', name: 'hs-haunch' });
  add([w * 0.36, h * 0.3, d * 0.32], [0, h * 0.5, d * 0.2], p.secondary, { shape: 'sphere', name: 'hs-chest' });
  // Neck (long, angled).
  add([w * 0.2, h * 0.42, d * 0.18], [0, h * 0.72, d * 0.3], p.primary, { shape: 'cylinder', rotation: [-0.5, 0, 0], name: 'hs-neck' });
  // Head + muzzle.
  add([w * 0.26, h * 0.24, d * 0.22], [0, h * 0.92, d * 0.46], p.primary, { shape: 'sphere', name: 'hs-head' });
  add([w * 0.14, h * 0.16, d * 0.3], [0, h * 0.84, d * 0.6], p.light, { shape: 'sphere', name: 'hs-muzzle' });
  add([w * 0.08, h * 0.07, d * 0.08], [0, h * 0.84, d * 0.76], p.dark, { shape: 'sphere', name: 'hs-nose' });
  // Ears.
  for (const side of [-1, 1]) add([w * 0.06, h * 0.14, d * 0.06], [side * w * 0.1, h * 1.06, d * 0.42], p.secondary, { shape: 'cone', name: 'hs-ear' });
  // Eyes.
  add([w * 0.06, h * 0.06, d * 0.04], [-w * 0.09, h * 0.96, d * 0.52], p.dark, { shape: 'sphere', name: 'hs-eye-l' });
  add([w * 0.06, h * 0.06, d * 0.04], [w * 0.09, h * 0.96, d * 0.52], p.dark, { shape: 'sphere', name: 'hs-eye-r' });
  // Mane.
  for (let i = 0; i < 8; i += 1) {
    add([w * 0.04, h * 0.16, w * 0.04], [0, h * (0.82 + i * 0.03), d * (0.34 - i * 0.03)], p.dark, { shape: 'capsule', rotation: [0, 0, -0.2], name: 'hs-mane' });
  }
  // Tail.
  add([w * 0.07, h * 0.4, d * 0.07], [0, h * 0.55, -d * 0.32], p.dark, { shape: 'capsule', rotation: [0.4, 0, 0], name: 'hs-tail' });
  // Four legs.
  for (const side of [-1, 1]) for (const front of [-1, 1]) {
    const x = side * w * 0.22;
    const z = front < 0 ? d * 0.2 : -d * 0.18;
    add([w * 0.13, h * 0.28, d * 0.11], [x, h * 0.4, z], p.primary, { shape: 'capsule', name: 'hs-upper' });
    add([w * 0.09, h * 0.22, d * 0.08], [x, h * 0.15, z], p.secondary, { shape: 'capsule', name: 'hs-lower' });
    add([w * 0.12, h * 0.05, d * 0.12], [x, h * 0.035, z + d * 0.02], p.dark, { shape: 'capsule', name: 'hs-hoof' });
  }
  void variant;
}

/** A fish with a fusiform body, dorsal fin, tail, pectoral fins, gills, and eye. */
function buildFish(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Body tapers nose to tail.
  add([w * 0.5, h * 0.5, d * 0.7], [0, h * 0.5, 0], p.primary, { shape: 'sphere', name: 'fs-body' });
  add([w * 0.42, h * 0.42, d * 0.5], [0, h * 0.5, -d * 0.3], p.secondary, { shape: 'sphere', name: 'fs-tail-haunch' });
  add([w * 0.28, h * 0.3, d * 0.3], [0, h * 0.5, d * 0.42], p.light, { shape: 'sphere', name: 'fs-head' });
  // Tail fin.
  add([w * 0.3, h * 0.3, d * 0.06], [0, h * 0.5, -d * 0.5], p.secondary, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'fs-tail-fin' });
  add([w * 0.2, h * 0.2, d * 0.05], [0, h * 0.5, -d * 0.62], p.primary, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'fs-tail-fin-2' });
  // Dorsal fin.
  add([w * 0.12, h * 0.18, d * 0.05], [0, h * 0.68, -d * 0.05], p.primary, { shape: 'cone', name: 'fs-dorsal' });
  // Pectoral fins.
  for (const side of [-1, 1]) add([w * 0.12, h * 0.1, d * 0.04], [side * w * 0.2, h * 0.42, d * 0.12], p.secondary, { shape: 'cone', rotation: [0, 0, side * 0.5], name: 'fs-pectoral' });
  // Eye + gill line.
  add([w * 0.05, h * 0.05, d * 0.04], [w * 0.2, h * 0.56, d * 0.36], p.dark, { shape: 'sphere', name: 'fs-eye' });
  add([0.02, h * 0.24, 0.02], [0, h * 0.52, d * 0.3], p.dark, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'fs-gill' });
  void variant;
}

/** A crow with a compact body, head, pointed beak, tail, wings, and legs. */
function buildCrow(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  add([w * 0.42, h * 0.36, d * 0.42], [0, h * 0.48, 0], p.dark, { shape: 'sphere', name: 'cw-body' });
  add([w * 0.34, h * 0.3, d * 0.34], [0, h * 0.48, -d * 0.18], p.primary, { shape: 'sphere', name: 'cw-rump' });
  add([w * 0.3, h * 0.34, d * 0.3], [0, h * 0.72, d * 0.18], p.dark, { shape: 'sphere', name: 'cw-head' });
  // Beak.
  add([w * 0.12, h * 0.08, d * 0.3], [0, h * 0.68, d * 0.34], p.dark, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'cw-beak' });
  // Eye.
  add([w * 0.04, h * 0.04, d * 0.03], [0, h * 0.78, d * 0.26], p.glow, { shape: 'sphere', name: 'cw-eye' });
  // Wings folded.
  for (const side of [-1, 1]) add([w * 0.2, h * 0.2, d * 0.3], [side * w * 0.22, h * 0.5, 0], p.primary, { shape: 'capsule', rotation: [0, 0, side * -0.3], name: side < 0 ? 'cw-wing-l' : 'cw-wing-r' });
  // Tail.
  add([w * 0.1, h * 0.16, d * 0.28], [0, h * 0.5, -d * 0.32], p.dark, { shape: 'capsule', rotation: [0.3, 0, 0], name: 'cw-tail' });
  // Legs + claws.
  for (const side of [-1, 1]) {
    add([0.02, h * 0.24, 0.02], [side * w * 0.08, h * 0.16, d * 0.02], p.dark, { shape: 'cylinder', name: 'cw-leg' });
    add([0.05, 0.02, 0.06], [side * w * 0.08, h * 0.05, d * 0.04], p.dark, { shape: 'capsule', name: 'cw-foot' });
  }
  void variant;
}
function buildRabbit(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  add([w * 0.5, h * 0.42, d * 0.36], [0, h * 0.5, 0], p.primary, { shape: 'sphere', name: 'rb-body' });
  add([w * 0.38, h * 0.4, d * 0.3], [0, h * 0.6, d * 0.2], p.light, { shape: 'sphere', name: 'rb-chest' });
  add([w * 0.36, h * 0.42, d * 0.32], [0, h * 0.82, d * 0.3], p.primary, { shape: 'sphere', name: 'rb-head' });
  // Long ears.
  for (const side of [-1, 1]) {
    add([w * 0.09, h * 0.42, d * 0.07], [side * w * 0.13, h * 1.18, d * 0.26], p.secondary, { shape: 'capsule', rotation: [0, 0, side * 0.2], name: 'rb-ear' });
    add([w * 0.05, h * 0.34, d * 0.04], [side * w * 0.13, h * 1.18, d * 0.28], p.light, { shape: 'capsule', name: 'rb-ear-inner' });
  }
  // Face.
  add([w * 0.06, h * 0.06, d * 0.04], [-w * 0.09, h * 0.86, d * 0.46], p.glow, { shape: 'sphere', name: 'rb-eye-l' });
  add([w * 0.06, h * 0.06, d * 0.04], [w * 0.09, h * 0.86, d * 0.46], p.glow, { shape: 'sphere', name: 'rb-eye-r' });
  add([w * 0.06, h * 0.05, d * 0.05], [0, h * 0.78, d * 0.5], p.dark, { shape: 'sphere', name: 'rb-nose' });
  // Cheek fluff.
  for (const side of [-1, 1]) add([w * 0.1, h * 0.12, d * 0.08], [side * w * 0.16, h * 0.76, d * 0.42], p.light, { shape: 'sphere', name: 'rb-cheek' });
  // Hind legs + front paws.
  for (const side of [-1, 1]) {
    add([w * 0.16, h * 0.16, d * 0.2], [side * w * 0.16, h * 0.14, d * 0.16], p.secondary, { shape: 'capsule', name: 'rb-hind' });
    add([w * 0.09, h * 0.12, d * 0.08], [side * w * 0.14, h * 0.2, d * 0.3], p.light, { shape: 'capsule', name: 'rb-front' });
  }
  // Tail.
  add([w * 0.12, h * 0.12, d * 0.12], [0, h * 0.56, -d * 0.2], p.light, { shape: 'sphere', name: 'rb-tail' });
  void variant;
}

/** A slender deer with a ribcage body, long neck, head, muzzle, antlers, ears, tail, and jointed legs. */
function buildDeer(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  add([w * 0.44, h * 0.42, d * 0.5], [0, h * 0.5, -d * 0.02], p.primary, { shape: 'sphere', name: 'dr-body' });
  add([w * 0.38, h * 0.34, d * 0.4], [0, h * 0.48, -d * 0.18], p.secondary, { shape: 'sphere', name: 'dr-haunch' });
  add([w * 0.34, h * 0.36, d * 0.34], [0, h * 0.54, d * 0.16], p.secondary, { shape: 'sphere', name: 'dr-chest' });
  add([w * 0.36, h * 0.2, d * 0.4], [0, h * 0.4, -d * 0.02], p.light, { shape: 'sphere', name: 'dr-belly' });
  // Long neck.
  add([w * 0.16, h * 0.44, d * 0.16], [0, h * 0.82, d * 0.22], p.primary, { shape: 'cylinder', rotation: [-0.4, 0, 0], name: 'dr-neck' });
  // Head + muzzle.
  add([w * 0.2, h * 0.22, d * 0.2], [0, h * 1.0, d * 0.38], p.primary, { shape: 'sphere', name: 'dr-head' });
  add([w * 0.12, h * 0.16, d * 0.28], [0, h * 0.94, d * 0.52], p.light, { shape: 'sphere', name: 'dr-muzzle' });
  add([w * 0.06, h * 0.05, d * 0.06], [0, h * 0.94, d * 0.66], p.dark, { shape: 'sphere', name: 'dr-nose' });
  // Eyes.
  add([w * 0.05, h * 0.05, d * 0.04], [-w * 0.07, h * 1.04, d * 0.46], p.dark, { shape: 'sphere', name: 'dr-eye-l' });
  add([w * 0.05, h * 0.05, d * 0.04], [w * 0.07, h * 1.04, d * 0.46], p.dark, { shape: 'sphere', name: 'dr-eye-r' });
  // Ears.
  for (const side of [-1, 1]) add([w * 0.06, h * 0.14, d * 0.04], [side * w * 0.09, h * 1.12, d * 0.34], p.secondary, { shape: 'capsule', rotation: [0, 0, side * 0.3], name: 'dr-ear' });
  // Antlers.
  for (const side of [-1, 1]) {
    add([w * 0.04, h * 0.24, w * 0.04], [side * w * 0.08, h * 1.16, d * 0.34], p.trim, { shape: 'cylinder', rotation: [0, 0, side * -0.2], name: 'dr-antler-main' });
    for (let i = 0; i < 3; i += 1) {
      add([w * 0.025, h * 0.12, w * 0.025], [side * (w * 0.08 + i * w * 0.03), h * (1.2 + i * 0.09), d * (0.3 - i * 0.02)], p.trim, { shape: 'cylinder', rotation: [0, 0, side * (0.5 + i * 0.25)], name: 'dr-antler-tine' });
    }
  }
  // Tail.
  add([w * 0.05, h * 0.1, d * 0.05], [0, h * 0.62, -d * 0.3], p.light, { shape: 'sphere', name: 'dr-tail' });
  // Four legs.
  for (const side of [-1, 1]) for (const front of [-1, 1]) {
    const x = side * w * 0.2;
    const z = front < 0 ? d * 0.18 : -d * 0.14;
    add([w * 0.08, h * 0.3, d * 0.07], [x, h * 0.38, z], p.primary, { shape: 'capsule', name: 'dr-upper' });
    add([w * 0.06, h * 0.24, d * 0.05], [x, h * 0.13, z], p.secondary, { shape: 'capsule', name: 'dr-lower' });
    add([w * 0.09, h * 0.04, d * 0.08], [x, h * 0.03, z + d * 0.02], p.dark, { shape: 'capsule', name: 'dr-hoof' });
  }
  void variant;
}

/** An oversized seated baby with layered body, arms, legs, face, and hair. */
function buildBaby(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  add([w * 0.8, h * 0.42, d * 0.7], [0, h * 0.3, 0], p.primary, { shape: 'sphere', name: 'bb-body' });
  add([w * 0.62, h * 0.4, d * 0.55], [0, h * 0.55, 0], p.secondary, { shape: 'sphere', name: 'bb-belly' });
  add([w * 0.66, h * 0.6, d * 0.62], [0, h * 0.78, d * 0.02], p.light, { shape: 'sphere', name: 'rig-head' });
  // Face.
  add([w * 0.08, h * 0.08, d * 0.06], [-w * 0.14, h * 0.84, d * 0.28], p.dark, { shape: 'sphere', name: 'bb-eye-l' });
  add([w * 0.08, h * 0.08, d * 0.06], [w * 0.14, h * 0.84, d * 0.28], p.dark, { shape: 'sphere', name: 'bb-eye-r' });
  add([w * 0.07, h * 0.06, d * 0.05], [0, h * 0.76, d * 0.3], p.dark, { shape: 'sphere', name: 'bb-nose' });
  add([w * 0.12, h * 0.06, d * 0.08], [0, h * 0.68, d * 0.3], p.dark, { shape: 'capsule', rotation: [0.2, 0, 0], name: 'bb-mouth' });
  // Hair.
  add([w * 0.66, h * 0.16, d * 0.6], [0, h * 1.02, d * 0.02], p.dark, { shape: 'sphere', name: 'bb-hair' });
  // Arms.
  for (const side of [-1, 1]) {
    add([w * 0.24, h * 0.34, d * 0.24], [side * w * 0.4, h * 0.55, 0], p.secondary, { shape: 'capsule', rotation: [0, 0, side * 0.4], name: side < 0 ? 'rig-arm-left' : 'rig-arm-right' });
    add([w * 0.16, h * 0.14, d * 0.12], [side * w * 0.52, h * 0.42, 0], p.light, { shape: 'sphere', name: 'bb-hand' });
  }
  // Legs.
  for (const side of [-1, 1]) {
    add([w * 0.26, h * 0.3, d * 0.28], [side * w * 0.22, h * 0.1, 0], p.primary, { shape: 'capsule', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
    add([w * 0.18, h * 0.1, d * 0.2], [side * w * 0.22, h * 0.03, 0], p.light, { shape: 'sphere', name: 'bb-foot' });
  }
  void variant;
}

/** A balloon-animal dog: layered inflated balloons for body, head, snout, ears, legs, and tail. */
function buildBalloonDog(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  const inflate = (x: number, y: number, z: number, s: number, c: string, name: string) =>
    add([w * s, h * s, d * s], [x, y, z], c, { shape: 'sphere', roughness: 0.25, metalness: 0.1, name });
  // Body + haunches + chest.
  inflate(0, h * 0.5, d * 0.05, 0.34, p.primary, 'bd-body');
  inflate(-w * 0.16, h * 0.42, -d * 0.16, 0.24, p.secondary, 'bd-haunch');
  inflate(w * 0.14, h * 0.55, d * 0.2, 0.22, p.secondary, 'bd-chest');
  // Head + snout.
  inflate(0, h * 0.88, d * 0.32, 0.24, p.primary, 'bd-head');
  inflate(w * 0.12, h * 0.84, d * 0.48, 0.14, p.light, 'bd-snout');
  // Ears.
  inflate(-w * 0.14, h * 1.0, d * 0.28, 0.1, p.secondary, 'bd-ear-l');
  inflate(w * 0.14, h * 1.0, d * 0.28, 0.1, p.secondary, 'bd-ear-r');
  // Legs + tail.
  for (const side of [-1, 1]) for (const front of [-1, 1]) {
    inflate(side * w * 0.2, h * 0.22, front < 0 ? d * 0.18 : -d * 0.12, 0.14, p.primary, 'bd-leg');
  }
  inflate(0, h * 0.5, -d * 0.3, 0.12, p.light, 'bd-tail');
  void variant;
}

/** A detailed standing humanoid with torso, limbs, clothing layers, and face. */
function buildCraftedHumanoid(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Torso.
  add([w * 0.5, h * 0.3, d * 0.42], [0, h * 0.62, 0], p.primary, { shape: 'capsule', name: 'h-torso' });
  add([w * 0.44, h * 0.28, d * 0.38], [0, h * 0.64, -d * 0.03], p.secondary, { shape: 'capsule', name: 'h-vest' });
  add([w * 0.48, h * 0.08, d * 0.4], [0, h * 0.48, 0], p.dark, { shape: 'capsule', name: 'h-belt' });
  // Head + neck.
  add([w * 0.1, h * 0.08, d * 0.12], [0, h * 0.8, 0], p.dark, { shape: 'cylinder', name: 'h-neck' });
  add([w * 0.34, h * 0.26, d * 0.34], [0, h * 0.94, d * 0.02], p.light, { shape: 'sphere', name: 'rig-head' });
  // Face.
  add([w * 0.04, h * 0.04, d * 0.03], [-w * 0.07, h * 0.98, d * 0.17], p.dark, { shape: 'sphere', name: 'h-eye-l' });
  add([w * 0.04, h * 0.04, d * 0.03], [w * 0.07, h * 0.98, d * 0.17], p.dark, { shape: 'sphere', name: 'h-eye-r' });
  add([w * 0.05, h * 0.04, d * 0.04], [0, h * 0.92, d * 0.18], p.dark, { shape: 'sphere', name: 'h-nose' });
  add([w * 0.07, h * 0.03, d * 0.04], [0, h * 0.87, d * 0.17], p.dark, { shape: 'capsule', name: 'h-mouth' });
  // Hair.
  add([w * 0.34, h * 0.1, d * 0.32], [0, h * 1.05, d * 0.02], p.dark, { shape: 'sphere', name: 'h-hair' });
  // Arms.
  for (const side of [-1, 1]) {
    add([w * 0.12, h * 0.3, d * 0.12], [side * w * 0.32, h * 0.66, 0], p.primary, { shape: 'capsule', name: side < 0 ? 'rig-arm-left' : 'rig-arm-right' });
    add([w * 0.1, h * 0.24, d * 0.1], [side * w * 0.35, h * 0.46, 0], p.secondary, { shape: 'capsule', name: 'h-forearm' });
    add([w * 0.09, h * 0.08, d * 0.08], [side * w * 0.36, h * 0.38, 0], p.light, { shape: 'sphere', name: 'h-hand' });
  }
  // Legs.
  for (const side of [-1, 1]) {
    add([w * 0.16, h * 0.28, d * 0.14], [side * w * 0.13, h * 0.42, 0], p.dark, { shape: 'capsule', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
    add([w * 0.13, h * 0.22, d * 0.12], [side * w * 0.13, h * 0.18, 0], p.primary, { shape: 'capsule', name: 'h-shin' });
    add([w * 0.17, h * 0.08, d * 0.28], [side * w * 0.13, h * 0.04, d * 0.05], p.dark, { shape: 'capsule', name: 'h-shoe' });
  }
  // Buttons + pockets.
  for (let i = 0; i < 3; i += 1) add([w * 0.03, w * 0.03, d * 0.02], [0, h * (0.52 + i * 0.06), d * 0.19], p.dark, { shape: 'sphere', name: 'h-button' });
  add([w * 0.2, h * 0.14, 0.02], [w * 0.14, h * 0.55, d * 0.21], p.dark, { name: 'h-pocket' });
  void variant;
}

// ---------------------------------------------------------------------------
// Seating
// ---------------------------------------------------------------------------

function buildChair(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h;
  const w = b.w;
  const d = b.d;

  // Turned legs with taper (three stacked cylinders read as turned wood).
  for (const lx of [-1, 1]) for (const lz of [-1, 1]) {
    const x = lx * w * 0.38;
    const z = lz * d * 0.38;
    add([w * 0.16, h * 0.44, w * 0.16], [x, h * 0.24, z], p.dark, { lathe: 'turned', name: 'c-leg' });
  }
  // Stretchers between legs.
  for (const sx of [-1, 1]) {
    add([w * 0.72, 0.025, 0.025], [sx * w * 0.02, h * 0.13, sx * d * 0.38], p.trim, { shape: 'cylinder', name: 'c-stretcher' });
  }
  add([0.025, 0.025, d * 0.72], [0, h * 0.13, 0], p.trim, { shape: 'cylinder', name: 'c-stretcher' });

  // Seat frame + cushion.
  add([w * 0.86, 0.06, d * 0.86], [0, h * 0.44, 0], p.dark, { name: 'c-seat-frame' });
  add([w * 0.82, h * 0.1, d * 0.82], [0, h * 0.51, 0], p.primary, { name: 'c-seat-cushion' });
  add([w * 0.78, 0.03, d * 0.78], [0, h * 0.56, 0], p.light, { name: 'c-seat-pad' });
  // Seam lines across cushion.
  add([w * 0.66, 0.012, 0.012], [0, h * 0.51, d * 0.2], p.dark, { shape: 'cylinder', name: 'c-seam' });
  add([w * 0.66, 0.012, 0.012], [0, h * 0.51, -d * 0.2], p.dark, { shape: 'cylinder', name: 'c-seam' });

  // Back: slats + curved top rail.
  const backZ = -d * 0.42;
  add([w * 0.78, 0.04, 0.04], [0, h * 0.6, backZ], p.dark, { name: 'c-back-rail-b' });
  add([w * 0.78, 0.05, 0.05], [0, h * 0.86, backZ], p.trim, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'c-back-rail-t' });
  add([w * 0.7, 0.04, 0.04], [0, h * 0.82, backZ], p.secondary, { name: 'c-back-rail-t2' });
  for (let i = 0; i < 4; i += 1) {
    const x = (i - 1.5) * w * 0.18;
    add([0.035, h * 0.3, 0.035], [x, h * 0.68, backZ], p.secondary, { shape: 'cylinder', name: 'c-back-slat' });
  }
  // Back cushion panel.
  add([w * 0.7, h * 0.34, 0.06], [0, h * 0.73, backZ], p.primary, { name: 'c-back-cushion' });
  // Tufting buttons.
  for (let i = 0; i < 3; i += 1) {
    add([0.02, 0.02, 0.03], [(i - 1) * w * 0.2, h * 0.74, backZ + 0.035], p.dark, { shape: 'sphere', name: 'c-button' });
  }
  // Corner blocks on frame.
  add([w * 0.78, 0.03, d * 0.78], [0, h * 0.47, 0], p.dark, { name: 'c-under-seat' });
  void variant;
}

function buildDiningChair(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Tapered legs (cone reads as turned taper).
  for (const lx of [-1, 1]) for (const lz of [-1, 1]) {
    add([0.045, h * 0.44, 0.045], [lx * w * 0.38, h * 0.22, lz * d * 0.36], p.dark, { shape: 'cone', rotation: [Math.PI, 0, 0], name: 'dc-leg' });
  }
  // Seat.
  add([w * 0.8, 0.07, d * 0.78], [0, h * 0.45, 0], p.primary, { name: 'dc-seat' });
  // Front seat edge rail.
  add([w * 0.72, 0.05, 0.05], [0, h * 0.46, d * 0.34], p.dark, { name: 'dc-seat-edge' });
  // Back: wide curved panel + stiles.
  add([w * 0.74, h * 0.5, 0.05], [0, h * 0.76, -d * 0.4], p.secondary, { name: 'dc-back' });
  add([w * 0.76, 0.06, 0.05], [0, h * 0.88, -d * 0.4], p.trim, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'dc-back-rail' });
  add([w * 0.74, 0.04, 0.04], [0, h * 0.62, -d * 0.4], p.dark, { name: 'dc-back-rail-b' });
  // Back slats.
  for (let i = 0; i < 5; i += 1) {
    const x = (i - 2) * w * 0.12;
    add([0.03, h * 0.26, 0.04], [x, h * 0.75, -d * 0.37], p.trim, { shape: 'cylinder', name: 'dc-slat' });
  }
  void variant;
}

function buildOfficeChair(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Five-star base.
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    const x = Math.cos(angle) * w * 0.36;
    const z = Math.sin(angle) * d * 0.36;
    add([0.04, h * 0.05, 0.04], [x, h * 0.018, z], p.metal, { shape: 'cylinder', name: 'oc-arm' });
    add([0.05, 0.06, 0.05], [x * 1.18, h * 0.012, z * 1.18], p.dark, { shape: 'sphere', name: 'oc-caster' });
  }
  // Hub + gas cylinder.
  add([w * 0.12, 0.06, w * 0.12], [0, h * 0.05, 0], p.metal, { shape: 'cylinder', name: 'oc-hub' });
  add([0.06, h * 0.22, 0.06], [0, h * 0.2, 0], p.metal, { shape: 'cylinder', name: 'oc-cylinder' });
  // Seat base + cushion.
  add([w * 0.6, 0.08, d * 0.6], [0, h * 0.34, 0], p.metal, { name: 'oc-seat-base' });
  add([w * 0.58, h * 0.12, d * 0.58], [0, h * 0.42, 0], p.primary, { name: 'oc-seat' });
  add([w * 0.54, 0.03, d * 0.54], [0, h * 0.47, 0], p.light, { name: 'oc-seat-pad' });
  // Back post + backrest.
  add([0.05, h * 0.4, 0.05], [0, h * 0.62, -d * 0.32], p.metal, { shape: 'cylinder', name: 'oc-post' });
  add([w * 0.6, h * 0.42, 0.08], [0, h * 0.8, -d * 0.3], p.primary, { name: 'oc-back' });
  add([w * 0.56, h * 0.36, 0.03], [0, h * 0.8, -d * 0.24], p.light, { name: 'oc-back-pad' });
  // Armrests.
  for (const sx of [-1, 1]) {
    add([0.05, h * 0.3, 0.05], [sx * w * 0.34, h * 0.5, -d * 0.12], p.metal, { shape: 'cylinder', name: 'oc-arm-post' });
    add([0.08, 0.05, d * 0.32], [sx * w * 0.34, h * 0.58, -d * 0.12], p.primary, { name: 'oc-arm' });
  }
  void variant;
}

function buildStool(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  const round = variant % 2 === 0;
  // Seat cushion.
  add([w * 0.9, h * 0.14, d * 0.9], [0, h * 0.86, 0], p.primary, { shape: round ? 'cylinder' : 'box', name: 's-seat' });
  add([w * 0.8, 0.05, d * 0.8], [0, h * 0.8, 0], p.light, { shape: round ? 'cylinder' : 'box', name: 's-seat-pad' });
  // Turned legs.
  for (const lx of [-1, 1]) for (const lz of [-1, 1]) {
    add([0.06, h * 0.7, 0.06], [lx * w * 0.32, h * 0.32, lz * d * 0.32], p.trim, { shape: 'cylinder', name: 's-leg' });
    add([0.07, 0.05, 0.07], [lx * w * 0.32, h * 0.035, lz * d * 0.32], p.dark, { shape: 'cylinder', name: 's-foot' });
  }
  // Foot rail.
  for (const sx of [-1, 1]) add([0.025, 0.025, d * 0.6], [sx * w * 0.32, h * 0.3, 0], p.metal, { shape: 'cylinder', name: 's-rail' });
}

function buildArmchair(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Legs.
  for (const lx of [-1, 1]) for (const lz of [-1, 1]) {
    add([0.06, h * 0.18, 0.06], [lx * w * 0.4, h * 0.06, lz * d * 0.38], p.dark, { shape: 'cylinder', name: 'a-leg' });
  }
  // Seat + thick cushions.
  add([w * 0.88, 0.06, d * 0.9], [0, h * 0.24, 0], p.dark, { name: 'a-seat-frame' });
  add([w * 0.84, h * 0.22, d * 0.86], [0, h * 0.38, 0], p.primary, { name: 'a-seat' });
  add([w * 0.78, h * 0.16, d * 0.8], [0, h * 0.52, 0], p.light, { name: 'a-seat-cushion' });
  // Back.
  add([w * 0.86, h * 0.6, 0.12], [0, h * 0.72, -d * 0.4], p.secondary, { name: 'a-back' });
  add([w * 0.8, h * 0.4, 0.05], [0, h * 0.72, -d * 0.32], p.primary, { name: 'a-back-cushion' });
  // Curved arms.
  for (const sx of [-1, 1]) {
    add([0.18, h * 0.5, d * 0.82], [sx * w * 0.44, h * 0.4, 0], p.secondary, { name: 'a-arm' });
    add([0.14, h * 0.1, d * 0.7], [sx * w * 0.44, h * 0.62, 0], p.primary, { name: 'a-arm-pad' });
  }
  // Welting seams.
  for (let i = 0; i < 3; i += 1) add([w * 0.72, 0.012, 0.012], [0, h * 0.44, (i - 1) * d * 0.22], p.dark, { shape: 'cylinder', name: 'a-seam' });
  void variant;
}

function buildSofa(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Legs.
  for (const lx of [-1, 1]) for (const lz of [-1, 1]) {
    add([0.07, h * 0.16, 0.07], [lx * w * 0.46, h * 0.05, lz * d * 0.42], p.dark, { shape: 'cylinder', name: 'f-leg' });
  }
  // Base frame.
  add([w * 0.94, 0.08, d * 0.94], [0, h * 0.22, 0], p.dark, { name: 'f-frame' });
  // Three seat cushions.
  for (let i = -1; i <= 1; i += 1) {
    add([w * 0.3, h * 0.2, d * 0.82], [i * w * 0.3, h * 0.36, 0], p.primary, { name: 'f-seat' });
    add([w * 0.26, h * 0.12, d * 0.76], [i * w * 0.3, h * 0.5, 0], p.light, { name: 'f-seat-cushion' });
  }
  // Back.
  add([w * 0.92, h * 0.58, 0.14], [0, h * 0.62, -d * 0.42], p.secondary, { name: 'f-back' });
  // Back cushions.
  for (let i = -1; i <= 1; i += 1) {
    add([w * 0.3, h * 0.46, 0.08], [i * w * 0.3, h * 0.62, -d * 0.34], p.primary, { name: 'f-back-cushion' });
  }
  // Arm rolls.
  for (const sx of [-1, 1]) {
    add([0.16, h * 0.55, d * 0.86], [sx * w * 0.46, h * 0.34, 0], p.secondary, { name: 'f-arm' });
    add([0.2, h * 0.16, d * 0.7], [sx * w * 0.46, h * 0.6, 0], p.primary, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'f-arm-roll' });
  }
  void variant;
}

function buildSectional(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // L-shaped: main run + return.
  add([w * 0.98, 0.08, d * 0.62], [0, h * 0.22, d * 0.05], p.dark, { name: 'sc-main-base' });
  add([w * 0.5, 0.08, d * 0.92], [w * 0.2, h * 0.22, -d * 0.1], p.dark, { name: 'sc-return-base' });
  // Seat cushions on both runs.
  for (let i = 0; i < 4; i += 1) {
    add([w * 0.22, h * 0.2, d * 0.54], [(-1.5 + i) * w * 0.24, h * 0.36, d * 0.05], p.primary, { name: 'sc-seat' });
  }
  for (let i = 0; i < 2; i += 1) {
    add([w * 0.2, h * 0.2, d * 0.4], [w * 0.2 + i * w * 0.16, h * 0.36, -d * 0.22], p.primary, { name: 'sc-seat-r' });
  }
  // Backs.
  add([w * 0.96, h * 0.56, 0.12], [0, h * 0.62, d * 0.34], p.secondary, { name: 'sc-back' });
  add([w * 0.48, h * 0.56, 0.12], [w * 0.2, h * 0.62, -d * 0.46], p.secondary, { name: 'sc-back-r' });
  // Arm at the open end.
  add([0.16, h * 0.5, d * 0.6], [-w * 0.46, h * 0.34, d * 0.1], p.secondary, { name: 'sc-arm' });
  void variant;
}

function buildBench(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Legs (turned).
  for (const lx of [-1, 1]) for (const lz of [-1, 1]) {
    add([0.07, h * 0.5, 0.07], [lx * w * 0.42, h * 0.25, lz * d * 0.34], p.dark, { shape: 'cylinder', name: 'b-leg' });
    add([0.075, 0.05, 0.075], [lx * w * 0.42, h * 0.03, lz * d * 0.34], p.dark, { shape: 'cylinder', name: 'b-foot' });
  }
  // Slatted seat.
  for (let i = 0; i < 5; i += 1) {
    add([w * 0.86, 0.05, 0.14], [0, h * 0.56, (i - 2) * d * 0.12], p.primary, { name: 'b-slat' });
  }
  // Back rest.
  add([w * 0.86, 0.08, 0.08], [0, h * 0.88, -d * 0.42], p.secondary, { name: 'b-back' });
  for (let i = 0; i < 3; i += 1) add([w * 0.86, 0.04, 0.04], [0, h * 0.74 + i * h * 0.08, -d * 0.42], p.trim, { name: 'b-back-slat' });
  void variant;
}

function buildLounger(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Frame rails.
  for (const sx of [-1, 1]) {
    add([0.06, h * 0.16, d * 0.94], [sx * w * 0.45, h * 0.14, 0], p.trim, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'l-rail' });
  }
  // Back angled deck.
  add([w * 0.82, h * 0.3, 0.06], [0, h * 0.5, -d * 0.3], p.dark, { rotation: [0.25, 0, 0], name: 'l-back-frame' });
  add([w * 0.78, h * 0.16, 0.04], [0, h * 0.52, -d * 0.3], p.primary, { rotation: [0.25, 0, 0], name: 'l-back-pad' });
  // Seat pad.
  add([w * 0.8, h * 0.16, d * 0.6], [0, h * 0.26, d * 0.05], p.primary, { name: 'l-seat' });
  // Headrest.
  add([w * 0.7, h * 0.12, 0.05], [0, h * 0.68, d * 0.3], p.secondary, { name: 'l-headrest' });
  void variant;
}

// ---------------------------------------------------------------------------
// Tables and desks
// ---------------------------------------------------------------------------

function buildTable(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Top with edge banding.
  add([w * 0.96, 0.06, d * 0.96], [0, h * 0.97, 0], p.primary, { name: 't-top' });
  add([w * 0.98, 0.04, d * 0.98], [0, h * 0.9, 0], p.trim, { name: 't-top-edge' });
  // Apron.
  add([w * 0.9, 0.08, d * 0.9], [0, h * 0.8, 0], p.secondary, { name: 't-apron' });
  // Turned legs.
  for (const lx of [-1, 1]) for (const lz of [-1, 1]) {
    const x = lx * w * 0.42, z = lz * d * 0.42;
    add([w * 0.16, h * 0.8, w * 0.16], [x, h * 0.42, z], p.dark, { lathe: 'turned', name: 't-leg' });
  }
  // Stretchers.
  add([0.04, 0.04, d * 0.7], [0, h * 0.28, 0], p.trim, { shape: 'cylinder', name: 't-stretcher' });
  add([w * 0.7, 0.04, 0.04], [0, h * 0.28, 0], p.trim, { shape: 'cylinder', name: 't-stretcher' });
  void variant;
}

function buildCoffeeTable(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Top.
  add([w * 0.95, 0.05, d * 0.95], [0, h * 0.95, 0], p.primary, { name: 'ct-top' });
  add([w * 0.97, 0.03, d * 0.97], [0, h * 0.9, 0], p.trim, { name: 'ct-top-edge' });
  // Lower shelf.
  add([w * 0.8, 0.04, d * 0.8], [0, h * 0.4, 0], p.secondary, { name: 'ct-shelf' });
  // Legs.
  for (const lx of [-1, 1]) for (const lz of [-1, 1]) {
    add([0.05, h * 0.85, 0.05], [lx * w * 0.4, h * 0.42, lz * d * 0.4], p.dark, { shape: 'cylinder', name: 'ct-leg' });
    add([0.06, 0.04, 0.06], [lx * w * 0.4, h * 0.03, lz * d * 0.4], p.dark, { shape: 'sphere', name: 'ct-foot' });
  }
  void variant;
}

function buildDesk(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Top + edge.
  add([w * 0.96, 0.06, d * 0.96], [0, h * 0.97, 0], p.primary, { name: 'd-top' });
  add([w * 0.98, 0.04, d * 0.98], [0, h * 0.9, 0], p.trim, { name: 'd-top-edge' });
  // Legs.
  for (const lx of [-1, 1]) for (const lz of [-1, 1]) {
    add([0.08, h * 0.84, 0.08], [lx * w * 0.44, h * 0.42, lz * d * 0.42], p.dark, { shape: 'cylinder', name: 'd-leg' });
  }
  // Modesty panel.
  add([w * 0.8, h * 0.4, 0.04], [0, h * 0.5, -d * 0.4], p.secondary, { name: 'd-modesty' });
  // Drawer bank.
  add([w * 0.5, h * 0.34, d * 0.5], [w * 0.16, h * 0.46, d * 0.1], p.secondary, { name: 'd-drawer-bank' });
  for (let i = 0; i < 3; i += 1) {
    add([w * 0.44, 0.05, d * 0.42], [w * 0.16, h * (0.5 + i * 0.12), d * 0.1], p.primary, { name: 'd-drawer' });
    add([0.04, 0.03, 0.02], [w * 0.16, h * (0.52 + i * 0.12), d * 0.34], p.metal, { shape: 'sphere', name: 'd-pull' });
  }
  void variant;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function buildCabinet(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Carcass.
  add([w * 0.9, h * 0.88, d * 0.86], [0, h * 0.5, 0], p.primary, { name: 'cb-carcass' });
  add([w * 0.92, 0.04, d * 0.88], [0, h * 0.94, 0], p.trim, { name: 'cb-crown' });
  add([w * 0.92, 0.05, d * 0.88], [0, h * 0.05, 0], p.dark, { name: 'cb-toe' });
  // Doors with panel gaps.
  for (const sx of [-1, 1]) {
    add([w * 0.42, h * 0.82, 0.03], [sx * w * 0.22, h * 0.5, d * 0.43], p.secondary, { name: 'cb-door' });
    add([w * 0.36, h * 0.76, 0.02], [sx * w * 0.22, h * 0.5, d * 0.45], p.primary, { name: 'cb-door-panel' });
    // Hinges + handle.
    for (let i = 0; i < 2; i += 1) {
      add([0.03, 0.04, 0.02], [sx * w * 0.44, h * (0.3 + i * 0.4), d * 0.44], p.metal, { shape: 'cylinder', name: 'cb-hinge' });
    }
    add([0.03, h * 0.3, 0.02], [sx * w * 0.44, h * 0.5, d * 0.47], p.metal, { shape: 'cylinder', name: 'cb-handle' });
  }
  void variant;
}

function buildWardrobe(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Tall carcass.
  add([w * 0.9, h * 0.92, d * 0.86], [0, h * 0.48, 0], p.primary, { name: 'wd-carcass' });
  add([w * 0.92, 0.05, d * 0.88], [0, h * 0.96, 0], p.trim, { name: 'wd-crown' });
  add([w * 0.94, 0.07, d * 0.9], [0, h * 0.04, 0], p.dark, { name: 'wd-base' });
  // Two tall doors + center gap.
  for (const sx of [-1, 1]) {
    add([w * 0.43, h * 0.84, 0.04], [sx * w * 0.215, h * 0.5, d * 0.43], p.secondary, { name: 'wd-door' });
    add([w * 0.38, h * 0.78, 0.02], [sx * w * 0.215, h * 0.5, d * 0.45], p.primary, { name: 'wd-door-panel' });
    add([0.04, h * 0.6, 0.03], [sx * w * 0.43, h * 0.5, d * 0.46], p.metal, { shape: 'cylinder', name: 'wd-handle' });
  }
  // Drawer below.
  add([w * 0.82, h * 0.14, d * 0.8], [0, h * 0.09, d * 0.05], p.secondary, { name: 'wd-drawer' });
  add([0.06, 0.04, 0.03], [0, h * 0.09, d * 0.42], p.metal, { shape: 'sphere', name: 'wd-pull' });
  void variant;
}

function buildBookcase(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Frame.
  for (const sx of [-1, 1]) add([0.05, h * 0.96, d * 0.9], [sx * w * 0.44, h * 0.48, 0], p.dark, { name: 'bk-side' });
  add([w * 0.9, 0.05, d * 0.9], [0, h * 0.96, 0], p.trim, { name: 'bk-top' });
  add([w * 0.9, 0.05, d * 0.9], [0, h * 0.03, 0], p.dark, { name: 'bk-base' });
  // Back panel.
  add([w * 0.86, h * 0.94, 0.02], [0, h * 0.48, -d * 0.44], p.primary, { name: 'bk-back' });
  // Shelves.
  for (let i = 0; i < 4; i += 1) {
    add([w * 0.88, 0.04, d * 0.88], [0, h * (0.2 + i * 0.2), 0], p.secondary, { name: 'bk-shelf' });
  }
  // Books.
  for (let i = 0; i < 3; i += 1) {
    const row = i % 2;
    add([w * 0.4, h * 0.16, d * 0.2], [(i - 1) * w * 0.2, h * (0.16 + row * 0.2) + 0.08, d * 0.1], i % 2 ? p.light : p.trim, { name: 'bk-books' });
  }
  void variant;
}

// ---------------------------------------------------------------------------
// Beds and mattresses
// ---------------------------------------------------------------------------

function buildMattress(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Three stacked layers read as quilted mattress + box spring.
  add([w * 0.96, h * 0.4, d * 0.96], [0, h * 0.2, 0], p.dark, { name: 'm-box' });
  add([w * 0.94, h * 0.3, d * 0.94], [0, h * 0.45, 0], p.primary, { name: 'm-mattress' });
  add([w * 0.9, h * 0.18, d * 0.9], [0, h * 0.62, 0], p.light, { name: 'm-quilt' });
  // Quilt seam lines.
  for (let i = 0; i < 4; i += 1) {
    add([0.012, 0.012, d * 0.8], [0, h * 0.62, (i - 1.5) * d * 0.18], p.dark, { shape: 'cylinder', name: 'm-seam' });
    add([w * 0.8, 0.012, 0.012], [(i - 1.5) * w * 0.18, h * 0.62, 0], p.dark, { shape: 'cylinder', name: 'm-seam' });
  }
  // Corner piping.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    add([0.04, h * 0.3, 0.04], [sx * w * 0.46, h * 0.35, sz * d * 0.46], p.trim, { shape: 'cylinder', name: 'm-pipe' });
  }
  void variant;
}

function buildCrib(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Frame.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    add([0.07, h * 0.8, 0.07], [sx * w * 0.45, h * 0.4, sz * d * 0.42], p.trim, { shape: 'cylinder', name: 'cr-post' });
  }
  // Side rails with slats.
  for (const sx of [-1, 1]) {
    add([w * 0.88, 0.06, 0.06], [0, h * 0.7, sx * d * 0.45], p.trim, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'cr-rail-t' });
    add([w * 0.88, 0.05, 0.05], [0, h * 0.3, sx * d * 0.45], p.trim, { name: 'cr-rail-b' });
    for (let i = 0; i < 9; i += 1) {
      const x = (i - 4) * w * 0.095;
      add([0.035, h * 0.46, 0.035], [x, h * 0.52, sx * d * 0.42], p.trim, { shape: 'cylinder', name: 'cr-slat' });
    }
  }
  // Headboard panels.
  add([w * 0.86, h * 0.9, 0.05], [0, h * 0.5, -d * 0.45], p.secondary, { name: 'cr-head' });
  add([w * 0.86, h * 0.55, 0.05], [0, h * 0.42, d * 0.45], p.secondary, { name: 'cr-foot' });
  // Mattress.
  add([w * 0.82, h * 0.2, d * 0.82], [0, h * 0.22, 0], p.light, { name: 'cr-mattress' });
  void variant;
}

function buildHospitalBed(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Frame + rails.
  for (const sx of [-1, 1]) add([0.06, h * 0.2, d * 0.9], [sx * w * 0.45, h * 0.12, 0], p.metal, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'hb-rail' });
  for (const lz of [-1, 1]) add([0.05, h * 0.24, 0.05], [0, h * 0.1, lz * d * 0.42], p.metal, { shape: 'cylinder', name: 'hb-post' });
  // Mattress + pad.
  add([w * 0.84, h * 0.18, d * 0.88], [0, h * 0.3, 0], p.primary, { name: 'hb-mattress' });
  add([w * 0.8, h * 0.1, d * 0.84], [0, h * 0.42, 0], p.light, { name: 'hb-pad' });
  // Head + foot boards.
  add([w * 0.9, h * 0.6, 0.05], [0, h * 0.55, -d * 0.44], p.secondary, { name: 'hb-head' });
  add([w * 0.9, h * 0.5, 0.05], [0, h * 0.5, d * 0.44], p.secondary, { name: 'hb-foot' });
  // Side guard rails.
  for (const sx of [-1, 1]) add([0.04, h * 0.3, 0.04], [sx * w * 0.45, h * 0.34, -d * 0.2], p.metal, { name: 'hb-guard' });
  // Caster wheels.
  for (const lz of [-1, 1]) add([0.08, 0.1, 0.08], [0, h * 0.04, lz * d * 0.42], p.dark, { shape: 'sphere', name: 'hb-caster' });
  void variant;
}

// ---------------------------------------------------------------------------
// Plants and lamps
// ---------------------------------------------------------------------------

function buildPlant(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Pot with rim.
  add([w * 0.6, h * 0.26, d * 0.6], [0, h * 0.13, 0], p.secondary, { lathe: 'vase', name: 'pl-pot' });
  // Soil.
  add([w * 0.46, 0.03, d * 0.46], [0, h * 0.24, 0], p.dark, { shape: 'cylinder', name: 'pl-soil' });
  // Trunk.
  add([w * 0.06, h * 0.4, w * 0.06], [0, h * 0.4, 0], p.dark, { shape: 'cylinder', name: 'pl-trunk' });
  // Branches.
  for (let i = 0; i < 6; i += 1) {
    const angle = i / 6 * Math.PI * 2;
    add([w * 0.035, h * 0.2, w * 0.035], [Math.cos(angle) * w * 0.14, h * (0.5 + i * 0.03), Math.sin(angle) * d * 0.14], p.dark, { shape: 'cylinder', rotation: [0, 0, -angle], name: 'pl-branch' });
  }
  // Foliage clusters.
  for (let i = 0; i < 9; i += 1) {
    const angle = i / 9 * Math.PI * 2;
    const r = w * (0.16 + (i % 3) * 0.06);
    add([w * (0.14 + (i % 3) * 0.04), h * (0.14 + (i % 4) * 0.04), d * (0.14 + (i % 3) * 0.04)], [Math.cos(angle) * r, h * (0.6 + (i % 3) * 0.1), Math.sin(angle) * r], (i % 2 ? p.primary : p.secondary), { shape: 'sphere', name: 'pl-leaf' });
  }
  void variant;
}

function buildLamp(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w;
  // Turned base.
  add([w * 0.5, h * 0.22, w * 0.5], [0, h * 0.12, 0], p.dark, { lathe: 'column', name: 'l-base' });
  // Turned stem.
  add([w * 0.22, h * 0.5, w * 0.22], [0, h * 0.44, 0], p.metal, { lathe: 'turned', name: 'l-stem' });
  // Shade.
  add([w * 0.34, h * 0.24, w * 0.34], [0, h * 0.74, 0], p.primary, { lathe: 'vase', rotation: [Math.PI, 0, 0], name: 'l-shade' });
  // Bulb glow.
  add([w * 0.08, 0.06, w * 0.08], [0, h * 0.64, 0], p.glow, { shape: 'sphere', emissive: p.glow, emissiveIntensity: 0.8, name: 'l-bulb' });
  void variant;
}

// ---------------------------------------------------------------------------
// Appliances and machines
// ---------------------------------------------------------------------------

function buildVending(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Body.
  add([w * 0.9, h * 0.96, d * 0.86], [0, h * 0.48, 0], p.primary, { name: 'v-body' });
  add([w * 0.92, h * 0.03, d * 0.88], [0, h * 0.96, 0], p.trim, { name: 'v-cap' });
  add([w * 0.92, h * 0.06, d * 0.88], [0, h * 0.03, 0], p.dark, { name: 'v-toe' });
  // Glass front + products.
  add([w * 0.72, h * 0.5, 0.05], [0, h * 0.62, d * 0.43], p.light, { opacity: 0.4, name: 'v-glass' });
  for (let row = 0; row < 3; row += 1) for (let col = 0; col < 4; col += 1) {
    const x = (col - 1.5) * w * 0.15;
    add([w * 0.11, h * 0.12, d * 0.08], [x, h * (0.42 + row * 0.16), d * 0.4], col % 2 ? p.secondary : p.glow, { name: 'v-product' });
  }
  // Selection pad.
  add([w * 0.5, h * 0.16, 0.03], [0, h * 0.3, d * 0.43], p.dark, { name: 'v-pad' });
  for (let i = 0; i < 12; i += 1) {
    add([0.04, 0.04, 0.02], [((i % 4) - 1.5) * w * 0.09, h * (0.3 + Math.floor(i / 4) * 0.045), d * 0.45], p.light, { shape: 'sphere', name: 'v-button' });
  }
  // Dispense slot.
  add([w * 0.3, 0.05, d * 0.06], [0, h * 0.12, d * 0.42], p.dark, { name: 'v-slot' });
  void variant;
}

function buildCooler(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  add([w * 0.8, h * 0.9, d * 0.8], [0, h * 0.42, 0], p.primary, { shape: 'cylinder', name: 'c-water-body' });
  add([w * 0.82, 0.04, d * 0.82], [0, h * 0.9, 0], p.trim, { shape: 'cylinder', name: 'c-water-lip' });
  // Bottle on top.
  add([w * 0.5, h * 0.3, d * 0.5], [0, h * 1.05, 0], p.light, { shape: 'cylinder', name: 'c-bottle' });
  add([w * 0.3, h * 0.2, d * 0.3], [0, h * 1.3, 0], p.light, { shape: 'cylinder', name: 'c-bottle-top' });
  // Spigot + drip tray.
  add([0.06, 0.06, 0.12], [w * 0.2, h * 0.32, d * 0.42], p.metal, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'c-spigot' });
  add([w * 0.3, 0.02, d * 0.24], [w * 0.2, h * 0.2, d * 0.4], p.dark, { name: 'c-tray' });
  void variant;
}

function buildWasher(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  add([w * 0.9, h * 0.9, d * 0.86], [0, h * 0.45, 0], p.primary, { name: 'w-body' });
  // Control panel + dials.
  add([w * 0.9, h * 0.18, d * 0.06], [0, h * 0.86, d * 0.42], p.secondary, { name: 'w-console' });
  for (let i = 0; i < 3; i += 1) add([0.06, 0.06, 0.03], [(i - 1) * w * 0.12, h * 0.86, d * 0.45], p.dark, { shape: 'cylinder', name: 'w-dial' });
  // Door ring + window.
  add([w * 0.3, h * 0.3, 0.05], [0, h * 0.55, d * 0.43], p.metal, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'w-ring' });
  add([w * 0.22, h * 0.22, 0.02], [0, h * 0.55, d * 0.46], p.light, { opacity: 0.5, name: 'w-window' });
  void variant;
}

function buildCart(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Frame + shelves.
  for (const sx of [-1, 1]) for (const lz of [-1, 1]) {
    add([0.05, h * 0.8, 0.05], [sx * w * 0.4, h * 0.4, lz * d * 0.4], p.metal, { shape: 'cylinder', name: 'ctr-post' });
    add([0.08, 0.12, 0.08], [sx * w * 0.4, h * 0.03, lz * d * 0.4], p.dark, { shape: 'sphere', name: 'ctr-caster' });
  }
  add([w * 0.82, 0.04, d * 0.82], [0, h * 0.85, 0], p.metal, { name: 'ctr-top' });
  add([w * 0.82, 0.04, d * 0.82], [0, h * 0.5, 0], p.metal, { name: 'ctr-mid' });
  add([w * 0.82, 0.04, d * 0.82], [0, h * 0.15, 0], p.metal, { name: 'ctr-low' });
  // Supplies.
  for (let i = 0; i < 4; i += 1) {
    add([w * 0.14, h * 0.1, d * 0.14], [(i - 1.5) * w * 0.18, h * 0.56, d * 0.2], i % 2 ? p.primary : p.secondary, { name: 'ctr-supply' });
  }
  void variant;
}

function buildTrash(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  add([w * 0.8, h * 0.9, d * 0.8], [0, h * 0.42, 0], p.primary, { shape: 'cylinder', name: 'tr-can' });
  add([w * 0.82, 0.05, d * 0.82], [0, h * 0.88, 0], p.trim, { shape: 'cylinder', name: 'tr-lip' });
  // Lid ring + liner.
  add([w * 0.84, 0.03, d * 0.84], [0, h * 0.95, 0], p.dark, { shape: 'cylinder', name: 'tr-ring' });
  add([w * 0.7, h * 0.14, d * 0.7], [0, h * 0.3, 0], p.dark, { shape: 'cylinder', name: 'tr-liner' });
  void variant;
}

function buildTv(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w;
  // Screen + bezel.
  add([w * 0.9, h * 0.8, 0.04], [0, h * 0.7, 0], p.dark, { name: 'tv-bezel' });
  add([w * 0.86, h * 0.74, 0.02], [0, h * 0.7, 0.03], p.light, { emissive: p.glow, emissiveIntensity: 0.15, name: 'tv-screen' });
  // Stand arm + base.
  add([0.08, h * 0.14, 0.08], [0, h * 0.42, 0], p.metal, { shape: 'cylinder', name: 'tv-neck' });
  add([w * 0.4, 0.05, w * 0.4], [0, h * 0.12, 0], p.dark, { shape: 'cylinder', name: 'tv-base' });
  void variant;
}

function buildTerminal(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  add([w * 0.9, h * 0.86, d * 0.86], [0, h * 0.43, 0], p.primary, { name: 'tm-body' });
  // Screen.
  add([w * 0.78, h * 0.4, 0.04], [0, h * 0.72, d * 0.42], p.dark, { name: 'tm-screen' });
  add([w * 0.74, h * 0.36, 0.02], [0, h * 0.72, d * 0.44], p.light, { emissive: p.glow, emissiveIntensity: 0.2, name: 'tm-display' });
  // Keypad.
  add([w * 0.5, h * 0.2, 0.03], [0, h * 0.3, d * 0.42], p.dark, { name: 'tm-keypad' });
  for (let i = 0; i < 12; i += 1) {
    add([0.06, 0.06, 0.02], [((i % 4) - 1.5) * w * 0.09, h * (0.3 + Math.floor(i / 4) * 0.05), d * 0.44], p.light, { shape: 'sphere', name: 'tm-key' });
  }
  void variant;
}

function buildPhoneBooth(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Enclosure frame.
  for (const sx of [-1, 1]) add([0.06, h * 0.98, 0.06], [sx * w * 0.44, h * 0.49, 0], p.trim, { shape: 'cylinder', name: 'pb-post' });
  add([w * 0.92, 0.06, d * 0.92], [0, h * 0.97, 0], p.trim, { name: 'pb-top' });
  add([w * 0.92, 0.06, d * 0.92], [0, h * 0.03, 0], p.dark, { name: 'pb-base' });
  // Glass panels.
  for (const sx of [-1, 1]) add([0.02, h * 0.9, d * 0.86], [sx * w * 0.42, h * 0.49, 0], p.light, { opacity: 0.35, name: 'pb-glass' });
  add([0.02, h * 0.9, d * 0.86], [0, h * 0.49, -d * 0.45], p.light, { opacity: 0.35, name: 'pb-glass' });
  // Phone unit.
  add([0.05, h * 0.4, 0.2], [0, h * 0.6, d * 0.3], p.metal, { name: 'pb-phone' });
  void variant;
}

function buildPayphone(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const h = b.h, w = b.w, d = b.d;
  // Mount + body.
  add([0.05, h * 0.7, 0.05], [0, h * 0.5, 0], p.metal, { shape: 'cylinder', name: 'pp-mount' });
  add([w * 0.7, h * 0.5, d * 0.4], [0, h * 0.72, d * 0.1], p.primary, { name: 'pp-body' });
  // Handset + cradle.
  add([w * 0.24, h * 0.08, d * 0.14], [0, h * 0.82, d * 0.16], p.dark, { name: 'pp-handset' });
  add([w * 0.3, h * 0.3, 0.03], [0, h * 0.7, d * 0.3], p.dark, { name: 'pp-keypad' });
  for (let i = 0; i < 12; i += 1) add([0.04, 0.04, 0.02], [((i % 3) - 1) * w * 0.07, h * (0.7 + Math.floor(i / 3) * 0.06), d * 0.31], p.light, { shape: 'sphere', name: 'pp-key' });
  void variant;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

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
      metalness: options.metalness ?? 0.12,
      emissive: options.emissive ?? '#000000',
      emissiveIntensity: options.emissiveIntensity ?? 0,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 0.5,
    });
    const mesh = new THREE.Mesh(
      options.lathe
        ? geometryForLathe(options.lathe)
        : geometryForShape(options.shape ?? 'box'),
      material,
    );
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    if (options.rotation) mesh.rotation.set(...options.rotation);
    mesh.name = options.name ?? 'crafted-detail';
    mesh.userData.baseRotation = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
    mesh.castShadow = opacity > 0.5;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
}

function paletteFor(kind: PropKind, variant: number, accent: string, body: string): Palette {
  const primary = new THREE.Color(body).offsetHSL(0, 0, (variant - 3.5) * 0.012).getStyle();
  const secondary = new THREE.Color(accent).offsetHSL(0, 0.04, (variant % 3 - 1) * 0.02).getStyle();
  const trim = new THREE.Color(primary).multiplyScalar(0.55).getStyle();
  const dark = new THREE.Color(secondary).multiplyScalar(0.28).getStyle();
  const light = new THREE.Color(primary).lerp(new THREE.Color('#f4efe6'), 0.55).getStyle();
  const glow = ['#f0c356', '#72dbe3', '#ef8cb3', '#aee57f', '#f7925f'][variant % 5]!;
  const metal = new THREE.Color(accent).lerp(new THREE.Color('#c9ccd2'), 0.5).getStyle();
  void kind;
  return { primary, secondary, trim, dark, light, glow, metal };
}
