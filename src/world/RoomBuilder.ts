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
  rig?: EntityRig;
}

interface EntityRig {
  leftArm?: THREE.Object3D;
  rightArm?: THREE.Object3D;
  leftLeg?: THREE.Object3D;
  rightLeg?: THREE.Object3D;
  head?: THREE.Object3D;
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
  private navigationLight: THREE.PointLight | null = null;
  private exitLabelTexture: THREE.CanvasTexture | null = null;
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
    if (visuals.flashingDisabled) lighting.pulseAmplitude = 0;
    const outdoor = spec.environment === 'outdoor';
    const highVisibility = visuals.highVisibility === true;

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
    this.addArchitecture(spec);

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
    const readabilityAmbient = new THREE.AmbientLight(
      '#ffffff',
      highVisibility
        ? outdoor
          ? 0.55
          : 0.62
        : outdoor
          ? 0.14
          : 0.18,
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
    this.navigationLight = new THREE.PointLight(
      spec.palette.light,
      highVisibility
        ? outdoor
          ? 2.1
          : 2.65
        : outdoor
          ? 1.1
          : 1.35,
      highVisibility
        ? outdoor
          ? 24
          : 20
        : outdoor
          ? 17
          : 14,
      1.25,
    );
    this.navigationLight.position.set(0, PLAYER.eyeHeight + 0.35, 0);
    this.lights.push(ambient, readabilityAmbient, hemi, key, fill, this.navigationLight);
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
    if (this.navigationLight) {
      this.navigationLight.position.set(playerPos.x, playerPos.y + 0.35, playerPos.z);
    }
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

      animateRig(ent.rig, ent.phase, ent.data.behavior);

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
    this.exitLabelTexture?.dispose();
    this.exitLabelTexture = null;
    this.group.clear();
    clearMaterialCaches();
    clearModelMaterialCache();
    for (const l of this.lights) {
      scene.remove(l);
      l.dispose?.();
    }
    this.lights = [];
    this.pulsingLights = [];
    this.navigationLight = null;
    this.colliders = [];
    this.linkTriggers = [];
    this.liveEntities = [];
    this.fog = null;
    this.spec = null;
    if (scene.fog) scene.fog = null;
  }

  /** Seeded large-scale structure makes rooms differ before furniture is considered. */
  private addArchitecture(spec: RoomSpec): void {
    const architecture = spec.architecture ?? 'chamber';
    const rng = new SeededRng(`${spec.seed}:architecture:${architecture}`);
    const halfW = spec.width * 0.5;
    const halfD = spec.depth * 0.5;
    const structural = plainMaterial(spec.palette.walls, 0.82, 0.08);
    const trim = plainMaterial(spec.palette.accent, 0.55, 0.18);
    const glow = new THREE.MeshBasicMaterial({
      color: spec.palette.light,
      transparent: true,
      opacity: 0.58,
      fog: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

    const addBox = (
      name: string,
      width: number,
      height: number,
      depth: number,
      x: number,
      y: number,
      z: number,
      material: THREE.Material = structural,
      solid = false,
      rotationY = 0,
    ): THREE.Mesh => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      mesh.name = `architecture-${architecture}-${name}`;
      mesh.position.set(x, y, z);
      mesh.rotation.y = rotationY;
      mesh.castShadow = height > 0.2;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      if (solid) {
        this.addCollider(
          feetBounds(
            { x, y: Math.max(0, y - height * 0.5), z },
            { x: width, y: height, z: depth },
            rotationY,
          ),
          `architecture:${architecture}:${name}`,
        );
      }
      return mesh;
    };

    const addColumn = (
      name: string,
      x: number,
      z: number,
      height: number,
      radius = 0.36,
      solid = true,
    ): void => {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius * 1.08, height, 14),
        structural,
      );
      shaft.name = `architecture-${architecture}-${name}`;
      shaft.position.set(x, height * 0.5, z);
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      this.group.add(shaft);
      addBox(`${name}-base`, radius * 2.5, 0.13, radius * 2.5, x, 0.065, z, trim);
      addBox(`${name}-cap`, radius * 2.25, 0.12, radius * 2.25, x, height - 0.06, z, trim);
      if (solid) {
        this.addCollider(
          {
            minX: x - radius,
            maxX: x + radius,
            minY: 0,
            maxY: height,
            minZ: z - radius,
            maxZ: z + radius,
          },
          `architecture:${architecture}:${name}`,
        );
      }
    };

    const addFloorMark = (
      name: string,
      width: number,
      depth: number,
      x: number,
      z: number,
      rotationY = 0,
    ): void => {
      const mark = addBox(name, width, 0.018, depth, x, 0.012, z, glow, false, rotationY);
      mark.userData.keepSolid = true;
    };

    switch (architecture) {
      case 'colonnade': {
        const rows = clampInt(Math.round(spec.depth / 8), 3, 9);
        for (let row = 0; row < rows; row += 1) {
          const z = rows === 1 ? 0 : -halfD * 0.68 + (row / (rows - 1)) * halfD * 1.36;
          for (const side of [-1, 1]) {
            addColumn(`column-${row}-${side}`, side * halfW * 0.31, z, Math.min(spec.height * 0.92, 7), 0.34 + rng.float(0, 0.12));
          }
        }
        addBox('entablature-left', 0.28, 0.26, spec.depth * 0.82, -halfW * 0.31, Math.min(spec.height * 0.92, 7), 0, trim);
        addBox('entablature-right', 0.28, 0.26, spec.depth * 0.82, halfW * 0.31, Math.min(spec.height * 0.92, 7), 0, trim);
        break;
      }
      case 'atrium': {
        const x = halfW * 0.3;
        const z = halfD * 0.3;
        const height = Math.min(spec.height * 0.84, 8.5);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) addColumn(`atrium-${sx}-${sz}`, sx * x, sz * z, height, 0.48);
        addBox('beam-north', x * 2, 0.28, 0.28, 0, height, -z, trim);
        addBox('beam-south', x * 2, 0.28, 0.28, 0, height, z, trim);
        addBox('beam-east', 0.28, 0.28, z * 2, x, height, 0, trim);
        addBox('beam-west', 0.28, 0.28, z * 2, -x, height, 0, trim);
        addFloorMark('atrium-center', Math.min(spec.width * 0.28, 14), Math.min(spec.depth * 0.28, 14), 0, 0, Math.PI * 0.25);
        break;
      }
      case 'arena': {
        const gap = Math.min(6, spec.width * 0.22);
        const segment = Math.max(2.2, (spec.width - gap - 4) * 0.5);
        for (let tier = 0; tier < 3; tier += 1) {
          const height = 0.26 + tier * 0.28;
          const depth = 0.82;
          const inset = 1.1 + tier * 0.78;
          for (const side of [-1, 1]) {
            for (const xSide of [-1, 1]) {
              addBox(
                `stand-${tier}-${side}-${xSide}`,
                segment,
                height,
                depth,
                xSide * (gap * 0.5 + segment * 0.5),
                height * 0.5,
                side * (halfD - inset),
                tier % 2 ? trim : structural,
                true,
              );
            }
          }
        }
        addFloorMark('arena-axis', Math.min(spec.width * 0.62, 42), 0.12, 0, 0);
        addFloorMark('arena-cross', 0.12, Math.min(spec.depth * 0.58, 34), 0, 0);
        break;
      }
      case 'concourse': {
        const gantries = clampInt(Math.round(spec.depth / 14), 2, 6);
        for (let index = 0; index < gantries; index += 1) {
          const z = gantries === 1 ? 0 : -halfD * 0.56 + (index / (gantries - 1)) * halfD * 1.12;
          const x = halfW * 0.36;
          const height = Math.min(spec.height * 0.78, 6.5);
          addColumn(`gantry-${index}-left`, -x, z, height, 0.3);
          addColumn(`gantry-${index}-right`, x, z, height, 0.3);
          addBox(`gantry-${index}-beam`, x * 2, 0.24, 0.24, 0, height, z, trim);
          addBox(`gantry-${index}-sign`, Math.min(4.8, spec.width * 0.18), 0.86, 0.08, 0, height - 0.55, z, glow);
        }
        for (const x of [-halfW * 0.19, 0, halfW * 0.19]) addFloorMark(`lane-${x}`, 0.09, spec.depth * 0.72, x, 0);
        break;
      }
      case 'courtyard': {
        const pavilionX = halfW * 0.34;
        const pavilionZ = halfD * 0.34;
        const height = Math.min(spec.height * 0.52, 5.2);
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const x = sx * pavilionX;
            const z = sz * pavilionZ;
            addColumn(`pavilion-${sx}-${sz}-a`, x - 0.7, z, height, 0.22);
            addColumn(`pavilion-${sx}-${sz}-b`, x + 0.7, z, height, 0.22);
            addBox(`pavilion-${sx}-${sz}-roof`, 2.1, 0.2, 1.65, x, height + 0.1, z, trim);
          }
        }
        addFloorMark('courtyard-cross-a', spec.width * 0.68, 0.22, 0, 0);
        addFloorMark('courtyard-cross-b', 0.22, spec.depth * 0.68, 0, 0);
        break;
      }
      case 'causeway': {
        const alongDepth = spec.depth >= spec.width;
        const pathWidth = Math.min(7, (alongDepth ? spec.width : spec.depth) * 0.28);
        addFloorMark(
          'causeway-path',
          alongDepth ? pathWidth : spec.width * 0.82,
          alongDepth ? spec.depth * 0.82 : pathWidth,
          0,
          0,
        );
        const pairs = clampInt(Math.round((alongDepth ? spec.depth : spec.width) / 14), 3, 8);
        for (let index = 0; index < pairs; index += 1) {
          const along = pairs === 1 ? 0 : -0.62 + (index / (pairs - 1)) * 1.24;
          for (const side of [-1, 1]) {
            const x = alongDepth ? side * pathWidth * 0.7 : along * halfW;
            const z = alongDepth ? along * halfD : side * pathWidth * 0.7;
            addColumn(`causeway-${index}-${side}`, x, z, 2.6 + rng.float(0, 1.2), 0.16, false);
            const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), glow);
            orb.position.set(x, 3 + rng.float(0, 0.5), z);
            orb.userData.keepSolid = true;
            this.group.add(orb);
          }
        }
        break;
      }
      case 'field': {
        const landmarks = clampInt(Math.round(Math.max(spec.width, spec.depth) / 8), 8, 18);
        for (let index = 0; index < landmarks; index += 1) {
          const angle = (index / landmarks) * Math.PI * 2 + rng.float(-0.08, 0.08);
          const x = Math.cos(angle) * halfW * rng.float(0.56, 0.76);
          const z = Math.sin(angle) * halfD * rng.float(0.56, 0.76);
          const height = rng.float(1.4, Math.min(5.5, spec.height * 0.38));
          const spire = new THREE.Mesh(
            new THREE.ConeGeometry(rng.float(0.22, 0.55), height, rng.int(5, 9)),
            index % 3 === 0 ? trim : structural,
          );
          spire.name = `architecture-field-landmark-${index}`;
          spire.position.set(x, height * 0.5, z);
          this.group.add(spire);
        }
        addFloorMark('field-meridian', 0.08, spec.depth * 0.68, 0, 0, rng.float(-0.12, 0.12));
        break;
      }
      case 'basin': {
        const radius = Math.min(spec.width, spec.depth) * 0.18;
        for (let ring = 1; ring <= 3; ring += 1) {
          const ringMesh = new THREE.Mesh(
            new THREE.RingGeometry(radius * ring * 0.52, radius * ring * 0.52 + 0.08, 64),
            ring === 2 ? glow : trim,
          );
          ringMesh.name = `architecture-basin-ring-${ring}`;
          ringMesh.rotation.x = -Math.PI / 2;
          ringMesh.position.y = 0.018 + ring * 0.004;
          ringMesh.userData.keepSolid = true;
          this.group.add(ringMesh);
        }
        for (let index = 0; index < 8; index += 1) {
          if (index % 2 === 0) continue;
          const angle = (index / 8) * Math.PI * 2;
          addBox(
            `basin-seat-${index}`,
            radius * 0.44,
            0.32,
            0.42,
            Math.cos(angle) * radius * 1.42,
            0.16,
            Math.sin(angle) * radius * 1.42,
            structural,
            true,
            -angle,
          );
        }
        break;
      }
      default: {
        if (spec.environment === 'interior') {
          const ribs = clampInt(Math.round((spec.width + spec.depth) / 18), 2, 6);
          for (let index = 0; index < ribs; index += 1) {
            const z = ribs === 1 ? 0 : -halfD * 0.55 + (index / (ribs - 1)) * halfD * 1.1;
            addBox(`chamber-rib-${index}`, spec.width * 0.72, 0.08, 0.11, 0, spec.height * 0.82, z, trim);
          }
        }
      }
    }
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
    const starCount = clampInt(Math.round(radius * 1.45), 180, 460);
    for (let index = 0; index < starCount; index += 1) {
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

    if (rng.chance(0.38)) {
      const secondOrb = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.8, radius * 0.018), 16, 10),
        new THREE.MeshBasicMaterial({
          color: spec.palette.accent,
          fog: false,
          toneMapped: false,
        }),
      );
      secondOrb.position.set(-radius * 0.62, radius * 0.3, radius * 0.42);
      secondOrb.name = 'secondary-sky-orb';
      secondOrb.userData.keepSolid = true;
      this.group.add(secondOrb);
    }

    const horizonMaterial = new THREE.MeshStandardMaterial({
      color: spec.palette.ambient,
      roughness: 1,
      metalness: 0,
    });
    const horizonDistance = Math.max(spec.width, spec.depth) * 0.74;
    const horizonCount = clampInt(Math.round(Math.max(spec.width, spec.depth) / 2.8), 24, 48);
    for (let index = 0; index < horizonCount; index += 1) {
      const angle = (index / horizonCount) * Math.PI * 2 + rng.float(-0.08, 0.08);
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
    const mesh = buildModel(
      kind,
      prop.color || '#6a7a8a',
      prop.color || '#c4b59a',
      prop.assetId,
    );
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
    const mesh = buildModel(
      kind,
      ent.color || '#6a7a8a',
      ent.color || '#c4b59a',
      ent.assetId,
    );
    scaleModelToBounds(mesh, kind, ent.scale);
    mesh.position.set(ent.position.x, Math.max(0, ent.position.y), ent.position.z);
    this.group.add(mesh);
    this.liveEntities.push({
      mesh,
      data: ent,
      origin: mesh.position.clone(),
      phase: stablePhase(ent.id),
      rig: collectRig(mesh),
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
    const beacon = new THREE.Mesh(
      new THREE.OctahedronGeometry(Math.max(0.18, Math.min(0.34, width * 0.14))),
      glowMaterial,
    );
    beacon.position.set(0, height + 0.72, 0);
    beacon.userData.keepSolid = true;
    frame.add(beacon);
    const exitLabel = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.getExitLabelTexture(),
        transparent: true,
        depthTest: false,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }),
    );
    exitLabel.position.set(0, height + 0.72, 0);
    exitLabel.scale.set(Math.max(3.4, Math.min(4.8, width * 1.55)), 1.02, 1);
    exitLabel.renderOrder = 10_000;
    exitLabel.userData.keepSolid = true;
    frame.add(exitLabel);
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

  private getExitLabelTexture(): THREE.CanvasTexture {
    if (this.exitLabelTexture) return this.exitLabelTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 72;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas unavailable for exit marker');
    context.fillStyle = 'rgba(5, 9, 13, 0.9)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#f8fff2';
    context.lineWidth = 6;
    context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    context.fillStyle = '#f8fff2';
    context.font = '900 46px monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('EXIT', canvas.width / 2, canvas.height / 2 + 2);
    this.exitLabelTexture = new THREE.CanvasTexture(canvas);
    this.exitLabelTexture.colorSpace = THREE.SRGBColorSpace;
    this.exitLabelTexture.needsUpdate = true;
    return this.exitLabelTexture;
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

function collectRig(root: THREE.Object3D): EntityRig | undefined {
  const rig: EntityRig = {
    leftArm: root.getObjectByName('rig-arm-left'),
    rightArm: root.getObjectByName('rig-arm-right'),
    leftLeg: root.getObjectByName('rig-leg-left'),
    rightLeg: root.getObjectByName('rig-leg-right'),
    head: root.getObjectByName('rig-head'),
  };
  return Object.values(rig).some(Boolean) ? rig : undefined;
}

function animateRig(
  rig: EntityRig | undefined,
  phase: number,
  behavior: RoomEntity['behavior'],
): void {
  if (!rig) return;
  const moving = behavior === 'wander' || behavior === 'orbit';
  const stride = Math.sin(phase * (moving ? 3.2 : 0.75)) * (moving ? 0.34 : 0.035);
  setRigAxis(rig.leftArm, 'x', stride);
  setRigAxis(rig.rightArm, 'x', -stride);
  setRigAxis(rig.leftLeg, 'x', -stride * 0.72);
  setRigAxis(rig.rightLeg, 'x', stride * 0.72);
  setRigAxis(rig.head, 'y', Math.sin(phase * 0.42) * 0.08);
}

function setRigAxis(object: THREE.Object3D | undefined, axis: 'x' | 'y', offset: number): void {
  if (!object) return;
  const base = object.userData.baseRotation as { x?: number; y?: number } | undefined;
  object.rotation[axis] = (base?.[axis] ?? 0) + offset;
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
    motionSpeed: 0.5,
    distortion: 0,
    colorCycle: 0,
    viewScale: 1,
    mirrorSegments: 4,
    rotationSpeed: 0,
    angleOffset: 0,
    flashStrength: 0,
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
        ambientIntensity: 0.96,
        hemiIntensity: 0.9,
        keyIntensity: 0.86,
        fillIntensity: 0.45,
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
        ambientIntensity: 1.0,
        hemiIntensity: 0.88,
        keyIntensity: 0.84,
        fillIntensity: 0.44,
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
        ambientIntensity: 1.05,
        hemiIntensity: 0.86,
        keyIntensity: 0.95,
        fillIntensity: 0.48,
        pulseAmplitude: 0.14,
        pulseSpeed: 1.15,
      };
    case 'pulse':
      return {
        primary: visuals.tint,
        ambient: palette.ambient,
        ground: palette.floor,
        stripCount: 3,
        stripIntensity: 2.8,
        pointIntensity: 1.45,
        ambientIntensity: 1.08,
        hemiIntensity: 0.94,
        keyIntensity: 0.9,
        fillIntensity: 0.5,
        pulseAmplitude: 0.16,
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

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
