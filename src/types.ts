export type DreamMode = 'random' | 'seeded';
export type LlmProvider = 'offline' | 'openai' | 'anthropic' | 'browser';
export type MoodAxis = 'upper' | 'downer' | 'static' | 'dynamic';
export type RoomEnvironment = 'interior' | 'open-hall' | 'outdoor';
export type RoomLayoutStyle = 'clusters' | 'perimeter' | 'axial' | 'scattered' | 'sparse';
export type RoomArchitecture =
  | 'chamber'
  | 'colonnade'
  | 'atrium'
  | 'arena'
  | 'concourse'
  | 'courtyard'
  | 'causeway'
  | 'field'
  | 'basin';
export type RoomSizeClass = 'compact' | 'standard' | 'large' | 'vast';

export interface AppSettings {
  mode: DreamMode;
  seed: string;
  provider: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  allowGore: boolean;
  noFlashingLights: boolean;
  noLowLight: boolean;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type PropShape =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'plane';

export type EntityBehavior = 'idle' | 'wander' | 'orbit' | 'stare';

export interface RoomProp {
  id: string;
  label: string;
  shape: PropShape;
  position: Vec3;
  rotationY?: number;
  scale: Vec3;
  color: string;
  emissive?: string;
  metalness?: number;
  roughness?: number;
  linksOnTouch?: boolean;
  solid?: boolean;
  /** Composed kit id used by the model library. */
  kind?: string;
  /** Stable catalog id used to build a genuinely different model variant. */
  assetId?: string;
}

export interface RoomEntity {
  id: string;
  label: string;
  shape: PropShape;
  position: Vec3;
  scale: Vec3;
  color: string;
  emissive?: string;
  behavior: EntityBehavior;
  speed?: number;
  /** Composed kit id used by the model library. */
  kind?: string;
  /** Stable catalog id used to build a genuinely different model variant. */
  assetId?: string;
}

export interface PhysicsModifiers {
  gravity: number;
  moveSpeed: number;
  friction: number;
  bounce: number;
  sway: number;
}

export interface RoomPalette {
  floor: string;
  ceiling: string;
  walls: string;
  accent: string;
  fog: string;
  light: string;
  ambient: string;
}

export type RoomShaderStyle =
  | 'none'
  | 'retro'
  | 'tint'
  | 'dream'
  | 'noir'
  | 'crt'
  | 'underwater'
  | 'kaleidoscope'
  | 'acid'
  | 'fisheye'
  | 'thermal'
  | 'prism'
  | 'vhs'
  | 'strobe'
  | 'mirror'
  | 'tunnel';
export type RoomLightingStyle =
  | 'fluorescent'
  | 'dim'
  | 'cold'
  | 'warm'
  | 'emergency'
  | 'pulse';

export interface RoomVisuals {
  shader: RoomShaderStyle;
  lighting: RoomLightingStyle;
  tint: string;
  effectStrength: number;
  pixelSize: number;
  wireframe: boolean;
  exposure: number;
  /** Seeded animation multiplier used by temporal treatments. */
  motionSpeed: number;
  /** Seeded UV/lens deformation strength. */
  distortion: number;
  /** Seeded animated hue displacement. */
  colorCycle: number;
  /** Seeded post-process zoom used to hide warped texture edges. */
  viewScale: number;
  /** Mirror wedges for kaleidoscopic treatments. */
  mirrorSegments: number;
  /** Slow seeded view rotation in radians per second. */
  rotationSpeed: number;
  /** Stable initial post-process view angle. */
  angleOffset: number;
  /** Brightness modulation used only by explicit strobing treatments. */
  flashStrength: number;
  /** Accessibility preference: lighting must not pulse or flash. */
  flashingDisabled?: boolean;
  /** Accessibility preference: add a stronger neutral visibility floor. */
  highVisibility?: boolean;
}

export interface RoomSpec {
  id: string;
  seed: string;
  title: string;
  blurb: string;
  themeId?: string;
  themeTags: string[];
  mood: MoodAxis;
  environment?: RoomEnvironment;
  layoutStyle?: RoomLayoutStyle;
  architecture?: RoomArchitecture;
  width: number;
  depth: number;
  height: number;
  palette: RoomPalette;
  fogNear: number;
  fogFar: number;
  physics: PhysicsModifiers;
  linkColor: string;
  visuals?: RoomVisuals;
  props: RoomProp[];
  entities: RoomEntity[];
  /** true when produced without an LLM call */
  offline?: boolean;
}

/** Compact history passed to the procedural director to prevent near-repeats. */
export interface RoomHistoryEntry {
  themeId?: string;
  environment: RoomEnvironment;
  layoutStyle: RoomLayoutStyle;
  architecture: RoomArchitecture;
  sizeClass: RoomSizeClass;
  mood: MoodAxis;
  shader: RoomShaderStyle;
  lighting: RoomLightingStyle;
  wireframe: boolean;
  assetIds: string[];
}

export interface ColliderBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  linksOnTouch?: boolean;
  label?: string;
}

export interface BuiltRoom {
  spec: RoomSpec;
  colliders: ColliderBox[];
  spawn: Vec3;
  linkTriggers: ColliderBox[];
}

export interface InputFrame {
  moveX: number;
  moveZ: number;
  lookX: number;
  lookY: number;
  sprint: boolean;
  jump: boolean;
  pausePressed: boolean;
}

export interface GenerationContext {
  seed: string;
  parentSeed?: string;
  previousTitles: string[];
  moodBias: MoodAxis;
  allowGore: boolean;
  noFlashingLights?: boolean;
  noLowLight?: boolean;
  linkIndex: number;
  recentRooms?: RoomHistoryEntry[];
}
