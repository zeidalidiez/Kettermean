import * as THREE from 'three';

export type SurfaceStyle =
  | 'carpet'
  | 'tile'
  | 'linoleum'
  | 'concrete'
  | 'wallpaper'
  | 'plaster'
  | 'metal'
  | 'wood'
  | 'waterless'
  | 'grass'
  | 'asphalt'
  | 'paving'
  | 'ceiling_tile';

const cache = new Map<string, THREE.MeshStandardMaterial>();
const texCache = new Map<string, THREE.CanvasTexture>();

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const c = new THREE.Color(hex);
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
}

function makeCanvas(size = 256): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function finishTex(canvas: HTMLCanvasElement, key: string): THREE.CanvasTexture {
  let tex = texCache.get(key);
  if (tex) return tex;
  tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  texCache.set(key, tex);
  return tex;
}

function drawNoise(
  ctx: CanvasRenderingContext2D,
  size: number,
  rnd: () => number,
  amount: number,
  tone: [number, number, number],
): void {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, (d[i] ?? 0) + n + (rnd() - 0.5) * 4));
    d[i + 1] = Math.max(0, Math.min(255, (d[i + 1] ?? 0) + n + (rnd() - 0.5) * 4));
    d[i + 2] = Math.max(0, Math.min(255, (d[i + 2] ?? 0) + n + (rnd() - 0.5) * 4));
    // slight tone pull
    d[i] = Math.max(0, Math.min(255, (d[i] ?? 0) * 0.92 + tone[0] * 0.08));
    d[i + 1] = Math.max(0, Math.min(255, (d[i + 1] ?? 0) * 0.92 + tone[1] * 0.08));
    d[i + 2] = Math.max(0, Math.min(255, (d[i + 2] ?? 0) * 0.92 + tone[2] * 0.08));
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function buildTexture(style: SurfaceStyle, color: string, seedKey: string): THREE.CanvasTexture {
  const key = `${style}|${color}|${seedKey}`;
  const hit = texCache.get(key);
  if (hit) return hit;

  const size = 256;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d')!;
  const rnd = mulberry(hash(key));
  const [r, g, b] = hexToRgb(color);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, size, size);

  switch (style) {
    case 'carpet': {
      for (let y = 0; y < size; y += 2) {
        for (let x = 0; x < size; x += 2) {
          const v = (rnd() * 28) | 0;
          ctx.fillStyle = `rgb(${r + v - 14},${g + v - 14},${b + v - 14})`;
          ctx.fillRect(x, y, 2, 2);
        }
      }
      // subtle stripes
      ctx.globalAlpha = 0.08;
      for (let x = 0; x < size; x += 16) {
        ctx.fillStyle = '#000';
        ctx.fillRect(x, 0, 1, size);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'tile': {
      const cell = 32;
      for (let y = 0; y < size; y += cell) {
        for (let x = 0; x < size; x += cell) {
          const v = ((rnd() - 0.5) * 18) | 0;
          ctx.fillStyle = `rgb(${r + v},${g + v},${b + v})`;
          ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        }
      }
      ctx.strokeStyle = `rgba(20,20,24,0.55)`;
      ctx.lineWidth = 2;
      for (let i = 0; i <= size; i += cell) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
      }
      break;
    }
    case 'linoleum': {
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 1200; i += 1) {
        const x = rnd() * size;
        const y = rnd() * size;
        const v = (rnd() * 40) | 0;
        ctx.fillStyle = `rgba(${r + v},${g + v},${b + v},0.25)`;
        ctx.fillRect(x, y, 2 + rnd() * 3, 1);
      }
      break;
    }
    case 'concrete': {
      drawNoise(ctx, size, rnd, 36, [r, g, b]);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      for (let i = 0; i < 18; i += 1) {
        ctx.beginPath();
        ctx.moveTo(rnd() * size, rnd() * size);
        ctx.lineTo(rnd() * size, rnd() * size);
        ctx.stroke();
      }
      break;
    }
    case 'wallpaper': {
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, size, size);
      // damask-ish dots / diamonds
      ctx.fillStyle = `rgba(0,0,0,0.08)`;
      for (let y = 0; y < size; y += 24) {
        for (let x = 0; x < size; x += 24) {
          ctx.beginPath();
          ctx.arc(x + 12, y + 12, 5 + rnd() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.strokeStyle = `rgba(255,255,255,0.06)`;
      for (let y = 0; y < size; y += 24) {
        for (let x = 0; x < size; x += 24) {
          ctx.strokeRect(x + 4, y + 4, 16, 16);
        }
      }
      break;
    }
    case 'plaster': {
      drawNoise(ctx, size, rnd, 22, [r, g, b]);
      break;
    }
    case 'metal': {
      const grd = ctx.createLinearGradient(0, 0, size, size);
      grd.addColorStop(0, `rgb(${r + 30},${g + 30},${b + 30})`);
      grd.addColorStop(0.5, `rgb(${r - 10},${g - 10},${b - 10})`);
      grd.addColorStop(1, `rgb(${r + 20},${g + 20},${b + 20})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, size, size);
      for (let y = 0; y < size; y += 3) {
        ctx.fillStyle = `rgba(255,255,255,${0.02 + rnd() * 0.04})`;
        ctx.fillRect(0, y, size, 1);
      }
      break;
    }
    case 'wood': {
      for (let x = 0; x < size; x += 1) {
        const v = Math.sin(x * 0.08 + rnd()) * 12 + (rnd() - 0.5) * 10;
        ctx.fillStyle = `rgb(${r + v},${g + v * 0.8},${b + v * 0.5})`;
        ctx.fillRect(x, 0, 1, size);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      for (let y = 0; y < size; y += 42) {
        ctx.beginPath();
        ctx.moveTo(0, y + rnd() * 6);
        ctx.lineTo(size, y + rnd() * 6);
        ctx.stroke();
      }
      break;
    }
    case 'waterless': {
      // dry pool basin
      ctx.fillStyle = `rgb(${Math.max(0, r - 20)},${Math.max(0, g - 10)},${Math.min(255, b + 10)})`;
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      for (let i = 20; i < size; i += 28) {
        ctx.strokeRect(i * 0.1, i * 0.1, size - i * 0.2, size - i * 0.2);
      }
      drawNoise(ctx, size, rnd, 16, [r, g, b]);
      break;
    }
    case 'grass': {
      drawNoise(ctx, size, rnd, 34, [r, g, b]);
      ctx.lineWidth = 1;
      for (let i = 0; i < 1400; i += 1) {
        const x = rnd() * size;
        const y = rnd() * size;
        ctx.strokeStyle = rnd() > 0.5 ? 'rgba(20,55,22,0.28)' : 'rgba(210,225,150,0.12)';
        ctx.beginPath();
        ctx.moveTo(x, y + 2 + rnd() * 3);
        ctx.lineTo(x + (rnd() - 0.5) * 2, y);
        ctx.stroke();
      }
      break;
    }
    case 'asphalt': {
      drawNoise(ctx, size, rnd, 42, [r, g, b]);
      ctx.strokeStyle = 'rgba(12,14,16,0.25)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 12; i += 1) {
        ctx.beginPath();
        let x = rnd() * size;
        let y = rnd() * size;
        ctx.moveTo(x, y);
        for (let point = 0; point < 5; point += 1) {
          x += (rnd() - 0.5) * 28;
          y += rnd() * 22;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case 'paving': {
      drawNoise(ctx, size, rnd, 18, [r, g, b]);
      const cell = 48;
      ctx.strokeStyle = 'rgba(25,28,32,0.3)';
      ctx.lineWidth = 2;
      for (let y = 0; y <= size; y += cell) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }
      for (let x = 0; x <= size; x += cell) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
      }
      break;
    }
    case 'ceiling_tile': {
      const cell = 64;
      for (let y = 0; y < size; y += cell) {
        for (let x = 0; x < size; x += cell) {
          const v = ((rnd() - 0.5) * 14) | 0;
          ctx.fillStyle = `rgb(${r + v},${g + v},${b + v})`;
          ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
          // stipple
          ctx.fillStyle = 'rgba(0,0,0,0.05)';
          for (let k = 0; k < 40; k += 1) {
            ctx.fillRect(x + 4 + rnd() * (cell - 8), y + 4 + rnd() * (cell - 8), 1, 1);
          }
        }
      }
      ctx.strokeStyle = 'rgba(40,40,48,0.35)';
      ctx.lineWidth = 3;
      for (let i = 0; i <= size; i += cell) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }

  const tex = finishTex(canvas, key);
  if (style === 'grass' || style === 'asphalt') tex.repeat.set(7, 7);
  else if (style === 'paving') tex.repeat.set(5, 5);
  else if (style === 'carpet' || style === 'wallpaper') tex.repeat.set(4, 4);
  else if (style === 'tile' || style === 'ceiling_tile') tex.repeat.set(3, 3);
  else if (style === 'wood') tex.repeat.set(2, 2);
  else tex.repeat.set(2, 2);
  return tex;
}

export function surfaceMaterial(
  style: SurfaceStyle,
  color: string,
  seedKey: string,
  opts?: { roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number },
): THREE.MeshStandardMaterial {
  const key = `mat|${style}|${color}|${seedKey}|${opts?.roughness ?? ''}|${opts?.metalness ?? ''}|${opts?.emissive ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const map = buildTexture(style, color, seedKey);
  const mat = new THREE.MeshStandardMaterial({
    map,
    color: '#ffffff',
    roughness: opts?.roughness ?? (style === 'metal' ? 0.35 : style === 'tile' ? 0.55 : 0.85),
    metalness: opts?.metalness ?? (style === 'metal' ? 0.65 : 0.04),
    emissive: opts?.emissive ? new THREE.Color(opts.emissive) : 0x000000,
    emissiveIntensity: opts?.emissive ? opts.emissiveIntensity ?? 0.5 : 0,
  });
  cache.set(key, mat);
  return mat;
}

export function plainMaterial(
  color: string,
  roughness = 0.75,
  metalness = 0.08,
  emissive?: string,
  emissiveIntensity = 0.45,
): THREE.MeshStandardMaterial {
  const key = `plain|${color}|${roughness}|${metalness}|${emissive ?? ''}|${emissiveIntensity}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive: emissive ? new THREE.Color(emissive) : 0x000000,
    emissiveIntensity: emissive ? emissiveIntensity : 0,
  });
  cache.set(key, mat);
  return mat;
}

export function styleForMood(part: 'floor' | 'wall' | 'ceiling', mood: string, tags: string[]): SurfaceStyle {
  const t = tags.join(' ').toLowerCase();
  if (part === 'floor') {
    if (t.includes('pool')) return 'waterless';
    if (t.includes('meadow') || t.includes('garden') || t.includes('park') || t.includes('playground')) return 'grass';
    if (t.includes('highway') || t.includes('parking')) return 'asphalt';
    if (t.includes('plaza') || t.includes('salt') || t.includes('boardwalk')) return t.includes('boardwalk') ? 'wood' : 'paving';
    if (t.includes('clinic') || t.includes('tile')) return 'tile';
    if (t.includes('wood') || t.includes('courtyard')) return 'wood';
    if (mood === 'downer') return 'concrete';
    return 'carpet';
  }
  if (part === 'ceiling') return 'ceiling_tile';
  if (t.includes('metal') || t.includes('service')) return 'metal';
  if (t.includes('backrooms') || t.includes('wallpaper') || mood === 'static') return 'wallpaper';
  return 'plaster';
}

/** Release room-scoped material/texture caches after the room leaves the scene. */
export function clearMaterialCaches(): void {
  for (const material of cache.values()) material.dispose();
  for (const texture of texCache.values()) texture.dispose();
  cache.clear();
  texCache.clear();
}
