import * as THREE from 'three';
import { hashString } from '../core/rng';
import { faceDecalMaterial, garmentDecalMaterial } from './modelMaterials';
import { geometryForShape, getModelQuality, getShapeDensity } from './modelQuality';

type Bounds = { w: number; h: number; d: number };

interface CharacterPalette {
  skin: string;
  skinShadow: string;
  hair: string;
  shirt: string;
  shirtDark: string;
  trousers: string;
  leather: string;
  metal: string;
  accent: string;
  light: string;
}

type RoleClass =
  | 'food'
  | 'medical'
  | 'science'
  | 'security'
  | 'trade'
  | 'service'
  | 'religious'
  | 'creative'
  | 'sport'
  | 'professional';

const productionGeometries = new Map<string, THREE.BufferGeometry>();

export function isProductionHumanoidKind(kind: string): boolean {
  const value = kind.toLowerCase();
  return value.startsWith('figure_') ||
    value.startsWith('detail_figure_') ||
    value.startsWith('exhibition_figure_') ||
    value.startsWith('atelier_figure_') ||
    value.startsWith('cine_figure_');
}

/**
 * One disciplined character rig replaces the seven unrelated capsule stacks.
 * Roles still vary through proportion, clothing construction, head shape, pose,
 * and a small number of readable tools; arbitrary medals and orbiting beads are
 * deliberately absent.
 */
export function buildProductionHumanoid(
  kind: string,
  variant: number,
  accent: string,
  body: string,
  bounds: Bounds,
): THREE.Group | null {
  if (!isProductionHumanoidKind(kind)) return null;
  const root = new THREE.Group();
  const role = roleFor(kind);
  const palette = paletteFor(kind, variant, accent, body, role);
  const h = bounds.h;
  const bodyWidth = Math.min(bounds.w * 0.72, h * (0.29 + (variant % 3) * 0.012));
  const bodyDepth = Math.min(bounds.d * 0.72, bodyWidth * 0.58);
  const shoulderY = h * 0.715;
  const hipY = h * 0.445;
  const headY = h * 0.89;
  const headW = bodyWidth * (0.52 + (variant % 2) * 0.025);
  const headH = h * (0.205 + (variant % 3) * 0.006);
  const headD = bodyDepth * 0.95;
  const stance = (variant % 4 - 1.5) * 0.018;

  // Shoes and legs establish a natural planted silhouette. Tapered eight-sided
  // limbs read as authored low-poly anatomy instead of glossy capsules.
  for (const side of [-1, 1]) {
    const x = side * bodyWidth * 0.19;
    const ankle = new THREE.Vector3(x + side * stance * h, h * 0.09, 0);
    const knee = new THREE.Vector3(x, h * 0.265, side * stance * h * 0.3);
    const hip = new THREE.Vector3(side * bodyWidth * 0.17, hipY, 0);
    addLimb(root, side < 0 ? 'rig-leg-left' : 'rig-leg-right', hip, knee, bodyWidth * 0.25, bodyDepth * 0.46, palette.trousers);
    addLimb(root, side < 0 ? 'character-calf-left' : 'character-calf-right', knee, ankle, bodyWidth * 0.2, bodyDepth * 0.4, palette.trousers);
    addPart(
      root,
      side < 0 ? 'character-shoe-left' : 'character-shoe-right',
      wedgeGeometry(),
      [bodyWidth * 0.29, h * 0.075, headD * 0.72],
      [ankle.x, h * 0.04, headD * 0.17],
      palette.leather,
    );
  }

  addPart(root, 'character-pelvis', pelvisGeometry(), [bodyWidth, h * 0.17, bodyDepth], [0, h * 0.455, 0], palette.trousers);
  addPart(root, 'character-torso-shirt', torsoGeometry(), [bodyWidth, h * 0.31, bodyDepth], [0, h * 0.62, 0], palette.shirt);

  // Collar and belt are broad construction cues. They remain legible at normal
  // game distance and replace dozens of decorative spheres.
  for (const side of [-1, 1]) {
    addPart(
      root,
      'character-collar-point-fabric',
      lapelGeometry(),
      [bodyWidth * 0.16, h * 0.075, bodyDepth * 0.1],
      [side * bodyWidth * 0.09, h * 0.748, bodyDepth * 0.53],
      palette.light,
      [0, 0, side * -0.28],
    );
  }
  addPart(root, 'character-belt', geometryForShape('box'), [bodyWidth * 0.9, h * 0.045, bodyDepth * 1.04], [0, h * 0.475, 0], palette.leather);
  addPart(root, 'character-belt-buckle', geometryForShape('box'), [bodyWidth * 0.12, h * 0.055, bodyDepth * 0.08], [0, h * 0.477, bodyDepth * 0.54], palette.metal);

  const pose = armPoseFor(kind, variant);
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Vector3(side * bodyWidth * 0.54, shoulderY, 0);
    const sidePose = side < 0 ? pose.left : pose.right;
    const elbow = new THREE.Vector3(
      side * bodyWidth * sidePose.elbowX,
      h * sidePose.elbowY,
      bodyDepth * sidePose.elbowZ,
    );
    const wrist = new THREE.Vector3(
      side * bodyWidth * sidePose.wristX,
      h * sidePose.wristY,
      bodyDepth * sidePose.wristZ,
    );
    addLimb(root, side < 0 ? 'rig-arm-left' : 'rig-arm-right', shoulder, elbow, bodyWidth * 0.23, bodyDepth * 0.44, palette.shirt);
    addLimb(root, side < 0 ? 'character-forearm-left' : 'character-forearm-right', elbow, wrist, bodyWidth * 0.19, bodyDepth * 0.38, role === 'medical' || role === 'science' ? palette.light : palette.shirtDark);
    addPart(
      root,
      side < 0 ? 'character-hand-left' : 'character-hand-right',
      handGeometry(),
      [bodyWidth * 0.155, h * 0.07, bodyDepth * 0.37],
      [wrist.x, wrist.y - h * 0.018, wrist.z],
      palette.skin,
      [0, 0, side * 0.08],
    );
  }

  addPart(root, 'character-neck-skin', neckGeometry(), [headW * 0.36, h * 0.09, headD * 0.42], [0, h * 0.79, 0], palette.skinShadow);
  const head = addPart(root, 'rig-head character-head-skin', headGeometry(), [headW, headH, headD], [0, headY, bodyDepth * 0.035], palette.skin);
  head.userData.characterHead = true;

  for (const side of [-1, 1]) {
    addPart(
      root,
      side < 0 ? 'character-ear-left-skin' : 'character-ear-right-skin',
      earGeometry(),
      [headW * 0.14, headH * 0.24, headD * 0.11],
      [side * headW * 0.47, headY, bodyDepth * 0.035],
      palette.skinShadow,
    );
  }

  const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), faceDecalMaterial(kind, variant, accent));
  face.name = 'character-face-texture';
  face.scale.set(headW * 0.82, headH * 0.82, 1);
  face.position.set(0, headY - headH * 0.01, bodyDepth * 0.035 + headD * 0.335);
  face.userData.preserveMaterial = true;
  face.castShadow = false;
  face.renderOrder = 2;
  root.add(face);

  addHair(root, kind, variant, headW, headH, headD, headY, bodyDepth * 0.035, palette);
  addRoleClothing(root, kind, variant, bounds, bodyWidth, bodyDepth, palette, role);
  // Garment construction belongs over aprons, vests and coat fronts. Adding
  // this panel first hid its useful seams and pockets inside those meshes.
  addGarmentDecal(root, kind, variant, accent, bodyWidth, bodyDepth, h);
  addRoleEquipment(root, kind, variant, bounds, bodyWidth, bodyDepth, palette, role, pose);

  root.name = `${kind}-${variant}`;
  root.userData.detailTier = 'production-character';
  root.userData.detailVariant = variant;
  root.userData.characterRole = role;
  root.userData.geometryOnly = false;
  root.userData.productionCharacter = true;
  return root;
}

export function clearProductionCharacterGeometries(): void {
  for (const geometry of productionGeometries.values()) geometry.dispose();
  productionGeometries.clear();
}

function addGarmentDecal(
  root: THREE.Group,
  kind: string,
  variant: number,
  accent: string,
  bodyWidth: number,
  bodyDepth: number,
  h: number,
): void {
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), garmentDecalMaterial(kind, variant, accent));
  decal.name = 'character-garment-texture';
  decal.scale.set(bodyWidth * 0.78, h * 0.265, 1);
  decal.position.set(0, h * 0.625, bodyDepth * 0.625);
  decal.userData.preserveMaterial = true;
  decal.castShadow = false;
  decal.renderOrder = 1;
  root.add(decal);
}

function addHair(
  root: THREE.Group,
  kind: string,
  variant: number,
  headW: number,
  headH: number,
  headD: number,
  headY: number,
  headZ: number,
  palette: CharacterPalette,
): void {
  const value = kind.toLowerCase();
  if (/(hazmat|firefighter|chef|cook|surgeon|nun|monk|priest|rabbi|imam)/.test(value)) return;
  const style = (hashString(`${kind}:hair`) + variant) % 4;
  addPart(
    root,
    'character-hair-cap',
    hairCapGeometry(),
    [headW * 1.04, headH * (style === 1 ? 0.72 : 0.58), headD * 1.03],
    [0, headY + headH * (style === 1 ? 0.18 : 0.23), headZ - headD * 0.02],
    palette.hair,
    [0, style === 3 ? 0.08 : 0, style === 2 ? -0.05 : 0],
  );
  if (style === 1 || style === 3) {
    addPart(
      root,
      'character-hair-back',
      hairBackGeometry(),
      [headW * 0.9, headH * (style === 1 ? 0.75 : 0.5), headD * 0.35],
      [0, headY - headH * 0.18, headZ - headD * 0.39],
      palette.hair,
    );
  }
}

function addRoleClothing(
  root: THREE.Group,
  kind: string,
  variant: number,
  b: Bounds,
  bodyWidth: number,
  bodyDepth: number,
  p: CharacterPalette,
  role: RoleClass,
): void {
  const h = b.h;
  if (role === 'medical' || role === 'science') {
    for (const side of [-1, 1]) {
      addPart(root, 'character-lab-coat-panel', coatPanelGeometry(), [bodyWidth * 0.45, h * 0.34, bodyDepth * 0.56], [side * bodyWidth * 0.23, h * 0.575, bodyDepth * 0.18], p.light, [0, side * -0.08, side * 0.025]);
    }
  } else if (role === 'food' || role === 'service') {
    addPart(root, 'character-apron-fabric', apronGeometry(), [bodyWidth * 0.76, h * 0.34, bodyDepth * 0.12], [0, h * 0.565, bodyDepth * 0.54], role === 'food' ? p.light : p.accent);
  } else if (role === 'security' || role === 'trade') {
    addPart(root, 'character-work-vest-fabric', vestGeometry(), [bodyWidth * 1.04, h * 0.25, bodyDepth * 1.1], [0, h * 0.635, 0], p.accent);
  } else if (role === 'religious') {
    addPart(root, 'character-robe-fabric', skirtGeometry(), [bodyWidth * 0.9, h * 0.46, bodyDepth * 0.95], [0, h * 0.34, 0], p.shirtDark);
    addPart(root, 'character-collar-paper', geometryForShape('box'), [bodyWidth * 0.24, h * 0.035, bodyDepth * 0.08], [0, h * 0.75, bodyDepth * 0.52], p.light);
  } else if (role === 'sport') {
    addPart(root, 'character-sports-jersey-fabric', vestGeometry(), [bodyWidth * 1.02, h * 0.21, bodyDepth * 1.06], [0, h * 0.65, 0], p.accent);
  } else {
    for (const side of [-1, 1]) {
      addPart(root, 'character-jacket-lapel-fabric', lapelGeometry(), [bodyWidth * 0.22, h * 0.19, bodyDepth * 0.09], [side * bodyWidth * 0.13, h * 0.675, bodyDepth * 0.54], p.shirtDark, [0, 0, side * -0.28]);
    }
  }

  addHeadwear(root, kind, variant, b, bodyWidth, bodyDepth, p, role);
}

function addHeadwear(
  root: THREE.Group,
  kind: string,
  variant: number,
  b: Bounds,
  bodyWidth: number,
  bodyDepth: number,
  p: CharacterPalette,
  role: RoleClass,
): void {
  const h = b.h;
  const value = kind.toLowerCase();
  if (/(chef|cook|baker|butcher)/.test(value)) {
    addPart(root, 'character-chef-hat-band-fabric', geometryForShape('cylinder'), [bodyWidth * 0.48, h * 0.058, bodyWidth * 0.48], [0, h * 0.992, bodyDepth * 0.02], p.light);
    addPart(root, 'character-chef-hat-crown-fabric', chefHatGeometry(), [bodyWidth * 0.53, h * 0.115, bodyWidth * 0.51], [0, h * 1.035, bodyDepth * 0.01], p.light);
    return;
  }
  if (/(hazmat|firefighter|security|guard|worker|operator|driver|pilot|technician|electrician|plumber|carpenter|roofer)/.test(value)) {
    addPart(root, 'character-protective-helmet-painted-metal', helmetGeometry(), [bodyWidth * 0.62, h * 0.13, bodyWidth * 0.6], [0, h * 1.005, bodyDepth * 0.015], role === 'security' ? p.shirtDark : p.accent);
    addPart(root, 'character-helmet-brim-painted-metal', geometryForShape('box'), [bodyWidth * 0.68, h * 0.025, bodyDepth * 0.75], [0, h * 0.977, bodyDepth * 0.11], role === 'security' ? p.shirtDark : p.accent);
    return;
  }
  if (/(nurse|surgeon|medical|pharmac)/.test(value) && variant % 2 === 0) {
    addPart(root, 'character-medical-cap-fabric', capGeometry(), [bodyWidth * 0.54, h * 0.07, bodyWidth * 0.52], [0, h * 0.99, bodyDepth * 0.01], p.light);
    return;
  }
  if (role === 'service' || role === 'security') {
    addPart(root, 'character-uniform-cap-fabric', capGeometry(), [bodyWidth * 0.58, h * 0.075, bodyWidth * 0.56], [0, h * 0.995, bodyDepth * 0.015], p.shirtDark);
    addPart(root, 'character-cap-visor-fabric', wedgeGeometry(), [bodyWidth * 0.34, h * 0.025, bodyDepth * 0.45], [0, h * 0.975, bodyDepth * 0.29], p.shirtDark);
  }
}

function addRoleEquipment(
  root: THREE.Group,
  kind: string,
  variant: number,
  b: Bounds,
  bodyWidth: number,
  bodyDepth: number,
  p: CharacterPalette,
  role: RoleClass,
  pose: ReturnType<typeof armPoseFor>,
): void {
  const value = kind.toLowerCase();
  const h = b.h;
  if (role === 'medical' || role === 'science') {
    const side = variant % 2 ? -1 : 1;
    addPart(root, 'character-clipboard-paper', geometryForShape('box'), [bodyWidth * 0.36, h * 0.22, bodyDepth * 0.08], [side * bodyWidth * 0.46, h * 0.53, bodyDepth * 0.38], '#d8d0b8', [0.08, side * 0.12, side * -0.08]);
    addPart(root, 'character-clipboard-clip-bare-metal', geometryForShape('box'), [bodyWidth * 0.13, h * 0.025, bodyDepth * 0.09], [side * bodyWidth * 0.46, h * 0.625, bodyDepth * 0.42], p.metal);
    if (/(doctor|nurse|surgeon|therap|medical|pharmac)/.test(value)) {
      addPart(root, 'character-stethoscope-rubber', geometryForShape('torus'), [bodyWidth * 0.24, bodyWidth * 0.28, bodyWidth * 0.08], [0, h * 0.69, bodyDepth * 0.53], '#283238', [Math.PI / 2, 0, 0]);
    }
    return;
  }
  if (role === 'food' || /(server|waiter|bartender|barista)/.test(value)) {
    const trayY = h * Math.max(pose.right.wristY, pose.left.wristY) + h * 0.025;
    addPart(root, 'character-serving-tray-bare-metal', geometryForShape('cylinder'), [bodyWidth * 0.62, h * 0.025, bodyWidth * 0.62], [0, trayY, bodyDepth * 0.72], p.metal);
    if (/(barista|bartender|server|waiter)/.test(value)) {
      addPart(root, 'character-serving-cup-ceramic', cupGeometry(), [bodyWidth * 0.14, h * 0.1, bodyWidth * 0.14], [bodyWidth * 0.12, trayY + h * 0.06, bodyDepth * 0.72], p.light);
    }
    return;
  }
  if (role === 'trade') {
    addPart(root, 'character-tool-belt-leather', geometryForShape('box'), [bodyWidth * 1.02, h * 0.07, bodyDepth * 1.08], [0, h * 0.45, 0], p.leather);
    addPart(root, 'character-tool-pouch-leather', wedgeGeometry(), [bodyWidth * 0.27, h * 0.18, bodyDepth * 0.4], [bodyWidth * 0.4, h * 0.39, bodyDepth * 0.27], p.leather);
    addPart(root, 'character-wrench-bare-metal', wrenchGeometry(), [bodyWidth * 0.15, h * 0.32, bodyWidth * 0.08], [bodyWidth * 0.43, h * 0.42, bodyDepth * 0.34], p.metal, [0, 0, -0.16]);
    return;
  }
  if (role === 'security') {
    addPart(root, 'character-radio-painted-metal', geometryForShape('box'), [bodyWidth * 0.18, h * 0.13, bodyDepth * 0.13], [bodyWidth * 0.36, h * 0.69, bodyDepth * 0.55], '#252b31');
    addPart(root, 'character-radio-antenna-rubber', geometryForShape('cylinder'), [bodyWidth * 0.035, h * 0.14, bodyWidth * 0.035], [bodyWidth * 0.4, h * 0.79, bodyDepth * 0.56], '#1b2024', [0, 0, -0.16]);
    return;
  }
  if (role === 'creative') {
    if (/(photograph|journalist|camera)/.test(value)) {
      addPart(root, 'character-camera-painted-metal', cameraGeometry(), [bodyWidth * 0.42, h * 0.2, bodyDepth * 0.45], [0, h * 0.58, bodyDepth * 0.62], '#252a30');
      addPart(root, 'character-camera-lens-glass', geometryForShape('cylinder'), [bodyWidth * 0.18, bodyWidth * 0.18, bodyDepth * 0.2], [0, h * 0.58, bodyDepth * 0.78], '#58778b', [Math.PI / 2, 0, 0]);
    } else if (/(musician|sound|music)/.test(value)) {
      addPart(root, 'character-instrument-wood', instrumentGeometry(), [bodyWidth * 0.55, h * 0.46, bodyDepth * 0.42], [bodyWidth * 0.3, h * 0.48, bodyDepth * 0.42], '#7a4d2f', [0, 0, -0.18]);
    } else {
      addPart(root, 'character-portfolio-paper', geometryForShape('box'), [bodyWidth * 0.48, h * 0.29, bodyDepth * 0.08], [bodyWidth * 0.42, h * 0.43, bodyDepth * 0.24], p.accent, [0, 0, -0.08]);
    }
    return;
  }
  if (role === 'professional' && variant % 3 === 1) {
    addPart(root, 'character-briefcase-leather', briefcaseGeometry(), [bodyWidth * 0.56, h * 0.22, bodyDepth * 0.34], [bodyWidth * 0.48, h * 0.27, bodyDepth * 0.08], p.leather);
  }
}

function armPoseFor(kind: string, variant: number) {
  const value = kind.toLowerCase();
  const food = /(chef|cook|baker|butcher|cashier|vendor|sommelier|food|server|waiter|barista|bartender)/.test(value);
  const carrying = /(chef|cook|baker|butcher|cashier|vendor|sommelier|food|server|waiter|barista|bartender|medical|doctor|nurse|scient|research|clerk|librarian|teacher|photograph|artist|musician)/.test(value);
  const left = food
    ? { elbowX: 0.54, elbowY: 0.6, elbowZ: 0.18, wristX: 0.27, wristY: 0.58, wristZ: 0.72 }
    : carrying
    ? { elbowX: 0.48, elbowY: 0.59, elbowZ: 0.2, wristX: 0.42, wristY: 0.58, wristZ: 0.62 }
    : { elbowX: 0.58, elbowY: 0.55, elbowZ: 0.03, wristX: 0.55, wristY: 0.39, wristZ: 0.08 };
  const right = food
    ? { elbowX: 0.54, elbowY: 0.6, elbowZ: 0.18, wristX: 0.27, wristY: 0.58, wristZ: 0.72 }
    : carrying
    ? { elbowX: 0.5, elbowY: 0.62, elbowZ: 0.28, wristX: 0.42, wristY: 0.66, wristZ: 0.68 }
    : { elbowX: 0.58, elbowY: 0.55, elbowZ: -0.02, wristX: 0.54, wristY: 0.39 + (variant % 2) * 0.015, wristZ: 0.06 };
  return { left, right };
}

function roleFor(kind: string): RoleClass {
  const value = kind.toLowerCase();
  if (/(chef|cook|baker|butcher|barista|server|waiter|bartender|cashier|vendor|sommelier|food|ice_cream)/.test(value)) return 'food';
  if (/(doctor|nurse|surgeon|therap|pharmac|radiolog|patient|medical|clinic|veterinar|dietitian|nutrition|anesthes|pediatric|optometr|audiolog|gynecolog)/.test(value)) return 'medical';
  if (/(lab|scient|research|chemist|biolog|botanist|zoolog|geolog|archaeolog|meteorolog|astronom|seismolog|ecolog|paleontolog)/.test(value)) return 'science';
  if (/(guard|security|police|firefighter|bailiff|crossing|conductor|pilot|driver|operator)/.test(value)) return 'security';
  if (/(janitor|maintenance|electrician|plumber|carpenter|mechanic|roofer|landscaper|groundskeeper|technician|worker|engineer|baggage_handler|arborist)/.test(value)) return 'trade';
  if (/(clerk|reception|attendant|porter|concierge|housekeeper|librarian|teacher|guide|shopkeeper|bookseller|archivist|curator|agent)/.test(value)) return 'service';
  if (/(chaplain|priest|rabbi|imam|monk|nun|choir)/.test(value)) return 'religious';
  if (/(musician|artist|photograph|actor|dancer|choreograph|designer|illustrator|animator|director|producer|journalist|publisher|editor|sound|lighting|stage)/.test(value)) return 'creative';
  if (/(trainer|coach|swim|lifeguard|athlete|sport)/.test(value)) return 'sport';
  return 'professional';
}

function paletteFor(
  kind: string,
  variant: number,
  accent: string,
  body: string,
  role: RoleClass,
): CharacterPalette {
  const skinTones = ['#edc4a8', '#d9a27d', '#bd7f59', '#8f5940', '#6c4132', '#e2b596', '#a96e4f', '#754838'];
  const skin = skinTones[(variant + hashString(`${kind}:skin`)) % skinTones.length]!;
  const skinShadow = shade(skin, -0.13);
  const hairColors = ['#241c19', '#4b3023', '#765035', '#b58b5d', '#d5c5a2', '#342d2d', '#6a251f', '#c0b9ad'];
  const hair = hairColors[hashString(`${kind}:hair`) % hairColors.length]!;
  const roleBase: Partial<Record<RoleClass, string>> = {
    medical: '#d7ddd8', science: '#c8d3d2', food: '#ddd4c2', security: '#334655',
    trade: '#516270', service: '#574c58', religious: '#29282d', sport: '#486d78',
  };
  const shirt = shift(roleBase[role] ?? body, (variant - 3.5) * 0.025, (hashString(kind) % 7 - 3) * 0.008);
  const shirtDark = shade(shirt, -0.24);
  const trousers = role === 'medical' ? shade(accent, -0.18) : shade(accent, -0.34);
  return {
    skin,
    skinShadow,
    hair,
    shirt,
    shirtDark,
    trousers,
    leather: variant % 2 ? '#3b2923' : '#27282b',
    metal: '#9aa1a4',
    accent: shift(accent, variant * 0.022, 0.04),
    light: role === 'security' ? '#d6d0bc' : '#ebe5d7',
  };
}

function addPart(
  parent: THREE.Object3D,
  name: string,
  geometry: THREE.BufferGeometry,
  scale: [number, number, number],
  position: [number, number, number],
  color: string,
  rotation: [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02 });
  const mesh = new THREE.Mesh(geometry, material);
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

function addLimb(
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
  const length = direction.length();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0 });
  const mesh = new THREE.Mesh(limbGeometry(), material);
  mesh.name = name;
  mesh.scale.set(width, length, depth);
  mesh.position.copy(midpoint);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.userData.baseRotation = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cachedGeometry(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  const cacheKey = `${getModelQuality()}:${key}`;
  const hit = productionGeometries.get(cacheKey);
  if (hit) return hit;
  const geometry = build();
  geometry.userData.cacheOwned = true;
  productionGeometries.set(cacheKey, geometry);
  return geometry;
}

function torsoGeometry(): THREE.BufferGeometry {
  return cachedGeometry('torso', () => profileYGeometry([
    [-0.5, 0.72, 0.8],
    [0.1, 0.84, 0.9],
    [0.34, 1, 1],
    [0.5, 0.48, 0.62],
  ], 10));
}

function pelvisGeometry(): THREE.BufferGeometry {
  return cachedGeometry('pelvis', () => new THREE.CylinderGeometry(0.38, 0.32, 1, 8, 1, false));
}

function limbGeometry(): THREE.BufferGeometry {
  return cachedGeometry('limb', () => new THREE.CylinderGeometry(0.39, 0.5, 1, 8, 1, false));
}

function neckGeometry(): THREE.BufferGeometry {
  return cachedGeometry('neck', () => new THREE.CylinderGeometry(0.43, 0.5, 1, 10, 1, false));
}

function headGeometry(): THREE.BufferGeometry {
  return cachedGeometry('head', () => {
    const density = getShapeDensity().sphere;
    const geometry = new THREE.SphereGeometry(0.5, Math.max(10, density[0]), Math.max(8, density[1]));
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let index = 0; index < positions.count; index += 1) {
      let x = positions.getX(index);
      const y = positions.getY(index);
      let z = positions.getZ(index);
      if (y < 0.02) x *= 0.72 + (y + 0.5) * 0.48;
      if (y < -0.36) z *= 0.82;
      if (z > 0.24) z = 0.24 + (z - 0.24) * 0.22;
      if (z < -0.25) z *= 1.06;
      positions.setXYZ(index, x, y * 1.08, z);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  });
}

function hairCapGeometry(): THREE.BufferGeometry {
  return cachedGeometry('hair-cap', () => {
    const density = getShapeDensity().sphere;
    return new THREE.SphereGeometry(0.5, Math.max(10, density[0]), Math.max(6, density[1]), 0, Math.PI * 2, 0, Math.PI * 0.54);
  });
}

function hairBackGeometry(): THREE.BufferGeometry {
  return cachedGeometry('hair-back', () => new THREE.CylinderGeometry(0.42, 0.5, 1, 8, 1, false));
}

function handGeometry(): THREE.BufferGeometry {
  return cachedGeometry('hand', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let index = 0; index < position.count; index += 1) {
      const y = position.getY(index);
      const taper = y < 0 ? 0.82 : 1;
      position.setX(index, position.getX(index) * taper);
      position.setZ(index, position.getZ(index) * taper);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  });
}

function earGeometry(): THREE.BufferGeometry {
  return cachedGeometry('ear', () => new THREE.SphereGeometry(0.5, 8, 6));
}

function wedgeGeometry(): THREE.BufferGeometry {
  return cachedGeometry('wedge', () => taperedBoxGeometry(0.78, 1, 0.72, 1));
}

function vestGeometry(): THREE.BufferGeometry {
  return cachedGeometry('vest', () => new THREE.CylinderGeometry(0.52, 0.4, 1, 8, 1, true));
}

function skirtGeometry(): THREE.BufferGeometry {
  return cachedGeometry('skirt', () => new THREE.CylinderGeometry(0.35, 0.52, 1, 10, 1, false));
}

function apronGeometry(): THREE.BufferGeometry {
  return cachedGeometry('apron', () => taperedBoxGeometry(0.7, 1, 0.75, 1));
}

function coatPanelGeometry(): THREE.BufferGeometry {
  return cachedGeometry('coat-panel', () => taperedBoxGeometry(0.82, 1, 0.88, 1));
}

function lapelGeometry(): THREE.BufferGeometry {
  return cachedGeometry('lapel', () => new THREE.ConeGeometry(0.5, 1, 3, 1, false));
}

function chefHatGeometry(): THREE.BufferGeometry {
  return cachedGeometry('chef-hat', () => profileYGeometry([
    [-0.5, 0.7, 0.7],
    [-0.28, 1, 1],
    [0.08, 0.94, 0.94],
    [0.4, 0.8, 0.8],
    [0.5, 0.66, 0.66],
  ], 10));
}

function helmetGeometry(): THREE.BufferGeometry {
  return cachedGeometry('helmet', () => {
    const density = getShapeDensity().sphere;
    return new THREE.SphereGeometry(0.5, Math.max(10, density[0]), Math.max(6, density[1]), 0, Math.PI * 2, 0, Math.PI * 0.58);
  });
}

function capGeometry(): THREE.BufferGeometry {
  return cachedGeometry('cap', () => new THREE.CylinderGeometry(0.48, 0.52, 1, 10, 1, false));
}

function cupGeometry(): THREE.BufferGeometry {
  return cachedGeometry('cup', () => new THREE.CylinderGeometry(0.44, 0.36, 1, 10, 1, false));
}

function wrenchGeometry(): THREE.BufferGeometry {
  return cachedGeometry('wrench', () => new THREE.CylinderGeometry(0.26, 0.36, 1, 6, 1, false));
}

function cameraGeometry(): THREE.BufferGeometry {
  return cachedGeometry('camera', () => taperedBoxGeometry(0.92, 1, 0.82, 1));
}

function instrumentGeometry(): THREE.BufferGeometry {
  return cachedGeometry('instrument', () => new THREE.CylinderGeometry(0.38, 0.5, 1, 10, 2, false));
}

function briefcaseGeometry(): THREE.BufferGeometry {
  return cachedGeometry('briefcase', () => taperedBoxGeometry(0.92, 1, 0.88, 1));
}

function profileYGeometry(rings: Array<[number, number, number]>, segments: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let ringIndex = 0; ringIndex < rings.length; ringIndex += 1) {
    const [y, width, depth] = rings[ringIndex]!;
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = segment / segments * Math.PI * 2;
      positions.push(Math.cos(angle) * width * 0.5, y, Math.sin(angle) * depth * 0.5);
      uvs.push(segment / segments, ringIndex / Math.max(1, rings.length - 1));
    }
  }
  const bottomCenter = positions.length / 3;
  positions.push(0, rings[0]![0], 0);
  uvs.push(0.5, 0.5);
  const topCenter = positions.length / 3;
  positions.push(0, rings[rings.length - 1]![0], 0);
  uvs.push(0.5, 0.5);

  const indices: number[] = [];
  for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex += 1) {
    const nextRing = ringIndex + 1;
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      const a = ringIndex * segments + segment;
      const b = ringIndex * segments + next;
      const c = nextRing * segments + next;
      const d = nextRing * segments + segment;
      indices.push(a, b, c, a, c, d);
    }
  }
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments;
    indices.push(bottomCenter, segment, next);
    const topStart = (rings.length - 1) * segments;
    indices.push(topCenter, topStart + next, topStart + segment);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function taperedBoxGeometry(topX: number, bottomX: number, topZ: number, bottomZ: number): THREE.BufferGeometry {
  const vertices = new Float32Array([
    -bottomX / 2, -0.5, bottomZ / 2, bottomX / 2, -0.5, bottomZ / 2, bottomX / 2, -0.5, -bottomZ / 2, -bottomX / 2, -0.5, -bottomZ / 2,
    -topX / 2, 0.5, topZ / 2, topX / 2, 0.5, topZ / 2, topX / 2, 0.5, -topZ / 2, -topX / 2, 0.5, -topZ / 2,
  ]);
  const indices = [
    0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
    4, 5, 6, 4, 6, 7, 3, 2, 1, 3, 1, 0,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Box-like UVs are sufficient for the small repeatable surface maps.
  const uv = new Float32Array([
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
  ]);
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

function shade(color: string, amount: number): string {
  return new THREE.Color(color).offsetHSL(0, 0, amount).getStyle();
}

function shift(color: string, hue: number, saturation: number): string {
  return new THREE.Color(color).offsetHSL(hue, saturation, 0).getStyle();
}
