import * as THREE from 'three';
import { PLAYER } from '../config';
import type { BuiltRoom, ColliderBox, RoomEntity, RoomProp, RoomSpec, Vec3 } from '../types';

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

    const floorMat = mat(spec.palette.floor, 0.9, 0.05);
    const ceilMat = mat(spec.palette.ceiling, 0.95, 0.02);
    const wallMat = mat(spec.palette.walls, 0.85, 0.04);
    const accentMat = mat(spec.palette.accent, 0.7, 0.1);

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

    const open = new Set(spec.openSides ?? []);
    const walls: Array<{ side: 'north' | 'south' | 'east' | 'west'; open: boolean }> = [
      { side: 'north', open: open.has('north') },
      { side: 'south', open: open.has('south') },
      { side: 'east', open: open.has('east') },
      { side: 'west', open: open.has('west') },
    ];

    for (const w of walls) {
      if (w.open) {
        // Open side: low curb + fog bleed, still links if walked through void edge
        const curb = new THREE.Mesh(new THREE.BoxGeometry(w.side === 'east' || w.side === 'west' ? wallT : spec.width * 0.4, 0.25, w.side === 'north' || w.side === 'south' ? wallT : spec.depth * 0.4), accentMat);
        placeWall(curb, w.side, halfW, halfD, 0.12);
        this.group.add(curb);
        this.addLinkTrigger(edgeTrigger(w.side, halfW, halfD, h), `open:${w.side}`);
        continue;
      }

      const mesh =
        w.side === 'north' || w.side === 'south'
          ? new THREE.Mesh(new THREE.BoxGeometry(spec.width + wallT, h, wallT), wallMat)
          : new THREE.Mesh(new THREE.BoxGeometry(wallT, h, spec.depth + wallT), wallMat);
      placeWall(mesh, w.side, halfW, halfD, h / 2);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.addCollider(wallCollider(w.side, halfW, halfD, h, wallT, true), `wall:${w.side}`);
    }

    for (const prop of spec.props) {
      this.addProp(prop);
    }
    for (const ent of spec.entities) {
      this.addEntity(ent);
    }

    // Decorative strip lights
    for (let i = 0; i < 3; i += 1) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(Math.min(3.5, spec.width * 0.25), 0.05, 0.35),
        new THREE.MeshStandardMaterial({
          color: '#ffffff',
          emissive: new THREE.Color(spec.palette.light),
          emissiveIntensity: 1.2,
          roughness: 0.4,
        }),
      );
      strip.position.set((i - 1) * Math.min(4, halfW * 0.5), h - 0.15, 0);
      this.group.add(strip);
    }

    const ambient = new THREE.AmbientLight(spec.palette.ambient, 0.55);
    const hemi = new THREE.HemisphereLight(spec.palette.light, spec.palette.floor, 0.55);
    const key = new THREE.PointLight(spec.palette.light, 1.35, Math.max(spec.width, spec.depth) * 1.8, 2);
    key.position.set(0, h * 0.75, 0);
    key.castShadow = false;
    this.lights.push(ambient, hemi, key);
    for (const l of this.lights) scene.add(l);

    this.fog = new THREE.Fog(spec.palette.fog, spec.fogNear, spec.fogFar);
    scene.fog = this.fog;
    scene.background = new THREE.Color(spec.palette.fog);

    scene.add(this.group);
    this.spawn = { x: 0, y: PLAYER.eyeHeight, z: Math.min(2, halfD * 0.25) };

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

      // Keep link trigger roughly aligned for moving entities
      if (ent.data.linksOnTouch) {
        const idx = this.linkTriggers.findIndex((t) => t.label === `entity:${ent.data.id}`);
        if (idx >= 0) {
          const s = ent.data.scale;
          this.linkTriggers[idx] = {
            minX: m.position.x - s.x * 0.55,
            maxX: m.position.x + s.x * 0.55,
            minY: m.position.y - s.y * 0.55,
            maxY: m.position.y + s.y * 0.55,
            minZ: m.position.z - s.z * 0.55,
            maxZ: m.position.z + s.z * 0.55,
            linksOnTouch: true,
            label: `entity:${ent.data.id}`,
          };
        }
      }
    }
  }

  getColliders(): ColliderBox[] {
    // Merge static colliders with live entity link triggers
    const staticOnly = this.colliders.filter((c) => !c.label?.startsWith('entity:'));
    return [...staticOnly, ...this.linkTriggers.filter((t) => t.label?.startsWith('entity:'))];
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
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of materials) m.dispose();
      }
    });
    this.group.clear();
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
    const mesh = makeShape(prop.shape, prop.scale, prop.color, prop.emissive, prop.metalness, prop.roughness);
    mesh.position.set(prop.position.x, prop.position.y, prop.position.z);
    mesh.rotation.y = prop.rotationY ?? 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);

    const box = meshBounds(prop.position, prop.scale);
    if (prop.solid !== false) {
      this.addCollider({ ...box, linksOnTouch: prop.linksOnTouch, label: prop.label });
    } else if (prop.linksOnTouch) {
      this.addLinkTrigger({ ...box, linksOnTouch: true }, `ghost:${prop.label}`);
    } else if (prop.linksOnTouch) {
      this.addCollider({ ...box, linksOnTouch: true, label: prop.label });
    }
    if (prop.linksOnTouch && prop.solid !== false) {
      // wall-like props already in colliders with linksOnTouch
    }
  }

  private addEntity(ent: RoomEntity): void {
    const mesh = makeShape(ent.shape, ent.scale, ent.color, ent.emissive, 0.1, 0.7);
    mesh.position.set(ent.position.x, ent.position.y, ent.position.z);
    this.group.add(mesh);
    this.liveEntities.push({
      mesh,
      data: ent,
      origin: mesh.position.clone(),
      phase: Math.random() * Math.PI * 2,
    });
    if (ent.linksOnTouch) {
      this.addLinkTrigger(meshBounds(ent.position, ent.scale), `entity:${ent.id}`);
    } else {
      this.addCollider({ ...meshBounds(ent.position, ent.scale), label: ent.label });
    }
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

function mat(color: string, roughness: number, metalness: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function makeShape(
  shape: RoomProp['shape'],
  scale: Vec3,
  color: string,
  emissive?: string,
  metalness = 0.1,
  roughness = 0.8,
): THREE.Mesh {
  let geom: THREE.BufferGeometry;
  switch (shape) {
    case 'sphere':
      geom = new THREE.SphereGeometry(0.5, 18, 14);
      break;
    case 'cylinder':
      geom = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
      break;
    case 'cone':
      geom = new THREE.ConeGeometry(0.5, 1, 16);
      break;
    case 'torus':
      geom = new THREE.TorusGeometry(0.4, 0.18, 10, 20);
      break;
    case 'plane':
      geom = new THREE.BoxGeometry(1, 0.05, 1);
      break;
    default:
      geom = new THREE.BoxGeometry(1, 1, 1);
  }
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive: emissive ? new THREE.Color(emissive) : new THREE.Color(0x000000),
    emissiveIntensity: emissive ? 0.55 : 0,
  });
  const mesh = new THREE.Mesh(geom, material);
  mesh.scale.set(scale.x, scale.y, scale.z);
  return mesh;
}

function meshBounds(pos: Vec3, scale: Vec3): ColliderBox {
  return {
    minX: pos.x - scale.x * 0.5,
    maxX: pos.x + scale.x * 0.5,
    minY: pos.y - scale.y * 0.5,
    maxY: pos.y + scale.y * 0.5,
    minZ: pos.z - scale.z * 0.5,
    maxZ: pos.z + scale.z * 0.5,
  };
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

function edgeTrigger(
  side: 'north' | 'south' | 'east' | 'west',
  halfW: number,
  halfD: number,
  h: number,
): ColliderBox {
  return wallCollider(side, halfW, halfD, h, 0.8, true);
}
