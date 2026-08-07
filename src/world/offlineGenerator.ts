import { PLAYER } from '../config';
import { SeededRng } from '../core/rng';
import type {
  EntityBehavior,
  GenerationContext,
  MoodAxis,
  RoomEntity,
  RoomProp,
  RoomSpec,
} from '../types';
import { boundsForKind, type PropKind } from './models';

interface ThemeDef {
  title: string;
  blurb: string;
  mood: MoodAxis;
  tags: string[];
  width: number;
  depth: number;
  height: number;
  props: Array<{ kind: PropKind; label: string; x: number; z: number; rot?: number; link?: boolean }>;
  entities: Array<{
    kind: PropKind;
    label: string;
    x: number;
    z: number;
    behavior: EntityBehavior;
    link?: boolean;
  }>;
  openSides?: Array<'north' | 'south' | 'east' | 'west'>;
}

const THEMES: ThemeDef[] = [
  {
    title: 'Fluorescent Lobby',
    blurb: 'The receptionist left years ago. The plants did not notice.',
    mood: 'static',
    tags: ['lobby', 'liminal', 'fluorescent'],
    width: 16,
    depth: 14,
    height: 3.6,
    props: [
      { kind: 'desk', label: 'security desk', x: 0, z: -4.5 },
      { kind: 'chair', label: 'office chair', x: 0, z: -3.4 },
      { kind: 'plant', label: 'potted fern', x: -5.5, z: -5 },
      { kind: 'plant', label: 'potted fern', x: 5.5, z: -5 },
      { kind: 'bench', label: 'waiting bench', x: -4, z: 3.5 },
      { kind: 'bench', label: 'waiting bench', x: 4, z: 3.5 },
      { kind: 'cooler', label: 'water cooler', x: 6, z: -1 },
      { kind: 'door_fake', label: 'painted exit', x: -7.3, z: 0, rot: 1.5708, link: true },
      { kind: 'lamp', label: 'floor lamp', x: 5.5, z: 5 },
      { kind: 'sign', label: 'wet floor sign', x: 2, z: 1 },
    ],
    entities: [{ kind: 'figure_clerk', label: 'hallway clerk', x: 0.8, z: -4.2, behavior: 'stare', link: true }],
  },
  {
    title: 'Wrong Nursery',
    blurb: 'The mobile above the crib turns with no draft.',
    mood: 'downer',
    tags: ['nursery', 'uncanny', 'liminal'],
    width: 12,
    depth: 12,
    height: 3.2,
    props: [
      { kind: 'crib', label: 'empty crib', x: -2, z: -1.5 },
      { kind: 'crib', label: 'empty crib', x: 2.5, z: 2 },
      { kind: 'bottle_giant', label: 'giant baby bottle', x: 3.5, z: -3 },
      { kind: 'chair', label: 'rocking chair', x: -3.5, z: 2.5 },
      { kind: 'lamp', label: 'night lamp', x: -4, z: -3.5 },
      { kind: 'shelf', label: 'toy shelf', x: 0, z: -5 },
      { kind: 'mirror', label: 'tall mirror', x: 5.2, z: 0, rot: -1.5708 },
    ],
    entities: [{ kind: 'figure_baby', label: 'giant baby', x: 0, z: 1.5, behavior: 'idle', link: true }],
    openSides: ['east'],
  },
  {
    title: 'Pool With No Water',
    blurb: 'Chlorine memory hangs in dry air.',
    mood: 'static',
    tags: ['pool', 'humid', 'abandoned'],
    width: 20,
    depth: 14,
    height: 5,
    props: [
      { kind: 'bench', label: 'pool bench', x: -7, z: -4 },
      { kind: 'bench', label: 'pool bench', x: -7, z: 0 },
      { kind: 'bench', label: 'pool bench', x: -7, z: 4 },
      { kind: 'sign', label: 'depth sign', x: 6, z: -5 },
      { kind: 'lamp', label: 'pole light', x: 8, z: 5 },
      { kind: 'lamp', label: 'pole light', x: -8, z: 5 },
      { kind: 'chair', label: 'deck chair', x: 5, z: 3, rot: 0.4 },
      { kind: 'chair', label: 'deck chair', x: 6.2, z: 3.5, rot: 0.5 },
      { kind: 'door_fake', label: 'locker door', x: 0, z: -6.5, link: true },
    ],
    entities: [{ kind: 'figure_raincoat', label: 'figure in a raincoat', x: 2, z: -2, behavior: 'wander', link: true }],
  },
  {
    title: 'Backrooms Annex',
    blurb: 'The hum is not electrical. It is patient.',
    mood: 'static',
    tags: ['backrooms', 'yellow', 'liminal'],
    width: 22,
    depth: 18,
    height: 3.0,
    props: [
      { kind: 'pillar', label: 'support pillar', x: -4, z: -3 },
      { kind: 'pillar', label: 'support pillar', x: 4, z: -3 },
      { kind: 'pillar', label: 'support pillar', x: -4, z: 4 },
      { kind: 'pillar', label: 'support pillar', x: 4, z: 4 },
      { kind: 'pillar', label: 'support pillar', x: 0, z: 0 },
      { kind: 'desk', label: 'abandoned desk', x: 7, z: -6 },
      { kind: 'chair', label: 'plastic chair', x: 7, z: -5 },
      { kind: 'cooler', label: 'water cooler', x: -8, z: 6 },
      { kind: 'sign', label: 'wet floor sign', x: 1, z: 6 },
      { kind: 'door_fake', label: 'door that leads nowhere', x: -10.5, z: 0, rot: 1.5708, link: true },
    ],
    entities: [{ kind: 'figure_shadow', label: 'security shadow', x: 8, z: 5, behavior: 'orbit', link: true }],
  },
  {
    title: 'Vending Machine Chapel',
    blurb: 'Offerings are accepted in exact change only.',
    mood: 'dynamic',
    tags: ['vending', 'chapel', 'fluorescent'],
    width: 11,
    depth: 14,
    height: 4.2,
    props: [
      { kind: 'vending', label: 'vending machine', x: -3, z: -5 },
      { kind: 'vending', label: 'vending machine', x: 0, z: -5.2 },
      { kind: 'vending', label: 'vending machine', x: 3, z: -5 },
      { kind: 'bench', label: 'pew bench', x: 0, z: 1 },
      { kind: 'bench', label: 'pew bench', x: 0, z: 3 },
      { kind: 'plant', label: 'dying plant', x: 4, z: 5 },
      { kind: 'lamp', label: 'offering lamp', x: -4, z: 5 },
    ],
    entities: [{ kind: 'figure_guide', label: 'lost tour guide', x: 0, z: -3, behavior: 'stare', link: true }],
  },
  {
    title: 'Abandoned Food Court',
    blurb: 'Trays remain stacked for a rush that never comes.',
    mood: 'downer',
    tags: ['mall', 'food court', 'abandoned'],
    width: 18,
    depth: 16,
    height: 4,
    props: [
      { kind: 'table', label: 'food table', x: -4, z: -2 },
      { kind: 'table', label: 'food table', x: 0, z: 1 },
      { kind: 'table', label: 'food table', x: 4, z: -1 },
      { kind: 'chair', label: 'plastic chair', x: -4, z: -0.8 },
      { kind: 'chair', label: 'plastic chair', x: 0.8, z: 1.8 },
      { kind: 'chair', label: 'plastic chair', x: 4, z: 0.2 },
      { kind: 'cart', label: 'shopping cart', x: 6, z: 5, rot: 0.7 },
      { kind: 'vending', label: 'vending machine', x: -7, z: -6 },
      { kind: 'sign', label: 'closed sign', x: 2, z: -6.5 },
      { kind: 'tv', label: 'menu board', x: 0, z: -7.2 },
    ],
    entities: [
      { kind: 'figure_mannequin', label: 'too-tall mannequin', x: -6, z: 4, behavior: 'idle', link: true },
      { kind: 'figure_balloon', label: 'floating balloon dog', x: 5, z: 3, behavior: 'orbit' },
    ],
  },
  {
    title: 'Soft Clinic',
    blurb: 'The magazines are from a year that has not happened.',
    mood: 'downer',
    tags: ['clinic', 'waiting room', 'liminal'],
    width: 13,
    depth: 11,
    height: 3.1,
    props: [
      { kind: 'bench', label: 'clinic bench', x: -3.5, z: 2 },
      { kind: 'bench', label: 'clinic bench', x: 3.5, z: 2 },
      { kind: 'desk', label: 'intake desk', x: 0, z: -3.5 },
      { kind: 'chair', label: 'office chair', x: 0, z: -2.5 },
      { kind: 'plant', label: 'plastic plant', x: -5, z: -3.5 },
      { kind: 'cabinet', label: 'records cabinet', x: 5, z: -3.5 },
      { kind: 'door_fake', label: 'exam room door', x: 5.8, z: 0, rot: -1.5708, link: true },
      { kind: 'tv', label: 'muted television', x: -5.5, z: 0, rot: 1.5708 },
    ],
    entities: [{ kind: 'figure_clerk', label: 'hallway clerk', x: 1.2, z: -3.2, behavior: 'idle' }],
  },
  {
    title: 'Service Corridor B',
    blurb: 'Pipes tick like a clock under the floor.',
    mood: 'static',
    tags: ['corridor', 'service', 'narrow'],
    width: 8,
    depth: 24,
    height: 2.8,
    props: [
      { kind: 'cabinet', label: 'utility cabinet', x: -2.5, z: -8 },
      { kind: 'cabinet', label: 'utility cabinet', x: 2.5, z: -3 },
      { kind: 'sign', label: 'staff only sign', x: 0, z: -10 },
      { kind: 'cooler', label: 'water cooler', x: -2.4, z: 2 },
      { kind: 'cart', label: 'janitor cart', x: 2, z: 6 },
      { kind: 'door_fake', label: 'exit door', x: 0, z: 11.2, link: true },
      { kind: 'lamp', label: 'emergency lamp', x: 2.5, z: 10 },
    ],
    entities: [{ kind: 'figure_shadow', label: 'security shadow', x: 0, z: 4, behavior: 'wander', link: true }],
  },
  {
    title: 'Midnight Courtyard',
    blurb: 'The fountain is full of coins and no wishes.',
    mood: 'upper',
    tags: ['courtyard', 'night', 'open'],
    width: 18,
    depth: 18,
    height: 6,
    props: [
      { kind: 'pillar', label: 'column', x: -5, z: -5 },
      { kind: 'pillar', label: 'column', x: 5, z: -5 },
      { kind: 'pillar', label: 'column', x: -5, z: 5 },
      { kind: 'pillar', label: 'column', x: 5, z: 5 },
      { kind: 'bench', label: 'stone bench', x: 0, z: 6 },
      { kind: 'bench', label: 'stone bench', x: -6, z: 0, rot: 1.5708 },
      { kind: 'plant', label: 'courtyard tree', x: 0, z: 0 },
      { kind: 'lamp', label: 'path lamp', x: -7, z: -7 },
      { kind: 'lamp', label: 'path lamp', x: 7, z: 7 },
    ],
    entities: [{ kind: 'figure_deer', label: 'soft-eyed deer', x: 3, z: -2, behavior: 'wander', link: true }],
    openSides: ['north', 'south'],
  },
  {
    title: 'Observation Room',
    blurb: 'One-way glass only works if someone is watching.',
    mood: 'downer',
    tags: ['observation', 'clinical', 'uncanny'],
    width: 10,
    depth: 10,
    height: 3.4,
    props: [
      { kind: 'mirror', label: 'observation glass', x: 0, z: -4.5 },
      { kind: 'chair', label: 'metal chair', x: 0, z: 0 },
      { kind: 'table', label: 'interview table', x: 0, z: 1.2 },
      { kind: 'lamp', label: 'harsh lamp', x: 3, z: 3 },
      { kind: 'cabinet', label: 'locked cabinet', x: -3.5, z: -3.5 },
      { kind: 'door_fake', label: 'sealed door', x: 4.4, z: 0, rot: -1.5708, link: true },
    ],
    entities: [{ kind: 'figure_mannequin', label: 'too-tall mannequin', x: -2, z: -2, behavior: 'stare', link: true }],
  },
];

export function generateOfflineRoom(ctx: GenerationContext): RoomSpec {
  const rng = new SeededRng(ctx.seed);
  const available = THEMES.filter((t) => !ctx.previousTitles.includes(t.title));
  const theme = rng.pick(available.length ? available : THEMES);
  const mood = rng.chance(0.7) ? theme.mood : biasMood(rng, ctx.moodBias);
  const palette = paletteForMood(mood, ctx.allowGore);
  const scale = 0.9 + rng.float(0, 0.25);

  const width = theme.width * scale;
  const depth = theme.depth * scale;
  const height = theme.height;

  const props: RoomProp[] = theme.props.map((p, i) => {
    const b = boundsForKind(p.kind);
    return {
      id: `p${i}`,
      label: p.label,
      shape: 'box' as const,
      position: { x: p.x * scale, y: 0, z: p.z * scale },
      rotationY: p.rot ?? 0,
      scale: { x: b.w, y: b.h, z: b.d },
      color: palette.accent,
      roughness: 0.8,
      metalness: 0.1,
      linksOnTouch: Boolean(p.link),
      solid: true,
      kind: p.kind,
    };
  });

  for (const p of props) {
    if (Math.hypot(p.position.x, p.position.z) < 1.4) p.position.z += 2.2;
  }

  const entities: RoomEntity[] = theme.entities.map((e, i) => {
    const b = boundsForKind(e.kind);
    return {
      id: `e${i}`,
      label: e.label,
      shape: 'box' as const,
      position: { x: e.x * scale, y: 0, z: e.z * scale },
      scale: { x: b.w, y: b.h, z: b.d },
      color: palette.accent,
      behavior: e.behavior,
      speed: rng.float(0.35, 1.0),
      linksOnTouch: e.link !== false,
      kind: e.kind,
    };
  });

  if (rng.chance(0.45)) {
    const extras: PropKind[] = ['plant', 'sign', 'lamp', 'chair', 'cart'];
    const kind = rng.pick(extras);
    const b = boundsForKind(kind);
    props.push({
      id: 'px',
      label: kind,
      shape: 'box',
      position: {
        x: rng.float(-width / 2 + 2, width / 2 - 2),
        y: 0,
        z: rng.float(-depth / 2 + 2, depth / 2 - 2),
      },
      scale: { x: b.w, y: b.h, z: b.d },
      color: palette.accent,
      solid: true,
      kind,
    });
  }

  return {
    id: `room-${ctx.seed}`,
    seed: ctx.seed,
    title: theme.title,
    blurb: theme.blurb,
    themeTags: [...theme.tags, mood],
    mood,
    width,
    depth,
    height,
    palette,
    fogNear: mood === 'downer' ? 10 : 14,
    fogFar: mood === 'downer' ? 36 : 55,
    physics: physicsForMood(rng, mood),
    linkColor: moodLinkColor(mood, ctx.allowGore),
    props,
    entities,
    openSides: theme.openSides,
    offline: true,
  };
}

function biasMood(rng: SeededRng, bias: MoodAxis): MoodAxis {
  if (rng.chance(0.55)) return bias;
  return rng.pick(['upper', 'downer', 'static', 'dynamic'] as const);
}

function paletteForMood(mood: MoodAxis, allowGore: boolean) {
  if (mood === 'downer') {
    return {
      floor: '#2a2430',
      ceiling: '#1a1620',
      walls: '#3a3144',
      accent: allowGore ? '#6b3038' : '#5a6a88',
      fog: '#1c1822',
      light: '#c8b8a0',
      ambient: '#6a6070',
    };
  }
  if (mood === 'upper') {
    return {
      floor: '#d8c8a8',
      ceiling: '#f0e8d8',
      walls: '#e6dcc4',
      accent: '#6aa8c8',
      fog: '#d8e0e8',
      light: '#fff6d8',
      ambient: '#b0c0c8',
    };
  }
  if (mood === 'dynamic') {
    return {
      floor: '#3a3550',
      ceiling: '#2a2040',
      walls: '#4a4070',
      accent: '#5eead4',
      fog: '#2a2440',
      light: '#e0d0ff',
      ambient: '#7060a0',
    };
  }
  return {
    floor: '#9a8458',
    ceiling: '#e8e0cc',
    walls: '#d2c08a',
    accent: '#6a7a8a',
    fog: '#c8b890',
    light: '#fff2c9',
    ambient: '#a09070',
  };
}

function physicsForMood(rng: SeededRng, mood: MoodAxis) {
  switch (mood) {
    case 'upper':
      return { gravity: rng.float(0.7, 0.95), moveSpeed: rng.float(1.05, 1.25), friction: rng.float(0.8, 1), bounce: rng.float(0, 0.15), sway: rng.float(0.15, 0.4) };
    case 'downer':
      return { gravity: rng.float(1.05, 1.3), moveSpeed: rng.float(0.75, 0.95), friction: rng.float(1.05, 1.3), bounce: 0, sway: rng.float(0.25, 0.7) };
    case 'dynamic':
      return { gravity: rng.float(0.6, 1.35), moveSpeed: rng.float(0.9, 1.3), friction: rng.float(0.6, 1.15), bounce: rng.float(0.05, 0.35), sway: rng.float(0.35, 0.9) };
    default:
      return { gravity: 1, moveSpeed: 1, friction: 1, bounce: 0, sway: rng.float(0.12, 0.35) };
  }
}

function moodLinkColor(mood: MoodAxis, allowGore: boolean): string {
  if (mood === 'downer') return allowGore ? '#4a1515' : '#15203f';
  if (mood === 'upper') return '#eef2ff';
  if (mood === 'dynamic') return '#2dd4bf';
  return '#c4a35a';
}

export function defaultSpawnHeight(): number {
  return PLAYER.eyeHeight;
}
