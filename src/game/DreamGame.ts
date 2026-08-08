import * as THREE from 'three';
import { LINK, RANDOM_RESEED_EVERY } from '../config';
import { childSeed, randomSeed } from '../core/rng';
import type { AppSettings, GenerationContext, MoodAxis, RoomSpec } from '../types';
import { InputManager } from '../input/InputManager';
import { RoomGenerator } from '../llm/RoomGenerator';
import { PlayerController } from '../player/PlayerController';
import { RoomWorld } from '../world/RoomBuilder';

type GameState = 'menu' | 'playing' | 'paused' | 'linking';

interface NextRoomPlan {
  seed: string;
  rootSeed: string;
  linkIndex: number;
  context: GenerationContext;
}

export class DreamGame {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private player: PlayerController;
  private input: InputManager;
  private roomWorld = new RoomWorld();
  private generator: RoomGenerator;

  private state: GameState = 'menu';
  private settings: AppSettings;
  private rootSeed = '';
  private currentSeed = '';
  private linkIndex = 0;
  private previousTitles: string[] = [];
  private moodBias: MoodAxis = 'static';
  private lastLinkAt = 0;
  private linking = false;
  private raf = 0;
  private lastT = 0;
  private runEpoch = 0;
  private nextRoomPlan: NextRoomPlan | null = null;
  private toastTimer: number | null = null;

  private readonly canvas: HTMLCanvasElement;
  private readonly fade: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly hudTheme: HTMLElement;
  private readonly hudSeed: HTMLElement;
  private readonly menu: HTMLElement;
  private readonly pauseMenu: HTMLElement;
  private readonly toast: HTMLElement;

  constructor(settings: AppSettings) {
    this.settings = settings;
    this.canvas = must('game-canvas') as HTMLCanvasElement;
    this.fade = must('fade-overlay');
    this.hud = must('hud');
    this.hudTheme = must('hud-theme');
    this.hudSeed = must('hud-seed');
    this.menu = must('menu');
    this.pauseMenu = must('pause-menu');
    this.toast = must('status-toast');

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.player = new PlayerController(window.innerWidth / window.innerHeight);
    // Touch pause should be immediate even when a mobile browser throttles RAF.
    this.input = new InputManager(this.canvas, () => this.pause());
    this.generator = new RoomGenerator(settings);
    this.generator.setStatusHandler((msg) => {
      if (this.state !== 'menu') this.showToast(msg);
    });

    window.addEventListener('resize', this.onResize);
    this.canvas.addEventListener('click', this.onCanvasClick);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);

    this.loop = this.loop.bind(this);
  }

  updateSettings(settings: AppSettings): void {
    this.settings = settings;
    this.generator.updateSettings(settings);
  }

  start(): void {
    const runEpoch = ++this.runEpoch;
    this.generator.beginSession();
    this.rootSeed =
      this.settings.mode === 'seeded' && this.settings.seed.trim()
        ? this.settings.seed.trim()
        : randomSeed();
    this.currentSeed = this.rootSeed;
    this.linkIndex = 0;
    this.previousTitles = [];
    this.moodBias = 'static';
    this.nextRoomPlan = null;
    this.linking = false;
    this.fade.classList.remove('active');

    this.menu.classList.add('hidden');
    this.pauseMenu.classList.add('hidden');
    this.hud.classList.remove('hidden');

    // Pointer lock must happen in the same user-gesture turn as the click.
    // Do all awaits AFTER enabling input + requesting lock.
    this.state = 'playing';
    this.input.setEnabled(true);
    this.input.requestPointerLock();

    const ctx = this.makeCtx(this.currentSeed);
    const useLlm =
      this.settings.provider === 'browser' ||
      ((this.settings.provider === 'openai' || this.settings.provider === 'anthropic') &&
        Boolean(this.settings.apiKey.trim()));

    // Always enter a playable offline room immediately. Never block controls on the API.
    const boot = this.generator.getOrOffline(ctx);
    this.applyRoom(boot);
    this.renderer.render(this.scene, this.player.camera);
    this.startLoop();
    if (!useLlm) {
      this.showToast('Offline room');
      return;
    }

    if (this.settings.provider !== 'browser') {
      this.showToast('Warming the next LLM room…', false);
      this.schedulePrefetch();
      return;
    }

    // WebLLM download/compilation happens in a worker. The current room stays
    // untouched; the model only authors future rooms at deliberate link boundaries.
    this.showToast('Loading browser model…', true);
    void (async (): Promise<void> => {
      try {
        await this.generator.preloadBrowserModel();
        if (runEpoch !== this.runEpoch || this.state === 'menu') return;
        this.showToast('Browser model ready · warming next room', false);
        this.schedulePrefetch();
      } catch (err) {
        console.warn('[Kettermean] browser model preload failed', err);
        if (runEpoch === this.runEpoch && this.state !== 'menu') {
          this.showToast('Browser model unavailable · continuing offline');
        }
      }
    })();
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.stopLoop();
    this.input.setEnabled(false);
    this.pauseMenu.classList.remove('hidden');
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.pauseMenu.classList.add('hidden');
    this.input.setEnabled(true);
    this.input.requestPointerLock();
    this.startLoop();
  }

  quitToMenu(): void {
    this.runEpoch += 1;
    this.generator.endSession();
    this.state = 'menu';
    this.stopLoop();
    this.linking = false;
    this.nextRoomPlan = null;
    this.fade.classList.remove('active');
    this.input.setEnabled(false);
    this.pauseMenu.classList.add('hidden');
    this.hud.classList.add('hidden');
    this.menu.classList.remove('hidden');
    this.roomWorld.dispose(this.scene);
    this.hideToast();
  }

  dispose(): void {
    this.runEpoch += 1;
    this.generator.endSession();
    this.stopLoop();
    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('click', this.onCanvasClick);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.input.dispose();
    this.roomWorld.dispose(this.scene);
    this.renderer.dispose();
  }

  private applyRoom(spec: RoomSpec): void {
    const built = this.roomWorld.build(spec, this.scene);
    this.player.setPhysics(spec.physics);
    this.player.spawnAt(built.spawn.x, built.spawn.y, built.spawn.z, 0);
    this.previousTitles.push(spec.title);
    if (this.previousTitles.length > 12) this.previousTitles.shift();
    this.moodBias = spec.mood;
    this.hudTheme.textContent = `${spec.title} · ${spec.mood}`;
    this.hudSeed.textContent = `seed ${spec.seed}${spec.offline ? ' · offline' : ''}`;
    must('hud-hint').textContent = spec.blurb;
  }

  private makeCtx(
    seed: string,
    parent?: string,
    linkIndex = this.linkIndex,
  ): GenerationContext {
    return {
      seed,
      parentSeed: parent,
      previousTitles: [...this.previousTitles],
      moodBias: this.moodBias,
      allowGore: this.settings.allowGore,
      linkIndex,
    };
  }

  private schedulePrefetch(): void {
    const plan = this.ensureNextRoomPlan();
    this.generator.prefetch(plan.context);
  }

  private ensureNextRoomPlan(): NextRoomPlan {
    if (this.nextRoomPlan) return this.nextRoomPlan;
    const linkIndex = this.linkIndex + 1;
    let nextRoot = this.rootSeed;
    let seed: string;

    if (this.settings.mode === 'random' && linkIndex > 0 && linkIndex % RANDOM_RESEED_EVERY === 0) {
      nextRoot = randomSeed();
      seed = childSeed(nextRoot, `link-${linkIndex}`);
    } else if (this.settings.mode === 'seeded') {
      seed = childSeed(nextRoot, `link-${linkIndex}:${this.moodBias}`);
    } else {
      seed = childSeed(this.currentSeed, `link-${linkIndex}-${this.moodBias}`);
    }

    this.nextRoomPlan = {
      seed,
      rootSeed: nextRoot,
      linkIndex,
      context: this.makeCtx(seed, this.currentSeed, linkIndex),
    };
    return this.nextRoomPlan;
  }

  private async performLink(): Promise<void> {
    if (this.linking || this.state !== 'playing') return;
    const now = performance.now();
    if (now - this.lastLinkAt < LINK.cooldownMs) return;

    this.linking = true;
    this.state = 'linking';
    this.lastLinkAt = now;
    const runEpoch = this.runEpoch;

    const color = this.roomWorld.getSpec()?.linkColor ?? '#ffffff';
    this.fade.style.background = color;
    this.fade.classList.add('active');

    try {
      const plan = this.ensureNextRoomPlan();
      this.nextRoomPlan = null;
      this.linkIndex = plan.linkIndex;
      this.rootSeed = plan.rootSeed;
      this.currentSeed = plan.seed;

      // Linking must never wait on a network request or model download. Use a
      // completed prefetch when available and deterministic offline output otherwise.
      const spec = this.generator.getOrOffline(plan.context);
      await sleep(LINK.fadeMs);
      if (runEpoch !== this.runEpoch) return;
      this.applyRoom(spec);
      this.state = 'playing';
      this.renderer.render(this.scene, this.player.camera);
      this.startLoop();
      this.schedulePrefetch();
    } catch (err) {
      console.error('[Kettermean] room link failed', err);
      if (runEpoch === this.runEpoch) {
        this.state = 'playing';
        this.startLoop();
        this.showToast('Could not link rooms · try another door');
      }
    } finally {
      if (runEpoch === this.runEpoch) {
        this.fade.classList.remove('active');
        this.linking = false;
      }
    }
  }

  private loop(t: number): void {
    this.raf = 0;
    const dt = Math.min(0.05, (t - (this.lastT || t)) / 1000);
    this.lastT = t;

    if (this.state === 'playing') {
      const frame = this.input.sample(dt);
      if (frame.pausePressed) {
        this.pause();
      } else {
        const colliders = this.roomWorld.getColliders();
        const linkHit = this.player.update(dt, frame, colliders);
        this.roomWorld.update(dt, this.player.position);
        if (linkHit?.linksOnTouch) {
          void this.performLink();
        }
      }
    } else if (this.state === 'paused') {
      const frame = this.input.sample(dt);
      // still allow nothing
      void frame;
    }

    this.renderer.render(this.scene, this.player.camera);
    if (this.state === 'playing') this.raf = requestAnimationFrame(this.loop);
  }

  private startLoop(): void {
    if (this.raf !== 0 || this.state !== 'playing') return;
    this.lastT = 0;
    this.raf = requestAnimationFrame(this.loop);
  }

  private stopLoop(): void {
    if (this.raf !== 0) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.lastT = 0;
  }

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.player.setAspect(w / h);
    if (this.state !== 'playing' && this.roomWorld.getSpec()) {
      this.renderer.render(this.scene, this.player.camera);
    }
  };

  private onCanvasClick = (): void => {
    if (this.state === 'playing' || this.state === 'paused') {
      if (this.state === 'paused') this.resume();
      else this.input.requestPointerLock();
    }
  };

  private onPointerLockChange = (): void => {
    if (this.state === 'playing' && document.pointerLockElement !== this.canvas) {
      // Don't auto-pause on mobile / touch where pointer lock is unavailable.
      const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
      if (!coarse) this.pause();
    }
  };

  private showToast(msg: string, persistent = isProgressMessage(msg)): void {
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.toast.textContent = msg;
    this.toast.classList.remove('hidden');
    if (!persistent) {
      this.toastTimer = window.setTimeout(() => this.hideToast(), 2600);
    }
  }

  private hideToast(): void {
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = null;
    this.toast.classList.add('hidden');
  }
}

function must(id: string): HTMLElement {
  const n = document.getElementById(id);
  if (!n) throw new Error(`#${id} missing`);
  return n;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

function isProgressMessage(message: string): boolean {
  return /loading|downloading|fetching|warming|compiling|shader|model url|cache/i.test(message);
}
