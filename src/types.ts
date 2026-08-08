export type DreamMode = 'random' | 'seeded';
export type LlmProvider = 'offline' | 'openai' | 'anthropic' | 'browser';
export type MoodAxis = 'upper' | 'downer' | 'static' | 'dynamic';

export interface AppSettings {
  mode: DreamMode;
  seed: string;
  provider: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  allowGore: boolean;
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

export interface RoomSpec {
  id: string;
  seed: string;
  title: string;
  blurb: string;
  themeTags: string[];
  mood: MoodAxis;
  width: number;
  depth: number;
  height: number;
  palette: RoomPalette;
  fogNear: number;
  fogFar: number;
  physics: PhysicsModifiers;
  linkColor: string;
  props: RoomProp[];
  entities: RoomEntity[];
  /** true when produced without an LLM call */
  offline?: boolean;
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
  linkIndex: number;
}
