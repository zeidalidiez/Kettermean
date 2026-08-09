import * as THREE from 'three';
import { PLAYER } from '../config';
import { SeededRng } from '../core/rng';
import type {
  BuiltRoom,
  ColliderBox,
  RoomCondition,
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
import { generateRoomSigns, type ProceduralSignText } from './signLexicon';

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

interface AnimatedConditionEffect {
  object: THREE.Object3D;
  baseScale: THREE.Vector3;
  phase: number;
  speed: number;
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
  private conditionEffects: AnimatedConditionEffect[] = [];
  private generatedTextures: THREE.Texture[] = [];
  private navigationLight: THREE.PointLight | null = null;
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
    const detailScale = clampNumber(spec.worldScale ?? 1, 0.72, 10);

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
      // Walls are solid landmarks; R/Y/touch advances the dream.
      this.addCollider(wallCollider(side, halfW, halfD, h, wallT, false), `wall:${side}`);

      // Fake window / panel insets so walls aren't flat slabs
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(
          side === 'north' || side === 'south'
            ? Math.min(2.4 * detailScale, spec.width * 0.25)
            : 0.06 * detailScale,
          Math.min(1.6 * detailScale, h * 0.45),
          side === 'east' || side === 'west'
            ? Math.min(2.4 * detailScale, spec.depth * 0.25)
            : 0.06 * detailScale,
        ),
        plainMaterial(spec.palette.light, 0.35, 0.05, spec.palette.light, 0.25),
      );
      placeWall(panel, side, halfW - 0.05, halfD - 0.05, h * 0.55);
      this.group.add(panel);
    }

    if (outdoor) this.addOutdoorSky(spec);
    this.addArchitecture(spec);
    this.addProceduralSignage(spec);

    for (const prop of spec.props) {
      this.addProp(prop);
    }
    for (const ent of spec.entities) {
      this.addEntity(ent);
    }
    this.addConditionEnvironment(spec);

    // Visible fixtures and real light sources change character with each room.
    const span = Math.max(spec.width, spec.depth);
    const fixtureCount = outdoor
      ? 0
      : Math.min(10, lighting.stripCount + Math.floor(span / 18));
    const fixtureColumns = Math.max(1, Math.ceil(Math.sqrt(fixtureCount)));
    const fixtureRows = Math.max(1, Math.ceil(fixtureCount / fixtureColumns));
    for (let i = 0; i < fixtureCount; i += 1) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(
          Math.min(4.2 * detailScale, spec.width * 0.28),
          0.06 * detailScale,
          0.4 * detailScale,
        ),
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
          : (column / (fixtureColumns - 1) - 0.5) * Math.min(spec.width * 0.68, 32 * detailScale);
      const z =
        fixtureRows === 1
          ? 0
          : (row / (fixtureRows - 1) - 0.5) * Math.min(spec.depth * 0.62, 28 * detailScale);
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
          ? 0.5
          : 0.56
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
          ? 2
          : 2.5
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
    for (const effect of this.conditionEffects) {
      effect.phase += dt * effect.speed;
      const widthPulse = 0.94 + Math.sin(effect.phase * 0.83) * 0.06;
      const heightPulse = 0.9 + Math.sin(effect.phase) * 0.12;
      effect.object.scale.set(
        effect.baseScale.x * widthPulse,
        effect.baseScale.y * heightPulse,
        effect.baseScale.z * widthPulse,
      );
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
      animateBillboard(m, ent.phase, ent.data.behavior);

      // Entities never act as room links.
    }
  }

  getColliders(): ColliderBox[] {
    return this.colliders;
  }

  getNearbyDialogue(
    playerPos: THREE.Vector3,
    maxDistance = 5.5,
  ): { label: string; dialogue: string } | null {
    let nearest: { label: string; dialogue: string; distance: number } | null = null;
    for (const entity of this.liveEntities) {
      if (!entity.data.dialogue) continue;
      const distance = Math.hypot(
        entity.mesh.position.x - playerPos.x,
        entity.mesh.position.z - playerPos.z,
      );
      const reach = maxDistance + Math.min(3, Math.max(entity.data.scale.x, entity.data.scale.z) * 0.35);
      if (distance > reach || (nearest && distance >= nearest.distance)) continue;
      nearest = {
        label: entity.data.label,
        dialogue: entity.data.dialogue,
        distance,
      };
    }
    return nearest ? { label: nearest.label, dialogue: nearest.dialogue } : null;
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
    for (const texture of this.generatedTextures) texture.dispose();
    this.generatedTextures = [];
    clearMaterialCaches();
    clearModelMaterialCache();
    for (const l of this.lights) {
      scene.remove(l);
      l.dispose?.();
    }
    this.lights = [];
    this.pulsingLights = [];
    this.conditionEffects = [];
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
    const detailScale = clampNumber(spec.worldScale ?? 1, 0.72, 10);
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
            addColumn(
              `column-${row}-${side}`,
              side * halfW * 0.31,
              z,
              Math.min(spec.height * 0.92, 7 * detailScale),
              (0.34 + rng.float(0, 0.12)) * detailScale,
            );
          }
        }
        const beamHeight = Math.min(spec.height * 0.92, 7 * detailScale);
        addBox('entablature-left', 0.28 * detailScale, 0.26 * detailScale, spec.depth * 0.82, -halfW * 0.31, beamHeight, 0, trim);
        addBox('entablature-right', 0.28 * detailScale, 0.26 * detailScale, spec.depth * 0.82, halfW * 0.31, beamHeight, 0, trim);
        break;
      }
      case 'atrium': {
        const x = halfW * 0.3;
        const z = halfD * 0.3;
        const height = Math.min(spec.height * 0.84, 8.5 * detailScale);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) addColumn(`atrium-${sx}-${sz}`, sx * x, sz * z, height, 0.48 * detailScale);
        addBox('beam-north', x * 2, 0.28 * detailScale, 0.28 * detailScale, 0, height, -z, trim);
        addBox('beam-south', x * 2, 0.28 * detailScale, 0.28 * detailScale, 0, height, z, trim);
        addBox('beam-east', 0.28 * detailScale, 0.28 * detailScale, z * 2, x, height, 0, trim);
        addBox('beam-west', 0.28 * detailScale, 0.28 * detailScale, z * 2, -x, height, 0, trim);
        addFloorMark('atrium-center', Math.min(spec.width * 0.28, 14 * detailScale), Math.min(spec.depth * 0.28, 14 * detailScale), 0, 0, Math.PI * 0.25);
        break;
      }
      case 'arena': {
        const gap = Math.min(6 * detailScale, spec.width * 0.22);
        const segment = Math.max(2.2 * detailScale, (spec.width - gap - 4 * detailScale) * 0.5);
        for (let tier = 0; tier < 3; tier += 1) {
          const height = (0.26 + tier * 0.28) * detailScale;
          const depth = 0.82 * detailScale;
          const inset = (1.1 + tier * 0.78) * detailScale;
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
        addFloorMark('arena-axis', Math.min(spec.width * 0.62, 42 * detailScale), 0.12 * detailScale, 0, 0);
        addFloorMark('arena-cross', 0.12 * detailScale, Math.min(spec.depth * 0.58, 34 * detailScale), 0, 0);
        break;
      }
      case 'concourse': {
        const gantries = clampInt(Math.round(spec.depth / 14), 2, 6);
        for (let index = 0; index < gantries; index += 1) {
          const z = gantries === 1 ? 0 : -halfD * 0.56 + (index / (gantries - 1)) * halfD * 1.12;
          const x = halfW * 0.36;
          const height = Math.min(spec.height * 0.78, 6.5 * detailScale);
          addColumn(`gantry-${index}-left`, -x, z, height, 0.3 * detailScale);
          addColumn(`gantry-${index}-right`, x, z, height, 0.3 * detailScale);
          addBox(`gantry-${index}-beam`, x * 2, 0.24 * detailScale, 0.24 * detailScale, 0, height, z, trim);
          addBox(`gantry-${index}-sign`, Math.min(4.8 * detailScale, spec.width * 0.18), 0.86 * detailScale, 0.08 * detailScale, 0, height - 0.55 * detailScale, z, glow);
        }
        for (const x of [-halfW * 0.19, 0, halfW * 0.19]) addFloorMark(`lane-${x}`, 0.09, spec.depth * 0.72, x, 0);
        break;
      }
      case 'courtyard': {
        const pavilionX = halfW * 0.34;
        const pavilionZ = halfD * 0.34;
        const height = Math.min(spec.height * 0.52, 5.2 * detailScale);
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const x = sx * pavilionX;
            const z = sz * pavilionZ;
            addColumn(`pavilion-${sx}-${sz}-a`, x - 0.7 * detailScale, z, height, 0.22 * detailScale);
            addColumn(`pavilion-${sx}-${sz}-b`, x + 0.7 * detailScale, z, height, 0.22 * detailScale);
            addBox(`pavilion-${sx}-${sz}-roof`, 2.1 * detailScale, 0.2 * detailScale, 1.65 * detailScale, x, height + 0.1 * detailScale, z, trim);
          }
        }
        addFloorMark('courtyard-cross-a', spec.width * 0.68, 0.22, 0, 0);
        addFloorMark('courtyard-cross-b', 0.22, spec.depth * 0.68, 0, 0);
        break;
      }
      case 'causeway': {
        const alongDepth = spec.depth >= spec.width;
        const pathWidth = Math.min(7 * detailScale, (alongDepth ? spec.width : spec.depth) * 0.28);
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
            addColumn(`causeway-${index}-${side}`, x, z, (2.6 + rng.float(0, 1.2)) * detailScale, 0.16 * detailScale, false);
            const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2 * detailScale, 12, 8), glow);
            orb.position.set(x, (3 + rng.float(0, 0.5)) * detailScale, z);
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
          const height = rng.float(1.4 * detailScale, Math.min(5.5 * detailScale, spec.height * 0.38));
          const spire = new THREE.Mesh(
            new THREE.ConeGeometry(rng.float(0.22, 0.55) * detailScale, height, rng.int(5, 9)),
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
            0.32 * detailScale,
            0.42 * detailScale,
            Math.cos(angle) * radius * 1.42,
            0.16 * detailScale,
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
            addBox(`chamber-rib-${index}`, spec.width * 0.72, 0.08 * detailScale, 0.11 * detailScale, 0, spec.height * 0.82, z, trim);
          }
        }
      }
    }
  }

  private addOutdoorSky(spec: RoomSpec): void {
    const radius = Math.max(spec.width, spec.depth) * 2.2 + 35;
    const detailScale = clampNumber(spec.worldScale ?? 1, 0.72, 10);
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
      const height = rng.float(2.5 * detailScale, Math.min(13 * detailScale, spec.height * 0.72));
      const width = rng.float(2.5, 8.5) * detailScale;
      const depth = rng.float(2.5, 6.5) * detailScale;
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

  /**
   * Seeded signs use a tagged word graph rather than hard-coded room labels.
   * This gives every environment readable language that still belongs to its
   * place: tropical words pull tropical institutions/services, transit words
   * pull platforms and routes, and so on.
   */
  private addProceduralSignage(spec: RoomSpec): void {
    const proceduralSigns = generateRoomSigns({
      seed: spec.seed,
      tags: spec.themeTags,
      mood: spec.mood,
      condition: spec.condition,
      environment: spec.environment ?? 'interior',
      architecture: spec.architecture ?? 'chamber',
      scaleProfile: spec.scaleProfile ?? 'human',
    });
    const authoredSigns: ProceduralSignText[] = (spec.signs ?? []).map((sign) => ({
      headline: sign.headline,
      caption: sign.caption,
      tags: sign.tags?.length ? sign.tags : spec.themeTags,
    }));
    const targetCount = Math.max(proceduralSigns.length, authoredSigns.length);
    const signs = [...authoredSigns, ...proceduralSigns]
      .filter((sign, index, all) =>
        all.findIndex((candidate) => candidate.headline === sign.headline) === index,
      )
      .slice(0, targetCount);
    const rng = new SeededRng(`${spec.seed}:sign-placement`);
    const detailScale = clampNumber(spec.worldScale ?? 1, 0.72, 3.2);
    const halfW = spec.width * 0.5;
    const halfD = spec.depth * 0.5;
    const freestanding = spec.environment === 'outdoor' ||
      spec.architecture === 'field' || spec.architecture === 'causeway';

    signs.forEach((sign, index) => {
      const width = Math.min(
        (index % 3 === 0 ? 4.8 : 3.7) * detailScale,
        Math.max(2.4, Math.min(spec.width, spec.depth) * 0.32),
      );
      const height = Math.max(1.05, width * 0.39);
      const signGroup = this.createProceduralSign(sign, spec, index, width, height);
      signGroup.name = `procedural-sign-${index}`;
      signGroup.userData.signText = sign.headline;
      signGroup.userData.signCaption = sign.caption;

      if (freestanding) {
        const angle = (index / Math.max(1, signs.length)) * Math.PI * 2 + rng.float(-0.45, 0.45);
        const radiusX = halfW * rng.float(0.5, 0.72);
        const radiusZ = halfD * rng.float(0.5, 0.72);
        const x = Math.cos(angle) * radiusX;
        const z = Math.sin(angle) * radiusZ;
        const boardY = Math.min(spec.height * 0.52, (2.25 + rng.float(0, 0.8)) * detailScale);
        signGroup.position.set(x, boardY, z);
        signGroup.lookAt(0, boardY, 0);

        const postHeight = Math.max(1, boardY - height * 0.48);
        const postMaterial = plainMaterial(spec.palette.walls, 0.8, 0.28);
        for (const side of [-1, 1]) {
          const post = new THREE.Mesh(
            new THREE.BoxGeometry(0.09 * detailScale, postHeight, 0.09 * detailScale),
            postMaterial,
          );
          post.position.set(side * width * 0.34, -boardY + postHeight * 0.5, -0.08);
          post.name = `procedural-sign-${index}-post`;
          signGroup.add(post);
        }
      } else if (
        (spec.architecture === 'concourse' || spec.environment === 'open-hall') &&
        index === 0
      ) {
        signGroup.position.set(
          0,
          Math.max(height, Math.min(spec.height - height * 0.65, spec.height * 0.68)),
          rng.float(-halfD * 0.32, halfD * 0.32),
        );
        signGroup.rotation.y = rng.chance(0.5) ? 0 : Math.PI;
      } else {
        const side = index % 4;
        const wallY = Math.max(
          height * 0.62 + 0.3,
          Math.min(spec.height - height * 0.62 - 0.25, spec.height * rng.float(0.45, 0.7)),
        );
        if (side === 0) {
          signGroup.position.set(rng.float(-halfW * 0.5, halfW * 0.5), wallY, -halfD + 0.22);
        } else if (side === 1) {
          signGroup.position.set(rng.float(-halfW * 0.5, halfW * 0.5), wallY, halfD - 0.22);
          signGroup.rotation.y = Math.PI;
        } else if (side === 2) {
          signGroup.position.set(halfW - 0.22, wallY, rng.float(-halfD * 0.5, halfD * 0.5));
          signGroup.rotation.y = -Math.PI / 2;
        } else {
          signGroup.position.set(-halfW + 0.22, wallY, rng.float(-halfD * 0.5, halfD * 0.5));
          signGroup.rotation.y = Math.PI / 2;
        }
      }

      this.group.add(signGroup);
    });
  }

  private createProceduralSign(
    sign: ProceduralSignText,
    spec: RoomSpec,
    index: number,
    width: number,
    height: number,
  ): THREE.Group {
    const texture = makeSignTexture(sign, spec, index);
    this.generatedTextures.push(texture);
    const group = new THREE.Group();
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.16, height + 0.16, 0.12),
      plainMaterial(spec.condition === 'burning' || spec.condition === 'scorched' ? '#25150f' : '#161a1e', 0.66, 0.2),
    );
    panel.name = 'procedural-sign-panel';
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshStandardMaterial({
        map: texture,
        emissiveMap: texture,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: spec.condition === 'dusty' ? 0.12 : 0.32,
        roughness: spec.condition === 'flooded' || spec.condition === 'slimed' ? 0.28 : 0.62,
        metalness: 0.04,
        side: THREE.DoubleSide,
      }),
    );
    face.position.z = 0.066;
    face.name = 'procedural-sign-face';
    group.add(panel, face);
    return group;
  }

  private addConditionEnvironment(spec: RoomSpec): void {
    const condition = spec.condition;
    if (condition === 'normal') return;

    const rng = new SeededRng(`${spec.seed}:condition-environment:${condition}`);
    const halfW = spec.width * 0.5;
    const halfD = spec.depth * 0.5;
    const detailScale = clampNumber(spec.worldScale ?? 1, 0.75, 4);
    const span = Math.sqrt(spec.width * spec.depth);
    const floorPosition = (): { x: number; z: number } => {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const x = rng.float(-halfW * 0.82, halfW * 0.82);
        const z = rng.float(-halfD * 0.82, halfD * 0.82);
        if (Math.hypot(x, z) > Math.min(4.2, span * 0.12)) return { x, z };
      }
      return { x: halfW * 0.35, z: halfD * 0.35 };
    };
    const addPool = (
      name: string,
      color: string,
      opacity: number,
      size: number,
    ): THREE.Mesh => {
      const { x, z } = floorPosition();
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(1, rng.int(10, 18)),
        new THREE.MeshStandardMaterial({
          color,
          emissive: condition === 'burning' ? color : '#000000',
          emissiveIntensity: condition === 'burning' ? 0.2 : 0,
          roughness: condition === 'slimed' || condition === 'bloodied' ? 0.2 : 0.94,
          metalness: 0.02,
          transparent: opacity < 1,
          opacity,
          depthWrite: opacity >= 0.78,
          side: THREE.DoubleSide,
        }),
      );
      pool.name = `condition-${condition}-${name}`;
      pool.rotation.x = -Math.PI / 2;
      pool.rotation.z = rng.float(-Math.PI, Math.PI);
      pool.scale.set(size * rng.float(0.62, 1.28), size * rng.float(0.4, 0.92), 1);
      pool.position.set(x, 0.012 + rng.float(0, 0.012), z);
      pool.userData.keepSolid = true;
      this.group.add(pool);
      return pool;
    };

    if (condition === 'bloodied' || condition === 'slimed') {
      const count = clampInt(Math.round(5 + span / 18), 5, 12);
      const color = condition === 'bloodied' ? '#65000d' : '#4ea92f';
      for (let index = 0; index < count; index += 1) {
        const pool = addPool(`pool-${index}`, color, condition === 'slimed' ? 0.7 : 0.88, rng.float(0.5, 1.5) * detailScale);
        if (condition === 'slimed' && index % 2 === 0) {
          const bubble = new THREE.Mesh(
            new THREE.SphereGeometry(rng.float(0.08, 0.22) * detailScale, 10, 7),
            new THREE.MeshStandardMaterial({
              color: '#8be35b',
              emissive: '#315d1e',
              emissiveIntensity: 0.2,
              transparent: true,
              opacity: 0.74,
              roughness: 0.15,
            }),
          );
          bubble.position.set(pool.position.x, rng.float(0.05, 0.2) * detailScale, pool.position.z);
          bubble.userData.keepSolid = true;
          this.group.add(bubble);
        }
      }
      return;
    }

    if (condition === 'scorched' || condition === 'burning') {
      const scorchCount = clampInt(Math.round(6 + span / 15), 6, 15);
      for (let index = 0; index < scorchCount; index += 1) {
        addPool(`scorch-${index}`, index % 3 === 0 ? '#301007' : '#110d0b', 0.92, rng.float(0.55, 1.7) * detailScale);
      }
      if (condition === 'burning') {
        const fireCount = clampInt(Math.round(6 + span / 22), 6, 14);
        for (let index = 0; index < fireCount; index += 1) {
          const { x, z } = floorPosition();
          const fire = makeFlame(rng.float(0.55, 1.35) * detailScale);
          fire.position.set(x, 0.03, z);
          fire.name = `condition-burning-fire-${index}`;
          this.group.add(fire);
          this.conditionEffects.push({
            object: fire,
            baseScale: fire.scale.clone(),
            phase: stablePhase(`${spec.seed}:fire:${index}`),
            speed: rng.float(5.5, 9),
          });
          if (index < 4) {
            const light = new THREE.PointLight('#ff6b24', 2.2, 9 * detailScale, 1.8);
            light.position.set(x, 1.1 * detailScale, z);
            this.group.add(light);
            this.pulsingLights.push({
              light,
              baseIntensity: 2.2,
              amplitude: spec.visuals?.flashingDisabled ? 0 : 0.07,
              speed: rng.float(3.2, 5.8),
              phase: stablePhase(`${spec.seed}:fire-light:${index}`),
            });
          }
        }
      }
      return;
    }

    if (condition === 'ruined') {
      const rubbleMaterial = new THREE.MeshStandardMaterial({
        color: spec.palette.walls,
        roughness: 0.98,
        metalness: 0.01,
      });
      const count = clampInt(Math.round(12 + span / 8), 12, 34);
      for (let index = 0; index < count; index += 1) {
        const { x, z } = floorPosition();
        const longPiece = index % 7 === 0;
        const width = rng.float(longPiece ? 1.4 : 0.22, longPiece ? 3.2 : 1.05) * detailScale;
        const height = rng.float(0.12, longPiece ? 0.34 : 0.65) * detailScale;
        const depth = rng.float(0.18, longPiece ? 0.42 : 0.95) * detailScale;
        const rubble = new THREE.Mesh(
          new THREE.BoxGeometry(width, height, depth),
          rubbleMaterial,
        );
        rubble.name = `condition-ruined-rubble-${index}`;
        rubble.position.set(x, height * 0.5, z);
        rubble.rotation.set(rng.float(-0.24, 0.24), rng.float(-Math.PI, Math.PI), rng.float(-0.2, 0.2));
        this.group.add(rubble);
      }
      return;
    }

    if (condition === 'overgrown') {
      const stemMaterial = new THREE.MeshStandardMaterial({ color: '#274d25', roughness: 0.92 });
      const leafMaterial = new THREE.MeshStandardMaterial({ color: '#4f8d3a', roughness: 0.86 });
      const count = clampInt(Math.round(8 + span / 13), 8, 24);
      for (let index = 0; index < count; index += 1) {
        const { x, z } = floorPosition();
        const height = rng.float(0.45, 1.5) * detailScale;
        const cluster = new THREE.Group();
        cluster.name = `condition-overgrown-cluster-${index}`;
        for (let frond = 0; frond < 3; frond += 1) {
          const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025 * detailScale, 0.045 * detailScale, height, 7),
            stemMaterial,
          );
          stem.position.set((frond - 1) * 0.13 * detailScale, height * 0.5, 0);
          stem.rotation.z = (frond - 1) * 0.18;
          const leaf = new THREE.Mesh(
            new THREE.SphereGeometry(0.22 * detailScale, 9, 6),
            leafMaterial,
          );
          leaf.scale.set(1.4, 0.42, 0.62);
          leaf.position.set(stem.position.x, height * rng.float(0.66, 0.98), 0);
          cluster.add(stem, leaf);
        }
        cluster.position.set(x, 0, z);
        cluster.rotation.y = rng.float(-Math.PI, Math.PI);
        this.group.add(cluster);
      }
      return;
    }

    if (condition === 'frozen') {
      const iceMaterial = new THREE.MeshStandardMaterial({
        color: '#a9efff',
        emissive: '#23677c',
        emissiveIntensity: 0.13,
        roughness: 0.18,
        metalness: 0.08,
        transparent: true,
        opacity: 0.8,
      });
      const count = clampInt(Math.round(8 + span / 14), 8, 22);
      for (let index = 0; index < count; index += 1) {
        const { x, z } = floorPosition();
        const height = rng.float(0.35, 1.7) * detailScale;
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(rng.float(0.12, 0.38) * detailScale, height, rng.int(5, 8)),
          iceMaterial,
        );
        spike.name = `condition-frozen-spike-${index}`;
        spike.position.set(x, height * 0.5, z);
        spike.rotation.z = rng.float(-0.18, 0.18);
        this.group.add(spike);
      }
      return;
    }

    if (condition === 'flooded') {
      const waterMaterial = new THREE.MeshStandardMaterial({
        color: '#287b91',
        emissive: '#0c3849',
        emissiveIntensity: 0.12,
        roughness: 0.08,
        metalness: 0.04,
        transparent: true,
        opacity: 0.43,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(spec.width * 0.92, spec.depth * 0.92, 1, 1),
        waterMaterial,
      );
      water.name = 'condition-flooded-water-plane';
      water.rotation.x = -Math.PI / 2;
      water.position.y = 0.028;
      water.userData.keepSolid = true;
      this.group.add(water);

      const rippleMaterial = new THREE.MeshBasicMaterial({
        color: '#8de8ef',
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
        toneMapped: false,
      });
      const rippleCount = clampInt(Math.round(5 + span / 18), 5, 13);
      for (let index = 0; index < rippleCount; index += 1) {
        const { x, z } = floorPosition();
        const ripple = new THREE.Mesh(
          new THREE.TorusGeometry(rng.float(0.18, 0.52) * detailScale, 0.018 * detailScale, 6, 20),
          rippleMaterial,
        );
        ripple.name = `condition-flooded-ripple-${index}`;
        ripple.rotation.x = Math.PI / 2;
        ripple.position.set(x, 0.045, z);
        ripple.scale.y = rng.float(0.55, 0.9);
        ripple.userData.keepSolid = true;
        this.group.add(ripple);
      }
      return;
    }

    if (condition === 'dusty') {
      const dustCount = clampInt(Math.round(spec.width * spec.depth * 0.085), 90, 280);
      const positions = new Float32Array(dustCount * 3);
      for (let index = 0; index < dustCount; index += 1) {
        positions[index * 3] = rng.float(-halfW * 0.9, halfW * 0.9);
        positions[index * 3 + 1] = rng.float(0.12, Math.max(0.3, spec.height * 0.82));
        positions[index * 3 + 2] = rng.float(-halfD * 0.9, halfD * 0.9);
      }
      const dustGeometry = new THREE.BufferGeometry();
      dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const dust = new THREE.Points(
        dustGeometry,
        new THREE.PointsMaterial({
          color: '#dfc994',
          size: 0.055 * detailScale,
          transparent: true,
          opacity: 0.48,
          depthWrite: false,
          sizeAttenuation: true,
        }),
      );
      dust.name = 'condition-dusty-air';
      this.group.add(dust);
      const moundCount = clampInt(Math.round(5 + span / 22), 5, 11);
      for (let index = 0; index < moundCount; index += 1) {
        addPool(`drift-${index}`, index % 2 ? '#9a8765' : '#b5a27b', 0.84, rng.float(0.45, 1.35) * detailScale);
      }
      return;
    }

    if (condition === 'moldy') {
      const patchCount = clampInt(Math.round(7 + span / 16), 7, 16);
      const moldMaterial = new THREE.MeshStandardMaterial({
        color: '#657b2a',
        emissive: '#172608',
        emissiveIntensity: 0.06,
        roughness: 0.96,
      });
      for (let index = 0; index < patchCount; index += 1) {
        const patch = addPool(`mold-patch-${index}`, index % 3 ? '#445d21' : '#7b8428', 0.88, rng.float(0.4, 1.2) * detailScale);
        if (index % 2 === 0) {
          const caps = rng.int(2, 4);
          for (let capIndex = 0; capIndex < caps; capIndex += 1) {
            const cap = new THREE.Mesh(
              new THREE.SphereGeometry(rng.float(0.05, 0.16) * detailScale, 8, 5),
              moldMaterial,
            );
            cap.name = `condition-moldy-cap-${index}-${capIndex}`;
            cap.scale.y = 0.45;
            cap.position.set(
              patch.position.x + rng.float(-0.35, 0.35) * detailScale,
              rng.float(0.025, 0.08) * detailScale,
              patch.position.z + rng.float(-0.35, 0.35) * detailScale,
            );
            this.group.add(cap);
          }
        }
      }
      return;
    }

    if (condition === 'electrified') {
      const arcMaterial = new THREE.LineBasicMaterial({
        color: '#6df7ff',
        transparent: true,
        opacity: 0.88,
        toneMapped: false,
      });
      const arcCount = clampInt(Math.round(5 + span / 20), 5, 12);
      for (let index = 0; index < arcCount; index += 1) {
        const { x, z } = floorPosition();
        const points: THREE.Vector3[] = [];
        const arcHeight = rng.float(0.5, 1.8) * detailScale;
        for (let segment = 0; segment < 6; segment += 1) {
          const t = segment / 5;
          points.push(new THREE.Vector3(
            x + rng.float(-0.16, 0.16) * detailScale,
            0.08 + Math.sin(t * Math.PI) * arcHeight + rng.float(-0.08, 0.08),
            z + (t - 0.5) * rng.float(0.5, 1.25) * detailScale,
          ));
        }
        const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), arcMaterial);
        arc.name = `condition-electrified-arc-${index}`;
        this.group.add(arc);
        this.conditionEffects.push({
          object: arc,
          baseScale: arc.scale.clone(),
          phase: stablePhase(`${spec.seed}:electric-arc:${index}`),
          speed: spec.visuals?.flashingDisabled ? 0.35 : rng.float(3.2, 5.4),
        });
        if (index < 3) {
          const light = new THREE.PointLight('#61eaff', 1.35, 8 * detailScale, 1.8);
          light.position.set(x, Math.max(0.6, arcHeight * 0.58), z);
          this.group.add(light);
          this.pulsingLights.push({
            light,
            baseIntensity: 1.35,
            amplitude: spec.visuals?.flashingDisabled ? 0 : 0.055,
            speed: rng.float(2.8, 4.6),
            phase: stablePhase(`${spec.seed}:electric-light:${index}`),
          });
        }
      }
      return;
    }

    if (condition === 'haunted') {
      const wispMaterial = new THREE.MeshBasicMaterial({
        color: '#d7dcff',
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const count = clampInt(Math.round(7 + span / 17), 7, 16);
      for (let index = 0; index < count; index += 1) {
        const { x, z } = floorPosition();
        const wisp = new THREE.Mesh(
          new THREE.SphereGeometry(rng.float(0.18, 0.48) * detailScale, 10, 7),
          wispMaterial,
        );
        wisp.name = `condition-haunted-wisp-${index}`;
        wisp.scale.set(rng.float(0.55, 0.95), rng.float(1.5, 2.8), rng.float(0.45, 0.8));
        wisp.position.set(x, rng.float(0.55, Math.max(0.8, spec.height * 0.68)), z);
        wisp.userData.keepSolid = true;
        this.group.add(wisp);
        this.conditionEffects.push({
          object: wisp,
          baseScale: wisp.scale.clone(),
          phase: stablePhase(`${spec.seed}:haunted-wisp:${index}`),
          speed: rng.float(0.45, 0.9),
        });
      }
      return;
    }

    if (condition === 'gilded') {
      const goldMaterial = new THREE.MeshStandardMaterial({
        color: '#d8ad31',
        emissive: '#5e3d08',
        emissiveIntensity: 0.08,
        metalness: 0.82,
        roughness: 0.24,
      });
      const count = clampInt(Math.round(10 + span / 11), 10, 26);
      for (let index = 0; index < count; index += 1) {
        const { x, z } = floorPosition();
        const size = rng.float(0.1, 0.38) * detailScale;
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(size, 0), goldMaterial);
        shard.name = `condition-gilded-shard-${index}`;
        shard.position.set(x, size * rng.float(0.55, 2.3), z);
        shard.rotation.set(rng.float(-1, 1), rng.float(-Math.PI, Math.PI), rng.float(-1, 1));
        this.group.add(shard);
      }
      return;
    }

    if (condition === 'bioluminescent') {
      const stemMaterial = new THREE.MeshStandardMaterial({ color: '#163d38', roughness: 0.86 });
      const capMaterial = new THREE.MeshStandardMaterial({
        color: '#6fffc2',
        emissive: '#38f5a1',
        emissiveIntensity: 1.15,
        roughness: 0.24,
      });
      const count = clampInt(Math.round(8 + span / 14), 8, 20);
      for (let index = 0; index < count; index += 1) {
        const { x, z } = floorPosition();
        const mushroomHeight = rng.float(0.18, 0.72) * detailScale;
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025 * detailScale, 0.055 * detailScale, mushroomHeight, 7),
          stemMaterial,
        );
        stem.position.set(x, mushroomHeight * 0.5, z);
        stem.name = `condition-bioluminescent-stem-${index}`;
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(rng.float(0.1, 0.28) * detailScale, 10, 6),
          capMaterial,
        );
        cap.scale.y = 0.42;
        cap.position.set(x, mushroomHeight, z);
        cap.name = `condition-bioluminescent-cap-${index}`;
        this.group.add(stem, cap);
        this.conditionEffects.push({
          object: cap,
          baseScale: cap.scale.clone(),
          phase: stablePhase(`${spec.seed}:bioluminescent-cap:${index}`),
          speed: rng.float(0.55, 1.15),
        });
        if (index < 3) {
          const light = new THREE.PointLight('#58ffc1', 1.15, 7 * detailScale, 1.9);
          light.position.set(x, mushroomHeight + 0.25, z);
          this.group.add(light);
        }
      }
      return;
    }

    if (condition === 'stormbound') {
      const dropCount = clampInt(Math.round(spec.width * spec.depth * 0.13), 120, 420);
      const positions = new Float32Array(dropCount * 6);
      for (let index = 0; index < dropCount; index += 1) {
        const x = rng.float(-halfW * 0.94, halfW * 0.94);
        const y = rng.float(0.15, Math.max(0.4, spec.height * 0.96));
        const z = rng.float(-halfD * 0.94, halfD * 0.94);
        const offset = index * 6;
        positions[offset] = x;
        positions[offset + 1] = y;
        positions[offset + 2] = z;
        positions[offset + 3] = x + 0.07 * detailScale;
        positions[offset + 4] = y - rng.float(0.28, 0.72) * detailScale;
        positions[offset + 5] = z + 0.04 * detailScale;
      }
      const rainGeometry = new THREE.BufferGeometry();
      rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const rain = new THREE.LineSegments(
        rainGeometry,
        new THREE.LineBasicMaterial({ color: '#a6d2eb', transparent: true, opacity: 0.38, toneMapped: false }),
      );
      rain.name = 'condition-stormbound-rain';
      this.group.add(rain);
      const puddleCount = clampInt(Math.round(5 + span / 20), 5, 12);
      for (let index = 0; index < puddleCount; index += 1) {
        addPool(`rain-puddle-${index}`, '#315a6d', 0.46, rng.float(0.45, 1.45) * detailScale);
      }
    }
  }

  private addProp(prop: RoomProp): void {
    const kind = resolveKind(prop.kind, prop.label);
    // Legacy room payloads can still contain the old fake exit. Dream changes
    // now happen through R/touch/gamepad input, so never render portal models.
    if (kind === 'door_fake') return;
    const mesh = buildModel(
      kind,
      prop.color || '#6a7a8a',
      prop.color || '#c4b59a',
      prop.assetId,
    );
    this.conditionEffects.push(
      ...applyModelCondition(mesh, this.spec?.condition ?? 'normal', `${this.spec?.seed}:prop:${prop.id}`),
    );
    scaleModelToBounds(mesh, kind, prop.scale);
    // Models are feet-origin; keep y at floor unless explicitly elevated.
    mesh.position.set(prop.position.x, Math.max(0, prop.position.y), prop.position.z);
    mesh.rotation.y = prop.rotationY ?? 0;
    this.group.add(mesh);

    const box = feetBounds(mesh.position, prop.scale, prop.rotationY ?? 0);
    if (prop.solid !== false) {
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
    this.conditionEffects.push(
      ...applyModelCondition(mesh, this.spec?.condition ?? 'normal', `${this.spec?.seed}:entity:${ent.id}`),
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

  private addCollider(box: ColliderBox, label?: string): void {
    this.colliders.push({ ...box, label: label ?? box.label });
  }

}

function applyModelCondition(
  root: THREE.Group,
  condition: RoomCondition,
  seed: string,
): AnimatedConditionEffect[] {
  if (condition === 'normal') return [];
  const rng = new SeededRng(seed);
  const materialClones = new Map<THREE.Material, THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const cloneMaterial = (material: THREE.Material): THREE.Material => {
      const cached = materialClones.get(material);
      if (cached) return cached;
      const clone = material.clone();
      applyConditionToMaterial(clone, condition);
      materialClones.set(material, clone);
      return clone;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneMaterial)
      : cloneMaterial(object.material);
  });

  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) return [];
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const width = Math.max(0.12, size.x);
  const height = Math.max(0.12, size.y);
  const depth = Math.max(0.12, size.z);
  const overlays = new THREE.Group();
  overlays.name = `condition-overlay-${condition}`;
  const animated: AnimatedConditionEffect[] = [];
  const markSolid = <T extends THREE.Object3D>(object: T): T => {
    object.userData.keepSolid = true;
    return object;
  };
  const addFrontMark = (
    color: string,
    opacity: number,
    index: number,
    emissive = '#000000',
  ): void => {
    const mark = markSolid(new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 12),
      new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity: emissive === '#000000' ? 0 : 0.36,
        roughness: condition === 'bloodied' || condition === 'slimed' ? 0.24 : 0.9,
        transparent: opacity < 1,
        opacity,
        depthWrite: opacity > 0.76,
        side: THREE.DoubleSide,
      }),
    ));
    mark.name = `condition-${condition}-decal-${index}`;
    mark.position.set(
      center.x + rng.float(-width * 0.25, width * 0.25),
      bounds.min.y + rng.float(height * 0.22, height * 0.82),
      bounds.max.z + depth * 0.012,
    );
    mark.rotation.z = rng.float(-Math.PI, Math.PI);
    mark.scale.set(
      width * rng.float(0.18, 0.42),
      height * rng.float(0.08, 0.2),
      1,
    );
    overlays.add(mark);
  };

  switch (condition) {
    case 'bloodied':
      addFrontMark('#61000b', 0.9, 0);
      addFrontMark('#360006', 0.82, 1);
      break;
    case 'slimed': {
      const slimeMaterial = new THREE.MeshStandardMaterial({
        color: '#64c93f',
        emissive: '#254d18',
        emissiveIntensity: 0.2,
        roughness: 0.16,
        transparent: true,
        opacity: 0.72,
      });
      const cap = markSolid(new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), slimeMaterial));
      cap.name = 'condition-slimed-cap';
      cap.position.set(center.x, bounds.max.y + height * 0.015, center.z);
      cap.scale.set(width * 0.44, height * 0.1, depth * 0.42);
      overlays.add(cap);
      for (let index = 0; index < 2; index += 1) {
        const dripHeight = height * rng.float(0.16, 0.42);
        const drip = markSolid(new THREE.Mesh(
          new THREE.CylinderGeometry(width * 0.025, width * 0.045, dripHeight, 7),
          slimeMaterial,
        ));
        drip.name = `condition-slimed-drip-${index}`;
        drip.position.set(
          center.x + (index ? 1 : -1) * width * rng.float(0.22, 0.38),
          bounds.max.y - dripHeight * 0.48,
          bounds.max.z + depth * 0.025,
        );
        overlays.add(drip);
      }
      break;
    }
    case 'scorched':
    case 'burning': {
      addFrontMark('#100c09', 0.94, 0);
      addFrontMark('#2b1209', 0.9, 1, condition === 'burning' ? '#a62d08' : '#000000');
      if (condition === 'burning' && rng.chance(0.58)) {
        const flame = makeFlame(Math.min(width, height) * rng.float(0.18, 0.34));
        flame.position.set(
          center.x + rng.float(-width * 0.18, width * 0.18),
          bounds.max.y,
          center.z,
        );
        overlays.add(flame);
        animated.push({
          object: flame,
          baseScale: flame.scale.clone(),
          phase: stablePhase(`${seed}:flame`),
          speed: rng.float(5.2, 8.4),
        });
      }
      break;
    }
    case 'ruined': {
      const crackMaterial = new THREE.MeshStandardMaterial({ color: '#24211d', roughness: 1 });
      for (let index = 0; index < 2; index += 1) {
        const crack = markSolid(new THREE.Mesh(
          new THREE.BoxGeometry(width * rng.float(0.025, 0.055), height * rng.float(0.24, 0.46), depth * 0.025),
          crackMaterial,
        ));
        crack.name = `condition-ruined-crack-${index}`;
        crack.position.set(
          center.x + (index ? 1 : -1) * width * rng.float(0.12, 0.28),
          center.y + rng.float(-height * 0.15, height * 0.15),
          bounds.max.z + depth * 0.016,
        );
        crack.rotation.z = rng.float(-0.7, 0.7);
        overlays.add(crack);
      }
      break;
    }
    case 'overgrown': {
      const mossMaterial = new THREE.MeshStandardMaterial({ color: '#39762f', roughness: 0.94 });
      for (let index = 0; index < 4; index += 1) {
        const moss = markSolid(new THREE.Mesh(new THREE.SphereGeometry(0.5, 9, 6), mossMaterial));
        moss.name = `condition-overgrown-moss-${index}`;
        moss.position.set(
          center.x + rng.float(-width * 0.42, width * 0.42),
          bounds.max.y + rng.float(-height * 0.06, height * 0.035),
          center.z + rng.float(-depth * 0.38, depth * 0.38),
        );
        moss.scale.set(
          width * rng.float(0.08, 0.22),
          height * rng.float(0.035, 0.09),
          depth * rng.float(0.08, 0.22),
        );
        overlays.add(moss);
      }
      break;
    }
    case 'frozen': {
      const iceMaterial = new THREE.MeshStandardMaterial({
        color: '#b9f2ff',
        emissive: '#2d7083',
        emissiveIntensity: 0.12,
        roughness: 0.14,
        transparent: true,
        opacity: 0.76,
      });
      const cap = markSolid(new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 7), iceMaterial));
      cap.name = 'condition-frozen-cap';
      cap.position.set(center.x, bounds.max.y, center.z);
      cap.scale.set(width * 0.45, height * 0.075, depth * 0.44);
      overlays.add(cap);
      for (let index = 0; index < 3; index += 1) {
        const spikeHeight = height * rng.float(0.13, 0.3);
        const spike = markSolid(new THREE.Mesh(
          new THREE.ConeGeometry(width * rng.float(0.035, 0.085), spikeHeight, 6),
          iceMaterial,
        ));
        spike.name = `condition-frozen-spike-${index}`;
        spike.position.set(
          center.x + rng.float(-width * 0.34, width * 0.34),
          bounds.max.y + spikeHeight * 0.5,
          center.z + rng.float(-depth * 0.3, depth * 0.3),
        );
        overlays.add(spike);
      }
      break;
    }
    case 'flooded': {
      const wetMaterial = new THREE.MeshStandardMaterial({
        color: '#4ba2b2',
        emissive: '#123a47',
        emissiveIntensity: 0.1,
        roughness: 0.08,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      });
      const waterline = markSolid(new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 12, 7),
        wetMaterial,
      ));
      waterline.name = 'condition-flooded-waterline';
      waterline.position.set(center.x, bounds.min.y + height * 0.04, center.z);
      waterline.scale.set(width * 0.52, height * 0.055, depth * 0.52);
      overlays.add(waterline);
      addFrontMark('#76c2ca', 0.42, 0, '#174a55');
      break;
    }
    case 'dusty':
      addFrontMark('#b7a37b', 0.52, 0);
      addFrontMark('#826f52', 0.34, 1);
      break;
    case 'moldy': {
      addFrontMark('#596b29', 0.78, 0);
      addFrontMark('#84913c', 0.63, 1);
      const bloom = markSolid(new THREE.Mesh(
        new THREE.SphereGeometry(Math.min(width, height) * 0.08, 8, 5),
        new THREE.MeshStandardMaterial({ color: '#9b9e42', roughness: 0.95 }),
      ));
      bloom.name = 'condition-moldy-bloom';
      bloom.scale.y = 0.45;
      bloom.position.set(center.x, bounds.max.y + height * 0.015, center.z);
      overlays.add(bloom);
      break;
    }
    case 'electrified': {
      const arcPoints = [
        new THREE.Vector3(center.x - width * 0.34, center.y - height * 0.12, bounds.max.z + depth * 0.025),
        new THREE.Vector3(center.x - width * 0.08, center.y + height * 0.16, bounds.max.z + depth * 0.03),
        new THREE.Vector3(center.x + width * 0.04, center.y - height * 0.02, bounds.max.z + depth * 0.035),
        new THREE.Vector3(center.x + width * 0.32, center.y + height * 0.22, bounds.max.z + depth * 0.03),
      ];
      const arc = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(arcPoints),
        new THREE.LineBasicMaterial({ color: '#74f8ff', transparent: true, opacity: 0.9, toneMapped: false }),
      );
      arc.name = 'condition-electrified-model-arc';
      overlays.add(arc);
      animated.push({
        object: arc,
        baseScale: arc.scale.clone(),
        phase: stablePhase(`${seed}:model-arc`),
        speed: rng.float(2.4, 4.2),
      });
      break;
    }
    case 'haunted': {
      const aura = markSolid(new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 12, 8),
        new THREE.MeshBasicMaterial({
          color: '#d5ddff',
          transparent: true,
          opacity: 0.13,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
      ));
      aura.name = 'condition-haunted-aura';
      aura.position.copy(center);
      aura.scale.set(width * 0.56, height * 0.56, depth * 0.56);
      overlays.add(aura);
      animated.push({
        object: aura,
        baseScale: aura.scale.clone(),
        phase: stablePhase(`${seed}:haunted-aura`),
        speed: rng.float(0.4, 0.72),
      });
      break;
    }
    case 'gilded': {
      const goldMaterial = new THREE.MeshStandardMaterial({
        color: '#e2b93e',
        emissive: '#5a3805',
        emissiveIntensity: 0.07,
        metalness: 0.88,
        roughness: 0.22,
      });
      for (let index = 0; index < 2; index += 1) {
        const plate = markSolid(new THREE.Mesh(
          new THREE.BoxGeometry(width * rng.float(0.18, 0.38), height * rng.float(0.035, 0.08), depth * 0.035),
          goldMaterial,
        ));
        plate.name = `condition-gilded-plate-${index}`;
        plate.position.set(
          center.x + (index ? 1 : -1) * width * 0.23,
          bounds.min.y + height * rng.float(0.2, 0.82),
          bounds.max.z + depth * 0.025,
        );
        plate.rotation.z = rng.float(-0.7, 0.7);
        overlays.add(plate);
      }
      break;
    }
    case 'bioluminescent': {
      const glowMaterial = new THREE.MeshStandardMaterial({
        color: '#72ffc4',
        emissive: '#31ef9a',
        emissiveIntensity: 1.05,
        roughness: 0.26,
      });
      for (let index = 0; index < 2; index += 1) {
        const glow = markSolid(new THREE.Mesh(
          new THREE.SphereGeometry(Math.min(width, height) * rng.float(0.045, 0.085), 9, 6),
          glowMaterial,
        ));
        glow.name = `condition-bioluminescent-growth-${index}`;
        glow.position.set(
          center.x + (index ? 1 : -1) * width * rng.float(0.18, 0.34),
          bounds.min.y + height * rng.float(0.32, 0.86),
          bounds.max.z + depth * 0.035,
        );
        overlays.add(glow);
        animated.push({
          object: glow,
          baseScale: glow.scale.clone(),
          phase: stablePhase(`${seed}:growth:${index}`),
          speed: rng.float(0.48, 0.92),
        });
      }
      break;
    }
    case 'stormbound':
      addFrontMark('#7da5b9', 0.38, 0, '#1c465c');
      addFrontMark('#354f60', 0.28, 1);
      break;
    default:
      break;
  }

  if (overlays.children.length) root.add(overlays);
  return animated;
}

function applyConditionToMaterial(material: THREE.Material, condition: RoomCondition): void {
  const candidate = material as THREE.Material & {
    color?: THREE.Color;
    emissive?: THREE.Color;
    emissiveIntensity?: number;
    roughness?: number;
    metalness?: number;
  };
  if (candidate.color instanceof THREE.Color) {
    switch (condition) {
      case 'bloodied':
        candidate.color.multiplyScalar(0.72);
        break;
      case 'slimed':
        candidate.color.lerp(new THREE.Color('#39782d'), 0.18);
        break;
      case 'scorched':
        candidate.color.multiplyScalar(0.31).lerp(new THREE.Color('#261710'), 0.24);
        break;
      case 'burning':
        candidate.color.multiplyScalar(0.23).lerp(new THREE.Color('#2c120c'), 0.3);
        break;
      case 'ruined':
        candidate.color.lerp(new THREE.Color('#625e56'), 0.32).multiplyScalar(0.78);
        break;
      case 'overgrown':
        candidate.color.lerp(new THREE.Color('#365d31'), 0.22);
        break;
      case 'frozen':
        candidate.color.lerp(new THREE.Color('#a5deeb'), 0.38);
        break;
      case 'flooded':
        candidate.color.lerp(new THREE.Color('#397f8f'), 0.26);
        break;
      case 'dusty':
        candidate.color.lerp(new THREE.Color('#a28d68'), 0.34);
        break;
      case 'moldy':
        candidate.color.lerp(new THREE.Color('#52652c'), 0.3);
        break;
      case 'electrified':
        candidate.color.lerp(new THREE.Color('#53b8c5'), 0.2);
        break;
      case 'haunted':
        candidate.color.lerp(new THREE.Color('#b4bbcf'), 0.36).multiplyScalar(0.86);
        break;
      case 'gilded':
        candidate.color.lerp(new THREE.Color('#d5a82e'), 0.55);
        break;
      case 'bioluminescent':
        candidate.color.lerp(new THREE.Color('#1e705a'), 0.34).multiplyScalar(0.78);
        break;
      case 'stormbound':
        candidate.color.lerp(new THREE.Color('#526978'), 0.3).multiplyScalar(0.82);
        break;
      default:
        break;
    }
  }
  if (typeof candidate.roughness === 'number') {
    if (condition === 'slimed' || condition === 'frozen') candidate.roughness = 0.22;
    if (condition === 'flooded' || condition === 'stormbound') candidate.roughness = 0.24;
    if (condition === 'dusty' || condition === 'moldy') candidate.roughness = 0.96;
    if (condition === 'electrified') candidate.roughness = Math.min(candidate.roughness, 0.38);
    if (condition === 'gilded') candidate.roughness = 0.26;
    if (condition === 'bioluminescent') candidate.roughness = Math.min(candidate.roughness, 0.42);
    if (condition === 'scorched' || condition === 'burning' || condition === 'ruined') {
      candidate.roughness = 0.96;
    }
  }
  if (typeof candidate.metalness === 'number') {
    if (condition === 'gilded') candidate.metalness = Math.max(0.68, candidate.metalness);
    else if (condition === 'electrified') candidate.metalness = Math.max(0.32, candidate.metalness);
    else if (condition !== 'frozen') candidate.metalness *= condition === 'slimed' ? 0.45 : 0.2;
  }
  if (
    (condition === 'burning' || condition === 'electrified' || condition === 'bioluminescent') &&
    candidate.emissive instanceof THREE.Color &&
    typeof candidate.emissiveIntensity === 'number'
  ) {
    const glowColor = condition === 'burning'
      ? '#ff3f0b'
      : condition === 'electrified'
        ? '#43eaff'
        : '#2af19a';
    candidate.emissive.lerp(new THREE.Color(glowColor), condition === 'burning' ? 0.38 : 0.48);
    candidate.emissiveIntensity = Math.max(condition === 'bioluminescent' ? 0.26 : 0.12, candidate.emissiveIntensity * 0.72);
  }
  material.needsUpdate = true;
}

function makeFlame(scale: number): THREE.Group {
  const group = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.ConeGeometry(0.38, 1.25, 9),
    new THREE.MeshBasicMaterial({
      color: '#ff4b16',
      transparent: true,
      opacity: 0.76,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  outer.position.y = 0.62;
  const inner = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.78, 8),
    new THREE.MeshBasicMaterial({
      color: '#ffd43b',
      transparent: true,
      opacity: 0.9,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  inner.position.y = 0.38;
  outer.userData.keepSolid = true;
  inner.userData.keepSolid = true;
  group.userData.keepSolid = true;
  group.add(outer, inner);
  group.scale.setScalar(Math.max(0.08, scale));
  return group;
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

function animateBillboard(
  root: THREE.Object3D,
  phase: number,
  behavior: RoomEntity['behavior'],
): void {
  const sprite = root.getObjectByName('sprite-actor');
  if (!(sprite instanceof THREE.Sprite)) return;
  const baseScale = sprite.userData.baseScale as THREE.Vector3 | undefined;
  const basePosition = sprite.userData.basePosition as THREE.Vector3 | undefined;
  if (!baseScale || !basePosition) return;
  const moving = behavior === 'wander' || behavior === 'orbit';
  const cadence = moving ? 3.4 : 0.72;
  const step = Math.sin(phase * cadence);
  const lift = moving ? Math.abs(step) * 0.035 : Math.sin(phase * cadence) * 0.012;
  sprite.position.set(
    basePosition.x + (moving ? step * 0.018 : 0),
    basePosition.y + lift,
    basePosition.z,
  );
  sprite.scale.set(
    baseScale.x * (1 - Math.abs(step) * (moving ? 0.018 : 0.004)),
    baseScale.y * (1 + Math.abs(step) * (moving ? 0.016 : 0.005)),
    baseScale.z,
  );
}

function setRigAxis(object: THREE.Object3D | undefined, axis: 'x' | 'y', offset: number): void {
  if (!object) return;
  const base = object.userData.baseRotation as { x?: number; y?: number } | undefined;
  object.rotation[axis] = (base?.[axis] ?? 0) + offset;
}

function makeSignTexture(
  sign: ProceduralSignText,
  spec: RoomSpec,
  index: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 448;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);
  const colors = signColors(spec);
  const rng = new SeededRng(`${spec.seed}:sign-texture:${index}`);

  context.fillStyle = colors.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = colors.band;
  context.fillRect(0, 0, canvas.width, 54);
  context.fillRect(0, canvas.height - 76, canvas.width, 76);
  context.strokeStyle = colors.border;
  context.lineWidth = 18;
  context.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);
  context.lineWidth = 3;
  context.strokeRect(38, 38, canvas.width - 76, canvas.height - 76);

  const lines = balancedSignLines(sign.headline.toUpperCase());
  context.fillStyle = colors.ink;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const maxFont = lines.length === 1 ? 118 : 94;
  const fontSize = fitSignFont(context, lines, 890, maxFont, 50);
  context.font = `800 ${fontSize}px "Arial Narrow", "Helvetica Neue", sans-serif`;
  const lineHeight = fontSize * 0.94;
  const centerY = 205;
  lines.forEach((line, lineIndex) => {
    const y = centerY + (lineIndex - (lines.length - 1) * 0.5) * lineHeight;
    context.fillText(line, canvas.width * 0.5, y);
  });

  context.fillStyle = colors.caption;
  context.font = '700 35px "Arial Narrow", "Helvetica Neue", sans-serif';
  context.letterSpacing = '5px';
  context.fillText(sign.caption.toUpperCase(), canvas.width * 0.5, canvas.height - 39);

  // Cheap deterministic wear makes identical words feel printed in different places.
  for (let mark = 0; mark < 48; mark += 1) {
    const alpha = rng.float(0.025, spec.condition === 'ruined' || spec.condition === 'scorched' ? 0.18 : 0.08);
    context.fillStyle = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
    context.fillRect(
      rng.int(22, canvas.width - 28),
      rng.int(20, canvas.height - 24),
      rng.int(2, 32),
      rng.int(1, 8),
    );
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function balancedSignLines(headline: string): string[] {
  if (headline.length <= 22) return [headline];
  const words = headline.split(' ');
  if (words.length < 2) return [headline];
  let bestIndex = 1;
  let bestDifference = Infinity;
  for (let index = 1; index < words.length; index += 1) {
    const first = words.slice(0, index).join(' ');
    const second = words.slice(index).join(' ');
    const difference = Math.abs(first.length - second.length);
    if (difference < bestDifference) {
      bestDifference = difference;
      bestIndex = index;
    }
  }
  return [words.slice(0, bestIndex).join(' '), words.slice(bestIndex).join(' ')];
}

function fitSignFont(
  context: CanvasRenderingContext2D,
  lines: readonly string[],
  maxWidth: number,
  maximum: number,
  minimum: number,
): number {
  for (let size = maximum; size >= minimum; size -= 2) {
    context.font = `800 ${size}px "Arial Narrow", "Helvetica Neue", sans-serif`;
    if (lines.every((line) => context.measureText(line).width <= maxWidth)) return size;
  }
  return minimum;
}

function signColors(spec: RoomSpec): {
  background: string;
  ink: string;
  caption: string;
  band: string;
  border: string;
} {
  switch (spec.condition) {
    case 'bloodied':
      return { background: '#e8ddcf', ink: '#510811', caption: '#f5dfe1', band: '#680914', border: '#36040a' };
    case 'slimed':
      return { background: '#15240e', ink: '#c8ff86', caption: '#081006', band: '#76c93d', border: '#9cf15c' };
    case 'scorched':
    case 'burning':
      return { background: '#25120b', ink: '#ffbd63', caption: '#241006', band: '#f56b25', border: '#ff9d3e' };
    case 'ruined':
      return { background: '#504d47', ink: '#ece5d4', caption: '#e2ddd1', band: '#282724', border: '#b0a995' };
    case 'overgrown':
      return { background: '#17331b', ink: '#d5f2b0', caption: '#102411', band: '#6f9d46', border: '#a8cb6f' };
    case 'frozen':
      return { background: '#d2edf3', ink: '#173e52', caption: '#e9fbff', band: '#397c9d', border: '#8fd8ee' };
    case 'flooded':
      return { background: '#153b46', ink: '#d7fbff', caption: '#0e303a', band: '#65d6df', border: '#9beef1' };
    case 'dusty':
      return { background: '#756a54', ink: '#f2e6c5', caption: '#392f20', band: '#c7a96c', border: '#dfc58d' };
    case 'moldy':
      return { background: '#2a3320', ink: '#d8e3a7', caption: '#182010', band: '#87924b', border: '#b0bd69' };
    case 'electrified':
      return { background: '#061c28', ink: '#baf8ff', caption: '#021219', band: '#42e3ff', border: '#88f3ff' };
    case 'haunted':
      return { background: '#242633', ink: '#e7ecff', caption: '#20212b', band: '#aeb9e8', border: '#d7ddff' };
    case 'gilded':
      return { background: '#2b210b', ink: '#ffe47d', caption: '#2b210b', band: '#d8a92d', border: '#f3d367' };
    case 'bioluminescent':
      return { background: '#071d20', ink: '#b6ffd8', caption: '#061517', band: '#5cf2b6', border: '#85ffdb' };
    case 'stormbound':
      return { background: '#242b35', ink: '#eef5ff', caption: '#1c222a', band: '#8fa9c8', border: '#c8d9ec' };
    default:
      return {
        background: spec.palette.walls,
        ink: spec.palette.light,
        caption: spec.palette.floor,
        band: spec.palette.accent,
        border: spec.palette.light,
      };
  }
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

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
