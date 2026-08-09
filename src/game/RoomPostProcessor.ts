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
};

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
        }

        bool pixelated = uMode == 1.0 || uMode == 5.0 || uMode == 12.0 || uMode == 18.0 || uMode == 29.0;
        if (pixelated) {
          vec2 cells = max(uResolution / max(2.0, uPixelSize), vec2(1.0));
          uv = (floor(uv * cells) + 0.5) / cells;
        }

        vec2 radial = normalize((uv - 0.5) + vec2(0.0001, 0.0));
        vec2 offset = radial * (0.0012 + uDistortion * 0.006) * uStrength;
        vec3 color;
        if (
          uMode == 3.0 || uMode == 5.0 || uMode == 8.0 ||
          uMode == 11.0 || uMode == 12.0 || uMode == 15.0 || uMode == 23.0 ||
          uMode == 25.0 || uMode == 28.0 || uMode == 29.0 || uMode == 30.0 ||
          uMode == 31.0 || uMode == 34.0
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
        }

        if (
          uMode == 4.0 || uMode == 5.0 || uMode == 9.0 ||
          uMode == 12.0 || uMode == 15.0 || uMode == 35.0
        ) {
          vec2 centered = vUv * 2.0 - 1.0;
          float vignette = 1.0 - smoothstep(0.35, 1.35, dot(centered, centered));
          float vignetteStrength = (0.35 + uStrength * 0.25) * mix(1.0, 0.4, uHighVisibility);
          color *= mix(1.0, vignette, vignetteStrength);
        }

        // Preserve mood without allowing a treatment to erase navigation detail.
        float targetShadow = (
          uMode == 4.0 || uMode == 5.0 || uMode == 12.0 || uMode == 15.0 ||
          uMode == 35.0
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
    this.material.uniforms.uMode!.value = visuals ? MODE[visuals.shader] : 0;
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
