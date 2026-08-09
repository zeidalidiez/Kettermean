import * as THREE from 'three';
import { LINK, RANDOM_RESEED_EVERY } from '../config';
import { childSeed, randomSeed } from '../core/rng';
import type {
  AppSettings,
  GenerationContext,
  MoodAxis,
  RoomHistoryEntry,
  RoomSpec,
} from '../types';
import { InputManager } from '../input/InputManager';
import { RoomGenerator } from '../llm/RoomGenerator';
import { PlayerController } from '../player/PlayerController';
import { RoomWorld } from '../world/RoomBuilder';
import { resolveRoomVisuals, roomHistoryEntryFor } from '../world/roomDirector';
import { enforceRoomTextQuality } from '../world/textQuality';
import { RoomPostProcessor } from './RoomPostProcessor';

type GameState = 'menu' | 'playing' | 'paused' | 'linking';
type NextDreamState = 'instant' | 'pending' | 'ready' | 'failed';

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
  private post: RoomPostProcessor;
  private readonly flashlight = new THREE.SpotLight('#fff2c4', 18, 48, 0.42, 0.58, 1.15);
  private readonly flashlightFill = new THREE.PointLight('#ffe7b3', 0.7, 7, 1.4);
  private readonly flashlightTarget = new THREE.Object3D();
  private readonly flashlightDirection = new THREE.Vector3();
  private flashlightEnabled = false;

  private state: GameState = 'menu';
  private settings: AppSettings;
  private rootSeed = '';
  private currentSeed = '';
  private linkIndex = 0;
  private previousTitles: string[] = [];
  private recentRooms: RoomHistoryEntry[] = [];
  private moodBias: MoodAxis = 'static';
  private lastLinkAt = 0;
  private pausedAt = 0;
  private linking = false;
  private raf = 0;
  private lastT = 0;
  private runEpoch = 0;
  private nextRoomPlan: NextRoomPlan | null = null;
  private nextDreamState: NextDreamState = 'instant';
  private lastNpcDialogue = '';
  private contextLost = false;
  private readonly touchFirst: boolean;

  private readonly canvas: HTMLCanvasElement;
  private readonly fade: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly hudTheme: HTMLElement;
  private readonly hudSeed: HTMLElement;
  private readonly hudAiStatus: HTMLElement;
  private readonly hudAction: HTMLElement;
  private readonly hudNextState: HTMLElement;
  private readonly hudRule: HTMLElement;
  private readonly hudNpcLine: HTMLElement;
  private readonly hudFlashlight: HTMLElement;
  private readonly hudFlashlightState: HTMLElement;
  private readonly menu: HTMLElement;
  private readonly pauseMenu: HTMLElement;
  private readonly pauseRoom: HTMLElement;
  private readonly pauseMood: HTMLElement;
  private readonly pauseSeed: HTMLElement;
  private readonly aiRecovery: HTMLElement;
  private readonly aiRecoveryMessage: HTMLElement;
  private readonly retryAiButton: HTMLButtonElement;
  private readonly proceduralNextButton: HTMLButtonElement;
  private readonly touchNextButton: HTMLButtonElement;

  constructor(settings: AppSettings) {
    this.settings = settings;
    this.canvas = must('game-canvas') as HTMLCanvasElement;
    this.fade = must('fade-overlay');
    this.hud = must('hud');
    this.hudTheme = must('hud-theme');
    this.hudSeed = must('hud-seed');
    this.hudAiStatus = must('hud-ai-status');
    this.hudAction = must('hud-action');
    this.hudNextState = must('hud-next-state');
    this.hudRule = must('hud-rule');
    this.hudNpcLine = must('hud-npc-line');
    this.hudFlashlight = must('hud-flashlight');
    this.hudFlashlightState = must('hud-flashlight-state');
    this.menu = must('menu');
    this.pauseMenu = must('pause-menu');
    this.pauseRoom = must('pause-room');
    this.pauseMood = must('pause-mood');
    this.pauseSeed = must('pause-seed');
    this.aiRecovery = must('ai-recovery');
    this.aiRecoveryMessage = must('ai-recovery-message');
    this.retryAiButton = must('retry-ai-btn') as HTMLButtonElement;
    this.proceduralNextButton = must('procedural-next-btn') as HTMLButtonElement;
    this.touchNextButton = must('touch-next') as HTMLButtonElement;
    this.touchFirst = window.matchMedia?.('(hover: none), (pointer: coarse)').matches ?? false;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.touchFirst,
      powerPreference: this.touchFirst ? 'default' : 'high-performance',
    });
    // A 3x phone display does not benefit from a 3x real-time 3D buffer. The
    // lower mobile cap also leaves GPU memory available for optional WebLLM.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.touchFirst ? 1.5 : 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.post = new RoomPostProcessor(this.touchFirst ? 1 : 1.5);
    this.post.setSize(
      window.innerWidth,
      window.innerHeight,
      this.renderer.getPixelRatio(),
    );

    this.player = new PlayerController(window.innerWidth / window.innerHeight);
    this.flashlight.target = this.flashlightTarget;
    this.flashlight.visible = false;
    this.flashlightFill.visible = false;
    this.flashlight.castShadow = false;
    this.scene.add(this.flashlight, this.flashlightFill, this.flashlightTarget);
    // Touch pause should be immediate even when a mobile browser throttles RAF.
    this.input = new InputManager(this.canvas, () => this.pause());
    this.generator = new RoomGenerator(settings);
    this.generator.setStatusHandler((msg) => {
      this.updateAiStatus(msg);
    });

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onPausedKeyDown);
    window.addEventListener('keydown', this.onRecoveryKeyDown);
    this.canvas.addEventListener('click', this.onCanvasClick);
    this.canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.onContextRestored);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    this.retryAiButton.addEventListener('click', this.onRetryAiClick);
    this.proceduralNextButton.addEventListener('click', this.onProceduralNextClick);

    this.loop = this.loop.bind(this);
  }

  updateSettings(settings: AppSettings): void {
    this.settings = settings;
    this.generator.updateSettings(settings);
  }

  notify(message: string): void {
    this.updateAiStatus(message);
  }

  start(): void {
    this.runEpoch += 1;
    this.generator.beginSession();
    this.rootSeed =
      this.settings.mode === 'seeded' && this.settings.seed.trim()
        ? this.settings.seed.trim()
        : randomSeed();
    this.currentSeed = this.rootSeed;
    this.linkIndex = 0;
    this.previousTitles = [];
    this.recentRooms = [];
    this.moodBias = 'static';
    this.nextRoomPlan = null;
    this.setNextDreamState('instant');
    this.linking = false;
    this.lastLinkAt = -Infinity;
    this.fade.classList.remove('active');
    this.setFlashlightEnabled(false);

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
    this.renderFrame();
    this.startLoop();
    if (!useLlm) {
      this.updateAiStatus('Procedural direction only');
      this.setNextDreamState('instant');
      return;
    }
    this.schedulePrefetch();
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.pausedAt = performance.now();
    this.stopLoop();
    this.input.setEnabled(false);
    this.pauseMenu.classList.remove('hidden');
    (must('resume-btn') as HTMLButtonElement).focus({ preventScroll: true });
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.pauseMenu.classList.add('hidden');
    this.input.setEnabled(true);
    this.canvas.focus({ preventScroll: true });
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
    this.setNextDreamState('instant');
    this.fade.classList.remove('active');
    this.input.setEnabled(false);
    this.pauseMenu.classList.add('hidden');
    this.hud.classList.add('hidden');
    this.menu.classList.remove('hidden');
    (must('start-btn') as HTMLButtonElement).focus({ preventScroll: true });
    this.roomWorld.dispose(this.scene);
    this.setFlashlightEnabled(false);
    this.hideRecovery();
  }

  dispose(): void {
    this.runEpoch += 1;
    this.generator.endSession();
    this.stopLoop();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onPausedKeyDown);
    window.removeEventListener('keydown', this.onRecoveryKeyDown);
    this.canvas.removeEventListener('click', this.onCanvasClick);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.retryAiButton.removeEventListener('click', this.onRetryAiClick);
    this.proceduralNextButton.removeEventListener('click', this.onProceduralNextClick);
    this.input.dispose();
    this.roomWorld.dispose(this.scene);
    this.scene.remove(this.flashlight, this.flashlightFill, this.flashlightTarget);
    this.flashlight.dispose();
    this.flashlightFill.dispose();
    this.post.dispose();
    this.renderer.dispose();
  }

  private applyRoom(spec: RoomSpec): void {
    enforceRoomTextQuality(spec);
    // Comfort preferences are a client-side invariant. Re-resolve even model and
    // cached rooms so a stale or hostile visual steer cannot bypass them.
    spec.visuals = resolveRoomVisuals(
      spec.seed,
      spec.mood,
      spec.visuals,
      this.recentRooms,
      {
        noFlashingLights: this.settings.noFlashingLights,
        noLowLight: this.settings.noLowLight,
      },
    );
    const built = this.roomWorld.build(spec, this.scene);
    this.player.setPhysics(spec.physics);
    this.player.setViewDistance(Math.max(spec.width, spec.depth) * 2.8 + 90);
    this.player.spawnAt(built.spawn.x, built.spawn.y, built.spawn.z, 0);
    this.updateFlashlightTransform();
    this.previousTitles.push(spec.title);
    if (this.previousTitles.length > 12) this.previousTitles.shift();
    this.recentRooms.push(roomHistoryEntryFor(spec));
    if (this.recentRooms.length > 12) this.recentRooms.shift();
    this.moodBias = spec.mood;
    this.post.setProfile(spec.visuals);
    this.renderer.toneMappingExposure = spec.visuals?.exposure ?? 1;
    this.hudTheme.textContent = `${spec.title} · ${spec.mood}`;
    this.pauseRoom.textContent = spec.title;
    this.pauseMood.textContent = spec.mood;
    this.pauseSeed.textContent = spec.seed;
    const visualLabels = [
      spec.scaleProfile && spec.scaleProfile !== 'human' ? spec.scaleProfile : '',
      spec.condition !== 'normal' ? spec.condition : '',
      spec.visuals?.wireframe ? 'wireframe' : '',
      spec.visuals?.shader && spec.visuals.shader !== 'none' ? spec.visuals.shader : '',
      spec.visuals?.lighting ?? '',
    ].filter(Boolean);
    this.hudSeed.textContent = [
      `seed ${spec.seed}`,
      spec.offline ? 'offline' : '',
      ...visualLabels,
    ].filter(Boolean).join(' · ');
    must('hud-hint').textContent = spec.blurb;
    this.hudRule.textContent = spec.roomRule ? `Rule · ${spec.roomRule}` : '';
    this.hudRule.classList.toggle('hidden', !spec.roomRule);
    this.hudNpcLine.textContent = '';
    this.hudNpcLine.classList.add('hidden');
    this.lastNpcDialogue = '';
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
      noFlashingLights: this.settings.noFlashingLights,
      noLowLight: this.settings.noLowLight,
      linkIndex,
      recentRooms: this.recentRooms.map((room) => ({
        ...room,
        assetIds: [...room.assetIds],
      })),
    };
  }

  private schedulePrefetch(retry = false): void {
    const plan = this.ensureNextRoomPlan();
    if (!this.isAiMode()) {
      this.setNextDreamState('instant');
      return;
    }
    const runEpoch = this.runEpoch;
    const seed = plan.seed;
    this.setNextDreamState('pending');
    const preparation = retry
      ? this.generator.retry(plan.context)
      : this.generator.prefetch(plan.context);
    if (!preparation) {
      this.setNextDreamState('failed', 'The selected provider could not start.');
      return;
    }
    void preparation.then((spec) => {
      if (
        runEpoch !== this.runEpoch ||
        this.state === 'menu' ||
        this.nextRoomPlan?.seed !== seed
      ) return;
      if (!spec.offline && this.generator.hasLlmRoom(plan.context)) {
        this.setNextDreamState('ready');
        return;
      }
      const readiness = this.generator.getReadiness(plan.context);
      this.setNextDreamState(
        'failed',
        readiness.message ?? 'The AI response did not contain usable room direction.',
      );
    }).catch((err) => {
      if (runEpoch !== this.runEpoch || this.nextRoomPlan?.seed !== seed) return;
      const message = err instanceof Error ? err.message : String(err);
      this.setNextDreamState('failed', message);
    });
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

  private async advanceDream(forceProcedural = false): Promise<void> {
    if (this.linking || this.state !== 'playing') return;
    const plan = this.ensureNextRoomPlan();
    let spec: RoomSpec | null;
    if (this.isAiMode() && !forceProcedural) {
      const readiness = this.generator.getReadiness(plan.context);
      if (readiness.state === 'failed' || this.nextDreamState === 'failed') {
        this.retryNextAiRoom();
        return;
      }
      if (readiness.state !== 'ready') {
        if (readiness.state === 'idle') this.schedulePrefetch();
        return;
      }
      spec = this.generator.getReadyRoom(plan.context);
      if (!spec) {
        this.schedulePrefetch();
        return;
      }
    } else {
      spec = this.generator.getOrOffline(plan.context);
    }
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
      this.nextRoomPlan = null;
      this.linkIndex = plan.linkIndex;
      this.rootSeed = plan.rootSeed;
      this.currentSeed = plan.seed;

      await sleep(LINK.fadeMs);
      if (runEpoch !== this.runEpoch) return;
      this.applyRoom(spec);
      this.state = 'playing';
      this.renderFrame();
      this.startLoop();
      this.schedulePrefetch();
    } catch (err) {
      console.error('[Kettermean] next dream failed', err);
      if (runEpoch === this.runEpoch) {
        this.state = 'playing';
        this.startLoop();
        this.updateAiStatus('Next dream failed · press R to retry');
        this.setNextDreamState('failed', 'Could not reach the next dream. Press R to retry or O for a procedural room.');
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
      } else if (frame.nextDreamPressed) {
        void this.advanceDream();
      } else {
        if (frame.flashlightPressed) {
          this.setFlashlightEnabled(!this.flashlightEnabled);
        }
        const colliders = this.roomWorld.getColliders();
        this.player.update(dt, frame, colliders);
        this.updateFlashlightTransform();
        this.roomWorld.update(dt, this.player.position);
        this.updateNearbyDialogue();
      }
    } else if (this.state === 'paused') {
      const frame = this.input.sample(dt);
      // still allow nothing
      void frame;
    }

    this.renderFrame(t / 1000);
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
    this.post.setSize(w, h, this.renderer.getPixelRatio());
    this.player.setAspect(w / h);
    if (this.state !== 'playing' && this.roomWorld.getSpec()) {
      this.renderFrame();
    }
  };

  private renderFrame(timeSeconds = performance.now() / 1000): void {
    if (this.contextLost) return;
    this.post.render(this.renderer, this.scene, this.player.camera, timeSeconds);
  }

  private onContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
    this.stopLoop();
    if (this.state !== 'menu') {
      this.updateAiStatus('Graphics paused · restoring the scene…');
    }
  };

  private onContextRestored = (): void => {
    this.contextLost = false;
    this.onResize();
    if (this.state === 'playing') {
      this.updateAiStatus('Scene restored');
      this.renderFrame();
      this.startLoop();
    }
  };

  private onCanvasClick = (): void => {
    if (this.state === 'playing' || this.state === 'paused') {
      if (this.state === 'paused') this.resume();
      else this.input.requestPointerLock();
    }
  };

  private setFlashlightEnabled(enabled: boolean): void {
    this.flashlightEnabled = enabled;
    this.flashlight.visible = enabled;
    this.flashlightFill.visible = enabled;
    this.hudFlashlight.classList.toggle('is-active', enabled);
    this.hudFlashlightState.textContent = `Flashlight · ${enabled ? 'on' : 'off'}`;
    const touchButton = must('touch-flashlight') as HTMLButtonElement;
    touchButton.classList.toggle('is-active', enabled);
    touchButton.setAttribute('aria-pressed', String(enabled));
  }

  private updateFlashlightTransform(): void {
    const camera = this.player.camera;
    camera.getWorldDirection(this.flashlightDirection);
    this.flashlight.position.copy(camera.position).addScaledVector(this.flashlightDirection, 0.16);
    this.flashlight.position.y -= 0.08;
    this.flashlightTarget.position.copy(camera.position).addScaledVector(this.flashlightDirection, 12);
    this.flashlightFill.position.copy(camera.position).addScaledVector(this.flashlightDirection, 0.7);
    this.flashlightTarget.updateMatrixWorld();
  }

  private onPausedKeyDown = (event: KeyboardEvent): void => {
    if (this.state !== 'paused' || event.repeat) return;
    if (event.code === 'KeyR') {
      event.preventDefault();
      if (this.isAiMode() && this.nextDreamState !== 'ready') {
        if (this.nextDreamState === 'failed') this.retryNextAiRoom();
        return;
      }
      this.resume();
      void this.advanceDream();
      return;
    }
    if (event.code !== 'Escape') return;
    // Browsers may report pointer-lock loss just before dispatching the Escape
    // keydown that caused it. Do not let that same physical press also resume.
    if (performance.now() - this.pausedAt < 150) return;
    event.preventDefault();
    this.resume();
  };

  private onRecoveryKeyDown = (event: KeyboardEvent): void => {
    if (
      event.repeat ||
      event.code !== 'KeyO' ||
      this.nextDreamState !== 'failed' ||
      (this.state !== 'playing' && this.state !== 'paused')
    ) return;
    event.preventDefault();
    if (this.state === 'paused') this.resume();
    void this.advanceDream(true);
  };

  private onRetryAiClick = (): void => {
    this.retryNextAiRoom();
  };

  private onProceduralNextClick = (): void => {
    if (this.nextDreamState !== 'failed') return;
    if (this.state === 'paused') this.resume();
    void this.advanceDream(true);
  };

  private onPointerLockChange = (): void => {
    if (this.state === 'playing' && document.pointerLockElement !== this.canvas) {
      // Don't auto-pause on mobile / touch where pointer lock is unavailable.
      const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
      if (!coarse) this.pause();
    }
  };

  private updateAiStatus(message: string): void {
    this.hudAiStatus.textContent = `AI · ${message}`;
  }

  private isAiMode(): boolean {
    return this.settings.provider === 'browser' ||
      ((this.settings.provider === 'openai' || this.settings.provider === 'anthropic') &&
        Boolean(this.settings.apiKey.trim()));
  }

  private setNextDreamState(state: NextDreamState, message = ''): void {
    this.nextDreamState = state;
    this.hudAction.classList.remove('is-pending', 'is-ready', 'is-failed');
    this.hudAction.classList.add(
      state === 'pending' ? 'is-pending' : state === 'failed' ? 'is-failed' : 'is-ready',
    );
    this.hudNextState.textContent =
      state === 'pending'
        ? 'Next dream · forming'
        : state === 'ready'
          ? 'Next dream · ready'
          : state === 'failed'
            ? 'Retry AI · procedural escape available'
            : 'Next dream · anytime';
    this.touchNextButton.disabled = state === 'pending';
    this.touchNextButton.textContent = state === 'pending' ? 'Forming' : state === 'failed' ? 'Retry' : 'Next';
    this.hudAction.setAttribute('aria-disabled', String(state === 'pending'));
    if (state === 'failed') {
      this.aiRecoveryMessage.textContent = message || 'Retry the AI or explicitly use one procedural room.';
      this.aiRecovery.classList.remove('hidden');
    } else {
      this.hideRecovery();
    }
  }

  private retryNextAiRoom(): void {
    if (!this.isAiMode() || this.nextDreamState === 'pending') return;
    this.updateAiStatus('Retrying the next AI dream…');
    this.schedulePrefetch(true);
  }

  private hideRecovery(): void {
    this.aiRecovery.classList.add('hidden');
  }

  private updateNearbyDialogue(): void {
    const nearby = this.roomWorld.getNearbyDialogue(this.player.position);
    const text = nearby ? `${nearby.label} · “${nearby.dialogue}”` : '';
    if (text === this.lastNpcDialogue) return;
    this.lastNpcDialogue = text;
    this.hudNpcLine.textContent = text;
    this.hudNpcLine.classList.toggle('hidden', !nearby);
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
