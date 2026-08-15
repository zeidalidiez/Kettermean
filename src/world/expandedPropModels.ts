import * as THREE from 'three';
import { geometryForShape } from './modelQuality';

type Shape = 'box' | 'cylinder' | 'cone' | 'torus';
type Bounds = { w: number; h: number; d: number };

interface PartOptions {
  shape?: Shape;
  rotation?: [number, number, number];
  roughness?: number;
  metalness?: number;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  name: string;
}

interface Palette {
  paint: string;
  paintDark: string;
  accent: string;
  light: string;
  metal: string;
  glass: string;
  wood: string;
  woodDark: string;
  foliage: string;
  soil: string;
  stone: string;
  water: string;
  glow: string;
}

const EXPANDED_PRODUCTION_KINDS = new Set([
  'display_case',
  'planter',
  'tree',
  'fountain',
  'bus_shelter',
  'swing_set',
  'pallet_stack',
  'server_rack',
  'privacy_screen',
  'shopping_cart',
  'copy_machine',
  'archive_trolley',
  'ticket_gate',
  'departure_board',
  'retail_display',
  'tool_chest',
  'drum_stack',
  'luggage_cart',
  'room_service',
  'traffic_cone',
  'exercise_bike',
  'pool_ladder',
  'utility_shelf',
  'breaker_panel',
  'boiler',
  'pipe_cluster',
  'snack_machine',
  'luggage_pile',
  'market_stall',
  'maintenance_sink',
  'rubble_pile',
  'fire_barrel',
  'broken_column',
  'collapsed_beam',
  'wooden_barricade',
  'altar',
  'warehouse_crate',
  'generator',
  'telescope',
  'washer',
  'medical_cart',
  'checkout',
]);

/** Rebuild expanded-catalogue props that previously shared unrelated chassis. */
export function buildExpandedProductionProp(
  kind: string,
  variant: number,
  accent: string,
  body: string,
  bounds: Bounds,
): THREE.Group | null {
  if (!EXPANDED_PRODUCTION_KINDS.has(kind)) return null;

  const root = new THREE.Group();
  const palette = paletteFor(variant, accent, body);
  switch (kind) {
    case 'display_case': buildDisplayCase(root, bounds, palette, variant); break;
    case 'planter': buildPlanter(root, bounds, palette, variant); break;
    case 'tree': buildTree(root, bounds, palette, variant); break;
    case 'fountain': buildFountain(root, bounds, palette, variant); break;
    case 'bus_shelter': buildBusShelter(root, bounds, palette, variant); break;
    case 'swing_set': buildSwingSet(root, bounds, palette, variant); break;
    case 'pallet_stack': buildPalletStack(root, bounds, palette, variant); break;
    case 'server_rack': buildServerRack(root, bounds, palette, variant); break;
    case 'privacy_screen': buildPrivacyScreen(root, bounds, palette, variant); break;
    case 'shopping_cart': buildShoppingCart(root, bounds, palette, variant); break;
    case 'copy_machine': buildCopyMachine(root, bounds, palette, variant); break;
    case 'archive_trolley': buildArchiveTrolley(root, bounds, palette, variant); break;
    case 'ticket_gate': buildTicketGate(root, bounds, palette, variant); break;
    case 'departure_board': buildDepartureBoard(root, bounds, palette, variant); break;
    case 'retail_display': buildRetailDisplay(root, bounds, palette, variant); break;
    case 'tool_chest': buildToolChest(root, bounds, palette, variant); break;
    case 'drum_stack': buildDrumStack(root, bounds, palette, variant); break;
    case 'luggage_cart': buildLuggageCart(root, bounds, palette, variant); break;
    case 'room_service': buildRoomServiceCart(root, bounds, palette, variant); break;
    case 'traffic_cone': buildTrafficCones(root, bounds, palette, variant); break;
    case 'exercise_bike': buildExerciseBike(root, bounds, palette, variant); break;
    case 'pool_ladder': buildPoolLadder(root, bounds, palette, variant); break;
    case 'utility_shelf': buildUtilityShelf(root, bounds, palette, variant); break;
    case 'breaker_panel': buildBreakerPanel(root, bounds, palette, variant); break;
    case 'boiler': buildBoiler(root, bounds, palette, variant); break;
    case 'pipe_cluster': buildPipeCluster(root, bounds, palette, variant); break;
    case 'snack_machine': buildSnackMachine(root, bounds, palette, variant); break;
    case 'luggage_pile': buildLuggagePile(root, bounds, palette, variant); break;
    case 'market_stall': buildMarketStall(root, bounds, palette, variant); break;
    case 'maintenance_sink': buildMaintenanceSink(root, bounds, palette, variant); break;
    case 'rubble_pile': buildRubblePile(root, bounds, palette, variant); break;
    case 'fire_barrel': buildFireBarrel(root, bounds, palette, variant); break;
    case 'broken_column': buildBrokenColumn(root, bounds, palette, variant); break;
    case 'collapsed_beam': buildCollapsedBeam(root, bounds, palette, variant); break;
    case 'wooden_barricade': buildWoodenBarricade(root, bounds, palette, variant); break;
    case 'altar': buildAltar(root, bounds, palette, variant); break;
    case 'warehouse_crate': buildWarehouseCrate(root, bounds, palette, variant); break;
    case 'generator': buildGenerator(root, bounds, palette, variant); break;
    case 'telescope': buildTelescope(root, bounds, palette, variant); break;
    case 'washer': buildWasher(root, bounds, palette, variant); break;
    case 'medical_cart': buildMedicalCart(root, bounds, palette, variant); break;
    case 'checkout': buildCheckout(root, bounds, palette, variant); break;
  }

  root.name = `${kind}-${variant}`;
  root.userData.detailTier = 'expanded-production-prop';
  root.userData.productionExpandedProp = true;
  return root;
}

function buildDisplayCase(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.92, b.h * 0.3, b.d * 0.88], [0, b.h * 0.15, 0], p.woodDark, { name: 'display-case-storage-plinth' });
  add([b.w * 0.96, b.h * 0.045, b.d * 0.92], [0, b.h * 0.32, 0], p.metal, { name: 'display-case-lower-frame', metalness: 0.46 });
  add([b.w * 0.96, b.h * 0.045, b.d * 0.92], [0, b.h * 0.97, 0], p.metal, { name: 'display-case-upper-frame', metalness: 0.46 });
  for (const x of [-0.44, 0.44]) for (const z of [-0.4, 0.4]) {
    add([b.w * 0.035, b.h * 0.64, b.d * 0.035], [x * b.w, b.h * 0.65, z * b.d], p.metal, { name: 'display-case-corner-post', metalness: 0.5 });
  }
  add([b.w * 0.84, b.h * 0.57, b.d * 0.018], [0, b.h * 0.65, b.d * 0.41], p.glass, { name: 'display-case-front-glass', opacity: 0.25, roughness: 0.08 });
  add([b.w * 0.84, b.h * 0.57, b.d * 0.018], [0, b.h * 0.65, -b.d * 0.41], p.glass, { name: 'display-case-back-glass', opacity: 0.22, roughness: 0.08 });
  for (const side of [-1, 1]) add([b.w * 0.018, b.h * 0.57, b.d * 0.76], [side * b.w * 0.45, b.h * 0.65, 0], p.glass, { name: 'display-case-side-glass', opacity: 0.23, roughness: 0.08 });
  add([b.w * 0.7, b.h * 0.035, b.d * 0.62], [0, b.h * 0.49, 0], p.glass, { name: 'display-case-glass-shelf', opacity: 0.32, roughness: 0.1 });
  add([b.w * 0.24, b.h * 0.08, b.d * 0.24], [0, b.h * 0.55, 0], p.stone, { name: 'display-case-object-plinth' });
  add([b.w * 0.15, b.h * 0.25, b.d * 0.15], [0, b.h * 0.7, 0], variant % 2 ? p.accent : p.light, { shape: 'cone', name: 'display-case-curated-object', metalness: 0.24 });
}

function buildPlanter(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.88, b.h * 0.08, b.d * 0.88], [0, b.h * 0.04, 0], p.stone, { name: 'planter-foot' });
  for (const side of [-1, 1]) {
    add([b.w * 0.08, b.h * 0.32, b.d * 0.76], [side * b.w * 0.4, b.h * 0.2, 0], p.stone, { name: 'planter-side-wall' });
    add([b.w * 0.72, b.h * 0.32, b.d * 0.08], [0, b.h * 0.2, side * b.d * 0.4], p.stone, { name: 'planter-end-wall' });
  }
  add([b.w * 0.72, b.h * 0.05, b.d * 0.72], [0, b.h * 0.34, 0], p.soil, { name: 'planter-visible-soil' });
  add([b.w * 0.07, b.h * 0.5, b.w * 0.07], [0, b.h * 0.58, 0], p.woodDark, { shape: 'cylinder', name: 'planter-main-stem' });
  for (let branch = 0; branch < 5; branch += 1) {
    const angle = branch / 5 * Math.PI * 2 + variant * 0.12;
    const start: [number, number, number] = [0, b.h * (0.48 + branch * 0.07), 0];
    const end: [number, number, number] = [Math.cos(angle) * b.w * 0.28, b.h * (0.67 + branch % 2 * 0.1), Math.sin(angle) * b.d * 0.28];
    addBeamBetween(root, start, end, b.w * 0.025, p.woodDark, 'planter-branch');
    add([b.w * 0.2, b.h * 0.2, b.d * 0.13], end, branch % 2 ? p.foliage : shifted(p.foliage, 0.06), { shape: 'cone', rotation: [0, 0, Math.PI / 2 - angle * 0.2], name: 'planter-leaf-cluster' });
  }
}

function buildTree(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.22, b.h * 0.66, b.d * 0.22], [0, b.h * 0.33, 0], p.woodDark, { shape: 'cone', name: 'tree-tapered-trunk', roughness: 0.92 });
  const branchEnds: Array<[number, number, number]> = [
    [-b.w * 0.3, b.h * 0.68, b.d * 0.05],
    [b.w * 0.32, b.h * 0.74, -b.d * 0.08],
    [-b.w * 0.12, b.h * 0.82, -b.d * 0.28],
    [b.w * 0.08, b.h * 0.9, b.d * 0.2],
  ];
  for (let index = 0; index < branchEnds.length; index += 1) {
    const end = branchEnds[index]!;
    addBeamBetween(root, [0, b.h * (0.52 + index * 0.055), 0], end, b.w * 0.045, p.woodDark, 'tree-structural-branch');
    add([b.w * (0.5 - index * 0.045), b.h * (0.3 + index % 2 * 0.08), b.d * (0.48 - index * 0.035)], end, index % 2 ? p.foliage : shifted(p.foliage, 0.07), { shape: 'cone', rotation: [0, variant * 0.08 + index * 0.5, 0], name: 'tree-angular-foliage-crown' });
  }
  add([b.w * 0.72, b.h * 0.38, b.d * 0.7], [0, b.h * 0.9, 0], p.foliage, { shape: 'cone', rotation: [0, variant * 0.09, 0], name: 'tree-central-foliage-crown' });
}

function buildFountain(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.95, b.h * 0.13, b.d * 0.95], [0, b.h * 0.065, 0], p.stone, { shape: 'cylinder', name: 'fountain-stone-basin-base' });
  add([b.w * 0.88, b.w * 0.88, b.w * 0.07], [0, b.h * 0.18, 0], p.stone, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'fountain-lower-basin-rim' });
  add([b.w * 0.72, b.h * 0.025, b.d * 0.72], [0, b.h * 0.19, 0], p.water, { shape: 'cylinder', name: 'fountain-lower-water', opacity: 0.48, roughness: 0.06, emissive: p.water, emissiveIntensity: 0.08 });
  add([b.w * 0.16, b.h * 0.55, b.d * 0.16], [0, b.h * 0.45, 0], p.stone, { shape: 'cylinder', name: 'fountain-center-pedestal' });
  add([b.w * 0.5, b.h * 0.12, b.d * 0.5], [0, b.h * 0.69, 0], p.stone, { shape: 'cylinder', name: 'fountain-upper-bowl' });
  add([b.w * 0.48, b.w * 0.48, b.w * 0.055], [0, b.h * 0.73, 0], p.stone, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'fountain-upper-rim' });
  add([b.w * 0.055, b.h * 0.27, b.w * 0.055], [0, b.h * 0.87, 0], p.water, { shape: 'cylinder', name: 'fountain-center-water-jet', opacity: 0.6, emissive: p.water, emissiveIntensity: 0.1 });
  const jets = 4 + variant % 2;
  for (let jet = 0; jet < jets; jet += 1) {
    const angle = jet / jets * Math.PI * 2;
    add([b.w * 0.025, b.h * 0.2, b.w * 0.025], [Math.cos(angle) * b.w * 0.17, b.h * 0.84, Math.sin(angle) * b.d * 0.17], p.water, { shape: 'cylinder', rotation: [Math.sin(angle) * 0.42, 0, -Math.cos(angle) * 0.42], name: 'fountain-arc-water-jet', opacity: 0.52, emissive: p.water, emissiveIntensity: 0.08 });
  }
}

function buildBusShelter(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.96, b.h * 0.065, b.d * 0.9], [0, b.h * 0.035, 0], p.stone, { name: 'bus-shelter-platform' });
  for (const x of [-0.45, 0.45]) for (const z of [-0.38, 0.38]) {
    add([b.w * 0.035, b.h * 0.86, b.d * 0.035], [x * b.w, b.h * 0.47, z * b.d], p.metal, { name: 'bus-shelter-frame-post', metalness: 0.55 });
  }
  add([b.w, b.h * 0.08, b.d * 0.94], [0, b.h * 0.94, 0], variant % 2 ? p.accent : p.metal, { name: 'bus-shelter-weather-roof', metalness: 0.38 });
  add([b.w * 0.86, b.h * 0.78, b.d * 0.018], [0, b.h * 0.5, -b.d * 0.38], p.glass, { name: 'bus-shelter-back-glass', opacity: 0.26, roughness: 0.1 });
  for (const side of [-1, 1]) add([b.w * 0.018, b.h * 0.78, b.d * 0.7], [side * b.w * 0.45, b.h * 0.5, 0], p.glass, { name: 'bus-shelter-side-glass', opacity: 0.24, roughness: 0.1 });
  add([b.w * 0.58, b.h * 0.065, b.d * 0.34], [0, b.h * 0.34, -b.d * 0.08], p.wood, { name: 'bus-shelter-bench-seat' });
  add([b.w * 0.58, b.h * 0.28, b.d * 0.05], [0, b.h * 0.48, -b.d * 0.23], p.wood, { name: 'bus-shelter-bench-back' });
  for (const x of [-0.24, 0.24]) add([b.w * 0.035, b.h * 0.28, b.d * 0.035], [x * b.w, b.h * 0.17, -b.d * 0.08], p.metal, { name: 'bus-shelter-bench-leg', metalness: 0.52 });
  add([b.w * 0.22, b.h * 0.48, b.d * 0.025], [-b.w * 0.31, b.h * 0.61, -b.d * 0.355], p.light, { name: 'bus-shelter-route-poster' });
}

function buildSwingSet(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (const x of [-0.43, 0.43]) {
    addBeamBetween(root, [x * b.w, 0, -b.d * 0.38], [x * b.w, b.h * 0.94, 0], b.w * 0.045, p.metal, 'swing-set-a-frame-leg');
    addBeamBetween(root, [x * b.w, 0, b.d * 0.38], [x * b.w, b.h * 0.94, 0], b.w * 0.045, p.metal, 'swing-set-a-frame-leg');
  }
  add([b.w * 0.94, b.h * 0.06, b.d * 0.06], [0, b.h * 0.94, 0], p.metal, { name: 'swing-set-top-beam', metalness: 0.48 });
  for (const swing of [-0.2, 0.2]) {
    for (const rope of [-1, 1]) add([b.w * 0.018, b.h * 0.56, b.d * 0.018], [(swing + rope * 0.065) * b.w, b.h * 0.65, 0], p.paintDark, { shape: 'cylinder', name: 'swing-set-chain', metalness: 0.65 });
    add([b.w * 0.18, b.h * 0.045, b.d * 0.25], [swing * b.w, b.h * (0.35 + (variant % 2) * 0.025), 0], p.accent, { name: 'swing-set-seat' });
  }
}

function buildPalletStack(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (let pallet = 0; pallet < 3; pallet += 1) {
    const y = b.h * (0.08 + pallet * 0.3);
    const angle = (pallet - 1) * 0.025 + (variant - 3.5) * 0.004;
    for (let slat = -3; slat <= 3; slat += 1) add([b.w * 0.92, b.h * 0.055, b.d * 0.09], [0, y + b.h * 0.1, slat * b.d * 0.11], pallet % 2 ? p.wood : shifted(p.wood, -0.05), { rotation: [0, angle, 0], name: 'pallet-deck-slat' });
    for (const z of [-0.33, 0, 0.33]) add([b.w * 0.86, b.h * 0.11, b.d * 0.075], [0, y, z * b.d], p.woodDark, { rotation: [0, angle, 0], name: 'pallet-load-bearing-stringer' });
  }
}

function buildServerRack(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.94, b.h * 0.96, b.d * 0.92], [0, b.h * 0.5, 0], p.paintDark, { name: 'server-rack-enclosure', metalness: 0.38 });
  add([b.w * 0.78, b.h * 0.87, b.d * 0.025], [0, b.h * 0.51, b.d * 0.47], '#101619', { name: 'server-rack-open-front' });
  for (let unit = 0; unit < 10; unit += 1) {
    const y = b.h * (0.13 + unit * 0.078);
    add([b.w * 0.7, b.h * 0.058, b.d * 0.035], [0, y, b.d * 0.49], unit % 3 === 0 ? p.metal : p.paint, { name: 'server-rack-blade', metalness: 0.48 });
    for (let led = 0; led < 3; led += 1) add([b.w * 0.018, b.h * 0.012, b.d * 0.012], [b.w * (0.2 + led * 0.055), y, b.d * 0.515], led === (unit + variant) % 3 ? p.glow : '#315a42', { name: 'server-rack-status-led', emissive: led === (unit + variant) % 3 ? p.glow : '#315a42', emissiveIntensity: 0.5 });
    add([b.w * 0.18, b.h * 0.012, b.d * 0.012], [-b.w * 0.2, y, b.d * 0.515], '#313a3d', { name: 'server-rack-vent-slot' });
  }
  for (const side of [-1, 1]) add([b.w * 0.035, b.h * 0.91, b.d * 0.04], [side * b.w * 0.42, b.h * 0.5, b.d * 0.49], p.metal, { name: 'server-rack-mounting-rail', metalness: 0.58 });
}

function buildPrivacyScreen(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const panelWidth = b.w * 0.3;
  for (let panelIndex = -1; panelIndex <= 1; panelIndex += 1) {
    const panel = new THREE.Group();
    const add = partAdder(panel);
    panel.position.x = panelIndex * b.w * 0.29;
    panel.rotation.y = panelIndex * (0.1 + variant * 0.006);
    add([panelWidth * 0.88, b.h * 0.72, b.d * 0.035], [0, b.h * 0.57, 0], panelIndex % 2 ? p.light : p.accent, { name: 'privacy-screen-washable-fabric', opacity: 0.84 });
    for (const x of [-0.46, 0.46]) add([panelWidth * 0.045, b.h * 0.84, b.d * 0.045], [x * panelWidth, b.h * 0.5, 0], p.metal, { name: 'privacy-screen-frame-upright', metalness: 0.52 });
    for (const y of [0.15, 0.92]) add([panelWidth * 0.96, b.h * 0.035, b.d * 0.045], [0, y * b.h, 0], p.metal, { name: 'privacy-screen-frame-rail', metalness: 0.52 });
    add([panelWidth * 0.72, b.h * 0.035, b.d * 0.28], [0, b.h * 0.03, 0], p.metal, { name: 'privacy-screen-stabilizing-foot', metalness: 0.5 });
    root.add(panel);
  }
}

function buildShoppingCart(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.62, b.h * 0.05, b.d * 0.66], [0, b.h * 0.19, 0], p.metal, { name: 'shopping-cart-lower-chassis', metalness: 0.6 });
  for (const side of [-1, 1]) {
    add([b.w * 0.035, b.h * 0.66, b.d * 0.035], [side * b.w * 0.34, b.h * 0.5, -b.d * 0.28], p.metal, { rotation: [0, 0, side * -0.08], name: 'shopping-cart-handle-upright', metalness: 0.6 });
  }
  add([b.w * 0.78, b.h * 0.055, b.d * 0.055], [0, b.h * 0.85, -b.d * 0.29], variant % 2 ? p.accent : p.paint, { name: 'shopping-cart-push-handle' });
  // Basket rails: open geometry reads as a cart instead of a solid cabinet.
  for (let rail = 0; rail < 6; rail += 1) {
    const y = b.h * (0.34 + rail * 0.075);
    add([b.w * 0.72, b.h * 0.018, b.d * 0.018], [0, y, b.d * 0.3], p.metal, { name: 'shopping-cart-front-wire', metalness: 0.62 });
    add([b.w * 0.72, b.h * 0.018, b.d * 0.018], [0, y, -b.d * 0.25], p.metal, { name: 'shopping-cart-back-wire', metalness: 0.62 });
  }
  for (let rib = -3; rib <= 3; rib += 1) {
    add([b.w * 0.018, b.h * 0.45, b.d * 0.018], [rib * b.w * 0.1, b.h * 0.51, b.d * 0.3], p.metal, { name: 'shopping-cart-basket-rib', metalness: 0.62 });
  }
  for (const side of [-1, 1]) for (let rail = 0; rail < 4; rail += 1) {
    add([b.w * 0.018, b.h * 0.018, b.d * 0.54], [side * b.w * 0.36, b.h * (0.39 + rail * 0.095), b.d * 0.025], p.metal, { name: 'shopping-cart-side-wire', metalness: 0.62 });
  }
  add([b.w * 0.7, b.h * 0.025, b.d * 0.54], [0, b.h * 0.31, b.d * 0.02], p.metal, { name: 'shopping-cart-basket-floor', metalness: 0.54 });
  for (const x of [-0.29, 0.29]) for (const z of [-0.25, 0.25]) {
    add([b.w * 0.1, b.w * 0.055, b.w * 0.1], [x * b.w, b.h * 0.09, z * b.d], p.paintDark, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'shopping-cart-caster-wheel' });
  }
}

function buildCopyMachine(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.78, b.h * 0.54, b.d * 0.72], [0, b.h * 0.3, 0], p.light, { name: 'copier-paper-cabinet' });
  for (let drawer = 0; drawer < 2; drawer += 1) {
    add([b.w * 0.68, b.h * 0.16, b.d * 0.025], [0, b.h * (0.16 + drawer * 0.2), b.d * 0.37], p.paint, { name: 'copier-paper-drawer' });
    add([b.w * 0.2, b.h * 0.018, b.d * 0.018], [0, b.h * (0.16 + drawer * 0.2), b.d * 0.39], p.metal, { name: 'copier-drawer-handle', metalness: 0.5 });
  }
  add([b.w * 0.94, b.h * 0.22, b.d * 0.88], [0, b.h * 0.66, 0], p.paint, { name: 'copier-scanner-housing' });
  add([b.w * 0.72, b.h * 0.018, b.d * 0.62], [0, b.h * 0.79, 0], p.glass, { name: 'copier-scanner-glass', opacity: 0.5, roughness: 0.08 });
  add([b.w * 0.76, b.h * 0.06, b.d * 0.66], [0, b.h * 0.84, -b.d * 0.03], p.paintDark, { rotation: [-0.08, 0, 0], name: 'copier-hinged-lid' });
  add([b.w * 0.55, b.h * 0.05, b.d * 0.3], [0, b.h * 0.58, b.d * 0.35], p.paintDark, { rotation: [-0.18, 0, 0], name: 'copier-output-tray' });
  add([b.w * 0.34, b.h * 0.07, b.d * 0.16], [b.w * 0.3, b.h * 0.75, b.d * 0.31], p.paintDark, { name: 'copier-control-panel' });
  for (let button = 0; button < 4; button += 1) add([b.w * 0.035, b.h * 0.018, b.d * 0.02], [b.w * (0.22 + button * 0.055), b.h * 0.79, b.d * 0.39], button === variant % 4 ? p.glow : p.light, { name: 'copier-control-button', emissive: button === variant % 4 ? p.glow : '#000000', emissiveIntensity: 0.35 });
}

function buildArchiveTrolley(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (const x of [-0.42, 0.42]) for (const z of [-0.34, 0.34]) add([b.w * 0.045, b.h * 0.84, b.d * 0.045], [x * b.w, b.h * 0.48, z * b.d], p.metal, { name: 'archive-trolley-frame-post', metalness: 0.55 });
  for (let shelf = 0; shelf < 3; shelf += 1) {
    const y = b.h * (0.24 + shelf * 0.27);
    add([b.w * 0.82, b.h * 0.045, b.d * 0.62], [0, y, 0], p.wood, { rotation: [shelf % 2 ? 0.04 : -0.04, 0, 0], name: 'archive-trolley-book-shelf' });
    for (let book = 0; book < 5; book += 1) add([b.w * 0.11, b.h * (0.1 + (book + variant) % 3 * 0.025), b.d * 0.3], [b.w * (-0.28 + book * 0.14), y + b.h * 0.075, 0], book % 2 ? p.accent : p.light, { rotation: [0, 0, (book - 2) * 0.025], name: 'archive-trolley-book' });
  }
  add([b.w * 0.74, b.h * 0.045, b.d * 0.045], [0, b.h * 0.95, -b.d * 0.35], p.metal, { name: 'archive-trolley-push-handle', metalness: 0.58 });
  for (const x of [-0.36, 0.36]) for (const z of [-0.3, 0.3]) add([b.w * 0.1, b.w * 0.05, b.w * 0.1], [x * b.w, b.h * 0.08, z * b.d], p.paintDark, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'archive-trolley-caster' });
}

function buildTicketGate(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.42, b.h * 0.82, b.d * 0.86], [-b.w * 0.23, b.h * 0.43, 0], p.metal, { name: 'ticket-gate-pedestal', metalness: 0.45 });
  add([b.w * 0.46, b.h * 0.1, b.d * 0.9], [-b.w * 0.23, b.h * 0.88, 0], p.paintDark, { name: 'ticket-gate-reader-deck' });
  add([b.w * 0.22, b.h * 0.025, b.d * 0.24], [-b.w * 0.23, b.h * 0.94, b.d * 0.12], p.glass, { name: 'ticket-gate-card-reader', opacity: 0.62, emissive: p.glow, emissiveIntensity: 0.22 });
  add([b.w * 0.56, b.h * 0.055, b.d * 0.08], [b.w * 0.17, b.h * 0.58, 0], p.metal, { rotation: [0, variant % 2 ? 0.1 : -0.1, 0], name: 'ticket-gate-swing-arm', metalness: 0.62 });
  add([b.w * 0.06, b.h * 0.5, b.d * 0.06], [b.w * 0.43, b.h * 0.35, 0], p.metal, { name: 'ticket-gate-arm-support', metalness: 0.55 });
  for (let arrow = -1; arrow <= 1; arrow += 1) add([b.w * 0.045, b.h * 0.025, b.d * 0.025], [-b.w * 0.23 + arrow * b.w * 0.06, b.h * 0.83, b.d * 0.45], p.glow, { name: 'ticket-gate-direction-light', emissive: p.glow, emissiveIntensity: 0.48 });
}

function buildDepartureBoard(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (const x of [-0.42, 0.42]) add([b.w * 0.045, b.h * 0.88, b.d * 0.08], [x * b.w, b.h * 0.48, 0], p.metal, { name: 'departure-board-support-post', metalness: 0.5 });
  add([b.w * 0.96, b.h * 0.7, b.d * 0.2], [0, b.h * 0.62, 0], p.paintDark, { name: 'departure-board-frame' });
  add([b.w * 0.88, b.h * 0.58, b.d * 0.025], [0, b.h * 0.62, b.d * 0.115], '#111719', { name: 'departure-board-black-display' });
  for (let row = 0; row < 6; row += 1) {
    const y = b.h * (0.4 + row * 0.085);
    add([b.w * 0.8, b.h * 0.008, b.d * 0.012], [0, y, b.d * 0.135], '#4b5559', { name: 'departure-board-row-divider' });
    for (let column = 0; column < 8; column += 1) add([b.w * 0.055, b.h * 0.035, b.d * 0.012], [b.w * (-0.31 + column * 0.09), y + b.h * 0.03, b.d * 0.145], column < 2 ? p.glow : p.light, { name: 'departure-board-split-flap-character', emissive: column < 2 ? p.glow : '#000000', emissiveIntensity: column < 2 ? 0.18 : 0 });
  }
  add([b.w * 0.98, b.h * 0.05, b.d * 0.32], [0, b.h * 0.08, 0], p.stone, { name: 'departure-board-floor-base' });
  void variant;
}

function buildRetailDisplay(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.84, b.h * 0.25, b.d * 0.8], [0, b.h * 0.15, 0], p.woodDark, { name: 'retail-island-storage-base' });
  for (let tier = 0; tier < 3; tier += 1) {
    const width = b.w * (0.9 - tier * 0.17);
    const depth = b.d * (0.86 - tier * 0.15);
    const y = b.h * (0.36 + tier * 0.23);
    add([width, b.h * 0.055, depth], [0, y, 0], tier % 2 ? p.accent : p.light, { name: 'retail-island-display-tier' });
    for (let product = -2; product <= 2; product += 1) add([b.w * 0.1, b.h * (0.1 + (product + variant + 2) % 3 * 0.035), b.d * 0.12], [product * width * 0.17, y + b.h * 0.075, 0], product % 2 ? p.paint : p.accent, { name: 'retail-island-boxed-product' });
  }
  add([b.w * 0.06, b.h * 0.72, b.d * 0.06], [0, b.h * 0.64, 0], p.metal, { name: 'retail-island-sign-post', metalness: 0.45 });
  add([b.w * 0.48, b.h * 0.2, b.d * 0.04], [0, b.h * 0.9, 0], p.accent, { name: 'retail-island-price-sign' });
}

function buildToolChest(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.9, b.h * 0.78, b.d * 0.82], [0, b.h * 0.45, 0], variant % 2 ? p.paint : p.accent, { name: 'tool-chest-steel-cabinet', metalness: 0.35 });
  for (let drawer = 0; drawer < 6; drawer += 1) {
    const y = b.h * (0.18 + drawer * 0.105);
    add([b.w * 0.8, b.h * 0.085, b.d * 0.025], [0, y, b.d * 0.43], drawer % 2 ? p.paint : p.accent, { name: 'tool-chest-drawer-front', metalness: 0.32 });
    add([b.w * 0.28, b.h * 0.018, b.d * 0.018], [0, y, b.d * 0.45], p.metal, { name: 'tool-chest-drawer-pull', metalness: 0.65 });
  }
  add([b.w * 0.96, b.h * 0.065, b.d * 0.9], [0, b.h * 0.88, 0], p.paintDark, { name: 'tool-chest-rubber-worktop' });
  add([b.w * 0.42, b.h * 0.045, b.d * 0.06], [b.w * 0.6, b.h * 0.7, 0], p.metal, { name: 'tool-chest-side-handle', metalness: 0.6 });
  for (const x of [-0.36, 0.36]) for (const z of [-0.32, 0.32]) add([b.w * 0.11, b.w * 0.055, b.w * 0.11], [x * b.w, b.h * 0.06, z * b.d], p.paintDark, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'tool-chest-caster' });
}

function buildDrumStack(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const drums: Array<[number, number, number]> = [[-0.27, 0.27, -0.17], [0.27, 0.27, -0.17], [-0.27, 0.27, 0.24], [0.27, 0.27, 0.24], [0, 0.78, 0.02]];
  for (let index = 0; index < drums.length; index += 1) {
    const [x, y, z] = drums[index]!;
    const color = index % 2 ? p.paint : p.accent;
    add([b.w * 0.29, b.h * 0.5, b.w * 0.29], [x * b.w, y * b.h, z * b.d], color, { shape: 'cylinder', name: 'industrial-steel-drum', metalness: 0.36 });
    for (const band of [-0.18, 0.18]) add([b.w * 0.3, b.h * 0.035, b.w * 0.3], [x * b.w, (y + band) * b.h, z * b.d], p.metal, { shape: 'cylinder', name: 'industrial-drum-reinforcing-band', metalness: 0.58 });
  }
  void variant;
}

function buildLuggageCart(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.9, b.h * 0.065, b.d * 0.82], [0, b.h * 0.11, 0], p.wood, { name: 'luggage-cart-carpeted-deck' });
  for (const side of [-1, 1]) add([b.w * 0.055, b.h * 0.78, b.d * 0.055], [side * b.w * 0.4, b.h * 0.5, 0], p.metal, { shape: 'cylinder', name: 'luggage-cart-brass-upright', metalness: 0.62 });
  add([b.w * 0.82, b.h * 0.055, b.d * 0.055], [0, b.h * 0.9, 0], p.metal, { shape: 'cylinder', name: 'luggage-cart-overhead-rail', metalness: 0.62 });
  const cases: Array<[number, number, number, number, number]> = [[-0.2, 0.28, 0, 0.34, 0.28], [0.2, 0.3, 0.08, 0.3, 0.34], [0.02, 0.57, -0.08, 0.42, 0.25]];
  for (let index = 0; index < cases.length; index += 1) {
    const [x, y, z, width, height] = cases[index]!;
    add([b.w * width, b.h * height, b.d * 0.34], [b.w * x, b.h * y, b.d * z], index % 2 ? p.accent : p.paint, { name: 'luggage-cart-suitcase' });
    add([b.w * width * 0.38, b.h * 0.04, b.d * 0.04], [b.w * x, b.h * (y + height * 0.56), b.d * z], p.paintDark, { name: 'luggage-cart-suitcase-handle' });
  }
  for (const x of [-0.34, 0.34]) for (const z of [-0.32, 0.32]) add([b.w * 0.12, b.w * 0.06, b.w * 0.12], [x * b.w, b.h * 0.05, z * b.d], p.paintDark, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'luggage-cart-caster' });
  void variant;
}

function buildRoomServiceCart(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.86, b.h * 0.06, b.d * 0.74], [0, b.h * 0.48, 0], p.wood, { name: 'room-service-serving-deck' });
  add([b.w * 0.78, b.h * 0.045, b.d * 0.66], [0, b.h * 0.2, 0], p.woodDark, { name: 'room-service-lower-shelf' });
  for (const x of [-0.38, 0.38]) for (const z of [-0.3, 0.3]) add([b.w * 0.045, b.h * 0.48, b.d * 0.045], [x * b.w, b.h * 0.27, z * b.d], p.metal, { name: 'room-service-cart-leg', metalness: 0.55 });
  add([b.w * 0.18, b.h * 0.17, b.d * 0.18], [0, b.h * 0.6, 0], p.light, { shape: 'cone', name: 'room-service-cloche-dome', metalness: 0.45 });
  add([b.w * 0.22, b.h * 0.025, b.d * 0.22], [0, b.h * 0.51, 0], p.metal, { shape: 'cylinder', name: 'room-service-dinner-plate', metalness: 0.32 });
  for (const side of [-1, 1]) add([b.w * 0.08, b.h * 0.12, b.d * 0.08], [side * b.w * 0.23, b.h * 0.57, 0], p.light, { shape: 'cylinder', name: 'room-service-drinking-glass', opacity: 0.58 });
  add([b.w * 0.055, b.h * 0.45, b.d * 0.055], [-b.w * 0.46, b.h * 0.58, 0], p.metal, { name: 'room-service-push-upright', metalness: 0.55 });
  add([b.w * 0.28, b.h * 0.045, b.d * 0.045], [-b.w * 0.36, b.h * 0.8, 0], p.metal, { name: 'room-service-push-handle', metalness: 0.55 });
  for (const x of [-0.34, 0.34]) for (const z of [-0.28, 0.28]) add([b.w * 0.1, b.w * 0.05, b.w * 0.1], [x * b.w, b.h * 0.07, z * b.d], p.paintDark, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'room-service-caster' });
  void variant;
}

function buildTrafficCones(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const cones: Array<[number, number]> = [[-0.25, 0.13], [0.22, 0.2], [0, -0.2]];
  for (let index = 0; index < cones.length; index += 1) {
    const [x, z] = cones[index]!;
    const y = b.h * (0.3 + index * 0.055);
    add([b.w * 0.31, b.h * 0.055, b.d * 0.31], [x * b.w, b.h * 0.04, z * b.d], p.paintDark, { name: 'traffic-cone-square-rubber-base' });
    add([b.w * 0.2, b.h * (0.55 + index * 0.06), b.d * 0.2], [x * b.w, y, z * b.d], '#dd602f', { shape: 'cone', name: 'traffic-cone-tapered-body' });
    add([b.w * 0.18, b.h * 0.055, b.d * 0.18], [x * b.w, b.h * (0.36 + index * 0.08), z * b.d], p.light, { shape: 'cylinder', name: 'traffic-cone-reflective-band', metalness: 0.16 });
  }
  void variant;
}

function buildExerciseBike(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.82, b.h * 0.055, b.d * 0.12], [0, b.h * 0.04, 0], p.paintDark, { name: 'exercise-bike-floor-base' });
  addBeamBetween(root, [-b.w * 0.28, b.h * 0.08, 0], [b.w * 0.1, b.h * 0.6, 0], b.w * 0.06, p.metal, 'exercise-bike-main-frame');
  addBeamBetween(root, [b.w * 0.1, b.h * 0.6, 0], [b.w * 0.28, b.h * 0.9, 0], b.w * 0.05, p.metal, 'exercise-bike-console-frame');
  add([b.w * 0.48, b.w * 0.07, b.w * 0.48], [-b.w * 0.14, b.h * 0.34, 0], p.paint, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'exercise-bike-flywheel', metalness: 0.34 });
  add([b.w * 0.28, b.h * 0.07, b.d * 0.28], [b.w * 0.05, b.h * 0.67, 0], p.paintDark, { name: 'exercise-bike-saddle' });
  add([b.w * 0.04, b.h * 0.27, b.d * 0.04], [b.w * 0.05, b.h * 0.53, 0], p.metal, { name: 'exercise-bike-seat-post', metalness: 0.58 });
  add([b.w * 0.48, b.h * 0.045, b.d * 0.045], [b.w * 0.28, b.h * 0.92, 0], p.paintDark, { name: 'exercise-bike-handlebar' });
  add([b.w * 0.18, b.h * 0.14, b.d * 0.08], [b.w * 0.28, b.h * 0.82, 0], p.glass, { name: 'exercise-bike-console', opacity: 0.72, emissive: p.glow, emissiveIntensity: 0.14 });
  add([b.w * 0.38, b.h * 0.025, b.d * 0.05], [-b.w * 0.14, b.h * 0.34, 0], p.metal, { rotation: [0, 0, variant % 2 ? 0.25 : -0.25], name: 'exercise-bike-pedal-crank', metalness: 0.62 });
}

function buildPoolLadder(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (const side of [-1, 1]) {
    add([b.w * 0.055, b.h * 0.78, b.d * 0.055], [side * b.w * 0.31, b.h * 0.43, 0], p.metal, { shape: 'cylinder', name: 'pool-ladder-stainless-rail', metalness: 0.72 });
    addBeamBetween(root, [side * b.w * 0.31, b.h * 0.78, 0], [side * b.w * 0.43, b.h * 0.94, -b.d * 0.18], b.w * 0.055, p.metal, 'pool-ladder-curved-grab-section');
    add([b.w * 0.13, b.h * 0.05, b.d * 0.2], [side * b.w * 0.43, b.h * 0.04, -b.d * 0.18], p.metal, { shape: 'cylinder', name: 'pool-ladder-deck-anchor', metalness: 0.7 });
  }
  for (let rung = 0; rung < 5; rung += 1) add([b.w * 0.62, b.h * 0.045, b.d * 0.13], [0, b.h * (0.18 + rung * 0.13), 0], p.metal, { name: 'pool-ladder-nonslip-rung', metalness: 0.65 });
  void variant;
}

function buildUtilityShelf(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (const x of [-0.44, 0.44]) for (const z of [-0.38, 0.38]) add([b.w * 0.035, b.h * 0.94, b.d * 0.035], [x * b.w, b.h * 0.5, z * b.d], p.metal, { name: 'utility-shelf-steel-upright', metalness: 0.52 });
  for (let shelf = 0; shelf < 4; shelf += 1) {
    const y = b.h * (0.13 + shelf * 0.27);
    add([b.w * 0.92, b.h * 0.04, b.d * 0.82], [0, y, 0], p.metal, { name: 'utility-shelf-deck', metalness: 0.42 });
    for (let item = -2; item <= 2; item += 1) add([b.w * 0.13, b.h * (0.09 + (item + shelf + variant + 2) % 3 * 0.03), b.d * 0.22], [item * b.w * 0.16, y + b.h * 0.075, 0], item % 2 ? p.paint : p.accent, { name: 'utility-shelf-labeled-supply' });
  }
}

function buildBreakerPanel(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.88, b.h * 0.82, b.d * 0.68], [0, b.h * 0.5, 0], p.metal, { name: 'breaker-panel-steel-box', metalness: 0.46 });
  add([b.w * 0.76, b.h * 0.7, b.d * 0.025], [0, b.h * 0.51, b.d * 0.36], p.paintDark, { name: 'breaker-panel-open-interior' });
  for (let row = 0; row < 7; row += 1) for (const side of [-1, 1]) {
    const active = (row + side + variant) % 4 === 0;
    add([b.w * 0.2, b.h * 0.06, b.d * 0.05], [side * b.w * 0.2, b.h * (0.24 + row * 0.085), b.d * 0.39], active ? p.accent : p.light, { name: 'breaker-panel-toggle' });
    add([b.w * 0.08, b.h * 0.018, b.d * 0.012], [side * b.w * 0.34, b.h * (0.24 + row * 0.085), b.d * 0.42], active ? p.glow : '#5d6768', { name: 'breaker-panel-circuit-label', emissive: active ? p.glow : '#000000', emissiveIntensity: active ? 0.25 : 0 });
  }
  for (const x of [-0.25, 0, 0.25]) add([b.w * 0.08, b.h * 0.2, b.w * 0.08], [x * b.w, b.h * 0.94, 0], p.metal, { shape: 'cylinder', name: 'breaker-panel-conduit', metalness: 0.52 });
}

function buildBoiler(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.72, b.h * 0.82, b.d * 0.72], [0, b.h * 0.47, 0], p.paint, { shape: 'cylinder', name: 'boiler-pressure-vessel', metalness: 0.38 });
  for (const y of [0.17, 0.48, 0.78]) add([b.w * 0.74, b.h * 0.035, b.d * 0.74], [0, b.h * y, 0], p.metal, { shape: 'cylinder', name: 'boiler-rolled-reinforcing-band', metalness: 0.6 });
  add([b.w * 0.42, b.h * 0.28, b.d * 0.04], [0, b.h * 0.34, b.d * 0.38], p.paintDark, { name: 'boiler-firebox-door' });
  add([b.w * 0.28, b.w * 0.04, b.w * 0.28], [0, b.h * 0.71, b.d * 0.4], p.light, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'boiler-pressure-gauge' });
  add([b.w * 0.02, b.h * 0.1, b.d * 0.02], [0, b.h * 0.71, b.d * 0.43], p.paintDark, { rotation: [0, 0, variant * 0.08 - 0.2], name: 'boiler-gauge-needle' });
  for (const side of [-1, 1]) add([b.w * 0.12, b.h * 0.72, b.w * 0.12], [side * b.w * 0.42, b.h * 0.52, 0], p.metal, { shape: 'cylinder', name: 'boiler-service-pipe', metalness: 0.58 });
  add([b.w * 0.25, b.h * 0.08, b.d * 0.4], [0, b.h * 0.04, 0], p.paintDark, { name: 'boiler-steel-foot' });
}

function buildPipeCluster(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const pipes = [-0.36, -0.18, 0.04, 0.26, 0.4];
  for (let index = 0; index < pipes.length; index += 1) {
    const x = pipes[index]! * b.w;
    const height = b.h * (0.7 + index % 3 * 0.11);
    add([b.w * (0.055 + index % 2 * 0.015), height, b.w * (0.055 + index % 2 * 0.015)], [x, height / 2, (index % 2 ? 0.14 : -0.12) * b.d], index % 2 ? p.metal : p.paint, { shape: 'cylinder', name: 'pipe-cluster-vertical-run', metalness: 0.55 });
    add([b.w * 0.16, b.w * 0.035, b.w * 0.16], [x, b.h * (0.42 + index % 3 * 0.14), (index % 2 ? 0.14 : -0.12) * b.d], p.accent, { shape: 'cylinder', name: 'pipe-cluster-valve-body', metalness: 0.52 });
  }
  for (const y of [0.24, 0.58, 0.86]) add([b.w * 0.9, b.h * 0.035, b.d * 0.09], [0, b.h * y, 0], p.paintDark, { name: 'pipe-cluster-wall-bracket' });
  add([b.w * 0.72, b.w * 0.08, b.w * 0.08], [0, b.h * 0.72, b.d * 0.22], p.metal, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'pipe-cluster-cross-main', metalness: 0.58 });
  void variant;
}

function buildSnackMachine(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.94, b.h * 0.96, b.d * 0.9], [0, b.h * 0.5, 0], p.paint, { name: 'snack-machine-cabinet', metalness: 0.2 });
  add([b.w * 0.68, b.h * 0.7, b.d * 0.025], [-b.w * 0.08, b.h * 0.62, b.d * 0.46], p.glass, { name: 'snack-machine-display-glass', opacity: 0.36, roughness: 0.08 });
  for (let row = 0; row < 4; row += 1) {
    const y = b.h * (0.42 + row * 0.14);
    add([b.w * 0.62, b.h * 0.025, b.d * 0.26], [-b.w * 0.08, y, b.d * 0.3], p.metal, { name: 'snack-machine-product-shelf', metalness: 0.38 });
    for (let item = -2; item <= 2; item += 1) add([b.w * 0.09, b.h * 0.09, b.d * 0.08], [-b.w * 0.08 + item * b.w * 0.11, y + b.h * 0.055, b.d * 0.43], (item + row + variant) % 2 ? p.accent : p.light, { name: 'snack-machine-product-bag' });
  }
  add([b.w * 0.18, b.h * 0.5, b.d * 0.04], [b.w * 0.36, b.h * 0.61, b.d * 0.47], p.paintDark, { name: 'snack-machine-payment-panel' });
  for (let key = 0; key < 8; key += 1) add([b.w * 0.035, b.h * 0.025, b.d * 0.018], [b.w * (0.32 + key % 2 * 0.08), b.h * (0.48 + Math.floor(key / 2) * 0.06), b.d * 0.5], key === variant ? p.glow : p.light, { name: 'snack-machine-selection-key', emissive: key === variant ? p.glow : '#000000', emissiveIntensity: 0.3 });
  add([b.w * 0.56, b.h * 0.1, b.d * 0.08], [-b.w * 0.08, b.h * 0.16, b.d * 0.46], p.paintDark, { name: 'snack-machine-delivery-bin' });
}

function buildLuggagePile(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const cases: Array<[number, number, number, number, number, number]> = [
    [-0.27, 0.2, 0.14, 0.45, 0.34, -0.08],
    [0.22, 0.23, -0.1, 0.38, 0.4, 0.1],
    [-0.06, 0.56, -0.08, 0.5, 0.29, -0.04],
    [0.28, 0.65, 0.2, 0.28, 0.46, 0.13],
    [-0.27, 0.72, 0.02, 0.3, 0.36, -0.1],
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const [x, y, z, width, height, angle] = cases[index]!;
    add([b.w * width, b.h * height, b.d * 0.42], [b.w * x, b.h * y, b.d * z], index % 2 ? p.accent : p.paint, { rotation: [0, angle + variant * 0.008, 0], name: 'luggage-pile-suitcase' });
    add([b.w * width * 0.34, b.h * 0.035, b.d * 0.04], [b.w * x, b.h * (y + height * 0.55), b.d * z], p.paintDark, { rotation: [0, angle, 0], name: 'luggage-pile-case-handle' });
    for (const side of [-1, 1]) add([b.w * 0.025, b.h * height * 0.82, b.d * 0.025], [b.w * (x + side * width * 0.28), b.h * y, b.d * (z + 0.215)], p.metal, { rotation: [0, angle, 0], name: 'luggage-pile-case-corner' });
  }
}

function buildMarketStall(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (const x of [-0.43, 0.43]) for (const z of [-0.38, 0.38]) add([b.w * 0.045, b.h * 0.92, b.d * 0.045], [x * b.w, b.h * 0.48, z * b.d], p.woodDark, { name: 'market-stall-timber-post' });
  add([b.w * 0.94, b.h * 0.09, b.d * 0.86], [0, b.h * 0.94, 0], p.accent, { name: 'market-stall-striped-canopy' });
  for (let stripe = -4; stripe <= 4; stripe += 2) add([b.w * 0.09, b.h * 0.02, b.d * 0.88], [stripe * b.w * 0.1, b.h * 0.995, 0], p.light, { name: 'market-stall-canopy-stripe' });
  add([b.w * 0.9, b.h * 0.07, b.d * 0.7], [0, b.h * 0.48, b.d * 0.03], p.wood, { name: 'market-stall-counter' });
  add([b.w * 0.76, b.h * 0.045, b.d * 0.58], [0, b.h * 0.19, b.d * 0.03], p.woodDark, { name: 'market-stall-lower-shelf' });
  for (let crate = -2; crate <= 2; crate += 1) add([b.w * 0.15, b.h * 0.16, b.d * 0.24], [crate * b.w * 0.17, b.h * 0.59, b.d * 0.02], crate % 2 ? p.paint : p.accent, { name: 'market-stall-produce-crate' });
  add([b.w * 0.28, b.h * 0.2, b.d * 0.035], [0, b.h * 0.76, -b.d * 0.37], p.paintDark, { name: 'market-stall-price-board' });
  void variant;
}

function buildMaintenanceSink(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (const x of [-0.38, 0.38]) for (const z of [-0.32, 0.32]) add([b.w * 0.045, b.h * 0.5, b.d * 0.045], [x * b.w, b.h * 0.25, z * b.d], p.metal, { name: 'maintenance-sink-square-leg', metalness: 0.58 });
  add([b.w * 0.9, b.h * 0.08, b.d * 0.8], [0, b.h * 0.54, 0], p.metal, { name: 'maintenance-sink-rim', metalness: 0.45 });
  add([b.w * 0.76, b.h * 0.3, b.d * 0.64], [0, b.h * 0.42, 0], p.paintDark, { name: 'maintenance-sink-deep-basin' });
  add([b.w * 0.88, b.h * 0.32, b.d * 0.04], [0, b.h * 0.72, -b.d * 0.37], p.metal, { name: 'maintenance-sink-backsplash', metalness: 0.42 });
  add([b.w * 0.055, b.h * 0.3, b.w * 0.055], [0, b.h * 0.82, -b.d * 0.24], p.metal, { shape: 'cylinder', name: 'maintenance-sink-faucet-riser', metalness: 0.65 });
  addBeamBetween(root, [0, b.h * 0.95, -b.d * 0.24], [0, b.h * 0.86, b.d * 0.03], b.w * 0.045, p.metal, 'maintenance-sink-faucet-spout');
  for (const side of [-1, 1]) add([b.w * 0.11, b.h * 0.05, b.d * 0.11], [side * b.w * 0.18, b.h * 0.84, -b.d * 0.24], side < 0 ? '#4c7fa7' : '#a75048', { shape: 'cylinder', name: 'maintenance-sink-faucet-handle' });
  void variant;
}

function buildRubblePile(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (let piece = 0; piece < 18; piece += 1) {
    const angle = piece * 2.399 + variant * 0.17;
    const radius = Math.sqrt(piece / 18) * b.w * 0.38;
    const width = b.w * (0.1 + piece % 4 * 0.035);
    const height = b.h * (0.09 + piece % 5 * 0.035);
    add([width, height, b.d * (0.11 + piece % 3 * 0.045)], [Math.cos(angle) * radius, height * 0.5 + b.h * (piece % 3) * 0.04, Math.sin(angle) * b.d * 0.34], piece % 3 ? p.stone : shifted(p.stone, -0.12), { rotation: [(piece % 3 - 1) * 0.18, angle, (piece % 4 - 1.5) * 0.12], name: 'rubble-pile-broken-masonry' });
  }
  for (let rod = 0; rod < 4; rod += 1) add([b.w * 0.025, b.h * 0.62, b.w * 0.025], [(rod - 1.5) * b.w * 0.15, b.h * 0.33, (rod % 2 ? -0.15 : 0.16) * b.d], p.metal, { shape: 'cylinder', rotation: [0.25, 0, (rod - 1.5) * 0.18], name: 'rubble-pile-exposed-rebar', metalness: 0.62 });
}

function buildFireBarrel(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.7, b.h * 0.58, b.d * 0.7], [0, b.h * 0.31, 0], p.paintDark, { shape: 'cylinder', name: 'fire-barrel-steel-drum', metalness: 0.38 });
  for (const y of [0.12, 0.34, 0.56]) add([b.w * 0.72, b.h * 0.03, b.d * 0.72], [0, b.h * y, 0], p.metal, { shape: 'cylinder', name: 'fire-barrel-rolled-band', metalness: 0.52 });
  add([b.w * 0.68, b.w * 0.68, b.w * 0.055], [0, b.h * 0.61, 0], p.metal, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'fire-barrel-open-rim', metalness: 0.58 });
  for (const angle of [-0.65, 0.65]) add([b.w * 0.48, b.h * 0.07, b.d * 0.07], [0, b.h * 0.66, 0], p.woodDark, { rotation: [0, angle, 0.15], name: 'fire-barrel-charred-log' });
  for (let flame = 0; flame < 7; flame += 1) {
    const angle = flame / 7 * Math.PI * 2;
    add([b.w * 0.12, b.h * (0.22 + flame % 3 * 0.08), b.d * 0.12], [Math.cos(angle) * b.w * 0.18, b.h * (0.73 + flame % 2 * 0.05), Math.sin(angle) * b.d * 0.18], flame % 2 ? '#ffb33f' : '#e75b27', { shape: 'cone', rotation: [0, 0, Math.cos(angle) * 0.12], name: 'fire-barrel-flame', emissive: flame % 2 ? '#ffb33f' : '#e75b27', emissiveIntensity: 0.7 });
  }
  void variant;
}

function buildBrokenColumn(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.82, b.h * 0.1, b.d * 0.82], [0, b.h * 0.05, 0], p.stone, { shape: 'cylinder', name: 'broken-column-stepped-base' });
  add([b.w * 0.58, b.h * 0.7, b.d * 0.58], [0, b.h * 0.43, 0], shifted(p.stone, 0.05), { shape: 'cylinder', name: 'broken-column-fluted-shaft' });
  for (let flute = 0; flute < 8; flute += 1) {
    const angle = flute / 8 * Math.PI * 2;
    add([b.w * 0.055, b.h * 0.62, b.d * 0.055], [Math.cos(angle) * b.w * 0.28, b.h * 0.43, Math.sin(angle) * b.d * 0.28], p.stone, { shape: 'cylinder', name: 'broken-column-raised-flute' });
  }
  for (let shard = 0; shard < 5; shard += 1) {
    const angle = shard / 5 * Math.PI * 2 + variant * 0.08;
    add([b.w * 0.18, b.h * (0.16 + shard % 2 * 0.08), b.d * 0.16], [Math.cos(angle) * b.w * 0.18, b.h * (0.82 + shard % 2 * 0.03), Math.sin(angle) * b.d * 0.18], p.stone, { shape: 'cone', rotation: [0, angle, Math.PI], name: 'broken-column-jagged-break' });
  }
  for (let debris = 0; debris < 5; debris += 1) add([b.w * 0.14, b.h * 0.09, b.d * 0.13], [b.w * (-0.36 + debris * 0.18), b.h * 0.05, b.d * (debris % 2 ? 0.3 : -0.28)], p.stone, { rotation: [0, debris * 0.4, debris * 0.08], name: 'broken-column-fallen-fragment' });
}

function buildCollapsedBeam(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.9, b.h * 0.16, b.d * 0.22], [0, b.h * 0.34, 0], p.metal, { rotation: [0, 0.18, -0.16], name: 'collapsed-structural-i-beam', metalness: 0.58 });
  add([b.w * 0.86, b.h * 0.05, b.d * 0.38], [0, b.h * 0.42, 0], p.metal, { rotation: [0, 0.18, -0.16], name: 'collapsed-beam-top-flange', metalness: 0.58 });
  add([b.w * 0.86, b.h * 0.05, b.d * 0.38], [0, b.h * 0.25, 0], p.metal, { rotation: [0, 0.18, -0.16], name: 'collapsed-beam-bottom-flange', metalness: 0.58 });
  add([b.w * 0.64, b.h * 0.12, b.d * 0.18], [-b.w * 0.08, b.h * 0.56, b.d * 0.16], p.woodDark, { rotation: [0, -0.45, 0.24], name: 'collapsed-crossed-timber' });
  for (let debris = 0; debris < 10; debris += 1) add([b.w * (0.08 + debris % 3 * 0.035), b.h * (0.07 + debris % 2 * 0.04), b.d * 0.13], [b.w * (-0.38 + debris * 0.085), b.h * (0.05 + debris % 3 * 0.045), b.d * (debris % 2 ? 0.28 : -0.25)], debris % 3 ? p.stone : p.wood, { rotation: [debris * 0.06, debris * 0.43, -debris * 0.04], name: 'collapsed-beam-rubble' });
  void variant;
}

function buildWoodenBarricade(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (const side of [-1, 1]) {
    addBeamBetween(root, [side * b.w * 0.34, 0, -b.d * 0.36], [side * b.w * 0.34, b.h * 0.72, 0], b.w * 0.045, p.woodDark, 'barricade-a-frame-leg');
    addBeamBetween(root, [side * b.w * 0.34, 0, b.d * 0.36], [side * b.w * 0.34, b.h * 0.72, 0], b.w * 0.045, p.woodDark, 'barricade-a-frame-leg');
  }
  for (let board = 0; board < 2; board += 1) {
    const y = b.h * (0.48 + board * 0.25);
    add([b.w * 0.92, b.h * 0.18, b.d * 0.08], [0, y, 0], board % 2 ? p.wood : shifted(p.wood, 0.06), { rotation: [0, 0, (variant - 3.5) * 0.007], name: 'barricade-cross-board' });
    for (let stripe = -3; stripe <= 3; stripe += 2) add([b.w * 0.11, b.h * 0.16, b.d * 0.018], [stripe * b.w * 0.12, y, b.d * 0.05], p.light, { rotation: [0, 0, -0.38], name: 'barricade-warning-stripe' });
  }
}

function buildAltar(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.96, b.h * 0.14, b.d * 0.9], [0, b.h * 0.07, 0], p.stone, { name: 'altar-lower-step' });
  add([b.w * 0.82, b.h * 0.14, b.d * 0.76], [0, b.h * 0.2, 0], shifted(p.stone, 0.05), { name: 'altar-upper-step' });
  for (const side of [-1, 1]) add([b.w * 0.18, b.h * 0.46, b.d * 0.55], [side * b.w * 0.3, b.h * 0.48, 0], p.stone, { name: 'altar-carved-support' });
  add([b.w * 0.9, b.h * 0.1, b.d * 0.78], [0, b.h * 0.74, 0], p.light, { name: 'altar-table-slab' });
  add([b.w * 0.34, b.h * 0.5, b.d * 0.025], [0, b.h * 0.52, b.d * 0.4], p.accent, { name: 'altar-front-cloth' });
  add([b.w * 0.32, b.h * 0.045, b.d * 0.24], [0, b.h * 0.81, 0], p.woodDark, { rotation: [0.12, 0, 0], name: 'altar-open-book' });
  for (const side of [-1, 1]) {
    add([b.w * 0.055, b.h * 0.24, b.d * 0.055], [side * b.w * 0.3, b.h * 0.9, 0], p.light, { shape: 'cylinder', name: 'altar-candle' });
    add([b.w * 0.035, b.h * 0.09, b.d * 0.035], [side * b.w * 0.3, b.h * 1.04, 0], '#f3b844', { shape: 'cone', name: 'altar-candle-flame', emissive: '#f3b844', emissiveIntensity: 0.55 });
  }
  void variant;
}

function buildWarehouseCrate(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.88, b.h * 0.88, b.d * 0.88], [0, b.h * 0.5, 0], p.wood, { name: 'shipping-crate-boarded-body' });
  for (const side of [-1, 1]) {
    add([b.w * 0.09, b.h * 0.94, b.d * 0.09], [side * b.w * 0.44, b.h * 0.5, b.d * 0.44], p.woodDark, { name: 'shipping-crate-corner-cleat' });
    add([b.w * 0.09, b.h * 0.94, b.d * 0.09], [side * b.w * 0.44, b.h * 0.5, -b.d * 0.44], p.woodDark, { name: 'shipping-crate-corner-cleat' });
    add([b.w * 0.9, b.h * 0.09, b.d * 0.09], [0, side > 0 ? b.h * 0.92 : b.h * 0.08, side * b.d * 0.445], p.woodDark, { name: 'shipping-crate-edge-cleat' });
  }
  add([b.w * 0.08, b.h * 0.92, b.d * 0.06], [0, b.h * 0.5, b.d * 0.46], p.woodDark, { rotation: [0, 0, 0.74], name: 'shipping-crate-diagonal-brace' });
  add([b.w * 0.08, b.h * 0.92, b.d * 0.06], [0, b.h * 0.5, b.d * 0.465], p.woodDark, { rotation: [0, 0, -0.74], name: 'shipping-crate-diagonal-brace' });
  add([b.w * 0.3, b.h * 0.18, b.d * 0.02], [b.w * 0.2, b.h * 0.72, b.d * 0.5], p.light, { name: 'shipping-crate-stenciled-label' });
  void variant;
}

function buildGenerator(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.88, b.h * 0.07, b.d * 0.78], [0, b.h * 0.08, 0], p.paintDark, { name: 'generator-tubular-chassis' });
  for (const x of [-0.4, 0.4]) for (const z of [-0.34, 0.34]) add([b.w * 0.04, b.h * 0.68, b.d * 0.04], [x * b.w, b.h * 0.4, z * b.d], p.metal, { name: 'generator-protective-frame', metalness: 0.58 });
  add([b.w * 0.52, b.h * 0.38, b.d * 0.52], [0, b.h * 0.35, 0], p.paintDark, { name: 'generator-engine-block', metalness: 0.35 });
  for (let fin = -3; fin <= 3; fin += 1) add([b.w * 0.34, b.h * 0.025, b.d * 0.55], [0, b.h * (0.29 + fin * 0.035), 0], p.metal, { name: 'generator-engine-cooling-fin', metalness: 0.5 });
  add([b.w * 0.58, b.h * 0.18, b.d * 0.56], [0, b.h * 0.69, 0], p.accent, { name: 'generator-fuel-tank' });
  add([b.w * 0.28, b.h * 0.26, b.d * 0.04], [b.w * 0.27, b.h * 0.42, b.d * 0.39], p.paint, { name: 'generator-control-panel' });
  for (let socket = 0; socket < 3; socket += 1) add([b.w * 0.055, b.w * 0.025, b.w * 0.055], [b.w * (0.19 + socket * 0.08), b.h * 0.42, b.d * 0.42], socket === variant % 3 ? p.glow : p.paintDark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'generator-power-socket', emissive: socket === variant % 3 ? p.glow : '#000000', emissiveIntensity: 0.22 });
  for (const side of [-1, 1]) add([b.w * 0.18, b.w * 0.08, b.w * 0.18], [side * b.w * 0.36, b.h * 0.09, b.d * 0.32], p.paintDark, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'generator-transport-wheel' });
  add([b.w * 0.1, b.h * 0.42, b.w * 0.1], [-b.w * 0.22, b.h * 0.63, -b.d * 0.22], p.metal, { shape: 'cylinder', name: 'generator-exhaust-stack', metalness: 0.6 });
}

function buildTelescope(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.2, b.h * 0.18, b.d * 0.2], [0, b.h * 0.5, 0], p.metal, { shape: 'cylinder', name: 'telescope-equatorial-mount', metalness: 0.62 });
  for (const side of [-1, 0, 1]) addBeamBetween(root, [0, b.h * 0.48, 0], [side * b.w * 0.34, 0, (side === 0 ? -0.32 : 0.24) * b.d], b.w * 0.045, p.metal, 'telescope-tripod-leg');
  add([b.w * 0.22, b.d * 0.72, b.w * 0.22], [0, b.h * 0.75, 0], p.paint, { shape: 'cylinder', rotation: [Math.PI / 2 - 0.18, 0, 0], name: 'telescope-optical-tube' });
  add([b.w * 0.25, b.d * 0.05, b.w * 0.25], [0, b.h * 0.81, b.d * 0.35], p.glass, { shape: 'cylinder', rotation: [Math.PI / 2 - 0.18, 0, 0], name: 'telescope-objective-lens', opacity: 0.58, emissive: p.glow, emissiveIntensity: 0.08 });
  add([b.w * 0.11, b.d * 0.12, b.w * 0.11], [0, b.h * 0.68, -b.d * 0.39], p.paintDark, { shape: 'cylinder', rotation: [Math.PI / 2 - 0.18, 0, 0], name: 'telescope-eyepiece' });
  add([b.w * 0.3, b.w * 0.05, b.w * 0.3], [b.w * 0.18, b.h * 0.6, 0], p.metal, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'telescope-declination-wheel', metalness: 0.62 });
  void variant;
}

function buildWasher(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.94, b.h * 0.94, b.d * 0.9], [0, b.h * 0.5, 0], p.light, { name: 'washer-enamel-cabinet', metalness: 0.16 });
  add([b.w * 0.72, b.w * 0.07, b.w * 0.72], [0, b.h * 0.49, b.d * 0.46], p.paintDark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'washer-door-gasket' });
  add([b.w * 0.58, b.w * 0.035, b.w * 0.58], [0, b.h * 0.49, b.d * 0.5], p.glass, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'washer-door-glass', opacity: 0.52, roughness: 0.08 });
  add([b.w * 0.86, b.h * 0.18, b.d * 0.04], [0, b.h * 0.84, b.d * 0.46], p.paint, { name: 'washer-control-fascia' });
  add([b.w * 0.18, b.w * 0.05, b.w * 0.18], [-b.w * 0.27, b.h * 0.84, b.d * 0.5], p.metal, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'washer-program-dial', metalness: 0.45 });
  for (let button = 0; button < 4; button += 1) add([b.w * 0.055, b.h * 0.035, b.d * 0.025], [b.w * (0.07 + button * 0.1), b.h * 0.84, b.d * 0.5], button === variant % 4 ? p.glow : p.paintDark, { name: 'washer-control-button', emissive: button === variant % 4 ? p.glow : '#000000', emissiveIntensity: 0.3 });
}

function buildMedicalCart(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.78, b.h * 0.56, b.d * 0.7], [0, b.h * 0.43, 0], p.light, { name: 'medical-cart-drawer-cabinet' });
  for (let drawer = 0; drawer < 4; drawer += 1) {
    const y = b.h * (0.28 + drawer * 0.11);
    add([b.w * 0.7, b.h * 0.08, b.d * 0.025], [0, y, b.d * 0.36], drawer === variant % 4 ? p.accent : p.paint, { name: 'medical-cart-drawer-front' });
    add([b.w * 0.18, b.h * 0.016, b.d * 0.015], [0, y, b.d * 0.38], p.metal, { name: 'medical-cart-drawer-pull', metalness: 0.5 });
  }
  add([b.w * 0.9, b.h * 0.055, b.d * 0.82], [0, b.h * 0.75, 0], p.metal, { name: 'medical-cart-instrument-tray', metalness: 0.4 });
  add([b.w * 0.045, b.h * 0.43, b.d * 0.045], [-b.w * 0.38, b.h * 0.92, 0], p.metal, { shape: 'cylinder', name: 'medical-cart-iv-pole', metalness: 0.58 });
  add([b.w * 0.3, b.h * 0.035, b.d * 0.035], [-b.w * 0.25, b.h * 1.1, 0], p.metal, { name: 'medical-cart-iv-hook', metalness: 0.58 });
  for (let bottle = 0; bottle < 3; bottle += 1) add([b.w * 0.07, b.h * (0.1 + bottle * 0.025), b.d * 0.07], [b.w * (0.12 + bottle * 0.12), b.h * 0.84, 0], bottle % 2 ? p.glass : p.accent, { shape: 'cylinder', name: 'medical-cart-supply-bottle', opacity: bottle % 2 ? 0.68 : 1 });
  for (const x of [-0.32, 0.32]) for (const z of [-0.27, 0.27]) add([b.w * 0.1, b.w * 0.05, b.w * 0.1], [x * b.w, b.h * 0.07, z * b.d], p.paintDark, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'medical-cart-caster' });
}

function buildCheckout(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.9, b.h * 0.5, b.d * 0.75], [0, b.h * 0.28, 0], p.paint, { name: 'checkout-counter-cabinet' });
  add([b.w * 0.96, b.h * 0.055, b.d * 0.86], [0, b.h * 0.56, 0], p.light, { name: 'checkout-countertop' });
  add([b.w * 0.5, b.h * 0.035, b.d * 0.54], [-b.w * 0.18, b.h * 0.6, 0], p.paintDark, { name: 'checkout-conveyor-belt' });
  for (let slat = -3; slat <= 3; slat += 1) add([b.w * 0.018, b.h * 0.012, b.d * 0.48], [-b.w * 0.18 + slat * b.w * 0.07, b.h * 0.625, 0], p.metal, { name: 'checkout-conveyor-slat', metalness: 0.42 });
  add([b.w * 0.24, b.h * 0.3, b.d * 0.26], [b.w * 0.29, b.h * 0.74, -b.d * 0.12], p.paintDark, { name: 'checkout-register-body' });
  add([b.w * 0.19, b.h * 0.12, b.d * 0.025], [b.w * 0.29, b.h * 0.82, b.d * 0.025], p.glass, { name: 'checkout-register-display', opacity: 0.72, emissive: p.glow, emissiveIntensity: 0.18 });
  for (let key = 0; key < 9; key += 1) add([b.w * 0.025, b.h * 0.018, b.d * 0.02], [b.w * (0.23 + key % 3 * 0.055), b.h * (0.66 + Math.floor(key / 3) * 0.035), b.d * 0.035], key === variant ? p.glow : p.light, { name: 'checkout-register-key', emissive: key === variant ? p.glow : '#000000', emissiveIntensity: 0.25 });
  add([b.w * 0.3, b.h * 0.06, b.d * 0.35], [b.w * 0.31, b.h * 0.58, b.d * 0.22], p.metal, { rotation: [0, 0, -0.12], name: 'checkout-bagging-rack', metalness: 0.4 });
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
      roughness: options.roughness ?? 0.58,
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
  const paint = shifted(body, (variant - 3.5) * 0.018);
  const paintDark = new THREE.Color(paint).multiplyScalar(0.42).getStyle();
  return {
    paint,
    paintDark,
    accent: shifted(accent, (variant % 3 - 1) * 0.035),
    light: shifted('#dbe0da', variant * 0.006),
    metal: shifted('#7e8a91', variant * 0.008),
    glass: variant % 2 ? '#87b7c3' : '#a4c8cf',
    wood: shifted('#8b623e', variant * 0.012),
    woodDark: shifted('#4c3425', variant * 0.01),
    foliage: shifted('#477c48', variant * 0.014),
    soil: '#3f3023',
    stone: shifted('#85847d', variant * 0.009),
    water: variant % 2 ? '#55b7c8' : '#6bc3d1',
    glow: ['#78e4f2', '#f2c55f', '#83e090', '#ef8673'][variant % 4]!,
  };
}

function shifted(color: string, lightness: number): string {
  return new THREE.Color(color).offsetHSL(0, 0, lightness).getStyle();
}
