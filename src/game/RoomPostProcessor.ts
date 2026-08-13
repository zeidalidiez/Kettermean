import * as THREE from 'three';
import type { RoomVisuals } from '../types';

const MODE: Record<RoomVisuals['shader'], number> = {
  none: 0,
  retro: 1,
  tint: 2,
  dream: 3,
  noir: 4,
  crt: 5,
  underwater: 6,
  kaleidoscope: 7,
  acid: 8,
  fisheye: 9,
  thermal: 10,
  prism: 11,
  vhs: 12,
  strobe: 13,
  mirror: 14,
  tunnel: 15,
  posterize: 16,
  duotone: 17,
  dither: 18,
  solarize: 19,
  heatwave: 20,
  negative: 21,
  halftone: 22,
  smear: 23,
  rain: 24,
  spectral: 25,
  mosaic: 26,
  edgeglow: 27,
  oilfilm: 28,
  datamosh: 29,
  cellophane: 30,
  afterimage: 31,
  moire: 32,
  bloom: 33,
  fracture: 34,
  nightvision: 35,
  softfocus: 36,
  watercolor: 37,
  crosshatch: 38,
  lightleak: 39,
  emboss: 40,
  aurora: 41,
  xray: 42,
  frostedglass: 43,
  filmgrain: 44,
  chromatic: 45,
  sepia: 46,
  contour: 47,
  ripple: 48,
  pixelshift: 49,
  paper: 50,
  neonfog: 51,
  doublevision: 52,
  verticalhold: 53,
  lenticular: 54,
  risograph: 55,
  cyanotype: 56,
  infrared: 57,
  stainedglass: 58,
  inkbleed: 59,
  pointillism: 60,
  hologram: 61,
  tiltshift: 62,
  daguerreotype: 63,
  velvet: 64,
  blueprint: 65,
  prismshadow: 66,
  wax: 67,
  snowglobe: 68,
  anamorphic: 69,
  ultraviolet: 70,
  woven: 71,
};

/** Keyed by RoomShaderStyle; the compile-time Record guarantees full coverage. */
export const ROOM_MODE_MAP = MODE;

/** A single optional fullscreen pass. Rooms without an effect skip the render target. */
export class RoomPostProcessor {
  private readonly target = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
  });
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly geometry = new THREE.PlaneGeometry(2, 2);
  private readonly material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      tDiffuse: { value: this.target.texture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uMode: { value: 0 },
      uTint: { value: new THREE.Color('#ffffff') },
      uStrength: { value: 0.5 },
      uPixelSize: { value: 4 },
      uHighVisibility: { value: 0 },
      uMotionSpeed: { value: 0.5 },
      uDistortion: { value: 0 },
      uColorCycle: { value: 0 },
      uViewScale: { value: 1 },
      uSegments: { value: 4 },
      uRotationSpeed: { value: 0 },
      uAngleOffset: { value: 0 },
      uFlashStrength: { value: 0 },
      uFlashingDisabled: { value: 0 },
      uGrainAmount: { value: 0 },
      uChannelShift: { value: 0 },
      uEdgeFade: { value: 0 },
      uBanding: { value: 0 },
      uTextureScale: { value: 0 },
      uInkSpread: { value: 0 },
      uHighlightBloom: { value: 0 },
      uColorBleed: { value: 0 },
      uSpeckleAmount: { value: 0 },
      uWeaveAmount: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform sampler2D tDiffuse;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform float uMode;
      uniform vec3 uTint;
      uniform float uStrength;
      uniform float uPixelSize;
      uniform float uHighVisibility;
      uniform float uMotionSpeed;
      uniform float uDistortion;
      uniform float uColorCycle;
      uniform float uViewScale;
      uniform float uSegments;
      uniform float uRotationSpeed;
      uniform float uAngleOffset;
      uniform float uFlashStrength;
      uniform float uFlashingDisabled;
      uniform float uGrainAmount;
      uniform float uChannelShift;
      uniform float uEdgeFade;
      uniform float uBanding;
      uniform float uTextureScale;
      uniform float uInkSpread;
      uniform float uHighlightBloom;
      uniform float uColorBleed;
      uniform float uSpeckleAmount;
      uniform float uWeaveAmount;
      varying vec2 vUv;

      float luma(vec3 color) {
        return dot(color, vec3(0.2126, 0.7152, 0.0722));
      }

      float hash21(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      mat2 rotate2d(float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return mat2(c, -s, s, c);
      }

      vec3 hueShift(vec3 color, float angle) {
        vec3 axis = normalize(vec3(1.0));
        return color * cos(angle)
          + cross(axis, color) * sin(angle)
          + axis * dot(axis, color) * (1.0 - cos(angle));
      }

      vec3 thermalRamp(float value) {
        float v = clamp(value, 0.0, 1.0);
        if (v < 0.33) {
          return mix(vec3(0.015, 0.0, 0.14), vec3(0.1, 0.25, 0.92), v / 0.33);
        }
        if (v < 0.66) {
          return mix(vec3(0.1, 0.25, 0.92), vec3(0.96, 0.12, 0.2), (v - 0.33) / 0.33);
        }
        return mix(vec3(0.96, 0.12, 0.2), vec3(1.0, 0.94, 0.42), (v - 0.66) / 0.34);
      }

      vec2 safeUv(vec2 uv) {
        return clamp(uv, vec2(0.002), vec2(0.998));
      }

      void main() {
        vec2 uv = vUv;
        float time = uTime * uMotionSpeed;
        float aspect = uResolution.x / max(uResolution.y, 1.0);
        vec2 p = uv - 0.5;
        p.x *= aspect;
        p /= max(uViewScale, 1.0);

        if (uMode == 7.0) {
          float radius = length(p);
          float angle = atan(p.y, p.x) + uAngleOffset + time * uRotationSpeed;
          float wedge = 6.28318530718 / max(2.0, floor(uSegments + 0.5));
          angle = abs(mod(angle, wedge) - wedge * 0.5);
          p = vec2(cos(angle), sin(angle)) * radius;
        } else if (uMode == 9.0) {
          float radius2 = dot(p, p);
          p *= 1.0 + radius2 * uDistortion * 0.7;
        } else if (uMode == 14.0) {
          p = rotate2d(uAngleOffset) * p;
          p.x = abs(p.x);
          if (uSegments > 5.0) p.y = abs(p.y);
          p = rotate2d(time * uRotationSpeed) * p;
        } else if (uMode == 15.0) {
          float radius = length(p);
          float angle = atan(p.y, p.x);
          angle += uAngleOffset + (1.0 - radius) * uDistortion * 2.4 + time * uRotationSpeed;
          radius = pow(max(radius, 0.0001), mix(1.0, 0.62, uDistortion));
          p = vec2(cos(angle), sin(angle)) * radius;
        }

        p.x /= aspect;
        uv = p + 0.5;

        if (uMode == 3.0) {
          uv.x += sin(uv.y * 18.0 + time * 0.65) * 0.006 * uDistortion;
          uv.y += cos(uv.x * 13.0 - time * 0.42) * 0.005 * uDistortion;
        } else if (uMode == 6.0) {
          uv.x += sin(uv.y * 22.0 + time * 1.2) * 0.018 * uDistortion;
          uv.y += cos(uv.x * 17.0 - time * 0.85) * 0.014 * uDistortion;
        } else if (uMode == 8.0) {
          uv.x += sin(uv.y * 10.0 + time * 1.5 + sin(uv.y * 31.0)) * 0.036 * uDistortion;
          uv.y += sin(uv.x * 8.0 - time + cos(uv.x * 23.0)) * 0.027 * uDistortion;
        } else if (uMode == 12.0) {
          float line = floor(uv.y * 140.0);
          float jitter = hash21(vec2(line, floor(time * 12.0))) - 0.5;
          uv.x += jitter * 0.018 * uDistortion;
          uv.y += sin(time * 2.2) * 0.0015 * uDistortion;
        } else if (uMode == 20.0) {
          float shimmer = sin(uv.y * 31.0 + time * 2.4)
            + sin(uv.y * 73.0 - time * 1.6) * 0.42;
          uv.x += shimmer * 0.0065 * uDistortion;
          uv.y += sin(uv.x * 19.0 + time * 1.1) * 0.0025 * uDistortion;
        } else if (uMode == 23.0) {
          float column = floor(uv.x * 68.0);
          float columnNoise = hash21(vec2(column, floor(time * 2.5)));
          float dripWave = pow(max(0.0, sin(uv.y * 9.0 - time * 1.35 + columnNoise * 6.28)), 3.0);
          uv.y += (columnNoise - 0.28) * dripWave * 0.026 * uDistortion;
          uv.x += sin(uv.y * 26.0 + time) * 0.004 * uDistortion;
        } else if (uMode == 24.0) {
          vec2 rainCell = floor(vec2(uv.x * 54.0, uv.y * 11.0));
          float rainSeed = hash21(rainCell.xx + vec2(3.1, 9.7));
          float drop = fract(uv.y * 7.0 + time * (0.7 + rainSeed) + rainSeed);
          float lens = smoothstep(0.16, 0.0, abs(drop - 0.12));
          uv.x += (rainSeed - 0.5) * lens * 0.018 * uDistortion;
          uv.y += lens * 0.006 * uDistortion;
        } else if (uMode == 26.0) {
          vec2 cells = vec2(22.0, 16.0);
          vec2 tile = floor(uv * cells);
          vec2 center = (tile + 0.5) / cells;
          float tileNoise = hash21(tile);
          vec2 local = uv - center;
          if (tileNoise > 0.66) local = local.yx * vec2(tileNoise > 0.82 ? -1.0 : 1.0, 1.0);
          uv = mix(uv, center + local, 0.5 + uStrength * 0.34);
        } else if (uMode == 29.0) {
          vec2 macroCells = vec2(18.0, 12.0);
          vec2 block = floor(uv * macroCells);
          float blockNoise = hash21(block + floor(time * 2.2));
          float activeBlock = step(0.7 - uDistortion * 0.2, blockNoise);
          uv.x += (hash21(block.yx + floor(time * 0.75)) - 0.5)
            * 0.055 * uDistortion * activeBlock;
          uv.y = mix(uv.y, (floor(uv.y * 120.0) + 0.5) / 120.0, activeBlock * 0.4);
        } else if (uMode == 30.0) {
          float fold = sin((uv.x * 1.7 + uv.y) * 38.0 + time * 0.7)
            * cos((uv.y * 1.4 - uv.x) * 29.0 - time * 0.45);
          uv += vec2(fold, -fold * 0.72) * 0.009 * uDistortion;
        } else if (uMode == 34.0) {
          vec2 shardGrid = vec2(7.0, 5.0);
          vec2 shard = floor(uv * shardGrid);
          vec2 shardCenter = (shard + 0.5) / shardGrid;
          float shardNoise = hash21(shard + vec2(4.7, 1.3));
          vec2 local = uv - shardCenter;
          local = rotate2d((shardNoise - 0.5) * 0.24 * uDistortion) * local;
          local += vec2(shardNoise - 0.5, hash21(shard.yx) - 0.5) * 0.012 * uDistortion;
          uv = shardCenter + local;
        } else if (uMode == 43.0) {
          vec2 paneGrid = vec2(24.0, 16.0);
          vec2 pane = floor(uv * paneGrid);
          vec2 refraction = vec2(
            hash21(pane + vec2(2.3, 7.1)),
            hash21(pane.yx + vec2(5.9, 1.7))
          ) - 0.5;
          float breathing = 0.72 + 0.28 * sin(time * 0.35 + hash21(pane) * 6.2831);
          uv += refraction * (0.003 + uDistortion * 0.009) * breathing;
        } else if (uMode == 48.0) {
          vec2 rippleCenter = uv - 0.5;
          vec2 rippleDirection = normalize(rippleCenter + vec2(0.0001, 0.0));
          float rippleRadius = length(rippleCenter * vec2(aspect, 1.0));
          float wave = sin(rippleRadius * mix(34.0, 78.0, uBanding) - time * 1.25);
          uv += rippleDirection * wave * (0.0015 + uDistortion * 0.0085) * uStrength;
        } else if (uMode == 49.0) {
          float shiftBand = floor(uv.y * mix(22.0, 96.0, uBanding));
          float shiftNoise = hash21(vec2(shiftBand, floor(time * 3.4)));
          float activeShift = step(0.63, shiftNoise);
          uv.x += (shiftNoise - 0.5) * (0.012 + uDistortion * 0.048) * activeShift;
          uv.y = mix(uv.y, (floor(uv.y * 180.0) + 0.5) / 180.0, activeShift * 0.34);
        } else if (uMode == 53.0) {
          float holdOffset = sin(time * 0.38 + uAngleOffset) * 0.012 * uDistortion;
          uv.y = fract(uv.y + holdOffset);
          float rollPosition = fract(time * 0.075 + uAngleOffset * 0.159);
          float rollDistance = abs(fract(uv.y - rollPosition + 0.5) - 0.5);
          float syncTear = 1.0 - smoothstep(0.008, 0.045, rollDistance);
          uv.x += sin(uv.y * 92.0 + time) * syncTear * (0.004 + uBanding * 0.022);
        } else if (uMode == 58.0) {
          vec2 paneCount = vec2(
            mix(13.0, 31.0, uTextureScale),
            mix(9.0, 23.0, uTextureScale)
          );
          vec2 pane = floor(uv * paneCount);
          vec2 paneCenter = (pane + 0.5) / paneCount;
          vec2 paneJitter = vec2(hash21(pane + 4.7), hash21(pane.yx + 8.1)) - 0.5;
          paneCenter += paneJitter / paneCount * 0.34;
          uv = mix(uv, paneCenter + (uv - paneCenter) * 0.72, 0.38 + uDistortion * 0.24);
        } else if (uMode == 61.0) {
          float holoLine = floor(uv.y * mix(90.0, 260.0, uTextureScale));
          float lineDrift = hash21(vec2(holoLine, floor(time * 0.7))) - 0.5;
          uv.x += lineDrift * (0.001 + uColorBleed * 0.0045);
        } else if (uMode == 67.0) {
          float melt = sin(uv.x * mix(13.0, 31.0, uTextureScale) + time * 0.22 + uAngleOffset);
          uv.y += melt * (0.001 + uInkSpread * 0.006) * uDistortion;
        } else if (uMode == 68.0) {
          vec2 globe = uv - 0.5;
          globe.x *= aspect;
          float globeRadius2 = dot(globe, globe);
          globe *= 1.0 - globeRadius2 * (0.05 + uDistortion * 0.13);
          globe.x /= aspect;
          uv = globe + 0.5;
        }

        bool pixelated = uMode == 1.0 || uMode == 5.0 || uMode == 12.0 ||
          uMode == 18.0 || uMode == 29.0 || uMode == 49.0;
        if (pixelated) {
          vec2 cells = max(uResolution / max(2.0, uPixelSize), vec2(1.0));
          uv = (floor(uv * cells) + 0.5) / cells;
        }

        vec2 radial = normalize((uv - 0.5) + vec2(0.0001, 0.0));
        vec2 offset = radial * (0.0012 + uDistortion * 0.006 + uChannelShift * 0.007) * uStrength;
        vec3 color;
        if (
          uMode == 3.0 || uMode == 5.0 || uMode == 8.0 ||
          uMode == 11.0 || uMode == 12.0 || uMode == 15.0 || uMode == 23.0 ||
          uMode == 25.0 || uMode == 28.0 || uMode == 29.0 || uMode == 30.0 ||
          uMode == 31.0 || uMode == 34.0 || uMode == 45.0
        ) {
          color = vec3(
            texture2D(tDiffuse, safeUv(uv + offset)).r,
            texture2D(tDiffuse, safeUv(uv)).g,
            texture2D(tDiffuse, safeUv(uv - offset)).b
          );
        } else {
          color = texture2D(tDiffuse, safeUv(uv)).rgb;
        }

        if (uMode == 1.0) {
          float levels = mix(8.0, 4.0, uStrength);
          vec3 quantized = floor(color * levels + 0.5) / levels;
          color = mix(color, quantized, 0.45 + uStrength * 0.35);
          color *= 0.96 + 0.04 * sin(gl_FragCoord.y * 1.7);
        } else if (uMode == 2.0) {
          vec3 tinted = uTint * (0.32 + luma(color) * 0.9);
          color = mix(color, tinted, 0.28 + uStrength * 0.52);
        } else if (uMode == 3.0) {
          color = mix(color, color * uTint * 1.15, uStrength * 0.28);
          color += 0.012 * sin((vUv.x + vUv.y + uTime * 0.08) * 34.0);
        } else if (uMode == 4.0) {
          float gray = luma(color);
          gray = pow(clamp(gray * 1.15 + 0.035, 0.0, 1.0), 0.82);
          color = mix(vec3(gray), vec3(gray) * uTint, uStrength * 0.22);
        } else if (uMode == 5.0) {
          float scanline = 0.9 + 0.1 * sin(gl_FragCoord.y * 2.2);
          color *= scanline;
          color = mix(color, color * uTint, uStrength * 0.18);
          color = pow(clamp(color * 1.08 + 0.025, 0.0, 1.0), vec3(0.92));
        } else if (uMode == 6.0) {
          float caustic = sin((uv.x + uv.y) * 52.0 + time * 2.1)
            * sin((uv.x - uv.y) * 31.0 - time * 1.4);
          vec3 waterTint = mix(vec3(0.04, 0.2, 0.28), uTint, 0.32);
          color = mix(color, color * waterTint * 1.9, 0.28 + uStrength * 0.35);
          color += max(caustic, 0.0) * 0.035 * uDistortion;
        } else if (uMode == 7.0) {
          color = mix(color, color * uTint * 1.2, uStrength * 0.2);
        } else if (uMode == 8.0) {
          color = hueShift(color, time * uColorCycle * 0.9 + luma(color) * 1.8);
          color = mix(color, color * uTint * 1.35, uStrength * 0.18);
        } else if (uMode == 9.0) {
          color = mix(color, color * uTint, uStrength * 0.1);
        } else if (uMode == 10.0) {
          vec3 thermal = thermalRamp(pow(luma(color), 0.72));
          color = mix(color, thermal, 0.55 + uStrength * 0.38);
        } else if (uMode == 11.0) {
          color = hueShift(color, uAngleOffset * 0.35 + time * uColorCycle * 0.22);
          color = mix(color, color * uTint * 1.2, uStrength * 0.12);
        } else if (uMode == 12.0) {
          float scanline = 0.86 + 0.14 * sin(gl_FragCoord.y * 1.65 + time * 2.0);
          float noise = hash21(gl_FragCoord.xy + floor(time * 20.0)) - 0.5;
          float dropout = step(0.985, hash21(vec2(floor(uv.y * 90.0), floor(time * 5.0))));
          color = color * scanline + noise * 0.025 * uDistortion;
          color *= 1.0 - dropout * 0.22 * uDistortion;
        } else if (uMode == 13.0) {
          float enabled = 1.0 - uFlashingDisabled;
          float wave = 0.5 + 0.5 * sin(time * 9.0 + uAngleOffset);
          float flash = smoothstep(0.62, 0.88, wave) * uFlashStrength * enabled;
          color = mix(color, uTint * max(0.28, luma(color)), flash);
          color *= 1.0 + flash * 0.75;
        } else if (uMode == 14.0) {
          color = mix(color, color * uTint * 1.1, uStrength * 0.16);
        } else if (uMode == 15.0) {
          color = hueShift(color, time * uColorCycle * 0.18);
          color = mix(color, color * uTint * 1.2, uStrength * 0.16);
        } else if (uMode == 16.0) {
          float levels = mix(7.0, 3.0, uStrength);
          vec3 poster = floor(color * levels + 0.5) / levels;
          color = mix(color, poster * mix(vec3(1.0), uTint, 0.16), 0.56 + uStrength * 0.32);
        } else if (uMode == 17.0) {
          float value = smoothstep(0.06, 0.94, luma(color));
          vec3 shadowTone = uTint * 0.14;
          vec3 highlightTone = mix(uTint, vec3(1.0), 0.68);
          vec3 duo = mix(shadowTone, highlightTone, value);
          color = mix(color, duo, 0.48 + uStrength * 0.4);
        } else if (uMode == 18.0) {
          vec2 cell = mod(floor(gl_FragCoord.xy), vec2(4.0));
          float threshold = hash21(cell + vec2(2.7, 8.3));
          float levels = mix(6.0, 3.0, uStrength);
          vec3 dithered = floor(color * levels + threshold) / levels;
          color = mix(color, dithered * mix(vec3(1.0), uTint, 0.12), 0.52 + uStrength * 0.34);
        } else if (uMode == 19.0) {
          float value = luma(color);
          vec3 inverted = vec3(1.0) - color;
          vec3 solar = mix(color, inverted, smoothstep(0.38, 0.72, value));
          solar = hueShift(solar, uAngleOffset * 0.2 + time * uColorCycle * 0.12);
          color = mix(color, solar * mix(vec3(1.0), uTint, 0.18), 0.46 + uStrength * 0.4);
        } else if (uMode == 20.0) {
          float shimmer = 0.5 + 0.5 * sin((uv.x + uv.y) * 42.0 + time * 2.3);
          vec3 heated = color * vec3(1.12, 0.94, 0.76);
          heated += vec3(0.045, 0.018, 0.0) * shimmer * uDistortion;
          color = mix(color, heated * mix(vec3(1.0), uTint, 0.12), 0.38 + uStrength * 0.32);
        } else if (uMode == 21.0) {
          vec3 inverted = vec3(1.0) - color;
          inverted = mix(inverted, inverted * uTint * 1.18, 0.18 + uStrength * 0.12);
          color = mix(color, inverted, 0.56 + uStrength * 0.3);
        } else if (uMode == 22.0) {
          float value = luma(color);
          float grid = max(3.0, uPixelSize * 1.35);
          vec2 dotUv = fract(gl_FragCoord.xy / grid) - 0.5;
          float radius = mix(0.46, 0.1, value);
          float dotMask = 1.0 - smoothstep(radius - 0.055, radius + 0.055, length(dotUv));
          vec3 paper = mix(vec3(0.94), uTint, 0.11);
          vec3 ink = mix(vec3(0.035), uTint * 0.18, 0.3);
          vec3 printed = mix(paper, ink, dotMask);
          color = mix(color, printed, 0.44 + uStrength * 0.28);
        } else if (uMode == 23.0) {
          vec3 melted = hueShift(color, sin(uv.y * 7.0 + time) * uColorCycle * 0.34);
          melted *= mix(vec3(1.0), uTint * 1.18, 0.18);
          color = mix(color, melted, 0.34 + uStrength * 0.34);
        } else if (uMode == 24.0) {
          float streak = pow(max(0.0, sin(vUv.y * 170.0 - time * 9.0 + vUv.x * 31.0)), 18.0);
          vec3 stormTint = mix(vec3(0.46, 0.62, 0.76), uTint, 0.16);
          color = mix(color, color * stormTint * 1.34, 0.18 + uStrength * 0.22);
          color += streak * 0.055 * uDistortion;
        } else if (uMode == 25.0) {
          vec2 ghostOffset = vec2(
            sin(time * 0.61 + uAngleOffset),
            cos(time * 0.47 - uAngleOffset)
          ) * (0.004 + uDistortion * 0.009);
          vec3 ghost = texture2D(tDiffuse, safeUv(uv + ghostOffset)).rgb;
          float ghostLuma = luma(ghost);
          vec3 spectral = mix(vec3(ghostLuma), ghost * uTint * 1.12, 0.38);
          color = mix(color, spectral, 0.28 + uStrength * 0.34);
        } else if (uMode == 26.0) {
          float levels = mix(9.0, 4.0, uStrength);
          vec3 tileColor = floor(color * levels + 0.5) / levels;
          float grout = step(0.94, fract(vUv.x * 22.0)) + step(0.93, fract(vUv.y * 16.0));
          tileColor = mix(tileColor, uTint * 0.22, clamp(grout, 0.0, 1.0) * 0.45);
          color = mix(color, tileColor, 0.4 + uStrength * 0.32);
        } else if (uMode == 27.0) {
          vec2 texel = 1.0 / max(uResolution, vec2(1.0));
          float horizontal = abs(
            luma(texture2D(tDiffuse, safeUv(uv + vec2(texel.x * 2.0, 0.0))).rgb) -
            luma(texture2D(tDiffuse, safeUv(uv - vec2(texel.x * 2.0, 0.0))).rgb)
          );
          float vertical = abs(
            luma(texture2D(tDiffuse, safeUv(uv + vec2(0.0, texel.y * 2.0))).rgb) -
            luma(texture2D(tDiffuse, safeUv(uv - vec2(0.0, texel.y * 2.0))).rgb)
          );
          float edge = smoothstep(0.03, 0.22, horizontal + vertical);
          vec3 outlined = color * 0.68 + uTint * edge * (0.75 + uStrength * 0.7);
          color = mix(color, outlined, 0.34 + uStrength * 0.3);
        } else if (uMode == 28.0) {
          float radius = length(vUv - 0.5);
          float interference = sin(radius * 82.0 - time * 0.8)
            + sin((vUv.x - vUv.y) * 47.0 + time * 0.52) * 0.55;
          vec3 oil = hueShift(color, interference * (0.55 + uColorCycle * 1.4));
          oil *= mix(vec3(1.0), uTint * 1.28, 0.18 + 0.1 * interference);
          float sheen = pow(max(0.0, interference * 0.5 + 0.5), 5.0);
          oil += vec3(0.08, 0.045, 0.11) * sheen * uDistortion;
          color = mix(color, oil, 0.36 + uStrength * 0.42);
        } else if (uMode == 29.0) {
          vec2 block = floor(vUv * vec2(18.0, 12.0));
          float hold = step(0.62, hash21(block + floor(time * 1.8)));
          float band = step(0.72, hash21(vec2(floor(vUv.y * 34.0), floor(time * 3.0))));
          vec3 displaced = vec3(color.r, color.b, color.g);
          color = mix(color, displaced * mix(vec3(1.0), uTint, 0.16), hold * (0.28 + uStrength * 0.35));
          color += (hash21(block) - 0.5) * band * 0.11 * uDistortion;
        } else if (uMode == 30.0) {
          float foldA = sin((vUv.x + vUv.y) * 36.0 + time * 0.55);
          float foldB = cos((vUv.x - vUv.y) * 54.0 - time * 0.42);
          vec3 refracted = hueShift(color, (foldA + foldB) * 0.48 * uColorCycle);
          vec3 filmTint = mix(uTint, vec3(0.72, 0.93, 1.0), 0.45 + foldA * 0.14);
          refracted *= mix(vec3(1.0), filmTint * 1.24, 0.24);
          refracted += max(0.0, foldA * foldB) * 0.045 * uDistortion;
          color = mix(color, refracted, 0.3 + uStrength * 0.38);
        } else if (uMode == 31.0) {
          vec2 drift = vec2(
            sin(time * 0.63 + uAngleOffset),
            cos(time * 0.49 - uAngleOffset)
          ) * (0.006 + uDistortion * 0.018);
          vec3 echoA = texture2D(tDiffuse, safeUv(uv - drift)).rgb;
          vec3 echoB = texture2D(tDiffuse, safeUv(uv - drift * 2.1)).rgb;
          vec3 echoC = texture2D(tDiffuse, safeUv(uv + drift * 0.7)).rgb;
          vec3 trails = max(echoA * vec3(0.72, 0.35, 0.52), echoB * vec3(0.28, 0.58, 0.78));
          trails = max(trails, echoC * uTint * 0.48);
          color = mix(color, max(color, trails), 0.28 + uStrength * 0.4);
        } else if (uMode == 32.0) {
          vec2 centered = vUv - 0.5;
          float radial = sin(length(centered) * (240.0 + uPixelSize * 8.0) - time * 0.5);
          float diagonal = sin((centered.x * 1.3 + centered.y) * 310.0 + time * 0.32);
          float interference = radial * diagonal;
          vec3 ink = mix(vec3(0.04), uTint * 0.28, 0.42);
          vec3 paper = mix(vec3(0.92), uTint, 0.12);
          vec3 pattern = mix(ink, paper, smoothstep(-0.18, 0.22, interference));
          color = mix(color, pattern * (0.58 + luma(color) * 0.62), 0.3 + uStrength * 0.36);
        } else if (uMode == 33.0) {
          vec2 texel = 1.0 / max(uResolution, vec2(1.0));
          vec2 radius = texel * (2.0 + uDistortion * 5.0);
          vec3 blur = texture2D(tDiffuse, safeUv(uv + vec2(radius.x, 0.0))).rgb;
          blur += texture2D(tDiffuse, safeUv(uv - vec2(radius.x, 0.0))).rgb;
          blur += texture2D(tDiffuse, safeUv(uv + vec2(0.0, radius.y))).rgb;
          blur += texture2D(tDiffuse, safeUv(uv - vec2(0.0, radius.y))).rgb;
          blur *= 0.25;
          float bright = smoothstep(0.48, 0.92, luma(blur));
          vec3 halo = blur * mix(vec3(1.0), uTint * 1.35, 0.3) * bright;
          color += halo * (0.32 + uStrength * 0.76);
          color = mix(color, pow(max(color, vec3(0.0)), vec3(0.92)), 0.18);
        } else if (uMode == 34.0) {
          vec2 grid = fract(vUv * vec2(7.0, 5.0));
          float seam = smoothstep(0.035, 0.0, min(min(grid.x, 1.0 - grid.x), min(grid.y, 1.0 - grid.y)));
          float shardHue = hash21(floor(vUv * vec2(7.0, 5.0))) - 0.5;
          vec3 fractured = hueShift(color, shardHue * 1.25 * uColorCycle);
          fractured += uTint * seam * (0.18 + uStrength * 0.3);
          color = mix(color, fractured, 0.38 + uStrength * 0.3);
        } else if (uMode == 35.0) {
          float value = pow(luma(color), 0.72);
          float grain = hash21(gl_FragCoord.xy + floor(time * 15.0)) - 0.5;
          float scan = 0.94 + 0.06 * sin(gl_FragCoord.y * 1.45);
          vec3 phosphor = vec3(0.06, 0.92, 0.28) * value * scan;
          phosphor += vec3(0.02, 0.16, 0.045) + grain * 0.045 * uDistortion;
          vec2 centered = vUv * 2.0 - 1.0;
          float scope = 1.0 - smoothstep(0.72, 1.32, dot(centered, centered));
          phosphor *= mix(0.62, 1.0, scope);
          color = mix(color, phosphor * mix(vec3(1.0), uTint, 0.12), 0.58 + uStrength * 0.34);
        } else if (uMode == 36.0) {
          vec2 texel = 1.0 / max(uResolution, vec2(1.0));
          vec2 radius = texel * (2.0 + uDistortion * 5.0);
          vec3 haze = texture2D(tDiffuse, safeUv(uv + vec2(radius.x, 0.0))).rgb;
          haze += texture2D(tDiffuse, safeUv(uv - vec2(radius.x, 0.0))).rgb;
          haze += texture2D(tDiffuse, safeUv(uv + vec2(0.0, radius.y))).rgb;
          haze += texture2D(tDiffuse, safeUv(uv - vec2(0.0, radius.y))).rgb;
          haze += texture2D(tDiffuse, safeUv(uv + radius)).rgb;
          haze += texture2D(tDiffuse, safeUv(uv - radius)).rgb;
          haze += texture2D(tDiffuse, safeUv(uv + vec2(radius.x, -radius.y))).rgb;
          haze += texture2D(tDiffuse, safeUv(uv + vec2(-radius.x, radius.y))).rgb;
          haze *= 0.125;
          float glow = smoothstep(0.42, 0.92, luma(haze));
          vec3 diffused = mix(color, haze, 0.34 + uStrength * 0.28);
          diffused += haze * glow * (0.08 + uStrength * 0.16);
          color = mix(color, diffused * mix(vec3(1.0), uTint * 1.12, 0.12), 0.54 + uStrength * 0.24);
        } else if (uMode == 37.0) {
          vec2 texel = 1.0 / max(uResolution, vec2(1.0));
          vec2 brush = texel * (1.5 + uPixelSize * 0.42);
          vec3 wash = color * 2.0;
          wash += texture2D(tDiffuse, safeUv(uv + brush)).rgb;
          wash += texture2D(tDiffuse, safeUv(uv - brush)).rgb;
          wash += texture2D(tDiffuse, safeUv(uv + vec2(brush.x, -brush.y))).rgb;
          wash += texture2D(tDiffuse, safeUv(uv + vec2(-brush.x, brush.y))).rgb;
          wash /= 6.0;
          float pigmentEdge = smoothstep(0.025, 0.16, abs(luma(color) - luma(wash)));
          float levels = mix(8.0, 4.0, uStrength);
          vec3 painted = floor(wash * levels + 0.5) / levels;
          float paperFiber = hash21(floor(gl_FragCoord.xy * 0.5)) - 0.5;
          painted *= mix(vec3(1.0), uTint * 1.08, 0.12);
          painted -= pigmentEdge * mix(vec3(0.045), uTint * 0.08, 0.25);
          painted += paperFiber * 0.018;
          color = mix(color, painted, 0.48 + uStrength * 0.32);
        } else if (uMode == 38.0) {
          float value = luma(color);
          vec2 hatchUv = gl_FragCoord.xy * (0.34 + uPixelSize * 0.018);
          float lineA = 1.0 - smoothstep(0.08, 0.22, abs(sin(hatchUv.x + hatchUv.y)));
          float lineB = 1.0 - smoothstep(0.08, 0.22, abs(sin(hatchUv.x - hatchUv.y)));
          float lineC = 1.0 - smoothstep(0.06, 0.18, abs(sin(hatchUv.x * 0.52 + hatchUv.y)));
          float inkMask = lineA * step(value, 0.76);
          inkMask += lineB * step(value, 0.5);
          inkMask += lineC * step(value, 0.28);
          vec3 paper = mix(vec3(0.92, 0.9, 0.84), uTint, 0.1);
          vec3 ink = mix(vec3(0.035, 0.04, 0.05), uTint * 0.18, 0.28);
          vec3 drawing = mix(paper * (0.64 + value * 0.48), ink, clamp(inkMask, 0.0, 1.0));
          color = mix(color, drawing, 0.42 + uStrength * 0.36);
        } else if (uMode == 39.0) {
          vec2 leakCenter = vec2(
            0.08 + 0.08 * sin(time * 0.27 + uAngleOffset),
            0.48 + 0.24 * cos(time * 0.19 - uAngleOffset)
          );
          float edgeLeak = pow(1.0 - smoothstep(0.0, 0.68, vUv.x), 2.0);
          float orbLeak = 1.0 - smoothstep(0.04, 0.58, distance(vUv, leakCenter));
          float streak = pow(max(0.0, sin(vUv.y * 7.0 + vUv.x * 2.0 + time * 0.24)), 6.0);
          vec3 warmLeak = mix(vec3(1.0, 0.18, 0.035), vec3(1.0, 0.72, 0.22), vUv.y);
          vec3 coolLeak = mix(vec3(0.08, 0.22, 0.82), uTint, 0.5);
          vec3 exposed = color + warmLeak * (edgeLeak + orbLeak * 0.42) * (0.15 + uStrength * 0.28);
          exposed += coolLeak * streak * 0.055 * uDistortion;
          color = mix(color, exposed, 0.62 + uStrength * 0.18);
        } else if (uMode == 40.0) {
          vec2 texel = 1.0 / max(uResolution, vec2(1.0));
          vec2 diagonal = texel * (1.5 + uDistortion * 2.5);
          float raised = luma(texture2D(tDiffuse, safeUv(uv - diagonal)).rgb);
          float recessed = luma(texture2D(tDiffuse, safeUv(uv + diagonal)).rgb);
          float relief = clamp(0.5 + (raised - recessed) * (2.8 + uStrength * 2.2), 0.0, 1.0);
          float sourceValue = luma(color);
          vec3 shadowMetal = mix(vec3(0.055, 0.065, 0.075), uTint * 0.16, 0.34);
          vec3 highlightMetal = mix(vec3(0.82, 0.84, 0.8), uTint, 0.22);
          vec3 sculpted = mix(shadowMetal, highlightMetal, relief);
          sculpted *= 0.68 + sourceValue * 0.5;
          color = mix(color, sculpted, 0.46 + uStrength * 0.34);
        } else if (uMode == 41.0) {
          float ribbonA = sin(vUv.x * 11.0 + time * 0.62 + sin(vUv.y * 6.0));
          float ribbonB = sin(vUv.x * 19.0 - time * 0.37 - vUv.y * 8.0);
          float curtain = smoothstep(0.2, 0.92, ribbonA * 0.55 + ribbonB * 0.3 + 0.46);
          curtain *= smoothstep(0.08, 0.82, vUv.y);
          vec3 cyan = mix(vec3(0.05, 0.72, 0.62), uTint, 0.24);
          vec3 violet = hueShift(cyan, 1.35 + uColorCycle * 1.2);
          vec3 auroraColor = mix(cyan, violet, 0.5 + 0.5 * ribbonB);
          vec3 shifted = hueShift(color, ribbonA * 0.16 * uColorCycle);
          shifted += auroraColor * curtain * (0.08 + uStrength * 0.19);
          color = mix(color, shifted, 0.5 + uStrength * 0.24);
        } else if (uMode == 42.0) {
          vec2 texel = 1.0 / max(uResolution, vec2(1.0));
          float left = luma(texture2D(tDiffuse, safeUv(uv - vec2(texel.x * 2.0, 0.0))).rgb);
          float right = luma(texture2D(tDiffuse, safeUv(uv + vec2(texel.x * 2.0, 0.0))).rgb);
          float down = luma(texture2D(tDiffuse, safeUv(uv - vec2(0.0, texel.y * 2.0))).rgb);
          float up = luma(texture2D(tDiffuse, safeUv(uv + vec2(0.0, texel.y * 2.0))).rgb);
          float edge = smoothstep(0.025, 0.24, abs(left - right) + abs(down - up));
          float negativeValue = pow(1.0 - luma(color), 1.18);
          vec3 plate = mix(vec3(0.012, 0.04, 0.075), vec3(0.38, 0.9, 1.0), negativeValue);
          plate += mix(vec3(0.16, 0.72, 0.92), uTint, 0.32) * edge * (0.35 + uStrength * 0.52);
          color = mix(color, plate, 0.52 + uStrength * 0.34);
        } else if (uMode == 43.0) {
          vec2 texel = 1.0 / max(uResolution, vec2(1.0));
          vec2 frostRadius = texel * (2.0 + uDistortion * 4.5);
          vec3 frost = color * 2.0;
          frost += texture2D(tDiffuse, safeUv(uv + frostRadius)).rgb;
          frost += texture2D(tDiffuse, safeUv(uv - frostRadius)).rgb;
          frost += texture2D(tDiffuse, safeUv(uv + vec2(frostRadius.x, -frostRadius.y))).rgb;
          frost += texture2D(tDiffuse, safeUv(uv + vec2(-frostRadius.x, frostRadius.y))).rgb;
          frost /= 6.0;
          vec2 pane = floor(vUv * vec2(24.0, 16.0));
          float crystal = hash21(pane) - 0.5;
          float etching = 1.0 - smoothstep(0.02, 0.08, min(fract(vUv.x * 24.0), fract(vUv.y * 16.0)));
          frost = mix(frost, frost * mix(vec3(0.82, 0.94, 1.0), uTint, 0.18), 0.28);
          frost += crystal * 0.035 + etching * 0.035;
          color = mix(color, frost, 0.48 + uStrength * 0.32);
        } else if (uMode == 44.0) {
          float filmFrame = floor(time * mix(9.0, 28.0, uGrainAmount));
          float grainNoise = hash21(gl_FragCoord.xy + vec2(filmFrame * 17.13, filmFrame * 3.71)) - 0.5;
          float scratchSeed = hash21(vec2(floor(gl_FragCoord.x * 0.18), filmFrame * 0.07));
          float scratch = step(0.992 - uGrainAmount * 0.004, scratchSeed)
            * (0.45 + 0.55 * sin(gl_FragCoord.y * 0.07 + filmFrame));
          vec3 fadedFilm = mix(vec3(luma(color)), color * vec3(1.05, 0.99, 0.91), 0.72);
          fadedFilm += grainNoise * (0.018 + uGrainAmount * 0.085);
          fadedFilm += scratch * vec3(0.12, 0.105, 0.08);
          color = mix(color, fadedFilm, 0.4 + uStrength * 0.38);
        } else if (uMode == 45.0) {
          float fringe = smoothstep(0.08, 0.9, length(vUv - 0.5) * 1.5);
          vec3 separated = color;
          separated.r *= 1.0 + fringe * uChannelShift * 0.08;
          separated.b *= 1.0 + fringe * uChannelShift * 0.12;
          separated = hueShift(separated, (vUv.x - 0.5) * uColorCycle * 0.22);
          color = mix(color, separated * mix(vec3(1.0), uTint, 0.1), 0.52 + uStrength * 0.28);
        } else if (uMode == 46.0) {
          vec3 sepiaPlate = vec3(
            dot(color, vec3(0.393, 0.769, 0.189)),
            dot(color, vec3(0.349, 0.686, 0.168)),
            dot(color, vec3(0.272, 0.534, 0.131))
          );
          float dust = hash21(floor(gl_FragCoord.xy * 0.32) + floor(time * 0.8)) - 0.5;
          sepiaPlate = clamp(sepiaPlate, 0.0, 1.08) + dust * 0.025 * uGrainAmount;
          sepiaPlate *= mix(vec3(1.0), uTint * 1.05, 0.08);
          color = mix(color, sepiaPlate, 0.48 + uStrength * 0.38);
        } else if (uMode == 47.0) {
          vec2 texel = 1.0 / max(uResolution, vec2(1.0));
          float value = luma(color);
          float rightValue = luma(texture2D(tDiffuse, safeUv(uv + vec2(texel.x * 2.0, 0.0))).rgb);
          float upperValue = luma(texture2D(tDiffuse, safeUv(uv + vec2(0.0, texel.y * 2.0))).rgb);
          float edge = smoothstep(0.018, 0.16, abs(value - rightValue) + abs(value - upperValue));
          float contourCount = mix(6.0, 18.0, uBanding);
          float contourLine = 1.0 - smoothstep(0.02, 0.1, abs(fract(value * contourCount) - 0.5));
          vec3 contourPaper = mix(vec3(0.08, 0.095, 0.11), uTint * 0.22, 0.35);
          vec3 contourLight = mix(vec3(0.76, 0.83, 0.82), uTint, 0.22);
          vec3 mapped = mix(contourPaper, contourLight, floor(value * contourCount) / contourCount);
          mapped += mix(vec3(0.18, 0.78, 0.7), uTint, 0.45) * max(edge, contourLine * 0.38);
          color = mix(color, mapped, 0.44 + uStrength * 0.38);
        } else if (uMode == 48.0) {
          float rippleRadius = length((vUv - 0.5) * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0));
          float rippleLight = sin(rippleRadius * mix(34.0, 78.0, uBanding) - time * 1.25);
          vec3 liquid = color * mix(vec3(0.82, 0.96, 1.08), uTint * 1.22, 0.18);
          liquid += max(rippleLight, 0.0) * vec3(0.028, 0.045, 0.055) * uDistortion;
          color = mix(color, liquid, 0.34 + uStrength * 0.34);
        } else if (uMode == 49.0) {
          vec2 block = floor(vUv * vec2(mix(20.0, 64.0, uBanding), mix(14.0, 48.0, uBanding)));
          float blockSeed = hash21(block + floor(time * 3.0));
          float channelSwap = step(0.67, blockSeed);
          vec3 shiftedBlock = mix(color, color.gbr, channelSwap * (0.32 + uChannelShift * 0.42));
          float lineNoise = hash21(vec2(floor(vUv.y * 120.0), floor(time * 6.0))) - 0.5;
          shiftedBlock += lineNoise * 0.045 * uGrainAmount;
          color = mix(color, shiftedBlock * mix(vec3(1.0), uTint, 0.12), 0.46 + uStrength * 0.34);
        } else if (uMode == 50.0) {
          float broadFiber = hash21(floor(gl_FragCoord.xy * vec2(0.16, 0.7))) - 0.5;
          float fineFiber = hash21(floor(gl_FragCoord.yx * vec2(0.48, 0.21)) + 19.7) - 0.5;
          float paperValue = pow(luma(color), 0.82);
          vec3 paperBase = mix(vec3(0.88, 0.84, 0.72), uTint, 0.1);
          vec3 paperInk = mix(vec3(paperValue), color, 0.38) * paperBase * 1.18;
          paperInk += (broadFiber * 0.038 + fineFiber * 0.024) * uGrainAmount;
          color = mix(color, paperInk, 0.46 + uStrength * 0.36);
        } else if (uMode == 51.0) {
          vec2 texel = 1.0 / max(uResolution, vec2(1.0));
          vec2 fogRadius = texel * (3.0 + uDistortion * 7.0);
          vec3 fogBlur = texture2D(tDiffuse, safeUv(uv + vec2(fogRadius.x, 0.0))).rgb;
          fogBlur += texture2D(tDiffuse, safeUv(uv - vec2(fogRadius.x, 0.0))).rgb;
          fogBlur += texture2D(tDiffuse, safeUv(uv + vec2(0.0, fogRadius.y))).rgb;
          fogBlur += texture2D(tDiffuse, safeUv(uv - vec2(0.0, fogRadius.y))).rgb;
          fogBlur *= 0.25;
          float brightFog = smoothstep(0.34, 0.86, luma(fogBlur));
          float floorFog = pow(1.0 - vUv.y, 2.3) * (0.5 + 0.5 * sin(vUv.x * 8.0 + time * 0.42));
          vec3 neon = max(color, fogBlur * mix(vec3(0.15, 0.92, 0.78), uTint * 1.4, 0.52) * brightFog);
          neon += mix(vec3(0.08, 0.24, 0.3), uTint * 0.32, 0.5) * floorFog * (0.16 + uStrength * 0.3);
          color = mix(color, neon, 0.42 + uStrength * 0.34);
        } else if (uMode == 52.0) {
          vec2 echoDirection = vec2(cos(uAngleOffset), sin(uAngleOffset));
          vec2 echoOffset = echoDirection * (0.004 + uChannelShift * 0.025 + uDistortion * 0.008);
          vec3 echoA = texture2D(tDiffuse, safeUv(uv + echoOffset)).rgb;
          vec3 echoB = texture2D(tDiffuse, safeUv(uv - echoOffset * 0.72)).rgb;
          vec3 doubled = max(color * 0.72, echoA * mix(vec3(0.58, 0.86, 1.0), uTint, 0.28));
          doubled = max(doubled, echoB * vec3(0.92, 0.55, 0.7) * 0.72);
          color = mix(color, doubled, 0.34 + uStrength * 0.42);
        } else if (uMode == 53.0) {
          float scanline = 0.9 + 0.1 * sin(gl_FragCoord.y * mix(1.2, 3.6, uBanding));
          float rollPosition = fract(time * 0.075 + uAngleOffset * 0.159);
          float rollDistance = abs(fract(vUv.y - rollPosition + 0.5) - 0.5);
          float syncBar = 1.0 - smoothstep(0.008, 0.04, rollDistance);
          float analogNoise = hash21(vec2(floor(gl_FragCoord.y), floor(time * 12.0))) - 0.5;
          vec3 held = color * scanline;
          held += analogNoise * 0.045 * uGrainAmount;
          held = mix(held, uTint * max(luma(held), 0.12), syncBar * 0.24 * uStrength);
          color = mix(color, held, 0.5 + uStrength * 0.28);
        } else if (uMode == 54.0) {
          float lensFrequency = mix(80.0, 230.0, uBanding);
          float lens = 0.5 + 0.5 * sin(gl_FragCoord.x * lensFrequency / max(uResolution.x, 1.0) + uAngleOffset);
          vec3 viewA = hueShift(color, -0.22 * uColorCycle);
          vec3 viewB = hueShift(color * mix(vec3(1.0), uTint * 1.18, 0.24), 0.34 * uColorCycle);
          vec3 ridged = mix(viewA, viewB, smoothstep(0.28, 0.72, lens));
          float highlight = pow(abs(lens * 2.0 - 1.0), 10.0) * 0.045;
          color = mix(color, ridged + highlight, 0.42 + uStrength * 0.36);
        } else if (uMode == 55.0) {
          vec2 printShift = vec2(1.0, -0.65) / max(uResolution, vec2(1.0))
            * (1.0 + uChannelShift * 5.0);
          vec3 registered = vec3(
            texture2D(tDiffuse, safeUv(uv + printShift)).r,
            texture2D(tDiffuse, safeUv(uv)).g,
            texture2D(tDiffuse, safeUv(uv - printShift)).b
          );
          float printLevels = mix(5.0, 2.5, uStrength);
          vec3 flatInk = floor(registered * printLevels + 0.5) / printLevels;
          float dotNoise = hash21(floor(gl_FragCoord.xy / mix(2.0, 5.0, uBanding))) - 0.5;
          vec3 printPaper = mix(vec3(0.94, 0.88, 0.76), uTint, 0.08);
          vec3 printed = mix(printPaper, flatInk * mix(vec3(0.82, 0.9, 0.94), uTint, 0.18), 0.84);
          printed += dotNoise * 0.035 * uGrainAmount;
          color = mix(color, printed, 0.5 + uStrength * 0.34);
        } else if (uMode == 56.0) {
          float value = pow(luma(color), 0.78);
          float plateGrain = hash21(
            floor(gl_FragCoord.xy * mix(0.16, 0.48, uTextureScale)) + 17.3
          ) - 0.5;
          vec3 cyanShadow = mix(vec3(0.008, 0.055, 0.11), uTint * 0.08, 0.2);
          vec3 cyanMid = mix(vec3(0.025, 0.36, 0.58), uTint * 0.72, 0.2);
          vec3 paperWhite = vec3(0.83, 0.95, 0.92);
          vec3 cyanPlate = mix(cyanShadow, cyanMid, smoothstep(0.02, 0.68, value));
          cyanPlate = mix(cyanPlate, paperWhite, smoothstep(0.67, 0.98, value));
          cyanPlate += plateGrain * (0.012 + uSpeckleAmount * 0.042);
          color = mix(color, cyanPlate, 0.5 + uStrength * 0.36);
        } else if (uMode == 57.0) {
          float value = pow(luma(color), 0.58);
          float chroma = max(color.r, max(color.g, color.b)) - min(color.r, min(color.g, color.b));
          vec3 infraredShadow = vec3(0.045, 0.006, 0.075);
          vec3 infraredMid = mix(vec3(0.68, 0.035, 0.24), uTint * 0.86, 0.15);
          vec3 infraredHot = vec3(1.0, 0.84, 0.57);
          vec3 infraredPlate = mix(infraredShadow, infraredMid, smoothstep(0.06, 0.58, value));
          infraredPlate = mix(infraredPlate, infraredHot, smoothstep(0.56, 0.94, value));
          infraredPlate += vec3(0.12, -0.035, 0.1) * chroma * uColorBleed;
          color = mix(color, infraredPlate, 0.52 + uStrength * 0.34);
        } else if (uMode == 58.0) {
          vec2 paneCount = vec2(
            mix(13.0, 31.0, uTextureScale),
            mix(9.0, 23.0, uTextureScale)
          );
          vec2 paneCell = floor(vUv * paneCount);
          vec2 paneUv = fract(vUv * paneCount);
          float paneEdge = min(min(paneUv.x, 1.0 - paneUv.x), min(paneUv.y, 1.0 - paneUv.y));
          float lead = 1.0 - smoothstep(0.045, 0.14, paneEdge);
          float paneHue = hash21(paneCell + 6.2) - 0.5;
          vec3 glass = hueShift(color, paneHue * (1.2 + uColorBleed * 2.2));
          glass = floor(glass * 5.0 + 0.5) / 5.0;
          glass *= mix(vec3(0.86, 1.04, 1.12), uTint * 1.22, 0.18);
          glass += (1.0 - lead) * pow(luma(glass), 3.0) * 0.075 * uHighlightBloom;
          vec3 stained = mix(glass, vec3(0.018, 0.021, 0.026), lead * 0.88);
          color = mix(color, stained, 0.48 + uStrength * 0.36);
        } else if (uMode == 59.0) {
          vec2 texel = 1.0 / max(uResolution, vec2(1.0));
          vec2 bleedRadius = texel * (1.2 + uInkSpread * 7.5);
          vec3 bleed = color * 2.0;
          bleed += texture2D(tDiffuse, safeUv(uv + vec2(bleedRadius.x, 0.0))).rgb;
          bleed += texture2D(tDiffuse, safeUv(uv - vec2(bleedRadius.x, 0.0))).rgb;
          bleed += texture2D(tDiffuse, safeUv(uv + vec2(0.0, bleedRadius.y))).rgb;
          bleed += texture2D(tDiffuse, safeUv(uv - vec2(0.0, bleedRadius.y))).rgb;
          bleed /= 6.0;
          float inkValue = smoothstep(0.04, 0.92, luma(bleed));
          float feather = hash21(floor(gl_FragCoord.xy * mix(0.12, 0.42, uTextureScale))) - 0.5;
          vec3 inkPaper = mix(vec3(0.91, 0.88, 0.79), uTint, 0.08);
          vec3 liquidInk = mix(vec3(0.012, 0.018, 0.026), uTint * 0.18, 0.34);
          vec3 inkwash = mix(liquidInk, inkPaper, inkValue + feather * uInkSpread * 0.09);
          inkwash = mix(inkwash, color * inkPaper * 1.18, 0.18 + inkValue * 0.18);
          color = mix(color, inkwash, 0.5 + uStrength * 0.34);
        } else if (uMode == 60.0) {
          float dotSize = mix(3.0, 10.0, uTextureScale);
          vec2 dotCell = floor(gl_FragCoord.xy / dotSize);
          vec2 dotCenter = (dotCell + 0.5) * dotSize / max(uResolution, vec2(1.0));
          vec3 pigment = texture2D(tDiffuse, safeUv(dotCenter)).rgb;
          vec2 dotLocal = fract(gl_FragCoord.xy / dotSize) - 0.5;
          float dotRadius = mix(0.46, 0.16, luma(pigment));
          float pigmentDot = 1.0 - smoothstep(dotRadius - 0.07, dotRadius + 0.07, length(dotLocal));
          vec3 dotPaper = mix(vec3(0.93, 0.9, 0.82), uTint, 0.07);
          vec3 dotInk = pigment * mix(vec3(0.78, 0.86, 1.06), uTint * 1.1, 0.13);
          vec3 stippled = mix(dotPaper * (0.78 + luma(pigment) * 0.24), dotInk, pigmentDot);
          color = mix(color, stippled, 0.48 + uStrength * 0.36);
        } else if (uMode == 61.0) {
          float scanDensity = mix(1.25, 4.4, uBanding);
          float holoScan = 0.88 + 0.12 * sin(gl_FragCoord.y * scanDensity + time * 0.8);
          float diffraction = sin((vUv.x * 1.6 + vUv.y) * mix(45.0, 120.0, uTextureScale));
          vec3 spectralA = hueShift(color, -0.32 - uColorBleed * 0.4);
          vec3 spectralB = hueShift(color, 0.46 + uColorBleed * 0.55);
          vec3 holographic = mix(spectralA, spectralB, diffraction * 0.5 + 0.5) * holoScan;
          float holoEdge = pow(max(0.0, luma(color) - 0.52), 2.0);
          holographic += mix(vec3(0.08, 0.68, 0.82), uTint, 0.4)
            * holoEdge * (0.18 + uHighlightBloom * 0.42);
          color = mix(color, holographic, 0.44 + uStrength * 0.36);
        } else if (uMode == 62.0) {
          vec2 texel = 1.0 / max(uResolution, vec2(1.0));
          float focusSlope = sin(uAngleOffset) * 0.28;
          float focusDistance = abs((vUv.y - 0.5) + (vUv.x - 0.5) * focusSlope);
          float blurMask = smoothstep(0.08, 0.4, focusDistance);
          vec2 blurRadius = texel * (2.0 + uInkSpread * 8.0) * blurMask;
          vec3 miniature = color * 2.0;
          miniature += texture2D(tDiffuse, safeUv(uv + vec2(blurRadius.x, 0.0))).rgb;
          miniature += texture2D(tDiffuse, safeUv(uv - vec2(blurRadius.x, 0.0))).rgb;
          miniature += texture2D(tDiffuse, safeUv(uv + vec2(0.0, blurRadius.y))).rgb;
          miniature += texture2D(tDiffuse, safeUv(uv - vec2(0.0, blurRadius.y))).rgb;
          miniature /= 6.0;
          float miniatureValue = luma(miniature);
          miniature = mix(vec3(miniatureValue), miniature, 1.12 + uColorBleed * 0.18);
          miniature *= mix(vec3(1.0), uTint * 1.08, 0.08);
          color = mix(color, miniature, 0.42 + uStrength * 0.32);
        } else if (uMode == 63.0) {
          float value = pow(luma(color), 0.84);
          float plateNoise = hash21(
            floor(gl_FragCoord.xy * mix(0.09, 0.34, uTextureScale)) + 41.8
          ) - 0.5;
          float scratchSeed = hash21(vec2(floor(gl_FragCoord.x * 0.11), 91.7));
          float plateScratch = step(0.995 - uSpeckleAmount * 0.006, scratchSeed);
          float tarnish = smoothstep(0.28, 1.12, length((vUv - 0.5) * vec2(1.2, 1.0)));
          vec3 silverDark = mix(vec3(0.055, 0.052, 0.046), uTint * 0.11, 0.22);
          vec3 silverLight = vec3(0.87, 0.84, 0.74);
          vec3 silverPlate = mix(silverDark, silverLight, value);
          silverPlate += plateNoise * (0.012 + uSpeckleAmount * 0.052);
          silverPlate += plateScratch * vec3(0.14, 0.125, 0.1);
          silverPlate *= 1.0 - tarnish * (0.08 + uEdgeFade * 0.2);
          color = mix(color, silverPlate, 0.52 + uStrength * 0.34);
        } else if (uMode == 64.0) {
          float pileA = sin((gl_FragCoord.x + gl_FragCoord.y * 0.37) * mix(0.12, 0.42, uTextureScale));
          float pileB = sin((gl_FragCoord.y - gl_FragCoord.x * 0.21) * mix(0.18, 0.58, uTextureScale));
          float pile = pileA * pileB;
          float value = pow(luma(color), 0.82);
          vec3 velvetDye = mix(color * vec3(0.78, 0.62, 0.88), uTint * value, 0.32);
          velvetDye = hueShift(velvetDye, pile * uColorCycle * 0.12);
          float velvetSheen = pow(max(0.0, pile * 0.5 + 0.5), 5.0) * value;
          velvetDye += mix(vec3(0.08, 0.025, 0.12), uTint * 0.16, 0.42)
            * velvetSheen * (0.12 + uWeaveAmount * 0.28);
          color = mix(color, velvetDye, 0.46 + uStrength * 0.34);
        } else if (uMode == 65.0) {
          vec2 texel = 1.0 / max(uResolution, vec2(1.0));
          float leftValue = luma(texture2D(tDiffuse, safeUv(uv - vec2(texel.x * 2.0, 0.0))).rgb);
          float rightValue = luma(texture2D(tDiffuse, safeUv(uv + vec2(texel.x * 2.0, 0.0))).rgb);
          float downValue = luma(texture2D(tDiffuse, safeUv(uv - vec2(0.0, texel.y * 2.0))).rgb);
          float upValue = luma(texture2D(tDiffuse, safeUv(uv + vec2(0.0, texel.y * 2.0))).rgb);
          float drawingEdge = smoothstep(0.025, 0.17, abs(leftValue - rightValue) + abs(downValue - upValue));
          float gridScale = mix(18.0, 54.0, uTextureScale);
          vec2 gridUv = abs(fract(vUv * gridScale) - 0.5);
          float drawingGrid = 1.0 - smoothstep(0.46, 0.495, max(gridUv.x, gridUv.y));
          vec3 blueprintPaper = mix(vec3(0.012, 0.12, 0.26), uTint * 0.24, 0.24);
          vec3 blueprintInk = vec3(0.78, 0.96, 1.0);
          vec3 drafted = blueprintPaper + blueprintInk * drawingEdge * (0.56 + uStrength * 0.42);
          drafted += mix(vec3(0.07, 0.42, 0.62), uTint * 0.3, 0.25) * drawingGrid * 0.18;
          drafted += blueprintInk * luma(color) * 0.12;
          color = mix(color, drafted, 0.5 + uStrength * 0.34);
        } else if (uMode == 66.0) {
          vec2 shadowDirection = vec2(cos(uAngleOffset), sin(uAngleOffset));
          vec2 shadowOffset = shadowDirection * (0.004 + uColorBleed * 0.026);
          vec3 shadowA = texture2D(tDiffuse, safeUv(uv + shadowOffset)).rgb;
          vec3 shadowB = texture2D(tDiffuse, safeUv(uv - shadowOffset * 0.8)).rgb;
          vec3 shadowC = texture2D(tDiffuse, safeUv(uv + shadowOffset.yx * vec2(-0.55, 0.55))).rgb;
          vec3 prismCast = color * 0.74;
          prismCast += shadowA * vec3(0.42, 0.03, 0.08) * (0.18 + uColorBleed * 0.35);
          prismCast += shadowB * vec3(0.02, 0.36, 0.46) * (0.18 + uColorBleed * 0.35);
          prismCast += shadowC * vec3(0.28, 0.08, 0.5) * (0.12 + uColorBleed * 0.28);
          prismCast *= mix(vec3(1.0), uTint * 1.12, 0.1);
          color = mix(color, prismCast, 0.46 + uStrength * 0.34);
        } else if (uMode == 67.0) {
          vec2 texel = 1.0 / max(uResolution, vec2(1.0));
          vec2 waxRadius = texel * (1.5 + uInkSpread * 6.0);
          vec3 waxSoft = color * 2.0;
          waxSoft += texture2D(tDiffuse, safeUv(uv + waxRadius)).rgb;
          waxSoft += texture2D(tDiffuse, safeUv(uv - waxRadius)).rgb;
          waxSoft += texture2D(tDiffuse, safeUv(uv + vec2(waxRadius.x, -waxRadius.y))).rgb;
          waxSoft += texture2D(tDiffuse, safeUv(uv + vec2(-waxRadius.x, waxRadius.y))).rgb;
          waxSoft /= 6.0;
          float waxLevels = mix(9.0, 4.0, uInkSpread);
          waxSoft = floor(waxSoft * waxLevels + 0.5) / waxLevels;
          float waxPool = 0.5 + 0.5 * sin((vUv.x * 0.8 + vUv.y) * mix(18.0, 44.0, uTextureScale));
          waxSoft *= mix(vec3(1.04, 0.92, 0.78), uTint * 1.15, 0.18);
          waxSoft += pow(waxPool, 8.0) * 0.055 * uHighlightBloom;
          color = mix(color, waxSoft, 0.46 + uStrength * 0.34);
        } else if (uMode == 68.0) {
          vec2 snowGrid = vec2(
            mix(34.0, 78.0, uTextureScale),
            mix(24.0, 58.0, uTextureScale)
          );
          vec2 snowUv = vec2(
            vUv.x + sin(time * 0.08 + vUv.y * 9.0) * 0.008,
            fract(vUv.y + time * 0.018)
          );
          vec2 snowCell = floor(snowUv * snowGrid);
          vec2 snowLocal = fract(snowUv * snowGrid);
          vec2 flakeCenter = vec2(hash21(snowCell + 2.4), hash21(snowCell.yx + 7.6));
          float flake = 1.0 - smoothstep(0.045, 0.16, distance(snowLocal, flakeCenter));
          flake *= step(0.78 - uSpeckleAmount * 0.18, hash21(snowCell + 19.2));
          vec2 globeCenter = (vUv - 0.5) * vec2(aspect, 1.0);
          float globeRadius = length(globeCenter);
          float glassRim = 1.0 - smoothstep(0.012, 0.055, abs(globeRadius - 0.48));
          vec3 globeGlass = color * mix(vec3(0.86, 0.95, 1.08), uTint * 1.18, 0.16);
          globeGlass += vec3(0.88, 0.96, 1.0) * flake * (0.12 + uSpeckleAmount * 0.34);
          globeGlass += vec3(0.42, 0.68, 0.82) * glassRim * (0.08 + uHighlightBloom * 0.16);
          color = mix(color, globeGlass, 0.42 + uStrength * 0.34);
        } else if (uMode == 69.0) {
          vec2 texel = 1.0 / max(uResolution, vec2(1.0));
          vec3 streak = vec3(0.0);
          streak += texture2D(tDiffuse, safeUv(uv + vec2(texel.x * 5.0, 0.0))).rgb;
          streak += texture2D(tDiffuse, safeUv(uv - vec2(texel.x * 5.0, 0.0))).rgb;
          streak += texture2D(tDiffuse, safeUv(uv + vec2(texel.x * 13.0, 0.0))).rgb;
          streak += texture2D(tDiffuse, safeUv(uv - vec2(texel.x * 13.0, 0.0))).rgb;
          streak *= 0.25;
          float streakBright = smoothstep(0.48, 0.9, luma(streak));
          vec3 coolStreak = streak * mix(vec3(0.18, 0.62, 1.0), uTint * 1.3, 0.36);
          vec3 warmStreak = streak * vec3(1.0, 0.42, 0.14);
          vec3 anamorphicLight = color;
          anamorphicLight += mix(coolStreak, warmStreak, vUv.x)
            * streakBright * (0.16 + uHighlightBloom * 0.72);
          color = mix(color, anamorphicLight, 0.56 + uStrength * 0.24);
        } else if (uMode == 70.0) {
          float value = luma(color);
          float chroma = max(color.r, max(color.g, color.b)) - min(color.r, min(color.g, color.b));
          float fluorescence = smoothstep(0.08, 0.72, chroma + value * 0.28);
          vec3 uvShadow = mix(vec3(0.018, 0.004, 0.06), uTint * 0.08, 0.2);
          vec3 uvCyan = vec3(0.02, 0.82, 0.92);
          vec3 uvMagenta = vec3(0.94, 0.035, 0.68);
          vec3 fluorescentInk = mix(uvCyan, uvMagenta, smoothstep(0.22, 0.8, color.r + color.b));
          vec3 blacklight = mix(uvShadow, fluorescentInk, fluorescence);
          blacklight += fluorescentInk * pow(value, 3.0) * (0.08 + uHighlightBloom * 0.24);
          blacklight = hueShift(blacklight, (color.g - color.r) * uColorBleed * 0.32);
          color = mix(color, blacklight, 0.5 + uStrength * 0.34);
        } else if (uMode == 71.0) {
          float threadScale = mix(0.28, 0.86, uTextureScale);
          float warp = 0.5 + 0.5 * sin(gl_FragCoord.x * threadScale);
          float weft = 0.5 + 0.5 * sin(gl_FragCoord.y * threadScale * 0.82);
          float overUnder = step(0.5, fract(
            floor(gl_FragCoord.x * threadScale / 3.14159) * 0.5 +
            floor(gl_FragCoord.y * threadScale / 3.14159) * 0.5
          ));
          float threadLight = mix(warp, weft, overUnder);
          float fiberNoise = hash21(floor(gl_FragCoord.xy * vec2(0.7, 0.18))) - 0.5;
          vec3 textile = floor(color * mix(9.0, 5.0, uWeaveAmount) + 0.5)
            / mix(9.0, 5.0, uWeaveAmount);
          textile *= 0.88 + threadLight * (0.08 + uWeaveAmount * 0.18);
          textile += fiberNoise * uSpeckleAmount * 0.024;
          textile *= mix(vec3(1.0), uTint * 1.12, 0.1 + uWeaveAmount * 0.08);
          color = mix(color, textile, 0.48 + uStrength * 0.34);
        }

        float frameDistance = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0;
        float frameEdge = smoothstep(0.46, 1.0, frameDistance);
        float effectiveEdgeFade = uEdgeFade * mix(1.0, 0.35, uHighVisibility);
        color *= mix(1.0, 1.0 - effectiveEdgeFade * 0.28, frameEdge);

        if (
          uMode == 4.0 || uMode == 5.0 || uMode == 9.0 ||
          uMode == 12.0 || uMode == 15.0 || uMode == 35.0 ||
          uMode == 44.0 || uMode == 46.0 || uMode == 53.0
        ) {
          vec2 centered = vUv * 2.0 - 1.0;
          float vignette = 1.0 - smoothstep(0.35, 1.35, dot(centered, centered));
          float vignetteStrength = (0.35 + uStrength * 0.25) * mix(1.0, 0.4, uHighVisibility);
          color *= mix(1.0, vignette, vignetteStrength);
        }

        // Preserve mood without allowing a treatment to erase navigation detail.
        float targetShadow = (
          uMode == 4.0 || uMode == 5.0 || uMode == 12.0 || uMode == 15.0 ||
          uMode == 35.0 || uMode == 44.0 || uMode == 46.0 || uMode == 53.0
        ) ? 0.17 : 0.13;
        targetShadow = mix(targetShadow, 0.27, uHighVisibility);
        float shadowLift = max(0.0, targetShadow - luma(color));
        color += vec3(shadowLift * 0.9);

        gl_FragColor = vec4(clamp(color, vec3(0.0), vec3(1.3)), 1.0);
      }
    `,
  });
  private active = false;
  private readonly maxPixelRatio: number;

  constructor(maxPixelRatio = 1.5) {
    this.maxPixelRatio = maxPixelRatio;
    this.camera.position.z = 1;
    const quad = new THREE.Mesh(this.geometry, this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  setProfile(visuals?: RoomVisuals): void {
    this.active = Boolean(visuals && visuals.shader !== 'none');
    // Defensive: a stale cached room or a drifted shader map must not upload
    // undefined (NaN) into the shader. Fall back to the identity pass.
    this.material.uniforms.uMode!.value = visuals ? MODE[visuals.shader] ?? 0 : 0;
    this.material.uniforms.uTint!.value.set(visuals?.tint ?? '#ffffff');
    this.material.uniforms.uStrength!.value = visuals?.effectStrength ?? 0;
    this.material.uniforms.uPixelSize!.value = visuals?.pixelSize ?? 4;
    this.material.uniforms.uHighVisibility!.value = visuals?.highVisibility ? 1 : 0;
    this.material.uniforms.uMotionSpeed!.value = visuals?.motionSpeed ?? 0.5;
    this.material.uniforms.uDistortion!.value = visuals?.distortion ?? 0;
    this.material.uniforms.uColorCycle!.value = visuals?.colorCycle ?? 0;
    this.material.uniforms.uViewScale!.value = visuals?.viewScale ?? 1;
    this.material.uniforms.uSegments!.value = visuals?.mirrorSegments ?? 4;
    this.material.uniforms.uRotationSpeed!.value = visuals?.rotationSpeed ?? 0;
    this.material.uniforms.uAngleOffset!.value = visuals?.angleOffset ?? 0;
    this.material.uniforms.uFlashStrength!.value = visuals?.flashStrength ?? 0;
    this.material.uniforms.uFlashingDisabled!.value = visuals?.flashingDisabled ? 1 : 0;
    this.material.uniforms.uGrainAmount!.value = visuals?.grainAmount ?? 0;
    this.material.uniforms.uChannelShift!.value = visuals?.channelShift ?? 0;
    this.material.uniforms.uEdgeFade!.value = visuals?.edgeFade ?? 0;
    this.material.uniforms.uBanding!.value = visuals?.banding ?? 0;
    this.material.uniforms.uTextureScale!.value = visuals?.textureScale ?? 0;
    this.material.uniforms.uInkSpread!.value = visuals?.inkSpread ?? 0;
    this.material.uniforms.uHighlightBloom!.value = visuals?.highlightBloom ?? 0;
    this.material.uniforms.uColorBleed!.value = visuals?.colorBleed ?? 0;
    this.material.uniforms.uSpeckleAmount!.value = visuals?.speckleAmount ?? 0;
    this.material.uniforms.uWeaveAmount!.value = visuals?.weaveAmount ?? 0;
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    // The main scene may use 2x DPR; cap the optional effect buffer lower for
    // integrated GPUs and let the canvas upscale the final pass.
    const ratio = Math.min(Math.max(pixelRatio, 0.5), this.maxPixelRatio);
    const renderWidth = Math.max(1, Math.floor(width * ratio));
    const renderHeight = Math.max(1, Math.floor(height * ratio));
    this.target.setSize(renderWidth, renderHeight);
    this.material.uniforms.uResolution!.value.set(renderWidth, renderHeight);
  }

  render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    timeSeconds: number,
  ): void {
    if (!this.active) {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      return;
    }

    renderer.setRenderTarget(this.target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    this.material.uniforms.uTime!.value = timeSeconds;
    renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.target.dispose();
    this.geometry.dispose();
    this.material.dispose();
    this.scene.clear();
  }
}
