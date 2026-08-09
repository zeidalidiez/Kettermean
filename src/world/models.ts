import * as THREE from 'three';
import { hashString } from '../core/rng';
import {
  buildMixedMediaModel,
  MIXED_MEDIA_BOUNDS,
} from './mixedMediaModels';
import type { MixedMediaModelKind } from './mixedMediaAssets';
import {
  buildSemanticModel,
  SEMANTIC_BOUNDS,
} from './semanticModels';
import type { SemanticModelKind } from './semanticAssets';
import { buildSurrealModel, SURREAL_BOUNDS } from './surrealModels';

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
  | 'dining_chair'
  | 'office_chair'
  | 'coffee_table'
  | 'side_table'
  | 'filing_cabinet'
  | 'reception_desk'
  | 'wardrobe'
  | 'sectional'
  | 'hotel_bed'
  | 'nightstand'
  | 'washer'
  | 'phone_booth'
  | 'bus_shelter'
  | 'swing_set'
  | 'pool_lounger'
  | 'lifeguard_chair'
  | 'streetlight'
  | 'pallet_stack'
  | 'server_rack'
  | 'aquarium_tank'
  | 'medical_cart'
  | 'privacy_screen'
  | 'copy_machine'
  | 'archive_trolley'
  | 'ticket_gate'
  | 'departure_board'
  | 'shopping_cart'
  | 'retail_display'
  | 'chalkboard'
  | 'lab_bench'
  | 'tool_chest'
  | 'drum_stack'
  | 'luggage_cart'
  | 'room_service'
  | 'traffic_cone'
  | 'exercise_bike'
  | 'cinema_seat'
  | 'pool_ladder'
  | 'utility_shelf'
  | 'breaker_panel'
  | 'boiler'
  | 'pipe_cluster'
  | 'folding_table'
  | 'cafeteria_table'
  | 'airport_seat'
  | 'examination_bed'
  | 'snack_machine'
  | 'luggage_pile'
  | 'garden_bench'
  | 'market_stall'
  | 'maintenance_sink'
  | 'rubble_pile'
  | 'fire_barrel'
  | 'broken_column'
  | 'collapsed_beam'
  | 'wooden_barricade'
  | 'altar'
  | 'office_cubicle'
  | 'restaurant_booth'
  | 'warehouse_crate'
  | 'generator'
  | 'greenhouse_table'
  | 'telescope'
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
  | 'water_tower'
  | 'animal_cat'
  | 'animal_dog'
  | 'animal_crow'
  | 'animal_rabbit'
  | 'animal_horse'
  | 'animal_fish'
  | 'figure_nurse'
  | 'figure_janitor'
  | 'figure_commuter'
  | 'figure_hazmat'
  | 'figure_mascot'
  | 'figure_bellhop'
  | 'figure_guard'
  | 'figure_worker'
  | 'figure_patient'
  | 'figure_conductor'
  | 'figure_teacher'
  | 'figure_cook'
  | 'figure_swimmer'
  | 'figure_groundskeeper'
  | 'figure_receptionist'
  | 'figure_courier'
  | 'figure_usher'
  | 'figure_tourist'
  | 'figure_mechanic'
  | 'figure_lifeguard'
  | 'figure_vendor'
  | 'figure_firefighter'
  | 'figure_librarian'
  | 'figure_lab_tech'
  | 'figure_coach'
  | 'figure_musician'
  | MixedMediaModelKind
  | SemanticModelKind;

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
  shape?: 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'capsule';
  rx?: number;
  ry?: number;
  rz?: number;
  name?: string;
}

const matCache = new Map<string, THREE.MeshStandardMaterial>();
const modelCache = new Map<string, THREE.Group>();

export function clearModelMaterialCache(): void {
  const disposedMaterials = new Set<THREE.Material>();
  const disposedTextures = new Set<THREE.Texture>();
  for (const model of modelCache.values()) {
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
      if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Sprite)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (disposedMaterials.has(material)) continue;
        disposedMaterials.add(material);
        const map = (material as THREE.Material & { map?: THREE.Texture | null }).map;
        if (
          map &&
          map.userData.persistentModelTexture !== true &&
          !disposedTextures.has(map)
        ) {
          disposedTextures.add(map);
          map.dispose();
        }
        material.dispose();
      }
    });
  }
  modelCache.clear();
  for (const material of matCache.values()) {
    if (!disposedMaterials.has(material)) material.dispose();
  }
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
      geom = new THREE.SphereGeometry(0.5, 20, 16);
      break;
    case 'cylinder':
      geom = new THREE.CylinderGeometry(0.5, 0.5, 1, 18);
      break;
    case 'cone':
      geom = new THREE.ConeGeometry(0.5, 1, 18);
      break;
    case 'torus':
      geom = new THREE.TorusGeometry(0.5, 0.14, 10, 24);
      break;
    case 'capsule':
      geom = new THREE.CapsuleGeometry(0.36, 0.28, 6, 14);
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
    case 'dining_chair':
      return buildDiningChair(variant, accent, body);
    case 'office_chair':
      return buildOfficeChair(variant, accent);
    case 'coffee_table':
      return buildLowTable('coffee-table', variant, accent, body, 1.38, 0.76, 0.52);
    case 'side_table':
      return buildLowTable('side-table', variant, accent, body, 0.62, 0.62, 0.68);
    case 'filing_cabinet':
      return buildFilingCabinet(variant, accent);
    case 'reception_desk':
      return buildReceptionDesk(variant, accent, body);
    case 'wardrobe':
      return buildWardrobe(variant, accent, body);
    case 'sectional':
      return buildSectional(variant, accent, body);
    case 'hotel_bed':
      return buildHotelBed(variant, accent, body);
    case 'nightstand':
      return buildNightstand(variant, accent, body);
    case 'washer':
      return buildWasher(variant, accent);
    case 'phone_booth':
      return buildPhoneBooth(variant, accent);
    case 'bus_shelter':
      return buildBusShelter(variant, accent);
    case 'swing_set':
      return buildSwingSet(variant, accent);
    case 'pool_lounger':
      return buildPoolLounger(variant, accent);
    case 'lifeguard_chair':
      return buildLifeguardChair(variant, accent);
    case 'streetlight':
      return buildStreetlight(variant, accent);
    case 'pallet_stack':
      return buildPalletStack(variant, accent, body);
    case 'server_rack':
      return buildServerRack(variant, accent);
    case 'aquarium_tank':
      return buildAquariumTank(variant, accent);
    case 'medical_cart':
    case 'privacy_screen':
    case 'copy_machine':
    case 'archive_trolley':
    case 'ticket_gate':
    case 'departure_board':
    case 'shopping_cart':
    case 'retail_display':
    case 'chalkboard':
    case 'lab_bench':
    case 'tool_chest':
    case 'drum_stack':
    case 'luggage_cart':
    case 'room_service':
    case 'traffic_cone':
    case 'exercise_bike':
    case 'cinema_seat':
    case 'pool_ladder':
      return buildSceneExpansion(kind, variant, accent, body);
    case 'utility_shelf':
    case 'breaker_panel':
    case 'boiler':
    case 'pipe_cluster':
    case 'folding_table':
    case 'cafeteria_table':
    case 'airport_seat':
    case 'examination_bed':
    case 'snack_machine':
    case 'luggage_pile':
    case 'garden_bench':
    case 'market_stall':
    case 'maintenance_sink':
      return buildIterationExpansion(kind, variant, accent, body);
    case 'rubble_pile':
    case 'fire_barrel':
    case 'broken_column':
    case 'collapsed_beam':
    case 'wooden_barricade':
    case 'altar':
    case 'office_cubicle':
    case 'restaurant_booth':
    case 'warehouse_crate':
    case 'generator':
    case 'greenhouse_table':
    case 'telescope':
      return buildConditionExpansion(kind, variant, accent, body);
    case 'animal_cat':
    case 'animal_dog':
    case 'animal_crow':
    case 'animal_rabbit':
    case 'animal_horse':
    case 'animal_fish':
      return buildAnimal(kind, variant, accent);
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
    case 'figure_teacher':
    case 'figure_cook':
    case 'figure_swimmer':
    case 'figure_groundskeeper':
    case 'figure_receptionist':
    case 'figure_courier':
    case 'figure_usher':
    case 'figure_tourist':
    case 'figure_mechanic':
    case 'figure_lifeguard':
    case 'figure_vendor':
    case 'figure_firefighter':
    case 'figure_librarian':
    case 'figure_lab_tech':
    case 'figure_coach':
    case 'figure_musician':
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

function buildDiningChair(variant: number, accent: string, body: string): THREE.Group {
  const wood = variantColor(body, variant, 0.06);
  const upholstery = variantColor(accent, variant);
  const parts: PartSpec[] = [
    { w: 0.58, h: 0.12, d: 0.58, x: 0, y: 0.48, z: 0, color: upholstery },
    { w: 0.08, h: 0.97, d: 0.08, x: -0.24, y: 0.78, z: -0.25, color: wood, shape: variant % 2 ? 'cylinder' : 'box' },
    { w: 0.08, h: 0.97, d: 0.08, x: 0.24, y: 0.78, z: -0.25, color: wood, shape: variant % 2 ? 'cylinder' : 'box' },
    { w: 0.08, h: 0.48, d: 0.08, x: -0.24, y: 0.24, z: 0.24, color: wood, shape: variant % 2 ? 'cylinder' : 'box' },
    { w: 0.08, h: 0.48, d: 0.08, x: 0.24, y: 0.24, z: 0.24, color: wood, shape: variant % 2 ? 'cylinder' : 'box' },
    { w: 0.54, h: 0.09, d: 0.09, x: 0, y: 1.04, z: -0.25, color: wood },
  ];
  for (const x of [-0.18, 0, 0.18]) {
    parts.push({ w: 0.055, h: 0.48 + (variant % 3) * 0.04, d: 0.055, x, y: 0.8, z: -0.25, color: variantColor(wood, variant, x), shape: 'cylinder' });
  }
  parts.push({ w: 0.48, h: 0.05, d: 0.04, x: 0, y: 0.27, z: -0.25, color: wood });
  return group(parts, `dining-chair-${variant}`);
}

function buildOfficeChair(variant: number, accent: string): THREE.Group {
  const fabric = variantColor(accent, variant);
  const frame = variantColor('#3d454d', variant);
  const parts: PartSpec[] = [
    { w: 0.66, h: 0.16, d: 0.62, x: 0, y: 0.63, z: 0.02, color: fabric, shape: variant % 3 === 0 ? 'cylinder' : 'box' },
    { w: 0.58, h: 0.62 + variant * 0.025, d: 0.14, x: 0, y: 1.0, z: -0.25, color: fabric, rx: -0.08 },
    { w: 0.11, h: 0.5, d: 0.11, x: 0, y: 0.34, z: 0, color: frame, metalness: 0.72, shape: 'cylinder' },
    { w: 0.08, h: 0.58, d: 0.08, x: -0.4, y: 0.78, z: 0, color: frame, metalness: 0.65, shape: 'cylinder' },
    { w: 0.08, h: 0.58, d: 0.08, x: 0.4, y: 0.78, z: 0, color: frame, metalness: 0.65, shape: 'cylinder' },
    { w: 0.32, h: 0.07, d: 0.1, x: -0.4, y: 1.0, z: 0, color: frame },
    { w: 0.32, h: 0.07, d: 0.1, x: 0.4, y: 1.0, z: 0, color: frame },
  ];
  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2 + variant * 0.08;
    parts.push({ w: 0.06, h: 0.05, d: 0.45, x: Math.sin(angle) * 0.18, y: 0.12, z: Math.cos(angle) * 0.18, color: frame, ry: angle });
    parts.push({ w: 0.12, h: 0.12, d: 0.08, x: Math.sin(angle) * 0.38, y: 0.055, z: Math.cos(angle) * 0.38, color: '#171b20', shape: 'torus', ry: angle });
  }
  return group(parts, `office-chair-${variant}`);
}

function buildLowTable(
  name: string,
  variant: number,
  accent: string,
  body: string,
  width: number,
  depth: number,
  height: number,
): THREE.Group {
  const top = variantColor(body, variant, 0.05);
  const frame = variantColor(accent, variant);
  const round = variant % 4 === 3;
  const parts: PartSpec[] = [
    { w: width, h: 0.1, d: depth, x: 0, y: height, z: 0, color: top, shape: round ? 'cylinder' : 'box' },
    { w: width * 0.72, h: 0.06, d: depth * 0.72, x: 0, y: height * 0.44, z: 0, color: variantColor(top, variant, 0.1), shape: round ? 'cylinder' : 'box' },
  ];
  for (const x of [-width * 0.4, width * 0.4]) {
    for (const z of [-depth * 0.38, depth * 0.38]) {
      parts.push({ w: 0.075, h: height - 0.04, d: 0.075, x, y: height * 0.5, z, color: frame, metalness: variant % 2 ? 0.6 : 0.12, shape: variant % 2 ? 'cylinder' : 'box' });
    }
  }
  parts.push({ w: 0.22, h: 0.055 + variant * 0.008, d: 0.16, x: (variant % 3 - 1) * width * 0.2, y: height + 0.08, z: 0.03, color: variantColor(accent, variant, 0.14) });
  return group(parts, `${name}-${variant}`);
}

function buildFilingCabinet(variant: number, accent: string): THREE.Group {
  const shell = variantColor(accent, variant);
  const trim = variantColor('#c3c8c9', variant);
  const parts: PartSpec[] = [
    { w: 0.68, h: 1.38, d: 0.66, x: 0, y: 0.69, z: 0, color: shell, metalness: 0.42 },
    { w: 0.72, h: 0.07, d: 0.7, x: 0, y: 1.41, z: 0, color: trim, metalness: 0.55 },
  ];
  for (let drawer = 0; drawer < 4; drawer += 1) {
    const y = 0.22 + drawer * 0.32;
    parts.push({ w: 0.59, h: 0.27, d: 0.035, x: 0, y, z: 0.345, color: variantColor(shell, variant, drawer * 0.025) });
    parts.push({ w: 0.24, h: 0.035, d: 0.055, x: 0, y: y + 0.04, z: 0.38, color: trim, metalness: 0.82 });
    parts.push({ w: 0.18, h: 0.065, d: 0.025, x: 0, y: y - 0.07, z: 0.382, color: '#e8e3d3' });
  }
  return group(parts, `filing-cabinet-${variant}`);
}

function buildReceptionDesk(variant: number, accent: string, body: string): THREE.Group {
  const shell = variantColor(body, variant, 0.05);
  const trim = variantColor(accent, variant);
  const parts: PartSpec[] = [
    { w: 2.7, h: 0.82, d: 0.95, x: 0, y: 0.41, z: 0, color: shell },
    { w: 2.82, h: 0.11, d: 1.04, x: 0, y: 0.88, z: 0, color: trim },
    { w: 1.1, h: 0.48, d: 0.14, x: variant % 2 ? -0.66 : 0.66, y: 1.13, z: -0.39, color: shell },
    { w: 1.18, h: 0.09, d: 0.44, x: variant % 2 ? -0.66 : 0.66, y: 1.39, z: -0.23, color: trim },
    { w: 0.5, h: 0.34, d: 0.08, x: variant % 2 ? 0.52 : -0.52, y: 1.13, z: 0.5, color: '#87d4e8', emissive: '#397384', emissiveIntensity: 0.38 },
    { w: 0.08, h: 0.36, d: 0.08, x: variant % 2 ? 0.52 : -0.52, y: 0.95, z: 0.34, color: '#4c555c', metalness: 0.55 },
    { w: 0.62, h: 0.14, d: 0.36, x: 0, y: 0.98, z: 0.1, color: '#23282d' },
    { w: 0.44, h: 0.08, d: 0.26, x: 0, y: 1.08, z: 0.13, color: '#d6d0bc' },
  ];
  for (const x of [-1.08, 1.08]) parts.push({ w: 0.07, h: 0.66, d: 0.07, x, y: 0.42, z: 0.49, color: trim });
  return group(parts, `reception-desk-${variant}`);
}

function buildWardrobe(variant: number, accent: string, body: string): THREE.Group {
  const wood = variantColor(body, variant, 0.07);
  const trim = variantColor(accent, variant);
  const parts: PartSpec[] = [
    { w: 1.48, h: 2.16, d: 0.67, x: 0, y: 1.08, z: 0, color: wood },
    { w: 0.045, h: 2.0, d: 0.045, x: 0, y: 1.1, z: 0.345, color: trim },
    { w: 1.54, h: 0.1, d: 0.72, x: 0, y: 2.18, z: 0, color: trim },
    { w: 1.54, h: 0.1, d: 0.72, x: 0, y: 0.06, z: 0, color: trim },
  ];
  for (const x of [-0.37, 0.37]) {
    parts.push({ w: 0.63, h: 1.92, d: 0.04, x, y: 1.1, z: 0.355, color: variantColor(wood, variant, x) });
    parts.push({ w: 0.07, h: 0.18, d: 0.06, x: x < 0 ? -0.08 : 0.08, y: 1.08, z: 0.39, color: '#d6b85f', metalness: 0.68, shape: 'cylinder' });
  }
  for (const x of [-0.58, 0.58]) parts.push({ w: 0.11, h: 0.12, d: 0.11, x, y: 0.06, z: 0, color: trim });
  if (variant % 2) parts.push({ w: 0.5, h: 0.72, d: 0.025, x: -0.37, y: 1.25, z: 0.385, color: '#91afbd', metalness: 0.65, roughness: 0.2 });
  return group(parts, `wardrobe-${variant}`);
}

function buildSectional(variant: number, accent: string, body: string): THREE.Group {
  const fabric = variantColor(accent, variant);
  const leg = variantColor(body, variant, 0.1);
  const chaiseRight = variant % 2 === 0;
  const parts: PartSpec[] = [];
  for (const x of [-0.82, 0, 0.82]) {
    parts.push({ w: 0.74, h: 0.22, d: x === (chaiseRight ? 0.82 : -0.82) ? 1.55 : 0.78, x, y: 0.43, z: x === (chaiseRight ? 0.82 : -0.82) ? 0.34 : 0, color: fabric });
    parts.push({ w: 0.7, h: 0.13, d: 0.62, x, y: 0.62, z: -0.02, color: variantColor(fabric, variant, x * 0.03) });
    parts.push({ w: 0.72, h: 0.62, d: 0.16, x, y: 0.87, z: -0.34, color: fabric, rx: -0.05 });
  }
  for (const x of [-1.25, 1.25]) parts.push({ w: 0.22, h: 0.58, d: 0.86, x, y: 0.55, z: 0, color: fabric });
  for (const x of [-1.0, 1.0]) for (const z of [-0.26, 0.54]) parts.push({ w: 0.09, h: 0.25, d: 0.09, x, y: 0.125, z, color: leg, shape: variant % 3 ? 'cylinder' : 'box' });
  return group(parts, `sectional-${variant}`);
}

function buildHotelBed(variant: number, accent: string, body: string): THREE.Group {
  const frame = variantColor(body, variant, 0.06);
  const linen = variantColor('#e8e3d7', variant);
  const blanket = variantColor(accent, variant);
  return group([
    { w: 2.15, h: 0.32, d: 1.62, x: 0, y: 0.3, z: 0, color: frame },
    { w: 2.08, h: 0.28, d: 1.54, x: 0, y: 0.58, z: 0, color: linen },
    { w: 0.95, h: 0.18, d: 0.58, x: -0.52, y: 0.82, z: -0.42, color: '#f3efe7', rx: -0.06 },
    { w: 0.95, h: 0.18, d: 0.58, x: 0.52, y: 0.82, z: -0.42, color: '#f3efe7', rx: -0.06 },
    { w: 2.08, h: 0.13, d: 0.88 + (variant % 3) * 0.1, x: 0, y: 0.79, z: 0.28, color: blanket },
    { w: 2.2, h: 1.12 + variant * 0.02, d: 0.14, x: 0, y: 0.92, z: -0.78, color: frame },
    { w: 1.9, h: 0.66, d: 0.08, x: 0, y: 1.02, z: -0.86, color: variantColor(accent, variant, 0.08) },
    { w: 0.13, h: 0.32, d: 0.13, x: -0.9, y: 0.16, z: 0.64, color: frame },
    { w: 0.13, h: 0.32, d: 0.13, x: 0.9, y: 0.16, z: 0.64, color: frame },
  ], `hotel-bed-${variant}`);
}

function buildNightstand(variant: number, accent: string, body: string): THREE.Group {
  const shell = variantColor(body, variant, 0.06);
  const trim = variantColor(accent, variant);
  const parts: PartSpec[] = [
    { w: 0.62, h: 0.62, d: 0.56, x: 0, y: 0.36, z: 0, color: shell },
    { w: 0.68, h: 0.08, d: 0.62, x: 0, y: 0.7, z: 0, color: trim },
    { w: 0.54, h: 0.23, d: 0.035, x: 0, y: 0.49, z: 0.3, color: variantColor(shell, variant, 0.05) },
    { w: 0.2, h: 0.035, d: 0.05, x: 0, y: 0.49, z: 0.34, color: '#bfc4c7', metalness: 0.75 },
    { w: 0.52, h: 0.2, d: 0.035, x: 0, y: 0.19, z: 0.3, color: variantColor(shell, variant, 0.1) },
    { w: 0.055, h: 0.46, d: 0.055, x: 0, y: 0.95, z: 0, color: '#4b5055', shape: 'cylinder' },
    { w: 0.4, h: 0.34, d: 0.4, x: 0, y: 1.25, z: 0, color: '#f1d6a4', emissive: '#e5a948', emissiveIntensity: 0.48, shape: 'cone' },
  ];
  for (const x of [-0.24, 0.24]) for (const z of [-0.2, 0.2]) parts.push({ w: 0.06, h: 0.12, d: 0.06, x, y: 0.06, z, color: trim });
  return group(parts, `nightstand-${variant}`);
}

function buildWasher(variant: number, accent: string): THREE.Group {
  const shell = variantColor('#d8dadd', variant);
  const trim = variantColor(accent, variant);
  const parts: PartSpec[] = [
    { w: 0.9, h: 1.2, d: 0.84, x: 0, y: 0.6, z: 0, color: shell, metalness: 0.22 },
    { w: 0.7, h: 0.7, d: 0.07, x: 0, y: 0.55, z: 0.44, color: '#2d343c', shape: 'cylinder', rx: Math.PI / 2, metalness: 0.55 },
    { w: 0.52, h: 0.52, d: 0.085, x: 0, y: 0.55, z: 0.48, color: '#6fa6b6', emissive: '#244956', emissiveIntensity: 0.16, shape: 'cylinder', rx: Math.PI / 2, metalness: 0.65, roughness: 0.18 },
    { w: 0.8, h: 0.25, d: 0.06, x: 0, y: 1.04, z: 0.45, color: trim },
    { w: 0.16, h: 0.16, d: 0.05, x: -0.27, y: 1.06, z: 0.5, color: '#343b42', shape: 'cylinder', rx: Math.PI / 2 },
    { w: 0.28, h: 0.1, d: 0.045, x: 0.18, y: 1.08, z: 0.5, color: '#8fe1ec', emissive: '#3f9ead', emissiveIntensity: 0.42 },
  ];
  for (let index = 0; index < 3; index += 1) parts.push({ w: 0.06, h: 0.06, d: 0.04, x: 0.12 + index * 0.13, y: 0.98, z: 0.5, color: index === variant % 3 ? '#f5c949' : '#3f464b', shape: 'sphere' });
  for (const x of [-0.34, 0.34]) parts.push({ w: 0.09, h: 0.08, d: 0.09, x, y: 0.04, z: 0.28, color: '#25292d' });
  return group(parts, `washer-${variant}`);
}

function buildPhoneBooth(variant: number, accent: string): THREE.Group {
  const frame = variantColor(accent, variant);
  const glass = variantColor('#8db7c5', variant);
  const parts: PartSpec[] = [
    { w: 1.12, h: 0.13, d: 1.05, x: 0, y: 0.065, z: 0, color: frame },
    { w: 1.18, h: 0.2, d: 1.1, x: 0, y: 2.35, z: 0, color: frame },
    { w: 0.92, h: 0.22, d: 0.06, x: 0, y: 2.18, z: 0.55, color: '#f4e6b9', emissive: '#d8ae56', emissiveIntensity: 0.45 },
    { w: 0.86, h: 1.88, d: 0.035, x: 0, y: 1.1, z: -0.52, color: glass, metalness: 0.55, roughness: 0.12 },
    { w: 0.035, h: 1.88, d: 0.82, x: -0.54, y: 1.1, z: 0, color: glass, metalness: 0.55, roughness: 0.12 },
    { w: 0.035, h: 1.88, d: 0.82, x: 0.54, y: 1.1, z: 0, color: glass, metalness: 0.55, roughness: 0.12 },
  ];
  for (const x of [-0.52, 0.52]) for (const z of [-0.5, 0.5]) parts.push({ w: 0.08, h: 2.22, d: 0.08, x, y: 1.13, z, color: frame, metalness: 0.62 });
  parts.push(
    { w: 0.46, h: 0.82, d: 0.18, x: -0.18, y: 1.2, z: -0.39, color: '#252a30' },
    { w: 0.12, h: 0.5, d: 0.13, x: -0.36, y: 1.28, z: -0.27, color: frame, shape: 'capsule', rz: -0.08 },
    { w: 0.26, h: 0.3, d: 0.04, x: -0.08, y: 1.05, z: -0.28, color: '#ddd5bc' },
  );
  return group(parts, `phone-booth-${variant}`);
}

function buildBusShelter(variant: number, accent: string): THREE.Group {
  const frame = variantColor(accent, variant);
  const glass = variantColor('#7fa8b5', variant);
  const parts: PartSpec[] = [
    { w: 3.35, h: 0.16, d: 1.35, x: 0, y: 2.42, z: 0, color: frame, metalness: 0.48 },
    { w: 3.18, h: 2.12, d: 0.035, x: 0, y: 1.18, z: -0.68, color: glass, metalness: 0.55, roughness: 0.18 },
    { w: 1.85, h: 0.13, d: 0.5, x: 0, y: 0.55, z: -0.18, color: variantColor(frame, variant, 0.1) },
    { w: 1.85, h: 0.46, d: 0.1, x: 0, y: 0.82, z: -0.43, color: variantColor(frame, variant, 0.1) },
    { w: 0.55, h: 0.78, d: 0.04, x: variant % 2 ? -1.18 : 1.18, y: 1.45, z: -0.62, color: '#e1dbbd' },
  ];
  for (const x of [-1.58, 0, 1.58]) parts.push({ w: 0.09, h: 2.42, d: 0.09, x, y: 1.21, z: -0.64, color: frame, metalness: 0.62 });
  for (const x of [-0.72, 0.72]) parts.push({ w: 0.09, h: 0.55, d: 0.09, x, y: 0.275, z: -0.2, color: frame, metalness: 0.62 });
  parts.push({ w: 0.66, h: 0.18, d: 0.05, x: variant % 2 ? -1.18 : 1.18, y: 2.18, z: 0.02, color: '#e9d95f', emissive: '#917f24', emissiveIntensity: 0.3 });
  return group(parts, `bus-shelter-${variant}`);
}

function buildSwingSet(variant: number, accent: string): THREE.Group {
  const frame = variantColor(accent, variant);
  const chain = variantColor('#8b9297', variant);
  const parts: PartSpec[] = [
    { w: 0.13, h: 3.0, d: 0.13, x: 0, y: 2.42, z: 0, color: frame, metalness: 0.55, shape: 'cylinder', rz: Math.PI / 2 },
  ];
  for (const x of [-1.42, 1.42]) {
    parts.push({ w: 0.13, h: 2.58, d: 0.13, x, y: 1.2, z: -0.62, color: frame, metalness: 0.55, shape: 'cylinder', rz: x < 0 ? -0.14 : 0.14 });
    parts.push({ w: 0.13, h: 2.58, d: 0.13, x, y: 1.2, z: 0.62, color: frame, metalness: 0.55, shape: 'cylinder', rz: x < 0 ? -0.14 : 0.14 });
  }
  for (const center of [-0.68, 0.68]) {
    const sway = (variant % 3 - 1) * 0.08 * (center < 0 ? 1 : -1);
    for (const x of [center - 0.22, center + 0.22]) parts.push({ w: 0.035, h: 1.24, d: 0.035, x: x + sway, y: 1.77, z: 0, color: chain, metalness: 0.8, shape: 'cylinder', rz: sway });
    parts.push({ w: 0.56, h: 0.1, d: 0.36, x: center + sway * 2, y: 1.13, z: 0, color: variantColor(accent, variant, center), rx: sway });
  }
  return group(parts, `swing-set-${variant}`);
}

function buildPoolLounger(variant: number, accent: string): THREE.Group {
  const fabric = variantColor(accent, variant);
  const frame = variantColor('#d3d8d8', variant);
  const recline = -0.34 - (variant % 3) * 0.08;
  return group([
    { w: 1.18, h: 0.1, d: 0.62, x: 0.4, y: 0.43, z: 0, color: fabric, rx: -0.02 },
    { w: 0.85, h: 0.1, d: 0.62, x: -0.58, y: 0.67, z: 0, color: fabric, rz: recline },
    { w: 2.0, h: 0.07, d: 0.07, x: 0, y: 0.33, z: -0.31, color: frame, metalness: 0.7 },
    { w: 2.0, h: 0.07, d: 0.07, x: 0, y: 0.33, z: 0.31, color: frame, metalness: 0.7 },
    { w: 0.07, h: 0.5, d: 0.07, x: -0.78, y: 0.25, z: -0.27, color: frame, shape: 'cylinder' },
    { w: 0.07, h: 0.5, d: 0.07, x: -0.78, y: 0.25, z: 0.27, color: frame, shape: 'cylinder' },
    { w: 0.07, h: 0.5, d: 0.07, x: 0.82, y: 0.25, z: -0.27, color: frame, shape: 'cylinder' },
    { w: 0.07, h: 0.5, d: 0.07, x: 0.82, y: 0.25, z: 0.27, color: frame, shape: 'cylinder' },
    { w: 0.24, h: 0.24, d: 0.12, x: -0.92, y: 0.18, z: -0.33, color: '#252a2e', shape: 'torus', ry: Math.PI / 2 },
    { w: 0.24, h: 0.24, d: 0.12, x: -0.92, y: 0.18, z: 0.33, color: '#252a2e', shape: 'torus', ry: Math.PI / 2 },
  ], `pool-lounger-${variant}`);
}

function buildLifeguardChair(variant: number, accent: string): THREE.Group {
  const frame = variantColor(accent, variant);
  const seat = variantColor('#e7ded0', variant);
  const parts: PartSpec[] = [
    { w: 0.72, h: 0.13, d: 0.64, x: 0, y: 1.92, z: 0, color: seat },
    { w: 0.72, h: 0.72, d: 0.12, x: 0, y: 2.24, z: -0.28, color: seat },
    { w: 1.18, h: 0.12, d: 0.78, x: 0, y: 1.7, z: 0, color: frame },
  ];
  for (const x of [-0.5, 0.5]) for (const z of [-0.32, 0.32]) parts.push({ w: 0.1, h: 1.72, d: 0.1, x, y: 0.86, z, color: frame, shape: 'cylinder', rz: x * 0.08 });
  for (let step = 0; step < 4; step += 1) {
    parts.push({ w: 0.68, h: 0.08, d: 0.14, x: 0, y: 0.4 + step * 0.35, z: 0.48, color: frame });
  }
  parts.push(
    { w: 0.09, h: 0.9, d: 0.09, x: variant % 2 ? -0.52 : 0.52, y: 2.24, z: -0.15, color: frame, shape: 'cylinder' },
    { w: 1.2, h: 0.36, d: 1.2, x: variant % 2 ? -0.52 : 0.52, y: 2.75, z: -0.15, color: variantColor(accent, variant, 0.18), shape: 'cone' },
  );
  return group(parts, `lifeguard-chair-${variant}`);
}

function buildStreetlight(variant: number, accent: string): THREE.Group {
  const metal = variantColor('#414950', variant);
  const glow = variantColor(accent, variant, 0.12);
  const doubleLamp = variant % 3 === 2;
  const parts: PartSpec[] = [
    { w: 0.65, h: 0.18, d: 0.65, x: 0, y: 0.09, z: 0, color: metal, shape: 'cylinder' },
    { w: 0.16, h: 4.55, d: 0.16, x: 0, y: 2.35, z: 0, color: metal, metalness: 0.65, shape: 'cylinder' },
    { w: 0.28, h: 0.28, d: 0.28, x: 0, y: 4.66, z: 0, color: metal, shape: 'sphere' },
  ];
  for (const direction of doubleLamp ? [-1, 1] : [1]) {
    parts.push({ w: 0.08, h: 0.82, d: 0.08, x: direction * 0.33, y: 4.8, z: 0, color: metal, shape: 'cylinder', rz: direction * Math.PI / 2 });
    parts.push({ w: 0.48, h: 0.34, d: 0.48, x: direction * 0.72, y: 4.78, z: 0, color: glow, emissive: glow, emissiveIntensity: 1.1, shape: variant % 2 ? 'sphere' : 'cylinder' });
    parts.push({ w: 0.58, h: 0.12, d: 0.58, x: direction * 0.72, y: 4.98, z: 0, color: metal, shape: 'cone' });
  }
  return group(parts, `streetlight-${variant}`);
}

function buildPalletStack(variant: number, accent: string, body: string): THREE.Group {
  const wood = variantColor(body, variant, 0.05);
  const cargo = variantColor(accent, variant);
  const parts: PartSpec[] = [];
  const levels = 2 + (variant % 3);
  for (let level = 0; level < levels; level += 1) {
    const y = level * 0.28;
    for (let board = 0; board < 5; board += 1) parts.push({ w: 1.42, h: 0.07, d: 0.18, x: 0, y: y + 0.08, z: -0.48 + board * 0.24, color: variantColor(wood, variant, board * 0.015) });
    for (const x of [-0.56, 0, 0.56]) parts.push({ w: 0.16, h: 0.12, d: 1.12, x, y: y + 0.18, z: 0, color: darkColor(wood) });
  }
  parts.push(
    { w: 1.1, h: 0.58 + variant * 0.03, d: 0.92, x: 0, y: levels * 0.28 + 0.28, z: 0, color: cargo },
    { w: 1.14, h: 0.07, d: 0.96, x: 0, y: levels * 0.28 + 0.58, z: 0, color: '#d8cfb5' },
  );
  return group(parts, `pallet-stack-${variant}`);
}

function buildServerRack(variant: number, accent: string): THREE.Group {
  const shell = variantColor('#30363d', variant);
  const glow = variantColor(accent, variant);
  const parts: PartSpec[] = [
    { w: 0.86, h: 2.06, d: 0.9, x: 0, y: 1.03, z: 0, color: shell, metalness: 0.45 },
    { w: 0.72, h: 1.78, d: 0.035, x: 0, y: 1.04, z: 0.47, color: '#13181d' },
    { w: 0.76, h: 0.12, d: 0.94, x: 0, y: 2.08, z: 0, color: variantColor(shell, variant, 0.08) },
  ];
  for (let row = 0; row < 8; row += 1) {
    const y = 0.25 + row * 0.21;
    parts.push({ w: 0.64, h: 0.14, d: 0.045, x: 0, y, z: 0.5, color: variantColor('#48515a', variant, row * 0.015), metalness: 0.55 });
    for (let light = 0; light < 3; light += 1) parts.push({ w: 0.035, h: 0.035, d: 0.025, x: -0.24 + light * 0.1, y, z: 0.53, color: light === (row + variant) % 3 ? glow : '#4fe57f', emissive: light === (row + variant) % 3 ? glow : '#268545', emissiveIntensity: 0.8, shape: 'sphere' });
    parts.push({ w: 0.18, h: 0.03, d: 0.025, x: 0.2, y, z: 0.53, color: '#1e2428' });
  }
  return group(parts, `server-rack-${variant}`);
}

function buildAquariumTank(variant: number, accent: string): THREE.Group {
  const frame = variantColor(accent, variant);
  const water = variantColor('#58b8c9', variant);
  const parts: PartSpec[] = [
    { w: 2.05, h: 0.58, d: 0.76, x: 0, y: 0.29, z: 0, color: darkColor(frame) },
    { w: 1.98, h: 1.12, d: 0.7, x: 0, y: 1.17, z: 0, color: water, emissive: '#1e7184', emissiveIntensity: 0.26, metalness: 0.4, roughness: 0.18 },
    { w: 2.12, h: 0.1, d: 0.8, x: 0, y: 0.62, z: 0, color: frame, metalness: 0.4 },
    { w: 2.12, h: 0.12, d: 0.8, x: 0, y: 1.76, z: 0, color: frame, metalness: 0.4 },
  ];
  for (const x of [-0.97, 0.97]) parts.push({ w: 0.08, h: 1.18, d: 0.76, x, y: 1.18, z: 0, color: frame, metalness: 0.45 });
  for (let rock = 0; rock < 5; rock += 1) {
    parts.push({ w: 0.22 + (rock % 2) * 0.1, h: 0.18 + ((rock + variant) % 3) * 0.07, d: 0.18, x: -0.72 + rock * 0.36, y: 0.76, z: -0.12 + (rock % 2) * 0.22, color: variantColor('#806e5d', variant, rock * 0.04), shape: 'sphere' });
  }
  for (let fish = 0; fish < 3; fish += 1) {
    const x = -0.56 + fish * 0.56;
    const y = 1.05 + ((fish + variant) % 3) * 0.2;
    parts.push({ w: 0.34, h: 0.16, d: 0.12, x, y, z: 0.38, color: variantColor(accent, variant, fish * 0.18), shape: 'sphere' });
    parts.push({ w: 0.16, h: 0.18, d: 0.06, x: x - 0.22, y, z: 0.38, color: variantColor(accent, variant, fish * 0.18), shape: 'cone', rz: -Math.PI / 2 });
  }
  return group(parts, `aquarium-tank-${variant}`);
}

/** Additional set-specific props that let coherent scenes furnish themselves richly. */
function buildSceneExpansion(
  kind: PropKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const color = variantColor(accent, variant);
  const bodyColor = variantColor(body, variant, 0.06);
  const metal = variantColor('#727c83', variant);
  const dark = variantColor('#242a2f', variant);
  const glow = variantColor('#86e5ff', variant, 0.08);
  const wheel = (x: number, z: number): PartSpec => ({
    w: 0.16,
    h: 0.16,
    d: 0.1,
    x,
    y: 0.08,
    z,
    color: '#171b1e',
    shape: 'torus',
    ry: Math.PI / 2,
  });

  switch (kind) {
    case 'medical_cart': {
      const parts: PartSpec[] = [
        { w: 0.94, h: 0.82, d: 0.64, x: 0, y: 0.62, z: 0, color, metalness: 0.28 },
        { w: 1.02, h: 0.1, d: 0.7, x: 0, y: 1.08, z: 0, color: '#e1e4df' },
        { w: 0.08, h: 0.34, d: 0.08, x: -0.52, y: 1.12, z: -0.2, color: metal, shape: 'cylinder' },
        { w: 0.42, h: 0.08, d: 0.08, x: -0.68, y: 1.28, z: -0.2, color: metal, shape: 'cylinder', rz: Math.PI / 2 },
      ];
      for (let drawer = 0; drawer < 3; drawer += 1) {
        const y = 0.42 + drawer * 0.25;
        parts.push({ w: 0.82, h: 0.2, d: 0.035, x: 0, y, z: 0.335, color: variantColor(color, variant, drawer * 0.025) });
        parts.push({ w: 0.28, h: 0.035, d: 0.05, x: 0, y, z: 0.37, color: metal, metalness: 0.75 });
      }
      parts.push(wheel(-0.34, -0.24), wheel(0.34, -0.24), wheel(-0.34, 0.24), wheel(0.34, 0.24));
      return group(parts, `medical-cart-${variant}`);
    }
    case 'privacy_screen': {
      const fabric = variantColor('#c8d8d4', variant);
      const parts: PartSpec[] = [];
      for (let panel = -1; panel <= 1; panel += 1) {
        const angle = panel * (0.08 + variant * 0.008);
        parts.push({ w: 0.68, h: 1.48, d: 0.045, x: panel * 0.72, y: 1.05, z: Math.abs(panel) * 0.08, color: fabric, ry: angle });
        parts.push({ w: 0.055, h: 1.76, d: 0.055, x: panel * 0.72 - 0.34, y: 0.96, z: Math.abs(panel) * 0.08, color: metal, shape: 'cylinder' });
      }
      parts.push(
        { w: 0.055, h: 1.76, d: 0.055, x: 1.06, y: 0.96, z: 0.08, color: metal, shape: 'cylinder' },
        { w: 0.5, h: 0.06, d: 0.44, x: -1.06, y: 0.06, z: 0.08, color: metal },
        { w: 0.5, h: 0.06, d: 0.44, x: 1.06, y: 0.06, z: 0.08, color: metal },
      );
      return group(parts, `privacy-screen-${variant}`);
    }
    case 'copy_machine':
      return group([
        { w: 1.02, h: 0.88, d: 0.8, x: 0, y: 0.48, z: 0, color: bodyColor },
        { w: 1.1, h: 0.36, d: 0.86, x: 0, y: 1.03, z: 0, color: color },
        { w: 0.96, h: 0.1, d: 0.72, x: 0, y: 1.28, z: -0.04, color: dark, rx: -0.06 },
        { w: 0.52, h: 0.06, d: 0.38, x: 0.14, y: 1.34, z: -0.08, color: '#b7d5db', metalness: 0.25 },
        { w: 0.48, h: 0.1, d: 0.5, x: 0, y: 0.74, z: 0.43, color: '#11171b' },
        { w: 0.34, h: 0.2, d: 0.045, x: -0.28, y: 1.12, z: 0.45, color: glow, emissive: glow, emissiveIntensity: 0.45 },
        { w: 0.08, h: 0.08, d: 0.04, x: 0.05, y: 1.12, z: 0.45, color: '#78de76', emissive: '#3aa63c', emissiveIntensity: 0.35, shape: 'sphere' },
        { w: 0.62, h: 0.035, d: 0.42, x: 0, y: 0.78, z: 0.54, color: '#e8e8df' },
      ], `copy-machine-${variant}`);
    case 'archive_trolley': {
      const parts: PartSpec[] = [
        { w: 1.16, h: 0.08, d: 0.66, x: 0, y: 0.28, z: 0, color: metal, metalness: 0.62 },
        { w: 1.16, h: 0.08, d: 0.66, x: 0, y: 0.78, z: 0, color: metal, metalness: 0.62 },
        { w: 1.16, h: 0.08, d: 0.66, x: 0, y: 1.22, z: 0, color: metal, metalness: 0.62 },
      ];
      for (const x of [-0.53, 0.53]) parts.push({ w: 0.07, h: 1.2, d: 0.07, x, y: 0.72, z: 0, color: metal, shape: 'cylinder' });
      for (let book = 0; book < 6; book += 1) {
        parts.push({ w: 0.12 + (book % 2) * 0.04, h: 0.36 + ((book + variant) % 3) * 0.06, d: 0.46, x: -0.45 + book * 0.18, y: book % 2 ? 1.02 : 0.56, z: 0, color: variantColor(color, variant, book * 0.08), rz: (book % 3 - 1) * 0.06 });
      }
      parts.push(wheel(-0.45, -0.22), wheel(0.45, -0.22), wheel(-0.45, 0.22), wheel(0.45, 0.22));
      return group(parts, `archive-trolley-${variant}`);
    }
    case 'ticket_gate':
      return group([
        { w: 0.48, h: 1.06, d: 0.66, x: -0.52, y: 0.53, z: 0, color: bodyColor, metalness: 0.45 },
        { w: 0.48, h: 1.06, d: 0.66, x: 0.52, y: 0.53, z: 0, color: bodyColor, metalness: 0.45 },
        { w: 0.54, h: 0.1, d: 0.72, x: -0.52, y: 1.08, z: 0, color },
        { w: 0.54, h: 0.1, d: 0.72, x: 0.52, y: 1.08, z: 0, color },
        { w: 0.3, h: 0.18, d: 0.04, x: -0.52, y: 1.15, z: 0.27, color: glow, emissive: glow, emissiveIntensity: 0.55 },
        { w: 0.42, h: 0.62, d: 0.035, x: -0.22, y: 0.64, z: 0, color: variantColor('#8bd7e5', variant), metalness: 0.35, ry: variant % 2 ? 0.18 : -0.18 },
        { w: 0.42, h: 0.62, d: 0.035, x: 0.22, y: 0.64, z: 0, color: variantColor('#8bd7e5', variant), metalness: 0.35, ry: variant % 2 ? -0.18 : 0.18 },
      ], `ticket-gate-${variant}`);
    case 'departure_board': {
      const parts: PartSpec[] = [
        { w: 2.12, h: 1.18, d: 0.16, x: 0, y: 1.55, z: 0, color: dark },
        { w: 1.98, h: 1.02, d: 0.035, x: 0, y: 1.55, z: 0.1, color: '#0b151a' },
        { w: 0.11, h: 1.12, d: 0.11, x: -0.78, y: 0.58, z: 0, color: metal, shape: 'cylinder' },
        { w: 0.11, h: 1.12, d: 0.11, x: 0.78, y: 0.58, z: 0, color: metal, shape: 'cylinder' },
        { w: 1.82, h: 0.08, d: 0.04, x: 0, y: 1.98, z: 0.13, color, emissive: color, emissiveIntensity: 0.32 },
      ];
      for (let row = 0; row < 5; row += 1) {
        const y = 1.8 - row * 0.18;
        parts.push({ w: 0.72 + ((row + variant) % 3) * 0.18, h: 0.035, d: 0.025, x: -0.35, y, z: 0.13, color: row % 2 ? '#f2d96b' : glow, emissive: row % 2 ? '#836b18' : '#367f8d', emissiveIntensity: 0.28 });
        parts.push({ w: 0.32, h: 0.035, d: 0.025, x: 0.65, y, z: 0.13, color: '#d9dfdb' });
      }
      return group(parts, `departure-board-${variant}`);
    }
    case 'shopping_cart': {
      const parts: PartSpec[] = [
        { w: 1.08, h: 0.62, d: 0.72, x: 0.08, y: 0.66, z: 0, color: metal, metalness: 0.75 },
        { w: 1.18, h: 0.08, d: 0.78, x: 0.02, y: 0.34, z: 0, color: metal, metalness: 0.75 },
        { w: 0.08, h: 0.78, d: 0.08, x: -0.52, y: 0.78, z: 0, color: metal, shape: 'cylinder', rz: -0.22 },
        { w: 0.08, h: 0.82, d: 0.08, x: 0.58, y: 0.76, z: 0, color: metal, shape: 'cylinder', rz: 0.12 },
        { w: 0.08, h: 0.88, d: 0.08, x: -0.66, y: 1.08, z: 0, color, shape: 'cylinder', rz: Math.PI / 2 },
      ];
      for (let rail = -2; rail <= 2; rail += 1) parts.push({ w: 1.02, h: 0.035, d: 0.035, x: 0.08, y: 0.47 + (rail + 2) * 0.13, z: rail * 0.13, color: metal, metalness: 0.75 });
      parts.push(wheel(-0.42, -0.25), wheel(0.5, -0.25), wheel(-0.42, 0.25), wheel(0.5, 0.25));
      return group(parts, `shopping-cart-${variant}`);
    }
    case 'retail_display': {
      const parts: PartSpec[] = [
        { w: 1.52, h: 0.22, d: 0.94, x: 0, y: 0.11, z: 0, color: bodyColor },
        { w: 0.42, h: 1.42, d: 0.42, x: 0, y: 0.82, z: 0, color: color },
      ];
      for (const y of [0.48, 0.92, 1.36]) {
        parts.push({ w: 1.42, h: 0.08, d: 0.86, x: 0, y, z: 0, color: bodyColor });
      }
      for (let item = 0; item < 8; item += 1) {
        const side = item % 2 ? -1 : 1;
        parts.push({ w: 0.18 + (item % 3) * 0.04, h: 0.24 + ((item + variant) % 3) * 0.08, d: 0.2, x: side * (0.32 + (item % 4) * 0.1), y: 0.64 + Math.floor(item / 3) * 0.43, z: (item % 3 - 1) * 0.22, color: variantColor(color, variant, item * 0.1) });
      }
      return group(parts, `retail-display-${variant}`);
    }
    case 'chalkboard': {
      const chalk = variantColor('#d7d3bd', variant);
      const parts: PartSpec[] = [
        { w: 2.3, h: 1.35, d: 0.08, x: 0, y: 1.18, z: 0, color: variantColor('#31524b', variant), roughness: 0.92 },
        { w: 2.44, h: 0.08, d: 0.14, x: 0, y: 1.88, z: 0, color: bodyColor },
        { w: 2.44, h: 0.08, d: 0.14, x: 0, y: 0.48, z: 0, color: bodyColor },
        { w: 0.08, h: 1.48, d: 0.14, x: -1.18, y: 1.18, z: 0, color: bodyColor },
        { w: 0.08, h: 1.48, d: 0.14, x: 1.18, y: 1.18, z: 0, color: bodyColor },
        { w: 1.64, h: 0.08, d: 0.24, x: 0, y: 0.42, z: 0.12, color: bodyColor },
      ];
      for (let mark = 0; mark < 5; mark += 1) parts.push({ w: 0.28 + ((mark + variant) % 3) * 0.16, h: 0.025, d: 0.018, x: -0.75 + mark * 0.38, y: 1.18 + (mark % 3 - 1) * 0.24, z: 0.052, color: chalk, rz: (mark % 2 ? -1 : 1) * 0.18 });
      return group(parts, `chalkboard-${variant}`);
    }
    case 'lab_bench': {
      const parts: PartSpec[] = [
        { w: 2.16, h: 0.13, d: 0.9, x: 0, y: 0.92, z: 0, color: dark },
        { w: 0.58, h: 0.82, d: 0.82, x: -0.72, y: 0.44, z: 0, color: bodyColor },
        { w: 0.58, h: 0.82, d: 0.82, x: 0.72, y: 0.44, z: 0, color: bodyColor },
        { w: 2.05, h: 0.08, d: 0.32, x: 0, y: 1.42, z: -0.28, color: metal },
        { w: 0.08, h: 0.52, d: 0.08, x: -0.88, y: 1.18, z: -0.28, color: metal, shape: 'cylinder' },
        { w: 0.08, h: 0.52, d: 0.08, x: 0.88, y: 1.18, z: -0.28, color: metal, shape: 'cylinder' },
        { w: 0.58, h: 0.055, d: 0.38, x: 0.35, y: 1.0, z: 0.1, color: '#89aeb5', metalness: 0.48 },
        { w: 0.06, h: 0.38, d: 0.06, x: 0.56, y: 1.18, z: -0.02, color: metal, shape: 'cylinder', rz: 0.4 },
      ];
      for (let flask = 0; flask < 3; flask += 1) parts.push({ w: 0.18, h: 0.3 + flask * 0.06, d: 0.18, x: -0.5 + flask * 0.25, y: 1.12 + flask * 0.03, z: -0.15, color: variantColor(color, variant, flask * 0.14), emissive: flask === variant % 3 ? color : undefined, emissiveIntensity: 0.28, shape: flask % 2 ? 'sphere' : 'cylinder' });
      return group(parts, `lab-bench-${variant}`);
    }
    case 'tool_chest': {
      const parts: PartSpec[] = [
        { w: 1.06, h: 1.12, d: 0.66, x: 0, y: 0.62, z: 0, color, metalness: 0.38 },
        { w: 1.12, h: 0.1, d: 0.7, x: 0, y: 1.2, z: 0, color: dark },
        { w: 0.42, h: 0.08, d: 0.08, x: 0.68, y: 0.98, z: 0, color: metal, shape: 'cylinder', rz: Math.PI / 2 },
      ];
      for (let drawer = 0; drawer < 5; drawer += 1) {
        const y = 0.28 + drawer * 0.18;
        parts.push({ w: 0.92, h: 0.14, d: 0.035, x: 0, y, z: 0.345, color: variantColor(color, variant, drawer * 0.02) });
        parts.push({ w: 0.34, h: 0.03, d: 0.045, x: 0, y, z: 0.38, color: metal, metalness: 0.8 });
      }
      parts.push(wheel(-0.38, -0.24), wheel(0.38, -0.24), wheel(-0.38, 0.24), wheel(0.38, 0.24));
      return group(parts, `tool-chest-${variant}`);
    }
    case 'drum_stack': {
      const parts: PartSpec[] = [];
      const drums = [
        { x: -0.42, y: 0.58, z: 0.06 },
        { x: 0.42, y: 0.58, z: -0.08 },
        { x: 0, y: 1.42, z: 0.04 },
      ];
      drums.forEach((position, index) => {
        const drumColor = variantColor(color, variant, index * 0.09);
        parts.push({ w: 0.7, h: 1.02, d: 0.7, ...position, color: drumColor, shape: 'cylinder', metalness: 0.35 });
        parts.push({ w: 0.73, h: 0.07, d: 0.73, x: position.x, y: position.y + 0.48, z: position.z, color: metal, shape: 'cylinder', metalness: 0.7 });
        parts.push({ w: 0.73, h: 0.07, d: 0.73, x: position.x, y: position.y - 0.48, z: position.z, color: metal, shape: 'cylinder', metalness: 0.7 });
        parts.push({ w: 0.72, h: 0.045, d: 0.72, x: position.x, y: position.y, z: position.z, color: '#e7dfb3', shape: 'cylinder' });
      });
      return group(parts, `drum-stack-${variant}`);
    }
    case 'luggage_cart': {
      const brass = variantColor('#b89b54', variant);
      const parts: PartSpec[] = [
        { w: 1.3, h: 0.15, d: 0.8, x: 0, y: 0.18, z: 0, color: brass, metalness: 0.72 },
        { w: 1.18, h: 0.08, d: 0.7, x: 0, y: 0.3, z: 0, color: variantColor('#7d4d36', variant) },
        { w: 0.08, h: 1.7, d: 0.08, x: -0.56, y: 1.05, z: 0, color: brass, shape: 'cylinder' },
        { w: 0.08, h: 1.7, d: 0.08, x: 0.56, y: 1.05, z: 0, color: brass, shape: 'cylinder' },
        { w: 1.16, h: 0.08, d: 0.08, x: 0, y: 1.9, z: 0, color: brass, shape: 'cylinder', rz: Math.PI / 2 },
        { w: 0.62, h: 0.48, d: 0.42, x: -0.24, y: 0.6, z: 0.02, color: bodyColor },
        { w: 0.42, h: 0.64, d: 0.34, x: 0.34, y: 0.7, z: -0.04, color },
        { w: 0.28, h: 0.12, d: 0.05, x: 0.34, y: 1.05, z: -0.04, color: dark, shape: 'torus' },
      ];
      parts.push(wheel(-0.48, -0.28), wheel(0.48, -0.28), wheel(-0.48, 0.28), wheel(0.48, 0.28));
      return group(parts, `luggage-cart-${variant}`);
    }
    case 'room_service': {
      const parts: PartSpec[] = [
        { w: 1.22, h: 0.1, d: 0.74, x: 0, y: 0.34, z: 0, color: metal, metalness: 0.58 },
        { w: 1.22, h: 0.1, d: 0.74, x: 0, y: 0.92, z: 0, color: bodyColor },
        { w: 0.07, h: 0.86, d: 0.07, x: -0.52, y: 0.54, z: -0.28, color: metal, shape: 'cylinder' },
        { w: 0.07, h: 0.86, d: 0.07, x: 0.52, y: 0.54, z: -0.28, color: metal, shape: 'cylinder' },
        { w: 0.07, h: 0.86, d: 0.07, x: -0.52, y: 0.54, z: 0.28, color: metal, shape: 'cylinder' },
        { w: 0.07, h: 0.86, d: 0.07, x: 0.52, y: 0.54, z: 0.28, color: metal, shape: 'cylinder' },
        { w: 0.48, h: 0.2, d: 0.48, x: -0.28, y: 1.06, z: 0, color: '#e5e0d4', shape: 'cylinder' },
        { w: 0.42, h: 0.36, d: 0.42, x: 0.3, y: 1.12, z: 0, color, metalness: 0.5, shape: 'sphere' },
        { w: 0.08, h: 0.12, d: 0.08, x: 0.3, y: 1.34, z: 0, color: metal, shape: 'sphere' },
      ];
      parts.push(wheel(-0.46, -0.24), wheel(0.46, -0.24), wheel(-0.46, 0.24), wheel(0.46, 0.24));
      return group(parts, `room-service-${variant}`);
    }
    case 'traffic_cone': {
      const parts: PartSpec[] = [];
      const cones = [
        { x: -0.36, z: 0.1, scale: 1 },
        { x: 0.34, z: -0.12, scale: 0.86 + variant * 0.02 },
        { x: 0.02, z: 0.3, scale: 0.72 + (variant % 3) * 0.08 },
      ];
      for (const cone of cones) {
        parts.push({ w: 0.62 * cone.scale, h: 0.1, d: 0.62 * cone.scale, x: cone.x, y: 0.05, z: cone.z, color: dark });
        parts.push({ w: 0.46 * cone.scale, h: 0.82 * cone.scale, d: 0.46 * cone.scale, x: cone.x, y: 0.48 * cone.scale, z: cone.z, color: variantColor('#f27b2c', variant), shape: 'cone' });
        parts.push({ w: 0.36 * cone.scale, h: 0.12, d: 0.36 * cone.scale, x: cone.x, y: 0.38 * cone.scale, z: cone.z, color: '#eee9dc', shape: 'cylinder' });
      }
      return group(parts, `traffic-cone-${variant}`);
    }
    case 'exercise_bike':
      return group([
        { w: 1.25, h: 0.1, d: 0.48, x: 0, y: 0.08, z: 0, color: dark },
        { w: 0.12, h: 0.9, d: 0.12, x: -0.2, y: 0.6, z: 0, color: metal, shape: 'cylinder', rz: -0.45 },
        { w: 0.12, h: 1.16, d: 0.12, x: 0.28, y: 0.76, z: 0, color, shape: 'cylinder', rz: 0.45 },
        { w: 0.72, h: 0.72, d: 0.18, x: -0.18, y: 0.52, z: 0, color: dark, shape: 'torus', ry: Math.PI / 2 },
        { w: 0.48, h: 0.12, d: 0.38, x: 0.18, y: 1.2, z: 0, color: bodyColor },
        { w: 0.62, h: 0.09, d: 0.09, x: 0.56, y: 1.38, z: 0, color: metal, shape: 'cylinder', rz: Math.PI / 2 },
        { w: 0.38, h: 0.28, d: 0.08, x: 0.3, y: 1.55, z: 0, color: glow, emissive: glow, emissiveIntensity: 0.42 },
        { w: 0.52, h: 0.07, d: 0.07, x: -0.18, y: 0.52, z: 0, color: metal, shape: 'cylinder', rz: Math.PI / 2 },
        { w: 0.26, h: 0.08, d: 0.12, x: -0.48, y: 0.52, z: 0, color: dark },
        { w: 0.26, h: 0.08, d: 0.12, x: 0.12, y: 0.52, z: 0, color: dark },
      ], `exercise-bike-${variant}`);
    case 'cinema_seat':
      return group([
        { w: 0.7, h: 0.18, d: 0.66, x: 0, y: 0.52, z: 0.05, color },
        { w: 0.7, h: 0.82 + variant * 0.025, d: 0.16, x: 0, y: 0.93, z: -0.27, color, rx: -0.06 },
        { w: 0.13, h: 0.62, d: 0.68, x: -0.4, y: 0.63, z: 0, color: dark },
        { w: 0.13, h: 0.62, d: 0.68, x: 0.4, y: 0.63, z: 0, color: dark },
        { w: 0.11, h: 0.48, d: 0.11, x: -0.28, y: 0.24, z: -0.2, color: metal, shape: 'cylinder' },
        { w: 0.11, h: 0.48, d: 0.11, x: 0.28, y: 0.24, z: -0.2, color: metal, shape: 'cylinder' },
        { w: 0.23, h: 0.18, d: 0.23, x: variant % 2 ? -0.42 : 0.42, y: 0.91, z: 0.12, color: dark, shape: 'cylinder' },
        { w: 0.15, h: 0.22, d: 0.15, x: variant % 2 ? -0.42 : 0.42, y: 0.93, z: 0.12, color: '#111518', shape: 'cylinder' },
      ], `cinema-seat-${variant}`);
    case 'pool_ladder': {
      const parts: PartSpec[] = [
        { w: 0.11, h: 1.52, d: 0.11, x: -0.38, y: 0.82, z: 0, color: metal, metalness: 0.82, shape: 'cylinder' },
        { w: 0.11, h: 1.52, d: 0.11, x: 0.38, y: 0.82, z: 0, color: metal, metalness: 0.82, shape: 'cylinder' },
        { w: 0.52, h: 0.52, d: 0.11, x: -0.62, y: 1.42, z: 0, color: metal, metalness: 0.82, shape: 'torus', rz: Math.PI / 2 },
        { w: 0.52, h: 0.52, d: 0.11, x: 0.62, y: 1.42, z: 0, color: metal, metalness: 0.82, shape: 'torus', rz: Math.PI / 2 },
      ];
      for (let step = 0; step < 4; step += 1) parts.push({ w: 0.72, h: 0.08, d: 0.22, x: 0, y: 0.28 + step * 0.28, z: 0, color: variantColor(color, variant, step * 0.04), metalness: 0.55 });
      parts.push(
        { w: 0.34, h: 0.08, d: 0.34, x: -0.66, y: 0.08, z: 0, color: dark, shape: 'cylinder' },
        { w: 0.34, h: 0.08, d: 0.34, x: 0.66, y: 0.08, z: 0, color: dark, shape: 'cylinder' },
      );
      return group(parts, `pool-ladder-${variant}`);
    }
    default:
      return group([
        { w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0, color },
      ], `scene-expansion-${variant}`);
  }
}

/** The current content wave: service, transit, clinic, market, and outdoor furniture. */
function buildIterationExpansion(
  kind: PropKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const color = variantColor(accent, variant);
  const secondary = variantColor(body, variant, 0.08);
  const metal = variantColor('#68757b', variant);
  const dark = variantColor('#252b2e', variant);
  const glow = variantColor('#93e9ff', variant, 0.06);
  const foot = (x: number, z: number): PartSpec => ({
    w: 0.12,
    h: 0.12,
    d: 0.12,
    x,
    y: 0.06,
    z,
    color: dark,
    shape: 'sphere',
  });

  switch (kind) {
    case 'utility_shelf': {
      const parts: PartSpec[] = [];
      for (const x of [-0.7, 0.7]) {
        for (const z of [-0.24, 0.24]) {
          parts.push({ w: 0.07, h: 1.96, d: 0.07, x, y: 1, z, color: metal, shape: 'cylinder' });
        }
      }
      for (let shelf = 0; shelf < 4; shelf += 1) {
        const y = 0.18 + shelf * 0.56;
        parts.push({ w: 1.48, h: 0.08, d: 0.55, x: 0, y, z: 0, color: metal, metalness: 0.58 });
        for (let box = 0; box < 2; box += 1) {
          const width = 0.42 + ((shelf + box + variant) % 3) * 0.09;
          parts.push({ w: width, h: 0.26 + ((box + variant) % 2) * 0.1, d: 0.42, x: (box ? 0.38 : -0.38) + (shelf % 2) * 0.06, y: y + 0.18, z: 0.02, color: variantColor(color, variant, shelf * 0.07 + box * 0.13) });
        }
      }
      return group(parts, `utility-shelf-${variant}`);
    }
    case 'breaker_panel': {
      const parts: PartSpec[] = [
        { w: 0.88, h: 1.5, d: 0.26, x: 0, y: 0.83, z: 0, color: metal, metalness: 0.48 },
        { w: 0.78, h: 1.3, d: 0.035, x: 0, y: 0.83, z: 0.15, color: secondary },
        { w: 0.64, h: 0.18, d: 0.035, x: 0, y: 1.37, z: 0.19, color: dark },
      ];
      for (let row = 0; row < 5; row += 1) {
        for (const x of [-0.2, 0.2]) {
          parts.push({ w: 0.13, h: 0.08, d: 0.07, x, y: 0.48 + row * 0.18, z: 0.19, color: (row + variant) % 4 === 0 ? color : dark, rz: x > 0 ? 0.12 : -0.12 });
        }
      }
      for (const x of [-0.27, 0, 0.27]) parts.push({ w: 0.06, h: 0.34, d: 0.06, x, y: 0.17, z: -0.03, color: metal, shape: 'cylinder' });
      return group(parts, `breaker-panel-${variant}`);
    }
    case 'boiler': {
      const parts: PartSpec[] = [
        { w: 1.1, h: 1.85, d: 1.1, x: 0, y: 1.12, z: 0, color: secondary, shape: 'cylinder', metalness: 0.4 },
        { w: 1.16, h: 0.08, d: 1.16, x: 0, y: 0.34, z: 0, color: metal, shape: 'torus', rx: Math.PI / 2 },
        { w: 1.16, h: 0.08, d: 1.16, x: 0, y: 1.2, z: 0, color: metal, shape: 'torus', rx: Math.PI / 2 },
        { w: 1.16, h: 0.08, d: 1.16, x: 0, y: 1.92, z: 0, color: metal, shape: 'torus', rx: Math.PI / 2 },
        { w: 0.2, h: 0.72, d: 0.2, x: -0.46, y: 2.05, z: 0, color: metal, shape: 'cylinder' },
        { w: 0.2, h: 0.72, d: 0.2, x: 0.46, y: 2.05, z: 0, color: metal, shape: 'cylinder' },
        { w: 0.38, h: 0.38, d: 0.12, x: 0, y: 1.36, z: 0.56, color: '#e8e3ce', shape: 'cylinder', rx: Math.PI / 2 },
        { w: 0.035, h: 0.16, d: 0.035, x: 0.04, y: 1.42, z: 0.64, color: '#c33', shape: 'cylinder', rz: (variant - 3.5) * 0.1 },
      ];
      parts.push(foot(-0.42, -0.36), foot(0.42, -0.36), foot(-0.42, 0.36), foot(0.42, 0.36));
      return group(parts, `boiler-${variant}`);
    }
    case 'pipe_cluster': {
      const parts: PartSpec[] = [];
      for (let pipe = 0; pipe < 5; pipe += 1) {
        const x = -0.62 + pipe * 0.31;
        const radius = 0.1 + (pipe % 3) * 0.035;
        parts.push({ w: radius, h: 2.25 - (pipe % 2) * 0.34, d: radius, x, y: 1.16, z: (pipe % 2) * 0.16, color: variantColor(metal, variant, pipe * 0.03), shape: 'cylinder', metalness: 0.62 });
        parts.push({ w: radius * 2.2, h: 0.08, d: radius * 2.2, x, y: 0.52 + pipe * 0.27, z: (pipe % 2) * 0.16, color: color, shape: 'torus', rx: Math.PI / 2 });
      }
      parts.push({ w: 1.42, h: 0.14, d: 0.14, x: 0, y: 1.86, z: 0.05, color: metal, shape: 'cylinder', rz: Math.PI / 2 });
      return group(parts, `pipe-cluster-${variant}`);
    }
    case 'folding_table': {
      const parts: PartSpec[] = [
        { w: 1.78, h: 0.1, d: 0.75, x: 0, y: 0.88, z: 0, color: secondary },
        { w: 1.66, h: 0.045, d: 0.66, x: 0, y: 0.81, z: 0, color: metal, metalness: 0.62 },
      ];
      for (const x of [-0.68, 0.68]) for (const z of [-0.24, 0.24]) parts.push({ w: 0.07, h: 0.8, d: 0.07, x, y: 0.4, z, color: metal, shape: 'cylinder', rz: x * 0.08 });
      parts.push({ w: 1.42, h: 0.05, d: 0.05, x: 0, y: 0.45, z: -0.25, color: metal, shape: 'cylinder', rz: Math.PI / 2 });
      return group(parts, `folding-table-${variant}`);
    }
    case 'cafeteria_table': {
      const parts: PartSpec[] = [
        { w: 1.72, h: 0.1, d: 0.82, x: 0, y: 0.88, z: 0, color: secondary },
        { w: 0.12, h: 0.82, d: 0.12, x: 0, y: 0.42, z: 0, color: metal, shape: 'cylinder' },
        { w: 2.1, h: 0.08, d: 0.08, x: 0, y: 0.38, z: 0, color: metal, shape: 'cylinder', rz: Math.PI / 2 },
      ];
      for (const x of [-0.86, 0.86]) for (const z of [-0.58, 0.58]) {
        parts.push({ w: 0.46, h: 0.12, d: 0.46, x, y: 0.52, z, color: variantColor(color, variant, x + z), shape: variant % 2 ? 'sphere' : 'cylinder' });
        parts.push({ w: 0.09, h: 0.5, d: 0.09, x, y: 0.25, z, color: metal, shape: 'cylinder' });
      }
      return group(parts, `cafeteria-table-${variant}`);
    }
    case 'airport_seat': {
      const parts: PartSpec[] = [
        { w: 2.42, h: 0.1, d: 0.12, x: 0, y: 0.58, z: -0.2, color: metal, metalness: 0.65 },
        { w: 0.1, h: 0.62, d: 0.1, x: -0.92, y: 0.31, z: -0.2, color: metal, shape: 'cylinder' },
        { w: 0.1, h: 0.62, d: 0.1, x: 0.92, y: 0.31, z: -0.2, color: metal, shape: 'cylinder' },
      ];
      for (let seat = -1; seat <= 1; seat += 1) {
        const x = seat * 0.76;
        parts.push({ w: 0.68, h: 0.13, d: 0.62, x, y: 0.62, z: 0.04, color: variantColor(color, variant, seat * 0.08) });
        parts.push({ w: 0.68, h: 0.68, d: 0.12, x, y: 0.99, z: -0.23, color: variantColor(color, variant, seat * 0.08), rx: -0.08 });
        for (const side of [-1, 1]) parts.push({ w: 0.06, h: 0.38, d: 0.38, x: x + side * 0.36, y: 0.78, z: -0.02, color: metal });
      }
      return group(parts, `airport-seat-${variant}`);
    }
    case 'examination_bed':
      return group([
        { w: 1.9, h: 0.3, d: 0.78, x: 0, y: 0.84, z: 0, color: variantColor('#d7ded9', variant) },
        { w: 0.72, h: 0.22, d: 0.75, x: -0.56, y: 1.06, z: 0, color, rx: -0.12 - variant * 0.01 },
        { w: 1.65, h: 0.55, d: 0.65, x: 0.08, y: 0.47, z: 0, color: secondary },
        { w: 0.12, h: 0.5, d: 0.12, x: -0.72, y: 0.25, z: -0.27, color: metal, shape: 'cylinder' },
        { w: 0.12, h: 0.5, d: 0.12, x: 0.72, y: 0.25, z: -0.27, color: metal, shape: 'cylinder' },
        { w: 0.12, h: 0.5, d: 0.12, x: -0.72, y: 0.25, z: 0.27, color: metal, shape: 'cylinder' },
        { w: 0.12, h: 0.5, d: 0.12, x: 0.72, y: 0.25, z: 0.27, color: metal, shape: 'cylinder' },
        { w: 0.44, h: 0.16, d: 0.5, x: 0.72, y: 0.18, z: 0, color: metal },
        { w: 1.38, h: 0.025, d: 0.66, x: 0.18, y: 1.02, z: 0, color: '#f2f0e8' },
      ], `examination-bed-${variant}`);
    case 'snack_machine': {
      const parts: PartSpec[] = [
        { w: 1, h: 2.05, d: 0.84, x: 0, y: 1.03, z: 0, color: dark, metalness: 0.35 },
        { w: 0.68, h: 1.48, d: 0.055, x: -0.1, y: 1.22, z: 0.44, color: '#324b56', emissive: '#173640', emissiveIntensity: 0.3 },
        { w: 0.18, h: 0.72, d: 0.06, x: 0.36, y: 1.25, z: 0.45, color: color },
        { w: 0.54, h: 0.16, d: 0.09, x: -0.08, y: 0.25, z: 0.46, color: '#101417' },
      ];
      for (let row = 0; row < 4; row += 1) for (let col = 0; col < 3; col += 1) parts.push({ w: 0.15, h: 0.2, d: 0.06, x: -0.32 + col * 0.22, y: 0.72 + row * 0.3, z: 0.48, color: variantColor(color, variant, row * 0.08 + col * 0.13), shape: col % 2 ? 'cylinder' : 'box' });
      return group(parts, `snack-machine-${variant}`);
    }
    case 'luggage_pile': {
      const parts: PartSpec[] = [];
      const bags = [
        [-0.42, 0.34, 0.18, 0.72, 0.58, 0.5],
        [0.38, 0.29, 0.08, 0.62, 0.5, 0.55],
        [0, 0.78, -0.18, 0.8, 0.65, 0.42],
        [-0.5, 0.92, -0.12, 0.48, 0.5, 0.36],
        [0.5, 0.9, 0.14, 0.46, 0.54, 0.38],
      ] as const;
      bags.forEach(([x, y, z, w, h, d], index) => {
        const bag = variantColor(color, variant, index * 0.12);
        parts.push({ w, h, d, x, y, z, color: bag, rz: (index % 3 - 1) * 0.09 });
        parts.push({ w: w * 0.4, h: 0.18, d: 0.07, x, y: y + h * 0.58, z, color: dark, shape: 'torus' });
        parts.push({ w: 0.06, h: h * 0.82, d: d * 1.02, x, y, z, color: dark });
      });
      return group(parts, `luggage-pile-${variant}`);
    }
    case 'garden_bench': {
      const parts: PartSpec[] = [];
      for (let slat = 0; slat < 5; slat += 1) parts.push({ w: 1.75, h: 0.09, d: 0.12, x: 0, y: 0.56 + slat * 0.14, z: -0.27 - slat * 0.025, color: variantColor(secondary, variant, slat * 0.02) });
      for (let slat = 0; slat < 4; slat += 1) parts.push({ w: 1.75, h: 0.08, d: 0.13, x: 0, y: 0.47, z: -0.16 + slat * 0.15, color: variantColor(secondary, variant, slat * 0.02) });
      for (const x of [-0.72, 0.72]) {
        parts.push({ w: 0.11, h: 0.58, d: 0.55, x, y: 0.28, z: 0, color: metal });
        parts.push({ w: 0.12, h: 0.12, d: 0.68, x, y: 0.66, z: 0.02, color: metal });
      }
      return group(parts, `garden-bench-${variant}`);
    }
    case 'market_stall': {
      const parts: PartSpec[] = [
        { w: 2.55, h: 0.16, d: 0.82, x: 0, y: 0.92, z: 0.22, color: secondary },
        { w: 2.68, h: 0.15, d: 1.7, x: 0, y: 2.45, z: 0, color, rz: (variant - 3.5) * 0.008 },
      ];
      for (const x of [-1.18, 1.18]) for (const z of [-0.66, 0.66]) parts.push({ w: 0.1, h: 2.38, d: 0.1, x, y: 1.19, z, color: metal, shape: 'cylinder' });
      for (let crate = 0; crate < 4; crate += 1) parts.push({ w: 0.52, h: 0.38, d: 0.5, x: -0.82 + crate * 0.55, y: 0.28 + (crate % 2) * 0.12, z: 0.16, color: variantColor(secondary, variant, crate * 0.05) });
      for (let stripe = 0; stripe < 5; stripe += 1) parts.push({ w: 0.42, h: 0.025, d: 1.58, x: -0.9 + stripe * 0.45, y: 2.54, z: 0, color: stripe % 2 ? '#e7dfca' : color });
      return group(parts, `market-stall-${variant}`);
    }
    case 'maintenance_sink':
      return group([
        { w: 1.02, h: 0.52, d: 0.72, x: 0, y: 0.92, z: 0, color: variantColor('#b5b9b3', variant), metalness: 0.28 },
        { w: 0.82, h: 0.3, d: 0.52, x: 0, y: 1.02, z: 0.04, color: '#51666c' },
        { w: 1.08, h: 0.58, d: 0.08, x: 0, y: 1.28, z: -0.34, color: secondary },
        { w: 0.1, h: 0.76, d: 0.1, x: -0.4, y: 0.38, z: -0.22, color: metal, shape: 'cylinder' },
        { w: 0.1, h: 0.76, d: 0.1, x: 0.4, y: 0.38, z: -0.22, color: metal, shape: 'cylinder' },
        { w: 0.1, h: 0.76, d: 0.1, x: -0.4, y: 0.38, z: 0.22, color: metal, shape: 'cylinder' },
        { w: 0.1, h: 0.76, d: 0.1, x: 0.4, y: 0.38, z: 0.22, color: metal, shape: 'cylinder' },
        { w: 0.08, h: 0.52, d: 0.08, x: 0, y: 1.45, z: -0.18, color: metal, shape: 'cylinder', rx: -0.55 },
        { w: 0.22, h: 0.1, d: 0.22, x: -0.26, y: 1.25, z: -0.22, color, shape: 'torus', rx: Math.PI / 2 },
        { w: 0.22, h: 0.1, d: 0.22, x: 0.26, y: 1.25, z: -0.22, color: glow, shape: 'torus', rx: Math.PI / 2 },
      ], `maintenance-sink-${variant}`);
    default:
      return group([
        { w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0, color },
        foot(-0.3, -0.3), foot(0.3, -0.3), foot(-0.3, 0.3), foot(0.3, 0.3),
      ], `iteration-expansion-${variant}`);
  }
}

/** Condition-focused props: damage, emergency infrastructure, and denser room furniture. */
function buildConditionExpansion(
  kind: PropKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const color = variantColor(accent, variant);
  const secondary = variantColor(body, variant, 0.08);
  const dark = variantColor('#282522', variant);
  const metal = variantColor('#667178', variant, 0.04);
  const wood = variantColor('#775235', variant, 0.03);
  const glow = variantColor('#ff8a32', variant, 0.05);

  switch (kind) {
    case 'rubble_pile': {
      const parts: PartSpec[] = [];
      for (let index = 0; index < 9; index += 1) {
        const angle = index * 2.19 + variant * 0.31;
        const radius = 0.16 + (index % 4) * 0.16;
        const width = 0.32 + ((index + variant) % 4) * 0.13;
        const height = 0.2 + ((index * 3 + variant) % 4) * 0.11;
        parts.push({
          w: width,
          h: height,
          d: width * (0.72 + (index % 3) * 0.16),
          x: Math.cos(angle) * radius,
          y: height * 0.5 + (index > 5 ? 0.2 : 0),
          z: Math.sin(angle) * radius,
          color: variantColor(index % 3 === 0 ? color : secondary, variant, index * 0.035),
          shape: index % 4 === 0 ? 'sphere' : 'box',
          rx: (index % 3 - 1) * 0.22,
          ry: angle,
          rz: ((index + variant) % 5 - 2) * 0.13,
        });
      }
      return group(parts, `rubble-pile-${variant}`);
    }
    case 'fire_barrel': {
      const parts: PartSpec[] = [
        { w: 0.78, h: 1.08, d: 0.78, x: 0, y: 0.58, z: 0, color: variantColor('#5f4c42', variant), shape: 'cylinder', metalness: 0.5 },
        { w: 0.84, h: 0.1, d: 0.84, x: 0, y: 0.16, z: 0, color: metal, shape: 'torus', rx: Math.PI / 2 },
        { w: 0.84, h: 0.1, d: 0.84, x: 0, y: 1.02, z: 0, color: metal, shape: 'torus', rx: Math.PI / 2 },
        { w: 0.68, h: 0.07, d: 0.68, x: 0, y: 1.12, z: 0, color: '#161313', shape: 'cylinder' },
        { w: 0.58, h: 0.82 + variant * 0.025, d: 0.58, x: 0, y: 1.48, z: 0, color: '#f04c16', emissive: '#ff3210', emissiveIntensity: 1.5, shape: 'cone' },
        { w: 0.3, h: 0.58 + (variant % 3) * 0.06, d: 0.3, x: 0.04, y: 1.39, z: 0, color: '#ffd33d', emissive: '#ffb21a', emissiveIntensity: 1.8, shape: 'cone', rz: 0.12 },
      ];
      for (let rib = 0; rib < 4; rib += 1) {
        const angle = rib * Math.PI * 0.5;
        parts.push({ w: 0.055, h: 0.88, d: 0.055, x: Math.cos(angle) * 0.38, y: 0.58, z: Math.sin(angle) * 0.38, color: dark, shape: 'cylinder' });
      }
      return group(parts, `fire-barrel-${variant}`);
    }
    case 'broken_column': {
      const stone = variantColor('#9b9589', variant, 0.02);
      return group([
        { w: 1.3, h: 0.18, d: 1.3, x: 0, y: 0.09, z: 0, color: stone, shape: 'cylinder' },
        { w: 1.05, h: 0.16, d: 1.05, x: 0, y: 0.25, z: 0, color: secondary, shape: 'cylinder' },
        { w: 0.72, h: 0.78 + variant * 0.035, d: 0.72, x: 0, y: 0.7, z: 0, color: stone, shape: 'cylinder' },
        { w: 0.66, h: 0.58, d: 0.66, x: 0.12, y: 1.36, z: 0.04, color: stone, shape: 'cylinder', rz: 0.18 + variant * 0.018 },
        { w: 0.76, h: 0.16, d: 0.76, x: 0.24, y: 1.72 + variant * 0.02, z: 0.08, color: secondary, shape: 'cylinder', rz: 0.31 },
        { w: 0.42, h: 0.28, d: 0.38, x: -0.48, y: 0.16, z: 0.34, color: stone, ry: variant * 0.24, rz: -0.24 },
        { w: 0.35, h: 0.22, d: 0.42, x: 0.52, y: 0.13, z: -0.28, color: secondary, ry: 0.7 + variant * 0.11 },
        { w: 0.28, h: 0.18, d: 0.3, x: -0.18, y: 0.1, z: -0.52, color: stone, ry: -0.4 },
      ], `broken-column-${variant}`);
    }
    case 'collapsed_beam': {
      const beamColor = variantColor(variant % 2 ? '#6e4b35' : '#566064', variant);
      const parts: PartSpec[] = [
        { w: 2.9, h: 0.25, d: 0.34, x: 0, y: 0.34, z: 0, color: beamColor, metalness: variant % 2 ? 0.05 : 0.48, ry: (variant - 3.5) * 0.035, rz: -0.12 - variant * 0.012 },
        { w: 2.15, h: 0.2, d: 0.3, x: 0.34, y: 0.48, z: 0.26, color: secondary, ry: -0.22 - variant * 0.025, rz: 0.17 },
        { w: 0.48, h: 0.12, d: 0.48, x: -1.18, y: 0.15, z: 0.02, color: metal },
      ];
      for (let bolt = 0; bolt < 5; bolt += 1) {
        parts.push({ w: 0.11, h: 0.11, d: 0.12, x: -1.05 + bolt * 0.53, y: 0.51 - bolt * 0.025, z: 0.18, color: dark, shape: 'cylinder', rx: Math.PI / 2 });
      }
      return group(parts, `collapsed-beam-${variant}`);
    }
    case 'wooden_barricade': {
      const parts: PartSpec[] = [
        { w: 0.16, h: 1.58, d: 0.16, x: -0.86, y: 0.79, z: 0, color: dark, rz: -0.08 },
        { w: 0.16, h: 1.58, d: 0.16, x: 0.86, y: 0.79, z: 0, color: dark, rz: 0.08 },
        { w: 0.82, h: 0.12, d: 0.4, x: -0.86, y: 0.08, z: 0, color: dark },
        { w: 0.82, h: 0.12, d: 0.4, x: 0.86, y: 0.08, z: 0, color: dark },
      ];
      for (let plank = 0; plank < 3; plank += 1) {
        parts.push({ w: 2.25, h: 0.28 + (plank === variant % 3 ? 0.07 : 0), d: 0.13, x: 0, y: 0.52 + plank * 0.42, z: 0.05, color: variantColor(wood, variant, plank * 0.04), rz: (plank - 1) * 0.08 + (variant - 3.5) * 0.008 });
        for (const x of [-0.82, 0.82]) parts.push({ w: 0.1, h: 0.1, d: 0.09, x, y: 0.52 + plank * 0.42, z: 0.14, color: metal, shape: 'cylinder', rx: Math.PI / 2 });
      }
      return group(parts, `wooden-barricade-${variant}`);
    }
    case 'altar': {
      const cloth = variantColor(color, variant, 0.12);
      const parts: PartSpec[] = [
        { w: 1.9, h: 0.18, d: 0.92, x: 0, y: 0.09, z: 0, color: secondary },
        { w: 1.65, h: 0.18, d: 0.78, x: 0, y: 0.25, z: 0, color: variantColor(secondary, variant, 0.04) },
        { w: 1.55, h: 0.18, d: 0.72, x: 0, y: 1.2, z: 0, color: secondary },
        { w: 0.22, h: 0.88, d: 0.22, x: -0.58, y: 0.72, z: -0.2, color: secondary, shape: 'cylinder' },
        { w: 0.22, h: 0.88, d: 0.22, x: 0.58, y: 0.72, z: -0.2, color: secondary, shape: 'cylinder' },
        { w: 0.52, h: 0.82, d: 0.035, x: 0, y: 0.87, z: 0.38, color: cloth },
      ];
      for (const x of [-0.48, 0.48]) {
        parts.push({ w: 0.09, h: 0.34 + variant * 0.012, d: 0.09, x, y: 1.45, z: 0, color: '#e7dec2', shape: 'cylinder' });
        parts.push({ w: 0.12, h: 0.2, d: 0.12, x, y: 1.7 + variant * 0.012, z: 0, color: glow, emissive: glow, emissiveIntensity: 0.7, shape: 'cone' });
      }
      return group(parts, `altar-${variant}`);
    }
    case 'office_cubicle':
      return group([
        { w: 2.25, h: 1.55, d: 0.09, x: 0, y: 0.78, z: -0.9, color: variantColor('#7c8589', variant) },
        { w: 0.09, h: 1.55, d: 1.72, x: -1.08, y: 0.78, z: -0.05, color: variantColor('#727c82', variant, 0.03) },
        { w: 0.09, h: 1.18, d: 1.15, x: 1.08, y: 0.6, z: -0.32, color: variantColor('#727c82', variant, 0.03) },
        { w: 1.82, h: 0.1, d: 0.72, x: -0.08, y: 0.78, z: -0.5, color: secondary },
        { w: 0.12, h: 0.7, d: 0.12, x: -0.78, y: 0.38, z: -0.53, color: metal, shape: 'cylinder' },
        { w: 0.12, h: 0.7, d: 0.12, x: 0.62, y: 0.38, z: -0.53, color: metal, shape: 'cylinder' },
        { w: 0.72, h: 0.5, d: 0.08, x: -0.05, y: 1.2, z: -0.47, color: '#17242b', emissive: variantColor('#58a2b7', variant), emissiveIntensity: 0.34 },
        { w: 0.11, h: 0.42, d: 0.11, x: -0.05, y: 0.96, z: -0.5, color: dark, shape: 'cylinder' },
        { w: 0.62, h: 0.05, d: 0.24, x: 0, y: 0.84, z: 0, color: dark, rz: (variant - 3.5) * 0.01 },
      ], `office-cubicle-${variant}`);
    case 'restaurant_booth':
      return group([
        { w: 2.15, h: 0.38, d: 0.48, x: 0, y: 0.42, z: -0.62, color },
        { w: 2.15, h: 0.38, d: 0.48, x: 0, y: 0.42, z: 0.62, color: variantColor(color, variant, 0.04) },
        { w: 2.15, h: 0.9, d: 0.18, x: 0, y: 0.96, z: -0.84, color },
        { w: 2.15, h: 0.9, d: 0.18, x: 0, y: 0.96, z: 0.84, color: variantColor(color, variant, 0.04) },
        { w: 1.5, h: 0.1, d: 0.72, x: 0, y: 0.86, z: 0, color: secondary },
        { w: 0.15, h: 0.78, d: 0.15, x: 0, y: 0.44, z: 0, color: metal, shape: 'cylinder' },
        { w: 0.58, h: 0.08, d: 0.58, x: 0, y: 0.06, z: 0, color: dark },
        { w: 0.18, h: 0.22 + variant * 0.01, d: 0.18, x: -0.42, y: 1.02, z: 0, color: variantColor('#d7d1c5', variant), shape: 'cylinder' },
        { w: 0.18, h: 0.16, d: 0.18, x: 0.38, y: 0.98, z: 0, color: variantColor('#b54a38', variant), shape: 'cylinder' },
      ], `restaurant-booth-${variant}`);
    case 'warehouse_crate': {
      const parts: PartSpec[] = [
        { w: 1.22, h: 1.1, d: 1.22, x: 0, y: 0.58, z: 0, color: variantColor(wood, variant) },
      ];
      for (const z of [-0.63, 0.63]) {
        for (const x of [-0.48, 0, 0.48]) parts.push({ w: 0.12, h: 1.16, d: 0.08, x, y: 0.6, z, color: dark, rz: x === 0 ? (variant - 3.5) * 0.012 : 0 });
        for (const y of [0.16, 1.04]) parts.push({ w: 1.3, h: 0.12, d: 0.08, x: 0, y, z, color: dark });
      }
      for (const x of [-0.55, 0.55]) for (const z of [-0.55, 0.55]) parts.push({ w: 0.1, h: 1.16, d: 0.1, x, y: 0.6, z, color: metal });
      return group(parts, `warehouse-crate-${variant}`);
    }
    case 'generator': {
      const parts: PartSpec[] = [
        { w: 1.25, h: 0.88, d: 0.82, x: 0, y: 0.7, z: 0, color: variantColor('#555e5f', variant), metalness: 0.42 },
        { w: 0.95, h: 0.28, d: 0.62, x: -0.08, y: 1.2, z: 0, color },
        { w: 0.5, h: 0.45, d: 0.06, x: 0.36, y: 0.78, z: 0.44, color: dark },
        { w: 0.26, h: 0.18, d: 0.08, x: 0.35, y: 0.86, z: 0.48, color: glow, emissive: glow, emissiveIntensity: 0.28 },
        { w: 0.14, h: 0.48, d: 0.14, x: -0.42, y: 1.43, z: -0.14, color: metal, shape: 'cylinder' },
      ];
      for (const x of [-0.72, 0.72]) for (const z of [-0.46, 0.46]) parts.push({ w: 0.08, h: 1.28, d: 0.08, x, y: 0.68, z, color: dark, shape: 'cylinder' });
      for (const x of [-0.56, 0.56]) parts.push({ w: 0.32, h: 0.32, d: 0.2, x, y: 0.22, z: 0.45, color: '#17191a', shape: 'cylinder', rx: Math.PI / 2 });
      return group(parts, `generator-${variant}`);
    }
    case 'greenhouse_table': {
      const parts: PartSpec[] = [
        { w: 2.15, h: 0.12, d: 1.02, x: 0, y: 0.9, z: 0, color: secondary },
        { w: 1.9, h: 0.1, d: 0.82, x: 0, y: 0.36, z: 0, color: metal },
      ];
      for (const x of [-0.88, 0.88]) for (const z of [-0.38, 0.38]) parts.push({ w: 0.1, h: 0.86, d: 0.1, x, y: 0.44, z, color: metal, shape: 'cylinder' });
      for (const z of [-0.28, 0.28]) parts.push({ w: 1.82, h: 0.12, d: 0.34, x: 0, y: 1.0, z, color: variantColor('#40564b', variant) });
      for (let pot = 0; pot < 4; pot += 1) {
        const x = -0.72 + pot * 0.48;
        parts.push({ w: 0.28, h: 0.28, d: 0.28, x, y: 1.16, z: pot % 2 ? 0.28 : -0.28, color: variantColor('#9b5d38', variant), shape: 'cone' });
        parts.push({ w: 0.32, h: 0.5 + ((pot + variant) % 3) * 0.08, d: 0.18, x, y: 1.48, z: pot % 2 ? 0.28 : -0.28, color: variantColor('#43823d', variant, pot * 0.04), shape: 'sphere', rz: (pot - 1.5) * 0.22 });
      }
      return group(parts, `greenhouse-table-${variant}`);
    }
    case 'telescope':
      return group([
        { w: 0.34, h: 0.32, d: 0.34, x: 0, y: 1.25, z: 0, color: metal, shape: 'sphere' },
        { w: 0.14, h: 1.3, d: 0.14, x: 0, y: 0.68, z: 0, color: metal, shape: 'cylinder' },
        { w: 0.12, h: 1.2, d: 0.12, x: -0.42, y: 0.58, z: 0.22, color: dark, shape: 'cylinder', rz: -0.42 },
        { w: 0.12, h: 1.2, d: 0.12, x: 0.42, y: 0.58, z: 0.22, color: dark, shape: 'cylinder', rz: 0.42 },
        { w: 0.12, h: 1.2, d: 0.12, x: 0, y: 0.58, z: -0.46, color: dark, shape: 'cylinder', rx: -0.42 },
        { w: 0.48, h: 1.55 + variant * 0.035, d: 0.48, x: 0.12, y: 1.72, z: 0, color, shape: 'cylinder', rz: -1.08 + variant * 0.018 },
        { w: 0.58, h: 0.18, d: 0.58, x: 0.78, y: 2.1 + variant * 0.015, z: 0, color: variantColor('#8fc5d4', variant), emissive: '#284d5a', emissiveIntensity: 0.18, shape: 'cylinder', rz: -1.08 + variant * 0.018 },
        { w: 0.25, h: 0.36, d: 0.25, x: -0.58, y: 1.28, z: 0, color: dark, shape: 'cylinder', rz: -1.08 + variant * 0.018 },
        { w: 0.32, h: 0.32, d: 0.32, x: -0.08, y: 1.08, z: 0, color: secondary, shape: 'sphere' },
      ], `telescope-${variant}`);
    default:
      return group([
        { w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0, color },
        { w: 0.2, h: 0.2, d: 0.2, x: -0.35, y: 0.1, z: -0.35, color: dark },
        { w: 0.2, h: 0.2, d: 0.2, x: 0.35, y: 0.1, z: -0.35, color: dark },
        { w: 0.2, h: 0.2, d: 0.2, x: -0.35, y: 0.1, z: 0.35, color: dark },
        { w: 0.2, h: 0.2, d: 0.2, x: 0.35, y: 0.1, z: 0.35, color: dark },
      ], `condition-expansion-${variant}`);
  }
}

function buildAnimal(kind: PropKind, variant: number, accent: string): THREE.Group {
  const coats = ['#8d7158', '#34383b', '#c7b69a', '#7b5644', '#d7d1c2', '#845f48', '#a89c8b', '#25282b'];
  const coat = variantColor(coats[variant]!, variant, 0.03);
  const dark = variantColor('#202326', variant);
  const eye = variant === 7 ? variantColor(accent, variant) : '#151719';
  if (kind === 'animal_crow') {
    return group([
      { w: 0.5, h: 0.62, d: 0.62, x: 0, y: 0.48, z: 0, color: coat, shape: 'sphere' },
      { w: 0.38, h: 0.38, d: 0.4, x: 0, y: 0.82, z: 0.18, color: coat, shape: 'sphere' },
      { w: 0.22, h: 0.16, d: 0.34, x: 0, y: 0.78, z: 0.5, color: dark, shape: 'cone', rx: Math.PI / 2 },
      { w: 0.42, h: 0.12, d: 0.72, x: -0.28, y: 0.5, z: -0.02, color: dark, shape: 'capsule', rz: -0.48 },
      { w: 0.42, h: 0.12, d: 0.72, x: 0.28, y: 0.5, z: -0.02, color: dark, shape: 'capsule', rz: 0.48 },
      { w: 0.06, h: 0.4, d: 0.06, x: -0.12, y: 0.2, z: 0, color: dark, shape: 'cylinder' },
      { w: 0.06, h: 0.4, d: 0.06, x: 0.12, y: 0.2, z: 0, color: dark, shape: 'cylinder' },
      { w: 0.055, h: 0.055, d: 0.04, x: -0.1, y: 0.88, z: 0.36, color: eye, shape: 'sphere', name: 'face-eye-left' },
      { w: 0.055, h: 0.055, d: 0.04, x: 0.1, y: 0.88, z: 0.36, color: eye, shape: 'sphere', name: 'face-eye-right' },
    ], `animal-crow-${variant}`);
  }
  if (kind === 'animal_fish') {
    return group([
      { w: 1.0, h: 0.52, d: 0.42, x: 0, y: 0.5, z: 0, color: variantColor(accent, variant), shape: 'sphere' },
      { w: 0.48, h: 0.54, d: 0.16, x: -0.62, y: 0.5, z: 0, color: coat, shape: 'cone', rz: -Math.PI / 2 },
      { w: 0.34, h: 0.14, d: 0.28, x: 0, y: 0.82, z: 0, color: coat, shape: 'cone' },
      { w: 0.34, h: 0.14, d: 0.28, x: 0, y: 0.22, z: 0, color: coat, shape: 'cone', rz: Math.PI },
      { w: 0.3, h: 0.12, d: 0.3, x: 0, y: 0.5, z: -0.28, color: coat, shape: 'cone', rx: Math.PI / 2 },
      { w: 0.09, h: 0.09, d: 0.06, x: 0.36, y: 0.59, z: 0.2, color: eye, shape: 'sphere', name: 'face-eye-left' },
      { w: 0.09, h: 0.09, d: 0.06, x: 0.36, y: 0.59, z: -0.2, color: eye, shape: 'sphere', name: 'face-eye-right' },
      { w: 0.18, h: 0.035, d: 0.035, x: 0.51, y: 0.43, z: 0, color: dark },
    ], `animal-fish-${variant}`);
  }

  const horse = kind === 'animal_horse';
  const rabbit = kind === 'animal_rabbit';
  const dog = kind === 'animal_dog';
  const bodyLength = horse ? 1.65 : dog ? 1.05 : rabbit ? 0.72 : 0.82;
  const bodyHeight = horse ? 0.86 : rabbit ? 0.58 : 0.62;
  const bodyY = horse ? 1.28 : rabbit ? 0.52 : 0.65;
  const headY = horse ? 1.76 : rabbit ? 0.88 : 0.9;
  const headZ = bodyLength * 0.5;
  const legHeight = horse ? 1.15 : rabbit ? 0.34 : 0.56;
  const parts: PartSpec[] = [
    { w: horse ? 0.8 : 0.62, h: bodyHeight, d: bodyLength, x: 0, y: bodyY, z: 0, color: coat, shape: 'sphere' },
    { w: horse ? 0.56 : rabbit ? 0.46 : 0.5, h: horse ? 0.68 : 0.5, d: horse ? 0.7 : 0.52, x: 0, y: headY, z: headZ, color: coat, shape: 'sphere' },
    { w: horse ? 0.42 : 0.34, h: horse ? 0.3 : 0.25, d: horse ? 0.55 : 0.42, x: 0, y: headY - 0.06, z: headZ + 0.35, color: variantColor(coat, variant, 0.06), shape: 'sphere' },
  ];
  for (const x of [-0.22, 0.22]) for (const z of [-bodyLength * 0.32, bodyLength * 0.32]) {
    parts.push({ w: horse ? 0.14 : 0.12, h: legHeight, d: horse ? 0.16 : 0.14, x, y: legHeight * 0.5, z, color: dark, shape: 'capsule', rz: x * 0.08 });
  }
  const earHeight = rabbit ? 0.48 : horse ? 0.32 : 0.22;
  for (const x of [-0.16, 0.16]) {
    parts.push({ w: rabbit ? 0.14 : 0.12, h: earHeight, d: 0.12, x, y: headY + (rabbit ? 0.38 : 0.32), z: headZ - 0.06, color: coat, shape: rabbit ? 'capsule' : 'cone', rz: x * 0.6 });
    parts.push({ w: 0.055, h: 0.065, d: 0.04, x, y: headY + 0.06, z: headZ + (horse ? 0.34 : 0.27), color: eye, shape: 'sphere', name: x < 0 ? 'face-eye-left' : 'face-eye-right' });
  }
  parts.push({ w: horse ? 0.18 : rabbit ? 0.2 : 0.12, h: horse ? 0.85 : rabbit ? 0.25 : 0.55, d: horse ? 0.18 : 0.14, x: 0, y: bodyY + 0.05, z: -bodyLength * 0.62, color: coat, shape: 'capsule', rx: -0.72 });
  if (dog) parts.push({ w: 0.38, h: 0.18, d: 0.12, x: 0, y: headY - 0.28, z: headZ + 0.16, color: variantColor(accent, variant), shape: 'torus', rx: Math.PI / 2 });
  return group(parts, `${kind}-${variant}`);
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
    figure_teacher: '#6e5f78',
    figure_cook: '#e5e0d2',
    figure_swimmer: '#287f94',
    figure_groundskeeper: '#526d43',
    figure_receptionist: '#6d4666',
    figure_courier: '#b76534',
    figure_usher: '#5b2335',
    figure_tourist: '#4b7482',
    figure_mechanic: '#35526c',
    figure_lifeguard: '#d84e44',
    figure_vendor: '#8c5d36',
    figure_firefighter: '#3d454a',
    figure_librarian: '#6d5b72',
    figure_lab_tech: '#d7e2df',
    figure_coach: '#355f75',
    figure_musician: '#4d3f62',
  };
  const outfit = variantColor(outfitByKind[kind] ?? accent, variant);
  const secondary = variantColor(accent, variant, 0.12);
  const skinTones = ['#d9ad8c', '#7d4e39', '#b97956', '#efc5a7', '#8f6049', '#c98d68', '#613c31', '#e0af8c'];
  const skin = skinTones[variant]!;
  const dark = variantColor('#242a31', variant);
  const heightOffset = (variant - 3.5) * 0.025;
  const pose = (variant % 4 - 1.5) * 0.09;
  const bareLegs = kind === 'figure_swimmer' || kind === 'figure_lifeguard';
  const bareArms = bareLegs || kind === 'figure_cook';
  const legColor = bareLegs ? skin : dark;
  const armColor = bareArms ? skin : outfit;
  const parts: PartSpec[] = [
    { w: 0.24, h: 0.14, d: 0.4, x: -0.18, y: 0.07, z: 0.075, color: dark, name: 'rig-shoe-left' },
    { w: 0.24, h: 0.14, d: 0.4, x: 0.18, y: 0.07, z: 0.075, color: dark, name: 'rig-shoe-right' },
    { w: 0.18, h: 0.7 + heightOffset, d: 0.2, x: -0.17, y: 0.47, z: 0, color: legColor, shape: 'capsule', rz: -pose * 0.35, name: 'rig-leg-left' },
    { w: 0.18, h: 0.7 + heightOffset, d: 0.2, x: 0.17, y: 0.47, z: 0, color: legColor, shape: 'capsule', rz: pose * 0.35, name: 'rig-leg-right' },
    { w: 0.2, h: 0.18, d: 0.2, x: -0.17, y: 0.75 + heightOffset, z: 0.01, color: legColor, shape: 'sphere' },
    { w: 0.2, h: 0.18, d: 0.2, x: 0.17, y: 0.75 + heightOffset, z: 0.01, color: legColor, shape: 'sphere' },
    { w: 0.48, h: 0.27, d: 0.36, x: 0, y: 0.84 + heightOffset, z: 0, color: outfit, shape: 'capsule' },
    { w: 0.56, h: 0.1, d: 0.38, x: 0, y: 0.96 + heightOffset, z: 0.01, color: secondary },
    { w: 0.6 + (variant % 3) * 0.035, h: 0.86, d: 0.38, x: 0, y: 1.35 + heightOffset, z: 0, color: outfit, shape: kind === 'figure_hazmat' || kind === 'figure_mascot' ? 'capsule' : 'box' },
    { w: 0.26, h: 0.18, d: 0.28, x: -0.3, y: 1.65 + heightOffset, z: 0, color: outfit, shape: 'sphere' },
    { w: 0.26, h: 0.18, d: 0.28, x: 0.3, y: 1.65 + heightOffset, z: 0, color: outfit, shape: 'sphere' },
    { w: 0.14, h: 0.16, d: 0.14, x: 0, y: 1.81 + heightOffset, z: 0, color: skin, shape: 'cylinder' },
    { w: kind === 'figure_mascot' ? 0.66 : 0.42, h: kind === 'figure_mascot' ? 0.66 : 0.46, d: kind === 'figure_mascot' ? 0.62 : 0.42, x: 0, y: 2.03 + heightOffset, z: 0, color: kind === 'figure_hazmat' ? outfit : kind === 'figure_mascot' ? secondary : skin, shape: 'sphere', name: 'rig-head' },
    { w: 0.11, h: 0.16, d: 0.08, x: -0.22, y: 2.04 + heightOffset, z: 0, color: skin, shape: 'sphere' },
    { w: 0.11, h: 0.16, d: 0.08, x: 0.22, y: 2.04 + heightOffset, z: 0, color: skin, shape: 'sphere' },
    { w: 0.16, h: 0.72, d: 0.17, x: -0.4, y: 1.34 + heightOffset, z: 0, color: armColor, shape: 'capsule', rz: 0.08 + pose, name: 'rig-arm-left' },
    { w: 0.16, h: 0.72, d: 0.17, x: 0.4, y: 1.34 + heightOffset, z: 0, color: armColor, shape: 'capsule', rz: -0.08 - pose, name: 'rig-arm-right' },
    { w: 0.18, h: 0.18, d: 0.16, x: -0.44, y: 0.98 + heightOffset, z: 0.015, color: skin, shape: 'sphere' },
    { w: 0.18, h: 0.18, d: 0.16, x: 0.44, y: 0.98 + heightOffset, z: 0.015, color: skin, shape: 'sphere' },
  ];
  addFace(parts, kind, variant, heightOffset, dark);
  addProfessionDetails(parts, kind, variant, outfit, secondary, heightOffset);
  return group(parts, `${kind}-${variant}`);
}

export interface FaceParameters {
  eyePreset: number;
  nosePreset: number;
  mouthPreset: number;
  hairPreset: number;
  eyeSpacing: number;
  eyeHeightOffset: number;
  eyeWidth: number;
  eyeHeight: number;
  noseWidth: number;
  noseHeight: number;
  noseOffsetX: number;
  mouthWidth: number;
  mouthHeight: number;
  mouthOffsetY: number;
  browTilt: number;
}

/** Deterministic mix-and-match face genetics; no LLM field or inference required. */
export function faceParametersFor(kind: PropKind, variant: number): FaceParameters {
  const sample = (field: string): number =>
    hashString(`${kind}:${variant}:${field}`) / 0xffff_ffff;
  return {
    eyePreset: Math.floor(sample('eye-preset') * 4),
    nosePreset: Math.floor(sample('nose-preset') * 4),
    mouthPreset: Math.floor(sample('mouth-preset') * 4),
    hairPreset: Math.floor(sample('hair-preset') * 5),
    eyeSpacing: 0.078 + sample('eye-spacing') * 0.062,
    eyeHeightOffset: -0.032 + sample('eye-height') * 0.064,
    eyeWidth: 0.045 + sample('eye-width') * 0.03,
    eyeHeight: 0.042 + sample('eye-size-y') * 0.04,
    noseWidth: 0.052 + sample('nose-width') * 0.046,
    noseHeight: 0.082 + sample('nose-height') * 0.072,
    noseOffsetX: -0.024 + sample('nose-x') * 0.048,
    mouthWidth: 0.088 + sample('mouth-width') * 0.078,
    mouthHeight: 0.024 + sample('mouth-height') * 0.03,
    mouthOffsetY: -0.025 + sample('mouth-y') * 0.05,
    browTilt: -0.14 + sample('brow-tilt') * 0.28,
  };
}

function addFace(parts: PartSpec[], kind: PropKind, variant: number, heightOffset: number, dark: string): void {
  if (kind === 'figure_hazmat') {
    parts.push({ w: 0.34, h: 0.19, d: 0.06, x: 0, y: 2.05 + heightOffset, z: 0.23, color: '#76bed0', emissive: '#356e7c', emissiveIntensity: 0.22, name: 'face-visor' });
    for (const x of [-0.2, 0.2]) for (const y of [1.94, 2.15]) parts.push({ w: 0.035, h: 0.035, d: 0.03, x, y: y + heightOffset, z: 0.25, color: '#c7c9b8', shape: 'sphere' });
    return;
  }
  const face = faceParametersFor(kind, variant);
  const mascot = kind === 'figure_mascot';
  const eyeColor = kind === 'figure_mascot' ? '#f8f3d8' : dark;
  const eyeShape: PartSpec['shape'] = face.eyePreset === 0 ? 'sphere' : face.eyePreset === 1 ? 'box' : face.eyePreset === 2 ? 'capsule' : 'torus';
  for (const side of [-1, 1] as const) {
    parts.push({
      w: mascot ? 0.16 : face.eyeWidth,
      h: mascot ? 0.18 : face.eyeHeight,
      d: 0.045,
      x: side * (mascot ? 0.105 : face.eyeSpacing),
      y: 2.08 + heightOffset + face.eyeHeightOffset,
      z: mascot ? 0.3 : 0.215,
      color: eyeColor,
      shape: eyeShape,
      emissive: variant === 7 ? eyeColor : undefined,
      emissiveIntensity: 0.2,
      name: side < 0 ? 'face-eye-left' : 'face-eye-right',
    });
  }
  const noseShape: PartSpec['shape'] = face.nosePreset === 0 ? 'sphere' : face.nosePreset === 1 ? 'cone' : face.nosePreset === 2 ? 'capsule' : 'box';
  parts.push({
    w: mascot ? 0.075 : face.noseWidth,
    h: mascot ? 0.12 : face.noseHeight,
    d: mascot ? 0.075 : 0.082,
    x: mascot ? 0 : face.noseOffsetX,
    y: 2 + heightOffset,
    z: mascot ? 0.34 : 0.23,
    color: mascot ? dark : variantColor('#b97956', variant),
    shape: noseShape,
    rz: face.nosePreset === 1 ? Math.PI : 0,
    name: 'face-nose',
  });
  const mouthShape: PartSpec['shape'] = face.mouthPreset === 0 ? 'box' : face.mouthPreset === 1 ? 'torus' : face.mouthPreset === 2 ? 'capsule' : 'sphere';
  parts.push({
    w: mascot ? 0.18 : face.mouthWidth,
    h: mascot ? 0.035 : face.mouthHeight,
    d: 0.035,
    x: 0,
    y: 1.91 + heightOffset + face.mouthOffsetY,
    z: mascot ? 0.35 : 0.225,
    color: mascot ? '#f1d4d4' : dark,
    shape: mouthShape,
    rz: face.mouthPreset === 3 ? face.browTilt * 0.35 : 0,
    name: 'face-mouth',
  });
  if (!mascot) {
    for (const side of [-1, 1] as const) parts.push({
      w: 0.075 + face.eyeWidth * 0.28,
      h: 0.018,
      d: 0.025,
      x: side * face.eyeSpacing,
      y: 2.14 + heightOffset + face.eyeHeightOffset,
      z: 0.218,
      color: dark,
      rz: side * face.browTilt,
      name: side < 0 ? 'face-brow-left' : 'face-brow-right',
    });
    const hair = variantColor('#302a27', variant);
    if (face.hairPreset === 0 || face.hairPreset === 1) {
      parts.push({ w: 0.39, h: face.hairPreset === 0 ? 0.17 : 0.11, d: 0.36, x: 0, y: 2.23 + heightOffset, z: -0.03, color: hair, shape: 'sphere', name: 'face-hair' });
    }
    if (face.hairPreset === 1 || face.hairPreset === 3) {
      const side = face.hairPreset === 1 ? -1 : 1;
      parts.push({ w: 0.14, h: 0.28, d: 0.12, x: side * 0.18, y: 2.08 + heightOffset, z: -0.12, color: hair, shape: 'capsule', rz: side * 0.2, name: 'face-hair-side' });
    }
    if (face.hairPreset === 2) {
      parts.push({ w: 0.2, h: 0.2, d: 0.18, x: -0.1, y: 2.25 + heightOffset, z: -0.03, color: hair, shape: 'sphere', name: 'face-hair-left' });
      parts.push({ w: 0.2, h: 0.2, d: 0.18, x: 0.1, y: 2.25 + heightOffset, z: -0.03, color: hair, shape: 'sphere', name: 'face-hair-right' });
    }
    if (face.hairPreset === 4) {
      parts.push({ w: 0.2, h: 0.22, d: 0.2, x: 0, y: 2.32 + heightOffset, z: -0.13, color: hair, shape: 'sphere', name: 'face-hair-bun' });
    }
  }
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
    case 'figure_teacher': {
      const face = faceParametersFor(kind, variant);
      for (const side of [-1, 1] as const) parts.push({ w: 0.14, h: 0.1, d: 0.035, x: side * face.eyeSpacing, y: 2.08 + y + face.eyeHeightOffset, z: 0.24, color: '#23282d', shape: 'torus' });
      parts.push({ w: 0.28, h: 0.46, d: 0.06, x: 0.43, y: 1.15 + y, z: 0.18, color: '#d7c89e', rz: -0.08 });
      parts.push({ w: 0.035, h: 0.52, d: 0.035, x: -0.43, y: 1.08 + y, z: 0.18, color: '#f1cf4d', shape: 'cylinder', rz: 0.14 });
      break;
    }
    case 'figure_cook':
      parts.push({ w: 0.44, h: 0.2, d: 0.4, x: 0, y: 2.28 + y, z: 0, color: '#f2eee4', shape: 'cylinder' });
      for (const x of [-0.13, 0, 0.13]) parts.push({ w: 0.18, h: 0.28 + (x === 0 ? 0.08 : 0), d: 0.18, x, y: 2.42 + y, z: 0, color: '#f2eee4', shape: 'sphere' });
      parts.push({ w: 0.45, h: 0.72, d: 0.035, x: 0, y: 1.32 + y, z: 0.21, color: '#ece5d5' });
      parts.push({ w: 0.1, h: 0.72, d: 0.05, x: 0.52, y: 0.82 + y, z: 0.08, color: '#9ba0a3', metalness: 0.75, shape: 'cylinder' });
      break;
    case 'figure_swimmer':
      parts.push({ w: 0.42, h: 0.18, d: 0.38, x: 0, y: 2.25 + y, z: 0, color: secondary, shape: 'sphere' });
      parts.push({ w: 0.4, h: 0.09, d: 0.04, x: 0, y: 2.1 + y, z: 0.24, color: '#17272e' });
      for (const x of [-0.105, 0.105]) parts.push({ w: 0.14, h: 0.1, d: 0.045, x, y: 2.09 + y, z: 0.25, color: '#7dd8e8', emissive: '#2f8290', emissiveIntensity: 0.18, shape: 'sphere' });
      parts.push({ w: 0.6, h: 0.16, d: 0.36, x: 0, y: 0.94 + y, z: 0.01, color: outfit });
      break;
    case 'figure_groundskeeper':
      parts.push({ w: 0.5, h: 0.12, d: 0.44, x: 0, y: 2.28 + y, z: 0, color: secondary, shape: 'cylinder' });
      parts.push({ w: 0.38, h: 0.18, d: 0.38, x: 0, y: 2.38 + y, z: -0.02, color: outfit, shape: 'cylinder' });
      parts.push({ w: 0.075, h: 1.65, d: 0.075, x: 0.55, y: 0.86, z: 0.08, color: '#795a3b', shape: 'cylinder', rz: -0.13 });
      for (let tooth = 0; tooth < 5; tooth += 1) parts.push({ w: 0.035, h: 0.34, d: 0.035, x: 0.4 + tooth * 0.08, y: 0.08, z: 0.08, color: '#6d7477', shape: 'cylinder' });
      break;
    case 'figure_receptionist':
      parts.push({ w: 0.055, h: 0.62, d: 0.03, x: 0, y: 1.45 + y, z: 0.21, color: secondary });
      parts.push({ w: 0.19, h: 0.12, d: 0.035, x: 0, y: 1.2 + y, z: 0.23, color: '#e4dfcb' });
      parts.push({ w: 0.34, h: 0.46, d: 0.055, x: 0.42, y: 1.13 + y, z: 0.17, color: '#1f2931', rz: -0.06 });
      parts.push({ w: 0.25, h: 0.34, d: 0.03, x: 0.42, y: 1.13 + y, z: 0.205, color: '#70bfce', emissive: '#285b65', emissiveIntensity: 0.28, rz: -0.06 });
      break;
    case 'figure_courier':
      parts.push({ w: 0.48, h: 0.62, d: 0.22, x: 0, y: 1.42 + y, z: -0.27, color: darkColor(outfit) });
      parts.push({ w: 0.08, h: 1.08, d: 0.04, x: variant % 2 ? -0.27 : 0.27, y: 1.4 + y, z: 0.08, color: secondary, rz: variant % 2 ? -0.32 : 0.32 });
      parts.push({ w: 0.38, h: 0.46, d: 0.18, x: variant % 2 ? 0.48 : -0.48, y: 1.0 + y, z: 0.06, color: secondary });
      parts.push({ w: 0.48, h: 0.1, d: 0.42, x: 0, y: 2.29 + y, z: 0, color: outfit, shape: 'cylinder' });
      break;
    case 'figure_usher':
      parts.push({ w: 0.46, h: 0.14, d: 0.42, x: 0, y: 2.29 + y, z: 0, color: darkColor(outfit), shape: 'cylinder' });
      parts.push({ w: 0.34, h: 0.18, d: 0.34, x: 0, y: 2.39 + y, z: 0, color: outfit, shape: 'cylinder' });
      parts.push({ w: 0.42, h: 0.68, d: 0.04, x: 0, y: 1.35 + y, z: 0.21, color: secondary });
      parts.push({ w: 0.12, h: 0.36, d: 0.12, x: 0.47, y: 0.88 + y, z: 0.06, color: '#d9c05b', emissive: '#735d16', emissiveIntensity: 0.35, shape: 'cylinder' });
      break;
    case 'figure_tourist':
      parts.push({ w: 0.62, h: 0.09, d: 0.58, x: 0, y: 2.27 + y, z: 0, color: '#d5c38f', shape: 'cylinder' });
      parts.push({ w: 0.42, h: 0.18, d: 0.4, x: 0, y: 2.37 + y, z: 0, color: '#c7ad6e', shape: 'cylinder' });
      parts.push({ w: 0.32, h: 0.25, d: 0.16, x: 0, y: 1.35 + y, z: 0.28, color: '#252c31' });
      parts.push({ w: 0.14, h: 0.14, d: 0.14, x: 0, y: 1.35 + y, z: 0.39, color: '#6fc5d6', emissive: '#275c68', emissiveIntensity: 0.25, shape: 'cylinder', rx: Math.PI / 2 });
      parts.push({ w: 0.48, h: 0.58, d: 0.22, x: 0, y: 1.38 + y, z: -0.27, color: secondary });
      break;
    case 'figure_mechanic':
      parts.push({ w: 0.5, h: 0.1, d: 0.44, x: 0, y: 2.29 + y, z: 0, color: secondary, shape: 'cylinder' });
      parts.push({ w: 0.38, h: 0.18, d: 0.36, x: 0, y: 2.38 + y, z: -0.02, color: outfit, shape: 'cylinder' });
      parts.push({ w: 0.62, h: 0.16, d: 0.38, x: 0, y: 1.0 + y, z: 0.02, color: '#4a3627' });
      for (const x of [-0.2, 0.2]) parts.push({ w: 0.14, h: 0.22, d: 0.07, x, y: 0.92 + y, z: 0.23, color: '#7d5b3b' });
      parts.push({ w: 0.08, h: 0.62, d: 0.05, x: 0.49, y: 0.84 + y, z: 0.08, color: '#a9afb2', metalness: 0.8, shape: 'cylinder', rz: -0.2 });
      parts.push({ w: 0.2, h: 0.18, d: 0.05, x: 0.54, y: 0.56 + y, z: 0.08, color: '#a9afb2', metalness: 0.8, shape: 'torus' });
      break;
    case 'figure_lifeguard':
      parts.push({ w: 0.54, h: 0.08, d: 0.48, x: 0, y: 2.28 + y, z: 0, color: '#ece5ce', shape: 'cylinder' });
      parts.push({ w: 0.3, h: 0.14, d: 0.3, x: 0, y: 2.36 + y, z: -0.03, color: outfit, shape: 'cylinder' });
      parts.push({ w: 0.06, h: 0.44, d: 0.035, x: 0, y: 1.54 + y, z: 0.22, color: '#262c30' });
      parts.push({ w: 0.11, h: 0.11, d: 0.07, x: 0, y: 1.35 + y, z: 0.26, color: '#d7c55f', metalness: 0.55, shape: 'cylinder', rx: Math.PI / 2 });
      parts.push({ w: 0.48, h: 0.48, d: 0.15, x: 0.48, y: 1.02 + y, z: 0.06, color: '#efede0', shape: 'torus' });
      break;
    case 'figure_vendor':
      parts.push({ w: 0.64, h: 0.12, d: 0.56, x: 0, y: 2.29 + y, z: 0, color: secondary, shape: 'cylinder' });
      parts.push({ w: 0.48, h: 0.16, d: 0.45, x: 0, y: 2.38 + y, z: -0.03, color: outfit, shape: 'cylinder' });
      parts.push({ w: 0.5, h: 0.66, d: 0.035, x: 0, y: 1.34 + y, z: 0.21, color: variantColor('#ddd0a8', variant) });
      parts.push({ w: 0.38, h: 0.24, d: 0.2, x: 0.48, y: 1.02 + y, z: 0.06, color: secondary });
      break;
    case 'figure_firefighter':
      parts.push({ w: 0.56, h: 0.22, d: 0.5, x: 0, y: 2.31 + y, z: 0, color: '#c9b63e', shape: 'cylinder' });
      parts.push({ w: 0.42, h: 0.3, d: 0.42, x: 0, y: 2.43 + y, z: -0.02, color: outfit, shape: 'cylinder' });
      for (const x of [-0.18, 0.18]) parts.push({ w: 0.08, h: 0.72, d: 0.035, x, y: 1.38 + y, z: 0.21, color: '#d8c540', emissive: '#6f6418', emissiveIntensity: 0.15 });
      parts.push({ w: 0.46, h: 0.58, d: 0.24, x: 0, y: 1.45 + y, z: -0.28, color: '#7d8589' });
      break;
    case 'figure_librarian': {
      const face = faceParametersFor(kind, variant);
      for (const side of [-1, 1] as const) parts.push({ w: 0.13, h: 0.1, d: 0.035, x: side * face.eyeSpacing, y: 2.08 + y + face.eyeHeightOffset, z: 0.24, color: '#24282b', shape: 'torus', name: side < 0 ? 'glasses-left' : 'glasses-right' });
      parts.push({ w: 0.18, h: 0.025, d: 0.025, x: 0, y: 2.08 + y + face.eyeHeightOffset, z: 0.24, color: '#24282b' });
      parts.push({ w: 0.38, h: 0.5, d: 0.09, x: 0.43, y: 1.08 + y, z: 0.15, color: variantColor('#6f4934', variant), rz: -0.08 });
      break;
    }
    case 'figure_lab_tech':
      parts.push({ w: 0.54, h: 0.78, d: 0.04, x: 0, y: 1.32 + y, z: 0.21, color: '#edf0e9' });
      parts.push({ w: 0.22, h: 0.18, d: 0.05, x: -0.2, y: 1.48 + y, z: 0.24, color: '#537b86' });
      parts.push({ w: 0.1, h: 0.28, d: 0.1, x: 0.48, y: 0.9 + y, z: 0.06, color: variantColor('#78dbe4', variant), emissive: '#245d63', emissiveIntensity: 0.22, shape: 'cylinder' });
      parts.push({ w: 0.18, h: 0.08, d: 0.18, x: 0.48, y: 1.05 + y, z: 0.06, color: '#d9e4df', shape: 'sphere' });
      break;
    case 'figure_coach':
      parts.push({ w: 0.6, h: 0.12, d: 0.52, x: 0, y: 2.29 + y, z: 0, color: secondary, shape: 'cylinder' });
      parts.push({ w: 0.06, h: 0.42, d: 0.035, x: 0, y: 1.55 + y, z: 0.22, color: '#202528' });
      parts.push({ w: 0.12, h: 0.12, d: 0.08, x: 0, y: 1.37 + y, z: 0.26, color: '#d5bf43', metalness: 0.56, shape: 'cylinder', rx: Math.PI / 2 });
      parts.push({ w: 0.42, h: 0.28, d: 0.16, x: 0.48, y: 1.02 + y, z: 0.05, color: '#e6d6a4' });
      break;
    case 'figure_musician':
      parts.push({ w: 0.06, h: 1.45, d: 0.06, x: 0.5, y: 0.78 + y, z: 0.04, color: '#5e4632', shape: 'cylinder', rz: -0.12 });
      parts.push({ w: 0.52, h: 0.68, d: 0.18, x: 0.48, y: 1.05 + y, z: 0.06, color: variantColor('#8c5b34', variant), shape: 'sphere' });
      parts.push({ w: 0.24, h: 0.24, d: 0.14, x: 0.48, y: 1.06 + y, z: 0.17, color: '#31251d', shape: 'sphere' });
      parts.push({ w: 0.32, h: 0.08, d: 0.1, x: 0.15, y: 1.08 + y, z: 0.08, color: variantColor('#8c5b34', variant), rz: Math.PI / 2 });
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
  const mixedMedia = buildMixedMediaModel(kind, assetVariant(assetId), accent, body);
  if (mixedMedia) return mixedMedia;
  const semantic = buildSemanticModel(kind, assetVariant(assetId), accent, body);
  if (semantic) return semantic;
  const surreal = buildSurrealModel(kind, assetVariant(assetId), accent, body);
  if (surreal) return surreal;
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
    const offset = kind === 'figure_mannequin' ? 7 : kind === 'figure_raincoat' ? 4 : 2;
    const variant = (assetVariant(assetId) + offset) % 8;
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
  dining_chair: { w: 0.62, h: 1.12, d: 0.64 },
  office_chair: { w: 0.72, h: 1.2, d: 0.72 },
  coffee_table: { w: 1.45, h: 0.58, d: 0.82 },
  side_table: { w: 0.68, h: 0.72, d: 0.68 },
  filing_cabinet: { w: 0.72, h: 1.45, d: 0.72 },
  reception_desk: { w: 2.8, h: 1.45, d: 1.05 },
  wardrobe: { w: 1.55, h: 2.3, d: 0.72 },
  sectional: { w: 2.85, h: 1.18, d: 1.75 },
  hotel_bed: { w: 2.25, h: 1.35, d: 1.72 },
  nightstand: { w: 0.68, h: 1.5, d: 0.62 },
  washer: { w: 0.95, h: 1.28, d: 0.9 },
  phone_booth: { w: 1.18, h: 2.45, d: 1.1 },
  bus_shelter: { w: 3.5, h: 2.55, d: 1.45 },
  swing_set: { w: 3.2, h: 2.65, d: 1.8 },
  pool_lounger: { w: 2.05, h: 0.82, d: 0.72 },
  lifeguard_chair: { w: 1.45, h: 2.95, d: 1.35 },
  streetlight: { w: 1.65, h: 5.2, d: 0.9 },
  pallet_stack: { w: 1.55, h: 1.6, d: 1.25 },
  server_rack: { w: 0.9, h: 2.15, d: 0.95 },
  aquarium_tank: { w: 2.15, h: 1.85, d: 0.82 },
  medical_cart: { w: 1.05, h: 1.25, d: 0.72 },
  privacy_screen: { w: 2.25, h: 1.95, d: 0.5 },
  copy_machine: { w: 1.15, h: 1.45, d: 0.88 },
  archive_trolley: { w: 1.25, h: 1.35, d: 0.72 },
  ticket_gate: { w: 1.55, h: 1.18, d: 0.72 },
  departure_board: { w: 2.25, h: 2.35, d: 0.38 },
  shopping_cart: { w: 1.35, h: 1.12, d: 0.82 },
  retail_display: { w: 1.65, h: 1.7, d: 1.05 },
  chalkboard: { w: 2.45, h: 1.85, d: 0.32 },
  lab_bench: { w: 2.25, h: 1.55, d: 0.95 },
  tool_chest: { w: 1.15, h: 1.3, d: 0.72 },
  drum_stack: { w: 1.65, h: 1.85, d: 1.15 },
  luggage_cart: { w: 1.45, h: 2.05, d: 0.88 },
  room_service: { w: 1.35, h: 1.28, d: 0.82 },
  traffic_cone: { w: 1.15, h: 1.05, d: 0.82 },
  exercise_bike: { w: 1.45, h: 1.65, d: 0.72 },
  cinema_seat: { w: 0.78, h: 1.35, d: 0.78 },
  pool_ladder: { w: 1.05, h: 1.65, d: 0.72 },
  utility_shelf: { w: 1.55, h: 2.05, d: 0.62 },
  breaker_panel: { w: 0.95, h: 1.65, d: 0.34 },
  boiler: { w: 1.5, h: 2.35, d: 1.25 },
  pipe_cluster: { w: 1.6, h: 2.55, d: 0.8 },
  folding_table: { w: 1.85, h: 0.95, d: 0.82 },
  cafeteria_table: { w: 2.3, h: 1.05, d: 1.65 },
  airport_seat: { w: 2.65, h: 1.35, d: 0.82 },
  examination_bed: { w: 2.05, h: 1.25, d: 0.88 },
  snack_machine: { w: 1.05, h: 2.15, d: 0.92 },
  luggage_pile: { w: 1.65, h: 1.45, d: 1.25 },
  garden_bench: { w: 1.95, h: 1.2, d: 0.78 },
  market_stall: { w: 2.8, h: 2.65, d: 1.8 },
  maintenance_sink: { w: 1.15, h: 1.55, d: 0.82 },
  rubble_pile: { w: 1.8, h: 0.9, d: 1.5 },
  fire_barrel: { w: 1, h: 1.8, d: 1 },
  broken_column: { w: 1.5, h: 2.1, d: 1.5 },
  collapsed_beam: { w: 3.2, h: 0.8, d: 1 },
  wooden_barricade: { w: 2.5, h: 1.7, d: 0.7 },
  altar: { w: 2, h: 1.6, d: 1 },
  office_cubicle: { w: 2.4, h: 1.7, d: 2 },
  restaurant_booth: { w: 2.4, h: 1.4, d: 1.8 },
  warehouse_crate: { w: 1.4, h: 1.3, d: 1.4 },
  generator: { w: 1.7, h: 1.5, d: 1.1 },
  greenhouse_table: { w: 2.3, h: 1.5, d: 1.2 },
  telescope: { w: 1.5, h: 2.4, d: 1.5 },
  animal_cat: { w: 0.75, h: 0.72, d: 1.05 },
  animal_dog: { w: 0.95, h: 1.15, d: 1.4 },
  animal_crow: { w: 0.75, h: 0.78, d: 0.85 },
  animal_rabbit: { w: 0.68, h: 0.92, d: 0.9 },
  animal_horse: { w: 1.35, h: 2.35, d: 2.3 },
  animal_fish: { w: 1.25, h: 0.72, d: 0.48 },
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
  figure_teacher: { w: 0.95, h: 2.45, d: 0.68 },
  figure_cook: { w: 1.05, h: 2.65, d: 0.72 },
  figure_swimmer: { w: 0.82, h: 2.45, d: 0.62 },
  figure_groundskeeper: { w: 1.25, h: 2.55, d: 0.72 },
  figure_receptionist: { w: 1.05, h: 2.45, d: 0.7 },
  figure_courier: { w: 1.1, h: 2.55, d: 0.78 },
  figure_usher: { w: 1.0, h: 2.55, d: 0.7 },
  figure_tourist: { w: 1.05, h: 2.6, d: 0.78 },
  figure_mechanic: { w: 1.1, h: 2.55, d: 0.72 },
  figure_lifeguard: { w: 1.1, h: 2.55, d: 0.72 },
  figure_vendor: { w: 1.05, h: 2.55, d: 0.72 },
  figure_firefighter: { w: 1.1, h: 2.65, d: 0.78 },
  figure_librarian: { w: 1.0, h: 2.5, d: 0.68 },
  figure_lab_tech: { w: 1.05, h: 2.5, d: 0.7 },
  figure_coach: { w: 1.05, h: 2.55, d: 0.72 },
  figure_musician: { w: 1.25, h: 2.55, d: 0.82 },
};

export function boundsForKind(kind: PropKind): { w: number; h: number; d: number } {
  const mixedMedia = MIXED_MEDIA_BOUNDS[kind as MixedMediaModelKind];
  if (mixedMedia) return mixedMedia;
  const semantic = SEMANTIC_BOUNDS[kind as SemanticModelKind];
  if (semantic) return semantic;
  const surreal = SURREAL_BOUNDS[kind as keyof typeof SURREAL_BOUNDS];
  if (surreal) return surreal;
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
  if (l.includes('ornate settee')) return 'ornate_settee';
  if (l.includes('grand piano')) return 'grand_piano';
  if (l.includes('diner counter')) return 'diner_counter';
  if (l.includes('pipe organ')) return 'pipe_organ';
  if (l.includes('control room console')) return 'control_console';
  if (l.includes('operating lamp') || l.includes('surgical lamp')) return 'operating_lamp';
  if (l.includes('greenhouse specimen cart')) return 'greenhouse_cart';
  if (l.includes('funeral casket')) return 'funeral_casket';
  if (l.includes('subway service kiosk')) return 'subway_kiosk';
  if (l.includes('stacked hotel luggage')) return 'hotel_luggage_stack';
  if (l.includes('bride waiting')) return 'figure_bride';
  if (l.includes('luggage porter')) return 'figure_porter';
  if (l.includes('low-poly parked car')) return 'lowpoly_car';
  if (l.includes('low-poly tree')) return 'lowpoly_tree';
  if (l.includes('low-poly television')) return 'lowpoly_tv';
  if (l.includes('low-poly toilet')) return 'lowpoly_toilet';
  if (l.includes('low-poly service robot')) return 'lowpoly_robot';
  if (l.includes('low-poly bystander')) return 'lowpoly_person';
  if (l.includes('low-poly watching bird')) return 'lowpoly_bird';
  if (l.includes('low-poly waiting dog')) return 'lowpoly_dog';
  if (l.includes('giant voxel pedestrian')) return 'voxel_giant';
  if (l.includes('voxel whale')) return 'voxel_whale';
  if (l.includes('voxel hand')) return 'voxel_hand';
  if (l.includes('voxel head')) return 'voxel_head';
  if (l.includes('voxel crawler')) return 'voxel_crawler';
  if (l.includes('voxel cat')) return 'voxel_cat';
  if (l.includes('voxel horizon watcher')) return 'voxel_watcher';
  if (l.includes('voxel train')) return 'voxel_train';
  if (l.includes('paper elevator attendant')) return 'sprite_attendant';
  if (l.includes('paper office worker')) return 'sprite_office_worker';
  if (l.includes('paper masked swimmer')) return 'sprite_swimmer';
  if (l.includes('paper motel guest')) return 'sprite_motel_guest';
  if (l.includes('conference table')) return 'conference_table';
  if (l.includes('dentist chair')) return 'dentist_chair';
  if (l.includes('barber chair')) return 'barber_chair';
  if (l.includes('reading table')) return 'reading_table';
  if (l.includes('bunk bed')) return 'bunk_bed';
  if (l.includes('card table')) return 'card_table';
  if (l.includes('lectern')) return 'lectern';
  if (l.includes('coat rack')) return 'coat_rack';
  if (l.includes('grandfather clock')) return 'grandfather_clock';
  if (l.includes('jukebox')) return 'jukebox';
  if (l.includes('baggage carousel') || l.includes('luggage carousel')) return 'luggage_carousel';
  if (l.includes('ticket booth')) return 'ticket_booth';
  if (l.includes('laundry folding table')) return 'laundry_folding_table';
  if (l.includes('patio table')) return 'patio_table';
  if (l.includes('dentist')) return 'figure_dentist';
  if (l.includes('cashier')) return 'figure_cashier';
  if (l.includes('projectionist')) return 'figure_projectionist';
  if (l.includes('choir member')) return 'figure_choir_member';
  if (l.includes('park ranger')) return 'figure_park_ranger';
  if (l.includes('hotel guest')) return 'figure_hotel_guest';
  if (l.includes('crossing guard')) return 'figure_crossing_guard';
  if (l.includes('bingo caller')) return 'figure_bingo_caller';
  if (l.includes('elevator bank') || l.includes('elevator')) return 'elevator_bank';
  if (l.includes('escalator')) return 'escalator';
  if (l.includes('fuel pump') || l.includes('gas pump')) return 'gas_pump';
  if (l.includes('playground slide')) return 'playground_slide';
  if (l.includes('receiver dish') || l.includes('satellite dish')) return 'satellite_dish';
  if (l.includes('motel sign')) return 'motel_sign';
  if (l.includes('newsstand')) return 'newsstand';
  if (l.includes('shipping container')) return 'shipping_container';
  if (l.includes('upright piano') || l === 'piano') return 'upright_piano';
  if (l.includes('chandelier')) return 'chandelier';
  if (l.includes('cemetery gate')) return 'cemetery_gate';
  if (l.includes('water tower')) return 'water_tower';
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
  if (l.includes('teacher')) return 'figure_teacher';
  if (l.includes('cook')) return 'figure_cook';
  if (l.includes('swimmer')) return 'figure_swimmer';
  if (l.includes('groundskeeper')) return 'figure_groundskeeper';
  if (l.includes('receptionist')) return 'figure_receptionist';
  if (l.includes('courier')) return 'figure_courier';
  if (l.includes('usher')) return 'figure_usher';
  if (l.includes('tourist')) return 'figure_tourist';
  if (/\bmechanic\b/.test(l)) return 'figure_mechanic';
  if (l.includes('off-duty lifeguard') || l === 'lifeguard') return 'figure_lifeguard';
  if (l.includes('market vendor') || l.includes('closed-market vendor')) return 'figure_vendor';
  if (l.includes('firefighter')) return 'figure_firefighter';
  if (l.includes('librarian')) return 'figure_librarian';
  if (l.includes('lab technician')) return 'figure_lab_tech';
  if (l.includes('gym coach') || l.includes('coach')) return 'figure_coach';
  if (l.includes('musician')) return 'figure_musician';
  if (l.includes('giant baby') || l === 'baby') return 'figure_baby';
  if (l.includes('clerk')) return 'figure_clerk';
  if (l.includes('deer')) return 'figure_deer';
  if (l.includes('mannequin')) return 'figure_mannequin';
  if (l.includes('shadow') || l.includes('security shadow')) return 'figure_shadow';
  if (l.includes('balloon')) return 'figure_balloon';
  if (l.includes('guide')) return 'figure_guide';
  if (l.includes('raincoat')) return 'figure_raincoat';
  if (l.includes('stray cat')) return 'animal_cat';
  if (l.includes('waiting dog')) return 'animal_dog';
  if (l.includes('crow')) return 'animal_crow';
  if (l.includes('rabbit')) return 'animal_rabbit';
  if (l.includes('horse')) return 'animal_horse';
  if (l.includes('corridor fish')) return 'animal_fish';
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
  if (l.includes('dining chair')) return 'dining_chair';
  if (l.includes('rolling office chair')) return 'office_chair';
  if (l.includes('coffee table')) return 'coffee_table';
  if (l.includes('side table')) return 'side_table';
  if (l.includes('drawer filing cabinet')) return 'filing_cabinet';
  if (l.includes('reception counter')) return 'reception_desk';
  if (l.includes('wardrobe')) return 'wardrobe';
  if (l.includes('sectional')) return 'sectional';
  if (l.includes('hotel bed')) return 'hotel_bed';
  if (l.includes('nightstand')) return 'nightstand';
  if (l.includes('washer')) return 'washer';
  if (l.includes('phone booth')) return 'phone_booth';
  if (l.includes('bus shelter')) return 'bus_shelter';
  if (l.includes('swing set')) return 'swing_set';
  if (l.includes('poolside lounger')) return 'pool_lounger';
  if (l.includes('lifeguard chair')) return 'lifeguard_chair';
  if (l.includes('streetlight')) return 'streetlight';
  if (l.includes('stacked pallets')) return 'pallet_stack';
  if (l.includes('server rack')) return 'server_rack';
  if (l.includes('aquarium tank')) return 'aquarium_tank';
  if (l.includes('utility shelf')) return 'utility_shelf';
  if (l.includes('breaker panel')) return 'breaker_panel';
  if (l.includes('mechanical boiler')) return 'boiler';
  if (l.includes('pipe cluster')) return 'pipe_cluster';
  if (l.includes('folding utility table')) return 'folding_table';
  if (l.includes('cafeteria table')) return 'cafeteria_table';
  if (l.includes('airport seat')) return 'airport_seat';
  if (l.includes('examination bed')) return 'examination_bed';
  if (l.includes('snack machine')) return 'snack_machine';
  if (l.includes('luggage pile')) return 'luggage_pile';
  if (l.includes('garden bench')) return 'garden_bench';
  if (l.includes('market stall')) return 'market_stall';
  if (l.includes('maintenance sink')) return 'maintenance_sink';
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
