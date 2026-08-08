import * as THREE from 'three';
import { PLAYER } from '../config';
import type { ColliderBox, InputFrame, PhysicsModifiers } from '../types';

export class PlayerController {
  readonly camera: THREE.PerspectiveCamera;
  readonly position = new THREE.Vector3(0, PLAYER.eyeHeight, 0);
  readonly velocity = new THREE.Vector3();

  private yaw = 0;
  private pitch = 0;
  private onGround = false;
  private physics: PhysicsModifiers = {
    gravity: 1,
    moveSpeed: 1,
    friction: 1,
    bounce: 0,
    sway: 0.3,
  };
  private bobPhase = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(72, aspect, 0.08, 200);
    this.camera.rotation.order = 'YXZ';
  }

  setPhysics(physics: PhysicsModifiers): void {
    this.physics = physics;
  }

  spawnAt(x: number, y: number, z: number, yaw = 0): void {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = 0;
    this.onGround = true;
    this.syncCamera(0);
  }

  update(dt: number, input: InputFrame, colliders: ColliderBox[]): ColliderBox | null {
    this.yaw -= input.lookX;
    this.pitch -= input.lookY;
    const maxPitch = Math.PI / 2 - 0.05;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

    const speedBase = (input.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed) * this.physics.moveSpeed;
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const wish = new THREE.Vector3();
    wish.addScaledVector(forward, input.moveZ);
    wish.addScaledVector(right, input.moveX);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speedBase);

    const friction = Math.max(0.05, this.physics.friction);
    this.velocity.x += (wish.x - this.velocity.x) * Math.min(1, dt * 10 * friction);
    this.velocity.z += (wish.z - this.velocity.z) * Math.min(1, dt * 10 * friction);

    const gravity = PLAYER.gravity * this.physics.gravity;
    if (!this.onGround) {
      this.velocity.y -= gravity * dt;
    } else if (input.jump) {
      this.velocity.y = PLAYER.jumpVelocity;
      this.onGround = false;
    } else {
      this.velocity.y = 0;
    }

    let linkHit: ColliderBox | null = null;

    // Axis-separated AABB resolution keeps wall-slide stable without a physics engine.
    const xMove = this.moveAxis('x', this.velocity.x * dt, colliders);
    const zMove = this.moveAxis('z', this.velocity.z * dt, colliders);
    const verticalDelta = this.velocity.y * dt;
    const yMove = this.moveAxis('y', verticalDelta, colliders);
    linkHit = xMove.linkHit ?? zMove.linkHit ?? yMove.linkHit;
    if (verticalDelta < 0) this.onGround = yMove.landed;

    // Soft floor clamp if room has no floor collider miss.
    if (this.position.y < PLAYER.eyeHeight * 0.35) {
      this.position.y = PLAYER.eyeHeight;
      this.velocity.y = Math.abs(this.velocity.y) * this.physics.bounce;
      this.onGround = true;
    }

    this.syncCamera(dt);
    return linkHit;
  }

  private moveAxis(
    axis: 'x' | 'y' | 'z',
    delta: number,
    colliders: ColliderBox[],
  ): { linkHit: ColliderBox | null; landed: boolean } {
    if (delta === 0) return { linkHit: null, landed: false };
    this.position[axis] += delta;

    const radius = PLAYER.radius;
    const feet = this.position.y - PLAYER.eyeHeight;
    const head = this.position.y + 0.2;
    let hit: ColliderBox | null = null;
    let landed = false;

    for (const box of colliders) {
      const overlaps =
        this.position.x + radius > box.minX &&
        this.position.x - radius < box.maxX &&
        head > box.minY &&
        feet < box.maxY &&
        this.position.z + radius > box.minZ &&
        this.position.z - radius < box.maxZ;

      if (!overlaps) continue;

      if (box.linksOnTouch) {
        hit = box;
        // Link triggers are sensors. A separate collider represents a solid door.
        continue;
      }

      if (axis === 'x') {
        if (delta > 0) this.position.x = box.minX - radius;
        else this.position.x = box.maxX + radius;
        this.velocity.x = -this.velocity.x * this.physics.bounce;
      } else if (axis === 'z') {
        if (delta > 0) this.position.z = box.minZ - radius;
        else this.position.z = box.maxZ + radius;
        this.velocity.z = -this.velocity.z * this.physics.bounce;
      } else {
        if (delta > 0) {
          this.position.y = box.minY - 0.2;
          this.velocity.y = 0;
        } else {
          this.position.y = box.maxY + PLAYER.eyeHeight;
          this.velocity.y = Math.abs(this.velocity.y) * this.physics.bounce;
          this.onGround = true;
          landed = true;
        }
      }
    }

    return { linkHit: hit, landed };
  }

  private syncCamera(dt: number): void {
    const moving = Math.hypot(this.velocity.x, this.velocity.z) > 0.4;
    if (moving && this.onGround) {
      this.bobPhase += dt * 9;
    }
    const bob = Math.sin(this.bobPhase) * 0.03 * this.physics.sway;
    const sway = Math.cos(this.bobPhase * 0.5) * 0.01 * this.physics.sway;

    this.camera.position.set(this.position.x + sway, this.position.y + bob, this.position.z);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
