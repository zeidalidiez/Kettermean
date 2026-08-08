import * as THREE from 'three';
import { PLAYER } from '../config';
import type { BuiltRoom, ColliderBox, RoomEntity, RoomProp, RoomSpec, Vec3 } from '../types';
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

export class RoomWorld {
  readonly group = new THREE.Group();
  private colliders: ColliderBox[] = [];
  private linkTriggers: ColliderBox[] = [];
  private spawn: Vec3 = { x: 0, y: PLAYER.eyeHeight, z: 0 };
  private liveEntities: LiveEntity[] = [];
  private fog: THREE.Fog | null = null;
  private lights: THREE.Light[] = [];
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
    ring(0.08, 0.16, 0.08, baseMat);
    ring(h - 0.1, 0.1, 0.07, trimMat);

    const walls: Array<'north' | 'south' | 'east' | 'west'> = [
      'north',
      'south',
      'east',
      'west',
    ];

    for (const side of walls) {
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

    for (const prop of spec.props) {
      this.addProp(prop);
    }
    for (const ent of spec.entities) {
      this.addEntity(ent);
    }

    // Ceiling fluorescents — visible anchors + real light sources
    const span = Math.max(spec.width, spec.depth);
    for (let i = 0; i < 3; i += 1) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(Math.min(4.2, spec.width * 0.28), 0.06, 0.4),
        new THREE.MeshStandardMaterial({
          color: '#ffffff',
          emissive: new THREE.Color(spec.palette.light),
          emissiveIntensity: 2.2,
          roughness: 0.35,
        }),
      );
      const x = (i - 1) * Math.min(5, halfW * 0.55);
      strip.position.set(x, h - 0.12, 0);
      this.group.add(strip);

      const bulb = new THREE.PointLight(spec.palette.light, 1.1, span * 1.35, 1.6);
      bulb.position.set(x, h - 0.35, 0);
      this.lights.push(bulb);
    }

    const ambient = new THREE.AmbientLight(spec.palette.ambient, 0.95);
    const hemi = new THREE.HemisphereLight(spec.palette.light, spec.palette.floor, 0.85);
    const key = new THREE.DirectionalLight(spec.palette.light, 0.75);
    key.position.set(halfW * 0.35, h * 0.9, halfD * 0.25);
    const fill = new THREE.DirectionalLight(spec.palette.ambient, 0.35);
    fill.position.set(-halfW * 0.5, h * 0.6, -halfD * 0.3);
    this.lights.push(ambient, hemi, key, fill);
    for (const l of this.lights) scene.add(l);

    this.fog = new THREE.Fog(spec.palette.fog, Math.max(8, spec.fogNear), Math.max(spec.fogFar, spec.fogNear + 18));
    scene.fog = this.fog;
    scene.background = new THREE.Color(spec.palette.fog);

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
    this.colliders = [];
    this.linkTriggers = [];
    this.liveEntities = [];
    this.fog = null;
    this.spec = null;
    if (scene.fog) scene.fog = null;
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
