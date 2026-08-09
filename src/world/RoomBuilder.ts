import * as THREE from 'three';
import { PLAYER } from '../config';
import { SeededRng } from '../core/rng';
import type {
  BuiltRoom,
  ColliderBox,
  RoomEntity,
  RoomProp,
  RoomSpec,
  RoomVisuals,
  Vec3,
} from '../types';
import { clearMaterialCaches, plainMaterial, styleForMood, surfaceMaterial } from './materials';
import {
  boundsForKind,
  buildModel,
  clearModelMaterialCache,
  kindFromLabel,
  type PropKind,
} from './models';

interface LiveEntity {
  mesh: THREE.Object3D;
  data: RoomEntity;
  origin: THREE.Vector3;
  phase: number;
}

interface PulsingLight {
  light: THREE.Light;
  baseIntensity: number;
  amplitude: number;
  speed: number;
  phase: number;
}

interface LightingProfile {
  primary: string;
  ambient: string;
  ground: string;
  stripCount: number;
  stripIntensity: number;
  pointIntensity: number;
  ambientIntensity: number;
  hemiIntensity: number;
  keyIntensity: number;
  fillIntensity: number;
  pulseAmplitude: number;
  pulseSpeed: number;
}

export class RoomWorld {
  readonly group = new THREE.Group();
  private colliders: ColliderBox[] = [];
  private linkTriggers: ColliderBox[] = [];
  private spawn: Vec3 = { x: 0, y: PLAYER.eyeHeight, z: 0 };
  private liveEntities: LiveEntity[] = [];
  private fog: THREE.Fog | null = null;
  private lights: THREE.Light[] = [];
  private pulsingLights: PulsingLight[] = [];
  private spec: RoomSpec | null = null;

  build(spec: RoomSpec, scene: THREE.Scene): BuiltRoom {
    this.dispose(scene);
    this.spec = spec;
    this.group.name = `room-${spec.seed}`;

    const halfW = spec.width / 2;
    const halfD = spec.depth / 2;
    const h = spec.height;
    const wallT = 0.35;
    const seedKey = spec.seed;
    const tags = spec.themeTags ?? [];
    const visuals = spec.visuals ?? defaultVisuals();
    const lighting = lightingProfile(visuals, spec.palette);
    const outdoor = spec.environment === 'outdoor';

    const floorMat = surfaceMaterial(styleForMood('floor', spec.mood, tags), spec.palette.floor, seedKey);
    const ceilMat = surfaceMaterial(styleForMood('ceiling', spec.mood, tags), spec.palette.ceiling, seedKey);
    const wallMat = surfaceMaterial(styleForMood('wall', spec.mood, tags), spec.palette.walls, seedKey);
    const trimMat = plainMaterial(spec.palette.accent, 0.55, 0.15);
    const baseMat = plainMaterial('#3a342c', 0.85, 0.05);

    // Floor / ceiling
    const floor = new THREE.Mesh(new THREE.BoxGeometry(spec.width, 0.25, spec.depth), floorMat);
    floor.position.y = -0.125;
    floor.receiveShadow = true;
    this.group.add(floor);
    this.addCollider({
      minX: -halfW,
      maxX: halfW,
      minY: -0.3,
      maxY: 0,
      minZ: -halfD,
      maxZ: halfD,
      label: 'floor',
    });

    if (!outdoor) {
      const ceiling = new THREE.Mesh(new THREE.BoxGeometry(spec.width, 0.2, spec.depth), ceilMat);
      ceiling.position.y = h;
      this.group.add(ceiling);
      this.addCollider({
        minX: -halfW,
        maxX: halfW,
        minY: h - 0.02,
        maxY: h + 0.2,
        minZ: -halfD,
        maxZ: halfD,
        label: 'ceiling',
      });
    }

    // Baseboards + crown around the room for architectural readability
    const ring = (
      y: number,
      thickness: number,
      depth: number,
      material: THREE.Material,
    ): void => {
      const north = new THREE.Mesh(new THREE.BoxGeometry(spec.width, thickness, depth), material);
      north.position.set(0, y, -halfD + depth * 0.5);
      const south = north.clone();
      south.position.z = halfD - depth * 0.5;
      const east = new THREE.Mesh(new THREE.BoxGeometry(depth, thickness, spec.depth), material);
      east.position.set(halfW - depth * 0.5, y, 0);
      const west = east.clone();
      west.position.x = -halfW + depth * 0.5;
      this.group.add(north, south, east, west);
    };
    if (!outdoor) {
      ring(0.08, 0.16, 0.08, baseMat);
      ring(h - 0.1, 0.1, 0.07, trimMat);
    }

    const walls: Array<'north' | 'south' | 'east' | 'west'> = [
      'north',
      'south',
      'east',
      'west',
    ];

    for (const side of walls) {
      if (outdoor) {
        this.addCollider(wallCollider(side, halfW, halfD, h, wallT, false), `boundary:${side}`);
        continue;
      }
      const mesh =
        side === 'north' || side === 'south'
          ? new THREE.Mesh(new THREE.BoxGeometry(spec.width + wallT, h, wallT), wallMat)
          : new THREE.Mesh(new THREE.BoxGeometry(wallT, h, spec.depth + wallT), wallMat);
      placeWall(mesh, side, halfW, halfD, h / 2);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      // Walls are solid only — never room links. Doors are the only teleports.
      this.addCollider(wallCollider(side, halfW, halfD, h, wallT, false), `wall:${side}`);

      // Fake window / panel insets so walls aren't flat slabs
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(
          side === 'north' || side === 'south' ? Math.min(2.4, spec.width * 0.25) : 0.06,
          Math.min(1.6, h * 0.45),
          side === 'east' || side === 'west' ? Math.min(2.4, spec.depth * 0.25) : 0.06,
        ),
        plainMaterial(spec.palette.light, 0.35, 0.05, spec.palette.light, 0.25),
      );
      placeWall(panel, side, halfW - 0.05, halfD - 0.05, h * 0.55);
      this.group.add(panel);
    }

    if (outdoor) this.addOutdoorSky(spec);

    for (const prop of spec.props) {
      this.addProp(prop);
    }
    for (const ent of spec.entities) {
      this.addEntity(ent);
    }

    // Visible fixtures and real light sources change character with each room.
    const span = Math.max(spec.width, spec.depth);
    const fixtureCount = outdoor
      ? 0
      : Math.min(10, lighting.stripCount + Math.floor(span / 18));
    const fixtureColumns = Math.max(1, Math.ceil(Math.sqrt(fixtureCount)));
    const fixtureRows = Math.max(1, Math.ceil(fixtureCount / fixtureColumns));
    for (let i = 0; i < fixtureCount; i += 1) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(Math.min(4.2, spec.width * 0.28), 0.06, 0.4),
        new THREE.MeshStandardMaterial({
          color: lighting.primary,
          emissive: new THREE.Color(lighting.primary),
          emissiveIntensity: lighting.stripIntensity,
          roughness: 0.35,
        }),
      );
      const column = i % fixtureColumns;
      const row = Math.floor(i / fixtureColumns);
      const x =
        fixtureColumns === 1
          ? 0
          : (column / (fixtureColumns - 1) - 0.5) * Math.min(spec.width * 0.68, 32);
      const z =
        fixtureRows === 1
          ? 0
          : (row / (fixtureRows - 1) - 0.5) * Math.min(spec.depth * 0.62, 28);
      strip.position.set(x, h - 0.12, z);
      this.group.add(strip);

      const bulb = new THREE.PointLight(
        lighting.primary,
        lighting.pointIntensity,
        span * 1.35,
        1.6,
      );
      bulb.position.set(x, h - 0.35, z);
      this.lights.push(bulb);
      if (lighting.pulseAmplitude > 0) {
        this.pulsingLights.push({
          light: bulb,
          baseIntensity: lighting.pointIntensity,
          amplitude: lighting.pulseAmplitude,
          speed: lighting.pulseSpeed,
          phase: stablePhase(`${spec.seed}:light:${i}`),
        });
      }
    }

    const ambient = new THREE.AmbientLight(
      lighting.ambient,
      lighting.ambientIntensity * (outdoor ? 1.15 : 1),
    );
    const hemi = new THREE.HemisphereLight(
      lighting.primary,
      lighting.ground,
      lighting.hemiIntensity * (outdoor ? 1.35 : 1),
    );
    const key = new THREE.DirectionalLight(
      lighting.primary,
      lighting.keyIntensity * (outdoor ? 1.4 : 1),
    );
    key.position.set(halfW * 0.35, h * (outdoor ? 1.6 : 0.9), halfD * 0.25);
    const fill = new THREE.DirectionalLight(
      lighting.ambient,
      lighting.fillIntensity * (outdoor ? 1.4 : 1),
    );
    fill.position.set(-halfW * 0.5, h * 0.6, -halfD * 0.3);
    this.lights.push(ambient, hemi, key, fill);
    for (const l of this.lights) scene.add(l);

    this.fog = new THREE.Fog(spec.palette.fog, Math.max(8, spec.fogNear), Math.max(spec.fogFar, spec.fogNear + 18));
    scene.fog = this.fog;
    scene.background = new THREE.Color(spec.palette.fog);

    if (visuals.wireframe) setWireframe(this.group, lighting.primary);
    scene.add(this.group);
    this.spawn = findSafeSpawn(this.colliders, halfW, halfD);

    return {
      spec,
      colliders: [...this.colliders],
      spawn: { ...this.spawn },
      linkTriggers: [...this.linkTriggers],
    };
  }

  update(dt: number, playerPos: THREE.Vector3): void {
    for (const pulse of this.pulsingLights) {
      pulse.phase += dt * pulse.speed;
      pulse.light.intensity =
        pulse.baseIntensity * (1 + Math.sin(pulse.phase) * pulse.amplitude);
    }

    for (const ent of this.liveEntities) {
      ent.phase += dt * (ent.data.speed ?? 1);
      const m = ent.mesh;
      switch (ent.data.behavior) {
        case 'wander': {
          m.position.x = ent.origin.x + Math.sin(ent.phase * 0.7) * 2.2;
          m.position.z = ent.origin.z + Math.cos(ent.phase * 0.55) * 2.2;
          m.rotation.y = ent.phase * 0.4;
          break;
        }
        case 'orbit': {
          const r = 2.5;
          m.position.x = ent.origin.x + Math.cos(ent.phase) * r;
          m.position.z = ent.origin.z + Math.sin(ent.phase) * r;
          m.lookAt(ent.origin.x, m.position.y, ent.origin.z);
          break;
        }
        case 'stare': {
          m.lookAt(playerPos.x, m.position.y, playerPos.z);
          m.position.y = ent.origin.y + Math.sin(ent.phase * 1.3) * 0.08;
          break;
        }
        default: {
          m.position.y = ent.origin.y + Math.sin(ent.phase * 0.8) * 0.05;
          break;
        }
      }

      // Entities never act as room links.
    }
  }

  getColliders(): ColliderBox[] {
    // colliders includes solids + door link triggers
    return this.colliders;
  }

  getAllLinkables(): ColliderBox[] {
    return this.getColliders().filter((c) => c.linksOnTouch);
  }

  getSpawn(): Vec3 {
    return { ...this.spawn };
  }

  getSpec(): RoomSpec | null {
    return this.spec;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.group);
    const materials = new Set<THREE.Material>();
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Light) obj.dispose();
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        for (const material of mesh.material) materials.add(material);
      } else if (mesh.material) {
        materials.add(mesh.material);
      }
    });
    for (const material of materials) material.dispose();
    this.group.clear();
    clearMaterialCaches();
    clearModelMaterialCache();
    for (const l of this.lights) {
      scene.remove(l);
      l.dispose?.();
    }
    this.lights = [];
    this.pulsingLights = [];
    this.colliders = [];
    this.linkTriggers = [];
    this.liveEntities = [];
    this.fog = null;
    this.spec = null;
    if (scene.fog) scene.fog = null;
  }

  private addOutdoorSky(spec: RoomSpec): void {
    const radius = Math.max(spec.width, spec.depth) * 2.2 + 35;
    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      uniforms: {
        uTop: { value: new THREE.Color(spec.palette.ceiling) },
        uHorizon: { value: new THREE.Color(spec.palette.fog) },
        uGlow: { value: new THREE.Color(spec.palette.light) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform vec3 uTop;
        uniform vec3 uHorizon;
        uniform vec3 uGlow;
        varying vec3 vDirection;
        void main() {
          float heightMix = smoothstep(-0.12, 0.78, vDirection.y);
          vec3 color = mix(uHorizon, uTop, heightMix);
          float band = exp(-pow((vDirection.y - 0.04) * 7.0, 2.0));
          color = mix(color, uGlow, band * 0.12);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 36, 20), skyMaterial);
    dome.name = 'procedural-sky-dome';
    dome.userData.keepSolid = true;
    this.group.add(dome);

    const rng = new SeededRng(`${spec.seed}:outdoor-sky`);
    const starPositions: number[] = [];
    for (let index = 0; index < 180; index += 1) {
      const angle = rng.float(0, Math.PI * 2);
      const y = rng.float(0.08, 0.96);
      const horizontal = Math.sqrt(Math.max(0, 1 - y * y));
      starPositions.push(
        Math.cos(angle) * horizontal * radius * 0.9,
        y * radius * 0.9,
        Math.sin(angle) * horizontal * radius * 0.9,
      );
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: spec.palette.light,
        size: Math.max(0.16, radius * 0.004),
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.72,
        fog: false,
        toneMapped: false,
      }),
    );
    stars.name = 'procedural-stars';
    stars.userData.keepSolid = true;
    this.group.add(stars);

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(1.5, radius * 0.035), 20, 12),
      new THREE.MeshBasicMaterial({
        color: spec.palette.light,
        fog: false,
        toneMapped: false,
      }),
    );
    moon.position.set(radius * 0.48, radius * 0.52, -radius * 0.52);
    moon.name = 'sky-orb';
    moon.userData.keepSolid = true;
    this.group.add(moon);

    const horizonMaterial = new THREE.MeshStandardMaterial({
      color: spec.palette.ambient,
      roughness: 1,
      metalness: 0,
    });
    const horizonDistance = Math.max(spec.width, spec.depth) * 0.74;
    for (let index = 0; index < 24; index += 1) {
      const angle = (index / 24) * Math.PI * 2 + rng.float(-0.08, 0.08);
      const height = rng.float(2.5, Math.min(13, spec.height * 0.72));
      const width = rng.float(2.5, 8.5);
      const depth = rng.float(2.5, 6.5);
      const geometry = rng.chance(0.34)
        ? new THREE.ConeGeometry(width * 0.52, height, rng.int(5, 9))
        : new THREE.BoxGeometry(width, height, depth);
      const silhouette = new THREE.Mesh(geometry, horizonMaterial);
      silhouette.position.set(
        Math.cos(angle) * horizonDistance,
        height * 0.5 - 0.05,
        Math.sin(angle) * horizonDistance,
      );
      silhouette.rotation.y = -angle + rng.float(-0.3, 0.3);
      silhouette.name = 'horizon-silhouette';
      this.group.add(silhouette);
    }
  }

  private addProp(prop: RoomProp): void {
    const kind = resolveKind(prop.kind, prop.label);
    const mesh = buildModel(kind, prop.color || '#6a7a8a', prop.color || '#c4b59a');
    scaleModelToBounds(mesh, kind, prop.scale);
    // Models are feet-origin; keep y at floor unless explicitly elevated.
    mesh.position.set(prop.position.x, Math.max(0, prop.position.y), prop.position.z);
    mesh.rotation.y = prop.rotationY ?? 0;
    this.group.add(mesh);

    const box = feetBounds(mesh.position, prop.scale, prop.rotationY ?? 0);
    const isPortal = kind === 'door_fake' || Boolean(prop.linksOnTouch && /door|portal|exit/i.test(prop.label));
    if (isPortal) {
      this.addPortalBeacon(prop);
      // Slightly generous door trigger so players can walk through painted exits.
      const doorBox = expandBox(box, 0.25, 0.1, 0.35);
      this.addLinkTrigger(doorBox, `door:${prop.id || prop.label}`);
      if (prop.solid !== false) this.addCollider({ ...box, linksOnTouch: false, label: prop.label });
    } else if (prop.solid !== false) {
      this.addCollider({ ...box, linksOnTouch: false, label: prop.label });
    }
  }

  private addEntity(ent: RoomEntity): void {
    const kind = resolveKind(ent.kind, ent.label);
    const mesh = buildModel(kind, ent.color || '#6a7a8a', ent.color || '#c4b59a');
    scaleModelToBounds(mesh, kind, ent.scale);
    mesh.position.set(ent.position.x, Math.max(0, ent.position.y), ent.position.z);
    this.group.add(mesh);
    this.liveEntities.push({
      mesh,
      data: ent,
      origin: mesh.position.clone(),
      phase: stablePhase(ent.id),
    });
    // NPCs/creatures are moving atmosphere. Static AABBs at their origins would
    // become invisible blockers as soon as the model moved away.
  }

  /** Exit readability is an invariant: these markers ignore fog and room lighting. */
  private addPortalBeacon(prop: RoomProp): void {
    const color = this.spec?.palette.light ?? '#f4fbff';
    const frame = new THREE.Group();
    frame.name = `portal-beacon-${prop.id}`;
    frame.position.set(prop.position.x, Math.max(0, prop.position.y), prop.position.z);
    frame.rotation.y = prop.rotationY ?? 0;

    const width = Math.max(1, prop.scale.x);
    const height = Math.max(2, prop.scale.y);
    const depth = Math.max(0.12, prop.scale.z + 0.08);
    const thickness = Math.max(0.07, Math.min(0.13, width * 0.08));
    const material = new THREE.MeshBasicMaterial({
      color,
      toneMapped: false,
      fog: false,
    });
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      toneMapped: false,
      fog: false,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    const bar = (w: number, h: number, d: number, x: number, y: number): THREE.Mesh => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, 0);
      mesh.userData.keepSolid = true;
      return mesh;
    };
    frame.add(
      bar(thickness, height + thickness, depth, -width * 0.5 - thickness * 0.5, height * 0.5),
      bar(thickness, height + thickness, depth, width * 0.5 + thickness * 0.5, height * 0.5),
      bar(width + thickness * 2, thickness, depth, 0, height + thickness * 0.5),
    );

    const header = bar(Math.max(0.65, width * 0.58), 0.13, depth + 0.04, 0, height + 0.3);
    frame.add(header);
    for (const z of [-0.72, 0.72]) {
      const marker = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.48, 24), glowMaterial);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(0, 0.025, z);
      marker.userData.keepSolid = true;
      frame.add(marker);
    }

    const light = new THREE.PointLight(color, 3.2, 9, 1.4);
    light.position.set(0, Math.min(height - 0.2, 1.8), 0.65);
    frame.add(light);
    this.group.add(frame);
  }

  private addCollider(box: ColliderBox, label?: string): void {
    this.colliders.push({ ...box, label: label ?? box.label });
  }

  private addLinkTrigger(box: ColliderBox, label: string): void {
    const trigger = { ...box, linksOnTouch: true, label };
    this.linkTriggers.push(trigger);
    this.colliders.push(trigger);
  }
}

function feetBounds(
  pos: { x: number; y: number; z: number },
  scale: Vec3,
  rotationY = 0,
): ColliderBox {
  const cos = Math.abs(Math.cos(rotationY));
  const sin = Math.abs(Math.sin(rotationY));
  const halfX = scale.x * 0.5 * cos + scale.z * 0.5 * sin;
  const halfZ = scale.x * 0.5 * sin + scale.z * 0.5 * cos;
  return {
    minX: pos.x - halfX,
    maxX: pos.x + halfX,
    minY: pos.y,
    maxY: pos.y + scale.y,
    minZ: pos.z - halfZ,
    maxZ: pos.z + halfZ,
  };
}

function scaleModelToBounds(mesh: THREE.Group, kind: PropKind, target: Vec3): void {
  const bounds = boundsForKind(kind);
  mesh.scale.set(
    target.x / Math.max(0.01, bounds.w),
    target.y / Math.max(0.01, bounds.h),
    target.z / Math.max(0.01, bounds.d),
  );
}

function findSafeSpawn(colliders: ColliderBox[], halfW: number, halfD: number): Vec3 {
  const maxX = Math.max(0, halfW - PLAYER.radius - 0.7);
  const maxZ = Math.max(0, halfD - PLAYER.radius - 0.7);
  const candidates: Array<{ x: number; z: number }> = [{ x: 0, z: 0 }];
  const step = 0.85;
  const rings = Math.ceil(Math.max(maxX, maxZ) / step);
  for (let ring = 1; ring <= rings; ring += 1) {
    const radius = ring * step;
    const samples = Math.max(8, ring * 8);
    for (let i = 0; i < samples; i += 1) {
      const angle = (i / samples) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (Math.abs(x) <= maxX && Math.abs(z) <= maxZ) candidates.push({ x, z });
    }
  }

  const clearance = PLAYER.radius + 0.18;
  const chosen = candidates.find(({ x, z }) =>
    colliders.every((box) => {
      if (box.label === 'floor' || box.label === 'ceiling') return true;
      return !(
        x + clearance > box.minX &&
        x - clearance < box.maxX &&
        z + clearance > box.minZ &&
        z - clearance < box.maxZ &&
        PLAYER.eyeHeight + 0.2 > box.minY &&
        0 < box.maxY
      );
    }),
  );

  return { x: chosen?.x ?? 0, y: PLAYER.eyeHeight, z: chosen?.z ?? 0 };
}

function stablePhase(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 4294967296) * Math.PI * 2;
}

function defaultVisuals(): RoomVisuals {
  return {
    shader: 'none',
    lighting: 'fluorescent',
    tint: '#ffffff',
    effectStrength: 0,
    pixelSize: 4,
    wireframe: false,
    exposure: 1,
  };
}

function lightingProfile(
  visuals: RoomVisuals,
  palette: RoomSpec['palette'],
): LightingProfile {
  switch (visuals.lighting) {
    case 'dim':
      return {
        primary: '#aaa1c8',
        ambient: palette.ambient,
        ground: palette.floor,
        stripCount: 3,
        stripIntensity: 2.05,
        pointIntensity: 1.08,
        ambientIntensity: 1.02,
        hemiIntensity: 0.88,
        keyIntensity: 0.78,
        fillIntensity: 0.48,
        pulseAmplitude: 0,
        pulseSpeed: 0,
      };
    case 'cold':
      return {
        primary: '#82b8ff',
        ambient: '#243c5c',
        ground: palette.floor,
        stripCount: 4,
        stripIntensity: 2.5,
        pointIntensity: 1.25,
        ambientIntensity: 0.72,
        hemiIntensity: 0.72,
        keyIntensity: 0.72,
        fillIntensity: 0.28,
        pulseAmplitude: 0,
        pulseSpeed: 0,
      };
    case 'warm':
      return {
        primary: '#ffd19b',
        ambient: '#704a32',
        ground: palette.floor,
        stripCount: 3,
        stripIntensity: 2.15,
        pointIntensity: 1.08,
        ambientIntensity: 0.8,
        hemiIntensity: 0.68,
        keyIntensity: 0.68,
        fillIntensity: 0.3,
        pulseAmplitude: 0,
        pulseSpeed: 0,
      };
    case 'emergency':
      return {
        primary: '#ff392f',
        ambient: '#6d171a',
        ground: '#26080a',
        stripCount: 2,
        stripIntensity: 3,
        pointIntensity: 1.65,
        ambientIntensity: 0.9,
        hemiIntensity: 0.72,
        keyIntensity: 0.82,
        fillIntensity: 0.32,
        pulseAmplitude: 0.14,
        pulseSpeed: 1.15,
      };
    case 'pulse':
      return {
        primary: visuals.tint,
        ambient: palette.ambient,
        ground: palette.floor,
        stripCount: 3,
        stripIntensity: 2.35,
        pointIntensity: 1.15,
        ambientIntensity: 0.68,
        hemiIntensity: 0.62,
        keyIntensity: 0.62,
        fillIntensity: 0.25,
        pulseAmplitude: 0.28,
        pulseSpeed: 1.35,
      };
    default:
      return {
        primary: palette.light,
        ambient: palette.ambient,
        ground: palette.floor,
        stripCount: 3,
        stripIntensity: 2.2,
        pointIntensity: 1.1,
        ambientIntensity: 0.95,
        hemiIntensity: 0.85,
        keyIntensity: 0.75,
        fillIntensity: 0.35,
        pulseAmplitude: 0,
        pulseSpeed: 0,
      };
  }
}

function setWireframe(group: THREE.Group, lineColor: string): void {
  const glow = new THREE.Color(lineColor);
  const seen = new Set<THREE.Material>();
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.material) return;
    if (mesh.userData.keepSolid === true) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (seen.has(material)) continue;
      seen.add(material);
      const candidate = material as THREE.Material & { wireframe?: boolean };
      if (typeof candidate.wireframe !== 'boolean') continue;
      candidate.wireframe = true;
      candidate.needsUpdate = true;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive.lerp(glow, 0.65);
        material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.65);
      }
    }
  });
}

function resolveKind(kind: string | undefined, label: string): PropKind {
  if (kind) {
    try {
      // Prefer explicit kit ids from offline themes / LLM.
      boundsForKind(kind as PropKind);
      return kind as PropKind;
    } catch {
      // fall through
    }
    // boundsForKind never throws — validate via known labels mapping
    const mapped = kindFromLabel(kind);
    if (mapped) return mapped;
  }
  return kindFromLabel(label);
}

function placeWall(
  mesh: THREE.Mesh,
  side: 'north' | 'south' | 'east' | 'west',
  halfW: number,
  halfD: number,
  y: number,
): void {
  mesh.position.y = y;
  if (side === 'north') mesh.position.set(0, y, -halfD);
  if (side === 'south') mesh.position.set(0, y, halfD);
  if (side === 'east') mesh.position.set(halfW, y, 0);
  if (side === 'west') mesh.position.set(-halfW, y, 0);
}

function wallCollider(
  side: 'north' | 'south' | 'east' | 'west',
  halfW: number,
  halfD: number,
  h: number,
  t: number,
  links: boolean,
): ColliderBox {
  const base: ColliderBox = {
    minX: -halfW,
    maxX: halfW,
    minY: 0,
    maxY: h,
    minZ: -halfD,
    maxZ: halfD,
    linksOnTouch: links,
  };
  if (side === 'north') return { ...base, minZ: -halfD - t / 2, maxZ: -halfD + t / 2 };
  if (side === 'south') return { ...base, minZ: halfD - t / 2, maxZ: halfD + t / 2 };
  if (side === 'east') return { ...base, minX: halfW - t / 2, maxX: halfW + t / 2 };
  return { ...base, minX: -halfW - t / 2, maxX: -halfW + t / 2 };
}

function expandBox(box: ColliderBox, x: number, y: number, z: number): ColliderBox {
  return {
    ...box,
    minX: box.minX - x,
    maxX: box.maxX + x,
    minY: box.minY,
    maxY: box.maxY + y,
    minZ: box.minZ - z,
    maxZ: box.maxZ + z,
  };
}
