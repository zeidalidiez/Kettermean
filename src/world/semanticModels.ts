import * as THREE from 'three';
import type { SemanticModelKind } from './semanticAssets';

export const SEMANTIC_BOUNDS: Record<SemanticModelKind, { w: number; h: number; d: number }> = {
  conference_table: { w: 3.8, h: 1.05, d: 1.45 },
  dentist_chair: { w: 2.1, h: 1.65, d: 0.95 },
  barber_chair: { w: 0.95, h: 1.65, d: 0.95 },
  reading_table: { w: 2.4, h: 1.15, d: 1.25 },
  bunk_bed: { w: 2.15, h: 2.15, d: 1 },
  card_table: { w: 1.35, h: 0.95, d: 1.35 },
  lectern: { w: 0.95, h: 1.45, d: 0.72 },
  coat_rack: { w: 0.9, h: 2, d: 0.9 },
  grandfather_clock: { w: 0.85, h: 2.25, d: 0.5 },
  jukebox: { w: 1.05, h: 1.85, d: 0.72 },
  luggage_carousel: { w: 4.2, h: 1.15, d: 2.8 },
  ticket_booth: { w: 2.1, h: 2.6, d: 1.55 },
  laundry_folding_table: { w: 2.1, h: 1.05, d: 1 },
  patio_table: { w: 2.3, h: 2.9, d: 2.3 },
  figure_dentist: { w: 0.9, h: 2.42, d: 0.68 },
  figure_cashier: { w: 0.88, h: 2.4, d: 0.66 },
  figure_projectionist: { w: 1.15, h: 2.45, d: 0.72 },
  figure_choir_member: { w: 0.98, h: 2.45, d: 0.72 },
  figure_park_ranger: { w: 1.08, h: 2.5, d: 0.72 },
  figure_hotel_guest: { w: 1.18, h: 2.45, d: 0.78 },
  figure_crossing_guard: { w: 1.18, h: 2.5, d: 0.72 },
  figure_bingo_caller: { w: 1.05, h: 2.45, d: 0.72 },
};

type Shape = 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus';

interface PartOptions {
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
  rotation?: [number, number, number];
  name?: string;
}

/** Build the geometry for the tagged semantic batch in semanticAssets.ts. */
export function buildSemanticModel(
  kind: string,
  variant: number,
  accent: string,
  body: string,
): THREE.Group | null {
  if (!(kind in SEMANTIC_BOUNDS)) return null;
  const typedKind = kind as SemanticModelKind;
  if (typedKind.startsWith('figure_')) {
    return buildSemanticNpc(typedKind, variant, accent, body);
  }

  const root = new THREE.Group();
  root.name = `${typedKind}-${variant}`;
  const primary = variantColor(body, variant, -0.04);
  const secondary = variantColor(accent, variant, 0.06);
  const dark = variantColor('#33383b', variant, -0.08);
  const light = variantColor('#e7e2d3', variant, 0.08);
  const add = partAdder(root);

  switch (typedKind) {
    case 'conference_table': {
      const length = 3.45 + (variant % 3) * 0.12;
      add('box', [length, 0.16, 1.25], [0, 0.82, 0], primary, { roughness: 0.48 });
      add('box', [1.55, 0.62, 0.62], [0, 0.42, 0], dark, { metalness: 0.38 });
      for (const x of [-1.42, 1.42]) {
        add('box', [0.18, 0.72, 0.92], [x, 0.4, 0], secondary, { metalness: 0.32 });
      }
      add('box', [0.55, 0.055, 0.32], [0, 0.925, 0], dark);
      for (const x of [-0.72, 0, 0.72]) {
        add('cylinder', [0.1, 0.055, 0.1], [x, 0.94, variant % 2 ? 0.25 : -0.25], secondary, { emissive: secondary, emissiveIntensity: 0.18 });
      }
      break;
    }
    case 'dentist_chair': {
      add('cylinder', [0.72, 0.18, 0.72], [0, 0.09, 0], dark, { metalness: 0.58 });
      add('cylinder', [0.24, 0.62, 0.24], [0, 0.4, 0], light, { metalness: 0.72 });
      add('box', [0.85, 0.22, 0.9], [0.22, 0.73, 0], secondary, { rotation: [0, 0, -0.1] });
      add('box', [0.82, 0.22, 1.05], [-0.58, 1.03, 0], secondary, { rotation: [0, 0, 0.5] });
      add('box', [0.42, 0.18, 0.58], [-1.02, 1.38, 0], primary, { rotation: [0, 0, 0.24] });
      for (const z of [-0.52, 0.52]) add('box', [1.1, 0.1, 0.1], [-0.05, 1.0, z], dark);
      add('cylinder', [0.1, 1.25, 0.1], [0.75, 1.05, -0.58], light, { rotation: [0, 0, -0.42], metalness: 0.7 });
      add('sphere', [0.52, 0.18, 0.52], [0.48, 1.58, -0.58], light, { emissive: light, emissiveIntensity: 0.36 });
      break;
    }
    case 'barber_chair': {
      add('cylinder', [0.88, 0.16, 0.88], [0, 0.08, 0], dark, { metalness: 0.72 });
      add('cylinder', [0.24, 0.62, 0.24], [0, 0.39, 0], light, { metalness: 0.78 });
      add('box', [0.78, 0.2, 0.78], [0, 0.74, 0], secondary);
      add('box', [0.78, 0.88, 0.18], [0, 1.15, -0.31], primary, { rotation: [-0.12, 0, 0] });
      add('box', [0.42, 0.25, 0.16], [0, 1.64, -0.34], dark);
      for (const x of [-0.48, 0.48]) add('box', [0.12, 0.58, 0.78], [x, 0.92, 0], secondary);
      add('box', [0.65, 0.08, 0.48], [0, 0.43, 0.68], light, { rotation: [0.18, 0, 0], metalness: 0.64 });
      break;
    }
    case 'reading_table': {
      add('box', [2.25, 0.14, 1.1], [0, 0.82, 0], primary);
      for (const x of [-0.92, 0.92]) for (const z of [-0.4, 0.4]) {
        add('box', [0.12, 0.78, 0.12], [x, 0.4, z], dark);
      }
      for (const x of [-0.58, 0.58]) {
        add('cylinder', [0.08, 0.58, 0.08], [x, 1.12, 0], light, { metalness: 0.62 });
        add('cone', [0.46, 0.32, 0.46], [x, 1.42, 0], secondary, { emissive: secondary, emissiveIntensity: 0.28 });
        add('box', [0.42, 0.035, 0.3], [x + (variant % 2 ? 0.18 : -0.18), 0.91, 0.22], variantColor('#8b5e3c', variant, x), { rotation: [0, x * 0.1, 0] });
      }
      break;
    }
    case 'bunk_bed': {
      for (const x of [-0.96, 0.96]) for (const z of [-0.42, 0.42]) {
        add('box', [0.1, 2.08, 0.1], [x, 1.04, z], dark, { metalness: 0.58 });
      }
      for (const y of [0.48, 1.52]) {
        add('box', [2.02, 0.12, 0.9], [0, y, 0], primary);
        add('box', [1.88, 0.14, 0.78], [0, y + 0.13, 0], light);
        add('box', [0.42, 0.13, 0.72], [-0.67, y + 0.25, 0], secondary);
      }
      for (let rung = 0; rung < 5; rung += 1) add('box', [0.5, 0.08, 0.08], [0.72, 0.45 + rung * 0.32, 0.54], dark, { metalness: 0.64 });
      for (const x of [0.48, 0.96]) add('box', [0.08, 1.7, 0.08], [x, 1.0, 0.54], dark, { metalness: 0.64 });
      break;
    }
    case 'card_table': {
      add('box', [1.25, 0.11, 1.25], [0, 0.76, 0], secondary);
      for (const x of [-0.48, 0.48]) for (const z of [-0.48, 0.48]) {
        add('box', [0.08, 0.76, 0.08], [x, 0.38, z], dark, { rotation: [0, 0, x * 0.12] });
      }
      for (let card = 0; card < 5; card += 1) {
        add('box', [0.18, 0.018, 0.26], [-0.38 + card * 0.19, 0.83, (card % 2) * 0.2 - 0.1], card % 2 ? '#eee8d8' : primary, { rotation: [0, (card - 2) * 0.16, 0] });
      }
      for (let chip = 0; chip < 4; chip += 1) add('cylinder', [0.12, 0.035, 0.12], [0.36, 0.84 + chip * 0.026, -0.32], variantColor(accent, variant + chip, 0.16));
      break;
    }
    case 'lectern': {
      add('box', [0.78, 0.12, 0.62], [0, 0.06, 0], dark);
      add('box', [0.24, 1.05, 0.22], [0, 0.58, 0], primary);
      add('box', [0.84, 0.5, 0.5], [0, 1.12, 0], primary, { rotation: [-0.22, 0, 0] });
      add('box', [0.78, 0.08, 0.58], [0, 1.39, -0.04], secondary, { rotation: [-0.22, 0, 0] });
      add('box', [0.46, 0.025, 0.34], [0, 1.46, -0.1], light, { rotation: [-0.22, 0, 0] });
      add('cylinder', [0.05, 0.48, 0.05], [0.3, 1.62, -0.16], dark, { rotation: [0, 0, -0.42] });
      add('sphere', [0.12, 0.12, 0.12], [0.14, 1.82, -0.16], secondary, { emissive: secondary, emissiveIntensity: 0.18 });
      break;
    }
    case 'coat_rack': {
      add('cylinder', [0.78, 0.1, 0.78], [0, 0.05, 0], dark, { metalness: 0.52 });
      add('cylinder', [0.11, 1.88, 0.11], [0, 0.98, 0], primary);
      add('sphere', [0.18, 0.18, 0.18], [0, 1.94, 0], secondary);
      const hooks = 5 + (variant % 3);
      for (let hook = 0; hook < hooks; hook += 1) {
        const angle = (hook / hooks) * Math.PI * 2;
        const x = Math.cos(angle) * 0.3;
        const z = Math.sin(angle) * 0.3;
        add('cylinder', [0.06, 0.48, 0.06], [x * 0.55, 1.7, z * 0.55], dark, { rotation: [z, 0, -x] });
        if ((hook + variant) % 2 === 0) add('box', [0.42, 0.72, 0.12], [x * 1.18, 1.28, z * 1.18], variantColor(accent, variant + hook, 0.04), { rotation: [0, -angle, 0] });
      }
      break;
    }
    case 'grandfather_clock': {
      add('box', [0.72, 2.05, 0.42], [0, 1.02, 0], primary);
      add('box', [0.82, 0.22, 0.5], [0, 0.11, 0], dark);
      add('box', [0.84, 0.18, 0.5], [0, 2.08, 0], dark);
      add('sphere', [0.53, 0.53, 0.12], [0, 1.7, 0.24], light);
      for (let tick = 0; tick < 12; tick += 1) {
        const angle = (tick / 12) * Math.PI * 2;
        add('box', [0.025, 0.08, 0.025], [Math.sin(angle) * 0.22, 1.7 + Math.cos(angle) * 0.22, 0.31], dark, { rotation: [0, 0, -angle] });
      }
      add('box', [0.035, 0.25, 0.035], [0.03, 1.58, 0.32], dark, { rotation: [0, 0, 0.32 + variant * 0.035] });
      add('cylinder', [0.06, 0.82, 0.06], [0, 0.85, 0.23], light, { metalness: 0.7 });
      add('sphere', [0.22, 0.3, 0.08], [0, 0.48, 0.24], secondary, { metalness: 0.62 });
      break;
    }
    case 'jukebox': {
      add('box', [0.98, 1.46, 0.66], [0, 0.76, 0], primary);
      add('torus', [0.78, 1.02, 0.13], [0, 1.25, 0.35], secondary, { emissive: secondary, emissiveIntensity: 0.55 });
      add('box', [0.65, 0.72, 0.06], [0, 1.21, 0.37], '#1d2426');
      for (let bar = 0; bar < 6; bar += 1) add('box', [0.045, 0.62, 0.035], [-0.25 + bar * 0.1, 1.18, 0.42], light, { rotation: [0, 0, (bar - 2.5) * 0.035] });
      add('box', [0.76, 0.42, 0.08], [0, 0.52, 0.37], dark);
      for (let button = 0; button < 5; button += 1) add('sphere', [0.08, 0.08, 0.04], [-0.28 + button * 0.14, 0.58, 0.43], variantColor(accent, variant + button, 0.18), { emissive: secondary, emissiveIntensity: 0.3 });
      add('box', [0.76, 0.1, 0.7], [0, 0.05, 0], dark);
      break;
    }
    case 'luggage_carousel': {
      add('cylinder', [2.1, 0.5, 1.4], [0, 0.25, 0], dark, { metalness: 0.64 });
      add('cylinder', [1.55, 0.62, 0.92], [0, 0.46, 0], primary);
      const segments = 14;
      for (let segment = 0; segment < segments; segment += 1) {
        const angle = (segment / segments) * Math.PI * 2;
        add('box', [0.72, 0.08, 0.36], [Math.cos(angle) * 1.55, 0.64, Math.sin(angle) * 1.02], light, { rotation: [0, -angle, 0], metalness: 0.76 });
      }
      for (let bag = 0; bag < 4; bag += 1) {
        const angle = ((bag + variant * 0.17) / 4) * Math.PI * 2;
        add('box', [0.48 + (bag % 2) * 0.14, 0.5, 0.26], [Math.cos(angle) * 1.48, 0.91, Math.sin(angle) * 0.96], variantColor(accent, variant + bag, bag * 0.05), { rotation: [0, -angle + 0.2, 0] });
        add('torus', [0.2, 0.22, 0.05], [Math.cos(angle) * 1.48, 1.19, Math.sin(angle) * 0.96], dark, { rotation: [Math.PI / 2, -angle, 0] });
      }
      break;
    }
    case 'ticket_booth': {
      add('box', [1.98, 0.18, 1.45], [0, 0.09, 0], dark);
      add('box', [1.98, 2.25, 0.18], [0, 1.25, -0.63], primary);
      for (const x of [-0.9, 0.9]) add('box', [0.18, 2.25, 1.25], [x, 1.25, 0], primary);
      add('box', [2.08, 0.22, 1.55], [0, 2.45, 0], secondary);
      add('box', [1.62, 1.05, 0.08], [0, 1.58, 0.68], '#8bb4bc', { metalness: 0.15, roughness: 0.2 });
      add('box', [1.76, 0.24, 0.52], [0, 0.92, 0.55], light);
      add('box', [1.42, 0.34, 0.08], [0, 2.2, 0.72], dark);
      for (let letter = 0; letter < 6; letter += 1) add('box', [0.12, 0.1, 0.025], [-0.42 + letter * 0.17, 2.2, 0.78], secondary, { emissive: secondary, emissiveIntensity: 0.48 });
      break;
    }
    case 'laundry_folding_table': {
      add('box', [2, 0.14, 0.92], [0, 0.83, 0], light);
      for (const x of [-0.83, 0.83]) for (const z of [-0.35, 0.35]) add('box', [0.1, 0.82, 0.1], [x, 0.41, z], dark, { metalness: 0.5 });
      for (let pile = 0; pile < 4; pile += 1) {
        add('box', [0.38 + (pile % 2) * 0.16, 0.1, 0.32], [-0.66 + pile * 0.43, 0.94 + (pile % 2) * 0.08, 0.05], variantColor(accent, variant + pile, pile * 0.07), { rotation: [0, (pile - 1.5) * 0.08, 0] });
      }
      add('box', [0.62, 0.34, 0.44], [0.55, 1.08, -0.2], primary);
      for (let slot = 0; slot < 5; slot += 1) add('box', [0.055, 0.32, 0.04], [0.32 + slot * 0.12, 1.08, 0.035], dark, { rotation: [0, 0, (slot - 2) * 0.12] });
      break;
    }
    case 'patio_table': {
      add('cylinder', [1.35, 0.12, 1.35], [0, 0.8, 0], primary);
      add('cylinder', [0.12, 2.72, 0.12], [0, 1.36, 0], dark, { metalness: 0.45 });
      add('cone', [2.25, 0.62, 2.25], [0, 2.58, 0], secondary, { emissive: secondary, emissiveIntensity: 0.08 });
      add('cylinder', [0.72, 0.1, 0.72], [0, 0.05, 0], dark);
      const seats = 4 + (variant % 2);
      for (let seat = 0; seat < seats; seat += 1) {
        const angle = (seat / seats) * Math.PI * 2;
        const x = Math.cos(angle) * 0.92;
        const z = Math.sin(angle) * 0.92;
        add('box', [0.48, 0.12, 0.48], [x, 0.46, z], light, { rotation: [0, -angle, 0] });
        add('box', [0.48, 0.6, 0.1], [x * 1.18, 0.72, z * 1.18], light, { rotation: [0, -angle, 0] });
        add('box', [0.08, 0.48, 0.08], [x, 0.23, z], dark);
      }
      break;
    }
    default:
      return null;
  }

  return root;
}

function buildSemanticNpc(
  kind: SemanticModelKind,
  variant: number,
  accent: string,
  body: string,
): THREE.Group {
  const root = new THREE.Group();
  root.name = `${kind}-${variant}`;
  const add = partAdder(root);
  const skinTones = ['#d8ad8c', '#8e6045', '#c98e68', '#6f4938', '#e0b996', '#9f7255', '#b77f5f', '#5b3b31'];
  const skin = variantColor(skinTones[(variant + kind.length) % skinTones.length]!, variant, 0.02);
  const uniform = variantColor(accent, variant, kind.length * 0.003);
  const trousers = variantColor(body, variant, -0.1);
  const dark = variantColor('#292e33', variant, -0.08);
  const light = variantColor('#e8e4d8', variant, 0.06);
  const shoulder = 0.33 + (variant % 3) * 0.025;
  const eyeSpacing = 0.09 + ((variant * 3 + kind.length) % 5) * 0.009;
  const eyeY = 2.13 + ((variant + kind.length) % 3 - 1) * 0.018;

  add('box', [shoulder * 2, 0.78, 0.38], [0, 1.43, 0], uniform);
  add('box', [0.52, 0.28, 0.34], [0, 0.96, 0], trousers);
  add('cylinder', [0.16, 0.18, 0.16], [0, 1.89, 0], skin);
  add('sphere', [0.48 + variant * 0.008, 0.57, 0.46], [0, 2.12, 0], skin, { name: 'rig-head' });
  for (const side of [-1, 1]) {
    add('sphere', [0.1, 0.14, 0.08], [side * 0.25, 2.12, 0], skin);
    add('sphere', [0.105, 0.065, 0.045], [side * eyeSpacing, eyeY, 0.224], light);
    add('sphere', [0.043, 0.055, 0.028], [side * eyeSpacing, eyeY, 0.265], dark);
    add('box', [0.12, 0.025, 0.025], [side * eyeSpacing, eyeY + 0.11, 0.252], dark, { rotation: [0, 0, side * (variant - 3.5) * 0.018] });
    const armX = side * (shoulder + 0.13);
    add('cylinder', [0.17, 0.58, 0.17], [armX, 1.45, 0], uniform, { rotation: [0, 0, side * 0.07], name: side < 0 ? 'rig-arm-left' : 'rig-arm-right' });
    add('cylinder', [0.14, 0.55, 0.14], [armX + side * 0.035, 1.0, 0.03], skin, { rotation: [0, 0, side * -0.04] });
    add('sphere', [0.18, 0.2, 0.16], [armX, 0.7, 0.04], skin);
    const legX = side * 0.2;
    add('cylinder', [0.21, 0.65, 0.21], [legX, 0.66, 0], trousers, { name: side < 0 ? 'rig-leg-left' : 'rig-leg-right' });
    add('cylinder', [0.18, 0.56, 0.18], [legX, 0.25, 0], trousers);
    add('box', [0.3, 0.16, 0.46], [legX, 0.08, 0.1], dark);
  }
  add('cone', [0.13 + (variant % 2) * 0.025, 0.2, 0.13], [((variant % 3) - 1) * 0.015, 2.02, 0.275], skin, { rotation: [Math.PI / 2, 0, 0] });
  add('box', [0.18 + (variant % 3) * 0.025, 0.032, 0.028], [0, 1.91, 0.276], variant % 2 ? '#6d3941' : dark, { rotation: [0, 0, (variant - 3.5) * 0.018] });
  add('sphere', [0.51, 0.22 + (variant % 3) * 0.04, 0.47], [0, 2.43, -0.02], variantColor(dark, variant, 0.03));
  if (variant % 2 === 0) {
    for (const side of [-1, 1]) add('sphere', [0.17, 0.32 + variant * 0.012, 0.17], [side * 0.24, 2.33, -0.12], variantColor(dark, variant, side * 0.04));
  } else {
    add('box', [0.5, 0.3, 0.18], [0, 2.34, -0.2], variantColor(dark, variant, 0.05));
  }

  addRoleDetails(root, kind, variant, uniform, dark, light, skin);
  return root;
}

function addRoleDetails(
  root: THREE.Group,
  kind: SemanticModelKind,
  variant: number,
  uniform: string,
  dark: string,
  light: string,
  skin: string,
): void {
  const add = partAdder(root);
  switch (kind) {
    case 'figure_dentist':
      add('box', [0.58, 0.75, 0.04], [0, 1.42, 0.22], light);
      add('box', [0.34, 0.15, 0.05], [0, 2.0, 0.29], '#b9e2df');
      add('torus', [0.42, 0.42, 0.08], [0, 2.48, 0], dark, { rotation: [Math.PI / 2, 0, 0], metalness: 0.65 });
      add('cylinder', [0.04, 0.52, 0.04], [0.5, 0.98, 0.08], light, { rotation: [0, 0, -0.35], metalness: 0.75 });
      break;
    case 'figure_cashier':
      add('box', [0.58, 0.72, 0.04], [0, 1.36, 0.22], variantColor('#825b72', variant, 0.08));
      add('box', [0.24, 0.13, 0.035], [0.17, 1.57, 0.25], light);
      add('box', [0.36, 0.24, 0.18], [0.48, 0.78, 0.08], dark);
      for (let button = 0; button < 4; button += 1) add('sphere', [0.045, 0.045, 0.025], [0.36 + button * 0.08, 0.84, 0.19], variantColor(uniform, variant + button, 0.12));
      break;
    case 'figure_projectionist':
      add('cylinder', [0.62, 0.12, 0.62], [0, 2.47, 0], dark);
      add('box', [0.52, 0.12, 0.4], [0.18, 2.49, 0.18], dark);
      add('torus', [0.62, 0.62, 0.09], [0.48, 1.16, 0.04], light, { rotation: [Math.PI / 2, 0, 0], metalness: 0.62 });
      for (let hole = 0; hole < 5; hole += 1) {
        const angle = (hole / 5) * Math.PI * 2;
        add('sphere', [0.09, 0.09, 0.05], [0.48 + Math.cos(angle) * 0.2, 1.16 + Math.sin(angle) * 0.2, 0.1], dark);
      }
      break;
    case 'figure_choir_member':
      add('box', [0.82, 1.12, 0.48], [0, 1.12, -0.02], variantColor('#5e3e75', variant, 0.05));
      add('box', [0.16, 0.92, 0.04], [0, 1.33, 0.25], light);
      add('box', [0.52, 0.36, 0.05], [0.35, 0.95, 0.14], variantColor('#7b4438', variant), { rotation: [0, -0.18, -0.15] });
      add('box', [0.04, 0.3, 0.02], [0.35, 0.95, 0.2], light);
      break;
    case 'figure_park_ranger':
      add('cylinder', [0.9, 0.1, 0.9], [0, 2.45, 0], variantColor('#76633d', variant));
      add('cone', [0.52, 0.32, 0.52], [0, 2.62, 0], variantColor('#76633d', variant));
      add('sphere', [0.14, 0.14, 0.05], [-0.18, 1.55, 0.23], '#d4b44c', { metalness: 0.68 });
      add('box', [0.18, 0.32, 0.1], [0.43, 1.43, 0.1], dark);
      add('cylinder', [0.035, 0.48, 0.035], [0.43, 1.77, 0.09], dark);
      break;
    case 'figure_hotel_guest':
      add('box', [0.74, 0.92, 0.48], [0, 1.38, -0.02], variantColor('#65566e', variant, 0.04));
      add('box', [0.52, 0.68, 0.24], [0.52, 0.5, 0.05], variantColor('#79573d', variant));
      add('torus', [0.28, 0.36, 0.06], [0.52, 0.91, 0.05], dark, { rotation: [Math.PI / 2, 0, 0] });
      add('box', [0.1, 0.2, 0.025], [-0.3, 1.48, 0.25], '#d7b94d', { emissive: '#715f1c', emissiveIntensity: 0.16 });
      break;
    case 'figure_crossing_guard':
      add('box', [0.74, 0.72, 0.05], [0, 1.43, 0.22], '#e6b827');
      for (const x of [-0.2, 0.2]) add('box', [0.1, 0.72, 0.025], [x, 1.43, 0.255], light, { emissive: light, emissiveIntensity: 0.18 });
      add('cylinder', [0.055, 1.65, 0.055], [0.55, 1.12, 0.04], dark, { rotation: [0, 0, -0.08] });
      add('cylinder', [0.58, 0.1, 0.58], [0.48, 1.9, 0.04], '#c93e39');
      add('cylinder', [0.42, 0.12, 0.42], [0.48, 1.9, 0.1], light);
      break;
    case 'figure_bingo_caller':
      add('box', [0.18, 0.12, 0.05], [-0.1, 1.68, 0.25], variantColor('#9f3c4b', variant), { rotation: [0, 0, 0.62] });
      add('box', [0.18, 0.12, 0.05], [0.1, 1.68, 0.25], variantColor('#9f3c4b', variant), { rotation: [0, 0, -0.62] });
      add('cylinder', [0.055, 0.72, 0.055], [0.47, 1.15, 0.08], dark, { rotation: [0, 0, -0.22] });
      add('sphere', [0.13, 0.18, 0.13], [0.39, 1.49, 0.09], light, { metalness: 0.48 });
      add('box', [0.42, 0.58, 0.04], [-0.42, 1.02, 0.15], light);
      for (let cell = 0; cell < 6; cell += 1) add('sphere', [0.04, 0.04, 0.02], [-0.56 + (cell % 3) * 0.14, 1.16 - Math.floor(cell / 3) * 0.18, 0.19], variantColor(uniform, variant + cell, 0.14));
      break;
    default:
      add('box', [0.24, 0.14, 0.04], [0, 1.45, 0.23], skin);
  }
}

function partAdder(root: THREE.Group) {
  return (
    shape: Shape,
    scale: [number, number, number],
    position: [number, number, number],
    color: string,
    options: PartOptions = {},
  ): THREE.Mesh => {
    const mesh = makePart(shape, scale, position, color, options);
    root.add(mesh);
    return mesh;
  };
}

function makePart(
  shape: Shape,
  scale: [number, number, number],
  position: [number, number, number],
  color: string,
  options: PartOptions,
): THREE.Mesh {
  const geometry = (() => {
    switch (shape) {
      case 'cylinder': return new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
      case 'sphere': return new THREE.SphereGeometry(0.5, 16, 12);
      case 'cone': return new THREE.ConeGeometry(0.5, 1, 16);
      case 'torus': return new THREE.TorusGeometry(0.5, 0.12, 9, 24);
      default: return new THREE.BoxGeometry(1, 1, 1);
    }
  })();
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: options.emissive ?? '#000000',
    emissiveIntensity: options.emissiveIntensity ?? 0,
    metalness: options.metalness ?? 0.08,
    roughness: options.roughness ?? 0.74,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  mesh.name = options.name ?? `${shape}-part`;
  mesh.userData.baseRotation = {
    x: mesh.rotation.x,
    y: mesh.rotation.y,
    z: mesh.rotation.z,
  };
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function variantColor(color: string, variant: number, offset = 0): string {
  return new THREE.Color(color)
    .offsetHSL(
      ((variant * 0.077 + offset) % 1) - 0.13,
      (variant % 3 - 1) * 0.04,
      (variant - 3.5) * 0.02,
    )
    .getStyle();
}
