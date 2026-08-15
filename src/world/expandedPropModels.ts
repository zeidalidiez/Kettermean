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
