import { PLAYER } from '../config';
import type { InputFrame } from '../types';

interface StickState {
  x: number;
  y: number;
  active: boolean;
  pointerId: number | null;
}

interface PointerLockTarget {
  requestPointerLock?: () => Promise<void> | void;
}

/**
 * Pointer Lock is desktop-only in several touch browsers, notably iPhone Safari.
 * A missing method must be treated as a supported input mode difference rather
 * than an exception after the game menu has already been hidden.
 */
export function requestPointerLockIfSupported(target: PointerLockTarget): void {
  const request = target.requestPointerLock;
  if (typeof request !== 'function') return;
  try {
    const pending = request.call(target);
    if (pending && typeof pending.catch === 'function') {
      void pending.catch(() => undefined);
    }
  } catch {
    // Older implementations can throw synchronously. Keyboard, gamepad, and
    // touch controls remain usable without pointer lock.
  }
}

/**
 * Merges keyboard, pointer-lock mouse, gamepad, and dual touch sticks
 * into one InputFrame consumed by the player controller.
 */
export class InputManager {
  private keys = new Set<string>();
  private mouseDx = 0;
  private mouseDy = 0;
  private jumpBuffered = false;
  private pausePressed = false;
  private touchSprint = false;
  private gamepadPauseHeld = false;
  private enabled = false;
  private stickCleanups: Array<() => void> = [];

  private moveStick: StickState = { x: 0, y: 0, active: false, pointerId: null };
  private lookStick: StickState = { x: 0, y: 0, active: false, pointerId: null };

  private readonly canvas: HTMLCanvasElement;
  private readonly touchRoot: HTMLElement;
  private readonly moveZone: HTMLElement;
  private readonly lookZone: HTMLElement;
  private readonly moveKnob: HTMLElement;
  private readonly lookKnob: HTMLElement;
  private readonly jumpButton: HTMLButtonElement;
  private readonly sprintButton: HTMLButtonElement;
  private readonly pauseButton: HTMLButtonElement;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly onPauseRequested?: () => void,
  ) {
    this.canvas = canvas;
    this.touchRoot = el('touch-controls');
    this.moveZone = el('stick-move');
    this.lookZone = el('stick-look');
    this.moveKnob = this.moveZone.querySelector('.stick-knob') as HTMLElement;
    this.lookKnob = this.lookZone.querySelector('.stick-knob') as HTMLElement;
    this.jumpButton = el('touch-jump') as HTMLButtonElement;
    this.sprintButton = el('touch-sprint') as HTMLButtonElement;
    this.pauseButton = el('touch-pause') as HTMLButtonElement;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('pointerup', this.onGlobalPointerUp);
    window.addEventListener('pointercancel', this.onGlobalPointerUp);

    this.jumpButton.addEventListener('pointerdown', this.onJumpDown);
    this.sprintButton.addEventListener('pointerdown', this.onSprintDown);
    this.sprintButton.addEventListener('pointerup', this.onSprintUp);
    this.sprintButton.addEventListener('pointercancel', this.onSprintUp);
    this.pauseButton.addEventListener('pointerdown', this.onPauseDown);

    this.bindStick(this.moveZone, 'move');
    this.bindStick(this.lookZone, 'look');
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.keys.clear();
      this.mouseDx = 0;
      this.mouseDy = 0;
      this.jumpBuffered = false;
      this.pausePressed = false;
      this.touchSprint = false;
      this.gamepadPauseHeld = false;
      this.sprintButton.classList.remove('is-active');
      this.resetStick('move');
      this.resetStick('look');
      if (document.pointerLockElement === this.canvas) {
        document.exitPointerLock();
      }
    }
    this.syncTouchVisibility();
  }

  requestPointerLock(): void {
    if (!this.enabled) return;
    const coarsePointer = window.matchMedia?.('(hover: none), (pointer: coarse)').matches;
    if (coarsePointer) return;
    if (document.pointerLockElement !== this.canvas) {
      requestPointerLockIfSupported(this.canvas);
    }
  }

  sample(dt: number): InputFrame {
    let moveX = 0;
    let moveZ = 0;
    let lookX = 0;
    let lookY = 0;
    let sprint = false;
    let jump = false;

    if (this.enabled) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveZ += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveZ -= 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveX -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveX += 1;
      sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchSprint;

      moveX += this.moveStick.x;
      moveZ += -this.moveStick.y;

      lookX += this.mouseDx * PLAYER.lookSensitivity;
      lookY += this.mouseDy * PLAYER.lookSensitivity;
      this.mouseDx = 0;
      this.mouseDy = 0;

      lookX += this.lookStick.x * PLAYER.touchLookSensitivity * dt;
      lookY += this.lookStick.y * PLAYER.touchLookSensitivity * dt;

      const pad = navigator.getGamepads?.()[0];
      if (pad) {
        const lx = deadzone(pad.axes[0] ?? 0);
        const ly = deadzone(pad.axes[1] ?? 0);
        const rx = deadzone(pad.axes[2] ?? 0);
        const ry = deadzone(pad.axes[3] ?? 0);
        moveX += lx;
        moveZ += -ly;
        lookX += rx * PLAYER.gamepadLookSensitivity * dt;
        lookY += ry * PLAYER.gamepadLookSensitivity * dt;
        if (pad.buttons[0]?.pressed) jump = true;
        if (pad.buttons[1]?.pressed) sprint = true;
        const gamepadPause = Boolean(pad.buttons[9]?.pressed);
        if (gamepadPause && !this.gamepadPauseHeld) this.pausePressed = true;
        this.gamepadPauseHeld = gamepadPause;
      } else {
        this.gamepadPauseHeld = false;
      }

      if (this.jumpBuffered) {
        jump = true;
        this.jumpBuffered = false;
      }
    }

    const len = Math.hypot(moveX, moveZ);
    if (len > 1) {
      moveX /= len;
      moveZ /= len;
    }

    const pausePressed = this.pausePressed;
    this.pausePressed = false;

    return { moveX, moveZ, lookX, lookY, sprint, jump, pausePressed };
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('pointerup', this.onGlobalPointerUp);
    window.removeEventListener('pointercancel', this.onGlobalPointerUp);
    this.jumpButton.removeEventListener('pointerdown', this.onJumpDown);
    this.sprintButton.removeEventListener('pointerdown', this.onSprintDown);
    this.sprintButton.removeEventListener('pointerup', this.onSprintUp);
    this.sprintButton.removeEventListener('pointercancel', this.onSprintUp);
    this.pauseButton.removeEventListener('pointerdown', this.onPauseDown);
    for (const cleanup of this.stickCleanups) cleanup();
    this.stickCleanups = [];
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    if (e.code === 'Escape') {
      this.pausePressed = true;
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      this.jumpBuffered = true;
    }
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.enabled || document.pointerLockElement !== this.canvas) return;
    this.mouseDx += e.movementX;
    this.mouseDy += e.movementY;
  };

  private onPointerLockChange = (): void => {
    // Pause is handled by game when lock is lost while playing.
  };

  private onBlur = (): void => {
    this.keys.clear();
    this.mouseDx = 0;
    this.mouseDy = 0;
    this.jumpBuffered = false;
    this.pausePressed = false;
    this.touchSprint = false;
    this.gamepadPauseHeld = false;
    this.sprintButton.classList.remove('is-active');
    this.resetStick('move');
    this.resetStick('look');
  };

  private onJumpDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    event.preventDefault();
    this.jumpBuffered = true;
  };

  private onGlobalPointerUp = (event: PointerEvent): void => {
    if (this.touchSprint) {
      this.touchSprint = false;
      this.sprintButton.classList.remove('is-active');
    }
    if (this.moveStick.pointerId === event.pointerId) this.resetStick('move');
    if (this.lookStick.pointerId === event.pointerId) this.resetStick('look');
  };

  private onSprintDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    event.preventDefault();
    this.touchSprint = true;
    this.sprintButton.classList.add('is-active');
    try {
      this.sprintButton.setPointerCapture(event.pointerId);
    } catch {
      // Some embedded browsers do not expose pointer capture; the global
      // pointer-up/cancel path still clears sprint.
    }
  };

  private onSprintUp = (event: PointerEvent): void => {
    event.preventDefault();
    this.touchSprint = false;
    this.sprintButton.classList.remove('is-active');
  };

  private onPauseDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    event.preventDefault();
    if (this.onPauseRequested) {
      this.onPauseRequested();
      return;
    }
    this.pausePressed = true;
  };

  private bindStick(zone: HTMLElement, which: 'move' | 'look'): void {
    const maxRadius = 40;

    const onDown = (e: PointerEvent): void => {
      if (!this.enabled) return;
      e.preventDefault();
      const stick = which === 'move' ? this.moveStick : this.lookStick;
      stick.active = true;
      stick.pointerId = e.pointerId;
      try {
        zone.setPointerCapture(e.pointerId);
      } catch {
        // The window-level pointer-up/cancel path still releases the stick.
      }
      this.updateStick(zone, which, e, maxRadius);
    };

    const onMove = (e: PointerEvent): void => {
      const stick = which === 'move' ? this.moveStick : this.lookStick;
      if (!stick.active || stick.pointerId !== e.pointerId) return;
      e.preventDefault();
      this.updateStick(zone, which, e, maxRadius);
    };

    const onUp = (e: PointerEvent): void => {
      const stick = which === 'move' ? this.moveStick : this.lookStick;
      if (stick.pointerId !== e.pointerId) return;
      this.resetStick(which);
    };

    zone.addEventListener('pointerdown', onDown);
    zone.addEventListener('pointermove', onMove);
    zone.addEventListener('pointerup', onUp);
    zone.addEventListener('pointercancel', onUp);
    this.stickCleanups.push(() => {
      zone.removeEventListener('pointerdown', onDown);
      zone.removeEventListener('pointermove', onMove);
      zone.removeEventListener('pointerup', onUp);
      zone.removeEventListener('pointercancel', onUp);
    });
  }

  private updateStick(
    zone: HTMLElement,
    which: 'move' | 'look',
    e: PointerEvent,
    maxRadius: number,
  ): void {
    const rect = zone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const mag = Math.hypot(dx, dy);
    if (mag > maxRadius) {
      dx = (dx / mag) * maxRadius;
      dy = (dy / mag) * maxRadius;
    }
    const stick = which === 'move' ? this.moveStick : this.lookStick;
    stick.x = dx / maxRadius;
    stick.y = dy / maxRadius;
    const knob = which === 'move' ? this.moveKnob : this.lookKnob;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  private resetStick(which: 'move' | 'look'): void {
    const stick = which === 'move' ? this.moveStick : this.lookStick;
    stick.x = 0;
    stick.y = 0;
    stick.active = false;
    stick.pointerId = null;
    const knob = which === 'move' ? this.moveKnob : this.lookKnob;
    knob.style.transform = 'translate(0px, 0px)';
  }

  private syncTouchVisibility(): void {
    const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    if (this.enabled && coarse) {
      this.touchRoot.classList.remove('hidden');
      this.touchRoot.setAttribute('aria-hidden', 'false');
    } else {
      this.touchRoot.classList.add('hidden');
      this.touchRoot.setAttribute('aria-hidden', 'true');
    }
  }
}

function deadzone(v: number, z = 0.18): number {
  if (Math.abs(v) < z) return 0;
  const sign = Math.sign(v);
  return sign * ((Math.abs(v) - z) / (1 - z));
}

function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node;
}
