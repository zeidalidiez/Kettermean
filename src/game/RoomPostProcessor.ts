import * as THREE from 'three';
import type { RoomVisuals } from '../types';

const MODE: Record<RoomVisuals['shader'], number> = {
  none: 0,
  retro: 1,
  tint: 2,
  dream: 3,
  noir: 4,
  crt: 5,
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
      varying vec2 vUv;

      float luma(vec3 color) {
        return dot(color, vec3(0.2126, 0.7152, 0.0722));
      }

      vec2 safeUv(vec2 uv) {
        return clamp(uv, vec2(0.002), vec2(0.998));
      }

      void main() {
        vec2 uv = vUv;
        bool pixelated = uMode == 1.0 || uMode == 5.0;
        if (pixelated) {
          vec2 cells = max(uResolution / max(2.0, uPixelSize), vec2(1.0));
          uv = (floor(uv * cells) + 0.5) / cells;
        }

        if (uMode == 3.0) {
          uv.x += sin(uv.y * 18.0 + uTime * 0.65) * 0.0035 * uStrength;
          uv.y += cos(uv.x * 13.0 - uTime * 0.42) * 0.0025 * uStrength;
        }

        vec2 offset = vec2(1.5 / max(uResolution.x, 1.0), 0.0) * uStrength;
        vec3 color;
        if (uMode == 3.0 || uMode == 5.0) {
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
        }

        if (uMode == 4.0 || uMode == 5.0) {
          vec2 centered = vUv * 2.0 - 1.0;
          float vignette = 1.0 - smoothstep(0.35, 1.35, dot(centered, centered));
          color *= mix(1.0, vignette, 0.35 + uStrength * 0.25);
        }

        // Preserve mood without allowing a treatment to erase navigation detail.
        float shadowLift = max(0.0, 0.09 - luma(color));
        color += vec3(shadowLift * 0.86);

        gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
      }
    `,
  });
  private active = false;

  constructor() {
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
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    // The main scene may use 2x DPR; cap the optional effect buffer lower for
    // integrated GPUs and let the canvas upscale the final pass.
    const ratio = Math.min(Math.max(pixelRatio, 0.5), 1.5);
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
