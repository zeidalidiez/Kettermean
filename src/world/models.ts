import * as THREE from 'three';

export type PropKind =
  | 'chair'
  | 'desk'
  | 'vending'
  | 'cabinet'
  | 'crib'
  | 'plant'
  | 'payphone'
  | 'cooler'
  | 'cart'
  | 'door_fake'
  | 'mattress'
  | 'sign'
  | 'bottle_giant'
  | 'mirror'
  | 'bench'
  | 'pillar'
  | 'lamp'
  | 'table'
  | 'shelf'
  | 'tv'
  | 'figure_baby'
  | 'figure_clerk'
  | 'figure_deer'
  | 'figure_mannequin'
  | 'figure_shadow'
  | 'figure_balloon'
  | 'figure_guide'
  | 'figure_raincoat'
  | 'armchair'
  | 'sofa'
  | 'stool'
  | 'school_desk'
  | 'locker'
  | 'bookcase'
  | 'display_case'
  | 'hospital_bed'
  | 'gurney'
  | 'arcade'
  | 'checkout'
  | 'kiosk'
  | 'terminal'
  | 'trash'
  | 'barrier'
  | 'planter'
  | 'picnic'
  | 'bleacher'
  | 'tree'
  | 'fountain'
  | 'figure_nurse'
  | 'figure_janitor'
  | 'figure_commuter'
  | 'figure_hazmat'
  | 'figure_mascot'
  | 'figure_bellhop'
  | 'figure_guard'
  | 'figure_worker'
  | 'figure_patient'
  | 'figure_conductor';

interface PartSpec {
  w: number;
  h: number;
  d: number;
  x: number;
  y: number;
  z: number;
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
  shape?: 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus';
  rx?: number;
  ry?: number;
  rz?: number;
  name?: string;
}

const matCache = new Map<string, THREE.MeshStandardMaterial>();
const modelCache = new Map<string, THREE.Group>();

export function clearModelMaterialCache(): void {
  for (const model of modelCache.values()) {
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
  }
  modelCache.clear();
  for (const material of matCache.values()) material.dispose();
  matCache.clear();
}

function mat(
  color: string,
  roughness = 0.75,
  metalness = 0.08,
  emissive?: string,
  emissiveIntensity = 0.4,
): THREE.MeshStandardMaterial {
  const key = `${color}|${roughness}|${metalness}|${emissive ?? ''}|${emissiveIntensity}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      emissive: emissive ? new THREE.Color(emissive) : 0x000000,
      emissiveIntensity: emissive ? emissiveIntensity : 0,
    });
    matCache.set(key, m);
  }
  return m;
}

function part(p: PartSpec): THREE.Mesh {
  let geom: THREE.BufferGeometry;
  switch (p.shape) {
    case 'sphere':
      geom = new THREE.SphereGeometry(0.5, 16, 12);
      break;
    case 'cylinder':
      geom = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
      break;
    case 'cone':
      geom = new THREE.ConeGeometry(0.5, 1, 14);
      break;
    case 'torus':
      geom = new THREE.TorusGeometry(0.5, 0.14, 8, 18);
      break;
    default:
      geom = new THREE.BoxGeometry(1, 1, 1);
  }
  const mesh = new THREE.Mesh(
    geom,
    mat(p.color, p.roughness ?? 0.75, p.metalness ?? 0.08, p.emissive, p.emissiveIntensity),
  );
  mesh.scale.set(p.w, p.h, p.d);
  mesh.position.set(p.x, p.y, p.z);
  mesh.rotation.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0);
  if (p.name) mesh.name = p.name;
  mesh.userData.baseRotation = {
    x: mesh.rotation.x,
    y: mesh.rotation.y,
    z: mesh.rotation.z,
  };
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function group(parts: PartSpec[], name: string): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  for (const p of parts) g.add(part(p));
  return g;
}

function assetVariant(assetId?: string): number {
  const match = /_(\d{2})$/.exec(assetId ?? '');
  return match ? Math.max(0, Number(match[1]) - 1) % 8 : 0;
}

function variantColor(color: string, variant: number, offset = 0): string {
  return new THREE.Color(color)
    .offsetHSL(((variant * 0.071 + offset) % 1) - 0.14, (variant % 3 - 1) * 0.035, (variant - 3.5) * 0.018)
    .getStyle();
}

function buildExpandedModel(
  kind: PropKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group | null {
  switch (kind) {
    case 'armchair':
      return buildArmchair(variant, accent, body);
    case 'sofa':
      return buildSofa(variant, accent, body);
    case 'stool':
      return buildStool(variant, accent);
    case 'school_desk':
      return buildSchoolDesk(variant, accent, body);
    case 'locker':
      return buildLocker(variant, accent);
    case 'bookcase':
      return buildBookcase(variant, accent, body);
    case 'display_case':
      return buildDisplayCase(variant, accent);
    case 'hospital_bed':
      return buildHospitalBed(variant, accent);
    case 'gurney':
      return buildGurney(variant, accent);
    case 'arcade':
      return buildArcade(variant, accent);
    case 'checkout':
      return buildCheckout(variant, accent, body);
    case 'kiosk':
      return buildKiosk(variant, accent);
    case 'terminal':
      return buildTerminal(variant, accent);
    case 'trash':
      return buildTrash(variant, accent);
    case 'barrier':
      return buildBarrier(variant, accent);
    case 'planter':
      return buildPlanter(variant, accent);
    case 'picnic':
      return buildPicnicTable(variant, accent, body);
    case 'bleacher':
      return buildBleacher(variant, accent);
    case 'tree':
      return buildTree(variant, accent);
    case 'fountain':
      return buildFountain(variant, accent);
    case 'figure_nurse':
    case 'figure_janitor':
    case 'figure_commuter':
    case 'figure_hazmat':
    case 'figure_mascot':
    case 'figure_bellhop':
    case 'figure_guard':
    case 'figure_worker':
    case 'figure_patient':
    case 'figure_conductor':
      return buildHumanoid(kind, variant, accent);
    default:
      return null;
  }
}

function buildArmchair(variant: number, accent: string, body: string): THREE.Group {
  const fabric = variantColor(accent, variant);
  const wood = variantColor(body, variant, 0.08);
  const wide = 0.72 + (variant % 3) * 0.07;
  return group([
    { w: wide, h: 0.18, d: 0.72, x: 0, y: 0.48, z: 0.05, color: fabric },
    { w: wide, h: 0.76 + variant * 0.025, d: 0.16, x: 0, y: 0.88, z: -0.3, color: fabric, rz: (variant - 3.5) * 0.008 },
    { w: 0.15, h: 0.55, d: 0.76, x: -wide * 0.56, y: 0.58, z: 0, color: fabric },
    { w: 0.15, h: 0.55, d: 0.76, x: wide * 0.56, y: 0.58, z: 0, color: fabric },
    { w: wide * 0.86, h: 0.1, d: 0.58, x: 0, y: 0.6, z: 0.07, color: variantColor(fabric, variant, 0.04) },
    { w: 0.09, h: 0.42, d: 0.09, x: -wide * 0.42, y: 0.21, z: -0.25, color: wood, shape: variant % 2 ? 'cylinder' : 'box' },
    { w: 0.09, h: 0.42, d: 0.09, x: wide * 0.42, y: 0.21, z: -0.25, color: wood, shape: variant % 2 ? 'cylinder' : 'box' },
    { w: 0.09, h: 0.42, d: 0.09, x: wide * 0.42, y: 0.21, z: 0.25, color: wood, shape: variant % 2 ? 'cylinder' : 'box' },
    { w: 0.08, h: 0.08, d: 0.05, x: 0, y: 1.0, z: -0.205, color: wood, shape: 'sphere' },
  ], `armchair-${variant}`);
}

function buildSofa(variant: number, accent: string, body: string): THREE.Group {
  const fabric = variantColor(accent, variant, 0.02);
  const leg = variantColor(body, variant, 0.1);
  const parts: PartSpec[] = [
    { w: 2.05, h: 0.24, d: 0.78, x: 0, y: 0.43, z: 0, color: fabric },
    { w: 2.0, h: 0.66 + variant * 0.025, d: 0.18, x: 0, y: 0.78, z: -0.33, color: fabric },
    { w: 0.22, h: 0.57, d: 0.82, x: -1.02, y: 0.56, z: 0, color: fabric },
    { w: 0.22, h: 0.57, d: 0.82, x: 1.02, y: 0.56, z: 0, color: fabric },
  ];
  for (const x of [-0.66, 0, 0.66]) {
    parts.push({ w: 0.58, h: 0.1, d: 0.62, x, y: 0.6, z: 0.05, color: variantColor(fabric, variant, x * 0.04) });
  }
  for (const x of [-0.82, 0.82]) {
    parts.push({ w: 0.1, h: 0.34, d: 0.1, x, y: 0.17, z: variant % 2 ? 0.22 : -0.22, color: leg, shape: variant % 2 ? 'cylinder' : 'box' });
  }
  return group(parts, `sofa-${variant}`);
}

function buildStool(variant: number, accent: string): THREE.Group {
  const metal = variantColor('#78828a', variant);
  const seat = variantColor(accent, variant);
  const round = variant % 2 === 0;
  return group([
    { w: 0.5 + (variant % 3) * 0.04, h: 0.13, d: 0.5 + (variant % 3) * 0.04, x: 0, y: 0.7 + variant * 0.012, z: 0, color: seat, shape: round ? 'cylinder' : 'box' },
    { w: 0.08, h: 0.68, d: 0.08, x: -0.18, y: 0.34, z: -0.18, color: metal, metalness: 0.7, shape: 'cylinder', rz: 0.05 },
    { w: 0.08, h: 0.68, d: 0.08, x: 0.18, y: 0.34, z: -0.18, color: metal, metalness: 0.7, shape: 'cylinder', rz: -0.05 },
    { w: 0.08, h: 0.68, d: 0.08, x: -0.18, y: 0.34, z: 0.18, color: metal, metalness: 0.7, shape: 'cylinder', rz: 0.05 },
    { w: 0.08, h: 0.68, d: 0.08, x: 0.18, y: 0.34, z: 0.18, color: metal, metalness: 0.7, shape: 'cylinder', rz: -0.05 },
    { w: 0.42, h: 0.05, d: 0.42, x: 0, y: 0.24, z: 0, color: metal, metalness: 0.7, shape: 'torus', rx: Math.PI / 2 },
  ], `stool-${variant}`);
}

function buildSchoolDesk(variant: number, accent: string, body: string): THREE.Group {
  const wood = variantColor(body, variant, 0.05);
  const metal = variantColor('#687078', variant);
  return group([
    { w: 0.95, h: 0.1, d: 0.58, x: 0, y: 0.78, z: -0.08, color: wood, ry: (variant - 3.5) * 0.012 },
    { w: 0.08, h: 0.76, d: 0.08, x: -0.38, y: 0.38, z: -0.2, color: metal, metalness: 0.65, shape: 'cylinder' },
    { w: 0.08, h: 0.76, d: 0.08, x: 0.38, y: 0.38, z: -0.2, color: metal, metalness: 0.65, shape: 'cylinder' },
    { w: 0.62, h: 0.12, d: 0.52, x: 0, y: 0.47, z: 0.18, color: variantColor(accent, variant) },
    { w: 0.62, h: 0.58, d: 0.1, x: 0, y: 0.76, z: 0.39, color: variantColor(accent, variant) },
    { w: 0.06, h: 0.48, d: 0.06, x: -0.24, y: 0.23, z: 0.22, color: metal, shape: 'cylinder' },
    { w: 0.06, h: 0.48, d: 0.06, x: 0.24, y: 0.23, z: 0.22, color: metal, shape: 'cylinder' },
    { w: 0.34, h: 0.03, d: 0.22, x: variant % 2 ? 0.15 : -0.15, y: 0.845, z: -0.08, color: '#e5dfc8' },
  ], `school-desk-${variant}`);
}

function buildLocker(variant: number, accent: string): THREE.Group {
  const shell = variantColor(accent, variant);
  const dark = variantColor('#343a40', variant);
  const parts: PartSpec[] = [
    { w: 0.82, h: 1.95, d: 0.58, x: 0, y: 0.975, z: 0, color: shell, metalness: 0.45 },
    { w: 0.03, h: 1.84, d: 0.03, x: 0, y: 1.0, z: 0.305, color: dark },
  ];
  for (const x of [-0.23, 0.23]) {
    for (let row = 0; row < 3; row += 1) {
      parts.push({ w: 0.18, h: 0.025, d: 0.035, x, y: 1.48 + row * 0.1, z: 0.31, color: dark });
    }
    parts.push({ w: 0.055, h: 0.16, d: 0.05, x, y: 0.92 + (variant % 3) * 0.12, z: 0.33, color: '#d9dde0', metalness: 0.8 });
  }
  if (variant % 2) parts.push({ w: 0.34, h: 0.16, d: 0.03, x: -0.18, y: 1.78, z: 0.33, color: '#eee7cc' });
  return group(parts, `locker-${variant}`);
}

function buildBookcase(variant: number, accent: string, body: string): THREE.Group {
  const wood = variantColor(body, variant, 0.08);
  const parts: PartSpec[] = [
    { w: 0.12, h: 1.95, d: 0.46, x: -0.66, y: 0.98, z: 0, color: wood },
    { w: 0.12, h: 1.95, d: 0.46, x: 0.66, y: 0.98, z: 0, color: wood },
    { w: 1.42, h: 0.12, d: 0.46, x: 0, y: 0.07, z: 0, color: wood },
    { w: 1.42, h: 0.12, d: 0.46, x: 0, y: 1.93, z: 0, color: wood },
  ];
  for (let shelf = 1; shelf < 4; shelf += 1) {
    const y = shelf * 0.47;
    parts.push({ w: 1.3, h: 0.07, d: 0.44, x: 0, y, z: 0, color: wood });
    for (let book = 0; book < 5; book += 1) {
      const height = 0.22 + ((book + shelf + variant) % 3) * 0.06;
      parts.push({ w: 0.11 + ((book + variant) % 2) * 0.035, h: height, d: 0.28, x: -0.48 + book * 0.24, y: y + height * 0.5 + 0.04, z: 0.05, color: variantColor(accent, variant, book * 0.13), rz: (book - 2) * 0.015 });
    }
  }
  return group(parts, `bookcase-${variant}`);
}

function buildDisplayCase(variant: number, accent: string): THREE.Group {
  const frame = variantColor('#66727c', variant);
  const glow = variantColor(accent, variant);
  return group([
    { w: 1.38, h: 0.34, d: 0.84, x: 0, y: 0.17, z: 0, color: frame, metalness: 0.5 },
    { w: 1.32, h: 0.08, d: 0.8, x: 0, y: 1.48, z: 0, color: frame, metalness: 0.5 },
    { w: 0.06, h: 1.15, d: 0.06, x: -0.62, y: 0.9, z: -0.36, color: frame, metalness: 0.7 },
    { w: 0.06, h: 1.15, d: 0.06, x: 0.62, y: 0.9, z: -0.36, color: frame, metalness: 0.7 },
    { w: 0.06, h: 1.15, d: 0.06, x: -0.62, y: 0.9, z: 0.36, color: frame, metalness: 0.7 },
    { w: 0.06, h: 1.15, d: 0.06, x: 0.62, y: 0.9, z: 0.36, color: frame, metalness: 0.7 },
    { w: 0.7, h: 0.18 + variant * 0.025, d: 0.42, x: 0, y: 0.48, z: 0, color: glow, emissive: glow, emissiveIntensity: 0.18, shape: variant % 3 === 0 ? 'sphere' : variant % 3 === 1 ? 'cone' : 'box' },
    { w: 0.42, h: 0.06, d: 0.28, x: 0, y: 0.37, z: 0, color: '#282b30' },
  ], `display-case-${variant}`);
}

function buildHospitalBed(variant: number, accent: string): THREE.Group {
  const metal = variantColor('#9aa4aa', variant);
  const linen = variantColor('#dbe7df', variant, 0.04);
  const parts: PartSpec[] = [
    { w: 2.0, h: 0.12, d: 0.92, x: 0, y: 0.62, z: 0, color: metal, metalness: 0.65 },
    { w: 1.85, h: 0.2, d: 0.78, x: 0, y: 0.76, z: 0, color: linen, rx: variant % 2 ? -0.04 : 0 },
    { w: 0.65, h: 0.13, d: 0.66, x: -0.57, y: 0.9, z: 0, color: '#f5f2e8' },
    { w: 0.1, h: 0.95, d: 0.9, x: -0.98, y: 0.69, z: 0, color: metal, metalness: 0.65 },
    { w: 0.1, h: 0.72, d: 0.9, x: 0.98, y: 0.55, z: 0, color: metal, metalness: 0.65 },
    { w: 1.2, h: 0.05, d: 0.05, x: 0.1, y: 1.12, z: -0.47, color: metal, metalness: 0.7 },
    { w: 1.2, h: 0.05, d: 0.05, x: 0.1, y: 1.12, z: 0.47, color: metal, metalness: 0.7 },
    { w: 0.18, h: 0.18, d: 0.18, x: -0.78, y: 0.14, z: -0.34, color: '#24282b', shape: 'torus', ry: Math.PI / 2 },
    { w: 0.18, h: 0.18, d: 0.18, x: -0.78, y: 0.14, z: 0.34, color: '#24282b', shape: 'torus', ry: Math.PI / 2 },
    { w: 0.18, h: 0.18, d: 0.18, x: 0.78, y: 0.14, z: -0.34, color: '#24282b', shape: 'torus', ry: Math.PI / 2 },
    { w: 0.18, h: 0.18, d: 0.18, x: 0.78, y: 0.14, z: 0.34, color: '#24282b', shape: 'torus', ry: Math.PI / 2 },
    { w: 0.26, h: 0.12, d: 0.08, x: 0.58, y: 1.1, z: -0.49, color: variantColor(accent, variant), emissive: variantColor(accent, variant), emissiveIntensity: 0.3 },
  ];
  return group(parts, `hospital-bed-${variant}`);
}

function buildGurney(variant: number, accent: string): THREE.Group {
  const metal = variantColor('#818b91', variant);
  const pad = variantColor(accent, variant);
  const parts: PartSpec[] = [
    { w: 1.95, h: 0.12, d: 0.72, x: 0, y: 0.72, z: 0, color: metal, metalness: 0.7 },
    { w: 1.82, h: 0.14, d: 0.64, x: 0, y: 0.84, z: 0, color: pad },
    { w: 0.08, h: 0.62, d: 0.08, x: -0.72, y: 0.38, z: -0.25, color: metal, shape: 'cylinder' },
    { w: 0.08, h: 0.62, d: 0.08, x: 0.72, y: 0.38, z: -0.25, color: metal, shape: 'cylinder' },
    { w: 0.08, h: 0.62, d: 0.08, x: -0.72, y: 0.38, z: 0.25, color: metal, shape: 'cylinder' },
    { w: 0.08, h: 0.62, d: 0.08, x: 0.72, y: 0.38, z: 0.25, color: metal, shape: 'cylinder' },
  ];
  for (const x of [-0.72, 0.72]) for (const z of [-0.25, 0.25]) parts.push({ w: 0.16, h: 0.16, d: 0.16, x, y: 0.08, z, color: '#202428', shape: 'torus', ry: Math.PI / 2 });
  if (variant % 2) parts.push({ w: 0.58, h: 0.12, d: 0.52, x: -0.6, y: 0.98, z: 0, color: '#e8e4dc' });
  return group(parts, `gurney-${variant}`);
}

function buildArcade(variant: number, accent: string): THREE.Group {
  const shell = variantColor(accent, variant);
  const screen = variantColor('#68d8ff', variant, 0.08);
  return group([
    { w: 0.84, h: 1.85, d: 0.82, x: 0, y: 0.93, z: 0, color: shell, metalness: 0.2 },
    { w: 0.72, h: 0.62, d: 0.08, x: 0, y: 1.38, z: 0.42, color: screen, emissive: screen, emissiveIntensity: 0.75, rx: -0.08 },
    { w: 0.76, h: 0.18, d: 0.44, x: 0, y: 0.94, z: 0.31, color: variantColor(shell, variant, 0.08), rx: -0.18 },
    { w: 0.08, h: 0.32, d: 0.08, x: -0.18, y: 1.08, z: 0.52, color: '#202328', shape: 'cylinder' },
    { w: 0.11, h: 0.11, d: 0.07, x: 0.17, y: 1.04, z: 0.54, color: '#ff5b57', shape: 'sphere', emissive: '#ff3030', emissiveIntensity: 0.45 },
    { w: 0.11, h: 0.11, d: 0.07, x: 0.34, y: 1.04, z: 0.54, color: '#ffe45c', shape: 'sphere', emissive: '#d0b21e', emissiveIntensity: 0.35 },
    { w: 0.66, h: 0.16, d: 0.08, x: 0, y: 1.78, z: 0.43, color: screen, emissive: screen, emissiveIntensity: 0.5 },
    { w: 0.54, h: 0.1, d: 0.08, x: 0, y: 0.24, z: 0.43, color: '#111820' },
  ], `arcade-${variant}`);
}

function buildCheckout(variant: number, accent: string, body: string): THREE.Group {
  const shell = variantColor(body, variant);
  const belt = variantColor('#2d3338', variant);
  return group([
    { w: 2.1, h: 0.84, d: 0.78, x: 0, y: 0.42, z: 0, color: shell },
    { w: 1.24, h: 0.08, d: 0.62, x: -0.34, y: 0.88, z: 0, color: belt, roughness: 0.45 },
    { w: 0.54, h: 0.13, d: 0.68, x: 0.76, y: 0.91, z: 0, color: variantColor(accent, variant) },
    { w: 0.1, h: 0.64, d: 0.1, x: 0.64, y: 1.25, z: -0.22, color: '#5c646a', metalness: 0.65 },
    { w: 0.44, h: 0.32, d: 0.08, x: 0.64, y: 1.5, z: -0.2, color: '#9ce8ff', emissive: '#48a9d0', emissiveIntensity: 0.55, ry: 0.08 },
    { w: 0.16, h: 0.08, d: 0.28, x: 0.12, y: 0.96, z: 0.12, color: '#d8dacb' },
    { w: 0.12, h: 0.16, d: 0.06, x: -0.78, y: 0.98, z: 0.33, color: '#d8dacb' },
  ], `checkout-${variant}`);
}

function buildKiosk(variant: number, accent: string): THREE.Group {
  const shell = variantColor('#56616a', variant);
  const screen = variantColor(accent, variant);
  return group([
    { w: 0.82, h: 0.2, d: 0.7, x: 0, y: 0.1, z: 0, color: shell, metalness: 0.5 },
    { w: 0.46, h: 1.12, d: 0.38, x: 0, y: 0.75, z: 0, color: shell, metalness: 0.45 },
    { w: 0.78, h: 0.66, d: 0.18, x: 0, y: 1.38, z: 0.02, color: shell, rx: -0.14 },
    { w: 0.6, h: 0.46, d: 0.05, x: 0, y: 1.4, z: 0.13, color: screen, emissive: screen, emissiveIntensity: 0.62, rx: -0.14 },
    { w: 0.26, h: 0.08, d: 0.05, x: 0, y: 1.03, z: 0.22, color: '#171b20' },
    { w: 0.12, h: 0.12, d: 0.08, x: 0.24, y: 1.04, z: 0.22, color: variant % 2 ? '#ff6a62' : '#6dff9b', emissive: variant % 2 ? '#c72d28' : '#2ac866', emissiveIntensity: 0.4 },
  ], `kiosk-${variant}`);
}

function buildTerminal(variant: number, accent: string): THREE.Group {
  const shell = variantColor('#4e5961', variant);
  const glow = variantColor(accent, variant);
  return group([
    { w: 0.86, h: 0.22, d: 0.68, x: 0, y: 0.11, z: 0, color: shell, metalness: 0.55 },
    { w: 0.22, h: 1.15, d: 0.22, x: 0, y: 0.78, z: 0, color: shell, metalness: 0.55 },
    { w: 0.92, h: 0.64, d: 0.14, x: 0, y: 1.36, z: 0, color: shell },
    { w: 0.76, h: 0.48, d: 0.05, x: 0, y: 1.38, z: 0.09, color: glow, emissive: glow, emissiveIntensity: 0.7 },
    { w: 0.58, h: 0.08, d: 0.28, x: 0, y: 0.96, z: 0.2, color: '#252b30', rx: -0.15 },
    { w: 0.42, h: 0.03, d: 0.18, x: 0, y: 1.0, z: 0.24, color: '#b7c1c5', rx: -0.15 },
    { w: 0.16, h: 0.05, d: 0.07, x: 0.27, y: 1.04, z: 0.27, color: '#ffda62', emissive: '#a97811', emissiveIntensity: 0.35 },
  ], `terminal-${variant}`);
}

function buildTrash(variant: number, accent: string): THREE.Group {
  const shell = variantColor(accent, variant);
  return group([
    { w: 0.62, h: 0.78, d: 0.62, x: 0, y: 0.43, z: 0, color: shell, metalness: variant % 2 ? 0.6 : 0.15, shape: variant % 2 ? 'cylinder' : 'box' },
    { w: 0.66, h: 0.13, d: 0.66, x: 0, y: 0.86, z: 0, color: '#30353a', shape: variant % 2 ? 'cylinder' : 'box' },
    { w: 0.36, h: 0.08, d: 0.24, x: 0, y: 0.91, z: 0.1, color: '#101315' },
    { w: 0.28, h: 0.28, d: 0.03, x: 0, y: 0.52, z: 0.33, color: '#d9dfd8' },
    { w: 0.05, h: 0.2, d: 0.04, x: -0.08, y: 0.52, z: 0.35, color: '#4f8f62' },
    { w: 0.05, h: 0.2, d: 0.04, x: 0.08, y: 0.52, z: 0.35, color: '#4f8f62' },
  ], `trash-${variant}`);
}

function buildBarrier(variant: number, accent: string): THREE.Group {
  const bright = variant % 2 ? '#ff9a36' : variantColor(accent, variant);
  const railWidth = 1.42 + variant * 0.045;
  const railY = 0.7 + variant * 0.018;
  const parts: PartSpec[] = [
    { w: railWidth, h: 0.2 + (variant % 3) * 0.025, d: 0.18, x: 0, y: railY, z: 0, color: bright },
    { w: 0.12, h: 0.82, d: 0.12, x: -0.62, y: 0.42, z: 0, color: '#596168', metalness: 0.55 },
    { w: 0.12, h: 0.82, d: 0.12, x: 0.62, y: 0.42, z: 0, color: '#596168', metalness: 0.55 },
    { w: 0.58, h: 0.1, d: 0.5, x: -0.62, y: 0.05, z: 0, color: '#303438' },
    { w: 0.58, h: 0.1, d: 0.5, x: 0.62, y: 0.05, z: 0, color: '#303438' },
  ];
  for (let stripe = -2; stripe <= 2; stripe += 1) parts.push({ w: 0.16, h: 0.19 + (variant % 3) * 0.025, d: 0.02, x: stripe * 0.25, y: railY, z: 0.105, color: '#f5f2de', rz: variant % 2 ? -0.55 : 0.55 });
  return group(parts, `barrier-${variant}`);
}

function buildPlanter(variant: number, accent: string): THREE.Group {
  const pot = variantColor(accent, variant);
  const foliage = variantColor('#4f9854', variant, 0.08);
  const parts: PartSpec[] = [
    { w: 1.08, h: 0.68, d: 1.08, x: 0, y: 0.34, z: 0, color: pot, shape: variant % 2 ? 'cylinder' : 'box' },
    { w: 0.92, h: 0.12, d: 0.92, x: 0, y: 0.7, z: 0, color: '#40392e', shape: variant % 2 ? 'cylinder' : 'box' },
  ];
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2;
    parts.push({ w: 0.46 + (index % 2) * 0.18, h: 0.72 + ((index + variant) % 3) * 0.18, d: 0.34, x: Math.cos(angle) * 0.28, y: 0.98 + (index % 3) * 0.1, z: Math.sin(angle) * 0.28, color: variantColor(foliage, variant, index * 0.05), shape: index % 2 ? 'cone' : 'sphere', rz: Math.cos(angle) * 0.28, rx: Math.sin(angle) * 0.28 });
  }
  return group(parts, `planter-${variant}`);
}

function buildPicnicTable(variant: number, accent: string, body: string): THREE.Group {
  const wood = variantColor(body, variant, 0.06);
  const frame = variant % 2 ? variantColor('#697278', variant) : variantColor(accent, variant);
  return group([
    { w: 2.1, h: 0.13, d: 0.72, x: 0, y: 0.78, z: 0, color: wood },
    { w: 2.05, h: 0.12, d: 0.34, x: 0, y: 0.48, z: -0.66, color: wood },
    { w: 2.05, h: 0.12, d: 0.34, x: 0, y: 0.48, z: 0.66, color: wood },
    { w: 0.12, h: 0.86, d: 0.12, x: -0.72, y: 0.42, z: -0.28, color: frame, rz: -0.32, shape: 'cylinder' },
    { w: 0.12, h: 0.86, d: 0.12, x: 0.72, y: 0.42, z: -0.28, color: frame, rz: 0.32, shape: 'cylinder' },
    { w: 0.12, h: 0.86, d: 0.12, x: -0.72, y: 0.42, z: 0.28, color: frame, rz: -0.32, shape: 'cylinder' },
    { w: 0.12, h: 0.86, d: 0.12, x: 0.72, y: 0.42, z: 0.28, color: frame, rz: 0.32, shape: 'cylinder' },
    { w: 1.55, h: 0.08, d: 0.08, x: 0, y: 0.34, z: 0, color: frame, metalness: 0.45 },
  ], `picnic-${variant}`);
}

function buildBleacher(variant: number, accent: string): THREE.Group {
  const seat = variantColor(accent, variant);
  const frame = variantColor('#727b82', variant);
  const parts: PartSpec[] = [];
  for (let row = 0; row < 3; row += 1) {
    parts.push({ w: 2.65, h: 0.12, d: 0.46, x: 0, y: 0.38 + row * 0.42, z: -0.52 + row * 0.52, color: seat });
    parts.push({ w: 2.55, h: 0.08, d: 0.08, x: 0, y: 0.22 + row * 0.42, z: -0.52 + row * 0.52, color: frame, metalness: 0.65 });
  }
  for (const x of [-1.05, 0, 1.05]) parts.push({ w: 0.1, h: 1.36, d: 0.1, x, y: 0.68, z: 0.24, color: frame, shape: 'cylinder', rz: (variant % 2 ? 0.05 : -0.05) * x });
  return group(parts, `bleacher-${variant}`);
}

function buildTree(variant: number, accent: string): THREE.Group {
  const bark = variantColor('#67503b', variant);
  const leaf = variantColor(accent || '#4e8b54', variant, 0.08);
  const parts: PartSpec[] = [
    { w: 0.42 + (variant % 3) * 0.08, h: 3.0, d: 0.42 + (variant % 3) * 0.08, x: 0, y: 1.5, z: 0, color: bark, shape: 'cylinder' },
  ];
  for (let branch = 0; branch < 5; branch += 1) {
    const angle = (branch / 5) * Math.PI * 2 + variant * 0.17;
    parts.push({ w: 0.18, h: 1.45, d: 0.18, x: Math.cos(angle) * 0.36, y: 2.8 + (branch % 2) * 0.3, z: Math.sin(angle) * 0.36, color: bark, shape: 'cylinder', rz: Math.cos(angle) * 0.72, rx: Math.sin(angle) * 0.72 });
    parts.push({ w: 1.15 + (branch % 2) * 0.3, h: 1.1 + ((branch + variant) % 3) * 0.2, d: 1.15, x: Math.cos(angle) * 0.78, y: 3.45 + (branch % 2) * 0.32, z: Math.sin(angle) * 0.78, color: variantColor(leaf, variant, branch * 0.04), shape: variant % 3 === 0 ? 'cone' : 'sphere' });
  }
  return group(parts, `tree-${variant}`);
}

function buildFountain(variant: number, accent: string): THREE.Group {
  const stone = variantColor(accent, variant);
  const water = variantColor('#74cde5', variant);
  return group([
    { w: 2.45, h: 0.42, d: 2.45, x: 0, y: 0.21, z: 0, color: stone, shape: variant % 2 ? 'cylinder' : 'box' },
    { w: 1.95, h: 0.18, d: 1.95, x: 0, y: 0.46, z: 0, color: '#273844', shape: variant % 2 ? 'cylinder' : 'box' },
    { w: 1.72, h: 0.06, d: 1.72, x: 0, y: 0.57, z: 0, color: water, emissive: water, emissiveIntensity: 0.2, shape: variant % 2 ? 'cylinder' : 'box' },
    { w: 0.35, h: 1.12, d: 0.35, x: 0, y: 1.03, z: 0, color: stone, shape: 'cylinder' },
    { w: 1.05, h: 0.18, d: 1.05, x: 0, y: 1.42, z: 0, color: stone, shape: 'cylinder' },
    { w: 0.72, h: 0.05, d: 0.72, x: 0, y: 1.54, z: 0, color: water, emissive: water, emissiveIntensity: 0.24, shape: 'cylinder' },
    { w: 0.22, h: 0.46 + variant * 0.045, d: 0.22, x: 0, y: 1.78, z: 0, color: water, emissive: water, emissiveIntensity: 0.35, shape: 'cylinder' },
  ], `fountain-${variant}`);
}

function buildHumanoid(kind: PropKind, variant: number, accent: string): THREE.Group {
  const outfitByKind: Partial<Record<PropKind, string>> = {
    figure_nurse: '#dbe9e7',
    figure_janitor: '#507a66',
    figure_commuter: '#4d6078',
    figure_hazmat: '#d7b73f',
    figure_mascot: '#b45d7c',
    figure_bellhop: '#8b2f38',
    figure_guard: '#293b55',
    figure_worker: '#5d6673',
    figure_patient: '#9bb9b3',
    figure_conductor: '#263447',
  };
  const outfit = variantColor(outfitByKind[kind] ?? accent, variant);
  const secondary = variantColor(accent, variant, 0.12);
  const skinTones = ['#d9ad8c', '#7d4e39', '#b97956', '#efc5a7', '#8f6049', '#c98d68', '#613c31', '#e0af8c'];
  const skin = skinTones[variant]!;
  const dark = variantColor('#242a31', variant);
  const heightOffset = (variant - 3.5) * 0.025;
  const pose = (variant % 4 - 1.5) * 0.09;
  const parts: PartSpec[] = [
    { w: 0.22, h: 0.13, d: 0.38, x: -0.18, y: 0.065, z: 0.06, color: dark, name: 'rig-shoe-left' },
    { w: 0.22, h: 0.13, d: 0.38, x: 0.18, y: 0.065, z: 0.06, color: dark, name: 'rig-shoe-right' },
    { w: 0.16, h: 0.68 + heightOffset, d: 0.18, x: -0.17, y: 0.46, z: 0, color: dark, shape: 'cylinder', rz: -pose * 0.35, name: 'rig-leg-left' },
    { w: 0.16, h: 0.68 + heightOffset, d: 0.18, x: 0.17, y: 0.46, z: 0, color: dark, shape: 'cylinder', rz: pose * 0.35, name: 'rig-leg-right' },
    { w: 0.46, h: 0.25, d: 0.34, x: 0, y: 0.82 + heightOffset, z: 0, color: outfit },
    { w: 0.58 + (variant % 3) * 0.035, h: 0.88, d: 0.36, x: 0, y: 1.29 + heightOffset, z: 0, color: outfit, shape: kind === 'figure_hazmat' || kind === 'figure_mascot' ? 'cylinder' : 'box' },
    { w: 0.12, h: 0.12, d: 0.12, x: 0, y: 1.78 + heightOffset, z: 0, color: skin, shape: 'cylinder' },
    { w: kind === 'figure_mascot' ? 0.66 : 0.42, h: kind === 'figure_mascot' ? 0.66 : 0.46, d: kind === 'figure_mascot' ? 0.62 : 0.42, x: 0, y: 2.03 + heightOffset, z: 0, color: kind === 'figure_hazmat' ? outfit : kind === 'figure_mascot' ? secondary : skin, shape: 'sphere', name: 'rig-head' },
    { w: 0.14, h: 0.7, d: 0.15, x: -0.38, y: 1.34 + heightOffset, z: 0, color: outfit, shape: 'cylinder', rz: 0.08 + pose, name: 'rig-arm-left' },
    { w: 0.14, h: 0.7, d: 0.15, x: 0.38, y: 1.34 + heightOffset, z: 0, color: outfit, shape: 'cylinder', rz: -0.08 - pose, name: 'rig-arm-right' },
    { w: 0.16, h: 0.16, d: 0.16, x: -0.42, y: 0.99 + heightOffset, z: 0, color: skin, shape: 'sphere' },
    { w: 0.16, h: 0.16, d: 0.16, x: 0.42, y: 0.99 + heightOffset, z: 0, color: skin, shape: 'sphere' },
  ];
  addFace(parts, kind, variant, heightOffset, dark);
  addProfessionDetails(parts, kind, variant, outfit, secondary, heightOffset);
  return group(parts, `${kind}-${variant}`);
}

function addFace(parts: PartSpec[], kind: PropKind, variant: number, heightOffset: number, dark: string): void {
  if (kind === 'figure_hazmat') {
    parts.push({ w: 0.34, h: 0.19, d: 0.06, x: 0, y: 2.05 + heightOffset, z: 0.23, color: '#76bed0', emissive: '#356e7c', emissiveIntensity: 0.22 });
    return;
  }
  const eyeColor = kind === 'figure_mascot' ? '#f8f3d8' : dark;
  for (const x of [-0.105, 0.105]) parts.push({ w: kind === 'figure_mascot' ? 0.16 : 0.055, h: kind === 'figure_mascot' ? 0.18 : 0.06, d: 0.045, x, y: 2.08 + heightOffset, z: kind === 'figure_mascot' ? 0.3 : 0.215, color: eyeColor, shape: 'sphere', emissive: variant === 7 ? eyeColor : undefined, emissiveIntensity: 0.2 });
  parts.push({ w: 0.07, h: 0.1, d: 0.06, x: 0, y: 1.98 + heightOffset, z: kind === 'figure_mascot' ? 0.34 : 0.23, color: dark, shape: 'sphere' });
}

function addProfessionDetails(
  parts: PartSpec[],
  kind: PropKind,
  variant: number,
  outfit: string,
  secondary: string,
  heightOffset: number,
): void {
  const y = heightOffset;
  switch (kind) {
    case 'figure_nurse':
      parts.push({ w: 0.34, h: 0.1, d: 0.28, x: 0, y: 2.31 + y, z: 0, color: '#f1f4ed' });
      parts.push({ w: 0.06, h: 0.18, d: 0.035, x: 0, y: 1.48 + y, z: 0.2, color: '#d94848' });
      parts.push({ w: 0.18, h: 0.06, d: 0.035, x: 0, y: 1.48 + y, z: 0.2, color: '#d94848' });
      break;
    case 'figure_janitor':
      parts.push({ w: 0.08, h: 1.55, d: 0.08, x: 0.52, y: 0.83, z: 0.08, color: '#76583b', shape: 'cylinder', rz: -0.1 });
      parts.push({ w: 0.38, h: 0.32, d: 0.16, x: 0.58, y: 0.12, z: 0.08, color: '#b0a276', shape: 'cone' });
      break;
    case 'figure_commuter':
      parts.push({ w: 0.42, h: 0.5, d: 0.16, x: variant % 2 ? -0.48 : 0.48, y: 1.0 + y, z: 0.08, color: secondary });
      parts.push({ w: 0.06, h: 0.62, d: 0.04, x: variant % 2 ? -0.35 : 0.35, y: 1.48 + y, z: 0.1, color: darkColor(outfit), rz: variant % 2 ? -0.45 : 0.45 });
      break;
    case 'figure_hazmat':
      parts.push({ w: 0.56, h: 0.18, d: 0.5, x: 0, y: 2.27 + y, z: -0.02, color: outfit, shape: 'cylinder' });
      parts.push({ w: 0.24, h: 0.34, d: 0.16, x: 0, y: 1.42 + y, z: -0.26, color: '#667078' });
      break;
    case 'figure_mascot':
      parts.push({ w: 0.28, h: 0.36, d: 0.22, x: -0.32, y: 2.35 + y, z: 0, color: secondary, shape: 'cone', rz: -0.28 });
      parts.push({ w: 0.28, h: 0.36, d: 0.22, x: 0.32, y: 2.35 + y, z: 0, color: secondary, shape: 'cone', rz: 0.28 });
      break;
    case 'figure_bellhop':
      parts.push({ w: 0.46, h: 0.18, d: 0.42, x: 0, y: 2.31 + y, z: 0, color: secondary, shape: 'cylinder' });
      parts.push({ w: 0.34, h: 0.22, d: 0.34, x: 0, y: 2.42 + y, z: 0, color: outfit, shape: 'cylinder' });
      parts.push({ w: 0.05, h: 0.68, d: 0.03, x: 0, y: 1.37 + y, z: 0.2, color: '#e8c35c' });
      break;
    case 'figure_guard':
    case 'figure_conductor':
      parts.push({ w: 0.52, h: 0.1, d: 0.46, x: 0, y: 2.3 + y, z: 0, color: darkColor(outfit), shape: 'cylinder' });
      parts.push({ w: 0.38, h: 0.22, d: 0.38, x: 0, y: 2.4 + y, z: 0, color: outfit, shape: 'cylinder' });
      parts.push({ w: 0.16, h: 0.22, d: 0.08, x: -0.25, y: 1.52 + y, z: 0.22, color: '#20262c' });
      break;
    case 'figure_worker':
      parts.push({ w: 0.28, h: 0.58, d: 0.07, x: 0.43, y: 1.16 + y, z: 0.16, color: '#e8dfc6', rz: -0.08 });
      parts.push({ w: 0.06, h: 0.58, d: 0.035, x: 0, y: 1.38 + y, z: 0.2, color: secondary });
      break;
    case 'figure_patient':
      parts.push({ w: 0.64, h: 0.12, d: 0.38, x: 0, y: 0.9 + y, z: 0.02, color: '#dde5df' });
      parts.push({ w: 0.08, h: 0.08, d: 0.08, x: variant % 2 ? -0.43 : 0.43, y: 1.02 + y, z: 0.01, color: '#f0d85e', shape: 'torus', rx: Math.PI / 2 });
      break;
    default:
      break;
  }
}

function darkColor(color: string): string {
  return new THREE.Color(color).multiplyScalar(0.45).getStyle();
}

/** Build a readable multi-mesh prop/entity. Returns local-space group centered near origin feet. */
export function buildModel(
  kind: PropKind,
  accent = '#6a7a8a',
  body = '#c4b59a',
  assetId?: string,
): THREE.Group {
  const key = `${kind}|${assetVariant(assetId)}|${accent}|${body}`;
  const cached = modelCache.get(key);
  if (cached) return cached.clone(true);
  const model = createModel(kind, accent, body, assetId);
  modelCache.set(key, model);
  return model.clone(true);
}

function createModel(
  kind: PropKind,
  accent: string,
  body: string,
  assetId?: string,
): THREE.Group {
  const expanded = buildExpandedModel(kind, assetVariant(assetId), accent, body);
  if (expanded) return expanded;
  const legacyHumanoid: Partial<Record<PropKind, PropKind>> = {
    figure_clerk: 'figure_worker',
    figure_guide: 'figure_conductor',
    figure_raincoat: 'figure_commuter',
    figure_mannequin: 'figure_worker',
  };
  const enrichedKind = legacyHumanoid[kind];
  if (enrichedKind) {
    const variant = kind === 'figure_mannequin' ? 7 : kind === 'figure_raincoat' ? 4 : 2;
    return buildHumanoid(enrichedKind, variant, kind === 'figure_mannequin' ? '#d8d2c8' : accent);
  }
  switch (kind) {
    case 'chair':
      return group(
        [
          { w: 0.55, h: 0.08, d: 0.55, x: 0, y: 0.45, z: 0, color: body },
          { w: 0.55, h: 0.7, d: 0.08, x: 0, y: 0.85, z: -0.24, color: body },
          { w: 0.07, h: 0.45, d: 0.07, x: -0.22, y: 0.22, z: -0.22, color: '#5a5044' },
          { w: 0.07, h: 0.45, d: 0.07, x: 0.22, y: 0.22, z: -0.22, color: '#5a5044' },
          { w: 0.07, h: 0.45, d: 0.07, x: -0.22, y: 0.22, z: 0.22, color: '#5a5044' },
          { w: 0.07, h: 0.45, d: 0.07, x: 0.22, y: 0.22, z: 0.22, color: '#5a5044' },
        ],
        'chair',
      );
    case 'desk':
      return group(
        [
          { w: 1.8, h: 0.1, d: 0.8, x: 0, y: 0.85, z: 0, color: body },
          { w: 0.1, h: 0.85, d: 0.75, x: -0.85, y: 0.42, z: 0, color: '#4a4036' },
          { w: 0.1, h: 0.85, d: 0.75, x: 0.85, y: 0.42, z: 0, color: '#4a4036' },
          { w: 0.5, h: 0.35, d: 0.7, x: 0.45, y: 0.55, z: 0, color: accent },
        ],
        'desk',
      );
    case 'vending':
      return group(
        [
          { w: 1.0, h: 2.1, d: 0.85, x: 0, y: 1.05, z: 0, color: '#2f4f7a', metalness: 0.35 },
          { w: 0.75, h: 1.1, d: 0.08, x: 0, y: 1.25, z: 0.42, color: '#8fd3ff', emissive: '#3a90c0', roughness: 0.25 },
          { w: 0.3, h: 0.15, d: 0.1, x: 0.25, y: 0.45, z: 0.45, color: '#222' },
          { w: 0.55, h: 0.08, d: 0.08, x: 0, y: 1.95, z: 0.42, color: accent, emissive: accent, emissiveIntensity: 0.6 },
        ],
        'vending',
      );
    case 'cabinet':
      return group(
        [
          { w: 1.0, h: 1.8, d: 0.5, x: 0, y: 0.9, z: 0, color: '#5c6b78', metalness: 0.4 },
          { w: 0.9, h: 0.02, d: 0.02, x: 0, y: 0.9, z: 0.26, color: '#222' },
          { w: 0.08, h: 0.08, d: 0.05, x: 0.35, y: 1.2, z: 0.28, color: '#ccc', metalness: 0.7 },
          { w: 0.08, h: 0.08, d: 0.05, x: 0.35, y: 0.6, z: 0.28, color: '#ccc', metalness: 0.7 },
        ],
        'cabinet',
      );
    case 'crib':
      return group(
        [
          { w: 1.3, h: 0.12, d: 0.75, x: 0, y: 0.45, z: 0, color: '#e8dcc8' },
          { w: 1.3, h: 0.7, d: 0.08, x: 0, y: 0.75, z: -0.34, color: '#d7c4a3' },
          { w: 1.3, h: 0.7, d: 0.08, x: 0, y: 0.75, z: 0.34, color: '#d7c4a3' },
          { w: 0.08, h: 0.7, d: 0.75, x: -0.61, y: 0.75, z: 0, color: '#d7c4a3' },
          { w: 0.08, h: 0.7, d: 0.75, x: 0.61, y: 0.75, z: 0, color: '#d7c4a3' },
          { w: 1.1, h: 0.15, d: 0.55, x: 0, y: 0.55, z: 0, color: '#f4f0ea' },
        ],
        'crib',
      );
    case 'plant':
      return group(
        [
          { w: 0.35, h: 0.35, d: 0.35, x: 0, y: 0.18, z: 0, color: '#7a4a32', shape: 'cylinder' },
          { w: 0.7, h: 0.7, d: 0.7, x: 0, y: 0.75, z: 0, color: '#3f8f4e', shape: 'sphere' },
          { w: 0.45, h: 0.45, d: 0.45, x: 0.15, y: 1.0, z: 0.1, color: '#56a85f', shape: 'sphere' },
        ],
        'plant',
      );
    case 'payphone':
      return group(
        [
          { w: 0.55, h: 1.4, d: 0.35, x: 0, y: 0.9, z: 0, color: '#3a3a48' },
          { w: 0.35, h: 0.45, d: 0.08, x: 0, y: 1.15, z: 0.18, color: '#111' },
          { w: 0.18, h: 0.28, d: 0.12, x: 0.12, y: 0.85, z: 0.2, color: accent, shape: 'cylinder' },
        ],
        'payphone',
      );
    case 'cooler':
      return group(
        [
          { w: 0.4, h: 1.15, d: 0.4, x: 0, y: 0.58, z: 0, color: '#dfe7ef', metalness: 0.25 },
          { w: 0.28, h: 0.25, d: 0.28, x: 0, y: 1.25, z: 0, color: '#9bb0c2', shape: 'cylinder' },
          { w: 0.12, h: 0.2, d: 0.12, x: 0, y: 1.45, z: 0, color: '#789' },
        ],
        'cooler',
      );
    case 'cart':
      return group(
        [
          { w: 0.9, h: 0.08, d: 0.55, x: 0, y: 0.45, z: 0, color: '#8a9199', metalness: 0.55 },
          { w: 0.85, h: 0.55, d: 0.05, x: 0, y: 0.75, z: -0.25, color: '#8a9199', metalness: 0.55 },
          { w: 0.85, h: 0.55, d: 0.05, x: 0, y: 0.75, z: 0.25, color: '#8a9199', metalness: 0.55 },
          { w: 0.12, h: 0.12, d: 0.12, x: -0.35, y: 0.1, z: -0.2, color: '#222', shape: 'sphere' },
          { w: 0.12, h: 0.12, d: 0.12, x: 0.35, y: 0.1, z: -0.2, color: '#222', shape: 'sphere' },
          { w: 0.12, h: 0.12, d: 0.12, x: -0.35, y: 0.1, z: 0.2, color: '#222', shape: 'sphere' },
          { w: 0.12, h: 0.12, d: 0.12, x: 0.35, y: 0.1, z: 0.2, color: '#222', shape: 'sphere' },
        ],
        'cart',
      );
    case 'door_fake':
      return group(
        [
          { w: 1.05, h: 2.2, d: 0.08, x: 0, y: 1.1, z: 0, color: '#6e5b45' },
          { w: 0.12, h: 0.12, d: 0.08, x: 0.35, y: 1.05, z: 0.05, color: '#c9a227', metalness: 0.7 },
          { w: 0.35, h: 0.08, d: 0.04, x: 0, y: 1.85, z: 0.05, color: accent },
        ],
        'door_fake',
      );
    case 'mattress':
      return group(
        [
          { w: 1.8, h: 0.28, d: 0.9, x: 0, y: 0.2, z: 0, color: '#d9d2c5' },
          { w: 1.7, h: 0.18, d: 0.8, x: 0.05, y: 0.42, z: 0.05, color: '#cfc3b0' },
          { w: 1.6, h: 0.15, d: 0.7, x: -0.05, y: 0.58, z: -0.05, color: '#b7a996' },
        ],
        'mattress',
      );
    case 'sign':
      return group(
        [
          { w: 0.08, h: 1.0, d: 0.08, x: 0, y: 0.5, z: 0, color: '#555' },
          { w: 0.7, h: 0.55, d: 0.06, x: 0, y: 1.15, z: 0, color: '#d4a017' },
          { w: 0.55, h: 0.08, d: 0.02, x: 0, y: 1.2, z: 0.04, color: '#222' },
        ],
        'sign',
      );
    case 'bottle_giant':
      return group(
        [
          { w: 0.9, h: 1.6, d: 0.9, x: 0, y: 0.9, z: 0, color: '#f2f0ea', shape: 'cylinder' },
          { w: 0.35, h: 0.7, d: 0.35, x: 0, y: 1.95, z: 0, color: '#e8e4dc', shape: 'cylinder' },
          { w: 0.5, h: 0.2, d: 0.5, x: 0, y: 2.4, z: 0, color: accent, shape: 'cylinder' },
        ],
        'bottle_giant',
      );
    case 'mirror':
      return group(
        [
          { w: 1.1, h: 1.8, d: 0.1, x: 0, y: 1.1, z: 0, color: '#3a3a3a' },
          { w: 0.9, h: 1.55, d: 0.04, x: 0, y: 1.1, z: 0.05, color: '#9ec9d9', metalness: 0.85, roughness: 0.15, emissive: '#245', emissiveIntensity: 0.15 },
        ],
        'mirror',
      );
    case 'bench':
      return group(
        [
          { w: 1.6, h: 0.12, d: 0.5, x: 0, y: 0.45, z: 0, color: body },
          { w: 1.6, h: 0.45, d: 0.1, x: 0, y: 0.75, z: -0.2, color: body },
          { w: 0.1, h: 0.45, d: 0.45, x: -0.7, y: 0.22, z: 0, color: '#4a4036' },
          { w: 0.1, h: 0.45, d: 0.45, x: 0.7, y: 0.22, z: 0, color: '#4a4036' },
        ],
        'bench',
      );
    case 'pillar':
      return group(
        [
          { w: 0.7, h: 3.2, d: 0.7, x: 0, y: 1.6, z: 0, color: body, shape: 'cylinder' },
          { w: 0.95, h: 0.18, d: 0.95, x: 0, y: 0.1, z: 0, color: accent },
          { w: 0.95, h: 0.18, d: 0.95, x: 0, y: 3.1, z: 0, color: accent },
        ],
        'pillar',
      );
    case 'lamp':
      return group(
        [
          { w: 0.25, h: 0.08, d: 0.25, x: 0, y: 0.04, z: 0, color: '#333' },
          { w: 0.08, h: 1.3, d: 0.08, x: 0, y: 0.7, z: 0, color: '#555', shape: 'cylinder' },
          { w: 0.55, h: 0.35, d: 0.55, x: 0, y: 1.45, z: 0, color: '#f5e6c0', emissive: '#f5e6c0', emissiveIntensity: 0.7, shape: 'cylinder' },
        ],
        'lamp',
      );
    case 'table':
      return group(
        [
          { w: 1.2, h: 0.1, d: 1.2, x: 0, y: 0.75, z: 0, color: body },
          { w: 0.1, h: 0.75, d: 0.1, x: -0.5, y: 0.37, z: -0.5, color: '#4a4036' },
          { w: 0.1, h: 0.75, d: 0.1, x: 0.5, y: 0.37, z: -0.5, color: '#4a4036' },
          { w: 0.1, h: 0.75, d: 0.1, x: -0.5, y: 0.37, z: 0.5, color: '#4a4036' },
          { w: 0.1, h: 0.75, d: 0.1, x: 0.5, y: 0.37, z: 0.5, color: '#4a4036' },
        ],
        'table',
      );
    case 'shelf':
      return group(
        [
          { w: 1.5, h: 1.8, d: 0.4, x: 0, y: 0.9, z: 0, color: body },
          { w: 1.4, h: 0.05, d: 0.35, x: 0, y: 0.5, z: 0.02, color: accent },
          { w: 1.4, h: 0.05, d: 0.35, x: 0, y: 1.0, z: 0.02, color: accent },
          { w: 1.4, h: 0.05, d: 0.35, x: 0, y: 1.5, z: 0.02, color: accent },
        ],
        'shelf',
      );
    case 'tv':
      return group(
        [
          { w: 1.2, h: 0.75, d: 0.2, x: 0, y: 1.1, z: 0, color: '#1a1a1a' },
          { w: 1.0, h: 0.55, d: 0.05, x: 0, y: 1.12, z: 0.1, color: '#203040', emissive: '#1a3048', emissiveIntensity: 0.35 },
          { w: 0.35, h: 0.55, d: 0.25, x: 0, y: 0.4, z: 0, color: '#333' },
        ],
        'tv',
      );
    case 'figure_baby':
      return group(
        [
          // oversized seated baby silhouette
          { w: 1.6, h: 1.3, d: 1.2, x: 0, y: 1.0, z: 0.1, color: '#f0d5c0', shape: 'sphere' },
          { w: 1.3, h: 1.3, d: 1.3, x: 0, y: 2.35, z: 0, color: '#f3dcc8', shape: 'sphere' },
          { w: 0.55, h: 0.9, d: 0.55, x: -0.85, y: 0.7, z: 0.35, color: '#e8c8b0', shape: 'cylinder' },
          { w: 0.55, h: 0.9, d: 0.55, x: 0.85, y: 0.7, z: 0.35, color: '#e8c8b0', shape: 'cylinder' },
          { w: 0.35, h: 0.12, d: 0.12, x: -0.35, y: 2.45, z: 0.55, color: '#222', shape: 'sphere' },
          { w: 0.35, h: 0.12, d: 0.12, x: 0.35, y: 2.45, z: 0.55, color: '#222', shape: 'sphere' },
          { w: 0.45, h: 0.12, d: 0.18, x: 0, y: 2.15, z: 0.6, color: '#c97b7b', shape: 'sphere' },
        ],
        'figure_baby',
      );
    case 'figure_clerk':
      return group(
        [
          { w: 0.55, h: 0.9, d: 0.35, x: 0, y: 1.35, z: 0, color: accent },
          { w: 0.45, h: 0.9, d: 0.3, x: 0, y: 0.55, z: 0, color: '#2c3340' },
          { w: 0.4, h: 0.4, d: 0.4, x: 0, y: 1.95, z: 0, color: '#e2c7b0', shape: 'sphere' },
        ],
        'figure_clerk',
      );
    case 'figure_deer':
      return group(
        [
          { w: 0.55, h: 0.7, d: 1.1, x: 0, y: 1.0, z: 0, color: '#b08968', shape: 'sphere' },
          { w: 0.35, h: 0.45, d: 0.45, x: 0, y: 1.45, z: 0.55, color: '#b08968', shape: 'sphere' },
          { w: 0.08, h: 0.55, d: 0.08, x: -0.12, y: 1.9, z: 0.55, color: '#d9c2a0' },
          { w: 0.08, h: 0.55, d: 0.08, x: 0.12, y: 1.9, z: 0.55, color: '#d9c2a0' },
          { w: 0.12, h: 0.9, d: 0.12, x: -0.2, y: 0.45, z: 0.35, color: '#8a6a4a', shape: 'cylinder' },
          { w: 0.12, h: 0.9, d: 0.12, x: 0.2, y: 0.45, z: 0.35, color: '#8a6a4a', shape: 'cylinder' },
          { w: 0.12, h: 0.9, d: 0.12, x: -0.2, y: 0.45, z: -0.35, color: '#8a6a4a', shape: 'cylinder' },
          { w: 0.12, h: 0.9, d: 0.12, x: 0.2, y: 0.45, z: -0.35, color: '#8a6a4a', shape: 'cylinder' },
        ],
        'figure_deer',
      );
    case 'figure_mannequin':
      return group(
        [
          { w: 0.5, h: 1.1, d: 0.28, x: 0, y: 1.4, z: 0, color: '#d8d2c8' },
          { w: 0.38, h: 1.0, d: 0.25, x: 0, y: 0.55, z: 0, color: '#cfc7bb' },
          { w: 0.32, h: 0.32, d: 0.32, x: 0, y: 2.1, z: 0, color: '#e6dfd4', shape: 'sphere' },
          { w: 0.15, h: 0.9, d: 0.15, x: -0.4, y: 1.35, z: 0, color: '#d8d2c8', shape: 'cylinder' },
          { w: 0.15, h: 0.9, d: 0.15, x: 0.4, y: 1.35, z: 0, color: '#d8d2c8', shape: 'cylinder' },
        ],
        'figure_mannequin',
      );
    case 'figure_shadow':
      return group(
        [
          { w: 0.55, h: 1.8, d: 0.35, x: 0, y: 1.1, z: 0, color: '#12121a' },
          { w: 0.4, h: 0.4, d: 0.4, x: 0, y: 2.15, z: 0, color: '#0a0a10', shape: 'sphere' },
          { w: 0.12, h: 0.06, d: 0.06, x: -0.1, y: 2.2, z: 0.18, color: '#6ff', emissive: '#4dd', emissiveIntensity: 0.8, shape: 'sphere' },
          { w: 0.12, h: 0.06, d: 0.06, x: 0.1, y: 2.2, z: 0.18, color: '#6ff', emissive: '#4dd', emissiveIntensity: 0.8, shape: 'sphere' },
        ],
        'figure_shadow',
      );
    case 'figure_balloon':
      return group(
        [
          { w: 0.9, h: 0.7, d: 0.55, x: 0, y: 1.5, z: 0, color: accent, shape: 'sphere' },
          { w: 0.55, h: 0.4, d: 0.4, x: 0, y: 1.05, z: 0.1, color: accent, shape: 'sphere' },
          { w: 0.12, h: 0.12, d: 0.12, x: -0.25, y: 1.55, z: 0.25, color: '#222', shape: 'sphere' },
          { w: 0.12, h: 0.12, d: 0.12, x: 0.25, y: 1.55, z: 0.25, color: '#222', shape: 'sphere' },
          { w: 0.04, h: 1.2, d: 0.04, x: 0, y: 0.55, z: 0, color: '#ddd', shape: 'cylinder' },
        ],
        'figure_balloon',
      );
    case 'figure_guide':
      return group(
        [
          { w: 0.55, h: 1.0, d: 0.35, x: 0, y: 1.35, z: 0, color: '#3d6b8c' },
          { w: 0.45, h: 0.95, d: 0.3, x: 0, y: 0.55, z: 0, color: '#2a3340' },
          { w: 0.38, h: 0.38, d: 0.38, x: 0, y: 2.0, z: 0, color: '#e2c7b0', shape: 'sphere' },
          { w: 0.35, h: 0.55, d: 0.08, x: 0.45, y: 1.2, z: 0.1, color: '#f2e8c8' },
        ],
        'figure_guide',
      );
    case 'figure_raincoat':
      return group(
        [
          { w: 0.7, h: 1.4, d: 0.45, x: 0, y: 1.2, z: 0, color: '#c45c26' },
          { w: 0.5, h: 0.7, d: 0.35, x: 0, y: 0.4, z: 0, color: '#2a2a32' },
          { w: 0.42, h: 0.42, d: 0.42, x: 0, y: 2.05, z: 0, color: '#1a1a22', shape: 'sphere' },
        ],
        'figure_raincoat',
      );
    default:
      return group([{ w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0, color: body }], 'box');
  }
}

const EXPANDED_BOUNDS: Partial<Record<PropKind, { w: number; h: number; d: number }>> = {
  armchair: { w: 0.9, h: 1.15, d: 0.9 },
  sofa: { w: 2.2, h: 1.1, d: 0.9 },
  stool: { w: 0.55, h: 0.8, d: 0.55 },
  school_desk: { w: 1.05, h: 1.1, d: 0.75 },
  locker: { w: 0.85, h: 2, d: 0.65 },
  bookcase: { w: 1.45, h: 2.05, d: 0.48 },
  display_case: { w: 1.45, h: 1.55, d: 0.9 },
  hospital_bed: { w: 2.15, h: 1.15, d: 1 },
  gurney: { w: 2.05, h: 1, d: 0.8 },
  arcade: { w: 0.9, h: 2, d: 0.9 },
  checkout: { w: 2.2, h: 1.65, d: 0.85 },
  kiosk: { w: 1, h: 1.7, d: 0.8 },
  terminal: { w: 1, h: 1.7, d: 0.75 },
  trash: { w: 0.7, h: 1, d: 0.7 },
  barrier: { w: 1.7, h: 1.15, d: 0.55 },
  planter: { w: 1.2, h: 1.5, d: 1.2 },
  picnic: { w: 2.2, h: 1.05, d: 1.5 },
  bleacher: { w: 2.8, h: 1.6, d: 1.7 },
  tree: { w: 1.8, h: 4.6, d: 1.8 },
  fountain: { w: 2.6, h: 2, d: 2.6 },
  figure_nurse: { w: 0.78, h: 2.35, d: 0.58 },
  figure_janitor: { w: 1.1, h: 2.35, d: 0.7 },
  figure_commuter: { w: 1, h: 2.35, d: 0.7 },
  figure_hazmat: { w: 0.86, h: 2.4, d: 0.7 },
  figure_mascot: { w: 1.05, h: 2.65, d: 0.8 },
  figure_bellhop: { w: 0.78, h: 2.55, d: 0.58 },
  figure_guard: { w: 0.82, h: 2.55, d: 0.62 },
  figure_worker: { w: 0.95, h: 2.35, d: 0.62 },
  figure_patient: { w: 0.82, h: 2.35, d: 0.62 },
  figure_conductor: { w: 0.82, h: 2.55, d: 0.62 },
};

export function boundsForKind(kind: PropKind): { w: number; h: number; d: number } {
  const expanded = EXPANDED_BOUNDS[kind];
  if (expanded) return expanded;
  switch (kind) {
    case 'chair':
      return { w: 0.6, h: 1.2, d: 0.6 };
    case 'desk':
      return { w: 1.9, h: 1.0, d: 0.9 };
    case 'vending':
      return { w: 1.1, h: 2.2, d: 0.95 };
    case 'cabinet':
      return { w: 1.1, h: 1.9, d: 0.6 };
    case 'crib':
      return { w: 1.4, h: 1.15, d: 0.85 };
    case 'plant':
      return { w: 0.8, h: 1.2, d: 0.8 };
    case 'payphone':
      return { w: 0.65, h: 1.6, d: 0.45 };
    case 'cooler':
      return { w: 0.5, h: 1.55, d: 0.5 };
    case 'cart':
      return { w: 1.0, h: 1.05, d: 0.65 };
    case 'door_fake':
      return { w: 1.15, h: 2.3, d: 0.2 };
    case 'mattress':
      return { w: 1.9, h: 0.75, d: 1.0 };
    case 'sign':
      return { w: 0.8, h: 1.5, d: 0.2 };
    case 'bottle_giant':
      return { w: 1.0, h: 2.6, d: 1.0 };
    case 'mirror':
      return { w: 1.2, h: 2.0, d: 0.2 };
    case 'bench':
      return { w: 1.7, h: 1.0, d: 0.6 };
    case 'pillar':
      return { w: 1.0, h: 3.3, d: 1.0 };
    case 'lamp':
      return { w: 0.6, h: 1.7, d: 0.6 };
    case 'table':
      return { w: 1.3, h: 0.85, d: 1.3 };
    case 'shelf':
      return { w: 1.6, h: 1.9, d: 0.5 };
    case 'tv':
      return { w: 1.3, h: 1.5, d: 0.4 };
    case 'figure_baby':
      return { w: 2.2, h: 3.1, d: 1.8 };
    case 'figure_clerk':
    case 'figure_guide':
    case 'figure_raincoat':
      return { w: 0.8, h: 2.2, d: 0.55 };
    case 'figure_deer':
      return { w: 0.9, h: 2.2, d: 1.4 };
    case 'figure_mannequin':
      return { w: 1.0, h: 2.35, d: 0.5 };
    case 'figure_shadow':
      return { w: 0.7, h: 2.4, d: 0.5 };
    case 'figure_balloon':
      return { w: 1.0, h: 2.0, d: 0.7 };
    default:
      return { w: 1, h: 1, d: 1 };
  }
}

export function kindFromLabel(label: string): PropKind {
  const l = label.toLowerCase();
  if (l.includes('night nurse') || l.includes(' nurse')) return 'figure_nurse';
  if (l.includes('janitor')) return 'figure_janitor';
  if (l.includes('commuter')) return 'figure_commuter';
  if (l.includes('hazmat')) return 'figure_hazmat';
  if (l.includes('mascot')) return 'figure_mascot';
  if (l.includes('bellhop')) return 'figure_bellhop';
  if (l.includes('security guard')) return 'figure_guard';
  if (l.includes('office worker')) return 'figure_worker';
  if (l.includes('patient')) return 'figure_patient';
  if (l.includes('conductor')) return 'figure_conductor';
  if (l.includes('giant baby') || l === 'baby') return 'figure_baby';
  if (l.includes('clerk')) return 'figure_clerk';
  if (l.includes('deer')) return 'figure_deer';
  if (l.includes('mannequin')) return 'figure_mannequin';
  if (l.includes('shadow') || l.includes('security shadow')) return 'figure_shadow';
  if (l.includes('balloon')) return 'figure_balloon';
  if (l.includes('guide')) return 'figure_guide';
  if (l.includes('raincoat')) return 'figure_raincoat';
  if (l.includes('lounge chair') || l.includes('armchair')) return 'armchair';
  if (l.includes('sofa')) return 'sofa';
  if (l.includes('stool')) return 'stool';
  if (l.includes('student desk')) return 'school_desk';
  if (l.includes('locker')) return 'locker';
  if (l.includes('bookcase')) return 'bookcase';
  if (l.includes('display case')) return 'display_case';
  if (l.includes('hospital bed')) return 'hospital_bed';
  if (l.includes('gurney')) return 'gurney';
  if (l.includes('arcade')) return 'arcade';
  if (l.includes('checkout')) return 'checkout';
  if (l.includes('kiosk')) return 'kiosk';
  if (l.includes('terminal')) return 'terminal';
  if (l.includes('waste bin') || l.includes('trash')) return 'trash';
  if (l.includes('barrier')) return 'barrier';
  if (l.includes('planter')) return 'planter';
  if (l.includes('picnic')) return 'picnic';
  if (l.includes('bleacher')) return 'bleacher';
  if (l.includes('tree')) return 'tree';
  if (l.includes('fountain')) return 'fountain';
  if (l.includes('vending')) return 'vending';
  if (l.includes('desk')) return 'desk';
  if (l.includes('chair')) return 'chair';
  if (l.includes('cabinet') || l.includes('filing')) return 'cabinet';
  if (l.includes('crib')) return 'crib';
  if (l.includes('fern') || l.includes('plant')) return 'plant';
  if (l.includes('payphone') || l.includes('phone')) return 'payphone';
  if (l.includes('cooler') || l.includes('water')) return 'cooler';
  if (l.includes('cart')) return 'cart';
  if (l.includes('door')) return 'door_fake';
  if (l.includes('mattress')) return 'mattress';
  if (l.includes('sign')) return 'sign';
  if (l.includes('bottle')) return 'bottle_giant';
  if (l.includes('mirror')) return 'mirror';
  if (l.includes('bench')) return 'bench';
  if (l.includes('pillar') || l.includes('column')) return 'pillar';
  if (l.includes('lamp')) return 'lamp';
  if (l.includes('table')) return 'table';
  if (l.includes('shelf')) return 'shelf';
  if (l.includes('tv') || l.includes('television')) return 'tv';
  return 'chair';
}
