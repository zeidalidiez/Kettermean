import * as THREE from 'three';
import { hashString } from '../core/rng';
import { getModelQuality } from './modelQuality';

/**
 * Surface information is the detail source for the production model tier.
 *
 * The reference games do not get their readability from six-digit triangle
 * counts. They use modest silhouettes with small, carefully filtered textures
 * carrying cloth weave, wood grain, scratches, skin variation, and baked-like
 * surface relief. These neutral maps are shared and tinted by each part's base
 * color, so the whole procedural catalog can use the same bounded texture set.
 */

export type ModelSurface =
  | 'fabric'
  | 'wood'
  | 'painted-metal'
  | 'bare-metal'
  | 'plastic'
  | 'skin'
  | 'hair'
  | 'fur'
  | 'rubber'
  | 'ceramic'
  | 'glass'
  | 'paper'
  | 'foliage'
  | 'stone'
  | 'organic';

interface SurfaceMaps {
  color: THREE.DataTexture;
  normal: THREE.DataTexture;
  roughness: THREE.DataTexture;
}

interface ProductionMaterialContext {
  kind: string;
  variant: number;
  assetId?: string;
}

const mapsCache = new Map<string, SurfaceMaps>();
const materialCache = new Map<string, THREE.MeshStandardMaterial>();
const decalMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

const SURFACE_PROPERTIES: Record<ModelSurface, { roughness: number; metalness: number; normal: number }> = {
  fabric: { roughness: 0.88, metalness: 0, normal: 0.08 },
  wood: { roughness: 0.72, metalness: 0, normal: 0.1 },
  'painted-metal': { roughness: 0.5, metalness: 0.08, normal: 0.06 },
  'bare-metal': { roughness: 0.38, metalness: 0.58, normal: 0.07 },
  plastic: { roughness: 0.58, metalness: 0, normal: 0.04 },
  skin: { roughness: 0.78, metalness: 0, normal: 0.03 },
  hair: { roughness: 0.7, metalness: 0, normal: 0.08 },
  fur: { roughness: 0.9, metalness: 0, normal: 0.1 },
  rubber: { roughness: 0.92, metalness: 0, normal: 0.08 },
  ceramic: { roughness: 0.34, metalness: 0, normal: 0.02 },
  glass: { roughness: 0.12, metalness: 0.05, normal: 0.02 },
  paper: { roughness: 0.94, metalness: 0, normal: 0.05 },
  foliage: { roughness: 0.83, metalness: 0, normal: 0.11 },
  stone: { roughness: 0.96, metalness: 0, normal: 0.16 },
  organic: { roughness: 0.82, metalness: 0, normal: 0.09 },
};

/** Replace flat placeholder materials across every procedural model builder. */
export function applyProductionMaterials(
  model: THREE.Object3D,
  context: ProductionMaterialContext,
): void {
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object.userData.preserveMaterial === true) return;
    const originals = Array.isArray(object.material) ? object.material : [object.material];
    const replacements = originals.map((original) => {
      if (!(original instanceof THREE.MeshStandardMaterial)) return original;
      const surface = inferSurface(context.kind, object.name, original);
      const material = productionMaterial(surface, original, context);
      if (original.userData.cacheOwned !== true) original.dispose();
      return material;
    });
    object.material = Array.isArray(object.material) ? replacements : replacements[0]!;
  });
}

/** A face texture painted onto real head geometry, not a billboard character. */
export function faceDecalMaterial(
  kind: string,
  variant: number,
  accent: string,
): THREE.MeshStandardMaterial {
  const phenotype = hashString(`${kind}:phenotype`) % 8;
  const eyeFamily = hashString(`${kind}:eyes`) % 6;
  const key = `face:${getModelQuality()}:${phenotype}:${variant % 8}:${eyeFamily}:${colorBucket(accent)}`;
  const cached = decalMaterialCache.get(key);
  if (cached) return cached;

  const size = decalTextureSize();
  const pixels = new Uint8Array(size * size * 4);
  const sx = size / 128;
  const px = (value: number): number => Math.round(value * sx);
  const dark: Rgba = [35, 27, 25, 255];
  const brow: Rgba = phenotype % 3 === 0 ? [73, 48, 31, 242] : [42, 33, 30, 245];
  const irisColors: Rgba[] = [
    [68, 91, 103, 255], [89, 72, 46, 255], [50, 89, 70, 255],
    [104, 78, 53, 255], [57, 71, 100, 255], [91, 92, 62, 255],
  ];
  const iris = irisColors[eyeFamily]!;
  const eyeY = px(48 + (variant % 3 - 1) * 2);
  const eyeSpacing = px(23 + phenotype % 3);

  // Subtle painted planes around the nose and eyes reproduce the authored
  // shading that low-resolution character textures used to carry.
  drawEllipse(pixels, size, px(64), px(69), px(31), px(28), [108, 68, 58, 18]);
  for (const side of [-1, 1]) {
    const x = px(64) + side * eyeSpacing;
    drawEllipse(pixels, size, x, eyeY, px(14), px(7), [52, 39, 35, 185]);
    drawEllipse(pixels, size, x, eyeY, px(12), px(5), [225, 216, 195, 248]);
    drawEllipse(pixels, size, x + side * px(1), eyeY, px(4), px(5), iris);
    drawEllipse(pixels, size, x + side * px(1), eyeY, px(2), px(3), dark);
    setPixel(pixels, size, x, eyeY - px(2), [245, 241, 220, 220]);
    drawLine(
      pixels,
      size,
      x - px(13),
      eyeY - px(13),
      x + px(12),
      eyeY - px(15 + (variant % 2)),
      brow,
      Math.max(1, px(3)),
    );
  }

  const noseX = px(64 + (phenotype % 3 - 1) * 2);
  drawLine(pixels, size, noseX - px(2), px(55), noseX - px(4), px(78), [84, 51, 43, 125], Math.max(1, px(2)));
  drawLine(pixels, size, noseX - px(4), px(78), noseX + px(5), px(80), [74, 45, 40, 165], Math.max(1, px(2)));
  drawEllipse(pixels, size, noseX - px(4), px(80), px(2), px(1), [48, 35, 31, 170]);
  drawEllipse(pixels, size, noseX + px(5), px(80), px(2), px(1), [48, 35, 31, 170]);

  const mouthWidth = px(17 + (variant % 3) * 2);
  const mouthY = px(95 + (phenotype % 2));
  drawLine(pixels, size, px(64) - mouthWidth, mouthY, px(64) + mouthWidth, mouthY + px(variant % 2), [88, 43, 46, 225], Math.max(1, px(2)));
  drawLine(pixels, size, px(64) - px(10), mouthY + px(3), px(64) + px(10), mouthY + px(3), [116, 57, 58, 115], Math.max(1, px(1)));

  if (variant === 2 || variant === 6) {
    // One readable scar is intentional character information; it replaces the
    // previous rings of arbitrary face rivets and spots.
    drawLine(pixels, size, px(91), px(35), px(80), px(68), [98, 55, 51, 150], Math.max(1, px(2)));
    drawLine(pixels, size, px(86), px(46), px(94), px(49), [98, 55, 51, 115], Math.max(1, px(1)));
  }
  if (phenotype === 3 || phenotype === 6) {
    for (let index = 0; index < 14; index += 1) {
      const x = px(39 + hash2(index, phenotype) % 51);
      const y = px(67 + hash2(index, variant + 9) % 20);
      drawEllipse(pixels, size, x, y, Math.max(1, px(1)), Math.max(1, px(1)), [93, 57, 43, 130]);
    }
  }

  const map = dataTexture(pixels, size, true, `face:${key}`);
  // Raster helpers use ordinary top-left image coordinates; DataTexture's
  // default orientation would otherwise swap brows/mouth and garment pockets.
  map.flipY = true;
  map.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({
    map,
    color: '#ffffff',
    roughness: 0.76,
    metalness: 0,
    transparent: true,
    alphaTest: 0.04,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  markProductionMaterial(material);
  decalMaterialCache.set(key, material);
  return material;
}

/** Clothing construction painted as a single readable panel. */
export function garmentDecalMaterial(
  kind: string,
  variant: number,
  accent: string,
): THREE.MeshStandardMaterial {
  const role = roleClass(kind);
  const key = `garment:${getModelQuality()}:${role}:${variant % 4}:${colorBucket(accent)}`;
  const cached = decalMaterialCache.get(key);
  if (cached) return cached;
  const size = decalTextureSize();
  const pixels = new Uint8Array(size * size * 4);
  const sx = size / 128;
  const px = (value: number): number => Math.round(value * sx);
  const accentColor = new THREE.Color(accent);
  const accentHex = accentColor.getHex();
  const accentRgba: Rgba = [
    (accentHex >> 16) & 255,
    (accentHex >> 8) & 255,
    accentHex & 255,
    230,
  ];
  const seam: Rgba = [38, 41, 43, 125];

  if (role === 'medical' || role === 'science') {
    drawLine(pixels, size, px(64), px(18), px(64), px(116), seam, Math.max(1, px(2)));
    drawLine(pixels, size, px(30), px(22), px(55), px(47), seam, Math.max(1, px(2)));
    drawLine(pixels, size, px(98), px(22), px(73), px(47), seam, Math.max(1, px(2)));
    drawRect(pixels, size, px(75), px(51), px(22), px(14), [229, 233, 225, 215]);
    drawLine(pixels, size, px(86), px(53), px(86), px(63), accentRgba, Math.max(1, px(2)));
    drawLine(pixels, size, px(81), px(58), px(91), px(58), accentRgba, Math.max(1, px(2)));
  } else if (role === 'service' || role === 'food') {
    drawLine(pixels, size, px(38), px(20), px(29), px(114), seam, Math.max(1, px(2)));
    drawLine(pixels, size, px(90), px(20), px(99), px(114), seam, Math.max(1, px(2)));
    drawLine(pixels, size, px(29), px(66), px(99), px(66), seam, Math.max(1, px(2)));
    drawLine(pixels, size, px(45), px(79), px(83), px(79), seam, Math.max(1, px(2)));
    drawLine(pixels, size, px(45), px(79), px(45), px(108), seam, Math.max(1, px(2)));
    drawLine(pixels, size, px(83), px(79), px(83), px(108), seam, Math.max(1, px(2)));
    drawLine(pixels, size, px(45), px(108), px(83), px(108), seam, Math.max(1, px(2)));
    if (variant === 2 || variant === 3) {
      drawEllipse(pixels, size, px(72), px(49), px(5), px(3), [111, 58, 40, 58]);
      drawEllipse(pixels, size, px(55), px(93), px(3), px(5), [111, 58, 40, 42]);
    }
  } else if (role === 'trade' || role === 'security') {
    drawLine(pixels, size, px(31), px(20), px(31), px(116), seam, Math.max(1, px(2)));
    drawLine(pixels, size, px(97), px(20), px(97), px(116), seam, Math.max(1, px(2)));
    drawRect(pixels, size, px(23), px(67), px(24), px(27), [25, 29, 32, 120]);
    drawRect(pixels, size, px(81), px(67), px(24), px(27), [25, 29, 32, 120]);
    drawRect(pixels, size, px(72), px(43), px(20), px(12), accentRgba);
  } else {
    drawLine(pixels, size, px(64), px(16), px(64), px(116), seam, Math.max(1, px(2)));
    drawLine(pixels, size, px(50), px(40), px(64), px(62), accentRgba, Math.max(1, px(3)));
    drawLine(pixels, size, px(78), px(40), px(64), px(62), accentRgba, Math.max(1, px(3)));
    drawRect(pixels, size, px(77), px(70), px(24), px(18), [31, 34, 37, 95]);
  }

  const map = dataTexture(pixels, size, true, `garment:${key}`);
  map.flipY = true;
  map.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({
    map,
    color: '#ffffff',
    roughness: 0.86,
    metalness: 0,
    transparent: true,
    alphaTest: 0.03,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  markProductionMaterial(material);
  decalMaterialCache.set(key, material);
  return material;
}

export function clearProductionMaterialCache(): void {
  const materials = new Set<THREE.Material>([
    ...materialCache.values(),
    ...decalMaterialCache.values(),
  ]);
  for (const material of materials) material.dispose();
  const textures = new Set<THREE.Texture>();
  for (const maps of mapsCache.values()) {
    textures.add(maps.color);
    textures.add(maps.normal);
    textures.add(maps.roughness);
  }
  for (const material of decalMaterialCache.values()) {
    if (material.map) textures.add(material.map);
  }
  for (const texture of textures) texture.dispose();
  mapsCache.clear();
  materialCache.clear();
  decalMaterialCache.clear();
}

function productionMaterial(
  surface: ModelSurface,
  original: THREE.MeshStandardMaterial,
  context: ProductionMaterialContext,
): THREE.MeshStandardMaterial {
  const pattern = patternClass(context.kind, surface);
  const patternVariant = (hashString(`${context.kind}:${context.assetId ?? ''}`) + context.variant) % 4;
  const maps = surfaceMaps(surface, pattern, patternVariant);
  const properties = SURFACE_PROPERTIES[surface];
  const color = original.color.getHexString();
  const emissive = original.emissive.getHexString();
  const opacity = original.opacity;
  const key = [
    surface,
    pattern,
    patternVariant,
    color,
    emissive,
    original.emissiveIntensity.toFixed(2),
    opacity.toFixed(2),
    original.flatShading ? 1 : 0,
  ].join('|');
  const cached = materialCache.get(key);
  if (cached) return cached;

  const glass = surface === 'glass';
  const material = new THREE.MeshStandardMaterial({
    color: `#${color}`,
    map: glass ? null : maps.color,
    normalMap: glass ? null : maps.normal,
    normalScale: new THREE.Vector2(properties.normal, properties.normal),
    roughnessMap: glass ? null : maps.roughness,
    roughness: properties.roughness,
    metalness: properties.metalness,
    emissive: `#${emissive}`,
    emissiveIntensity: original.emissiveIntensity,
    transparent: original.transparent || opacity < 1,
    opacity,
    depthWrite: original.depthWrite,
    side: original.side,
    flatShading: original.flatShading,
    alphaTest: original.alphaTest,
  });
  markProductionMaterial(material);
  materialCache.set(key, material);
  return material;
}

function surfaceMaps(surface: ModelSurface, pattern: string, variant: number): SurfaceMaps {
  const size = surfaceTextureSize();
  const key = `${getModelQuality()}:${surface}:${pattern}:${variant}`;
  const cached = mapsCache.get(key);
  if (cached) return cached;

  const height = new Float32Array(size * size);
  const albedo = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const seed = hashString(key);
  const roughBase = Math.round(SURFACE_PROPERTIES[surface].roughness * 255);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const noise = random01(x, y, seed) - 0.5;
      const smooth = smoothNoise(x, y, seed);
      const sample = surfaceSample(surface, pattern, variant, x, y, size, noise, smooth);
      height[index] = sample.height;
      const offset = index * 4;
      albedo[offset] = sample.value;
      albedo[offset + 1] = sample.value;
      albedo[offset + 2] = sample.value;
      albedo[offset + 3] = 255;
      const rv = clampByte(roughBase + sample.roughness);
      roughness[offset] = rv;
      roughness[offset + 1] = rv;
      roughness[offset + 2] = rv;
      roughness[offset + 3] = 255;
    }
  }

  const normal = normalPixels(height, size, surface === 'stone' || surface === 'fur' ? 2.6 : 1.55);
  const maps: SurfaceMaps = {
    color: dataTexture(albedo, size, true, `${key}:color`),
    normal: dataTexture(normal, size, false, `${key}:normal`),
    roughness: dataTexture(roughness, size, false, `${key}:roughness`),
  };
  const repeat = surface === 'fabric' || surface === 'hair' ? 2 : surface === 'wood' || surface === 'stone' ? 1.5 : 1;
  for (const texture of [maps.color, maps.normal, maps.roughness]) texture.repeat.set(repeat, repeat);
  mapsCache.set(key, maps);
  return maps;
}

function surfaceSample(
  surface: ModelSurface,
  pattern: string,
  variant: number,
  x: number,
  y: number,
  size: number,
  noise: number,
  smooth: number,
): { value: number; height: number; roughness: number } {
  let value = 238;
  let height = noise * 0.1;
  let roughness = noise * 16;
  switch (surface) {
    case 'fabric': {
      const weave = ((x + variant) % 4 === 0 ? 1 : -0.25) + ((y + variant * 2) % 4 === 0 ? 1 : -0.25);
      value = clampByte(236 + weave * 3 + noise * 5);
      height = weave * 0.08 + noise * 0.035;
      roughness = weave * 5 + noise * 10;
      break;
    }
    case 'wood': {
      const grain = Math.sin(x * 0.22 + Math.sin(y * 0.055 + variant) * 2.4 + smooth * 2.2);
      const seam = (y + variant * 11) % Math.max(18, Math.round(size * 0.34)) < 1 ? -1 : 0;
      value = clampByte(232 + grain * 7 + seam * 14 + noise * 4);
      height = grain * 0.08 + seam * 0.16;
      roughness = grain * 8 + noise * 8;
      break;
    }
    case 'bare-metal': {
      const brush = Math.sin(y * 1.7 + variant) * 0.35;
      const scratch = random01(Math.floor(x / 9), y, variant * 191) > 0.965 ? -1 : 0;
      value = clampByte(238 + brush * 12 + scratch * 45 + noise * 7);
      height = brush * 0.08 + scratch * 0.22;
      roughness = scratch * 35 + noise * 12;
      break;
    }
    case 'painted-metal': {
      const chip = random01(Math.floor(x / 3), Math.floor(y / 3), variant * 877) > 0.985 ? -1 : 0;
      value = clampByte(239 + smooth * 6 + chip * 55 + noise * 4);
      height = smooth * 0.05 + chip * 0.3;
      roughness = chip * 35 + noise * 8;
      break;
    }
    case 'skin': {
      const freckle = random01(Math.floor(x / 2), Math.floor(y / 2), variant * 313) > 0.991 ? -1 : 0;
      value = clampByte(247 + smooth * 7 + freckle * 22);
      height = smooth * 0.05 + freckle * 0.08;
      roughness = smooth * 5 + freckle * 9;
      break;
    }
    case 'hair':
    case 'fur': {
      const direction = Math.sin((x + Math.sin(y * 0.09) * 4) * (surface === 'fur' ? 0.7 : 0.42) + variant);
      const marking = animalMark(pattern, x, y, size, variant);
      value = clampByte(235 + direction * 5 + marking + noise * 4);
      height = direction * 0.08 + noise * 0.04;
      roughness = direction * 6 + noise * 8;
      break;
    }
    case 'rubber': {
      const stipple = (x + y + variant) % 3 === 0 ? -1 : 0.2;
      value = clampByte(226 + stipple * 8 + noise * 12);
      height = stipple * 0.1 + noise * 0.08;
      roughness = stipple * 4 + noise * 12;
      break;
    }
    case 'paper': {
      const fiber = Math.sin(x * 0.8 + y * 0.13 + variant) + Math.sin(y * 1.1 - x * 0.08);
      value = clampByte(245 + fiber * 3 + noise * 5);
      height = fiber * 0.035 + noise * 0.03;
      roughness = fiber * 2 + noise * 7;
      break;
    }
    case 'foliage': {
      const vein = Math.abs((x - size / 2) + Math.sin(y * 0.15 + variant) * 3) < 1.2 ? 1 : 0;
      const sideVein = (Math.abs((x + y * 0.55 + variant * 7) % 19) < 1) ? 0.45 : 0;
      value = clampByte(231 + smooth * 13 - vein * 18 - sideVein * 9 + noise * 6);
      height = vein * 0.2 + sideVein * 0.08 + smooth * 0.04;
      roughness = smooth * 7 + noise * 6;
      break;
    }
    case 'stone': {
      const pit = random01(Math.floor(x / 4), Math.floor(y / 4), variant * 631) > 0.94 ? -1 : 0;
      value = clampByte(229 + smooth * 24 + pit * 35 + noise * 13);
      height = smooth * 0.38 + pit * 0.28 + noise * 0.1;
      roughness = smooth * 12 + noise * 18;
      break;
    }
    case 'organic': {
      const marking = animalMark(pattern, x, y, size, variant);
      value = clampByte(239 + smooth * 12 + marking + noise * 6);
      height = smooth * 0.13 + marking * 0.006 + noise * 0.04;
      roughness = smooth * 6 + noise * 8;
      break;
    }
    case 'ceramic':
      value = clampByte(246 + smooth * 3 + noise * 2);
      height = smooth * 0.015;
      roughness = smooth * 2;
      break;
    case 'glass':
      value = 255;
      height = 0;
      roughness = 0;
      break;
    default:
      value = clampByte(239 + noise * 8 + smooth * 3);
      height = noise * 0.04;
      roughness = noise * 7;
  }
  return { value, height, roughness };
}

function animalMark(pattern: string, x: number, y: number, size: number, variant: number): number {
  if (pattern === 'striped') {
    const band = Math.sin(y * 0.38 + Math.sin(x * 0.1 + variant) * 2.2 + variant);
    const brokenEdge = Math.sin(x * 0.17 - y * 0.025 + variant * 1.7) + Math.sin(x * 0.07 + y * 0.11);
    return band > 0.46 + brokenEdge * 0.13 ? -105 : 4;
  }
  if (pattern === 'spotted') {
    const cell = Math.max(9, Math.round(size / 8));
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    const ox = (hash2(cx, cy + variant) % cell) - cell / 2;
    const oy = (hash2(cy, cx + variant * 3) % cell) - cell / 2;
    const dx = (x % cell) - cell / 2 - ox * 0.35;
    const dy = (y % cell) - cell / 2 - oy * 0.35;
    return dx * dx + dy * dy < cell * cell * 0.08 ? -48 : 4;
  }
  if (pattern === 'banded') return (Math.floor(y / Math.max(5, size / 12)) + variant) % 3 === 0 ? -38 : 4;
  if (pattern === 'scaled') return ((x + Math.floor(y / 3) * 2) % 7 < 2) ? -16 : 5;
  return 0;
}

function inferSurface(
  kind: string,
  meshName: string,
  material: THREE.MeshStandardMaterial,
): ModelSurface {
  const text = `${kind} ${meshName}`.toLowerCase();
  if (material.opacity < 0.72 || /(glass|window|lens|water|tank|\beye\b|pupil)/.test(text)) return 'glass';
  if (/(nose|beak|hoof|claw|talon|horn|antler|trunk)/.test(text)) return 'organic';
  if (/(skin|head|face|hand|neck|ear|nose|cheek|jaw|muzzle)/.test(text) && !/(mechanical|mask|animal|creature)/.test(text)) return 'skin';
  if (/(hair|brow|beard|mustache)/.test(text)) return 'hair';
  if (/(fur|animal|creature|mane|tail|paw|hoof|feather|wing|shell|scale|fish|bird|deer|dog|cat|horse|rabbit)/.test(text)) {
    return /(shell|scale|fish|reptile|snake|turtle|crab|lobster)/.test(text) ? 'organic' : 'fur';
  }
  if (/(leaf|plant|fern|grass|moss|flower|bloom|vine|canopy|hedge|tree)/.test(text)) return 'foliage';
  if (/(paper|book|page|document|label|card|poster|clipboard|ticket|map)/.test(text)) return 'paper';
  if (/(fabric|cloth|shirt|vest|coat|robe|apron|sleeve|trouser|pants|skirt|dress|curtain|drape|linen|blanket|mattress|cushion|upholster|seat|sofa|armchair)/.test(text)) return 'fabric';
  if (/(rubber|tire|tyre|wheel|caster|sole|hose|grip)/.test(text)) return 'rubber';
  if (/(ceramic|porcelain|sink|basin|toilet|cup|mug|plate|bowl|tile)/.test(text)) return 'ceramic';
  if (material.metalness >= 0.52 || /(chrome|steel|blade|chain|hinge|screw|bolt|rail|pipe|wire|spring|metal)/.test(text)) return 'bare-metal';
  if (/(frame|panel|machine|appliance|cabinet|locker|terminal|kiosk|cart|rack|industrial|painted)/.test(text)) return 'painted-metal';
  if (/(wood|timber|desk|table|shelf|bookcase|wardrobe|crate|pallet|bench|chair|leg|carcass|drawer|door)/.test(text)) return 'wood';
  if (/(stone|concrete|brick|rubble|column|altar|rock|plinth)/.test(text)) return 'stone';
  return 'plastic';
}

function patternClass(kind: string, surface: ModelSurface): string {
  if (surface !== 'fur' && surface !== 'organic') return 'plain';
  const value = kind.toLowerCase();
  if (/(tiger|zebra|skunk|badger|raccoon|chipmunk|banded)/.test(value)) return 'striped';
  if (/(leopard|cheetah|giraffe|hyena|cow|deer|fawn|spotted)/.test(value)) return 'spotted';
  if (/(snake|fish|shark|ray|reptile|lizard|alligator|crocodile|turtle|armadillo|pangolin)/.test(value)) return 'scaled';
  if (/(bee|wasp|lemur|ring|band)/.test(value)) return 'banded';
  return 'plain';
}

function roleClass(kind: string): string {
  const value = kind.toLowerCase();
  if (/(doctor|nurse|surgeon|therap|pharmac|radiolog|patient|medical|clinic|veterinar|dietitian|nutrition)/.test(value)) return 'medical';
  if (/(lab|scient|research|chemist|biolog|botanist|zoolog|geolog|archaeolog|meteorolog|astronom|engineer)/.test(value)) return 'science';
  if (/(chef|cook|baker|butcher|barista|server|waiter|bartender|food|cashier|vendor)/.test(value)) return 'food';
  if (/(guard|security|police|firefighter|bailiff|crossing|conductor|pilot|driver|operator)/.test(value)) return 'security';
  if (/(janitor|maintenance|electrician|plumber|carpenter|mechanic|roofer|landscaper|groundskeeper|technician|worker)/.test(value)) return 'trade';
  if (/(clerk|reception|attendant|porter|concierge|housekeeper|librarian|teacher|guide)/.test(value)) return 'service';
  return 'professional';
}

function normalPixels(height: Float32Array, size: number, strength: number): Uint8Array {
  const pixels = new Uint8Array(size * size * 4);
  const sample = (x: number, y: number): number => height[((y + size) % size) * size + ((x + size) % size)] ?? 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (sample(x + 1, y) - sample(x - 1, y)) * strength;
      const dy = (sample(x, y + 1) - sample(x, y - 1)) * strength;
      const normal = new THREE.Vector3(-dx, -dy, 1).normalize();
      const offset = (y * size + x) * 4;
      pixels[offset] = clampByte((normal.x * 0.5 + 0.5) * 255);
      pixels[offset + 1] = clampByte((normal.y * 0.5 + 0.5) * 255);
      pixels[offset + 2] = clampByte((normal.z * 0.5 + 0.5) * 255);
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

function dataTexture(pixels: Uint8Array, size: number, color: boolean, name: string): THREE.DataTexture {
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.name = name;
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = getModelQuality() === 'ultra' ? 8 : getModelQuality() === 'high' ? 4 : 2;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  texture.userData.cacheOwned = true;
  texture.userData.persistentModelTexture = true;
  return texture;
}

function surfaceTextureSize(): number {
  switch (getModelQuality()) {
    case 'low': return 32;
    case 'medium': return 64;
    case 'ultra': return 256;
    default: return 128;
  }
}

function decalTextureSize(): number {
  return getModelQuality() === 'low' ? 64 : getModelQuality() === 'ultra' ? 256 : 128;
}

function markProductionMaterial(material: THREE.MeshStandardMaterial): void {
  material.userData.cacheOwned = true;
  material.userData.productionOwned = true;
}

function random01(x: number, y: number, seed: number): number {
  let value = Math.imul(x + 0x7ed55d16, 0x165667b1) ^ Math.imul(y + 0xd3a2646c, 0x27d4eb2d) ^ seed;
  value = Math.imul(value ^ (value >>> 15), 0x85ebca6b);
  value ^= value >>> 13;
  return (value >>> 0) / 4294967295;
}

function smoothNoise(x: number, y: number, seed: number): number {
  const cell = 8;
  const x0 = Math.floor(x / cell);
  const y0 = Math.floor(y / cell);
  const tx = (x % cell) / cell;
  const ty = (y % cell) / cell;
  const a = random01(x0, y0, seed) - 0.5;
  const b = random01(x0 + 1, y0, seed) - 0.5;
  const c = random01(x0, y0 + 1, seed) - 0.5;
  const d = random01(x0 + 1, y0 + 1, seed) - 0.5;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
}

type Rgba = [number, number, number, number];

function setPixel(pixels: Uint8Array, size: number, x: number, y: number, color: Rgba): void {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const offset = (Math.floor(y) * size + Math.floor(x)) * 4;
  const alpha = color[3] / 255;
  const inverse = 1 - alpha;
  pixels[offset] = clampByte(color[0] * alpha + (pixels[offset] ?? 0) * inverse);
  pixels[offset + 1] = clampByte(color[1] * alpha + (pixels[offset + 1] ?? 0) * inverse);
  pixels[offset + 2] = clampByte(color[2] * alpha + (pixels[offset + 2] ?? 0) * inverse);
  pixels[offset + 3] = clampByte(color[3] + (pixels[offset + 3] ?? 0) * inverse);
}

function drawRect(pixels: Uint8Array, size: number, x: number, y: number, w: number, h: number, color: Rgba): void {
  for (let iy = y; iy < y + h; iy += 1) for (let ix = x; ix < x + w; ix += 1) setPixel(pixels, size, ix, iy, color);
}

function drawEllipse(pixels: Uint8Array, size: number, cx: number, cy: number, rx: number, ry: number, color: Rgba): void {
  const safeRx = Math.max(1, rx);
  const safeRy = Math.max(1, ry);
  for (let y = Math.floor(cy - safeRy); y <= Math.ceil(cy + safeRy); y += 1) {
    for (let x = Math.floor(cx - safeRx); x <= Math.ceil(cx + safeRx); x += 1) {
      const dx = (x - cx) / safeRx;
      const dy = (y - cy) / safeRy;
      if (dx * dx + dy * dy <= 1) setPixel(pixels, size, x, y, color);
    }
  }
}

function drawLine(
  pixels: Uint8Array,
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: Rgba,
  thickness: number,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = Math.round(x0 + dx * t);
    const y = Math.round(y0 + dy * t);
    drawEllipse(pixels, size, x, y, Math.max(1, thickness / 2), Math.max(1, thickness / 2), color);
  }
}

function colorBucket(color: string): number {
  return hashString(color) % 8;
}

function hash2(a: number, b: number): number {
  let value = Math.imul(a + 31, 0x45d9f3b) ^ Math.imul(b + 17, 0x119de1f3);
  value ^= value >>> 16;
  return value >>> 0;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
