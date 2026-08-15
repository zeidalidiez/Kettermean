import * as THREE from 'three';
import { hashString } from '../core/rng';
import { geometryForShape } from './modelQuality';
import { buildCraftedModel } from './craftedModels';
import type { PropKind } from './models';
import {
  CINEMATIC_BOUNDS,
  CINEMATIC_CREATURE_KINDS,
  CINEMATIC_HUMANOID_KINDS,
  CINEMATIC_PROP_FAMILIES,
  cinematicFamilyForKind,
  isCinematicModelKind,
  type CinematicCreatureKind,
  type CinematicHumanoidKind,
  type CinematicModelKind,
  type CinematicPropForm,
  type CinematicPropKind,
} from './cinematicAssets';

type Shape = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'capsule';
type Bounds = { w: number; h: number; d: number };

interface PartOptions {
  shape?: Shape;
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
  glass: string;
  jewel: string;
}

export { CINEMATIC_BOUNDS, isCinematicModelKind };

/** Build one round-five model. All surfaces are real meshes; no canvases or sprites. */
export function buildCinematicModel(
  kind: string,
  variant: number,
  accent: string,
  body: string,
): THREE.Group | null {
  if (!isCinematicModelKind(kind)) return null;
  const model = CINEMATIC_HUMANOID_KINDS.includes(kind as CinematicHumanoidKind)
    ? buildCinematicHumanoid(kind as CinematicHumanoidKind, variant, accent, body)
    : CINEMATIC_CREATURE_KINDS.includes(kind as CinematicCreatureKind)
      ? buildCinematicCreature(kind as CinematicCreatureKind, variant, accent, body)
      : buildCinematicProp(kind as CinematicPropKind, variant, accent, body);
  model.name = `${kind}-${variant}`;
  model.userData.detailTier = 'cinematic';
  model.userData.detailVariant = variant;
  model.userData.modelFamily = cinematicFamilyForKind(kind).id;
  model.userData.geometryOnly = true;
  return model;
}

function buildCinematicProp(
  kind: CinematicPropKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const family = cinematicFamilyForKind(kind);
  const familyIndex = CINEMATIC_PROP_FAMILIES.findIndex((item) => item.kind === kind);
  const bounds = CINEMATIC_BOUNDS[kind];
  const palette = paletteFor(kind, variant, accent, body);
  const form = family.form ?? 'casework';
  const craftedKind = craftedKindForCinematic(kind, form);
  const root = craftedKind
    ? buildCraftedModel(craftedKind, variant, accent, body, bounds) ?? new THREE.Group()
    : new THREE.Group();
  if (!craftedKind || root.children.length === 0) {
    buildPropChassis(root, bounds, palette, variant, familyIndex, form);
  }
  addPropIdentity(root, kind, bounds, palette, variant, form);
  return root;
}

/**
 * The cinematic catalogue contains hundreds of marketing-style names for a
 * much smaller set of real construction archetypes. Route recognisable kinds
 * through the hand-built everyday models first; the remaining unusual props
 * use the form chassis below. This keeps silhouettes semantic without
 * multiplying decorative geometry just to make each catalogue row different.
 */
function craftedKindForCinematic(
  kind: CinematicPropKind,
  form: CinematicPropForm,
): PropKind | null {
  const key = kind.toLowerCase();
  const has = (pattern: RegExp): boolean => pattern.test(key);

  if (has(/payphone/)) return 'payphone';
  if (has(/phone_booth|telephone_booth/)) return 'phone_booth';
  if (has(/office_chair|task_chair|desk_chair/)) return 'office_chair';
  if (has(/armchair|club_chair/)) return 'armchair';
  if (has(/sectional/)) return 'sectional';
  if (has(/sofa|love_?seat|settee|banquette|dining_booth|restaurant_booth|daybed/)) return 'sofa';
  if (has(/cinema_seat|theater_seat/)) return 'cinema_seat';
  if (has(/airport_seat|terminal_seat/)) return 'airport_seat';
  if (has(/pool_lounger|sun_lounger|deck_lounger/)) return 'pool_lounger';
  if (has(/bar_stool|stool/)) return 'stool';
  if (has(/garden.*bench|park.*bench|pavilion_bench/)) return 'garden_bench';
  if (has(/bench|bleacher/)) return 'bench';
  if (has(/dining_chair/)) return 'dining_chair';
  if (has(/chair/)) return 'chair';

  if (has(/hospital_bed|medical_bed|ward_bed|gurney/)) return 'hospital_bed';
  if (has(/exam(ination)?_bed|exam(ination)?_table/)) return 'examination_bed';
  if (has(/crib|cot/)) return 'crib';
  if (has(/mattress|hotel_bed|guest_bed|bunk_bed|bed_frame/)) return 'mattress';

  if (has(/reception.*desk|front_desk|check.?in_desk/)) return 'reception_desk';
  if (has(/coffee_table/)) return 'coffee_table';
  if (has(/side_table|end_table|nightstand/)) return 'side_table';
  if (has(/cafeteria_table|dining_set|bistro_table|canteen_table/)) return 'cafeteria_table';
  if (has(/folding_table/)) return 'folding_table';
  if (has(/desk|workbench|lab_bench|checkout_counter|service_counter/)) return 'desk';
  if (has(/table|island/)) return 'table';

  if (has(/filing_cabinet|file_cabinet|flat_file/)) return 'filing_cabinet';
  if (has(/wardrobe|armoire|closet/)) return 'wardrobe';
  if (has(/bookcase|book_shelf|library_shelf/)) return 'bookcase';
  if (has(/shelf|rack/)) return 'shelf';
  if (has(/locker/)) return 'locker';
  if (has(/cabinet|cupboard|credenza|dresser|tool_chest/)) return 'cabinet';

  if (has(/shopping_cart|medical_cart|service_cart|room_service|trolley|luggage_cart/)) return 'cart';
  if (has(/snack_machine|vending/)) return 'vending';
  if (has(/cooler|freezer|refrigerator|fridge/)) return 'cooler';
  if (has(/washer|washing_machine|laundry_machine/)) return 'washer';
  if (has(/trash|waste_bin|garbage/)) return 'trash';
  if (has(/television|\btv\b|video_wall|departure_board|display_board/)) return 'tv';
  if (has(/terminal|kiosk|atm|arcade|copy_machine|server|control_panel|breaker_panel/)) return 'terminal';

  if (has(/planter|plant_pot/)) return 'planter';
  if (has(/plant|tree|topiary|shrub|palm/)) return 'plant';
  if (has(/lamp|lantern|streetlight|light_fixture/)) return 'lamp';

  // Conservative form fallbacks are limited to forms where the shared
  // construction really is equivalent. Unusual machinery keeps its chassis.
  if (form === 'seating') return 'chair';
  if (form === 'table') return 'table';
  if (form === 'casework') return 'cabinet';
  if (form === 'soft') return 'mattress';
  if (form === 'greenspace') return 'plant';
  return null;
}

const LEGACY_KIND_FORMS: Record<string, CinematicPropForm> = {
  chair: 'seating',
  armchair: 'seating',
  sofa: 'seating',
  sectional: 'seating',
  dining_chair: 'seating',
  office_chair: 'seating',
  stool: 'seating',
  bench: 'seating',
  garden_bench: 'seating',
  pool_lounger: 'seating',
  cinema_seat: 'seating',
  airport_seat: 'seating',
  desk: 'table',
  reception_desk: 'table',
  coffee_table: 'table',
  side_table: 'table',
  table: 'table',
  cafeteria_table: 'table',
  folding_table: 'table',
  lab_bench: 'table',
  greenhouse_table: 'table',
  cabinet: 'casework',
  filing_cabinet: 'casework',
  wardrobe: 'casework',
  bookcase: 'casework',
  shelf: 'casework',
  locker: 'casework',
  utility_shelf: 'casework',
  vending: 'retail',
  plant: 'greenspace',
  planter: 'greenspace',
  lamp: 'ceremonial',
  mattress: 'soft',
  crib: 'soft',
  hospital_bed: 'soft',
  examination_bed: 'soft',
  cooler: 'kitchen',
  washer: 'kitchen',
  trash: 'industrial',
  cart: 'industrial',
  generator: 'industrial',
  boiler: 'industrial',
  server_rack: 'technology',
  tv: 'technology',
  terminal: 'technology',
  phone_booth: 'transport',
  payphone: 'transport',
  // Remaining expanded-tier kinds previously left on crude builders.
  school_desk: 'table',
  display_case: 'casework',
  gurney: 'clinical',
  arcade: 'technology',
  checkout: 'retail',
  kiosk: 'technology',
  barrier: 'industrial',
  picnic: 'table',
  bleacher: 'seating',
  tree: 'greenspace',
  fountain: 'aquatic',
  nightstand: 'casework',
  bus_shelter: 'transport',
  swing_set: 'leisure',
  lifeguard_chair: 'leisure',
  streetlight: 'ceremonial',
  pallet_stack: 'industrial',
  aquarium_tank: 'aquatic',
  medical_cart: 'clinical',
  privacy_screen: 'casework',
  copy_machine: 'technology',
  archive_trolley: 'industrial',
  ticket_gate: 'transport',
  departure_board: 'technology',
  shopping_cart: 'retail',
  retail_display: 'retail',
  chalkboard: 'office',
  tool_chest: 'industrial',
  drum_stack: 'industrial',
  luggage_cart: 'transport',
  room_service: 'retail',
  traffic_cone: 'industrial',
  exercise_bike: 'leisure',
  pool_ladder: 'aquatic',
  breaker_panel: 'technology',
  pipe_cluster: 'industrial',
  snack_machine: 'retail',
  luggage_pile: 'transport',
  market_stall: 'retail',
  maintenance_sink: 'kitchen',
  rubble_pile: 'industrial',
  fire_barrel: 'industrial',
  broken_column: 'ceremonial',
  collapsed_beam: 'industrial',
  wooden_barricade: 'industrial',
  altar: 'ceremonial',
  office_cubicle: 'office',
  restaurant_booth: 'seating',
  warehouse_crate: 'industrial',
  telescope: 'technology',
};

/**
 * Rebuild the pre-cinematic everyday kinds through the high-detail prop forms so
 * rooms stop rendering basic lego silhouettes. Bounds come from the caller to
 * avoid a module cycle with models.ts.
 */
export function buildCinematicLegacyModel(
  kind: string,
  variant: number,
  accent: string,
  body: string,
  bounds: { w: number; h: number; d: number },
): THREE.Group | null {
  const form = LEGACY_KIND_FORMS[kind];
  if (!form) return null;
  const palette = paletteFor(`legacy_${kind}` as CinematicModelKind, variant, accent, body);
  const familyIndex = hashString(kind) % 120;
  const root = new THREE.Group();
  buildPropChassis(root, bounds, palette, variant, familyIndex, form);
  addPropIdentity(root, kind, bounds, palette, variant, form);
  root.name = `${kind}-${variant}`;
  root.userData.detailTier = 'cinematic';
  root.userData.detailVariant = variant;
  root.userData.legacyUpgrade = true;
  root.userData.geometryOnly = true;
  return root;
}

function buildPropChassis(
  root: THREE.Group,
  b: Bounds,
  p: Palette,
  _variant: number,
  _family: number,
  form: CinematicPropForm,
): void {
  const add = partAdder(root);
  switch (form) {
    case 'seating': {
      add([b.w * 0.92, b.h * 0.16, b.d * 0.92], [0, b.h * 0.5, 0], p.primary, { name: 'cine-seat-cushion' });
      add([b.w * 0.88, b.h * 0.55, b.d * 0.2], [0, b.h * 0.75, -b.d * 0.36], p.secondary, { name: 'cine-seat-back' });
      for (const side of [-1, 1]) {
        add([b.w * 0.14, b.h * 0.5, b.d * 0.9], [side * b.w * 0.42, b.h * 0.62, 0], p.secondary, { name: 'cine-seat-arm' });
        add([b.w * 0.08, b.h * 0.4, b.w * 0.08], [side * b.w * 0.36, b.h * 0.18, b.d * 0.3], p.trim, { shape: 'capsule', name: 'cine-seat-leg' });
      }
      break;
    }
    case 'table': {
      add([b.w * 0.96, b.h * 0.07, b.d * 0.96], [0, b.h * 0.9, 0], p.primary, { name: 'cine-table-top' });
      add([b.w * 0.92, b.h * 0.05, b.d * 0.92], [0, b.h * 0.62, 0], p.secondary, { name: 'cine-table-apron' });
      for (const side of [-1, 1]) for (const depth of [-1, 1]) {
        add([b.w * 0.08, b.h * 0.55, b.w * 0.08], [side * b.w * 0.42, b.h * 0.3, depth * b.d * 0.42], p.trim, { shape: 'capsule', name: 'cine-table-leg' });
        add([b.w * 0.1, b.h * 0.04, b.w * 0.1], [side * b.w * 0.42, b.h * 0.035, depth * b.d * 0.42], p.dark, { shape: 'sphere', name: 'cine-table-foot' });
      }
      break;
    }
    case 'casework': {
      add([b.w * 0.9, b.h * 0.82, b.d * 0.8], [0, b.h * 0.52, 0], p.primary, { name: 'cine-case-carcass' });
      for (let panel = 0; panel < 6; panel += 1) {
        const x = ((panel % 3) - 1) * b.w * 0.24;
        const y = b.h * (0.28 + Math.floor(panel / 3) * 0.4);
        add([b.w * 0.2, b.h * 0.3, b.d * 0.05], [x, y, b.d * 0.4], panel % 2 ? p.secondary : p.light, { name: 'cine-case-front' });
        add([b.w * 0.03, b.w * 0.03, b.d * 0.03], [x, y, b.d * 0.44], p.glow, { shape: 'sphere', metalness: 0.72, name: 'cine-case-pull' });
      }
      add([b.w * 0.88, b.h * 0.06, b.d * 0.84], [0, b.h * 0.95, 0], p.trim, { name: 'cine-case-cap' });
      break;
    }
    case 'soft': {
      add([b.w * 0.95, b.h * 0.28, b.d * 0.9], [0, b.h * 0.42, 0], p.primary, { name: 'cine-soft-base' });
      add([b.w * 0.9, b.h * 0.22, b.d * 0.84], [0, b.h * 0.62, 0], p.secondary, { name: 'cine-soft-pad' });
      add([b.w * 0.86, b.h * 0.5, b.d * 0.16], [0, b.h * 0.85, -b.d * 0.38], p.secondary, { name: 'cine-soft-headboard' });
      break;
    }
    case 'kitchen': {
      add([b.w * 0.94, b.h * 0.06, b.d * 0.9], [0, b.h * 0.92, 0], p.trim, { metalness: 0.4, name: 'cine-counter-top' });
      add([b.w * 0.9, b.h * 0.8, b.d * 0.86], [0, b.h * 0.45, 0], p.primary, { name: 'cine-counter-carcass' });
      for (let door = 0; door < 8; door += 1) {
        const x = ((door % 4) - 1.5) * b.w * 0.18;
        const y = b.h * (0.2 + Math.floor(door / 4) * 0.5);
        add([b.w * 0.15, b.h * 0.38, b.d * 0.05], [x, y, b.d * 0.4], door % 2 ? p.secondary : p.light, { name: 'cine-counter-door' });
      }
      add([b.w * 0.3, b.h * 0.16, b.d * 0.4], [0, b.h * 0.75, b.d * 0.15], p.glow, { shape: 'sphere', opacity: 0.9, name: 'cine-counter-sink' });
      break;
    }
    case 'clinical': {
      add([b.w * 0.9, b.h * 0.09, b.d * 0.85], [0, b.h * 0.85, 0], p.primary, { name: 'cine-clinical-deck' });
      for (const side of [-1, 1]) {
        add([b.w * 0.06, b.h * 0.7, b.w * 0.06], [side * b.w * 0.4, b.h * 0.35, 0], p.trim, { shape: 'capsule', name: 'cine-clinical-pillar' });
        add([b.w * 0.14, b.h * 0.05, b.w * 0.05], [side * b.w * 0.4, b.h * 0.03, 0], p.dark, { shape: 'capsule', name: 'cine-clinical-caster' });
      }
      add([b.w * 0.7, b.h * 0.08, b.d * 0.5], [0, b.h * 0.98, -b.d * 0.18], p.secondary, { name: 'cine-clinical-tray' });
      break;
    }
    case 'office': {
      add([b.w * 0.92, b.h * 0.06, b.d * 0.88], [0, b.h * 0.85, 0], p.primary, { name: 'cine-office-top' });
      add([b.w * 0.88, b.h * 0.5, b.d * 0.1], [0, b.h * 0.42, b.d * 0.3], p.secondary, { name: 'cine-office-modesty' });
      for (const side of [-1, 1]) for (const depth of [-1, 1]) {
        add([b.w * 0.07, b.h * 0.72, b.w * 0.07], [side * b.w * 0.4, b.h * 0.36, depth * b.d * 0.4], p.trim, { shape: 'capsule', name: 'cine-office-leg' });
      }
      add([b.w * 0.3, b.h * 0.24, b.d * 0.4], [b.w * 0.22, b.h * 0.42, b.d * 0.05], p.light, { name: 'cine-office-drawer' });
      break;
    }
    case 'leisure': {
      add([b.w * 0.9, b.h * 0.16, b.d * 0.85], [0, b.h * 0.55, 0], p.primary, { name: 'cine-leisure-deck' });
      for (const side of [-1, 1]) add([b.w * 0.12, b.h * 0.42, b.w * 0.12], [side * b.w * 0.38, b.h * 0.75, 0], p.secondary, { name: 'cine-leisure-upright' });
      add([b.w * 0.8, b.h * 0.08, b.d * 0.6], [0, b.h * 0.95, 0], p.trim, { name: 'cine-leisure-headrail' });
      break;
    }
    case 'retail': {
      add([b.w * 0.92, b.h * 0.06, b.d * 0.9], [0, b.h * 0.9, 0], p.primary, { name: 'cine-retail-top' });
      add([b.w * 0.88, b.h * 0.7, b.d * 0.84], [0, b.h * 0.4, 0], p.secondary, { name: 'cine-retail-carcass' });
      add([b.w * 0.86, b.h * 0.08, b.d * 0.8], [0, b.h * 0.12, 0], p.trim, { name: 'cine-retail-toe' });
      break;
    }
    case 'transport': {
      add([b.w * 0.94, b.h * 0.08, b.d * 0.9], [0, b.h * 0.86, 0], p.primary, { name: 'cine-transport-top' });
      add([b.w * 0.88, b.h * 0.7, b.d * 0.84], [0, b.h * 0.38, 0], p.secondary, { name: 'cine-transport-carcass' });
      for (const side of [-1, 1]) add([b.w * 0.12, b.h * 0.05, b.d * 0.8], [side * b.w * 0.44, b.h * 0.035, 0], p.dark, { name: 'cine-transport-runner' });
      break;
    }
    case 'greenspace': {
      add([b.w * 0.8, b.h * 0.14, b.d * 0.8], [0, b.h * 0.1, 0], p.trim, { shape: 'cylinder', name: 'cine-planter-pot' });
      add([b.w * 0.7, b.h * 0.72, b.d * 0.7], [0, b.h * 0.52, 0], p.secondary, { shape: 'sphere', name: 'cine-plant-canopy' });
      break;
    }
    case 'ceremonial': {
      add([b.w * 0.9, b.h * 0.08, b.d * 0.84], [0, b.h * 0.88, 0], p.primary, { name: 'cine-ceremony-top' });
      add([b.w * 0.7, b.h * 0.78, b.d * 0.7], [0, b.h * 0.42, 0], p.secondary, { shape: 'cylinder', name: 'cine-ceremony-pillar' });
      for (const side of [-1, 1]) add([b.w * 0.1, b.h * 0.3, b.w * 0.1], [side * b.w * 0.38, b.h * 0.16, 0], p.trim, { shape: 'capsule', name: 'cine-ceremony-foot' });
      break;
    }
    case 'aquatic': {
      add([b.w * 0.9, b.h * 0.12, b.d * 0.86], [0, b.h * 0.08, 0], p.trim, { name: 'cine-aquatic-base' });
      add([b.w * 0.82, b.h * 0.72, b.d * 0.78], [0, b.h * 0.5, 0], p.glass, { shape: 'box', opacity: 0.5, name: 'cine-aquatic-tank' });
      for (const side of [-1, 1]) add([b.w * 0.07, b.h * 0.8, b.w * 0.07], [side * b.w * 0.4, b.h * 0.42, 0], p.trim, { shape: 'capsule', name: 'cine-aquatic-column' });
      break;
    }
    case 'industrial': {
      add([b.w * 0.92, b.h * 0.06, b.d * 0.88], [0, b.h * 0.88, 0], p.primary, { name: 'cine-industrial-deck' });
      for (const side of [-1, 1]) for (const depth of [-1, 1]) {
        add([b.w * 0.09, b.h * 0.8, b.w * 0.09], [side * b.w * 0.4, b.h * 0.4, depth * b.d * 0.4], p.trim, { shape: 'capsule', name: 'cine-industrial-post' });
      }
      add([b.w * 0.8, b.h * 0.05, b.d * 0.7], [0, b.h * 0.58, 0], p.secondary, { name: 'cine-industrial-shelf' });
      break;
    }
    default: {
      // technology
      add([b.w * 0.92, b.h * 0.06, b.d * 0.86], [0, b.h * 0.88, 0], p.primary, { name: 'cine-tech-top' });
      add([b.w * 0.86, b.h * 0.7, b.d * 0.8], [0, b.h * 0.38, 0], p.secondary, { name: 'cine-tech-carcass' });
      for (let vent = 0; vent < 5; vent += 1) add([b.w * 0.09, b.h * 0.018, b.d * 0.025], [(vent - 2) * b.w * 0.14, b.h * 0.68, b.d * 0.4], p.dark, { name: 'cine-tech-vent-slot' });
      break;
    }
  }
}

function addPropIdentity(
  root: THREE.Group,
  kind: string,
  b: Bounds,
  p: Palette,
  variant: number,
  form: CinematicPropForm,
): void {
  const add = partAdder(root);
  const key = kind.toLowerCase();
  const front = b.d * 0.48;
  const offset = (variant % 3 - 1) * b.w * 0.035;

  // Details describe function: seams on upholstery, drawer hardware on
  // casework, controls on machines. The old implementation added dozens of
  // unrelated beads, toruses, screws and finials to every object.
  switch (form) {
    case 'seating':
    case 'soft': {
      add([b.w * 0.7, b.h * 0.012, b.d * 0.025], [offset, b.h * 0.59, front], p.trim, { name: 'upholstery-front-seam' });
      if (/bed|mattress|cot/.test(key)) {
        add([b.w * 0.82, b.h * 0.015, b.d * 0.02], [0, b.h * 0.69, front], p.light, { name: 'mattress-piped-edge' });
      }
      break;
    }
    case 'table': {
      if (/dining|bistro|cafeteria|canteen/.test(key)) {
        add([b.w * 0.16, b.h * 0.018, b.w * 0.16], [offset, b.h * 0.94, 0], p.light, { shape: 'cylinder', name: 'place-setting-plate' });
        add([b.w * 0.045, b.h * 0.1, b.w * 0.045], [b.w * 0.16, b.h * 0.98, 0], p.glass, { shape: 'cylinder', opacity: 0.72, name: 'place-setting-glass' });
      } else if (/desk|workstation|reception/.test(key)) {
        add([b.w * 0.28, b.h * 0.22, b.d * 0.035], [offset, b.h * 1.04, 0], p.dark, { name: 'desk-monitor' });
        add([b.w * 0.24, b.h * 0.015, b.d * 0.22], [offset, b.h * 0.94, b.d * 0.14], p.secondary, { name: 'desk-keyboard' });
      }
      break;
    }
    case 'casework':
    case 'kitchen':
    case 'office':
    case 'retail': {
      const drawerCount = /filing|drawer|tool_chest/.test(key) ? 3 : 2;
      for (let drawer = 0; drawer < drawerCount; drawer += 1) {
        const y = b.h * (0.3 + drawer * 0.24);
        add([b.w * 0.68, b.h * 0.18, b.d * 0.025], [0, y, front], drawer % 2 ? p.secondary : p.primary, { name: 'casework-front-panel' });
        add([b.w * 0.16, b.h * 0.025, b.d * 0.035], [offset, y, front + b.d * 0.025], p.trim, { metalness: 0.6, name: 'casework-pull-handle' });
      }
      if (/sink|basin/.test(key)) {
        add([b.w * 0.35, b.h * 0.035, b.d * 0.35], [0, b.h * 0.92, 0], p.dark, { shape: 'cylinder', metalness: 0.65, name: 'sink-basin' });
        add([b.w * 0.035, b.h * 0.18, b.w * 0.035], [0, b.h * 1.02, -b.d * 0.18], p.trim, { shape: 'cylinder', metalness: 0.75, name: 'sink-faucet' });
      }
      break;
    }
    case 'clinical': {
      add([b.w * 0.54, b.h * 0.035, b.d * 0.38], [0, b.h * 0.91, 0], p.light, { metalness: 0.5, name: 'clinical-instrument-tray' });
      add([b.w * 0.22, b.h * 0.18, b.d * 0.035], [offset, b.h * 0.69, front], p.dark, { name: 'clinical-readout' });
      add([b.w * 0.16, b.h * 0.025, b.d * 0.012], [offset, b.h * 0.69, front + b.d * 0.025], p.glow, { emissive: p.glow, emissiveIntensity: 0.35, name: 'clinical-readout-line' });
      break;
    }
    case 'leisure': {
      if (/bike|cycle/.test(key)) {
        for (const x of [-b.w * 0.28, b.w * 0.28]) {
          add([b.w * 0.3, b.w * 0.055, b.w * 0.055], [x, b.h * 0.26, 0], p.dark, { shape: 'torus', rotation: [0, Math.PI / 2, 0], name: 'exercise-wheel' });
        }
      } else {
        add([b.w * 0.62, b.h * 0.045, b.d * 0.05], [0, b.h * 0.72, front], p.trim, { name: 'leisure-grip-bar' });
      }
      break;
    }
    case 'transport': {
      add([b.w * 0.56, b.h * 0.22, b.d * 0.035], [offset, b.h * 0.65, front], p.dark, { name: 'transport-information-display' });
      add([b.w * 0.46, b.h * 0.025, b.d * 0.012], [offset, b.h * 0.65, front + b.d * 0.025], p.glow, { emissive: p.glow, emissiveIntensity: 0.4, name: 'transport-display-line' });
      break;
    }
    case 'greenspace': {
      add([b.w * 0.68, b.h * 0.04, b.d * 0.68], [0, b.h * 0.2, 0], p.trim, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'planter-rim' });
      break;
    }
    case 'ceremonial': {
      if (/altar|shrine|candle/.test(key)) {
        for (const x of [-b.w * 0.22, b.w * 0.22]) {
          add([b.w * 0.035, b.h * 0.16, b.w * 0.035], [x, b.h * 0.98, 0], p.light, { shape: 'cylinder', name: 'ceremonial-candle' });
          add([b.w * 0.025, b.h * 0.04, b.w * 0.025], [x, b.h * 1.08, 0], p.glow, { shape: 'cone', emissive: p.glow, emissiveIntensity: 0.8, name: 'ceremonial-flame' });
        }
      } else {
        add([b.w * 0.5, b.h * 0.035, b.d * 0.06], [0, b.h * 0.72, front], p.trim, { name: 'ceremonial-inscription-band' });
      }
      break;
    }
    case 'aquatic': {
      add([b.w * 0.74, b.h * 0.018, b.d * 0.025], [0, b.h * 0.66, front], p.glow, { opacity: 0.62, name: 'aquatic-waterline' });
      add([b.w * 0.045, b.h * 0.45, b.w * 0.045], [-b.w * 0.32, b.h * 0.45, -b.d * 0.28], p.trim, { shape: 'cylinder', metalness: 0.6, name: 'aquatic-filter-pipe' });
      break;
    }
    case 'industrial': {
      for (const side of [-1, 1]) {
        add([b.w * 0.055, b.h * 0.54, b.d * 0.045], [side * b.w * 0.33, b.h * 0.47, front], p.trim, { rotation: [0, 0, side * 0.45], metalness: 0.65, name: 'industrial-cross-brace' });
      }
      break;
    }
    default: {
      add([b.w * 0.58, b.h * 0.28, b.d * 0.035], [offset, b.h * 0.58, front], p.dark, { name: 'technology-screen-bezel' });
      add([b.w * 0.5, b.h * 0.21, b.d * 0.012], [offset, b.h * 0.58, front + b.d * 0.025], p.glow, { emissive: p.glow, emissiveIntensity: 0.32, name: 'technology-screen' });
      for (let control = 0; control < 3; control += 1) {
        add([b.w * 0.08, b.h * 0.035, b.d * 0.025], [(control - 1) * b.w * 0.13 + offset, b.h * 0.34, front + b.d * 0.02], control === variant % 3 ? p.glow : p.light, { name: 'technology-control-key' });
      }
    }
  }
}

function buildCinematicHumanoid(
  kind: CinematicHumanoidKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const b = CINEMATIC_BOUNDS[kind];
  const p = paletteFor(kind, variant, accent, body);
  const role = CINEMATIC_HUMANOID_KINDS.indexOf(kind);
  const root = new THREE.Group();
  const add = partAdder(root);

  add([b.w * 0.5, b.h * 0.3, b.d * 0.5], [0, b.h * 0.6, 0], p.primary, { shape: 'capsule', name: 'cine-torso' });
  add([b.w * 0.42, b.h * 0.24, b.d * 0.44], [0, b.h * 0.64, -b.d * 0.03], p.secondary, { shape: 'capsule', name: 'cine-vest' });
  add([b.w * 0.34, b.h * 0.22, b.d * 0.36], [0, b.h * 0.9, b.d * 0.02], p.light, { shape: 'sphere', name: 'rig-head' });
  add([b.w * 0.12, b.h * 0.08, b.d * 0.15], [0, b.h * 0.78, 0], p.light, { shape: 'cylinder', name: 'cine-neck' });
  for (const side of [-1, 1]) {
    add([b.w * 0.17, b.h * 0.15, b.d * 0.2], [side * b.w * 0.33, b.h * 0.7, 0], p.secondary, { shape: 'sphere', name: 'cine-shoulder' });
    const arm = add([b.w * 0.11, b.h * 0.28, b.w * 0.11], [side * b.w * 0.38, b.h * 0.6, 0], p.secondary, { shape: 'capsule', rotation: [0, 0, side * (0.06 + variant * 0.015)], name: side < 0 ? 'rig-arm-left' : 'rig-arm-right' });
    arm.userData.baseRotation = { x: arm.rotation.x, y: arm.rotation.y, z: arm.rotation.z };
    add([b.w * 0.1, b.h * 0.24, b.w * 0.1], [side * b.w * 0.41, b.h * 0.44, b.d * 0.01], p.primary, { shape: 'capsule', name: 'cine-forearm' });
    add([b.w * 0.13, b.h * 0.11, b.w * 0.13], [side * b.w * 0.42, b.h * 0.33, b.d * 0.02], p.light, { shape: 'sphere', name: 'cine-hand' });
    add([b.w * 0.13, b.h * 0.1, b.d * 0.15], [side * b.w * 0.15, b.h * 0.42, 0], p.dark, { shape: 'sphere', name: 'cine-hip' });
    const leg = add([b.w * 0.14, b.h * 0.28, b.w * 0.14], [side * b.w * 0.15, b.h * 0.31, 0], p.dark, { shape: 'capsule', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
    leg.userData.baseRotation = { x: 0, y: 0, z: 0 };
    add([b.w * 0.12, b.h * 0.23, b.w * 0.12], [side * b.w * 0.15, b.h * 0.15, 0], p.trim, { shape: 'capsule', name: 'cine-shin' });
    add([b.w * 0.18, b.h * 0.08, b.d * 0.36], [side * b.w * 0.15, b.h * 0.035, b.d * 0.07], p.dark, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'cine-shoe' });
  }
  for (let button = 0; button < 7; button += 1) add([b.w * 0.03, b.w * 0.03, b.d * 0.02], [0, b.h * (0.44 + button * 0.04), b.d * 0.26], button % 2 ? p.glow : p.light, { shape: 'sphere', metalness: 0.6, name: 'cine-vest-button' });
  addHumanoidRoleGear(root, b, p, variant, role);
  addHumanoidFinish(root, b, p, variant, role);
  return root;
}

function addHumanoidRoleGear(root: THREE.Group, b: Bounds, p: Palette, variant: number, role: number): void {
  const add = partAdder(root);
  const front = b.d * 0.4;
  switch (role % 10) {
    case 0: // barista / food service: pitcher + cups
      add([b.w * 0.12, b.h * 0.16, b.w * 0.12], [b.w * 0.42, b.h * 0.66, front], p.light, { shape: 'cylinder', metalness: 0.5, name: 'cine-gear-pitcher' });
      for (let cup = 0; cup < 8; cup += 1) add([b.w * 0.035, b.h * 0.05, b.w * 0.035], [b.w * (0.18 + cup % 2 * 0.08), b.h * (0.42 + Math.floor(cup / 2) * 0.07), front], cup % 2 ? p.glow : p.light, { shape: 'cylinder', name: 'cine-gear-cup' });
      break;
    case 1: // chef: chef hat + pan
      add([b.w * 0.34, b.h * 0.14, b.d * 0.34], [0, b.h * 1.02, 0], p.light, { shape: 'sphere', name: 'cine-gear-chef-hat' });
      add([b.w * 0.24, b.h * 0.05, b.w * 0.24], [b.w * 0.4, b.h * 0.62, front], p.dark, { shape: 'cylinder', name: 'cine-gear-pan' });
      break;
    case 2: // server: tray
      add([b.w * 0.3, b.h * 0.03, b.d * 0.3], [b.w * 0.42, b.h * 0.74, front], p.light, { shape: 'cylinder', name: 'cine-gear-tray' });
      break;
    case 3: // florist / gardener: watering can + blooms
      add([b.w * 0.14, b.h * 0.18, b.w * 0.14], [b.w * 0.42, b.h * 0.64, front], p.secondary, { shape: 'cylinder', name: 'cine-gear-can' });
      for (let bloom = 0; bloom < 6; bloom += 1) add([b.w * 0.04, b.h * 0.06, b.w * 0.04], [b.w * (0.2 + bloom % 3 * 0.1), b.h * (0.4 + Math.floor(bloom / 3) * 0.14), front], shifted(p.glow, bloom), { shape: 'sphere', name: 'cine-gear-bloom' });
      break;
    case 4: // book / library: book stack + glasses
      for (let book = 0; book < 9; book += 1) add([b.w * 0.09, b.h * 0.045, b.d * 0.16], [b.w * 0.4, b.h * (0.44 + book * 0.045), front], book % 2 ? p.primary : p.secondary, { name: 'cine-gear-book' });
      add([b.w * 0.2, b.h * 0.02, b.w * 0.1], [0, b.h * 0.91, b.d * 0.2], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'cine-gear-glasses' });
      break;
    case 5: // clinical: stethoscope + clipboard
      add([b.w * 0.08, b.h * 0.2, b.w * 0.08], [0, b.h * 0.7, front], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'cine-gear-stethoscope' });
      add([b.w * 0.22, b.h * 0.16, b.d * 0.03], [b.w * 0.42, b.h * 0.55, front], p.light, { name: 'cine-gear-clipboard' });
      break;
    case 6: // transit / civic: cap + badge
      add([b.w * 0.36, b.h * 0.08, b.d * 0.34], [0, b.h * 1.0, 0], p.dark, { shape: 'cylinder', name: 'cine-gear-cap' });
      add([b.w * 0.08, b.h * 0.08, b.d * 0.03], [0, b.h * 0.66, front], p.glow, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'cine-gear-badge' });
      break;
    case 7: // tech: tablet + phone
      add([b.w * 0.24, b.h * 0.3, b.d * 0.03], [b.w * 0.4, b.h * 0.6, front], p.dark, { name: 'cine-gear-tablet' });
      add([b.w * 0.08, b.h * 0.14, b.d * 0.02], [b.w * 0.34, b.h * 0.66, front], p.glow, { emissive: p.glow, emissiveIntensity: 0.4, name: 'cine-gear-phone' });
      break;
    case 8: // professional: briefcase + documents
      add([b.w * 0.26, b.h * 0.12, b.d * 0.16], [b.w * 0.42, b.h * 0.5, front], p.trim, { name: 'cine-gear-briefcase' });
      for (let doc = 0; doc < 8; doc += 1) add([b.w * 0.08, b.h * 0.03, b.d * 0.16], [b.w * (0.2 + doc % 2 * 0.1), b.h * (0.44 + Math.floor(doc / 2) * 0.05), front], doc % 2 ? p.light : p.secondary, { name: 'cine-gear-document' });
      break;
    default: // artist / musician: instrument or brush
      add([b.w * 0.035, b.h * 0.7, b.w * 0.035], [b.w * 0.48, b.h * 0.6, 0], p.trim, { shape: 'capsule', rotation: [0, 0, -0.12], name: 'cine-gear-instrument' });
      for (let key = 0; key < 10; key += 1) add([b.w * 0.04, b.h * 0.07, b.d * 0.02], [((key % 5) - 2) * b.w * 0.07, b.h * (0.48 + Math.floor(key / 5) * 0.12), front], key % 2 ? p.glow : p.light, { name: 'cine-gear-key' });
  }
  add([b.w * (0.08 + role * 0.002), b.h * (0.09 + variant * 0.007), b.d * 0.03], [0, b.h * 0.74, front + b.d * 0.02], p.jewel, { shape: role % 3 === 0 ? 'torus' : role % 3 === 1 ? 'cone' : 'sphere', rotation: [Math.PI / 2, 0, role * 0.09], metalness: 0.6, name: `cine-role-${role}-badge` });
}

function addHumanoidFinish(root: THREE.Group, b: Bounds, p: Palette, variant: number, role: number): void {
  const add = partAdder(root);
  for (const side of [-1, 1]) {
    for (let seam = 0; seam < 7; seam += 1) add([b.w * 0.018, b.h * 0.07, b.d * 0.016], [side * b.w * (0.18 + seam * 0.012), b.h * (0.45 + seam * 0.04), b.d * 0.26], seam % 2 ? p.glow : p.trim, { shape: 'capsule', rotation: [0, 0, side * (0.16 + seam * 0.02)], name: 'cine-seam' });
  }
  for (let medal = 0; medal < 8 + variant; medal += 1) {
    const x = (medal - (7 + variant) / 2) * b.w * 0.035;
    add([b.w * 0.022, b.h * (0.04 + medal % 3 * 0.01), b.d * 0.016], [x, b.h * (0.77 + medal % 2 * 0.03), b.d * 0.29], shifted(p.glow, medal + role), { shape: medal % 2 ? 'sphere' : 'cone', name: `cine-variant-${variant}-badge` });
  }
  for (let brim = 0; brim < 9; brim += 1) {
    const angle = brim / 9 * Math.PI * 2;
    add([b.w * 0.05, b.h * 0.05, b.d * 0.03], [Math.cos(angle) * b.w * 0.2, b.h * 0.99 + Math.sin(angle) * b.h * 0.03, Math.sin(angle) * b.d * 0.18], brim % 2 ? p.primary : p.glow, { shape: brim % 3 ? 'sphere' : 'cone', rotation: [0, angle, -angle], name: 'cine-headwear-detail' });
  }
}

function buildCinematicCreature(
  kind: CinematicCreatureKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const b = CINEMATIC_BOUNDS[kind];
  const p = paletteFor(kind, variant, accent, body);
  const species = CINEMATIC_CREATURE_KINDS.indexOf(kind);
  const root = new THREE.Group();
  buildSpeciesBody(root, kind, b, p, variant);
  addCreatureFinish(root, b, p, variant, species);
  return root;
}

function buildSpeciesBody(
  root: THREE.Group,
  kind: CinematicCreatureKind,
  b: Bounds,
  p: Palette,
  variant: number,
): void {
  const add = partAdder(root);
  const quadruped = kind.includes('dog') || kind.includes('cat') || kind.includes('horse') ||
    kind.includes('pony') || kind.includes('donkey') || kind.includes('goat') ||
    kind.includes('sheep') || kind.includes('cow') || kind.includes('pig') ||
    kind.includes('fox') || kind.includes('deer') || kind.includes('raccoon') ||
    kind.includes('squirrel') || kind.includes('otter') || kind.includes('sea_lion') ||
    kind.includes('ferret') || kind.includes('rabbit') || kind.includes('guinea_pig') ||
    kind.includes('hamster') || kind.includes('chicken') || kind.includes('duck') ||
    kind.includes('goose') || kind.includes('turkey') || kind.includes('gecko') ||
    kind.includes('chameleon') || kind.includes('turtle');
  const aquatic = kind.includes('fish') || kind.includes('koi') || kind.includes('dolphin') ||
    kind.includes('whale') || kind.includes('octopus') || kind.includes('stingray');
  const bird = kind.includes('budgerigar') || kind.includes('cockatiel') ||
    kind.includes('parrot') || kind.includes('canary') || kind.includes('pigeon') ||
    kind.includes('robin') || kind.includes('sparrow');

  if (aquatic) {
    const segmentCount = 14 + variant;
    for (let segment = 0; segment < segmentCount; segment += 1) {
      const t = segment / (segmentCount - 1);
      add([b.w * (0.5 - t * 0.2), b.h * (0.45 - t * 0.18), b.d * 0.18], [Math.sin(t * Math.PI) * b.w * 0.1, b.h * (0.45 + Math.sin(t * Math.PI) * 0.05), b.d * (0.34 - t * 0.7)], shifted(p.primary, segment), { shape: 'sphere', name: segment === 0 ? 'rig-head' : 'cine-fish-body' });
    }
    for (let fin = 0; fin < 6; fin += 1) add([b.w * 0.2, b.h * 0.16, b.d * 0.03], [0, b.h * (0.5 + fin * 0.05), b.d * (0.1 - fin * 0.14)], p.secondary, { shape: 'cone', rotation: [0, Math.PI / 2, fin * 0.1], name: 'cine-fish-fin' });
    return;
  }

  if (bird) {
    add([b.w * 0.5, b.h * 0.5, b.d * 0.55], [0, b.h * 0.45, -b.d * 0.05], p.light, { shape: 'sphere', name: 'cine-bird-body' });
    add([b.w * 0.32, b.h * 0.3, b.d * 0.32], [0, b.h * 0.75, b.d * 0.3], p.primary, { shape: 'sphere', name: 'rig-head' });
    add([b.w * 0.1, b.h * 0.07, b.d * 0.3], [0, b.h * 0.72, b.d * 0.48], p.glow, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'cine-bird-beak' });
    for (const side of [-1, 1]) {
      add([b.w * 0.09, b.h * 0.4, b.w * 0.09], [side * b.w * 0.2, b.h * 0.18, -b.d * 0.02], p.trim, { shape: 'capsule', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
      for (let feather = 0; feather < 10; feather += 1) add([b.w * 0.08, b.h * (0.16 + feather * 0.012), b.d * 0.04], [side * b.w * (0.18 + feather * 0.016), b.h * (0.5 + feather * 0.008), -b.d * (0.05 + feather * 0.016)], shifted(p.light, feather + variant), { shape: 'capsule', rotation: [0, 0, side * (0.16 + feather * 0.02)], name: side < 0 ? 'rig-wing-left' : 'rig-wing-right' });
    }
    return;
  }

  if (quadruped) {
    add([b.w * 0.6, b.h * 0.42, b.d * 0.72], [0, b.h * 0.46, -b.d * 0.06], p.primary, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'cine-quad-body' });
    add([b.w * 0.4, b.h * 0.38, b.d * 0.44], [0, b.h * 0.72, b.d * 0.38], p.secondary, { shape: 'sphere', name: 'rig-head' });
    add([b.w * 0.28, b.h * 0.2, b.d * 0.28], [0, b.h * 0.6, b.d * 0.6], p.light, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'cine-quad-muzzle' });
    for (const side of [-1, 1]) {
      for (const z of [-1, 1]) add([b.w * 0.09, b.h * 0.42, b.w * 0.09], [side * b.w * 0.24, b.h * 0.2, z * b.d * 0.22], p.dark, { shape: 'capsule', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
      add([b.w * 0.1, b.h * 0.1, b.d * 0.07], [side * b.w * 0.2, b.h * 0.76, b.d * 0.32], p.primary, { shape: 'sphere', name: 'cine-quad-ear' });
    }
    for (let fur = 0; fur < 14 + variant; fur += 1) {
      const angle = fur / (14 + variant) * Math.PI * 2;
      add([b.w * 0.02, b.h * 0.08, b.d * 0.018], [Math.cos(angle) * b.w * 0.3, b.h * (0.5 + Math.sin(angle * 2) * 0.14), Math.sin(angle) * b.d * 0.3], shifted(p.secondary, fur), { shape: 'capsule', rotation: [0, angle, -angle], name: 'cine-quad-fur' });
    }
    return;
  }

  // Compact / small creatures (turtle, gecko, chameleon, octopus, stingray fallbacks)
  add([b.w * 0.55, b.h * 0.42, b.d * 0.6], [0, b.h * 0.42, 0], p.primary, { shape: 'capsule', rotation: [Math.PI / 2, 0, 0], name: 'cine-small-body' });
  add([b.w * 0.34, b.h * 0.3, b.d * 0.34], [0, b.h * 0.68, b.d * 0.34], p.secondary, { shape: 'sphere', name: 'rig-head' });
  for (const side of [-1, 1]) for (const z of [-1, 1]) add([b.w * 0.06, b.h * 0.16, b.w * 0.06], [side * b.w * 0.2, b.h * 0.14, z * b.d * 0.2], p.dark, { shape: 'capsule', name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
}

function addCreatureFinish(
  root: THREE.Group,
  b: Bounds,
  p: Palette,
  variant: number,
  species: number,
): void {
  const add = partAdder(root);
  for (let mark = 0; mark < 20; mark += 1) {
    const angle = mark / 20 * Math.PI * 2 + species * 0.15;
    add([b.w * (0.02 + mark % 3 * 0.006), b.h * (0.02 + mark % 2 * 0.008), b.d * 0.015], [Math.cos(angle) * b.w * 0.28, b.h * (0.45 + Math.sin(angle * 3) * 0.14), b.d * (0.42 + Math.sin(angle) * 0.05)], mark % 2 ? p.glow : p.light, { shape: mark % 3 ? 'sphere' : 'torus', rotation: [Math.PI / 2, 0, angle], name: `cine-species-${species}-marking` });
  }
  for (let crest = 0; crest < 8 + variant; crest += 1) {
    const t = crest / (7 + variant);
    add([b.w * 0.02, b.h * 0.06, b.d * 0.02], [(t - 0.5) * b.w * 0.44, b.h * (0.72 + Math.sin(t * Math.PI) * 0.06), -b.d * (0.06 + Math.cos(t * Math.PI) * 0.15)], shifted(p.jewel, crest + species), { shape: crest % 2 ? 'cone' : 'sphere', rotation: [0, variant * 0.1, -0.35 + t * 0.7], name: `cine-creature-variant-${variant}-crest` });
  }
}

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
      roughness: options.roughness ?? 0.46,
      metalness: options.metalness ?? 0.18,
      emissive: options.emissive ?? '#000000',
      emissiveIntensity: options.emissiveIntensity ?? 0,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 0.5,
    });
    const mesh = new THREE.Mesh(geometryForShape(options.shape ?? 'box'), material);
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    if (options.rotation) mesh.rotation.set(...options.rotation);
    mesh.name = options.name ?? 'cine-detail';
    mesh.userData.baseRotation = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
    mesh.castShadow = opacity > 0.5;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
}

function paletteFor(kind: CinematicModelKind, variant: number, accent: string, body: string): Palette {
  const hash = hashString(kind);
  const hue = ((hash % 37) - 18) * 0.0052 + variant * 0.026;
  const primary = new THREE.Color(body).offsetHSL(hue, 0.05, (variant - 3.5) * 0.015).getStyle();
  const secondary = new THREE.Color(accent).offsetHSL(-hue * 0.6, 0.09, (variant % 3 - 1) * 0.03).getStyle();
  const trim = new THREE.Color(primary).multiplyScalar(0.4).getStyle();
  const dark = new THREE.Color(secondary).multiplyScalar(0.22).getStyle();
  const light = new THREE.Color(primary).lerp(new THREE.Color('#faf3e7'), 0.7).getStyle();
  const glow = ['#f2c14e', '#61d9e0', '#ee87b0', '#a9e37a', '#f78f5f', '#98aef7'][variant % 6]!;
  const jewel = new THREE.Color(glow).lerp(new THREE.Color(secondary), 0.38).getStyle();
  return {
    primary,
    secondary,
    trim,
    dark,
    light,
    glow,
    jewel,
    glass: new THREE.Color(glow).lerp(new THREE.Color('#bce8eb'), 0.7).getStyle(),
  };
}

function shifted(color: string, amount: number): string {
  return new THREE.Color(color).offsetHSL(amount * 0.013, (amount % 3 - 1) * 0.025, (amount % 5 - 2) * 0.017).getStyle();
}
