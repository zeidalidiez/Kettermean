import type {
  EntityBehavior,
  MoodAxis,
  PropShape,
  RoomEntity,
  RoomProp,
  RoomSpec,
  Vec3,
} from '../types';
import { boundsForKind, kindFromLabel } from '../world/models';

const SHAPES = new Set<PropShape>(['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane']);
const BEHAVIORS = new Set<EntityBehavior>(['idle', 'wander', 'orbit', 'stare']);
const MOODS = new Set<MoodAxis>(['upper', 'downer', 'static', 'dynamic']);
const SIDES = new Set(['north', 'south', 'east', 'west']);

const BLOCKED =
  /\b(nsfw|porn|nude|naked|sex|sexual|erotic|explicit|rape|child\s*porn|cp\b|underage|loli|shota)\b/i;

export function sanitizeText(input: string, fallback: string): string {
  const trimmed = input.replace(/\s+/g, ' ').trim().slice(0, 160);
  if (!trimmed || BLOCKED.test(trimmed)) return fallback;
  return trimmed;
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function vec3(v: unknown, fallback: Vec3): Vec3 {
  if (!v || typeof v !== 'object') return fallback;
  const o = v as Record<string, unknown>;
  return {
    x: num(o.x, fallback.x, -100, 100),
    y: num(o.y, fallback.y, -20, 40),
    z: num(o.z, fallback.z, -100, 100),
  };
}

function shape(v: unknown, fallback: PropShape = 'box'): PropShape {
  return typeof v === 'string' && SHAPES.has(v as PropShape) ? (v as PropShape) : fallback;
}

function parseProp(raw: unknown, index: number): RoomProp | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const label = sanitizeText(str(o.label, `prop-${index}`), `prop-${index}`);
  const scale = vec3(o.scale, { x: 1, y: 1, z: 1 });
  scale.x = num(scale.x, 1, 0.05, 12);
  scale.y = num(scale.y, 1, 0.05, 12);
  scale.z = num(scale.z, 1, 0.05, 12);
  const kind = kindFromLabel(typeof o.kind === 'string' ? o.kind : label);
  const b = boundsForKind(kind);
  // Prefer kit bounds so composed models fit colliders.
  const finalScale = {
    x: num(scale.x, b.w, 0.2, 12) || b.w,
    y: num(scale.y, b.h, 0.2, 12) || b.h,
    z: num(scale.z, b.d, 0.2, 12) || b.d,
  };
  // If LLM sent tiny/default cubes, replace with kit size.
  if (finalScale.x < 0.35 && finalScale.y < 0.35) {
    finalScale.x = b.w;
    finalScale.y = b.h;
    finalScale.z = b.d;
  }
  const pos = vec3(o.position, { x: 0, y: 0, z: 0 });
  // Force feet on floor for kit models.
  pos.y = 0;
  return {
    id: str(o.id, `p${index}`),
    label,
    shape: shape(o.shape),
    position: pos,
    rotationY: num(o.rotationY, 0, -Math.PI * 4, Math.PI * 4),
    scale: finalScale,
    color: str(o.color, '#888888'),
    emissive: typeof o.emissive === 'string' ? o.emissive : undefined,
    metalness: num(o.metalness, 0.1, 0, 1),
    roughness: num(o.roughness, 0.8, 0, 1),
    linksOnTouch: Boolean(o.linksOnTouch),
    solid: o.solid === undefined ? true : Boolean(o.solid),
    kind,
  };
}

function parseEntity(raw: unknown, index: number): RoomEntity | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const label = sanitizeText(str(o.label, `entity-${index}`), `entity-${index}`);
  const scale = vec3(o.scale, { x: 1, y: 1.8, z: 1 });
  const behavior =
    typeof o.behavior === 'string' && BEHAVIORS.has(o.behavior as EntityBehavior)
      ? (o.behavior as EntityBehavior)
      : 'idle';
  const kind = kindFromLabel(typeof o.kind === 'string' ? o.kind : label);
  const b = boundsForKind(kind);
  const finalScale = {
    x: Math.max(scale.x, b.w * 0.8),
    y: Math.max(scale.y, b.h * 0.8),
    z: Math.max(scale.z, b.d * 0.8),
  };
  const pos = vec3(o.position, { x: 2, y: 0, z: 2 });
  pos.y = 0;
  return {
    id: str(o.id, `e${index}`),
    label,
    shape: shape(o.shape, 'cylinder'),
    position: pos,
    scale: finalScale,
    color: str(o.color, '#cccccc'),
    emissive: typeof o.emissive === 'string' ? o.emissive : undefined,
    behavior,
    speed: num(o.speed, 0.8, 0, 4),
    linksOnTouch: o.linksOnTouch === undefined ? true : Boolean(o.linksOnTouch),
    kind,
  };
}

/** Normalize untrusted LLM JSON into a safe RoomSpec. Returns null if unusable. */
export function normalizeRoomSpec(raw: unknown, seed: string): RoomSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const mood =
    typeof o.mood === 'string' && MOODS.has(o.mood as MoodAxis) ? (o.mood as MoodAxis) : 'static';

  const paletteIn = (o.palette && typeof o.palette === 'object' ? o.palette : {}) as Record<
    string,
    unknown
  >;
  const physicsIn = (o.physics && typeof o.physics === 'object' ? o.physics : {}) as Record<
    string,
    unknown
  >;

  const propsRaw = Array.isArray(o.props) ? o.props : [];
  const entitiesRaw = Array.isArray(o.entities) ? o.entities : [];
  const props = propsRaw
    .slice(0, 16)
    .map((p, i) => parseProp(p, i))
    .filter((p): p is RoomProp => Boolean(p));
  const entities = entitiesRaw
    .slice(0, 6)
    .map((e, i) => parseEntity(e, i))
    .filter((e): e is RoomEntity => Boolean(e));

  if (props.length < 1) return null;

  const openSides = Array.isArray(o.openSides)
    ? o.openSides
        .filter((s): s is 'north' | 'south' | 'east' | 'west' => typeof s === 'string' && SIDES.has(s))
        .slice(0, 2)
    : [];

  return {
    id: str(o.id, `room-${seed}`),
    seed,
    title: sanitizeText(str(o.title, 'Unnamed Room'), 'Unnamed Room'),
    blurb: sanitizeText(str(o.blurb, 'The room waits.'), 'The room waits.'),
    themeTags: Array.isArray(o.themeTags)
      ? o.themeTags
          .filter((t): t is string => typeof t === 'string')
          .map((t) => sanitizeText(t, 'liminal'))
          .slice(0, 8)
      : ['liminal'],
    mood,
    width: num(o.width, 14, 8, 28),
    depth: num(o.depth, 14, 8, 28),
    height: num(o.height, 3.5, 2.4, 10),
    palette: {
      floor: str(paletteIn.floor, '#6b5b3a'),
      ceiling: str(paletteIn.ceiling, '#d9d2c5'),
      walls: str(paletteIn.walls, '#cbb89a'),
      accent: str(paletteIn.accent, '#6a7a8a'),
      fog: str(paletteIn.fog, '#cfc6b0'),
      light: str(paletteIn.light, '#fff2c9'),
      ambient: str(paletteIn.ambient, '#a09070'),
    },
    fogNear: num(o.fogNear, 8, 2, 30),
    fogFar: num(o.fogFar, 30, 10, 80),
    physics: {
      gravity: num(physicsIn.gravity, 1, 0.2, 2.2),
      moveSpeed: num(physicsIn.moveSpeed, 1, 0.4, 2),
      friction: num(physicsIn.friction, 1, 0.2, 2),
      bounce: num(physicsIn.bounce, 0, 0, 0.8),
      sway: num(physicsIn.sway, 0.35, 0, 2),
    },
    linkColor: str(o.linkColor, '#d9c27a'),
    props,
    entities,
    openSides,
    offline: false,
  };
}

export function extractJsonObject(text: string): unknown | null {
  if (!text) return null;
  let candidate = text
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/```(?:json)?/gi, ' ')
    .replace(/```/g, ' ')
    .trim();

  // Common junk prefixes from instruction-following failures.
  candidate = candidate
    .replace(/^[^\{\[]+/, (prefix) => (prefix.includes('{') ? prefix : ''))
    .trim();

  const variants = [
    candidate,
    stripTrailingCommas(candidate),
    loosenJson(candidate),
    stripTrailingCommas(loosenJson(candidate)),
  ];

  for (const attempt of variants) {
    const parsed = tryParseBalancedObject(attempt);
    if (parsed !== null) return unwrapDirectorPayload(parsed);
  }

  // Last resort: build a minimal object from free-form asset mentions.
  return heuristicDirectorFromText(text);
}

/** Tiny models often emit JS-ish objects: unquoted keys, ranges, barewords. */
export function loosenJson(input: string): string {
  let s = input.trim();

  // Prefer inner object if model wraps as {json:{...}} / {bad:{...}} / {data:{...}}
  const wrapped = s.match(
    /\{\s*(?:json|bad|data|result|room|direction)\s*:\s*(\{[\s\S]*\})\s*\}\s*$/i,
  );
  if (wrapped?.[1]) s = wrapped[1];

  // Numeric ranges -> midpoint (scaleMul: 2.5-3.5)
  s = s.replace(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/g, (_, a: string, b: string) => {
    const mid = (Number(a) + Number(b)) / 2;
    return Number.isFinite(mid) ? String(Number(mid.toFixed(3))) : a;
  });

  // Quote unquoted keys
  s = s.replace(/([{,]\s*)([A-Za-z_][\w]*)\s*:/g, '$1"$2":');

  // Quote bareword / path-like values (not true/false/null/numbers)
  s = s.replace(
    /:\s*([A-Za-z_][\w./:-]*)\s*(?=[,}\]])/g,
    (_m, value: string) => {
      if (/^(true|false|null)$/i.test(value)) return `: ${value.toLowerCase()}`;
      if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value)) return `: ${value}`;
      return `: "${value}"`;
    },
  );

  // Single-quoted strings -> double quotes
  s = s.replace(/'([^']*)'/g, (_, inner: string) => JSON.stringify(inner));

  // Newlines inside likely string regions are rare; collapse bare newlines to space
  s = s.replace(/\n+/g, ' ');

  return s;
}

function unwrapDirectorPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const o = raw as Record<string, unknown>;
  for (const key of ['json', 'bad', 'data', 'result', 'room', 'direction', 'output']) {
    const inner = o[key];
    if (inner && typeof inner === 'object') {
      const io = inner as Record<string, unknown>;
      if (
        'placements' in io ||
        'themeId' in io ||
        'props' in io ||
        'title' in io ||
        'assets' in io
      ) {
        return inner;
      }
    }
  }
  return raw;
}

/**
 * If the model only lists asset ids / a theme, synthesize a director object
 * the rest of the pipeline can assemble.
 */
function heuristicDirectorFromText(text: string): unknown | null {
  const assetIds = [
    'chair_office',
    'desk_security',
    'vending_blue',
    'crib_empty',
    'door_fake',
    'plant_fern',
    'lamp_floor',
    'anomaly_giant_baby',
    'npc_clerk',
    'npc_shadow',
    'creature_deer',
    'mirror_tall',
    'bottle_giant',
    'bench_wait',
  ];
  const themeIds = [
    'fluorescent_lobby',
    'wrong_nursery',
    'backrooms_annex',
    'dry_pool',
    'soft_clinic',
  ];
  const lower = text.toLowerCase();
  const foundAssets = assetIds.filter((id) => lower.includes(id.toLowerCase()));
  const foundTheme = themeIds.find((id) => lower.includes(id.toLowerCase()));
  const moodMatch = lower.match(/\b(upper|downer|static|dynamic)\b/);
  if (foundAssets.length < 2 && !foundTheme) return null;

  const picks = (foundAssets.length ? foundAssets : ['door_fake', 'chair_office', 'lamp_floor']).slice(
    0,
    8,
  );
  if (!picks.includes('door_fake')) picks.push('door_fake');

  return {
    themeId: foundTheme || 'fluorescent_lobby',
    title: foundTheme ? foundTheme.replace(/_/g, ' ') : 'Drift Room',
    blurb: 'The dream reassembled from fragments.',
    mood: moodMatch?.[1] || 'static',
    tags: ['liminal'],
    width: 14,
    depth: 14,
    height: 3.5,
    placements: picks.map((assetId, i) => ({
      assetId,
      x: ((i % 4) - 1.5) * 2.4,
      z: (Math.floor(i / 4) - 0.5) * 3,
      rotY: 0,
      scaleMul: assetId === 'anomaly_giant_baby' ? 3 : 1,
      linksOnTouch: assetId === 'door_fake' || assetId.startsWith('npc_') || assetId === 'anomaly_giant_baby',
    })),
  };
}

function stripTrailingCommas(s: string): string {
  return s.replace(/,(\s*[}\]])/g, '$1');
}

function tryParseBalancedObject(text: string): unknown | null {
  const start = text.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]!;
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        const slice = text.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return null;
        }
      }
    }
  }

  // Fallback: old first/last brace strategy.
  const end = text.lastIndexOf('}');
  if (end > start) {
    try {
      return JSON.parse(stripTrailingCommas(text.slice(start, end + 1)));
    } catch {
      return null;
    }
  }
  return null;
}
