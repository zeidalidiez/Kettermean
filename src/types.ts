import type { ModelQuality } from './world/modelQuality';

export type DreamMode = 'random' | 'seeded';
export type LlmProvider = 'offline' | 'openai' | 'anthropic' | 'browser';
export type AiDepth = 'light' | 'standard' | 'deep';
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
export type RoomScaleProfile = 'closet' | 'human' | 'grand' | 'monumental' | 'colossal';
export type RoomCondition =
  | 'normal'
  | 'bloodied'
  | 'slimed'
  | 'scorched'
  | 'burning'
  | 'ruined'
  | 'overgrown'
  | 'frozen'
  | 'flooded'
  | 'dusty'
  | 'moldy'
  | 'electrified'
  | 'haunted'
  | 'gilded'
  | 'bioluminescent'
  | 'stormbound';

/** Semantic object-set plan used to keep a room coherent without removing surprise. */
export interface RoomComposition {
  primarySet: string;
  supportingSet?: string;
  contrastSet?: string;
  /** Maximum number of deliberately conflicting layout packs. */
  contrastBudget: number;
}

export interface AppSettings {
  mode: DreamMode;
  seed: string;
  provider: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  /** Creative authorship budget. Rendering complexity remains independent. */
  aiDepth: AiDepth;
  allowGore: boolean;
  noFlashingLights: boolean;
  noLowLight: boolean;
  /** Graphics preset controlling model geometry density and room budgets. */
  modelQuality: ModelQuality;
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

export interface RoomSignText {
  headline: string;
  caption: string;
  tags?: string[];
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
  /** Optional model-authored line shown when the player approaches this inhabitant. */
  dialogue?: string;
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
  | 'tunnel'
  | 'posterize'
  | 'duotone'
  | 'dither'
  | 'solarize'
  | 'heatwave'
  | 'negative'
  | 'halftone'
  | 'smear'
  | 'rain'
  | 'spectral'
  | 'mosaic'
  | 'edgeglow'
  | 'oilfilm'
  | 'datamosh'
  | 'cellophane'
  | 'afterimage'
  | 'moire'
  | 'bloom'
  | 'fracture'
  | 'nightvision'
  | 'softfocus'
  | 'watercolor'
  | 'crosshatch'
  | 'lightleak'
  | 'emboss'
  | 'aurora'
  | 'xray'
  | 'frostedglass'
  | 'filmgrain'
  | 'chromatic'
  | 'sepia'
  | 'contour'
  | 'ripple'
  | 'pixelshift'
  | 'paper'
  | 'neonfog'
  | 'doublevision'
  | 'verticalhold'
  | 'lenticular'
  | 'risograph'
  | 'cyanotype'
  | 'infrared'
  | 'stainedglass'
  | 'inkbleed'
  | 'pointillism'
  | 'hologram'
  | 'tiltshift'
  | 'daguerreotype'
  | 'velvet'
  | 'blueprint'
  | 'prismshadow'
  | 'wax'
  | 'snowglobe'
  | 'anamorphic'
  | 'ultraviolet'
  | 'woven';
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
  /** Fine analog texture and surface-noise intensity. */
  grainAmount: number;
  /** RGB channel separation used by optical and print treatments. */
  channelShift: number;
  /** Seeded darkening or diffusion toward the frame boundary. */
  edgeFade: number;
  /** Horizontal/vertical band density for print and analog treatments. */
  banding: number;
  /** Seeded scale for cells, dots, fibers, and other surface patterns. */
  textureScale: number;
  /** Seeded soft expansion used by liquid, ink, and wax treatments. */
  inkSpread: number;
  /** Seeded intensity for highlight halos and optical streaks. */
  highlightBloom: number;
  /** Seeded amount of neighboring color migration and print registration drift. */
  colorBleed: number;
  /** Seeded density of dust, snow, plate tarnish, and pigment flecks. */
  speckleAmount: number;
  /** Seeded strength of textile-like warp and weft detail. */
  weaveAmount: number;
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
  composition?: RoomComposition;
  /** Macro scale plan, from cramped service closet through open colossal dreamscape. */
  scaleProfile?: RoomScaleProfile;
  /** Uniform scale applied to the room's catalog objects, independent of local variants. */
  worldScale?: number;
  /** Coherent whole-scene material and environmental treatment. */
  condition: RoomCondition;
  width: number;
  depth: number;
  height: number;
  palette: RoomPalette;
  fogNear: number;
  fogFar: number;
  physics: PhysicsModifiers;
  linkColor: string;
  visuals?: RoomVisuals;
  /** A short model-authored law, ritual, or contradiction governing this room. */
  roomRule?: string;
  /** Validated model-authored signage; rendered alongside procedural signs. */
  signs?: RoomSignText[];
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
  scaleProfile: RoomScaleProfile;
  condition: RoomCondition;
  mood: MoodAxis;
  shader: RoomShaderStyle;
  lighting: RoomLightingStyle;
  wireframe: boolean;
  primarySet?: string;
  contrastSet?: string;
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
  nextDreamPressed: boolean;
  flashlightPressed: boolean;
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
