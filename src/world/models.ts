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
  | 'figure_raincoat';

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
  shape?: 'box' | 'sphere' | 'cylinder' | 'cone';
}

const matCache = new Map<string, THREE.MeshStandardMaterial>();

export function clearModelMaterialCache(): void {
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
    default:
      geom = new THREE.BoxGeometry(1, 1, 1);
  }
  const mesh = new THREE.Mesh(
    geom,
    mat(p.color, p.roughness ?? 0.75, p.metalness ?? 0.08, p.emissive, p.emissiveIntensity),
  );
  mesh.scale.set(p.w, p.h, p.d);
  mesh.position.set(p.x, p.y, p.z);
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

/** Build a readable multi-mesh prop/entity. Returns local-space group centered near origin feet. */
export function buildModel(kind: PropKind, accent = '#6a7a8a', body = '#c4b59a'): THREE.Group {
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

export function boundsForKind(kind: PropKind): { w: number; h: number; d: number } {
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
  if (l.includes('giant baby') || l === 'baby') return 'figure_baby';
  if (l.includes('clerk')) return 'figure_clerk';
  if (l.includes('deer')) return 'figure_deer';
  if (l.includes('mannequin')) return 'figure_mannequin';
  if (l.includes('shadow') || l.includes('security shadow')) return 'figure_shadow';
  if (l.includes('balloon')) return 'figure_balloon';
  if (l.includes('guide')) return 'figure_guide';
  if (l.includes('raincoat')) return 'figure_raincoat';
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
