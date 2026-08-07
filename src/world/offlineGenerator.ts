import { PLAYER, ROOM } from '../config';
import { SeededRng } from '../core/rng';
import type {
  EntityBehavior,
  GenerationContext,
  MoodAxis,
  PropShape,
  RoomEntity,
  RoomProp,
  RoomSpec,
} from '../types';

const TITLES = [
  'Fluorescent Lobby',
  'Wrong Nursery',
  'Pool With No Water',
  'Backrooms Annex',
  'Staff-Only Stair',
  'Midnight Courtyard',
  'Soft Clinic',
  'Abandoned Food Court',
  'Carpet Sea',
  'Observation Room',
  'Yellow Hall That Bends',
  'Empty Ballpit',
  'Service Corridor B',
  'Giant Chair Room',
  'Vending Machine Chapel',
];

const BLURBS = [
  'The air hums like a broken fridge.',
  'Someone rearranged the furniture while you blinked.',
  'You recognize this place from a dream you forgot on purpose.',
  'The exit signs point inward.',
  'Footsteps continue a half-second after you stop.',
  'A ceiling tile breathes, very slowly.',
  'The wallpaper pattern almost forms a face, then refuses.',
];

const PROP_LABELS = [
  'plastic chair',
  'potted fern',
  'vending machine',
  'filing cabinet',
  'wet floor sign',
  'empty crib',
  'stacked mattresses',
  'payphone',
  'water cooler',
  'security desk',
  'mannequin torso',
  'ceiling fan (floor)',
  'exit door that is painted on',
  'ball pit ball mound',
  'giant baby bottle',
  'reception bell',
  'mirror facing another mirror',
  'shopping cart',
];

const ENTITY_LABELS = [
  'giant baby',
  'hallway clerk',
  'soft-eyed deer',
  'floating balloon dog',
  'security shadow',
  'too-tall mannequin',
  'lost tour guide',
  'static figure in a raincoat',
];

const SHAPES: PropShape[] = ['box', 'sphere', 'cylinder', 'cone', 'torus'];
const BEHAVIORS: EntityBehavior[] = ['idle', 'wander', 'orbit', 'stare'];
const MOODS: MoodAxis[] = ['upper', 'downer', 'static', 'dynamic'];

export function generateOfflineRoom(ctx: GenerationContext): RoomSpec {
  const rng = new SeededRng(ctx.seed);
  const mood = biasMood(rng, ctx.moodBias);
  const width = rng.float(ROOM.minSize, ROOM.maxSize);
  const depth = rng.float(ROOM.minSize, ROOM.maxSize);
  const height = rng.float(ROOM.wallHeightMin, ROOM.wallHeightMax);

  const palette = paletteForMood(rng, mood, ctx.allowGore);
  const propCount = rng.int(ROOM.propCountMin, ROOM.propCountMax);
  const entityCount = rng.int(ROOM.entityCountMin, ROOM.entityCountMax);

  const props: RoomProp[] = [];
  for (let i = 0; i < propCount; i += 1) {
    const label = rng.pick(PROP_LABELS);
    const shape = rng.pick(SHAPES);
    const scale = scaleFor(shape, rng, label);
    const solid = !label.includes('painted') && rng.chance(0.75);
    props.push({
      id: `p${i}`,
      label,
      shape,
      position: {
        x: rng.float(-width / 2 + 1.2, width / 2 - 1.2),
        y: scale.y / 2,
        z: rng.float(-depth / 2 + 1.2, depth / 2 - 1.2),
      },
      rotationY: rng.float(0, Math.PI * 2),
      scale,
      color: rng.chance(0.35) ? palette.accent : rng.color(0.25, mood === 'downer' ? 0.28 : 0.5),
      emissive: rng.chance(0.15) ? palette.accent : undefined,
      metalness: rng.float(0, 0.4),
      roughness: rng.float(0.35, 0.95),
      linksOnTouch: rng.chance(0.22),
      solid,
    });
  }

  // Keep spawn area clear-ish: nudge props away from center.
  for (const p of props) {
    if (Math.hypot(p.position.x, p.position.z) < 1.6) {
      p.position.x += Math.sign(p.position.x || 1) * 2.2;
      p.position.z += Math.sign(p.position.z || 1) * 2.2;
    }
  }

  const entities: RoomEntity[] = [];
  for (let i = 0; i < entityCount; i += 1) {
    const label = rng.pick(ENTITY_LABELS);
    const giant = label.includes('giant') || rng.chance(0.2);
    const scaleY = giant ? rng.float(2.8, 5.5) : rng.float(1.2, 2.4);
    const scaleXZ = giant ? rng.float(1.4, 2.8) : rng.float(0.5, 1.1);
    entities.push({
      id: `e${i}`,
      label,
      shape: rng.pick(SHAPES),
      position: {
        x: rng.float(-width / 2 + 2, width / 2 - 2),
        y: scaleY / 2,
        z: rng.float(-depth / 2 + 2, depth / 2 - 2),
      },
      scale: { x: scaleXZ, y: scaleY, z: scaleXZ },
      color: rng.color(0.2, 0.55),
      emissive: rng.chance(0.25) ? palette.light : undefined,
      behavior: rng.pick(BEHAVIORS),
      speed: rng.float(0.2, 1.4),
      linksOnTouch: rng.chance(0.55),
    });
  }

  const openSides: RoomSpec['openSides'] = [];
  if (rng.chance(0.35)) {
    const sides: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west'];
    openSides.push(rng.pick(sides));
    if (rng.chance(0.25)) openSides.push(rng.pick(sides.filter((s) => s !== openSides[0])));
  }

  const title = uniqueTitle(rng, ctx.previousTitles);
  const physics = physicsForMood(rng, mood);

  return {
    id: `room-${ctx.seed}`,
    seed: ctx.seed,
    title,
    blurb: rng.pick(BLURBS),
    themeTags: tagsFor(rng, mood, title),
    mood,
    width,
    depth,
    height,
    palette,
    fogNear: rng.float(4, 12),
    fogFar: rng.float(18, 48),
    physics,
    linkColor: moodLinkColor(mood, ctx.allowGore),
    props,
    entities,
    openSides,
    offline: true,
  };
}

function uniqueTitle(rng: SeededRng, previous: string[]): string {
  for (let i = 0; i < 12; i += 1) {
    const t = rng.pick(TITLES);
    if (!previous.includes(t)) return t;
  }
  return `${rng.pick(TITLES)} ${rng.int(2, 99)}`;
}

function biasMood(rng: SeededRng, bias: MoodAxis): MoodAxis {
  if (rng.chance(0.55)) return bias;
  return rng.pick(MOODS);
}

function paletteForMood(rng: SeededRng, mood: MoodAxis, allowGore: boolean) {
  if (mood === 'downer') {
    return {
      floor: rng.color(0.12, 0.18),
      ceiling: rng.color(0.08, 0.12),
      walls: rng.color(0.1, 0.22),
      accent: allowGore ? 'hsl(0 45% 28%)' : rng.color(0.2, 0.3),
      fog: rng.color(0.05, 0.1),
      light: rng.color(0.15, 0.55),
      ambient: rng.color(0.08, 0.25),
    };
  }
  if (mood === 'upper') {
    return {
      floor: rng.color(0.35, 0.62),
      ceiling: rng.color(0.25, 0.75),
      walls: rng.color(0.4, 0.7),
      accent: rng.color(0.55, 0.6),
      fog: rng.color(0.2, 0.78),
      light: '#fff6d8',
      ambient: rng.color(0.25, 0.7),
    };
  }
  if (mood === 'dynamic') {
    return {
      floor: rng.color(0.45, 0.35),
      ceiling: rng.color(0.5, 0.25),
      walls: rng.color(0.55, 0.4),
      accent: rng.color(0.7, 0.5),
      fog: rng.color(0.4, 0.35),
      light: rng.color(0.6, 0.7),
      ambient: rng.color(0.35, 0.4),
    };
  }
  // static / liminal default — yellow-beige hallways
  return {
    floor: 'hsl(42 28% 42%)',
    ceiling: 'hsl(40 15% 78%)',
    walls: 'hsl(48 35% 68%)',
    accent: 'hsl(210 18% 45%)',
    fog: 'hsl(45 20% 70%)',
    light: '#fff2c9',
    ambient: 'hsl(40 20% 55%)',
  };
}

function physicsForMood(rng: SeededRng, mood: MoodAxis) {
  switch (mood) {
    case 'upper':
      return {
        gravity: rng.float(0.55, 0.9),
        moveSpeed: rng.float(1.05, 1.35),
        friction: rng.float(0.7, 1),
        bounce: rng.float(0, 0.25),
        sway: rng.float(0.2, 0.6),
      };
    case 'downer':
      return {
        gravity: rng.float(1.05, 1.45),
        moveSpeed: rng.float(0.65, 0.9),
        friction: rng.float(1.1, 1.5),
        bounce: 0,
        sway: rng.float(0.4, 1.1),
      };
    case 'dynamic':
      return {
        gravity: rng.float(0.4, 1.6),
        moveSpeed: rng.float(0.8, 1.5),
        friction: rng.float(0.4, 1.3),
        bounce: rng.float(0.1, 0.55),
        sway: rng.float(0.5, 1.4),
      };
    default:
      return {
        gravity: 1,
        moveSpeed: 1,
        friction: 1,
        bounce: 0,
        sway: rng.float(0.15, 0.45),
      };
  }
}

function moodLinkColor(mood: MoodAxis, allowGore: boolean): string {
  if (mood === 'downer') return allowGore ? '#6b1d1d' : '#1d2a6b';
  if (mood === 'upper') return '#f2f0ff';
  if (mood === 'dynamic') return '#5eead4';
  return '#d9c27a';
}

function tagsFor(rng: SeededRng, mood: MoodAxis, title: string): string[] {
  const base = [mood, 'liminal', 'dream'];
  if (title.toLowerCase().includes('pool')) base.push('humid');
  if (title.toLowerCase().includes('nursery')) base.push('uncanny');
  if (rng.chance(0.4)) base.push('fluorescent');
  if (rng.chance(0.3)) base.push('abandoned');
  return base;
}

function scaleFor(shape: PropShape, rng: SeededRng, label: string) {
  if (label.includes('vending')) return { x: 1.1, y: 2.1, z: 0.9 };
  if (label.includes('crib')) return { x: 1.4, y: 0.9, z: 0.9 };
  if (label.includes('desk')) return { x: 2.2, y: 1.1, z: 1.0 };
  if (shape === 'plane') return { x: rng.float(1, 3), y: 0.05, z: rng.float(1, 3) };
  if (shape === 'sphere') {
    const r = rng.float(0.3, 1.2);
    return { x: r, y: r, z: r };
  }
  return {
    x: rng.float(0.4, 2.2),
    y: rng.float(0.3, 2.6),
    z: rng.float(0.4, 2.2),
  };
}

export function defaultSpawnHeight(): number {
  return PLAYER.eyeHeight;
}
