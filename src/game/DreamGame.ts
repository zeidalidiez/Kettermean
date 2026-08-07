import * as THREE from 'three';
import { LINK, RANDOM_RESEED_EVERY } from '../config';
import { childSeed, randomSeed } from '../core/rng';
import type { AppSettings, GenerationContext, MoodAxis, RoomSpec } from '../types';
import { InputManager } from '../input/InputManager';
import { RoomGenerator } from '../llm/RoomGenerator';
import { PlayerController } from '../player/PlayerController';
import { RoomWorld } from '../world/RoomBuilder';

type GameState = 'menu' | 'playing' | 'paused' | 'linking';

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
  private nextPrefetchSeed: string | null = null;

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
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.player = new PlayerController(window.innerWidth / window.innerHeight);
    this.input = new InputManager(this.canvas);
    this.generator = new RoomGenerator(settings);

    window.addEventListener('resize', this.onResize);
    this.canvas.addEventListener('click', this.onCanvasClick);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);

    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  updateSettings(settings: AppSettings): void {
    this.settings = settings;
    this.generator.updateSettings(settings);
  }

  async start(): Promise<void> {
    this.rootSeed =
      this.settings.mode === 'seeded' && this.settings.seed.trim()
        ? this.settings.seed.trim()
        : randomSeed();
    this.currentSeed = this.rootSeed;
    this.linkIndex = 0;
    this.previousTitles = [];
    this.moodBias = 'static';
    this.nextPrefetchSeed = null;

    this.menu.classList.add('hidden');
    this.pauseMenu.classList.add('hidden');
    this.hud.classList.remove('hidden');

    // Pointer lock must happen in the same user-gesture turn as the click.
    // Do all awaits AFTER enabling input + requesting lock.
    this.state = 'playing';
    this.input.setEnabled(true);
    this.input.requestPointerLock();

    const ctx = this.makeCtx(this.currentSeed);
    const useLlm = this.settings.provider !== 'offline' && Boolean(this.settings.apiKey.trim());

    // Always enter a playable offline room immediately. Never block controls on the API.
    const boot = this.generator.getOrOffline(ctx);
    this.applyRoom(boot);
    this.schedulePrefetch();

    if (!useLlm) {
      this.showToast('Offline room');
      return;
    }

    this.showToast('Generating LLM room…');
    // Background upgrade: keep the request alive; swap in when ready.
    void this.generator.get(ctx).then((late) => {
      if (this.state === 'menu') return;
      if (this.currentSeed !== ctx.seed) return;
      if (late.offline) {
        this.showToast('LLM unavailable · offline room');
        return;
      }
      // Preserve look direction roughly by re-applying room at spawn.
      this.applyRoom(late);
      this.showToast('LLM room ready');
      this.schedulePrefetch();
    });
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.setEnabled(false);
    this.pauseMenu.classList.remove('hidden');
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.pauseMenu.classList.add('hidden');
    this.input.setEnabled(true);
    this.input.requestPointerLock();
  }

  quitToMenu(): void {
    this.state = 'menu';
    this.input.setEnabled(false);
    this.pauseMenu.classList.add('hidden');
    this.hud.classList.add('hidden');
    this.menu.classList.remove('hidden');
    this.roomWorld.dispose(this.scene);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
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

  private makeCtx(seed: string, parent?: string): GenerationContext {
    return {
      seed,
      parentSeed: parent,
      previousTitles: [...this.previousTitles],
      moodBias: this.moodBias,
      allowGore: this.settings.allowGore,
      linkIndex: this.linkIndex,
    };
  }

  private nextSeed(): string {
    if (this.settings.mode === 'random' && this.linkIndex > 0 && this.linkIndex % RANDOM_RESEED_EVERY === 0) {
      this.rootSeed = randomSeed();
      return this.rootSeed;
    }
    if (this.settings.mode === 'seeded') {
      return childSeed(this.rootSeed, `${this.linkIndex}:${this.moodBias}`);
    }
    // random mode: related child most of the time, occasional fresh branch
    if (this.linkIndex % 3 === 0) return childSeed(this.currentSeed, this.linkIndex);
    return childSeed(this.rootSeed, `${this.linkIndex}-${this.moodBias}`);
  }

  private schedulePrefetch(): void {
    // Cost control: only one next room, generated once while player explores.
    const seed = this.nextSeedPreview();
    this.nextPrefetchSeed = seed;
    this.generator.prefetch(this.makeCtx(seed, this.currentSeed));
  }

  private nextSeedPreview(): string {
    // Mirror nextSeed() without mutating rootSeed.
    const linkIndex = this.linkIndex + 1;
    if (this.settings.mode === 'random' && linkIndex > 0 && linkIndex % RANDOM_RESEED_EVERY === 0) {
      // Don't burn a random seed until actually linking; use deterministic preview.
      return childSeed(this.currentSeed, `reseed-preview-${linkIndex}`);
    }
    if (this.settings.mode === 'seeded') {
      return childSeed(this.rootSeed, `${linkIndex}:${this.moodBias}`);
    }
    if (linkIndex % 3 === 0) return childSeed(this.currentSeed, linkIndex);
    return childSeed(this.rootSeed, `${linkIndex}-${this.moodBias}`);
  }

  private async performLink(): Promise<void> {
    if (this.linking || this.state !== 'playing') return;
    const now = performance.now();
    if (now - this.lastLinkAt < LINK.cooldownMs) return;

    this.linking = true;
    this.state = 'linking';
    this.lastLinkAt = now;
    this.linkIndex += 1;

    const color = this.roomWorld.getSpec()?.linkColor ?? '#ffffff';
    this.fade.style.background = color;
    this.fade.classList.add('active');

    const parent = this.currentSeed;
    const seed =
      this.nextPrefetchSeed && this.settings.mode !== 'random'
        ? this.nextPrefetchSeed
        : this.nextSeed();
    // For random reseed path use actual nextSeed
    const finalSeed =
      this.settings.mode === 'random' && this.linkIndex % RANDOM_RESEED_EVERY === 0
        ? this.nextSeed()
        : seed;

    this.currentSeed = finalSeed;
    const ctx = this.makeCtx(finalSeed, parent);

    // Use prefetched/cached room if available; offline fallback is free.
    let spec = await this.generator.get(ctx);

    await sleep(LINK.fadeMs);
    this.applyRoom(spec);
    this.fade.classList.remove('active');
    this.state = 'playing';
    this.linking = false;
    this.schedulePrefetch();
  }

  private loop(t: number): void {
    this.raf = requestAnimationFrame(this.loop);
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
  }

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.player.setAspect(w / h);
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

  private showToast(msg: string): void {
    this.toast.textContent = msg;
    this.toast.classList.remove('hidden');
    window.setTimeout(() => this.toast.classList.add('hidden'), 2200);
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
