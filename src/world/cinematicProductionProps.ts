import * as THREE from 'three';
import { buildExpandedProductionProp } from './expandedPropModels';
import { geometryForShape } from './modelQuality';

type Bounds = { w: number; h: number; d: number };
type Shape = 'box' | 'cylinder' | 'cone' | 'torus' | 'sphere';

interface PartOptions {
  shape?: Shape;
  rotation?: [number, number, number];
  metalness?: number;
  roughness?: number;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  name: string;
}

interface Palette {
  primary: string;
  secondary: string;
  dark: string;
  light: string;
  metal: string;
  glass: string;
  wood: string;
  glow: string;
}

const INDUSTRIAL_OVERRIDE = /(bbq_grill|vacuum_stand|fireplace_logs|forklift|conveyor_section|workbench|pegboard|material_lift|recycling_bin|street_cleaner|rooftop_ac_unit|rooftop_water_tank|cargo_cart|pallet_jack|scale_weigh_station|packing_table|shrink_wrap_machine|cooler_chest|picnic_cooler|patio_heater|bench_vise|table_saw_stand|miter_saw_bench|drill_press_stand|sanding_station|tool_shadow_board|clamp_storage|paint_station|spray_booth|floodlight_tripod|scaffold_section)/;
const LEISURE_OVERRIDE = /(gym_bench_press|treadmill|lifeguard_stand|foosball_table|pool_table|air_hockey|dartboard|exercise_mat|dumbbell_rack|kettlebell|rowing_machine|yoga_blocks|basketball_hoop|golf_bag|inflatable_ring|beach_towel_rack|volleyball_net|excavator_toy|crane_toy|steamroller_toy|dump_truck_toy|fire_truck_toy|digging_dino_toy|robot_toy|dollhouse_toy|train_set_toy|building_blocks|marble_run|puppet_theater|rocking_boat|stuffed_bear|stuffed_rabbit|dinosaur_puppet|baby_bouncer|nursery_rocking_horse)/;
const CLINICAL_OVERRIDE = /(lab_fume_hood|microscope_station|centrifuge_bench|nurse_station|icu_monitor_stand|wheelchair|pharmacy_counter|eye_wash_station|first_aid_station)/;
const TRANSPORT_OVERRIDE = /(terminal_check_in|baggage_carousel|security_scanner|bike_rack|escalator_end|staircase_landing|handrail_run)/;
const TECHNOLOGY_OVERRIDE = /(photo_booth|arcade_cabinet_pair|pinball_machine|stage_lighting_rig|concert_speaker_stack|phone_charging_kiosk|charging_station|smart_home_hub|drone_dock|rooftop_solar_rig|rooftop_antennas|weather_station_post|emergency_light|exit_sign_post)/;
const OFFICE_OVERRIDE = /(reception_counter|desk_organizer_set|whiteboard)/;
const GREENSPACE_DISPLAY_OVERRIDE = /(bonsai_table|herb_garden_shelf|greenhouse_bench|terrarium_table|picnic_basket)/;
const GREENSPACE_STRUCTURE_OVERRIDE = /(rose_arbor|garden_obelisk|beach_umbrella|hammock_stand|greenhouse_frame|cold_frame|potting_shed)/;
const GREENSPACE_UTILITY_OVERRIDE = /(watering_cart|compost_bin|compost_tumbler|rain_barrel|garden_tool_rack|wheelbarrow|sprinkler|soaker_hose_rack|sundial|garden_gnome|thermometer_post)/;
const OUTLIER_OVERRIDE = /(fire_extinguisher_post|playpen|elevator_bank_doors|fish_tank_stand|umbrella_table|high_chair|soaking_tub|rocking_chair)/;
const RETAIL_OVERRIDE = /(concession_stand|ticket_booth|shop_mannequin|mannequin_pair|clothing_rack|produce_bin|freezer_island|soda_fountain|food_truck_counter|hat_rack|deli_warmer|coffee_bar)/;

/**
 * Reuse a verified production construction when a cinematic catalogue name is
 * genuinely the same real-world object. This runs before the broad cinematic
 * form chassis, which previously turned gates, carts, shelters, and machinery
 * into interchangeable cabinets and tables.
 */
export function buildCinematicProductionProp(
  kind: string,
  variant: number,
  accent: string,
  body: string,
  bounds: Bounds,
): THREE.Group | null {
  if (!kind.startsWith('cine_prop_')) return null;
  const key = kind.slice('cine_prop_'.length);
  const productionKind = productionKindFor(key);
  let model: THREE.Group | null = null;
  if (productionKind) {
    const semanticVariant = (variant + key.length) % 8;
    model = buildExpandedProductionProp(
      productionKind,
      semanticVariant,
      accent,
      body,
      bounds,
    );
  } else if (INDUSTRIAL_OVERRIDE.test(key)) {
    model = new THREE.Group();
    buildIndustrialProp(model, key, bounds, paletteFor(variant, accent, body), variant);
  } else if (LEISURE_OVERRIDE.test(key)) {
    model = new THREE.Group();
    buildLeisureProp(model, key, bounds, paletteFor(variant, accent, body), variant);
  } else if (CLINICAL_OVERRIDE.test(key)) {
    model = new THREE.Group();
    buildClinicalProp(model, key, bounds, paletteFor(variant, accent, body), variant);
  } else if (TRANSPORT_OVERRIDE.test(key)) {
    model = new THREE.Group();
    buildTransportProp(model, key, bounds, paletteFor(variant, accent, body), variant);
  } else if (TECHNOLOGY_OVERRIDE.test(key)) {
    model = new THREE.Group();
    buildTechnologyProp(model, key, bounds, paletteFor(variant, accent, body), variant);
  } else if (OFFICE_OVERRIDE.test(key)) {
    model = new THREE.Group();
    buildOfficeProp(model, key, bounds, paletteFor(variant, accent, body), variant);
  } else if (GREENSPACE_DISPLAY_OVERRIDE.test(key)) {
    model = new THREE.Group();
    buildGreenspaceDisplay(model, key, bounds, paletteFor(variant, accent, body), variant);
  } else if (GREENSPACE_STRUCTURE_OVERRIDE.test(key)) {
    model = new THREE.Group();
    buildGreenspaceStructure(model, key, bounds, paletteFor(variant, accent, body), variant);
  } else if (GREENSPACE_UTILITY_OVERRIDE.test(key)) {
    model = new THREE.Group();
    buildGreenspaceUtility(model, key, bounds, paletteFor(variant, accent, body), variant);
  } else if (OUTLIER_OVERRIDE.test(key)) {
    model = new THREE.Group();
    buildOutlierProp(model, key, bounds, paletteFor(variant, accent, body), variant);
  } else if (RETAIL_OVERRIDE.test(key)) {
    model = new THREE.Group();
    buildRetailProp(model, key, bounds, paletteFor(variant, accent, body), variant);
  } else if (key === 'pool_lane_marker') {
    model = new THREE.Group();
    buildPoolLaneMarker(model, bounds, paletteFor(variant, accent, body), variant);
  }
  if (!model) return null;
  model.name = `${kind}-${variant}`;
  model.userData.detailTier = 'cinematic-production-prop';
  model.userData.cinematicSourceKind = kind;
  model.userData.reusedProductionKind = productionKind ?? null;
  model.userData.productionCinematicProp = true;
  return model;
}

function buildIndustrialProp(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  if (/(forklift|material_lift|pallet_jack|street_cleaner|cargo_cart)/.test(key)) {
    buildIndustrialVehicle(root, key, b, p, variant);
  } else if (key === 'conveyor_section') {
    buildConveyor(root, b, p, variant);
  } else if (/(rooftop_ac_unit|rooftop_water_tank)/.test(key)) {
    buildRooftopUtility(root, key, b, p, variant);
  } else if (/(bbq_grill|fireplace_logs|patio_heater)/.test(key)) {
    buildHeatFixture(root, key, b, p, variant);
  } else if (/(vacuum_stand|floodlight_tripod)/.test(key)) {
    buildEquipmentStand(root, key, b, p, variant);
  } else if (key === 'scaffold_section') {
    buildScaffold(root, b, p, variant);
  } else if (/(recycling_bin|cooler_chest|picnic_cooler)/.test(key)) {
    buildIndustrialContainer(root, key, b, p, variant);
  } else {
    buildWorkshopStation(root, key, b, p, variant);
  }
}

function buildIndustrialVehicle(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const compact = key.includes('pallet_jack');
  const chassisY = b.h * (compact ? 0.16 : 0.23);
  add([b.w * 0.68, b.h * (compact ? 0.08 : 0.2), b.d * 0.66], [0, chassisY, 0], p.primary, { name: 'industrial-vehicle-chassis', metalness: 0.34 });
  for (const x of [-0.28, 0.28]) for (const z of [-0.28, 0.28]) {
    add([b.w * 0.16, b.w * 0.075, b.w * 0.16], [x * b.w, b.h * 0.11, z * b.d], p.dark, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'industrial-vehicle-wheel' });
  }
  if (key.includes('pallet_jack')) {
    for (const side of [-1, 1]) add([b.w * 0.055, b.h * 0.045, b.d * 0.8], [side * b.w * 0.18, b.h * 0.2, b.d * 0.12], p.metal, { name: 'pallet-jack-lifting-fork', metalness: 0.58 });
    addBeamBetween(root, [0, b.h * 0.22, -b.d * 0.28], [0, b.h * 0.82, -b.d * 0.42], b.w * 0.045, p.metal, 'pallet-jack-steering-handle');
    add([b.w * 0.34, b.h * 0.045, b.d * 0.045], [0, b.h * 0.83, -b.d * 0.42], p.dark, { name: 'pallet-jack-hand-grip' });
    return;
  }
  if (key.includes('cargo_cart')) {
    add([b.w * 0.76, b.h * 0.055, b.d * 0.72], [0, b.h * 0.36, 0], p.wood, { name: 'cargo-cart-loading-deck' });
    for (const side of [-1, 1]) add([b.w * 0.04, b.h * 0.5, b.d * 0.04], [side * b.w * 0.36, b.h * 0.58, -b.d * 0.3], p.metal, { name: 'cargo-cart-handle-upright', metalness: 0.55 });
    add([b.w * 0.72, b.h * 0.045, b.d * 0.045], [0, b.h * 0.82, -b.d * 0.3], p.metal, { name: 'cargo-cart-push-handle', metalness: 0.55 });
    return;
  }
  if (key.includes('street_cleaner')) {
    add([b.w * 0.48, b.h * 0.48, b.d * 0.5], [-b.w * 0.12, b.h * 0.52, 0], p.secondary, { name: 'street-cleaner-cab' });
    add([b.w * 0.32, b.h * 0.22, b.d * 0.025], [-b.w * 0.12, b.h * 0.61, b.d * 0.26], p.glass, { name: 'street-cleaner-windshield', opacity: 0.55 });
    add([b.w * 0.36, b.h * 0.34, b.d * 0.44], [b.w * 0.25, b.h * 0.46, 0], p.primary, { name: 'street-cleaner-debris-hopper' });
    for (const side of [-1, 1]) add([b.w * 0.3, b.h * 0.05, b.d * 0.3], [side * b.w * 0.3, b.h * 0.05, b.d * 0.23], p.dark, { shape: 'cylinder', name: 'street-cleaner-rotary-brush' });
    return;
  }
  // Forklifts and material lifts share a mast, but retain real forks and cab.
  add([b.w * 0.42, b.h * 0.42, b.d * 0.45], [-b.w * 0.18, b.h * 0.51, 0], p.secondary, { name: 'forklift-driver-cab' });
  add([b.w * 0.3, b.h * 0.08, b.d * 0.3], [-b.w * 0.18, b.h * 0.63, 0], p.dark, { name: 'forklift-driver-seat' });
  for (const side of [-1, 1]) add([b.w * 0.05, b.h * 0.74, b.d * 0.05], [side * b.w * 0.25, b.h * 0.62, b.d * 0.3], p.metal, { name: 'forklift-overhead-guard', metalness: 0.58 });
  for (const side of [-1, 1]) add([b.w * 0.055, b.h * 0.85, b.d * 0.055], [side * b.w * 0.33, b.h * 0.55, -b.d * 0.3], p.metal, { name: 'forklift-lift-mast', metalness: 0.62 });
  for (const side of [-1, 1]) add([b.w * 0.08, b.h * 0.045, b.d * 0.66], [side * b.w * 0.2, b.h * 0.22, -b.d * 0.15], p.metal, { name: 'forklift-load-fork', metalness: 0.62 });
  void variant;
}

function buildConveyor(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (const x of [-0.43, 0.43]) for (const z of [-0.35, 0.35]) add([b.w * 0.04, b.h * 0.48, b.d * 0.04], [x * b.w, b.h * 0.25, z * b.d], p.metal, { name: 'conveyor-square-support-leg', metalness: 0.52 });
  for (const side of [-1, 1]) add([b.w * 0.94, b.h * 0.08, b.d * 0.06], [0, b.h * 0.55, side * b.d * 0.42], p.primary, { name: 'conveyor-side-frame', metalness: 0.38 });
  for (let roller = -5; roller <= 5; roller += 1) add([b.d * 0.7, b.w * 0.035, b.w * 0.035], [roller * b.w * 0.08, b.h * 0.56, 0], roller === variant - 3 ? p.secondary : p.metal, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'conveyor-driven-roller', metalness: 0.58 });
  add([b.w * 0.26, b.h * 0.24, b.d * 0.24], [b.w * 0.34, b.h * 0.34, b.d * 0.34], p.dark, { name: 'conveyor-drive-motor' });
}

function buildRooftopUtility(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  if (key.includes('water_tank')) {
    for (const x of [-0.3, 0.3]) for (const z of [-0.3, 0.3]) add([b.w * 0.05, b.h * 0.45, b.d * 0.05], [x * b.w, b.h * 0.23, z * b.d], p.metal, { name: 'rooftop-tank-support-leg', metalness: 0.58 });
    add([b.w * 0.72, b.h * 0.5, b.d * 0.72], [0, b.h * 0.68, 0], p.primary, { shape: 'cylinder', name: 'rooftop-water-storage-tank', metalness: 0.38 });
    for (const y of [0.5, 0.75]) add([b.w * 0.74, b.h * 0.03, b.d * 0.74], [0, b.h * y, 0], p.metal, { shape: 'cylinder', name: 'rooftop-tank-band', metalness: 0.56 });
  } else {
    add([b.w * 0.9, b.h * 0.72, b.d * 0.86], [0, b.h * 0.4, 0], p.light, { name: 'rooftop-ac-weather-housing', metalness: 0.36 });
    for (let vent = -4; vent <= 4; vent += 1) add([b.w * 0.035, b.h * 0.46, b.d * 0.025], [vent * b.w * 0.085, b.h * 0.42, b.d * 0.44], p.dark, { name: 'rooftop-ac-vent-louver' });
    add([b.w * 0.52, b.w * 0.04, b.w * 0.52], [0, b.h * 0.8, 0], p.metal, { shape: 'cylinder', name: 'rooftop-ac-condenser-fan', metalness: 0.48 });
  }
  void variant;
}

function buildHeatFixture(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  if (key.includes('patio_heater')) {
    add([b.w * 0.55, b.h * 0.07, b.d * 0.55], [0, b.h * 0.04, 0], p.dark, { shape: 'cylinder', name: 'patio-heater-weighted-base' });
    add([b.w * 0.07, b.h * 0.72, b.w * 0.07], [0, b.h * 0.42, 0], p.metal, { shape: 'cylinder', name: 'patio-heater-gas-column', metalness: 0.62 });
    add([b.w * 0.35, b.h * 0.23, b.d * 0.35], [0, b.h * 0.78, 0], '#d96e31', { shape: 'cylinder', name: 'patio-heater-radiant-burner', emissive: '#d96e31', emissiveIntensity: 0.28 });
    add([b.w * 0.86, b.h * 0.08, b.d * 0.86], [0, b.h * 0.94, 0], p.light, { shape: 'cylinder', name: 'patio-heater-reflector', metalness: 0.6 });
    return;
  }
  if (key.includes('fireplace_logs')) {
    for (const angle of [-0.75, 0, 0.75]) add([b.w * 0.72, b.h * 0.11, b.d * 0.11], [0, b.h * (0.15 + Math.abs(angle) * 0.08), angle * b.d * 0.16], p.wood, { shape: 'cylinder', rotation: [0, Math.PI / 2 + angle, 0], name: 'fireplace-split-log' });
    for (let flame = -2; flame <= 2; flame += 1) add([b.w * 0.13, b.h * (0.32 + (flame + 2) % 2 * 0.12), b.d * 0.13], [flame * b.w * 0.13, b.h * 0.4, 0], flame % 2 ? '#ffb640' : '#e95b28', { shape: 'cone', name: 'fireplace-flame', emissive: '#ff792f', emissiveIntensity: 0.65 });
    return;
  }
  add([b.w * 0.82, b.h * 0.42, b.d * 0.68], [0, b.h * 0.38, 0], p.dark, { name: 'bbq-grill-firebox', metalness: 0.44 });
  for (let bar = -4; bar <= 4; bar += 1) add([b.w * 0.72, b.h * 0.018, b.d * 0.018], [0, b.h * 0.61, bar * b.d * 0.07], p.metal, { name: 'bbq-grill-cooking-grate', metalness: 0.66 });
  add([b.w * 0.78, b.h * 0.18, b.d * 0.65], [0, b.h * 0.75, -b.d * 0.05], p.primary, { rotation: [-0.12, 0, 0], name: 'bbq-grill-hinged-lid' });
  for (const side of [-1, 1]) add([b.w * 0.06, b.h * 0.44, b.d * 0.06], [side * b.w * 0.34, b.h * 0.18, 0], p.metal, { name: 'bbq-grill-leg', metalness: 0.52 });
  void variant;
}

function buildEquipmentStand(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  if (key.includes('vacuum')) {
    add([b.w * 0.5, b.h * 0.45, b.d * 0.46], [0, b.h * 0.29, 0], p.primary, { shape: 'cylinder', name: 'vacuum-motor-canister' });
    for (const side of [-1, 1]) add([b.w * 0.15, b.w * 0.07, b.w * 0.15], [side * b.w * 0.24, b.h * 0.08, 0], p.dark, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'vacuum-wheel' });
    addBeamBetween(root, [0, b.h * 0.48, 0], [b.w * 0.26, b.h * 0.92, 0], b.w * 0.045, p.metal, 'vacuum-wand');
    add([b.w * 0.38, b.h * 0.06, b.d * 0.35], [b.w * 0.32, b.h * 0.08, 0], p.dark, { name: 'vacuum-floor-head' });
    return;
  }
  for (const side of [-1, 0, 1]) addBeamBetween(root, [0, b.h * 0.55, 0], [side * b.w * 0.36, 0, (side === 0 ? -0.3 : 0.24) * b.d], b.w * 0.04, p.metal, 'floodlight-tripod-leg');
  add([b.w * 0.07, b.h * 0.6, b.w * 0.07], [0, b.h * 0.58, 0], p.metal, { shape: 'cylinder', name: 'floodlight-tripod-mast', metalness: 0.58 });
  for (const side of [-1, 1]) {
    add([b.w * 0.34, b.h * 0.28, b.d * 0.12], [side * b.w * 0.22, b.h * 0.86, 0], p.dark, { name: 'floodlight-lamp-housing' });
    add([b.w * 0.27, b.h * 0.21, b.d * 0.025], [side * b.w * 0.22, b.h * 0.86, b.d * 0.07], p.glow, { name: 'floodlight-luminous-panel', emissive: p.glow, emissiveIntensity: 0.65 });
  }
  void variant;
}

function buildScaffold(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (const x of [-0.43, 0.43]) for (const z of [-0.35, 0.35]) add([b.w * 0.035, b.h * 0.96, b.d * 0.035], [x * b.w, b.h * 0.5, z * b.d], p.metal, { shape: 'cylinder', name: 'scaffold-vertical-tube', metalness: 0.62 });
  for (const y of [0.12, 0.5, 0.88]) for (const z of [-0.35, 0.35]) add([b.w * 0.86, b.h * 0.03, b.d * 0.03], [0, y * b.h, z * b.d], p.metal, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'scaffold-horizontal-tube', metalness: 0.62 });
  add([b.w * 0.82, b.h * 0.045, b.d * 0.62], [0, b.h * 0.56, 0], p.wood, { name: 'scaffold-work-platform' });
  for (const side of [-1, 1]) addBeamBetween(root, [side * b.w * 0.42, b.h * 0.12, b.d * 0.36], [side * b.w * 0.42, b.h * 0.88, -b.d * 0.36], b.w * 0.025, p.metal, 'scaffold-diagonal-brace');
  void variant;
}

function buildIndustrialContainer(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  if (key.includes('recycling')) {
    add([b.w * 0.82, b.h * 0.78, b.d * 0.78], [0, b.h * 0.42, 0], p.primary, { name: 'recycling-bin-body' });
    add([b.w * 0.88, b.h * 0.12, b.d * 0.84], [0, b.h * 0.86, 0], p.secondary, { name: 'recycling-bin-lid' });
    for (const side of [-1, 1]) add([b.w * 0.26, b.h * 0.04, b.d * 0.06], [side * b.w * 0.22, b.h * 0.91, 0], p.dark, { name: 'recycling-bin-sort-opening' });
    return;
  }
  add([b.w * 0.9, b.h * 0.62, b.d * 0.86], [0, b.h * 0.34, 0], p.light, { name: 'cooler-insulated-body' });
  add([b.w * 0.94, b.h * 0.12, b.d * 0.9], [0, b.h * 0.7, 0], p.secondary, { rotation: [-0.06, 0, 0], name: 'cooler-hinged-lid' });
  addBeamBetween(root, [-b.w * 0.42, b.h * 0.57, 0], [0, b.h * 0.84, -b.d * 0.4], b.w * 0.035, p.dark, 'cooler-carry-handle');
  addBeamBetween(root, [b.w * 0.42, b.h * 0.57, 0], [0, b.h * 0.84, -b.d * 0.4], b.w * 0.035, p.dark, 'cooler-carry-handle');
  void variant;
}

function buildWorkshopStation(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.94, b.h * 0.08, b.d * 0.82], [0, b.h * 0.55, 0], p.wood, { name: 'workshop-heavy-worktop' });
  for (const x of [-0.4, 0.4]) for (const z of [-0.34, 0.34]) add([b.w * 0.045, b.h * 0.52, b.d * 0.045], [x * b.w, b.h * 0.27, z * b.d], p.metal, { name: 'workshop-square-leg', metalness: 0.5 });
  if (/(pegboard|tool_shadow_board|clamp_storage|paint_station)/.test(key)) {
    add([b.w * 0.86, b.h * 0.42, b.d * 0.035], [0, b.h * 0.79, -b.d * 0.37], p.secondary, { name: 'workshop-tool-board' });
    for (let tool = -3; tool <= 3; tool += 1) add([b.w * 0.045, b.h * (0.16 + (tool + 3) % 3 * 0.05), b.d * 0.025], [tool * b.w * 0.11, b.h * 0.8, -b.d * 0.34], tool % 2 ? p.dark : p.light, { rotation: [0, 0, tool * 0.06], name: key.includes('paint') ? 'paint-station-hanging-can' : 'workshop-hanging-tool' });
    return;
  }
  if (/(table_saw|miter_saw)/.test(key)) {
    add([b.w * 0.42, b.w * 0.035, b.w * 0.42], [0, b.h * 0.66, 0], p.metal, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'workshop-circular-saw-blade', metalness: 0.72 });
    add([b.w * 0.48, b.h * 0.06, b.d * 0.32], [0, b.h * 0.59, 0], p.dark, { rotation: [0, key.includes('miter') ? 0.32 : 0, 0], name: 'workshop-saw-fence' });
  } else if (key.includes('drill_press')) {
    add([b.w * 0.08, b.h * 0.62, b.w * 0.08], [0, b.h * 0.75, -b.d * 0.16], p.metal, { shape: 'cylinder', name: 'drill-press-column', metalness: 0.6 });
    add([b.w * 0.35, b.h * 0.2, b.d * 0.3], [0, b.h * 0.92, 0], p.primary, { name: 'drill-press-motor-head' });
    add([b.w * 0.035, b.h * 0.3, b.w * 0.035], [0, b.h * 0.69, b.d * 0.08], p.metal, { shape: 'cylinder', name: 'drill-press-bit', metalness: 0.75 });
  } else if (key.includes('sanding')) {
    add([b.w * 0.42, b.w * 0.04, b.w * 0.42], [0, b.h * 0.72, 0], p.secondary, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'sanding-station-abrasive-disc' });
    add([b.w * 0.34, b.h * 0.3, b.d * 0.34], [0, b.h * 0.7, -b.d * 0.18], p.dark, { name: 'sanding-station-motor' });
  } else if (key.includes('bench_vise')) {
    for (const side of [-1, 1]) add([b.w * 0.22, b.h * 0.2, b.d * 0.3], [side * b.w * 0.13, b.h * 0.7, 0], p.metal, { name: 'bench-vise-clamping-jaw', metalness: 0.65 });
    add([b.w * 0.5, b.h * 0.035, b.d * 0.035], [0, b.h * 0.62, b.d * 0.2], p.dark, { name: 'bench-vise-screw-handle' });
  } else if (key.includes('scale_weigh')) {
    add([b.w * 0.6, b.h * 0.08, b.d * 0.6], [0, b.h * 0.63, 0], p.metal, { name: 'industrial-scale-platform', metalness: 0.5 });
    add([b.w * 0.08, b.h * 0.38, b.d * 0.08], [b.w * 0.32, b.h * 0.76, -b.d * 0.25], p.metal, { name: 'industrial-scale-readout-post', metalness: 0.5 });
    add([b.w * 0.26, b.h * 0.16, b.d * 0.05], [b.w * 0.32, b.h * 0.93, -b.d * 0.25], p.glass, { name: 'industrial-scale-readout', opacity: 0.75, emissive: p.glow, emissiveIntensity: 0.18 });
  } else if (key.includes('shrink_wrap')) {
    for (const side of [-1, 1]) add([b.w * 0.05, b.h * 0.48, b.d * 0.05], [side * b.w * 0.34, b.h * 0.79, 0], p.metal, { name: 'shrink-wrap-arch-post', metalness: 0.55 });
    add([b.w * 0.72, b.h * 0.06, b.d * 0.06], [0, b.h * 1.01, 0], p.metal, { name: 'shrink-wrap-sealing-bar', metalness: 0.55 });
    add([b.w * 0.42, b.w * 0.08, b.w * 0.42], [0, b.h * 0.7, -b.d * 0.28], p.glass, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'shrink-wrap-film-roll', opacity: 0.42 });
  } else if (key.includes('spray_booth')) {
    add([b.w * 0.84, b.h * 0.45, b.d * 0.035], [0, b.h * 0.79, -b.d * 0.38], p.dark, { name: 'spray-booth-extractor-wall' });
    for (let vent = -3; vent <= 3; vent += 1) add([b.w * 0.08, b.h * 0.025, b.d * 0.015], [vent * b.w * 0.11, b.h * 0.8, -b.d * 0.35], p.metal, { name: 'spray-booth-filter-slot', metalness: 0.5 });
    add([b.w * 0.05, b.h * 0.32, b.d * 0.05], [b.w * 0.24, b.h * 0.73, 0], p.secondary, { shape: 'cylinder', name: 'spray-booth-paint-gun' });
  } else {
    add([b.w * 0.34, b.h * 0.22, b.d * 0.32], [b.w * 0.2, b.h * 0.7, 0], p.primary, { name: 'workshop-powered-tool' });
    add([b.w * 0.3, b.h * 0.04, b.d * 0.18], [-b.w * 0.22, b.h * 0.61, 0], p.metal, { name: 'workshop-adjustable-fence', metalness: 0.54 });
  }
  void variant;
}

function buildLeisureProp(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  if (/(_toy|stuffed_|dinosaur_puppet|dollhouse|train_set|building_blocks|marble_run|puppet_theater|rocking_boat|baby_bouncer|rocking_horse)/.test(key)) {
    buildToy(root, key, b, p, variant);
  } else if (/(foosball|pool_table|air_hockey)/.test(key)) {
    buildGameTable(root, key, b, p, variant);
  } else if (/(gym_bench|treadmill|exercise_mat|dumbbell|kettlebell|rowing|yoga)/.test(key)) {
    buildExerciseEquipment(root, key, b, p, variant);
  } else if (key.includes('lifeguard_stand')) {
    buildLifeguardStand(root, b, p, variant);
  } else {
    buildSportEquipment(root, key, b, p, variant);
  }
}

function buildGameTable(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.92, b.h * 0.3, b.d * 0.88], [0, b.h * 0.64, 0], p.dark, { name: 'game-table-cabinet' });
  add([b.w * 0.86, b.h * 0.035, b.d * 0.82], [0, b.h * 0.81, 0], key.includes('pool') ? '#376f58' : p.light, { name: 'game-table-playing-surface' });
  for (const x of [-0.38, 0.38]) for (const z of [-0.34, 0.34]) add([b.w * 0.06, b.h * 0.56, b.d * 0.06], [x * b.w, b.h * 0.3, z * b.d], p.wood, { name: 'game-table-leg' });
  if (key.includes('foosball')) {
    for (let rod = -3; rod <= 3; rod += 1) {
      add([b.w * 0.035, b.h * 0.035, b.d], [rod * b.w * 0.11, b.h * 0.92, 0], p.metal, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'foosball-control-rod', metalness: 0.58 });
      for (const side of [-1, 1]) add([b.w * 0.045, b.h * 0.16, b.d * 0.045], [rod * b.w * 0.11, b.h * 0.88, side * b.d * 0.2], rod % 2 ? p.primary : p.secondary, { name: 'foosball-player' });
    }
  } else if (key.includes('pool')) {
    for (let ball = 0; ball < 8; ball += 1) add([b.w * 0.055, b.w * 0.055, b.w * 0.055], [b.w * (-0.2 + ball % 4 * 0.13), b.h * 0.85, b.d * (-0.12 + Math.floor(ball / 4) * 0.24)], ball % 2 ? p.light : p.secondary, { shape: 'sphere', name: 'pool-table-ball' });
    for (const x of [-0.4, 0, 0.4]) for (const z of [-0.36, 0.36]) add([b.w * 0.07, b.h * 0.025, b.d * 0.07], [x * b.w, b.h * 0.84, z * b.d], p.dark, { shape: 'cylinder', name: 'pool-table-pocket' });
  } else {
    for (const side of [-1, 1]) add([b.w * 0.05, b.h * 0.08, b.d * 0.55], [side * b.w * 0.36, b.h * 0.86, 0], p.primary, { name: 'air-hockey-side-rail' });
    add([b.w * 0.1, b.h * 0.025, b.d * 0.1], [variant % 2 ? b.w * 0.14 : -b.w * 0.14, b.h * 0.85, 0], p.secondary, { shape: 'cylinder', name: 'air-hockey-puck' });
  }
}

function buildExerciseEquipment(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  if (key.includes('treadmill')) {
    add([b.w * 0.72, b.h * 0.08, b.d * 0.82], [0, b.h * 0.13, 0], p.dark, { rotation: [-0.05, 0, 0], name: 'treadmill-running-belt' });
    for (const side of [-1, 1]) addBeamBetween(root, [side * b.w * 0.3, b.h * 0.16, -b.d * 0.32], [side * b.w * 0.3, b.h * 0.82, b.d * 0.32], b.w * 0.04, p.metal, 'treadmill-console-upright');
    add([b.w * 0.7, b.h * 0.18, b.d * 0.12], [0, b.h * 0.86, b.d * 0.32], p.primary, { name: 'treadmill-control-console' });
    add([b.w * 0.35, b.h * 0.08, b.d * 0.025], [0, b.h * 0.87, b.d * 0.39], p.glass, { name: 'treadmill-display', opacity: 0.72, emissive: p.glow, emissiveIntensity: 0.2 });
  } else if (key.includes('rowing')) {
    add([b.w * 0.12, b.h * 0.06, b.d * 0.94], [0, b.h * 0.17, b.d * 0.05], p.metal, { name: 'rowing-machine-seat-rail', metalness: 0.52 });
    add([b.w * 0.34, b.h * 0.08, b.d * 0.25], [0, b.h * 0.28, b.d * 0.18], p.dark, { name: 'rowing-machine-sliding-seat' });
    add([b.w * 0.3, b.w * 0.06, b.w * 0.3], [0, b.h * 0.31, -b.d * 0.38], p.primary, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'rowing-machine-flywheel' });
    for (const side of [-1, 1]) add([b.w * 0.24, b.h * 0.035, b.d * 0.12], [side * b.w * 0.18, b.h * 0.16, b.d * 0.38], p.dark, { rotation: [0, side * 0.15, 0], name: 'rowing-machine-foot-brace' });
    addBeamBetween(root, [0, b.h * 0.42, -b.d * 0.2], [0, b.h * 0.72, b.d * 0.12], b.w * 0.03, p.dark, 'rowing-machine-pull-cable');
    add([b.w * 0.42, b.h * 0.04, b.d * 0.04], [0, b.h * 0.73, b.d * 0.12], p.dark, { name: 'rowing-machine-pull-handle' });
  } else if (key.includes('gym_bench')) {
    add([b.w * 0.6, b.h * 0.12, b.d * 0.78], [0, b.h * 0.35, 0], p.primary, { name: 'bench-press-padded-bench' });
    for (const side of [-1, 1]) add([b.w * 0.06, b.h * 0.72, b.d * 0.06], [side * b.w * 0.36, b.h * 0.43, -b.d * 0.3], p.metal, { name: 'bench-press-rack-upright', metalness: 0.58 });
    add([b.w * 0.92, b.h * 0.045, b.d * 0.045], [0, b.h * 0.82, -b.d * 0.3], p.metal, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'bench-press-barbell', metalness: 0.65 });
    for (const side of [-1, 1]) add([b.w * 0.18, b.w * 0.04, b.w * 0.18], [side * b.w * 0.43, b.h * 0.82, -b.d * 0.3], p.dark, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'bench-press-weight-plate' });
  } else if (key.includes('dumbbell')) {
    for (let tier = 0; tier < 3; tier += 1) add([b.w * 0.8, b.h * 0.045, b.d * 0.2], [0, b.h * (0.25 + tier * 0.27), 0], p.metal, { name: 'dumbbell-rack-tier', metalness: 0.55 });
    for (let weight = 0; weight < 8; weight += 1) {
      const x = b.w * (-0.32 + weight % 4 * 0.21), y = b.h * (0.32 + Math.floor(weight / 4) * 0.28);
      add([b.w * 0.18, b.h * 0.035, b.d * 0.035], [x, y, 0], p.metal, { name: 'dumbbell-handle', metalness: 0.6 });
      for (const side of [-1, 1]) add([b.w * 0.07, b.w * 0.025, b.w * 0.07], [x + side * b.w * 0.09, y, 0], p.dark, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'dumbbell-weight-plate' });
    }
  } else if (key.includes('kettlebell')) {
    add([b.w * 0.48, b.h * 0.52, b.d * 0.48], [0, b.h * 0.3, 0], p.dark, { shape: 'sphere', name: 'kettlebell-cast-body', metalness: 0.38 });
    add([b.w * 0.42, b.h * 0.42, b.w * 0.08], [0, b.h * 0.64, 0], p.dark, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'kettlebell-handle', metalness: 0.4 });
  } else {
    add([b.w * 0.9, b.h * 0.035, b.d * 0.82], [0, b.h * 0.04, 0], p.primary, { name: key.includes('yoga') ? 'yoga-exercise-mat' : 'exercise-floor-mat' });
    const blocks = key.includes('yoga') ? 4 : 2;
    for (let block = 0; block < blocks; block += 1) add([b.w * 0.22, b.h * 0.18, b.d * 0.25], [b.w * (-0.3 + block * 0.2), b.h * 0.13, b.d * (block % 2 ? 0.22 : -0.22)], block % 2 ? p.secondary : p.light, { rotation: [0, block * 0.15, 0], name: 'exercise-foam-block' });
  }
  void variant;
}

function buildLifeguardStand(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (const side of [-1, 1]) addBeamBetween(root, [side * b.w * 0.34, 0, b.d * 0.28], [side * b.w * 0.25, b.h * 0.68, 0], b.w * 0.045, p.wood, 'lifeguard-stand-angled-leg');
  add([b.w * 0.62, b.h * 0.08, b.d * 0.52], [0, b.h * 0.68, 0], p.wood, { name: 'lifeguard-stand-seat-platform' });
  add([b.w * 0.58, b.h * 0.38, b.d * 0.06], [0, b.h * 0.82, -b.d * 0.23], p.secondary, { name: 'lifeguard-stand-seat-back' });
  for (let rung = 0; rung < 4; rung += 1) add([b.w * 0.48, b.h * 0.035, b.d * 0.06], [0, b.h * (0.18 + rung * 0.13), b.d * 0.28], p.metal, { name: 'lifeguard-stand-ladder-rung', metalness: 0.48 });
  add([b.w * 0.88, b.h * 0.07, b.d * 0.78], [0, b.h * 0.97, 0], p.light, { name: 'lifeguard-stand-sun-canopy' });
  void variant;
}

function buildSportEquipment(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  if (key.includes('basketball')) {
    add([b.w * 0.1, b.h * 0.82, b.d * 0.1], [0, b.h * 0.43, -b.d * 0.25], p.metal, { name: 'basketball-hoop-post', metalness: 0.55 });
    add([b.w * 0.68, b.h * 0.4, b.d * 0.05], [0, b.h * 0.82, -b.d * 0.2], p.light, { name: 'basketball-backboard' });
    add([b.w * 0.36, b.w * 0.36, b.w * 0.045], [0, b.h * 0.72, b.d * 0.05], '#c86232', { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'basketball-rim', metalness: 0.45 });
  } else if (key.includes('volleyball')) {
    for (const side of [-1, 1]) add([b.w * 0.045, b.h * 0.92, b.d * 0.045], [side * b.w * 0.44, b.h * 0.48, 0], p.metal, { name: 'volleyball-net-post', metalness: 0.55 });
    for (let line = -4; line <= 4; line += 1) add([b.w * 0.018, b.h * 0.68, b.d * 0.018], [line * b.w * 0.1, b.h * 0.56, 0], p.light, { name: 'volleyball-net-vertical-cord' });
    for (let line = 0; line < 5; line += 1) add([b.w * 0.86, b.h * 0.012, b.d * 0.018], [0, b.h * (0.3 + line * 0.15), 0], p.light, { name: 'volleyball-net-horizontal-cord' });
  } else if (key.includes('dartboard')) {
    add([b.w * 0.62, b.w * 0.05, b.w * 0.62], [0, b.h * 0.58, 0], p.dark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'dartboard-numbered-board' });
    for (let ring = 0; ring < 3; ring += 1) add([b.w * (0.5 - ring * 0.13), b.w * (0.5 - ring * 0.13), b.w * 0.025], [0, b.h * 0.58, b.d * 0.04], ring % 2 ? p.light : p.secondary, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'dartboard-scoring-ring' });
  } else if (key.includes('golf')) {
    add([b.w * 0.48, b.h * 0.65, b.d * 0.42], [0, b.h * 0.36, 0], p.primary, { shape: 'cone', name: 'golf-bag-body' });
    for (let club = -2; club <= 2; club += 1) add([b.w * 0.025, b.h * (0.65 + (club + 2) * 0.04), b.d * 0.025], [club * b.w * 0.08, b.h * 0.64, 0], p.metal, { shape: 'cylinder', rotation: [0, 0, club * 0.035], name: 'golf-club-shaft', metalness: 0.62 });
  } else if (key.includes('inflatable')) {
    add([b.w * 0.82, b.w * 0.82, b.w * 0.18], [0, b.h * 0.35, 0], p.secondary, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'inflatable-swim-ring' });
    for (let stripe = 0; stripe < 4; stripe += 1) add([b.w * 0.12, b.h * 0.2, b.d * 0.08], [Math.cos(stripe * Math.PI / 2) * b.w * 0.33, b.h * 0.35, Math.sin(stripe * Math.PI / 2) * b.d * 0.33], p.light, { rotation: [0, stripe * Math.PI / 2, 0], name: 'inflatable-ring-color-panel' });
  } else {
    for (let towel = 0; towel < 6; towel += 1) add([b.w * 0.72, b.h * 0.055, b.d * 0.14], [0, b.h * (0.16 + towel * 0.13), towel % 2 ? b.d * 0.08 : -b.d * 0.08], towel % 2 ? p.secondary : p.light, { name: 'beach-towel-folded-stack' });
    for (const side of [-1, 1]) add([b.w * 0.05, b.h * 0.88, b.d * 0.05], [side * b.w * 0.4, b.h * 0.46, 0], p.metal, { name: 'beach-towel-rack-post', metalness: 0.5 });
  }
  void variant;
}

function buildToy(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  if (/(excavator|crane|steamroller|dump_truck|fire_truck)/.test(key)) {
    add([b.w * 0.72, b.h * 0.25, b.d * 0.62], [0, b.h * 0.27, 0], p.primary, { name: 'toy-vehicle-chassis' });
    for (const x of [-0.28, 0.28]) for (const z of [-0.26, 0.26]) add([b.w * 0.16, b.w * 0.07, b.w * 0.16], [x * b.w, b.h * 0.12, z * b.d], p.dark, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'toy-vehicle-wheel' });
    add([b.w * 0.3, b.h * 0.28, b.d * 0.32], [-b.w * 0.18, b.h * 0.5, 0], p.secondary, { name: 'toy-vehicle-cab' });
    if (key.includes('excavator') || key.includes('crane')) {
      addBeamBetween(root, [b.w * 0.08, b.h * 0.48, 0], [b.w * 0.42, b.h * 0.86, 0], b.w * 0.055, p.secondary, 'toy-vehicle-lifting-boom');
      add([b.w * 0.2, b.h * 0.16, b.d * 0.24], [b.w * 0.45, b.h * 0.84, 0], p.dark, { name: 'toy-vehicle-bucket-or-hook' });
    } else if (key.includes('dump')) {
      add([b.w * 0.42, b.h * 0.24, b.d * 0.5], [b.w * 0.2, b.h * 0.52, 0], p.secondary, { rotation: [0, 0, -0.18], name: 'toy-dump-truck-bed' });
    } else if (key.includes('fire_truck')) {
      add([b.w * 0.58, b.h * 0.05, b.d * 0.08], [b.w * 0.08, b.h * 0.62, 0], p.light, { name: 'toy-fire-truck-ladder' });
    } else {
      add([b.w * 0.36, b.w * 0.36, b.d * 0.42], [b.w * 0.24, b.h * 0.2, 0], p.dark, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'toy-steamroller-drum' });
    }
  } else if (key.includes('robot')) {
    add([b.w * 0.48, b.h * 0.38, b.d * 0.4], [0, b.h * 0.46, 0], p.primary, { name: 'toy-robot-torso' });
    add([b.w * 0.36, b.h * 0.28, b.d * 0.32], [0, b.h * 0.78, 0], p.light, { name: 'toy-robot-head' });
    for (const side of [-1, 1]) {
      add([b.w * 0.09, b.h * 0.42, b.d * 0.09], [side * b.w * 0.33, b.h * 0.48, 0], p.secondary, { shape: 'cylinder', name: 'toy-robot-arm' });
      add([b.w * 0.11, b.h * 0.35, b.d * 0.12], [side * b.w * 0.18, b.h * 0.18, 0], p.dark, { name: 'toy-robot-leg' });
      add([b.w * 0.055, b.w * 0.025, b.w * 0.055], [side * b.w * 0.1, b.h * 0.8, b.d * 0.18], p.glow, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'toy-robot-eye', emissive: p.glow, emissiveIntensity: 0.35 });
    }
  } else if (key.includes('dollhouse')) {
    add([b.w * 0.82, b.h * 0.58, b.d * 0.72], [0, b.h * 0.34, 0], p.light, { name: 'toy-dollhouse-body' });
    for (const side of [-1, 1]) add([b.w * 0.6, b.h * 0.18, b.d * 0.8], [side * b.w * 0.18, b.h * 0.72, 0], side < 0 ? p.primary : p.secondary, { rotation: [0, 0, side * 0.48], name: 'toy-dollhouse-roof' });
    for (const x of [-0.24, 0.24]) for (const y of [0.25, 0.48]) add([b.w * 0.18, b.h * 0.16, b.d * 0.025], [x * b.w, y * b.h, b.d * 0.37], p.glass, { name: 'toy-dollhouse-window', opacity: 0.62 });
  } else if (key.includes('train_set')) {
    for (let car = -2; car <= 2; car += 1) {
      add([b.w * 0.16, b.h * 0.22, b.d * 0.48], [car * b.w * 0.19, b.h * 0.28, 0], car === -2 ? p.primary : car % 2 ? p.secondary : p.light, { name: car === -2 ? 'toy-train-engine' : 'toy-train-car' });
      for (const z of [-0.18, 0.18]) add([b.w * 0.09, b.w * 0.04, b.w * 0.09], [car * b.w * 0.19, b.h * 0.13, z * b.d], p.dark, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'toy-train-wheel' });
    }
  } else if (key.includes('building_blocks') || key.includes('marble_run')) {
    for (let block = 0; block < 14; block += 1) add([b.w * (0.11 + block % 3 * 0.03), b.h * (0.1 + block % 4 * 0.035), b.d * 0.13], [b.w * (-0.36 + block % 5 * 0.18), b.h * (0.08 + Math.floor(block / 5) * 0.15), b.d * (-0.2 + block % 3 * 0.2)], block % 2 ? p.primary : p.secondary, { rotation: [0, block * 0.18, 0], name: key.includes('marble') ? 'toy-marble-run-ramp' : 'toy-building-block' });
  } else if (key.includes('puppet_theater')) {
    add([b.w * 0.86, b.h * 0.88, b.d * 0.42], [0, b.h * 0.48, 0], p.wood, { name: 'toy-puppet-theater-frame' });
    add([b.w * 0.7, b.h * 0.42, b.d * 0.04], [0, b.h * 0.66, b.d * 0.23], p.dark, { name: 'toy-puppet-stage-opening' });
    for (const side of [-1, 1]) add([b.w * 0.25, b.h * 0.48, b.d * 0.025], [side * b.w * 0.25, b.h * 0.65, b.d * 0.26], p.secondary, { rotation: [0, 0, side * 0.08], name: 'toy-puppet-curtain' });
    for (const side of [-1, 1]) add([b.w * 0.13, b.h * 0.18, b.d * 0.12], [side * b.w * 0.18, b.h * 0.68, b.d * 0.29], side < 0 ? p.primary : p.light, { shape: 'sphere', name: 'toy-puppet-head' });
  } else if (/(stuffed|dinosaur_puppet|digging_dino)/.test(key)) {
    const rabbit = key.includes('rabbit');
    const dino = key.includes('dino');
    add([b.w * 0.48, b.h * 0.44, b.d * 0.52], [0, b.h * 0.37, 0], p.primary, { name: dino ? 'toy-dinosaur-body' : 'stuffed-animal-torso', roughness: 0.9 });
    add([b.w * 0.36, b.h * 0.34, b.d * 0.34], [0, b.h * 0.72, b.d * 0.1], p.light, { name: dino ? 'toy-dinosaur-head' : 'stuffed-animal-head', roughness: 0.9 });
    add([b.w * 0.22, b.h * 0.14, b.d * 0.14], [0, b.h * 0.67, b.d * 0.28], p.secondary, { name: 'stuffed-animal-muzzle', roughness: 0.9 });
    if (rabbit) for (const side of [-1, 1]) add([b.w * 0.12, b.h * 0.42, b.d * 0.12], [side * b.w * 0.13, b.h * 0.95, 0], p.primary, { shape: 'cone', name: 'stuffed-rabbit-ear' });
    if (dino) addBeamBetween(root, [0, b.h * 0.36, -b.d * 0.2], [0, b.h * 0.24, -b.d * 0.48], b.w * 0.1, p.primary, 'toy-dinosaur-tail');
    for (const side of [-1, 1]) {
      add([b.w * 0.13, b.h * 0.3, b.d * 0.15], [side * b.w * 0.2, b.h * 0.16, 0], p.primary, { shape: 'cylinder', name: 'stuffed-animal-leg', roughness: 0.9 });
      add([b.w * 0.11, b.h * 0.3, b.d * 0.13], [side * b.w * 0.29, b.h * 0.43, b.d * 0.02], p.primary, { shape: 'cylinder', rotation: [0, 0, side * 0.3], name: 'stuffed-animal-arm', roughness: 0.9 });
      add([b.w * 0.035, b.h * 0.035, b.d * 0.025], [side * b.w * 0.08, b.h * 0.76, b.d * 0.29], p.dark, { name: 'stuffed-animal-button-eye' });
    }
  } else {
    // Rocking boat, rocking horse, and baby bouncer share curved rockers but
    // keep distinct bodies instead of inheriting a full-size chair.
    for (const side of [-1, 1]) add([b.w * 0.78, b.w * 0.78, b.w * 0.055], [side * b.w * 0.2, b.h * 0.12, 0], p.wood, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'toy-rocking-runner' });
    if (key.includes('boat')) add([b.w * 0.62, b.h * 0.36, b.d * 0.58], [0, b.h * 0.38, 0], p.primary, { shape: 'cone', rotation: [0, 0, Math.PI / 2], name: 'toy-rocking-boat-hull' });
    else if (key.includes('horse')) {
      add([b.w * 0.45, b.h * 0.36, b.d * 0.62], [0, b.h * 0.44, 0], p.primary, { shape: 'sphere', name: 'toy-rocking-horse-body' });
      add([b.w * 0.28, b.h * 0.4, b.d * 0.28], [0, b.h * 0.72, b.d * 0.24], p.light, { shape: 'sphere', name: 'toy-rocking-horse-head' });
    } else add([b.w * 0.68, b.h * 0.14, b.d * 0.58], [0, b.h * 0.38, 0], p.secondary, { rotation: [-0.18, 0, 0], name: 'baby-bouncer-fabric-seat' });
  }
  void variant;
}

function buildGreenspaceDisplay(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  if (key.includes('picnic_basket')) {
    add([b.w * 0.88, b.h * 0.5, b.d * 0.84], [0, b.h * 0.28, 0], p.wood, { name: 'picnic-basket-woven-body', roughness: 0.86 });
    for (let slat = -3; slat <= 3; slat += 1) {
      add([b.w * 0.06, b.h * 0.45, b.d * 0.025], [slat * b.w * 0.11, b.h * 0.3, b.d * 0.43], slat % 2 ? p.light : p.secondary, { name: 'picnic-basket-vertical-weave', roughness: 0.9 });
    }
    for (const y of [0.13, 0.27, 0.41]) add([b.w * 0.9, b.h * 0.035, b.d * 0.025], [0, b.h * y, b.d * 0.45], p.secondary, { name: 'picnic-basket-horizontal-weave', roughness: 0.9 });
    add([b.w * 0.9, b.h * 0.09, b.d * 0.86], [0, b.h * 0.57, 0], p.wood, { rotation: [-0.06, 0, 0], name: 'picnic-basket-hinged-lid', roughness: 0.82 });
    addBeamBetween(root, [-b.w * 0.34, b.h * 0.54, 0], [-b.w * 0.16, b.h * 0.93, 0], b.w * 0.045, p.dark, 'picnic-basket-carry-handle');
    addBeamBetween(root, [-b.w * 0.16, b.h * 0.93, 0], [b.w * 0.16, b.h * 0.93, 0], b.w * 0.045, p.dark, 'picnic-basket-carry-handle');
    addBeamBetween(root, [b.w * 0.16, b.h * 0.93, 0], [b.w * 0.34, b.h * 0.54, 0], b.w * 0.045, p.dark, 'picnic-basket-carry-handle');
    return;
  }

  if (key.includes('herb_garden_shelf')) {
    for (const side of [-1, 1]) add([b.w * 0.055, b.h * 0.96, b.d * 0.055], [side * b.w * 0.44, b.h * 0.5, -b.d * 0.2], p.wood, { name: 'herb-shelf-upright', roughness: 0.78 });
    for (const y of [0.12, 0.43, 0.74]) {
      add([b.w * 0.94, b.h * 0.055, b.d * 0.82], [0, b.h * y, 0], p.wood, { name: 'herb-shelf-slatted-deck', roughness: 0.8 });
      for (const x of [-0.31, 0, 0.31]) {
        add([b.w * 0.18, b.h * 0.15, b.d * 0.22], [x * b.w, b.h * (y + 0.1), 0], x === 0 ? p.secondary : p.primary, { shape: 'cylinder', name: 'herb-shelf-terracotta-pot', roughness: 0.82 });
        for (const leaf of [-1, 0, 1]) add([b.w * 0.045, b.h * 0.18, b.d * 0.04], [x * b.w + leaf * b.w * 0.035, b.h * (y + 0.25), leaf * b.d * 0.04], leaf === 0 ? '#3f7b45' : '#5e9857', { shape: 'cone', rotation: [leaf * 0.18, 0, leaf * 0.28], name: 'herb-shelf-edible-leaf' });
      }
    }
    return;
  }

  const displayHeight = key.includes('greenhouse_bench') ? 0.54 : 0.48;
  for (const x of [-0.4, 0.4]) for (const z of [-0.32, 0.32]) add([b.w * 0.045, b.h * displayHeight, b.d * 0.045], [x * b.w, b.h * displayHeight * 0.5, z * b.d], p.wood, { name: 'garden-display-square-leg', roughness: 0.78 });
  if (key.includes('greenhouse_bench')) {
    for (let slat = -4; slat <= 4; slat += 1) add([b.w * 0.92, b.h * 0.05, b.d * 0.07], [0, b.h * 0.56, slat * b.d * 0.085], p.wood, { name: 'greenhouse-bench-worktop-slat', roughness: 0.8 });
    add([b.w * 0.82, b.h * 0.045, b.d * 0.66], [0, b.h * 0.2, 0], p.wood, { name: 'greenhouse-bench-lower-shelf', roughness: 0.82 });
    for (const x of [-0.3, 0, 0.3]) {
      add([b.w * 0.19, b.h * 0.17, b.d * 0.22], [x * b.w, b.h * 0.69, 0], x === 0 ? p.primary : p.secondary, { shape: 'cylinder', name: 'greenhouse-bench-seedling-pot', roughness: 0.82 });
      for (const side of [-1, 1]) add([b.w * 0.045, b.h * 0.18, b.d * 0.045], [x * b.w + side * b.w * 0.035, b.h * 0.83, 0], '#4f8a50', { shape: 'cone', rotation: [0, 0, side * 0.25], name: 'greenhouse-bench-seedling' });
    }
    return;
  }

  add([b.w * 0.94, b.h * 0.075, b.d * 0.86], [0, b.h * 0.52, 0], p.wood, { name: key.includes('bonsai') ? 'bonsai-display-tabletop' : 'terrarium-display-tabletop', roughness: 0.76 });
  if (key.includes('bonsai')) {
    add([b.w * 0.64, b.h * 0.16, b.d * 0.58], [0, b.h * 0.64, 0], p.secondary, { name: 'bonsai-ceramic-training-pot', roughness: 0.48 });
    add([b.w * 0.56, b.h * 0.025, b.d * 0.5], [0, b.h * 0.73, 0], p.dark, { name: 'bonsai-visible-soil', roughness: 0.96 });
    addBeamBetween(root, [0, b.h * 0.73, 0], [-b.w * 0.08, b.h * 0.95, 0], b.w * 0.055, p.wood, 'bonsai-contorted-trunk');
    addBeamBetween(root, [-b.w * 0.08, b.h * 0.89, 0], [-b.w * 0.27, b.h * 0.97, b.d * 0.04], b.w * 0.035, p.wood, 'bonsai-pruned-branch');
    addBeamBetween(root, [-b.w * 0.06, b.h * 0.92, 0], [b.w * 0.2, b.h * 1.06, -b.d * 0.03], b.w * 0.032, p.wood, 'bonsai-pruned-branch');
    for (const [x, y, z] of [[-0.28, 1.0, 0.05], [0.2, 1.08, -0.04], [0, 1.16, 0.02]] as const) add([b.w * 0.32, b.h * 0.12, b.d * 0.28], [x * b.w, y * b.h, z * b.d], '#4d7643', { name: 'bonsai-clipped-foliage-pad', roughness: 0.94 });
    return;
  }

  add([b.w * 0.76, b.h * 0.025, b.d * 0.66], [0, b.h * 0.6, 0], p.dark, { name: 'terrarium-habitat-soil', roughness: 0.96 });
  for (const side of [-1, 1]) add([b.w * 0.035, b.h * 0.48, b.d * 0.035], [side * b.w * 0.39, b.h * 0.82, 0], p.metal, { name: 'terrarium-corner-frame', metalness: 0.46 });
  add([b.w * 0.82, b.h * 0.43, b.d * 0.025], [0, b.h * 0.82, b.d * 0.34], p.glass, { name: 'terrarium-front-glass', opacity: 0.26, roughness: 0.08 });
  add([b.w * 0.82, b.h * 0.025, b.d * 0.7], [0, b.h * 1.04, 0], p.glass, { name: 'terrarium-glass-lid', opacity: 0.3, roughness: 0.08 });
  addBeamBetween(root, [-b.w * 0.24, b.h * 0.64, -b.d * 0.12], [b.w * 0.24, b.h * 0.93, b.d * 0.08], b.w * 0.04, p.wood, 'terrarium-climbing-branch');
  for (const side of [-1, 0, 1]) add([b.w * 0.09, b.h * 0.25, b.d * 0.08], [side * b.w * 0.2, b.h * 0.74, -b.d * 0.08], '#4b8b54', { shape: 'cone', rotation: [0, 0, side * 0.24], name: 'terrarium-live-plant' });
  void variant;
}

function buildGreenspaceStructure(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  if (key.includes('rose_arbor')) {
    for (const x of [-0.42, 0.42]) for (const z of [-0.35, 0.35]) add([b.w * 0.045, b.h * 0.78, b.d * 0.045], [x * b.w, b.h * 0.4, z * b.d], p.wood, { name: 'rose-arbor-upright', roughness: 0.78 });
    for (const z of [-0.35, 0.35]) {
      addBeamBetween(root, [-b.w * 0.42, b.h * 0.78, z * b.d], [0, b.h * 0.98, z * b.d], b.w * 0.035, p.wood, 'rose-arbor-arched-rafter');
      addBeamBetween(root, [0, b.h * 0.98, z * b.d], [b.w * 0.42, b.h * 0.78, z * b.d], b.w * 0.035, p.wood, 'rose-arbor-arched-rafter');
    }
    for (let rung = 1; rung <= 4; rung += 1) for (const x of [-0.42, 0.42]) add([b.w * 0.025, b.h * 0.025, b.d * 0.72], [x * b.w, b.h * rung * 0.16, 0], p.wood, { name: 'rose-arbor-side-lattice' });
    for (let bloom = 0; bloom < 8; bloom += 1) {
      const side = bloom % 2 ? 1 : -1;
      const y = b.h * (0.18 + bloom * 0.09);
      addBeamBetween(root, [side * b.w * 0.43, y - b.h * 0.08, (bloom % 3 - 1) * b.d * 0.2], [side * b.w * 0.43, y + b.h * 0.08, (bloom % 3 - 1) * b.d * 0.22], b.w * 0.012, '#3d7142', 'rose-arbor-climbing-vine');
      add([b.w * 0.07, b.h * 0.06, b.d * 0.07], [side * b.w * 0.44, y, (bloom % 3 - 1) * b.d * 0.22], bloom % 3 ? '#c84665' : '#e38aa0', { shape: 'cone', rotation: [side * Math.PI / 2, 0, 0], name: 'rose-arbor-bloom', roughness: 0.9 });
    }
    return;
  }
  if (key.includes('garden_obelisk')) {
    for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) addBeamBetween(root, [x * b.w * 0.42, 0, z * b.d * 0.42], [x * b.w * 0.08, b.h * 0.92, z * b.d * 0.08], b.w * 0.035, p.metal, 'garden-obelisk-tapered-rail');
    for (const y of [0.2, 0.42, 0.64]) {
      const half = b.w * (0.42 - y * 0.34);
      add([half * 2, b.h * 0.025, b.d * 0.035], [0, b.h * y, half], p.metal, { name: 'garden-obelisk-cross-tie', metalness: 0.48 });
      add([half * 2, b.h * 0.025, b.d * 0.035], [0, b.h * y, -half], p.metal, { name: 'garden-obelisk-cross-tie', metalness: 0.48 });
      add([b.w * 0.035, b.h * 0.025, half * 2], [half, b.h * y, 0], p.metal, { name: 'garden-obelisk-cross-tie', metalness: 0.48 });
      add([b.w * 0.035, b.h * 0.025, half * 2], [-half, b.h * y, 0], p.metal, { name: 'garden-obelisk-cross-tie', metalness: 0.48 });
    }
    add([b.w * 0.16, b.h * 0.12, b.d * 0.16], [0, b.h * 0.96, 0], p.secondary, { shape: 'cone', name: 'garden-obelisk-crown' });
    return;
  }
  if (key.includes('beach_umbrella')) {
    add([b.w * 0.04, b.h * 0.82, b.d * 0.04], [0, b.h * 0.43, 0], p.metal, { shape: 'cylinder', name: 'beach-umbrella-center-pole', metalness: 0.52 });
    add([b.w * 0.96, b.h * 0.18, b.d * 0.96], [0, b.h * 0.87, 0], variant % 2 ? p.primary : p.secondary, { shape: 'cone', name: 'beach-umbrella-striped-canopy', roughness: 0.72 });
    for (let rib = 0; rib < 8; rib += 1) {
      const angle = rib / 8 * Math.PI * 2;
      addBeamBetween(root, [0, b.h * 0.94, 0], [Math.cos(angle) * b.w * 0.44, b.h * 0.82, Math.sin(angle) * b.d * 0.44], b.w * 0.012, rib % 2 ? p.light : p.metal, 'beach-umbrella-canopy-rib');
    }
    add([b.w * 0.24, b.h * 0.05, b.d * 0.24], [0, b.h * 0.03, 0], p.dark, { shape: 'cylinder', name: 'beach-umbrella-sand-base' });
    return;
  }
  if (key.includes('hammock_stand')) {
    for (const side of [-1, 1]) {
      addBeamBetween(root, [side * b.w * 0.18, b.h * 0.08, -b.d * 0.36], [side * b.w * 0.46, b.h * 0.78, 0], b.h * 0.045, p.wood, 'hammock-stand-rising-support');
      addBeamBetween(root, [side * b.w * 0.18, b.h * 0.08, b.d * 0.36], [side * b.w * 0.46, b.h * 0.78, 0], b.h * 0.045, p.wood, 'hammock-stand-rising-support');
      add([b.w * 0.28, b.h * 0.045, b.d * 0.68], [side * b.w * 0.18, b.h * 0.05, 0], p.wood, { name: 'hammock-stand-ground-foot', roughness: 0.76 });
    }
    add([b.w * 0.42, b.h * 0.055, b.d * 0.055], [0, b.h * 0.07, 0], p.wood, { name: 'hammock-stand-center-spine', roughness: 0.76 });
    addHammockCloth(root, b, p);
    for (let segment = -6; segment < 6; segment += 1) {
      const x0 = segment / 6;
      const x1 = (segment + 1) / 6;
      const y0 = 0.34 + Math.pow(Math.abs(x0), 1.65) * 0.3;
      const y1 = 0.34 + Math.pow(Math.abs(x1), 1.65) * 0.3;
      for (const z of [-0.31, 0.31]) addBeamBetween(root, [x0 * b.w * 0.44, y0 * b.h, z * b.d], [x1 * b.w * 0.44, y1 * b.h, z * b.d], b.h * 0.012, p.dark, 'hammock-woven-edge-rope');
    }
    addBeamBetween(root, [-b.w * 0.46, b.h * 0.78, 0], [-b.w * 0.44, b.h * 0.63, 0], b.w * 0.012, p.dark, 'hammock-suspension-rope');
    addBeamBetween(root, [b.w * 0.44, b.h * 0.63, 0], [b.w * 0.46, b.h * 0.78, 0], b.w * 0.012, p.dark, 'hammock-suspension-rope');
    return;
  }
  if (key.includes('cold_frame')) {
    add([b.w * 0.94, b.h * 0.24, b.d * 0.08], [0, b.h * 0.14, b.d * 0.41], p.wood, { name: 'cold-frame-raised-bed-wall', roughness: 0.8 });
    add([b.w * 0.94, b.h * 0.38, b.d * 0.08], [0, b.h * 0.21, -b.d * 0.41], p.wood, { name: 'cold-frame-raised-bed-wall', roughness: 0.8 });
    for (const side of [-1, 1]) add([b.w * 0.08, b.h * 0.3, b.d * 0.74], [side * b.w * 0.43, b.h * 0.17, 0], p.wood, { name: 'cold-frame-raised-bed-wall', roughness: 0.8 });
    add([b.w * 0.78, b.h * 0.025, b.d * 0.72], [0, b.h * 0.1, 0], p.dark, { name: 'cold-frame-visible-soil', roughness: 0.96 });
    add([b.w * 0.82, b.h * 0.025, b.d * 0.8], [0, b.h * 0.48, 0], p.glass, { rotation: [-0.16, 0, 0], name: 'cold-frame-sloped-glass-lid', opacity: 0.3, roughness: 0.08 });
    add([b.w * 0.82, b.h * 0.025, b.d * 0.035], [0, b.h * 0.53, b.d * 0.36], p.metal, { name: 'cold-frame-lid-hinge', metalness: 0.48 });
    for (const x of [-0.28, 0, 0.28]) for (const z of [-0.2, 0.2]) add([b.w * 0.07, b.h * 0.18, b.d * 0.06], [x * b.w, b.h * 0.38, z * b.d], '#4e8c50', { shape: 'cone', name: 'cold-frame-seedling' });
    return;
  }
  if (key.includes('potting_shed')) {
    add([b.w * 0.9, b.h * 0.76, b.d * 0.82], [0, b.h * 0.4, 0], p.wood, { name: 'potting-shed-board-wall', roughness: 0.84 });
    add([b.w * 0.34, b.h * 0.62, b.d * 0.035], [-b.w * 0.18, b.h * 0.34, b.d * 0.43], p.dark, { name: 'potting-shed-plank-door', roughness: 0.82 });
    add([b.w * 0.28, b.h * 0.28, b.d * 0.025], [b.w * 0.24, b.h * 0.5, b.d * 0.43], p.glass, { name: 'potting-shed-window-glass', opacity: 0.36, roughness: 0.1 });
    for (const side of [-1, 1]) add([b.w * 0.56, b.h * 0.08, b.d * 0.98], [side * b.w * 0.23, b.h * 0.86, 0], p.dark, { rotation: [0, 0, -side * 0.36], name: 'potting-shed-pitched-roof', roughness: 0.72 });
    add([b.w * 0.035, b.h * 0.025, b.d * 0.94], [0, b.h * 0.96, 0], p.dark, { name: 'potting-shed-roof-ridge-cap', metalness: 0.12 });
    add([b.w * 0.38, b.h * 0.05, b.d * 0.24], [b.w * 0.18, b.h * 0.22, b.d * 0.46], p.light, { name: 'potting-shed-exterior-work-shelf' });
    return;
  }

  // Greenhouse frame: a readable glazed house section with pitched roof.
  for (const x of [-0.45, 0.45]) for (const z of [-0.4, 0.4]) add([b.w * 0.03, b.h * 0.72, b.d * 0.03], [x * b.w, b.h * 0.37, z * b.d], p.metal, { name: 'greenhouse-frame-upright', metalness: 0.58 });
  for (const z of [-0.4, 0.4]) {
    addBeamBetween(root, [-b.w * 0.45, b.h * 0.72, z * b.d], [0, b.h * 0.98, z * b.d], b.w * 0.025, p.metal, 'greenhouse-frame-roof-rafter');
    addBeamBetween(root, [0, b.h * 0.98, z * b.d], [b.w * 0.45, b.h * 0.72, z * b.d], b.w * 0.025, p.metal, 'greenhouse-frame-roof-rafter');
  }
  add([b.w * 0.86, b.h * 0.64, b.d * 0.02], [0, b.h * 0.4, b.d * 0.41], p.glass, { name: 'greenhouse-clear-wall-panel', opacity: 0.2, roughness: 0.06 });
  for (const side of [-1, 1]) add([b.w * 0.5, b.h * 0.025, b.d * 0.78], [side * b.w * 0.22, b.h * 0.84, 0], p.glass, { rotation: [0, 0, side * 0.28], name: 'greenhouse-clear-roof-panel', opacity: 0.22, roughness: 0.06 });
  add([b.w * 0.32, b.h * 0.62, b.d * 0.025], [0, b.h * 0.34, b.d * 0.43], p.glass, { name: 'greenhouse-hinged-door', opacity: 0.28, roughness: 0.08 });
  void variant;
}

function addHammockCloth(root: THREE.Group, b: Bounds, p: Palette): void {
  const along = 16;
  const across = 4;
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const primary = new THREE.Color(p.primary);
  const stripe = new THREE.Color(p.light);
  for (let xIndex = 0; xIndex <= along; xIndex += 1) {
    const u = xIndex / along;
    const normalizedX = u * 2 - 1;
    const y = b.h * (0.34 + Math.pow(Math.abs(normalizedX), 1.65) * 0.3);
    const color = Math.abs(Math.abs(normalizedX) - 0.42) < 0.11 ? stripe : primary;
    for (let zIndex = 0; zIndex <= across; zIndex += 1) {
      const v = zIndex / across;
      const normalizedZ = v * 2 - 1;
      positions.push(normalizedX * b.w * 0.44, y - Math.cos(normalizedZ * Math.PI / 2) * b.h * 0.025, normalizedZ * b.d * 0.31);
      colors.push(color.r, color.g, color.b);
      uvs.push(u, v);
    }
  }
  const stride = across + 1;
  for (let xIndex = 0; xIndex < along; xIndex += 1) for (let zIndex = 0; zIndex < across; zIndex += 1) {
    const a = xIndex * stride + zIndex;
    const bIndex = a + stride;
    indices.push(a, bIndex, a + 1, bIndex, bIndex + 1, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, side: THREE.DoubleSide, vertexColors: true });
  const cloth = new THREE.Mesh(geometry, material);
  cloth.name = 'hammock-sagging-fabric-panel';
  cloth.castShadow = true;
  cloth.receiveShadow = true;
  root.add(cloth);
}

function buildGreenspaceUtility(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  if (key.includes('wheelbarrow')) {
    add([b.w * 0.54, b.h * 0.06, b.d * 0.5], [b.w * 0.02, b.h * 0.4, 0], p.dark, { rotation: [0, 0, -0.08], name: 'wheelbarrow-load-tray', metalness: 0.28 });
    for (const z of [-1, 1]) add([b.w * 0.66, b.h * 0.24, b.d * 0.06], [b.w * 0.02, b.h * 0.51, z * b.d * 0.29], p.primary, { rotation: [0, 0, -0.08], name: 'wheelbarrow-flared-tray-wall', metalness: 0.24 });
    for (const x of [-1, 1]) add([b.w * 0.06, b.h * 0.22, b.d * 0.58], [x * b.w * 0.3, b.h * 0.5, 0], p.primary, { rotation: [0, 0, x * -0.14], name: 'wheelbarrow-flared-tray-wall', metalness: 0.24 });
    for (const z of [-0.24, 0.24]) {
      addBeamBetween(root, [-b.w * 0.46, b.h * 0.36, z * b.d], [b.w * 0.3, b.h * 0.28, z * b.d], b.w * 0.025, p.wood, 'wheelbarrow-long-handle');
      add([b.w * 0.16, b.h * 0.04, b.d * 0.055], [-b.w * 0.49, b.h * 0.37, z * b.d], p.dark, { name: 'wheelbarrow-handle-grip', roughness: 0.86 });
      addBeamBetween(root, [-b.w * 0.1, b.h * 0.34, z * b.d], [-b.w * 0.02, b.h * 0.06, z * b.d], b.w * 0.023, p.metal, 'wheelbarrow-support-leg');
    }
    add([b.h * 0.38, b.h * 0.38, b.w * 0.045], [b.w * 0.38, b.h * 0.2, 0], p.dark, { shape: 'torus', name: 'wheelbarrow-front-wheel' });
    add([b.w * 0.07, b.h * 0.07, b.d * 0.62], [b.w * 0.38, b.h * 0.2, 0], p.metal, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'wheelbarrow-wheel-axle', metalness: 0.56 });
    return;
  }
  if (key.includes('watering_cart')) {
    add([b.w * 0.76, b.h * 0.08, b.d * 0.72], [0, b.h * 0.18, 0], p.metal, { name: 'watering-cart-chassis', metalness: 0.42 });
    add([b.w * 0.5, b.h * 0.56, b.d * 0.5], [b.w * 0.08, b.h * 0.5, 0], p.primary, { shape: 'cylinder', name: 'watering-cart-water-tank', metalness: 0.24 });
    for (const z of [-0.36, 0.36]) add([b.h * 0.34, b.h * 0.34, b.w * 0.05], [b.w * 0.08, b.h * 0.18, z * b.d], p.dark, { shape: 'torus', name: 'watering-cart-wheel' });
    addBeamBetween(root, [-b.w * 0.34, b.h * 0.22, -b.d * 0.28], [-b.w * 0.48, b.h * 0.78, -b.d * 0.28], b.w * 0.028, p.metal, 'watering-cart-push-handle');
    addBeamBetween(root, [-b.w * 0.34, b.h * 0.22, b.d * 0.28], [-b.w * 0.48, b.h * 0.78, b.d * 0.28], b.w * 0.028, p.metal, 'watering-cart-push-handle');
    add([b.w * 0.38, b.w * 0.38, b.w * 0.035], [-b.w * 0.2, b.h * 0.55, b.d * 0.28], p.dark, { shape: 'torus', name: 'watering-cart-hose-reel' });
    addBeamBetween(root, [b.w * 0.3, b.h * 0.56, 0], [b.w * 0.48, b.h * 0.46, 0], b.w * 0.035, p.metal, 'watering-cart-spout');
    return;
  }
  if (key.includes('compost_tumbler')) {
    for (const side of [-1, 1]) addBeamBetween(root, [side * b.w * 0.42, 0, -b.d * 0.32], [side * b.w * 0.27, b.h * 0.72, 0], b.w * 0.035, p.metal, 'compost-tumbler-a-frame');
    for (const side of [-1, 1]) addBeamBetween(root, [side * b.w * 0.42, 0, b.d * 0.32], [side * b.w * 0.27, b.h * 0.72, 0], b.w * 0.035, p.metal, 'compost-tumbler-a-frame');
    add([b.w * 0.62, b.h * 0.56, b.d * 0.62], [0, b.h * 0.58, 0], p.dark, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'compost-tumbler-rotating-drum', roughness: 0.82 });
    add([b.w * 0.3, b.h * 0.3, b.d * 0.025], [0, b.h * 0.58, b.d * 0.32], p.primary, { name: 'compost-tumbler-loading-hatch' });
    addBeamBetween(root, [b.w * 0.32, b.h * 0.58, 0], [b.w * 0.46, b.h * 0.76, 0], b.w * 0.025, p.metal, 'compost-tumbler-crank');
    return;
  }
  if (key.includes('compost_bin')) {
    add([b.w * 0.86, b.h * 0.82, b.d * 0.84], [0, b.h * 0.43, 0], p.dark, { name: 'compost-bin-ventilated-body', roughness: 0.86 });
    for (let slot = -3; slot <= 3; slot += 1) for (const side of [-1, 1]) add([b.w * 0.08, b.h * 0.035, b.d * 0.025], [slot * b.w * 0.11, b.h * (side < 0 ? 0.3 : 0.58), b.d * 0.43], p.light, { name: 'compost-bin-air-vent' });
    add([b.w * 0.92, b.h * 0.1, b.d * 0.9], [0, b.h * 0.88, 0], p.primary, { rotation: [-0.05, 0, 0], name: 'compost-bin-latching-lid', roughness: 0.82 });
    add([b.w * 0.4, b.h * 0.24, b.d * 0.025], [0, b.h * 0.18, b.d * 0.43], p.secondary, { name: 'compost-bin-harvest-door' });
    return;
  }
  if (key.includes('rain_barrel')) {
    add([b.w * 0.76, b.h * 0.86, b.d * 0.76], [0, b.h * 0.46, 0], p.primary, { shape: 'cylinder', name: 'rain-barrel-storage-vessel', roughness: 0.74 });
    for (const y of [0.18, 0.48, 0.78]) add([b.w * 0.8, b.h * 0.035, b.d * 0.8], [0, b.h * y, 0], p.metal, { shape: 'cylinder', name: 'rain-barrel-reinforcing-band', metalness: 0.48 });
    add([b.w * 0.24, b.h * 0.36, b.d * 0.2], [-b.w * 0.25, b.h * 0.92, 0], p.metal, { name: 'rain-barrel-downspout-diverter', metalness: 0.42 });
    addBeamBetween(root, [0, b.h * 0.27, b.d * 0.38], [0, b.h * 0.27, b.d * 0.52], b.w * 0.03, p.metal, 'rain-barrel-spigot');
    add([b.w * 0.16, b.h * 0.035, b.d * 0.035], [0, b.h * 0.31, b.d * 0.51], p.metal, { name: 'rain-barrel-spigot-handle', metalness: 0.6 });
    return;
  }
  if (key.includes('garden_tool_rack')) {
    add([b.w * 0.92, b.h * 0.12, b.d * 0.18], [0, b.h * 0.72, 0], p.wood, { name: 'garden-tool-rack-wall-rail', roughness: 0.8 });
    add([b.w * 0.92, b.h * 0.06, b.d * 0.3], [0, b.h * 0.08, 0], p.wood, { name: 'garden-tool-rack-floor-foot', roughness: 0.8 });
    for (let tool = -3; tool <= 3; tool += 1) {
      const x = tool * b.w * 0.12;
      add([b.w * 0.025, b.h * (0.54 + (tool + 3) % 3 * 0.08), b.d * 0.025], [x, b.h * 0.42, b.d * 0.04], tool % 2 ? p.wood : p.metal, { shape: 'cylinder', rotation: [0, 0, tool * 0.035], name: 'garden-tool-long-handle' });
      add([b.w * (tool % 3 === 0 ? 0.18 : 0.1), b.h * 0.12, b.d * 0.06], [x, b.h * 0.1, b.d * 0.04], p.metal, { rotation: [0, 0, tool * 0.04], name: tool % 3 === 0 ? 'garden-tool-spade-head' : 'garden-tool-rake-head', metalness: 0.5 });
    }
    return;
  }
  if (key.includes('soaker_hose_rack')) {
    add([b.w * 0.78, b.h * 0.08, b.d * 0.62], [0, b.h * 0.04, 0], p.metal, { name: 'hose-reel-stable-base', metalness: 0.5 });
    for (const side of [-1, 1]) add([b.w * 0.05, b.h * 0.62, b.d * 0.05], [side * b.w * 0.3, b.h * 0.35, 0], p.metal, { name: 'hose-reel-upright', metalness: 0.56 });
    for (let coil = 0; coil < 5; coil += 1) add([b.w * (0.58 - coil * 0.035), b.w * (0.58 - coil * 0.035), b.w * 0.025], [0, b.h * 0.48, (coil - 2) * b.d * 0.035], '#315c43', { shape: 'torus', name: 'hose-reel-wound-hose', roughness: 0.88 });
    addBeamBetween(root, [b.w * 0.3, b.h * 0.48, 0], [b.w * 0.43, b.h * 0.62, 0], b.w * 0.025, p.dark, 'hose-reel-crank');
    return;
  }
  if (key.includes('sprinkler')) {
    add([b.w * 0.82, b.h * 0.08, b.d * 0.22], [0, b.h * 0.06, 0], p.metal, { name: 'lawn-sprinkler-stable-base', metalness: 0.52 });
    addBeamBetween(root, [-b.w * 0.34, b.h * 0.09, 0], [-b.w * 0.24, b.h * 0.31, 0], b.w * 0.025, p.metal, 'lawn-sprinkler-rotating-arm');
    addBeamBetween(root, [-b.w * 0.24, b.h * 0.31, 0], [b.w * 0.24, b.h * 0.31, 0], b.w * 0.025, p.metal, 'lawn-sprinkler-rotating-arm');
    addBeamBetween(root, [b.w * 0.24, b.h * 0.31, 0], [b.w * 0.34, b.h * 0.09, 0], b.w * 0.025, p.metal, 'lawn-sprinkler-rotating-arm');
    for (let nozzle = -3; nozzle <= 3; nozzle += 1) {
      add([b.w * 0.035, b.h * 0.1, b.d * 0.035], [nozzle * b.w * 0.075, b.h * 0.37, 0], p.metal, { shape: 'cylinder', name: 'lawn-sprinkler-nozzle-riser', metalness: 0.58 });
      add([b.w * 0.028, b.h * 0.04, b.d * 0.028], [nozzle * b.w * 0.075, b.h * 0.43, 0], p.dark, { shape: 'cylinder', name: 'lawn-sprinkler-water-nozzle', metalness: 0.54 });
    }
    for (const nozzle of [-3, -1, 1, 3]) addBeamBetween(root, [nozzle * b.w * 0.075, b.h * 0.45, 0], [nozzle * b.w * 0.1, b.h * 0.72, (nozzle % 2 ? 1 : -1) * b.d * 0.34], b.w * 0.009, '#72cfe3', 'lawn-sprinkler-water-jet');
    return;
  }
  if (key.includes('sundial')) {
    add([b.w * 0.64, b.h * 0.08, b.d * 0.64], [0, b.h * 0.05, 0], p.dark, { shape: 'cylinder', name: 'sundial-stone-base', roughness: 0.9 });
    add([b.w * 0.22, b.h * 0.36, b.d * 0.22], [0, b.h * 0.25, 0], p.light, { shape: 'cylinder', name: 'sundial-pedestal', roughness: 0.84 });
    add([b.w * 0.72, b.h * 0.045, b.d * 0.72], [0, b.h * 0.46, 0], '#a77835', { shape: 'cylinder', name: 'sundial-engraved-dial-plate', metalness: 0.66, roughness: 0.32 });
    for (let mark = 0; mark < 12; mark += 1) {
      const angle = mark / 12 * Math.PI * 2;
      add([b.w * 0.025, b.h * 0.012, b.d * 0.12], [Math.cos(angle) * b.w * 0.27, b.h * 0.49, Math.sin(angle) * b.d * 0.27], p.dark, { rotation: [0, -angle, 0], name: 'sundial-hour-mark' });
    }
    addBeamBetween(root, [0, b.h * 0.49, 0], [0, b.h * 0.78, -b.d * 0.18], b.w * 0.025, '#8c6428', 'sundial-shadow-gnomon');
    return;
  }
  if (key.includes('garden_gnome')) {
    for (const side of [-1, 1]) add([b.w * 0.18, b.h * 0.12, b.d * 0.26], [side * b.w * 0.13, b.h * 0.07, b.d * 0.07], p.dark, { name: 'garden-gnome-boot' });
    add([b.w * 0.58, b.h * 0.46, b.d * 0.52], [0, b.h * 0.31, 0], p.primary, { shape: 'cone', name: 'garden-gnome-coat', roughness: 0.84 });
    add([b.w * 0.36, b.h * 0.28, b.d * 0.34], [0, b.h * 0.62, b.d * 0.06], '#d0a17f', { shape: 'sphere', name: 'garden-gnome-face', roughness: 0.82 });
    add([b.w * 0.32, b.h * 0.34, b.d * 0.14], [0, b.h * 0.5, b.d * 0.2], p.light, { shape: 'cone', rotation: [Math.PI, 0, 0], name: 'garden-gnome-pointed-beard', roughness: 0.92 });
    add([b.w * 0.42, b.h * 0.38, b.d * 0.42], [0, b.h * 0.86, 0], p.secondary, { shape: 'cone', name: 'garden-gnome-tall-hat', roughness: 0.82 });
    for (const side of [-1, 1]) add([b.w * 0.045, b.h * 0.035, b.d * 0.025], [side * b.w * 0.08, b.h * 0.66, b.d * 0.23], p.dark, { name: 'garden-gnome-eye' });
    add([b.w * 0.09, b.h * 0.08, b.d * 0.08], [0, b.h * 0.61, b.d * 0.24], '#b87d61', { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'garden-gnome-nose', roughness: 0.84 });
    for (const side of [-1, 1]) addBeamBetween(root, [side * b.w * 0.18, b.h * 0.38, 0], [side * b.w * 0.26, b.h * 0.22, b.d * 0.08], b.w * 0.05, p.primary, 'garden-gnome-sleeved-arm');
    return;
  }
  // Tall thermometer post with a protected glass tube and readable scale.
  add([b.w * 0.7, b.h * 0.035, b.d * 0.7], [0, b.h * 0.02, 0], p.dark, { shape: 'cylinder', name: 'garden-thermometer-ground-base' });
  add([b.w * 0.14, b.h * 0.92, b.d * 0.14], [0, b.h * 0.48, 0], p.wood, { name: 'garden-thermometer-post', roughness: 0.82 });
  add([b.w * 0.66, b.h * 0.56, b.d * 0.18], [0, b.h * 0.68, b.d * 0.03], p.light, { name: 'garden-thermometer-scale-plate', roughness: 0.52 });
  add([b.w * 0.08, b.h * 0.46, b.d * 0.08], [0, b.h * 0.67, b.d * 0.14], p.glass, { shape: 'cylinder', name: 'garden-thermometer-glass-tube', opacity: 0.42, roughness: 0.06 });
  add([b.w * 0.035, b.h * (0.18 + variant * 0.025), b.d * 0.035], [0, b.h * 0.55, b.d * 0.18], '#c43f37', { name: 'garden-thermometer-mercury-column', emissive: '#7a1614', emissiveIntensity: 0.08 });
  for (let tick = -4; tick <= 4; tick += 1) add([b.w * (tick % 2 ? 0.16 : 0.22), b.h * 0.012, b.d * 0.025], [b.w * 0.2, b.h * (0.49 + (tick + 4) * 0.05), b.d * 0.14], p.dark, { name: 'garden-thermometer-scale-tick' });
}

function buildOutlierProp(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  if (key.includes('fire_extinguisher')) {
    add([b.w * 0.72, b.h * 0.06, b.d * 0.72], [0, b.h * 0.04, 0], p.dark, { shape: 'cylinder', name: 'fire-extinguisher-post-base', metalness: 0.44 });
    add([b.w * 0.12, b.h * 0.88, b.d * 0.12], [0, b.h * 0.48, -b.d * 0.16], p.metal, { name: 'fire-extinguisher-mounting-post', metalness: 0.58 });
    add([b.w * 0.4, b.h * 0.54, b.d * 0.4], [0, b.h * 0.45, b.d * 0.06], '#b93830', { shape: 'cylinder', name: 'fire-extinguisher-pressure-cylinder', metalness: 0.24, roughness: 0.42 });
    add([b.w * 0.16, b.h * 0.12, b.d * 0.16], [0, b.h * 0.76, b.d * 0.06], p.dark, { shape: 'cylinder', name: 'fire-extinguisher-valve-body', metalness: 0.55 });
    add([b.w * 0.36, b.h * 0.045, b.d * 0.08], [b.w * 0.08, b.h * 0.84, b.d * 0.06], p.metal, { name: 'fire-extinguisher-squeeze-handle', metalness: 0.62 });
    addBeamBetween(root, [b.w * 0.18, b.h * 0.7, b.d * 0.08], [b.w * 0.28, b.h * 0.33, b.d * 0.2], b.w * 0.025, p.dark, 'fire-extinguisher-discharge-hose');
    add([b.w * 0.22, b.h * 0.12, b.d * 0.08], [b.w * 0.28, b.h * 0.26, b.d * 0.2], p.dark, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], name: 'fire-extinguisher-hose-nozzle' });
    return;
  }
  if (key.includes('elevator_bank')) {
    add([b.w * 0.96, b.h * 0.98, b.d * 0.18], [0, b.h * 0.5, -b.d * 0.12], p.metal, { name: 'elevator-bank-metal-surround', metalness: 0.58, roughness: 0.32 });
    for (const side of [-1, 1]) add([b.w * 0.42, b.h * 0.82, b.d * 0.035], [side * b.w * 0.215, b.h * 0.44, b.d * 0.02], p.light, { name: 'elevator-bank-sliding-door', metalness: 0.48, roughness: 0.3 });
    add([b.w * 0.018, b.h * 0.82, b.d * 0.04], [0, b.h * 0.44, b.d * 0.045], p.dark, { name: 'elevator-bank-center-seam' });
    add([b.w * 0.28, b.h * 0.1, b.d * 0.04], [0, b.h * 0.92, b.d * 0.04], p.dark, { name: 'elevator-bank-floor-indicator' });
    for (const side of [-1, 1]) add([b.w * 0.055, b.h * 0.055, b.d * 0.035], [b.w * 0.53, b.h * (0.43 + side * 0.07), b.d * 0.045], side === 1 ? p.glow : p.dark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'elevator-bank-call-button', emissive: side === 1 ? p.glow : '#000000', emissiveIntensity: 0.2 });
    return;
  }
  if (key.includes('playpen')) {
    add([b.w * 0.84, b.h * 0.08, b.d * 0.82], [0, b.h * 0.08, 0], p.light, { name: 'playpen-padded-floor', roughness: 0.9 });
    for (const x of [-0.43, 0.43]) for (const z of [-0.4, 0.4]) add([b.w * 0.055, b.h * 0.82, b.d * 0.055], [x * b.w, b.h * 0.44, z * b.d], p.dark, { name: 'playpen-corner-post', roughness: 0.74 });
    for (const z of [-0.4, 0.4]) for (const y of [0.18, 0.82]) add([b.w * 0.86, b.h * 0.05, b.d * 0.05], [0, b.h * y, z * b.d], p.primary, { name: 'playpen-padded-rail', roughness: 0.9 });
    for (const x of [-0.43, 0.43]) for (const y of [0.18, 0.82]) add([b.w * 0.05, b.h * 0.05, b.d * 0.8], [x * b.w, b.h * y, 0], p.primary, { name: 'playpen-padded-rail', roughness: 0.9 });
    for (let slat = -3; slat <= 3; slat += 1) for (const z of [-0.4, 0.4]) add([b.w * 0.018, b.h * 0.58, b.d * 0.018], [slat * b.w * 0.11, b.h * 0.5, z * b.d], p.glass, { name: 'playpen-breathable-mesh-strand', opacity: 0.45, roughness: 0.68 });
    return;
  }
  if (key.includes('fish_tank')) {
    add([b.w * 0.88, b.h * 0.42, b.d * 0.78], [0, b.h * 0.22, 0], p.wood, { name: 'aquarium-stand-cabinet', roughness: 0.72 });
    for (const side of [-1, 1]) add([b.w * 0.38, b.h * 0.3, b.d * 0.025], [side * b.w * 0.2, b.h * 0.22, b.d * 0.4], side < 0 ? p.primary : p.secondary, { name: 'aquarium-stand-cabinet-door' });
    add([b.w * 0.92, b.h * 0.055, b.d * 0.84], [0, b.h * 0.45, 0], p.dark, { name: 'aquarium-tank-bottom-frame' });
    add([b.w * 0.86, b.h * 0.5, b.d * 0.025], [0, b.h * 0.72, b.d * 0.4], p.glass, { name: 'aquarium-front-glass', opacity: 0.22, roughness: 0.06 });
    add([b.w * 0.82, b.h * 0.36, b.d * 0.72], [0, b.h * 0.68, 0], '#408ba0', { name: 'aquarium-water-volume', opacity: 0.18, roughness: 0.1 });
    add([b.w * 0.82, b.h * 0.04, b.d * 0.7], [0, b.h * 0.5, 0], '#6e6855', { name: 'aquarium-gravel-bed', roughness: 0.96 });
    for (const side of [-1, 0, 1]) add([b.w * 0.07, b.h * (0.17 + (side + 1) * 0.04), b.d * 0.06], [side * b.w * 0.25, b.h * 0.6, -b.d * 0.16], '#4d8c57', { shape: 'cone', rotation: [0, 0, side * 0.2], name: 'aquarium-live-plant' });
    for (let fish = -1; fish <= 1; fish += 1) {
      const x = fish * b.w * 0.22;
      const fishColor = ['#d9863c', '#d5bd52', '#69a8b4'][fish + 1]!;
      add([b.w * 0.16, b.h * 0.08, b.d * 0.06], [x, b.h * (0.67 + fish * 0.08), b.d * 0.22], fishColor, { name: 'aquarium-fish-body' });
      add([b.w * 0.08, b.h * 0.09, b.d * 0.04], [x - b.w * 0.11, b.h * (0.67 + fish * 0.08), b.d * 0.22], fishColor, { shape: 'cone', rotation: [0, 0, -Math.PI / 2], name: 'aquarium-fish-tail' });
    }
    return;
  }
  if (key.includes('umbrella_table')) {
    add([b.w * 0.74, b.h * 0.07, b.d * 0.74], [0, b.h * 0.42, 0], p.wood, { shape: 'cylinder', name: 'umbrella-table-round-top', roughness: 0.76 });
    add([b.w * 0.08, b.h * 0.78, b.d * 0.08], [0, b.h * 0.57, 0], p.metal, { shape: 'cylinder', name: 'umbrella-table-center-pole', metalness: 0.5 });
    add([b.w * 0.95, b.h * 0.16, b.d * 0.95], [0, b.h * 0.93, 0], variant % 2 ? p.primary : p.secondary, { shape: 'cone', name: 'umbrella-table-fabric-canopy', roughness: 0.78 });
    for (let rib = 0; rib < 8; rib += 1) {
      const angle = rib / 8 * Math.PI * 2;
      addBeamBetween(root, [0, b.h * 0.97, 0], [Math.cos(angle) * b.w * 0.43, b.h * 0.87, Math.sin(angle) * b.d * 0.43], b.w * 0.01, p.metal, 'umbrella-table-canopy-rib');
    }
    for (const side of [-1, 1]) {
      add([b.w * 0.28, b.h * 0.06, b.d * 0.28], [side * b.w * 0.42, b.h * 0.25, 0], p.secondary, { name: 'umbrella-table-chair-seat', roughness: 0.82 });
      add([b.w * 0.06, b.h * 0.28, b.d * 0.26], [side * b.w * 0.52, b.h * 0.41, 0], p.secondary, { name: 'umbrella-table-chair-back', roughness: 0.82 });
      for (const z of [-0.1, 0.1]) add([b.w * 0.035, b.h * 0.24, b.d * 0.035], [side * b.w * 0.42, b.h * 0.12, z * b.d], p.metal, { name: 'umbrella-table-chair-leg', metalness: 0.48 });
    }
    return;
  }
  if (key.includes('high_chair')) {
    for (const x of [-0.26, 0.26]) for (const z of [-0.22, 0.22]) addBeamBetween(root, [x * b.w, 0, z * b.d], [x * b.w * 0.72, b.h * 0.62, z * b.d * 0.72], b.w * 0.035, p.wood, 'high-chair-splayed-leg');
    add([b.w * 0.5, b.h * 0.08, b.d * 0.46], [0, b.h * 0.58, 0], p.primary, { name: 'high-chair-padded-seat', roughness: 0.86 });
    add([b.w * 0.48, b.h * 0.36, b.d * 0.07], [0, b.h * 0.78, -b.d * 0.2], p.primary, { name: 'high-chair-supportive-back', roughness: 0.86 });
    add([b.w * 0.72, b.h * 0.055, b.d * 0.5], [0, b.h * 0.74, b.d * 0.26], p.light, { name: 'high-chair-removable-tray', roughness: 0.48 });
    add([b.w * 0.34, b.h * 0.045, b.d * 0.18], [0, b.h * 0.28, b.d * 0.16], p.wood, { name: 'high-chair-footrest' });
    add([b.w * 0.05, b.h * 0.23, b.d * 0.035], [0, b.h * 0.68, b.d * 0.12], p.dark, { name: 'high-chair-safety-harness' });
    return;
  }
  if (key.includes('soaking_tub')) {
    add([b.w * 0.76, b.h * 0.1, b.d * 0.68], [0, b.h * 0.08, 0], p.light, { name: 'soaking-tub-floor', roughness: 0.28 });
    for (const z of [-1, 1]) add([b.w * 0.9, b.h * 0.56, b.d * 0.1], [0, b.h * 0.34, z * b.d * 0.41], p.light, { name: 'soaking-tub-side-wall', roughness: 0.26 });
    for (const x of [-1, 1]) add([b.w * 0.1, b.h * 0.56, b.d * 0.72], [x * b.w * 0.4, b.h * 0.34, 0], p.light, { name: 'soaking-tub-end-wall', roughness: 0.26 });
    add([b.w * 0.72, b.h * 0.025, b.d * 0.62], [0, b.h * 0.42, 0], '#5ea5ba', { name: 'soaking-tub-water-surface', opacity: 0.55, roughness: 0.12 });
    add([b.w * 0.08, b.h * 0.42, b.d * 0.08], [-b.w * 0.28, b.h * 0.72, -b.d * 0.34], p.metal, { shape: 'cylinder', name: 'soaking-tub-faucet-riser', metalness: 0.65 });
    addBeamBetween(root, [-b.w * 0.28, b.h * 0.9, -b.d * 0.34], [-b.w * 0.16, b.h * 0.82, -b.d * 0.22], b.w * 0.035, p.metal, 'soaking-tub-faucet-spout');
    return;
  }
  // Rocking chair uses segmented runners instead of the lounge-chair chassis.
  for (const z of [-0.28, 0.28]) {
    addBeamBetween(root, [-b.w * 0.42, b.h * 0.1, z * b.d], [0, b.h * 0.04, z * b.d], b.w * 0.035, p.wood, 'rocking-chair-curved-runner');
    addBeamBetween(root, [0, b.h * 0.04, z * b.d], [b.w * 0.42, b.h * 0.1, z * b.d], b.w * 0.035, p.wood, 'rocking-chair-curved-runner');
    addBeamBetween(root, [-b.w * 0.25, b.h * 0.08, z * b.d], [-b.w * 0.19, b.h * 0.5, z * b.d], b.w * 0.032, p.wood, 'rocking-chair-leg');
    addBeamBetween(root, [b.w * 0.25, b.h * 0.08, z * b.d], [b.w * 0.19, b.h * 0.5, z * b.d], b.w * 0.032, p.wood, 'rocking-chair-leg');
  }
  add([b.w * 0.58, b.h * 0.08, b.d * 0.58], [0, b.h * 0.5, 0], p.primary, { name: 'rocking-chair-seat', roughness: 0.8 });
  for (const side of [-1, 1]) add([b.w * 0.07, b.h * 0.44, b.d * 0.07], [side * b.w * 0.25, b.h * 0.72, -b.d * 0.23], p.wood, { rotation: [0, 0, -side * 0.08], name: 'rocking-chair-back-post' });
  for (let slat = -2; slat <= 2; slat += 1) add([b.w * 0.065, b.h * 0.38, b.d * 0.04], [slat * b.w * 0.1, b.h * 0.76, -b.d * 0.23], p.wood, { rotation: [0, 0, slat * 0.025], name: 'rocking-chair-back-slat', roughness: 0.78 });
  for (const side of [-1, 1]) add([b.w * 0.08, b.h * 0.08, b.d * 0.58], [side * b.w * 0.34, b.h * 0.68, 0], p.wood, { name: 'rocking-chair-armrest', roughness: 0.76 });
  void variant;
}

function buildRetailProp(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  if (/(shop_mannequin|mannequin_pair)/.test(key)) {
    const count = key.includes('pair') ? 2 : 1;
    for (let figure = 0; figure < count; figure += 1) {
      const x = count === 2 ? (figure ? 1 : -1) * b.w * 0.23 : 0;
      add([b.w * 0.3, b.h * 0.04, b.d * 0.3], [x, b.h * 0.03, 0], p.dark, { shape: 'cylinder', name: 'retail-mannequin-display-base', metalness: 0.42 });
      add([b.w * 0.035, b.h * 0.34, b.d * 0.035], [x, b.h * 0.2, 0], p.metal, { shape: 'cylinder', name: 'retail-mannequin-support-pole', metalness: 0.58 });
      add([b.w * 0.25, b.h * 0.32, b.d * 0.18], [x, b.h * 0.66, 0], figure ? p.secondary : p.primary, { name: 'retail-mannequin-garment-torso', roughness: 0.82 });
      add([b.w * 0.14, b.h * 0.14, b.d * 0.14], [x, b.h * 0.91, 0], p.light, { shape: 'sphere', name: 'retail-mannequin-head', roughness: 0.7 });
      for (const side of [-1, 1]) {
        add([b.w * 0.055, b.h * 0.34, b.d * 0.055], [x + side * b.w * 0.17, b.h * 0.65, 0], p.light, { shape: 'cylinder', rotation: [0, 0, side * 0.2], name: 'retail-mannequin-articulated-arm', roughness: 0.72 });
        add([b.w * 0.06, b.h * 0.4, b.d * 0.07], [x + side * b.w * 0.08, b.h * 0.35, 0], p.light, { shape: 'cylinder', rotation: [0, 0, side * 0.06], name: 'retail-mannequin-articulated-leg', roughness: 0.72 });
      }
    }
    return;
  }
  if (key.includes('clothing_rack')) {
    for (const side of [-1, 1]) {
      add([b.w * 0.06, b.h * 0.82, b.d * 0.06], [side * b.w * 0.42, b.h * 0.44, 0], p.metal, { name: 'clothing-rack-upright', metalness: 0.58 });
      add([b.w * 0.25, b.h * 0.05, b.d * 0.58], [side * b.w * 0.36, b.h * 0.04, 0], p.metal, { name: 'clothing-rack-stable-foot', metalness: 0.54 });
    }
    add([b.w * 0.86, b.h * 0.045, b.d * 0.045], [0, b.h * 0.84, 0], p.metal, { name: 'clothing-rack-hanging-rail', metalness: 0.62 });
    for (let garment = -4; garment <= 4; garment += 1) {
      const x = garment * b.w * 0.09;
      addBeamBetween(root, [x, b.h * 0.82, 0], [x - b.w * 0.07, b.h * 0.72, 0], b.w * 0.012, p.dark, 'clothing-rack-hanger');
      addBeamBetween(root, [x, b.h * 0.82, 0], [x + b.w * 0.07, b.h * 0.72, 0], b.w * 0.012, p.dark, 'clothing-rack-hanger');
      add([b.w * 0.16, b.h * (0.34 + (garment + 4) % 3 * 0.06), b.d * 0.055], [x, b.h * 0.53, 0], garment % 2 ? p.primary : p.secondary, { name: 'clothing-rack-hanging-garment', roughness: 0.9 });
    }
    return;
  }
  if (key.includes('hat_rack')) {
    add([b.w * 0.62, b.h * 0.06, b.d * 0.62], [0, b.h * 0.04, 0], p.dark, { shape: 'cylinder', name: 'hat-rack-weighted-base' });
    add([b.w * 0.08, b.h * 0.9, b.d * 0.08], [0, b.h * 0.5, 0], p.wood, { shape: 'cylinder', name: 'hat-rack-center-post', roughness: 0.74 });
    for (let hook = 0; hook < 6; hook += 1) {
      const angle = hook / 6 * Math.PI * 2;
      const y = b.h * (0.52 + (hook % 3) * 0.14);
      addBeamBetween(root, [0, y, 0], [Math.cos(angle) * b.w * 0.28, y + b.h * 0.08, Math.sin(angle) * b.d * 0.28], b.w * 0.025, p.wood, 'hat-rack-display-hook');
      add([b.w * 0.25, b.h * 0.05, b.d * 0.25], [Math.cos(angle) * b.w * 0.31, y + b.h * 0.06, Math.sin(angle) * b.d * 0.31], hook % 2 ? p.primary : p.secondary, { shape: 'cylinder', name: 'hat-rack-hat-brim', roughness: 0.86 });
      add([b.w * 0.15, b.h * 0.12, b.d * 0.15], [Math.cos(angle) * b.w * 0.31, y + b.h * 0.12, Math.sin(angle) * b.d * 0.31], hook % 2 ? p.primary : p.secondary, { shape: 'cylinder', name: 'hat-rack-hat-crown', roughness: 0.86 });
    }
    return;
  }
  if (key.includes('produce_bin')) {
    for (let tier = 0; tier < 3; tier += 1) {
      const y = b.h * (0.18 + tier * 0.23);
      const z = -b.d * (0.18 - tier * 0.13);
      add([b.w * 0.88, b.h * 0.18, b.d * 0.32], [0, y, z], p.wood, { rotation: [-0.14, 0, 0], name: 'produce-display-sloped-crate', roughness: 0.86 });
      for (let item = -4; item <= 4; item += 1) add([b.w * 0.075, b.h * 0.07, b.d * 0.075], [item * b.w * 0.085, y + b.h * 0.12, z + (item % 2) * b.d * 0.06], tier === 0 ? '#ba4b3c' : tier === 1 ? '#d3a944' : '#56834d', { shape: tier === 2 ? 'cone' : 'sphere', name: 'produce-display-fresh-item', roughness: 0.9 });
    }
    add([b.w * 0.32, b.h * 0.18, b.d * 0.04], [0, b.h * 0.84, -b.d * 0.22], p.dark, { name: 'produce-display-price-sign' });
    return;
  }
  if (key.includes('freezer_island')) {
    add([b.w * 0.94, b.h * 0.66, b.d * 0.86], [0, b.h * 0.35, 0], p.light, { name: 'freezer-island-insulated-body', roughness: 0.38 });
    for (const side of [-1, 1]) add([b.w * 0.42, b.h * 0.025, b.d * 0.74], [side * b.w * 0.23, b.h * 0.7, 0], p.glass, { name: 'freezer-island-sliding-glass-lid', opacity: 0.3, roughness: 0.08 });
    add([b.w * 0.025, b.h * 0.03, b.d * 0.5], [0, b.h * 0.73, 0], p.metal, { name: 'freezer-island-lid-handle', metalness: 0.55 });
    for (let vent = -4; vent <= 4; vent += 1) add([b.w * 0.055, b.h * 0.025, b.d * 0.025], [vent * b.w * 0.09, b.h * 0.12, b.d * 0.44], p.dark, { name: 'freezer-island-compressor-vent' });
    return;
  }
  if (key.includes('soda_fountain')) {
    add([b.w * 0.88, b.h * 0.88, b.d * 0.68], [0, b.h * 0.46, 0], p.primary, { name: 'soda-fountain-machine-body', metalness: 0.18 });
    add([b.w * 0.76, b.h * 0.18, b.d * 0.04], [0, b.h * 0.8, b.d * 0.35], p.glow, { name: 'soda-fountain-brand-panel', emissive: p.glow, emissiveIntensity: 0.16 });
    for (let tap = -3; tap <= 3; tap += 1) {
      add([b.w * 0.08, b.h * 0.16, b.d * 0.12], [tap * b.w * 0.1, b.h * 0.58, b.d * 0.38], tap % 2 ? p.secondary : p.light, { name: 'soda-fountain-flavor-tap' });
      add([b.w * 0.025, b.h * 0.1, b.d * 0.025], [tap * b.w * 0.1, b.h * 0.46, b.d * 0.4], p.dark, { name: 'soda-fountain-dispensing-nozzle' });
    }
    add([b.w * 0.72, b.h * 0.05, b.d * 0.3], [0, b.h * 0.32, b.d * 0.28], p.metal, { name: 'soda-fountain-drip-tray', metalness: 0.58 });
    return;
  }
  if (key.includes('deli_warmer')) {
    add([b.w * 0.94, b.h * 0.44, b.d * 0.8], [0, b.h * 0.24, 0], p.primary, { name: 'deli-warmer-heated-base' });
    add([b.w * 0.88, b.h * 0.42, b.d * 0.035], [0, b.h * 0.63, b.d * 0.39], p.glass, { rotation: [-0.16, 0, 0], name: 'deli-warmer-sloped-glass', opacity: 0.28, roughness: 0.08 });
    for (let tray = -2; tray <= 2; tray += 1) add([b.w * 0.16, b.h * 0.04, b.d * 0.42], [tray * b.w * 0.17, b.h * 0.49, 0], p.metal, { name: 'deli-warmer-food-tray', metalness: 0.54 });
    for (const side of [-1, 1]) add([b.w * 0.42, b.h * 0.035, b.d * 0.035], [side * b.w * 0.24, b.h * 0.82, 0], '#e6a048', { name: 'deli-warmer-heat-lamp', emissive: '#e6a048', emissiveIntensity: 0.42 });
    return;
  }
  if (key.includes('coffee_bar')) {
    add([b.w * 0.96, b.h * 0.52, b.d * 0.84], [0, b.h * 0.28, 0], p.wood, { name: 'coffee-bar-counter-base', roughness: 0.76 });
    add([b.w * 1.0, b.h * 0.06, b.d * 0.9], [0, b.h * 0.57, 0], p.light, { name: 'coffee-bar-work-surface', roughness: 0.32 });
    add([b.w * 0.5, b.h * 0.3, b.d * 0.34], [-b.w * 0.16, b.h * 0.75, 0], p.metal, { name: 'coffee-bar-espresso-machine', metalness: 0.54 });
    for (const side of [-1, 1]) add([b.w * 0.05, b.h * 0.12, b.d * 0.05], [-b.w * 0.16 + side * b.w * 0.11, b.h * 0.56, b.d * 0.2], p.dark, { shape: 'cylinder', name: 'coffee-bar-group-head' });
    for (let cup = 0; cup < 4; cup += 1) add([b.w * 0.09, b.h * 0.1, b.d * 0.09], [b.w * (0.16 + cup * 0.09), b.h * 0.66, b.d * 0.12], cup % 2 ? p.primary : p.secondary, { shape: 'cylinder', name: 'coffee-bar-cup' });
    return;
  }
  if (key.includes('food_truck_counter')) {
    add([b.w * 0.96, b.h * 0.72, b.d * 0.82], [0, b.h * 0.38, 0], p.primary, { name: 'food-truck-service-body', metalness: 0.18 });
    add([b.w * 0.7, b.h * 0.42, b.d * 0.04], [0, b.h * 0.65, b.d * 0.42], p.dark, { name: 'food-truck-open-service-window' });
    add([b.w * 0.76, b.h * 0.06, b.d * 0.36], [0, b.h * 0.45, b.d * 0.52], p.light, { name: 'food-truck-serving-counter' });
    add([b.w * 0.82, b.h * 0.08, b.d * 0.5], [0, b.h * 0.94, b.d * 0.24], p.secondary, { rotation: [-0.14, 0, 0], name: 'food-truck-window-awning', roughness: 0.8 });
    for (let bottle = -2; bottle <= 2; bottle += 1) add([b.w * 0.055, b.h * 0.13, b.d * 0.055], [bottle * b.w * 0.09, b.h * 0.54, b.d * 0.54], bottle % 2 ? '#c74c37' : '#d2ad42', { shape: 'cylinder', name: 'food-truck-condiment-bottle' });
    return;
  }

  const ticketBooth = key.includes('ticket_booth');
  add([b.w * 0.94, b.h * 0.72, b.d * 0.82], [0, b.h * 0.38, 0], ticketBooth ? p.primary : p.wood, { name: ticketBooth ? 'ticket-booth-enclosure' : 'concession-stand-counter-base', roughness: 0.7 });
  if (ticketBooth) {
    add([b.w * 0.58, b.h * 0.4, b.d * 0.03], [0, b.h * 0.66, b.d * 0.42], p.glass, { name: 'ticket-booth-service-window', opacity: 0.28, roughness: 0.08 });
    add([b.w * 0.64, b.h * 0.06, b.d * 0.28], [0, b.h * 0.45, b.d * 0.5], p.light, { name: 'ticket-booth-transaction-ledge' });
    add([b.w * 0.2, b.h * 0.03, b.d * 0.08], [0, b.h * 0.49, b.d * 0.57], p.dark, { name: 'ticket-booth-ticket-slot' });
    add([b.w * 0.74, b.h * 0.15, b.d * 0.04], [0, b.h * 0.92, b.d * 0.42], p.glow, { name: 'ticket-booth-lit-sign', emissive: p.glow, emissiveIntensity: 0.22 });
  } else {
    for (const side of [-1, 1]) add([b.w * 0.055, b.h * 0.52, b.d * 0.055], [side * b.w * 0.42, b.h * 0.74, -b.d * 0.3], p.metal, { name: 'concession-stand-canopy-post', metalness: 0.45 });
    add([b.w * 0.98, b.h * 0.09, b.d * 0.92], [0, b.h * 0.98, 0], p.secondary, { name: 'concession-stand-striped-canopy', roughness: 0.82 });
    add([b.w * 0.84, b.h * 0.06, b.d * 0.36], [0, b.h * 0.62, b.d * 0.4], p.light, { name: 'concession-stand-serving-counter' });
    for (let snack = -3; snack <= 3; snack += 1) add([b.w * 0.08, b.h * 0.12, b.d * 0.08], [snack * b.w * 0.1, b.h * 0.71, b.d * 0.4], snack % 2 ? '#d7a341' : '#c9513c', { name: 'concession-stand-packaged-snack' });
  }
  void variant;
}

function buildClinicalProp(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  if (key.includes('wheelchair')) {
    add([b.w * 0.56, b.h * 0.1, b.d * 0.56], [0, b.h * 0.48, 0], p.primary, { name: 'wheelchair-padded-seat' });
    add([b.w * 0.54, b.h * 0.48, b.d * 0.08], [0, b.h * 0.75, -b.d * 0.24], p.primary, { name: 'wheelchair-padded-back' });
    for (const side of [-1, 1]) {
      add([b.w * 0.74, b.w * 0.74, b.w * 0.075], [side * b.w * 0.36, b.h * 0.34, 0], p.dark, { shape: 'torus', rotation: [0, Math.PI / 2, 0], name: 'wheelchair-drive-wheel', metalness: 0.35 });
      add([b.w * 0.04, b.h * 0.54, b.d * 0.04], [side * b.w * 0.27, b.h * 0.55, 0], p.metal, { name: 'wheelchair-side-frame', metalness: 0.58 });
      add([b.w * 0.24, b.h * 0.045, b.d * 0.24], [side * b.w * 0.2, b.h * 0.08, b.d * 0.28], p.metal, { name: 'wheelchair-footrest', metalness: 0.5 });
      add([b.w * 0.1, b.w * 0.05, b.w * 0.1], [side * b.w * 0.22, b.h * 0.08, b.d * 0.33], p.dark, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'wheelchair-front-caster' });
    }
    return;
  }
  if (key.includes('fume_hood')) {
    add([b.w * 0.92, b.h * 0.45, b.d * 0.82], [0, b.h * 0.24, 0], p.light, { name: 'fume-hood-base-cabinet' });
    add([b.w * 0.96, b.h * 0.06, b.d * 0.88], [0, b.h * 0.5, 0], p.metal, { name: 'fume-hood-chemical-worktop', metalness: 0.35 });
    add([b.w * 0.88, b.h * 0.43, b.d * 0.7], [0, b.h * 0.73, -b.d * 0.04], p.dark, { name: 'fume-hood-ventilated-chamber' });
    add([b.w * 0.76, b.h * 0.36, b.d * 0.025], [0, b.h * 0.72, b.d * 0.34], p.glass, { name: 'fume-hood-sliding-sash', opacity: 0.3, roughness: 0.08 });
    add([b.w * 0.24, b.h * 0.18, b.d * 0.24], [0, b.h * 0.96, -b.d * 0.12], p.metal, { name: 'fume-hood-exhaust-duct', metalness: 0.5 });
    return;
  }
  if (key.includes('microscope')) {
    buildClinicalBench(root, b, p);
    add([b.w * 0.28, b.h * 0.06, b.d * 0.32], [0, b.h * 0.62, 0], p.dark, { name: 'microscope-weighted-base' });
    addBeamBetween(root, [-b.w * 0.08, b.h * 0.64, 0], [b.w * 0.04, b.h * 0.9, -b.d * 0.05], b.w * 0.045, p.metal, 'microscope-curved-arm');
    add([b.w * 0.11, b.h * 0.28, b.d * 0.11], [b.w * 0.06, b.h * 0.86, b.d * 0.04], p.light, { shape: 'cylinder', rotation: [0.18, 0, 0], name: 'microscope-optical-tube' });
    add([b.w * 0.34, b.h * 0.035, b.d * 0.28], [0, b.h * 0.73, b.d * 0.04], p.metal, { name: 'microscope-specimen-stage', metalness: 0.5 });
    return;
  }
  if (key.includes('centrifuge')) {
    buildClinicalBench(root, b, p);
    add([b.w * 0.48, b.h * 0.28, b.d * 0.45], [0, b.h * 0.7, 0], p.primary, { shape: 'cylinder', name: 'centrifuge-machine-body' });
    add([b.w * 0.42, b.h * 0.06, b.d * 0.42], [0, b.h * 0.86, 0], p.glass, { shape: 'cylinder', name: 'centrifuge-clear-lid', opacity: 0.48 });
    for (let tube = 0; tube < 6; tube += 1) {
      const angle = tube / 6 * Math.PI * 2;
      add([b.w * 0.035, b.h * 0.12, b.d * 0.035], [Math.cos(angle) * b.w * 0.12, b.h * 0.86, Math.sin(angle) * b.d * 0.12], tube % 2 ? p.secondary : p.glow, { shape: 'cylinder', name: 'centrifuge-sample-tube', opacity: 0.7 });
    }
    return;
  }
  if (key.includes('icu_monitor')) {
    add([b.w * 0.56, b.h * 0.06, b.d * 0.56], [0, b.h * 0.05, 0], p.dark, { name: 'icu-monitor-wheeled-base' });
    add([b.w * 0.07, b.h * 0.66, b.d * 0.07], [0, b.h * 0.4, 0], p.metal, { shape: 'cylinder', name: 'icu-monitor-height-pole', metalness: 0.58 });
    add([b.w * 0.72, b.h * 0.42, b.d * 0.18], [0, b.h * 0.72, 0], p.dark, { name: 'icu-monitor-screen-housing' });
    add([b.w * 0.62, b.h * 0.31, b.d * 0.025], [0, b.h * 0.73, b.d * 0.1], p.glass, { name: 'icu-monitor-vital-display', opacity: 0.8, emissive: p.glow, emissiveIntensity: 0.25 });
    for (let line = 0; line < 3; line += 1) add([b.w * 0.48, b.h * 0.012, b.d * 0.012], [0, b.h * (0.65 + line * 0.09), b.d * 0.12], line === variant % 3 ? p.glow : p.light, { name: 'icu-monitor-waveform', emissive: p.glow, emissiveIntensity: 0.4 });
    return;
  }
  if (key.includes('eye_wash')) {
    add([b.w * 0.36, b.h * 0.72, b.d * 0.36], [0, b.h * 0.4, 0], p.light, { name: 'eyewash-pedestal' });
    add([b.w * 0.72, b.h * 0.14, b.d * 0.64], [0, b.h * 0.78, 0], p.metal, { shape: 'cylinder', name: 'eyewash-catch-basin', metalness: 0.46 });
    for (const side of [-1, 1]) {
      add([b.w * 0.05, b.h * 0.16, b.d * 0.05], [side * b.w * 0.14, b.h * 0.91, 0], p.metal, { shape: 'cylinder', name: 'eyewash-spray-nozzle', metalness: 0.58 });
      add([b.w * 0.025, b.h * 0.12, b.d * 0.025], [side * b.w * 0.14, b.h * 0.99, 0], p.glass, { shape: 'cylinder', name: 'eyewash-water-jet', opacity: 0.56, emissive: p.glow, emissiveIntensity: 0.08 });
    }
    return;
  }
  if (key.includes('first_aid')) {
    add([b.w * 0.78, b.h * 0.82, b.d * 0.28], [0, b.h * 0.5, 0], p.light, { name: 'first-aid-wall-cabinet' });
    add([b.w * 0.58, b.h * 0.13, b.d * 0.025], [0, b.h * 0.55, b.d * 0.16], '#b9443f', { name: 'first-aid-horizontal-cross-bar' });
    add([b.w * 0.14, b.h * 0.55, b.d * 0.025], [0, b.h * 0.55, b.d * 0.165], '#b9443f', { name: 'first-aid-vertical-cross-bar' });
    add([b.w * 0.2, b.h * 0.04, b.d * 0.04], [0, b.h * 0.16, b.d * 0.17], p.metal, { name: 'first-aid-cabinet-handle', metalness: 0.5 });
    return;
  }
  // Nurse and pharmacy stations use a wraparound work counter rather than a cart.
  add([b.w * 0.94, b.h * 0.54, b.d * 0.74], [0, b.h * 0.3, 0], p.light, { name: 'clinical-station-cabinet-bank' });
  add([b.w * 0.98, b.h * 0.06, b.d * 0.86], [0, b.h * 0.6, 0], p.metal, { name: 'clinical-station-worktop', metalness: 0.32 });
  add([b.w * 0.34, b.h * 0.28, b.d * 0.05], [b.w * 0.18, b.h * 0.81, -b.d * 0.18], p.dark, { name: 'clinical-station-monitor' });
  add([b.w * 0.28, b.h * 0.18, b.d * 0.05], [b.w * 0.18, b.h * 0.81, -b.d * 0.145], p.glass, { name: 'clinical-station-display', opacity: 0.78, emissive: p.glow, emissiveIntensity: 0.18 });
  for (let drawer = 0; drawer < 4; drawer += 1) add([b.w * 0.3, b.h * 0.09, b.d * 0.025], [-b.w * 0.25, b.h * (0.18 + drawer * 0.11), b.d * 0.38], drawer % 2 ? p.primary : p.secondary, { name: 'clinical-station-supply-drawer' });
}

function buildClinicalBench(root: THREE.Group, b: Bounds, p: Palette): void {
  const add = partAdder(root);
  add([b.w * 0.92, b.h * 0.07, b.d * 0.78], [0, b.h * 0.54, 0], p.light, { name: 'clinical-lab-worktop' });
  for (const x of [-0.4, 0.4]) for (const z of [-0.3, 0.3]) add([b.w * 0.045, b.h * 0.5, b.d * 0.045], [x * b.w, b.h * 0.26, z * b.d], p.metal, { name: 'clinical-lab-square-leg', metalness: 0.52 });
}

function buildTransportProp(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  if (key.includes('baggage_carousel')) {
    add([b.w * 0.88, b.h * 0.28, b.d * 0.78], [0, b.h * 0.18, 0], p.dark, { shape: 'cylinder', name: 'baggage-carousel-drive-base', metalness: 0.34 });
    add([b.w * 0.9, b.w * 0.9, b.w * 0.14], [0, b.h * 0.38, 0], p.metal, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'baggage-carousel-moving-belt', metalness: 0.5 });
    for (let bag = 0; bag < 8; bag += 1) {
      const angle = bag / 8 * Math.PI * 2;
      add([b.w * 0.15, b.h * 0.22, b.d * 0.18], [Math.cos(angle) * b.w * 0.34, b.h * 0.5, Math.sin(angle) * b.d * 0.32], bag % 2 ? p.primary : p.secondary, { rotation: [0, -angle, 0], name: 'baggage-carousel-suitcase' });
    }
    return;
  }
  if (key.includes('security_scanner')) {
    for (const side of [-1, 1]) add([b.w * 0.17, b.h * 0.88, b.d * 0.72], [side * b.w * 0.39, b.h * 0.48, 0], p.primary, { name: 'security-scanner-arch-column' });
    add([b.w * 0.94, b.h * 0.16, b.d * 0.72], [0, b.h * 0.92, 0], p.primary, { name: 'security-scanner-arch-header' });
    add([b.w * 0.54, b.h * 0.055, b.d * 0.82], [0, b.h * 0.09, 0], p.dark, { name: 'security-scanner-conveyor-belt' });
    for (const side of [-1, 1]) add([b.w * 0.05, b.h * 0.52, b.d * 0.05], [side * b.w * 0.26, b.h * 0.42, 0], p.glow, { name: 'security-scanner-sensor-array', emissive: p.glow, emissiveIntensity: 0.18 });
    return;
  }
  if (key.includes('bike_rack')) {
    add([b.w * 0.92, b.h * 0.08, b.d * 0.72], [0, b.h * 0.04, 0], p.metal, { name: 'bike-rack-floor-rail', metalness: 0.58 });
    for (let slot = -3; slot <= 3; slot += 1) {
      add([b.w * 0.035, b.h * 0.6, b.d * 0.035], [slot * b.w * 0.12, b.h * 0.34, -b.d * 0.2], p.metal, { shape: 'cylinder', name: 'bike-rack-upright', metalness: 0.62 });
      add([b.w * 0.035, b.h * 0.035, b.d * 0.4], [slot * b.w * 0.12, b.h * 0.65, 0], p.metal, { name: 'bike-rack-wheel-slot', metalness: 0.62 });
    }
    return;
  }
  if (key.includes('escalator_end')) {
    for (let step = 0; step < 7; step += 1) add([b.w * 0.62, b.h * 0.1, b.d * 0.16], [0, b.h * (0.1 + step * 0.11), b.d * (0.35 - step * 0.11)], p.metal, { name: 'escalator-visible-step', metalness: 0.5 });
    for (const side of [-1, 1]) add([b.w * 0.08, b.h * 0.72, b.d * 0.72], [side * b.w * 0.38, b.h * 0.45, 0], p.secondary, { rotation: [-0.45, 0, 0], name: 'escalator-balustrade' });
    return;
  }
  if (key.includes('staircase_landing')) {
    for (let step = 0; step < 6; step += 1) add([b.w * 0.82, b.h * 0.1, b.d * 0.18], [0, b.h * (0.05 + step * 0.11), b.d * (0.38 - step * 0.14)], step % 2 ? p.light : p.primary, { name: 'staircase-landing-step' });
    for (const side of [-1, 1]) addBeamBetween(root, [side * b.w * 0.4, b.h * 0.22, b.d * 0.44], [side * b.w * 0.4, b.h * 0.92, -b.d * 0.35], b.w * 0.035, p.metal, 'staircase-handrail');
    return;
  }
  if (key.includes('handrail_run')) {
    for (let post = -3; post <= 3; post += 1) add([b.w * 0.035, b.h * 0.72, b.d * 0.035], [post * b.w * 0.13, b.h * 0.36, 0], p.metal, { shape: 'cylinder', name: 'handrail-support-post', metalness: 0.6 });
    add([b.w * 0.92, b.h * 0.05, b.d * 0.05], [0, b.h * 0.74, 0], p.metal, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'handrail-grab-rail', metalness: 0.62 });
    return;
  }
  // Check-in station combines a luggage belt, agent counter, and monitor.
  add([b.w * 0.6, b.h * 0.12, b.d * 0.72], [-b.w * 0.15, b.h * 0.22, 0], p.dark, { name: 'check-in-luggage-conveyor' });
  for (let roller = -3; roller <= 3; roller += 1) add([b.w * 0.035, b.h * 0.035, b.d * 0.62], [-b.w * 0.15 + roller * b.w * 0.075, b.h * 0.3, 0], p.metal, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'check-in-conveyor-roller', metalness: 0.55 });
  add([b.w * 0.32, b.h * 0.56, b.d * 0.68], [b.w * 0.32, b.h * 0.32, 0], p.primary, { name: 'check-in-agent-counter' });
  add([b.w * 0.26, b.h * 0.22, b.d * 0.05], [b.w * 0.31, b.h * 0.75, -b.d * 0.16], p.dark, { name: 'check-in-agent-monitor' });
  void variant;
}

function buildTechnologyProp(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  if (key.includes('photo_booth')) {
    add([b.w * 0.92, b.h * 0.95, b.d * 0.88], [0, b.h * 0.5, 0], p.primary, { name: 'photo-booth-enclosure' });
    add([b.w * 0.5, b.h * 0.76, b.d * 0.025], [-b.w * 0.18, b.h * 0.49, b.d * 0.45], p.secondary, { name: 'photo-booth-curtain' });
    add([b.w * 0.28, b.h * 0.18, b.d * 0.3], [b.w * 0.16, b.h * 0.28, 0], p.light, { name: 'photo-booth-seat' });
    add([b.w * 0.12, b.w * 0.04, b.w * 0.12], [b.w * 0.16, b.h * 0.72, -b.d * 0.3], p.glass, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'photo-booth-camera-lens', opacity: 0.7 });
    return;
  }
  if (key.includes('arcade_cabinet')) {
    for (const side of [-1, 1]) {
      add([b.w * 0.4, b.h * 0.9, b.d * 0.76], [side * b.w * 0.23, b.h * 0.48, 0], side < 0 ? p.primary : p.secondary, { name: 'arcade-cabinet-body' });
      add([b.w * 0.3, b.h * 0.28, b.d * 0.025], [side * b.w * 0.23, b.h * 0.65, b.d * 0.39], p.glass, { name: 'arcade-cabinet-screen', opacity: 0.78, emissive: p.glow, emissiveIntensity: 0.24 });
      add([b.w * 0.3, b.h * 0.06, b.d * 0.22], [side * b.w * 0.23, b.h * 0.44, b.d * 0.3], p.dark, { rotation: [-0.18, 0, 0], name: 'arcade-control-deck' });
    }
    return;
  }
  if (key.includes('pinball')) {
    for (const x of [-0.32, 0.32]) for (const z of [-0.28, 0.28]) add([b.w * 0.045, b.h * 0.5, b.d * 0.045], [x * b.w, b.h * 0.25, z * b.d], p.metal, { name: 'pinball-machine-leg', metalness: 0.5 });
    add([b.w * 0.78, b.h * 0.22, b.d * 0.82], [0, b.h * 0.56, 0], p.primary, { rotation: [-0.08, 0, 0], name: 'pinball-playfield-cabinet' });
    add([b.w * 0.68, b.h * 0.025, b.d * 0.7], [0, b.h * 0.68, 0], p.glass, { rotation: [-0.08, 0, 0], name: 'pinball-playfield-glass', opacity: 0.45 });
    add([b.w * 0.7, b.h * 0.48, b.d * 0.16], [0, b.h * 0.83, -b.d * 0.32], p.secondary, { name: 'pinball-backbox' });
    add([b.w * 0.56, b.h * 0.3, b.d * 0.025], [0, b.h * 0.85, -b.d * 0.225], p.glow, { name: 'pinball-score-display', emissive: p.glow, emissiveIntensity: 0.22 });
    return;
  }
  if (key.includes('stage_lighting')) {
    for (const x of [-0.43, 0.43]) add([b.w * 0.045, b.h * 0.88, b.d * 0.045], [x * b.w, b.h * 0.46, 0], p.metal, { name: 'lighting-rig-truss-upright', metalness: 0.62 });
    add([b.w * 0.9, b.h * 0.055, b.d * 0.055], [0, b.h * 0.9, 0], p.metal, { name: 'lighting-rig-top-truss', metalness: 0.62 });
    for (let lamp = -3; lamp <= 3; lamp += 1) {
      add([b.w * 0.12, b.h * 0.18, b.d * 0.14], [lamp * b.w * 0.12, b.h * 0.76, 0], p.dark, { shape: 'cone', rotation: [Math.PI, 0, 0], name: 'stage-light-can' });
      add([b.w * 0.07, b.h * 0.025, b.d * 0.07], [lamp * b.w * 0.12, b.h * 0.66, 0], lamp % 2 ? p.glow : p.secondary, { shape: 'cylinder', name: 'stage-light-lens', emissive: lamp % 2 ? p.glow : p.secondary, emissiveIntensity: 0.42 });
    }
    return;
  }
  if (key.includes('speaker_stack')) {
    for (let cabinet = 0; cabinet < 4; cabinet += 1) {
      const x = (cabinet % 2 ? 1 : -1) * b.w * 0.23;
      const y = b.h * (0.25 + Math.floor(cabinet / 2) * 0.48);
      add([b.w * 0.42, b.h * 0.42, b.d * 0.72], [x, y, 0], p.dark, { name: 'speaker-stack-cabinet' });
      for (const woofer of [-0.1, 0.1]) add([b.w * 0.22, b.w * 0.035, b.w * 0.22], [x, y + woofer * b.h, b.d * 0.37], p.primary, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'speaker-stack-driver' });
    }
    return;
  }
  if (/(charging_station|phone_charging_kiosk|smart_home_hub)/.test(key)) {
    add([b.w * 0.7, b.h * 0.9, b.d * 0.58], [0, b.h * 0.48, 0], p.primary, { name: 'charging-hub-pedestal' });
    add([b.w * 0.52, b.h * 0.24, b.d * 0.025], [0, b.h * 0.68, b.d * 0.3], p.glass, { name: 'charging-hub-touchscreen', opacity: 0.78, emissive: p.glow, emissiveIntensity: 0.2 });
    for (let port = -2; port <= 2; port += 1) add([b.w * 0.07, b.h * 0.035, b.d * 0.025], [port * b.w * 0.11, b.h * 0.42, b.d * 0.31], port === variant - 2 ? p.glow : p.dark, { name: 'charging-hub-device-port', emissive: port === variant - 2 ? p.glow : '#000000', emissiveIntensity: 0.3 });
    return;
  }
  if (key.includes('drone_dock')) {
    add([b.w * 0.86, b.h * 0.08, b.d * 0.82], [0, b.h * 0.06, 0], p.light, { name: 'drone-dock-landing-pad' });
    for (const diagonal of [-1, 1]) add([b.w * 0.72, b.h * 0.045, b.d * 0.045], [0, b.h * 0.3, 0], p.dark, { rotation: [0, diagonal * Math.PI / 4, 0], name: 'drone-cross-arm' });
    add([b.w * 0.28, b.h * 0.16, b.d * 0.28], [0, b.h * 0.34, 0], p.primary, { name: 'drone-control-body' });
    for (const x of [-0.27, 0.27]) for (const z of [-0.27, 0.27]) add([b.w * 0.22, b.h * 0.025, b.d * 0.22], [x * b.w, b.h * 0.34, z * b.d], p.metal, { shape: 'cylinder', name: 'drone-rotor', metalness: 0.5 });
    return;
  }
  if (key.includes('solar_rig')) {
    for (const side of [-1, 1]) {
      add([b.w * 0.42, b.h * 0.05, b.d * 0.82], [side * b.w * 0.24, b.h * 0.58, 0], '#334c66', { rotation: [-0.42, 0, 0], name: 'solar-rig-photovoltaic-panel', metalness: 0.26 });
      for (let cell = -2; cell <= 2; cell += 1) add([b.w * 0.055, b.h * 0.018, b.d * 0.7], [side * b.w * 0.24 + cell * b.w * 0.065, b.h * 0.59, 0], p.glass, { rotation: [-0.42, 0, 0], name: 'solar-rig-cell-divider', opacity: 0.6 });
    }
    for (const x of [-0.35, 0.35]) add([b.w * 0.05, b.h * 0.5, b.d * 0.05], [x * b.w, b.h * 0.26, 0], p.metal, { name: 'solar-rig-support-leg', metalness: 0.58 });
    return;
  }
  if (/(antennas|weather_station)/.test(key)) {
    add([b.w * 0.6, b.h * 0.07, b.d * 0.6], [0, b.h * 0.04, 0], p.dark, { name: 'sensor-mast-base' });
    add([b.w * 0.06, b.h * 0.86, b.d * 0.06], [0, b.h * 0.48, 0], p.metal, { shape: 'cylinder', name: 'sensor-mast-pole', metalness: 0.62 });
    for (let arm = 0; arm < 4; arm += 1) {
      const angle = arm / 4 * Math.PI * 2;
      add([b.w * 0.36, b.h * 0.03, b.d * 0.03], [Math.cos(angle) * b.w * 0.18, b.h * (0.65 + arm * 0.07), Math.sin(angle) * b.d * 0.18], p.metal, { rotation: [0, -angle, 0], name: 'sensor-mast-cross-arm', metalness: 0.6 });
      add([b.w * 0.11, b.h * 0.13, b.d * 0.11], [Math.cos(angle) * b.w * 0.35, b.h * (0.65 + arm * 0.07), Math.sin(angle) * b.d * 0.35], arm % 2 ? p.glass : p.secondary, { shape: arm % 2 ? 'cylinder' : 'cone', name: 'sensor-mast-instrument', opacity: arm % 2 ? 0.7 : 1 });
    }
    return;
  }
  // Emergency and exit fixtures are wall-mounted luminous units.
  add([b.w * 0.88, b.h * 0.48, b.d * 0.3], [0, b.h * 0.56, 0], p.light, { name: key.includes('exit') ? 'exit-sign-housing' : 'emergency-light-housing' });
  add([b.w * 0.72, b.h * 0.3, b.d * 0.025], [0, b.h * 0.56, b.d * 0.16], key.includes('exit') ? '#4bc77b' : p.glow, { name: key.includes('exit') ? 'exit-sign-luminous-face' : 'emergency-light-luminous-face', emissive: key.includes('exit') ? '#4bc77b' : p.glow, emissiveIntensity: 0.45 });
  for (const side of [-1, 1]) add([b.w * 0.18, b.h * 0.16, b.d * 0.14], [side * b.w * 0.28, b.h * 0.84, 0], p.light, { shape: 'cone', rotation: [Math.PI / 2, 0, side * 0.18], name: 'emergency-light-adjustable-head' });
}

function buildOfficeProp(root: THREE.Group, key: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  if (key.includes('whiteboard')) {
    add([b.w * 0.94, b.h * 0.75, b.d * 0.16], [0, b.h * 0.55, 0], p.metal, { name: 'whiteboard-aluminum-frame', metalness: 0.48 });
    add([b.w * 0.86, b.h * 0.64, b.d * 0.025], [0, b.h * 0.55, b.d * 0.09], p.light, { name: 'whiteboard-writing-surface', roughness: 0.22 });
    add([b.w * 0.72, b.h * 0.035, b.d * 0.18], [0, b.h * 0.18, b.d * 0.14], p.metal, { name: 'whiteboard-marker-tray', metalness: 0.42 });
    for (let marker = -2; marker <= 2; marker += 1) add([b.w * 0.1, b.h * 0.025, b.d * 0.025], [marker * b.w * 0.12, b.h * 0.21, b.d * 0.19], marker % 2 ? p.primary : p.secondary, { name: 'whiteboard-marker' });
    return;
  }
  if (key.includes('organizer')) {
    add([b.w * 0.9, b.h * 0.07, b.d * 0.8], [0, b.h * 0.05, 0], p.wood, { name: 'desk-organizer-base-tray' });
    for (let slot = -3; slot <= 3; slot += 1) add([b.w * 0.08, b.h * (0.25 + (slot + 3) % 3 * 0.08), b.d * 0.65], [slot * b.w * 0.12, b.h * 0.2, 0], slot % 2 ? p.primary : p.secondary, { rotation: [0, 0, slot * 0.025], name: 'desk-organizer-file-divider' });
    for (let paper = 0; paper < 4; paper += 1) add([b.w * 0.32, b.h * 0.018, b.d * 0.38], [b.w * 0.22, b.h * (0.12 + paper * 0.025), b.d * 0.12], p.light, { rotation: [0, paper * 0.025, 0], name: 'desk-organizer-paper-stack' });
    return;
  }
  add([b.w * 0.94, b.h * 0.62, b.d * 0.78], [0, b.h * 0.34, 0], p.primary, { name: 'reception-counter-front-panel' });
  add([b.w * 0.98, b.h * 0.07, b.d * 0.86], [0, b.h * 0.67, 0], p.light, { name: 'reception-counter-work-surface' });
  add([b.w * 0.7, b.h * 0.28, b.d * 0.2], [0, b.h * 0.84, -b.d * 0.28], p.secondary, { name: 'reception-counter-raised-transaction-top' });
  add([b.w * 0.26, b.h * 0.23, b.d * 0.05], [b.w * 0.2, b.h * 0.82, 0], p.dark, { name: 'reception-counter-monitor' });
  void variant;
}

function buildPoolLaneMarker(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (const side of [-1, 1]) {
    add([b.w * 0.12, b.h * 0.82, b.d * 0.12], [side * b.w * 0.43, b.h * 0.43, 0], p.metal, { shape: 'cylinder', name: 'pool-lane-anchor-post', metalness: 0.56 });
    add([b.w * 0.26, b.h * 0.06, b.d * 0.26], [side * b.w * 0.43, b.h * 0.04, 0], p.metal, { shape: 'cylinder', name: 'pool-lane-anchor-base', metalness: 0.5 });
  }
  add([b.w * 0.82, b.h * 0.025, b.d * 0.025], [0, b.h * 0.58, 0], p.dark, { name: 'pool-lane-tension-rope' });
  for (let float = -7; float <= 7; float += 1) add([b.w * 0.07, b.w * 0.025, b.w * 0.07], [float * b.w * 0.055, b.h * 0.58, 0], (float + variant) % 4 < 2 ? p.primary : p.light, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'pool-lane-divider-float' });
}

function addBeamBetween(
  root: THREE.Object3D,
  start: [number, number, number],
  end: [number, number, number],
  thickness: number,
  color: string,
  name: string,
): THREE.Mesh {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const mesh = partAdder(root)([thickness, direction.length(), thickness], a.clone().add(b).multiplyScalar(0.5).toArray(), color, { name });
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.userData.baseRotation = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
  return mesh;
}

function partAdder(parent: THREE.Object3D) {
  return (
    scale: [number, number, number],
    position: [number, number, number],
    color: string,
    options: PartOptions,
  ): THREE.Mesh => {
    const opacity = options.opacity ?? 1;
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.56,
      metalness: options.metalness ?? 0.1,
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
    mesh.name = options.name;
    mesh.userData.baseRotation = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
    mesh.castShadow = opacity > 0.5;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
}

function paletteFor(variant: number, accent: string, body: string): Palette {
  const shift = (color: string, lightness: number): string => new THREE.Color(color).offsetHSL(0, 0, lightness).getStyle();
  const primary = shift(body, (variant - 3.5) * 0.018);
  return {
    primary,
    secondary: shift(accent, (variant % 3 - 1) * 0.035),
    dark: new THREE.Color(primary).multiplyScalar(0.35).getStyle(),
    light: shift('#dce0d9', variant * 0.005),
    metal: shift('#7f8b92', variant * 0.006),
    glass: variant % 2 ? '#8abac5' : '#a5cbd1',
    wood: shift('#855f40', variant * 0.009),
    glow: ['#74dff1', '#f1c15b', '#82df91', '#ef8171'][variant % 4]!,
  };
}

function productionKindFor(key: string): string | null {
  if (/^(planter_box_row|hanging_planter|topiary_spiral|fern_stand|palm_in_lobby_pot|monstera_floor_plant|snake_plant_planter|fruit_tree|potted_orchid|bamboo_cluster|succulent_bowl|hanging_vines|herb_tower|azalea_bush|boxwood_hedge)$/.test(key)) return 'planter';
  if (/^(water_feature|birdbath)$/.test(key)) return 'fountain';
  if (/^(platform_shelter|bus_stop_shelter)$/.test(key)) return 'bus_shelter';
  if (key === 'garden_swing') return 'swing_set';
  if (/^(dry_goods_pallet|delivery_staging)$/.test(key)) return 'pallet_stack';
  if (/^(server_cabinet|router_rack)$/.test(key)) return 'server_rack';
  if (/^(office_partition|fitting_room|construction_fence)$/.test(key)) return 'privacy_screen';
  if (key === 'grocery_trolley') return 'shopping_cart';
  if (/^(printer_station|printer_fleet)$/.test(key)) return 'copy_machine';
  if (key === 'archive_cart') return 'archive_trolley';
  if (/^(fare_gate|subway_turnstile)$/.test(key)) return 'ticket_gate';
  if (/^(arrivals_board|video_wall|billboard|evacuation_map)$/.test(key)) return 'departure_board';
  if (/^(award_case|jewelry_counter|bakery_case|butcher_counter)$/.test(key)) return 'display_case';
  if (/^(display_shelf|shoe_display|perfume_counter|sunglass_spinner)$/.test(key)) return 'retail_display';
  if (key === 'tool_cart') return 'tool_chest';
  if (/^(bottle_crate_stack|toy_box)$/.test(key)) return 'warehouse_crate';
  if (key === 'airport_luggage_trolley') return 'luggage_cart';
  if (/^(vending_island|ticket_vending)$/.test(key)) return 'snack_machine';
  if (/^(industrial_shelving|chemical_shelf|pallet_rack|ladder_rack|lumber_rack|pipe_rack)$/.test(key)) return 'utility_shelf';
  if (/^(cone_cart|traffic_barrel)$/.test(key)) return 'traffic_cone';
  if (key === 'cable_spool') return 'pipe_cluster';
  if (key === 'campfire_ring') return 'fire_barrel';
  if (/^(concrete_barrier)$/.test(key)) return 'wooden_barricade';
  if (/^(altar_table|memorial_plinth)$/.test(key)) return 'altar';
  if (key === 'laundry_stack') return 'washer';
  if (/^(hospital_trolley|imaging_cart|blood_pressure_stand)$/.test(key)) return 'medical_cart';
  if (key === 'checkout_lane') return 'checkout';
  return null;
}
