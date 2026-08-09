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
        }

        bool pixelated = uMode == 1.0 || uMode == 5.0 || uMode == 12.0;
        if (pixelated) {
          vec2 cells = max(uResolution / max(2.0, uPixelSize), vec2(1.0));
          uv = (floor(uv * cells) + 0.5) / cells;
        }

        vec2 radial = normalize((uv - 0.5) + vec2(0.0001, 0.0));
        vec2 offset = radial * (0.0012 + uDistortion * 0.006) * uStrength;
        vec3 color;
        if (
          uMode == 3.0 || uMode == 5.0 || uMode == 8.0 ||
          uMode == 11.0 || uMode == 12.0 || uMode == 15.0
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
        }

        if (
          uMode == 4.0 || uMode == 5.0 || uMode == 9.0 ||
          uMode == 12.0 || uMode == 15.0
        ) {
          vec2 centered = vUv * 2.0 - 1.0;
          float vignette = 1.0 - smoothstep(0.35, 1.35, dot(centered, centered));
          float vignetteStrength = (0.35 + uStrength * 0.25) * mix(1.0, 0.4, uHighVisibility);
          color *= mix(1.0, vignette, vignetteStrength);
        }

        // Preserve mood without allowing a treatment to erase navigation detail.
        float targetShadow = (
          uMode == 4.0 || uMode == 5.0 || uMode == 12.0 || uMode == 15.0
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
