import * as THREE from 'three';
import { hashString } from '../core/rng';
import { DETAILED_PROP_FAMILIES } from './detailedAssets';
import { MASTERWORK_PROP_FAMILIES } from './detailedAssetsRound2';
import { EXHIBITION_PROP_FAMILIES } from './detailedAssetsRound3';
import { ATELIER_PROP_FAMILIES } from './detailedAssetsRound4';
import { geometryForShape } from './modelQuality';

type Bounds = { w: number; h: number; d: number };
type Shape = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus';

interface PropFamily {
  kind: string;
  label: string;
  form?: string;
}

interface PartOptions {
  shape?: Shape;
  rotation?: [number, number, number];
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  name?: string;
}

interface Palette {
  wood: string;
  woodDark: string;
  paint: string;
  paintDark: string;
  metal: string;
  brass: string;
  fabric: string;
  fabricDark: string;
  light: string;
  glass: string;
  glow: string;
  foliage: string;
  soil: string;
}

const PROP_FAMILIES: PropFamily[] = [
  ...DETAILED_PROP_FAMILIES,
  ...MASTERWORK_PROP_FAMILIES,
  ...EXHIBITION_PROP_FAMILIES,
  ...ATELIER_PROP_FAMILIES,
];

const PROP_FAMILY_BY_KIND = new Map(PROP_FAMILIES.map((family) => [family.kind, family]));

/** True only for the four legacy procedural prop catalogues rebuilt here. */
export function isProductionPropKind(kind: string): boolean {
  return PROP_FAMILY_BY_KIND.has(kind);
}

/**
 * Builds a readable, bounded prop from functional components.
 *
 * The retired catalogue builders chose a generic chassis from an array index,
 * then scattered rounded ornaments over it.  This builder instead selects an
 * object archetype from the authored family metadata and the kind's semantic
 * tokens. Variants change finish and a few credible details, never identity.
 */
export function buildProductionProp(
  kind: string,
  variant: number,
  accent: string,
  body: string,
  bounds: Bounds,
): THREE.Group | null {
  const family = PROP_FAMILY_BY_KIND.get(kind);
  if (!family) return null;

  const root = new THREE.Group();
  const palette = paletteFor(kind, variant, accent, body);

  if (kind === 'detail_coat_check_island') {
    buildCoatCheck(root, bounds, palette, variant);
  } else if (kind === 'detail_wardian_plant_case') {
    buildWardianCase(root, bounds, palette, variant);
  } else if (kind === 'atelier_prop_rain_orchestra') {
    buildRainOrchestra(root, bounds, palette, variant);
  } else if (kind === 'atelier_prop_mycology_incubator') {
    buildMycologyIncubator(root, bounds, palette, variant);
  } else {
    buildArchetype(root, kind, family.form ?? '', bounds, palette, variant);
  }

  root.name = `${kind}-${variant}`;
  root.userData.detailTier = 'production-prop';
  root.userData.detailVariant = variant;
  root.userData.modelFamily = family.kind;
  root.userData.semanticLabel = family.label;
  return root;
}

function buildArchetype(
  root: THREE.Group,
  kind: string,
  form: string,
  b: Bounds,
  p: Palette,
  variant: number,
): void {
  const text = `${kind} ${form}`;

  if (/(magic_lantern|film_projector)/.test(kind)) {
    buildProjector(root, kind, b, p, variant);
  } else if (kind.includes('optometrist_phoropter')) {
    buildPhoropter(root, b, p, variant);
  } else if (kind.includes('fresnel_lighthouse_lens')) {
    buildFresnelLens(root, b, p, variant);
  } else if (kind.includes('seismograph')) {
    buildSeismograph(root, b, p, variant);
  } else if (/(seed_archive_carousel|seed_vault_indexer)/.test(kind)) {
    buildSeedCarousel(root, b, p, variant);
  } else if (kind.includes('rotary_deli_slicer')) {
    buildDeliSlicer(root, b, p, variant);
  } else if (kind.includes('processional_canopy')) {
    buildProcessionalCanopy(root, b, p, variant);
  } else if (kind.includes('topiary_frame')) {
    buildTopiary(root, b, p, variant);
  } else if (kind.includes('votive_candle_rack')) {
    buildVotiveRack(root, b, p, variant);
  } else if (kind.includes('surgical_carousel')) {
    buildSurgicalCarousel(root, b, p, variant);
  } else if (kind.includes('kinetic_chandelier')) {
    buildChandelier(root, b, p, variant);
  } else if (kind.includes('ceremonial_tea_robot')) {
    buildTeaRobot(root, b, p, variant);
  } else if (kind.includes('navigation_throne')) {
    buildNavigationThrone(root, kind, b, p, variant);
  } else if (kind.includes('polar_expedition_sledge')) {
    buildSledge(root, b, p, variant);
  } else if (/(pipe_organ|player_piano|perfumery_organ|aurora_light_organ)/.test(text)) {
    buildKeyboardInstrument(root, b, p, variant);
  } else if (/(clock)/.test(kind) && !/(clockmaker_bench|clockwork_proscenium)/.test(kind)) {
    buildClock(root, b, p, variant);
  } else if (/(gramophone|phonograph|record_console|radio_cabinet|dictation|reel_to_reel)/.test(kind)) {
    buildAudio(root, kind, b, p, variant);
  } else if (/(telescope|camera_tripod|spotlight|stereoscope|planetarium_projector|star_chart_projector)/.test(kind)) {
    buildOpticalInstrument(root, kind, b, p, variant);
  } else if (/(loom|sewing|laundry_folding|haberdashery|glove_fitting)/.test(kind) || form === 'textile' || form === 'tailoring') {
    buildTextileMachine(root, kind, b, p, variant);
  } else if (/(printing_press|mangle_press|ceramic_kiln)/.test(kind) || form === 'press') {
    buildPress(root, kind, b, p, variant);
  } else if (/(canopy_bed)/.test(kind) || form === 'bed') {
    buildBed(root, kind, b, p, variant);
  } else if (/(settee|chaise|chair|compartment_seat|shoe_shine_throne)/.test(kind) || form === 'chair' || form === 'portrait') {
    buildSeat(root, kind, b, p, variant);
  } else if (/(billiards_table|chart_table|map_table|drafting_table|typewriter_desk|writing_bureau|rolltop_desk|shoemaker_bench|clockmaker_bench|fossil_reconstruction_bench)/.test(kind) || ['desk', 'workshop', 'classroom', 'cartographic'].includes(form)) {
    buildWorkSurface(root, kind, b, p, variant);
  } else if (/(cart|trolley|sledge)/.test(kind) || form === 'cart') {
    buildCart(root, kind, b, p, variant);
  } else if (/(luggage|trunk)/.test(kind) || form === 'travel' || form === 'stack') {
    buildTravelStorage(root, kind, b, p, variant);
  } else if (/(wardrobe|cabinet|hutch|armoire|bureau|sideboard|pigeonhole|dumbwaiter|dresser|drawer|reliquary|shrine|archive|filing)/.test(kind) || ['cabinet', 'casework', 'archive', 'hospitality', 'memory'].includes(form)) {
    buildCasework(root, kind, b, p, variant);
  } else if (/(terrarium|aviary|aquarium|botanical|greenhouse|plant_case|seed_|topiary|orchid)/.test(kind) || ['habitat', 'botanical', 'aviary', 'aquatic', 'garden'].includes(form)) {
    buildHabitat(root, kind, b, p, variant);
  } else if (/(diorama|specimen|display|anatomy_model|taxidermy|insect_|bakery_case)/.test(kind) || ['display', 'specimen'].includes(form)) {
    buildDisplay(root, kind, b, p, variant);
  } else if (/(medical|xray|xray|operating|dental|anesthesia|electrotherapy|iron_lung|surgical|ectoplasm)/.test(kind) || ['medical', 'clinical', 'paranormal'].includes(form)) {
    buildMedicalMachine(root, kind, b, p, variant);
  } else if (/(orrery|eclipse|lunar_globe|weather_vane|storm_altar|weather_station|barometric|tide_)/.test(kind) || ['celestial', 'forecast', 'meteorological', 'weather'].includes(form)) {
    buildScientificInstrument(root, kind, b, p, variant);
  } else if (/(puppet|automaton|proscenium|carousel_horse|shadow_puppet)/.test(kind) || ['automaton', 'theatrical'].includes(form)) {
    buildStage(root, kind, b, p, variant);
  } else if (/(dollhouse|hotel_cutaway|floorplan|transit_model|spiral_stair|lectern)/.test(kind) || ['architectural', 'recursive'].includes(form)) {
    buildArchitecturalModel(root, kind, b, p, variant);
  } else if (/(divider|canopy)/.test(kind) || form === 'divider') {
    buildScreen(root, kind, b, p, variant);
  } else if (/(counter|fountain|service|dessert|pastry|apothecary_island)/.test(kind) || ['counter', 'service'].includes(form)) {
    buildServiceFixture(root, kind, b, p, variant);
  } else if (/(rack|stand|platform|votive|mannequin)/.test(kind) || ['rack', 'ritual', 'expedition'].includes(form)) {
    buildRackOrStand(root, kind, b, p, variant);
  } else if (/(arcade|fortune|racing_game|kiosk|voting_machine|complaint)/.test(kind) || ['arcade', 'civic'].includes(form)) {
    buildKiosk(root, kind, b, p, variant);
  } else if (/(console|switchboard|telegraph|teletype|terminal|exchange|mail_sorter|signal_frame|pressure_manifold)/.test(kind) || ['console', 'communication', 'message', 'office', 'transit'].includes(form)) {
    buildConsole(root, kind, b, p, variant);
  } else if (/(industrial|governor|filter_bank|assay_tower|fountain_mechanism)/.test(kind) || ['industrial', 'geological'].includes(form)) {
    buildIndustrialMachine(root, kind, b, p, variant);
  } else if (/(harp|resonance|chandelier|light_organ)/.test(kind) || ['acoustic', 'illumination'].includes(form)) {
    buildFrameInstrument(root, kind, b, p, variant);
  } else if (form === 'tripod' || form === 'optical' || form === 'instrument' || form === 'scientific' || form === 'maritime') {
    buildOpticalInstrument(root, kind, b, p, variant);
  } else {
    buildConsole(root, kind, b, p, variant);
  }
}

function buildCoatCheck(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.94, b.h * 0.055, b.d * 0.72], [0, b.h * 0.035, 0], p.woodDark, { name: 'coat-check-wood-base' });
  for (const x of [-0.39, 0.39]) {
    add([b.w * 0.07, b.h * 0.86, b.d * 0.07], [x * b.w, b.h * 0.46, 0], p.metal, { name: 'coat-check-steel-upright', metalness: 0.62 });
  }
  add([b.w * 0.88, b.h * 0.055, b.d * 0.07], [0, b.h * 0.87, 0], p.metal, { name: 'coat-check-hanging-rail', metalness: 0.62 });
  add([b.w * 0.82, b.h * 0.04, b.d * 0.62], [0, b.h * 0.21, 0], p.wood, { name: 'coat-check-parcel-shelf' });

  const coatColors = [p.fabric, p.paint, p.fabricDark];
  for (let index = 0; index < 3; index += 1) {
    const x = (index - 1) * b.w * 0.26;
    const hangerY = b.h * (0.8 - (index % 2) * 0.025);
    addBeamBetween(root, [x, hangerY, 0], [x - b.w * 0.11, hangerY - b.h * 0.09, 0], b.w * 0.018, b.d * 0.025, p.brass, 'coat-check-hanger');
    addBeamBetween(root, [x, hangerY, 0], [x + b.w * 0.11, hangerY - b.h * 0.09, 0], b.w * 0.018, b.d * 0.025, p.brass, 'coat-check-hanger');
    add([b.w * 0.19, b.h * 0.36, b.d * 0.23], [x, b.h * 0.56, 0], coatColors[(index + variant) % coatColors.length]!, { name: 'hanging-fabric-coat-body' });
    for (const side of [-1, 1]) {
      add([b.w * 0.075, b.h * 0.31, b.d * 0.18], [x + side * b.w * 0.12, b.h * 0.56, 0], coatColors[(index + variant) % coatColors.length]!, {
        rotation: [0, 0, side * 0.16],
        name: 'hanging-fabric-coat-sleeve',
      });
    }
    add([b.w * 0.13, b.h * 0.045, b.d * 0.245], [x, b.h * 0.735, 0], p.fabricDark, { name: 'hanging-coat-collar' });
  }
}

function buildWardianCase(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.94, b.h * 0.18, b.d * 0.88], [0, b.h * 0.1, 0], p.wood, { name: 'wardian-wood-cabinet' });
  add([b.w * 0.82, b.h * 0.11, b.d * 0.7], [0, b.h * 0.27, 0], p.soil, { name: 'wardian-soil-bed' });
  for (const x of [-0.42, 0.42]) for (const z of [-0.38, 0.38]) {
    add([b.w * 0.045, b.h * 0.72, b.d * 0.045], [x * b.w, b.h * 0.6, z * b.d], p.brass, { name: 'wardian-brass-frame', metalness: 0.58 });
  }
  add([b.w * 0.92, b.h * 0.045, b.d * 0.8], [0, b.h * 0.96, 0], p.brass, { name: 'wardian-roof-frame', metalness: 0.58 });
  add([b.w * 0.82, b.h * 0.62, b.d * 0.018], [0, b.h * 0.62, b.d * 0.385], p.glass, { opacity: 0.28, name: 'wardian-front-glass' });
  add([b.w * 0.82, b.h * 0.62, b.d * 0.018], [0, b.h * 0.62, -b.d * 0.385], p.glass, { opacity: 0.25, name: 'wardian-rear-glass' });
  for (const x of [-0.415, 0.415]) {
    add([b.w * 0.018, b.h * 0.62, b.d * 0.68], [x * b.w, b.h * 0.62, 0], p.glass, { opacity: 0.24, name: 'wardian-side-glass' });
  }
  const plants = [-0.27, 0, 0.27];
  for (let plant = 0; plant < plants.length; plant += 1) {
    const x = plants[plant]! * b.w;
    const stemHeight = b.h * (0.28 + ((plant + variant) % 3) * 0.055);
    add([b.w * 0.026, stemHeight, b.w * 0.026], [x, b.h * 0.31 + stemHeight / 2, 0], p.foliage, { shape: 'cylinder', name: 'wardian-plant-stem' });
    for (const side of [-1, 1]) for (let leaf = 0; leaf < 2; leaf += 1) {
      add([b.w * 0.13, b.h * 0.2, b.d * 0.055], [x + side * b.w * (0.07 + leaf * 0.03), b.h * (0.48 + leaf * 0.13), side * b.d * 0.04], shifted(p.foliage, plant + leaf), {
        shape: 'cone',
        rotation: [0, side * 0.25, side * (0.72 - leaf * 0.22)],
        name: 'wardian-tapered-leaf',
      });
    }
  }
}

function buildRainOrchestra(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.94, b.h * 0.08, b.d * 0.82], [0, b.h * 0.05, 0], p.paintDark, { name: 'rain-orchestra-catch-tray' });
  add([b.w * 0.82, b.h * 0.035, b.d * 0.68], [0, b.h * 0.11, 0], p.glass, { opacity: 0.58, name: 'rain-orchestra-water' });
  for (const x of [-0.43, 0.43]) {
    add([b.w * 0.055, b.h * 0.82, b.d * 0.055], [x * b.w, b.h * 0.48, 0], p.metal, { name: 'rain-orchestra-steel-frame', metalness: 0.64 });
  }
  add([b.w * 0.92, b.h * 0.06, b.d * 0.08], [0, b.h * 0.9, 0], p.metal, { name: 'rain-orchestra-top-beam', metalness: 0.64 });
  for (let chime = 0; chime < 9; chime += 1) {
    const x = (chime - 4) * b.w * 0.085;
    const length = b.h * (0.29 + ((chime + variant) % 4) * 0.055);
    add([b.w * 0.011, b.h * 0.12, b.w * 0.011], [x, b.h * 0.82, 0], p.light, { shape: 'cylinder', name: 'rain-orchestra-suspension-wire', metalness: 0.5 });
    add([b.w * 0.045, length, b.w * 0.045], [x, b.h * 0.76 - length / 2, 0], chime % 2 ? p.brass : p.metal, { shape: 'cylinder', name: 'rain-orchestra-chime-tube', metalness: 0.7 });
    add([b.w * 0.065, b.h * 0.025, b.d * 0.12], [x, b.h * 0.2 + (chime % 2) * b.h * 0.025, 0], p.wood, { name: 'rain-orchestra-resonator' });
  }
  for (let pipe = -2; pipe <= 2; pipe += 1) {
    add([b.w * 0.025, b.h * 0.24, b.w * 0.025], [pipe * b.w * 0.14, b.h * 0.76, -b.d * 0.26], p.glass, { shape: 'cylinder', opacity: 0.48, name: 'rain-feed-glass-pipe' });
  }
}

function buildMycologyIncubator(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.94, b.h * 0.17, b.d * 0.84], [0, b.h * 0.095, 0], p.paint, { name: 'incubator-painted-base' });
  for (const x of [-0.43, 0.43]) for (const z of [-0.37, 0.37]) {
    add([b.w * 0.045, b.h * 0.74, b.d * 0.045], [x * b.w, b.h * 0.55, z * b.d], p.metal, { name: 'incubator-steel-frame', metalness: 0.6 });
  }
  add([b.w * 0.92, b.h * 0.06, b.d * 0.8], [0, b.h * 0.94, 0], p.metal, { name: 'incubator-vented-roof', metalness: 0.45 });
  for (const y of [0.34, 0.6]) {
    add([b.w * 0.82, b.h * 0.035, b.d * 0.7], [0, b.h * y, 0], p.metal, { name: 'incubator-mesh-shelf', metalness: 0.45 });
  }
  add([b.w * 0.82, b.h * 0.66, b.d * 0.018], [0, b.h * 0.61, b.d * 0.38], p.glass, { opacity: 0.25, name: 'incubator-glass-door' });
  add([b.w * 0.025, b.h * 0.28, b.d * 0.045], [b.w * 0.36, b.h * 0.62, b.d * 0.405], p.brass, { name: 'incubator-door-handle', metalness: 0.6 });

  const caps = ['#c29a72', '#d8c9a0', '#9c7660', '#e0d4bb'];
  for (let mushroom = 0; mushroom < 7; mushroom += 1) {
    const row = mushroom < 4 ? 0 : 1;
    const index = row === 0 ? mushroom : mushroom - 4;
    const count = row === 0 ? 4 : 3;
    const x = (index - (count - 1) / 2) * b.w * 0.19;
    const shelfY = b.h * (row === 0 ? 0.37 : 0.63);
    const stalk = b.h * (0.08 + ((mushroom + variant) % 3) * 0.018);
    add([b.w * 0.035, stalk, b.w * 0.035], [x, shelfY + stalk / 2, (index % 2 ? 1 : -1) * b.d * 0.09], '#d8cfb9', { shape: 'cylinder', name: 'cultured-mushroom-stalk' });
    add([b.w * (0.1 + (mushroom % 2) * 0.02), b.h * 0.055, b.d * 0.12], [x, shelfY + stalk, (index % 2 ? 1 : -1) * b.d * 0.09], caps[(mushroom + variant) % caps.length]!, { shape: 'cone', rotation: [Math.PI, 0, 0], name: 'cultured-mushroom-cap' });
  }
  add([b.w * 0.25, b.h * 0.11, b.d * 0.035], [-b.w * 0.25, b.h * 0.88, b.d * 0.41], p.light, { name: 'incubator-control-panel' });
  for (let gauge = 0; gauge < 2; gauge += 1) {
    add([b.w * 0.055, b.w * 0.055, b.d * 0.025], [-b.w * (0.3 - gauge * 0.1), b.h * 0.88, b.d * 0.44], gauge ? p.glow : p.paintDark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], emissive: gauge ? p.glow : undefined, emissiveIntensity: 0.15, name: 'incubator-gauge' });
  }
}

function buildProjector(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const deckY = b.h * 0.48;
  add([b.w * 0.72, b.h * 0.08, b.d * 0.66], [0, b.h * 0.04, 0], p.paintDark, { name: 'projector-steel-base' });
  for (const x of [-0.25, 0.25]) add([b.w * 0.045, b.h * 0.43, b.w * 0.045], [x * b.w, b.h * 0.25, 0], p.metal, { shape: 'cylinder', metalness: 0.55, name: 'projector-stand-leg' });
  add([b.w * 0.62, b.h * 0.07, b.d * 0.56], [0, deckY, 0], p.metal, { name: 'projector-stand-deck', metalness: 0.42 });
  add([b.w * 0.56, b.h * 0.3, b.d * 0.48], [0, b.h * 0.66, 0], p.paint, { name: kind.includes('magic') ? 'magic-lantern-box-body' : 'film-projector-box-body' });
  add([b.w * 0.18, b.w * 0.18, b.d * 0.34], [0, b.h * 0.67, b.d * 0.38], p.metal, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], metalness: 0.5, name: 'projector-lens-barrel' });
  add([b.w * 0.15, b.w * 0.035, b.w * 0.15], [0, b.h * 0.67, b.d * 0.56], p.glass, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], opacity: 0.62, emissive: p.glow, emissiveIntensity: 0.13, name: 'projector-glass-lens' });
  if (!kind.includes('magic')) {
    for (const side of [-1, 1]) {
      add([b.w * 0.3, b.w * 0.3, b.d * 0.045], [side * b.w * 0.25, b.h * 0.91, -b.d * 0.06], p.metal, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.55, name: 'projector-film-reel' });
      add([b.w * 0.055, b.w * 0.055, b.d * 0.04], [side * b.w * 0.25, b.h * 0.91, -b.d * 0.035], p.paintDark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'projector-reel-hub' });
    }
  } else {
    add([b.w * 0.42, b.h * 0.06, b.d * 0.42], [0, b.h * 0.84, 0], p.metal, { name: 'magic-lantern-vented-roof', metalness: 0.4 });
    add([b.w * 0.16, b.h * 0.22, b.d * 0.04], [-b.w * 0.31, b.h * 0.66, 0], p.glass, { opacity: 0.55, emissive: p.glow, emissiveIntensity: 0.18, name: 'magic-lantern-slide-glass' });
  }
  void variant;
}

function buildPhoropter(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.66, b.h * 0.07, b.d * 0.66], [0, b.h * 0.04, 0], p.paintDark, { name: 'phoropter-steel-base' });
  add([b.w * 0.09, b.h * 0.74, b.w * 0.09], [0, b.h * 0.42, -b.d * 0.18], p.metal, { shape: 'cylinder', metalness: 0.6, name: 'phoropter-support-column' });
  add([b.w * 0.68, b.h * 0.06, b.d * 0.08], [0, b.h * 0.8, 0], p.metal, { name: 'phoropter-cross-arm', metalness: 0.6 });
  for (const side of [-1, 1]) {
    add([b.w * 0.28, b.h * 0.32, b.d * 0.14], [side * b.w * 0.22, b.h * 0.69, b.d * 0.08], p.paint, { name: 'phoropter-lens-housing' });
    for (let lens = 0; lens < 4; lens += 1) {
      const angle = lens / 4 * Math.PI * 2;
      add([b.w * 0.085, b.w * 0.025, b.w * 0.085], [side * b.w * 0.22 + Math.cos(angle) * b.w * 0.075, b.h * 0.69 + Math.sin(angle) * b.h * 0.075, b.d * 0.16], p.glass, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], opacity: 0.62, name: 'phoropter-glass-lens' });
    }
  }
  add([b.w * 0.18, b.h * 0.045, b.d * 0.07], [0, b.h * 0.65, b.d * 0.1], p.metal, { name: 'phoropter-nose-bridge', metalness: 0.5 });
  void variant;
}

function buildFresnelLens(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.76, b.h * 0.09, b.d * 0.76], [0, b.h * 0.055, 0], p.brass, { shape: 'cylinder', metalness: 0.58, name: 'fresnel-rotating-base' });
  add([b.w * 0.5, b.h * 0.62, b.d * 0.5], [0, b.h * 0.48, 0], p.glass, { shape: 'cylinder', opacity: 0.32, emissive: p.glow, emissiveIntensity: 0.1, name: 'fresnel-prismatic-glass' });
  for (let ring = 0; ring < 6; ring += 1) {
    add([b.w * (0.51 + ring % 2 * 0.035), b.w * (0.51 + ring % 2 * 0.035), b.w * 0.025], [0, b.h * (0.25 + ring * 0.105), 0], ring % 2 ? p.brass : p.glass, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], opacity: ring % 2 ? 1 : 0.58, metalness: ring % 2 ? 0.55 : 0, name: ring % 2 ? 'fresnel-brass-band' : 'fresnel-glass-prism-ring' });
  }
  add([b.w * 0.16, b.w * 0.16, b.w * 0.16], [0, b.h * 0.52, 0], p.glow, { shape: 'sphere', emissive: p.glow, emissiveIntensity: 0.3, name: 'fresnel-lamp-core' });
  add([b.w * 0.7, b.h * 0.06, b.d * 0.7], [0, b.h * 0.86, 0], p.brass, { shape: 'cylinder', metalness: 0.58, name: 'fresnel-top-frame' });
  void variant;
}

function buildSeismograph(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const deckY = b.h * 0.52;
  add([b.w * 0.94, b.h * 0.08, b.d * 0.78], [0, deckY, 0], p.wood, { name: 'seismograph-desk-top' });
  for (const x of [-0.4, 0.4]) for (const z of [-0.31, 0.31]) add([b.w * 0.055, deckY, b.d * 0.055], [x * b.w, deckY / 2, z * b.d], p.woodDark, { name: 'seismograph-desk-leg' });
  add([b.w * 0.38, b.d * 0.38, b.d * 0.38], [-b.w * 0.18, b.h * 0.69, 0], p.light, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], name: 'seismograph-paper-drum' });
  for (let line = -2; line <= 2; line += 1) add([b.w * 0.012, b.d * 0.385, b.d * 0.385], [-b.w * 0.18 + line * b.w * 0.065, b.h * 0.69, 0], p.paintDark, { shape: 'torus', rotation: [0, Math.PI / 2, 0], name: 'seismograph-paper-trace' });
  addBeamBetween(root, [b.w * 0.06, b.h * 0.84, 0], [-b.w * 0.06, b.h * 0.68, 0], b.w * 0.025, b.d * 0.035, p.metal, 'seismograph-stylus-arm');
  add([b.w * 0.04, b.h * 0.22, b.w * 0.04], [b.w * 0.08, b.h * 0.82, 0], p.metal, { shape: 'cylinder', name: 'seismograph-stylus-pivot', metalness: 0.55 });
  add([b.w * 0.42, b.h * 0.11, b.d * 0.3], [b.w * 0.26, b.h * 0.62, 0], p.paint, { name: 'seismograph-drive-motor' });
  void variant;
}

function buildSeedCarousel(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.72, b.h * 0.08, b.d * 0.72], [0, b.h * 0.05, 0], p.paintDark, { shape: 'cylinder', name: 'seed-carousel-rotating-base' });
  add([b.w * 0.09, b.h * 0.78, b.w * 0.09], [0, b.h * 0.46, 0], p.metal, { shape: 'cylinder', metalness: 0.5, name: 'seed-carousel-center-column' });
  for (let tier = 0; tier < 3; tier += 1) {
    const y = b.h * (0.3 + tier * 0.25);
    add([b.w * (0.72 - tier * 0.08), b.h * 0.045, b.d * (0.72 - tier * 0.08)], [0, y, 0], p.wood, { shape: 'cylinder', name: 'seed-carousel-circular-shelf' });
    for (let drawer = 0; drawer < 6; drawer += 1) {
      const angle = drawer / 6 * Math.PI * 2 + tier * 0.25;
      const radius = b.w * (0.23 - tier * 0.02);
      add([b.w * 0.16, b.h * 0.12, b.d * 0.12], [Math.cos(angle) * radius, y + b.h * 0.08, Math.sin(angle) * radius], shifted(p.woodDark, drawer + tier + variant), { rotation: [0, -angle, 0], name: 'seed-carousel-labeled-drawer' });
      add([b.w * 0.075, b.h * 0.025, b.d * 0.012], [Math.cos(angle) * radius * 1.22, y + b.h * 0.08, Math.sin(angle) * radius * 1.22], p.light, { rotation: [0, -angle, 0], name: 'paper-seed-label' });
    }
  }
}

function buildDeliSlicer(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.92, b.h * 0.48, b.d * 0.78], [0, b.h * 0.28, 0], p.wood, { name: 'deli-counter-cabinet' });
  add([b.w, b.h * 0.07, b.d * 0.9], [0, b.h * 0.55, 0], p.light, { name: 'deli-countertop' });
  add([b.w * 0.16, b.h * 0.34, b.d * 0.42], [-b.w * 0.18, b.h * 0.73, -b.d * 0.05], p.metal, { name: 'deli-slicer-steel-housing', metalness: 0.48 });
  add([b.w * 0.46, b.w * 0.045, b.w * 0.46], [0, b.h * 0.76, b.d * 0.12], p.metal, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], metalness: 0.7, name: 'deli-slicer-circular-blade' });
  add([b.w * 0.48, b.h * 0.06, b.d * 0.38], [b.w * 0.23, b.h * 0.61, 0], p.metal, { rotation: [0, 0, -0.08], name: 'deli-slicer-sliding-carriage', metalness: 0.44 });
  add([b.w * 0.07, b.h * 0.31, b.w * 0.07], [b.w * 0.34, b.h * 0.75, 0], p.paintDark, { rotation: [0, 0, -0.3], name: 'deli-slicer-grip' });
  void variant;
}

function buildProcessionalCanopy(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (const x of [-0.4, 0.4]) for (const z of [-0.36, 0.36]) add([b.w * 0.045, b.h * 0.88, b.d * 0.045], [x * b.w, b.h * 0.46, z * b.d], p.brass, { name: 'canopy-brass-carrying-pole', metalness: 0.56 });
  add([b.w * 0.94, b.h * 0.11, b.d * 0.84], [0, b.h * 0.91, 0], shifted(p.fabric, variant), { name: 'processional-canopy-fabric-roof' });
  for (const side of [-1, 1]) {
    add([b.w * 0.78, b.h * 0.24, b.d * 0.025], [0, b.h * 0.77, side * b.d * 0.38], p.fabricDark, { name: 'processional-canopy-fabric-valance' });
    add([b.w * 0.025, b.h * 0.56, b.d * 0.5], [side * b.w * 0.4, b.h * 0.61, 0], p.fabric, { opacity: 0.7, name: 'processional-canopy-side-drape' });
  }
  for (let fringe = -4; fringe <= 4; fringe += 1) add([b.w * 0.014, b.h * 0.12, b.w * 0.014], [fringe * b.w * 0.09, b.h * 0.67, b.d * 0.39], p.brass, { shape: 'cylinder', name: 'canopy-fabric-fringe' });
}

function buildTopiary(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.6, b.h * 0.18, b.d * 0.6], [0, b.h * 0.1, 0], p.wood, { name: 'topiary-planter' });
  add([b.w * 0.48, b.h * 0.08, b.d * 0.48], [0, b.h * 0.21, 0], p.soil, { name: 'topiary-soil' });
  add([b.w * 0.055, b.h * 0.68, b.w * 0.055], [0, b.h * 0.54, 0], p.woodDark, { shape: 'cylinder', name: 'topiary-trunk' });
  for (let ring = 0; ring < 5; ring += 1) {
    const radius = b.w * (0.32 - ring * 0.045);
    const y = b.h * (0.4 + ring * 0.12);
    add([radius * 2, radius * 2, b.w * 0.018], [0, y, 0], p.metal, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.42, name: 'topiary-wire-ring' });
    for (const side of [-1, 1]) add([b.w * 0.12, b.h * 0.18, b.d * 0.08], [side * radius * 0.58, y, 0], shifted(p.foliage, ring + side + variant), { shape: 'cone', rotation: [0, 0, side * 0.5], name: 'topiary-clipped-foliage' });
  }
  for (const side of [-1, 1]) addBeamBetween(root, [0, b.h * 0.25, 0], [side * b.w * 0.28, b.h * 0.82, 0], b.w * 0.018, b.d * 0.018, p.metal, 'topiary-wire-upright');
}

function buildVotiveRack(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.88, b.h * 0.07, b.d * 0.7], [0, b.h * 0.04, 0], p.woodDark, { name: 'votive-rack-base' });
  for (const x of [-0.4, 0.4]) add([b.w * 0.05, b.h * 0.84, b.d * 0.05], [x * b.w, b.h * 0.47, 0], p.metal, { name: 'votive-rack-steel-upright', metalness: 0.46 });
  for (let row = 0; row < 3; row += 1) {
    const y = b.h * (0.25 + row * 0.25);
    add([b.w * 0.82, b.h * 0.035, b.d * 0.54], [0, y, 0], p.metal, { name: 'votive-candle-shelf', metalness: 0.42 });
    for (let candle = -3; candle <= 3; candle += 1) {
      const height = b.h * (0.08 + ((candle + row + variant) % 3) * 0.015);
      add([b.w * 0.045, height, b.w * 0.045], [candle * b.w * 0.1, y + height / 2, 0], '#ddd2b3', { shape: 'cylinder', name: 'votive-wax-candle' });
      add([b.w * 0.026, b.h * 0.055, b.w * 0.026], [candle * b.w * 0.1, y + height + b.h * 0.025, 0], p.glow, { shape: 'cone', emissive: p.glow, emissiveIntensity: 0.28, name: 'votive-candle-flame' });
    }
  }
}

function buildSurgicalCarousel(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.62, b.h * 0.07, b.d * 0.62], [0, b.h * 0.04, 0], p.paintDark, { shape: 'cylinder', name: 'surgical-carousel-base' });
  add([b.w * 0.1, b.h * 0.78, b.w * 0.1], [0, b.h * 0.44, 0], p.metal, { shape: 'cylinder', metalness: 0.6, name: 'surgical-carousel-column' });
  add([b.w * 0.55, b.h * 0.06, b.d * 0.55], [0, b.h * 0.84, 0], p.metal, { shape: 'cylinder', metalness: 0.52, name: 'surgical-carousel-hub' });
  for (let arm = 0; arm < 8; arm += 1) {
    const angle = arm / 8 * Math.PI * 2;
    add([b.w * 0.34, b.h * 0.035, b.d * 0.035], [Math.cos(angle) * b.w * 0.18, b.h * 0.84, Math.sin(angle) * b.d * 0.18], p.metal, { rotation: [0, -angle, 0], metalness: 0.6, name: 'surgical-carousel-arm' });
    add([b.w * 0.025, b.h * (0.22 + arm % 3 * 0.04), b.w * 0.025], [Math.cos(angle) * b.w * 0.36, b.h * 0.7, Math.sin(angle) * b.d * 0.36], arm % 2 ? p.brass : p.metal, { shape: 'cylinder', metalness: 0.65, name: 'surgical-hanging-instrument' });
  }
  void variant;
}

function buildChandelier(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.42, b.h * 0.07, b.d * 0.42], [0, b.h * 0.94, 0], p.brass, { shape: 'cylinder', metalness: 0.62, name: 'chandelier-ceiling-canopy' });
  add([b.w * 0.05, b.h * 0.48, b.w * 0.05], [0, b.h * 0.7, 0], p.brass, { shape: 'cylinder', metalness: 0.62, name: 'chandelier-center-drop' });
  add([b.w * 0.24, b.w * 0.24, b.w * 0.24], [0, b.h * 0.48, 0], p.brass, { shape: 'sphere', metalness: 0.55, name: 'chandelier-center-hub' });
  for (let arm = 0; arm < 8; arm += 1) {
    const angle = arm / 8 * Math.PI * 2;
    const radius = b.w * 0.28;
    add([b.w * 0.34, b.h * 0.035, b.d * 0.035], [Math.cos(angle) * b.w * 0.17, b.h * 0.48, Math.sin(angle) * b.d * 0.17], p.brass, { rotation: [0, -angle, 0], metalness: 0.58, name: 'chandelier-radial-arm' });
    add([b.w * 0.035, b.h * 0.22, b.w * 0.035], [Math.cos(angle) * radius, b.h * 0.38, Math.sin(angle) * b.d * 0.28], p.brass, { shape: 'cylinder', metalness: 0.58, name: 'chandelier-lamp-stem' });
    add([b.w * 0.12, b.h * 0.14, b.d * 0.12], [Math.cos(angle) * radius, b.h * 0.25, Math.sin(angle) * b.d * 0.28], shifted(p.glow, arm + variant), { shape: 'cone', emissive: p.glow, emissiveIntensity: 0.2, name: 'chandelier-glass-lamp' });
  }
}

function buildTeaRobot(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.56, b.h * 0.08, b.d * 0.56], [0, b.h * 0.05, 0], p.paintDark, { name: 'tea-robot-wheeled-base' });
  for (const side of [-1, 1]) add([b.w * 0.14, b.w * 0.14, b.d * 0.08], [side * b.w * 0.2, b.h * 0.07, b.d * 0.2], p.paintDark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'tea-robot-wheel' });
  add([b.w * 0.46, b.h * 0.42, b.d * 0.42], [0, b.h * 0.38, 0], p.metal, { name: 'tea-robot-torso', metalness: 0.42 });
  add([b.w * 0.32, b.h * 0.24, b.d * 0.3], [0, b.h * 0.72, 0], p.paint, { name: 'tea-robot-head' });
  for (const side of [-1, 1]) {
    add([b.w * 0.06, b.h * 0.34, b.w * 0.06], [side * b.w * 0.3, b.h * 0.48, 0], p.brass, { shape: 'cylinder', rotation: [0, 0, side * 0.35], metalness: 0.58, name: 'tea-robot-articulated-arm' });
    add([b.w * 0.08, b.h * 0.08, b.d * 0.1], [side * b.w * 0.36, b.h * 0.3, 0], p.metal, { name: 'tea-robot-gripper' });
  }
  add([b.w * 0.7, b.h * 0.045, b.d * 0.42], [0, b.h * 0.31, b.d * 0.28], p.brass, { name: 'tea-robot-serving-tray', metalness: 0.5 });
  add([b.w * 0.15, b.h * 0.14, b.d * 0.15], [0, b.h * 0.4, b.d * 0.28], p.light, { shape: 'cylinder', name: 'tea-robot-ceramic-pot' });
  for (const side of [-1, 1]) add([b.w * 0.055, b.w * 0.025, b.w * 0.055], [side * b.w * 0.11, b.h * 0.78, b.d * 0.17], p.glow, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], emissive: p.glow, emissiveIntensity: 0.2, name: 'tea-robot-eye-lens' });
  void variant;
}

function buildNavigationThrone(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  buildSeat(root, kind, b, p, variant);
  const add = partAdder(root);
  add([b.w * 0.78, b.h * 0.055, b.d * 0.34], [0, b.h * 0.61, b.d * 0.34], p.metal, { rotation: [-0.18, 0, 0], name: 'navigation-throne-instrument-console', metalness: 0.38 });
  for (let gauge = -2; gauge <= 2; gauge += 1) add([b.w * 0.08, b.w * 0.025, b.w * 0.08], [gauge * b.w * 0.13, b.h * 0.65, b.d * 0.47], p.glass, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], opacity: 0.7, name: 'navigation-throne-gauge' });
  add([b.w * 0.52, b.w * 0.52, b.d * 0.05], [0, b.h * 0.78, -b.d * 0.35], p.brass, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.55, name: 'navigation-throne-compass-ring' });
}

function buildSledge(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (const side of [-1, 1]) {
    add([b.w * 0.08, b.h * 0.06, b.d * 0.92], [side * b.w * 0.31, b.h * 0.08, 0], p.metal, { rotation: [0.04, 0, 0], metalness: 0.55, name: 'expedition-sledge-runner' });
    add([b.w * 0.05, b.h * 0.6, b.d * 0.05], [side * b.w * 0.31, b.h * 0.38, -b.d * 0.4], p.metal, { rotation: [-0.22, 0, 0], metalness: 0.52, name: 'expedition-sledge-handle' });
  }
  for (let slat = -3; slat <= 3; slat += 1) add([b.w * 0.74, b.h * 0.045, b.d * 0.09], [0, b.h * 0.18, slat * b.d * 0.12], p.wood, { name: 'expedition-sledge-wood-slat' });
  add([b.w * 0.56, b.h * 0.26, b.d * 0.46], [0, b.h * 0.34, b.d * 0.05], p.fabric, { name: 'expedition-sledge-canvas-load' });
  for (const direction of [-1, 1]) add([b.w * 0.035, b.h * 0.29, b.d * 0.5], [direction * b.w * 0.24, b.h * 0.34, b.d * 0.05], p.woodDark, { rotation: [0, 0, direction * 0.08], name: 'expedition-sledge-load-rail' });
  void variant;
}

function buildSeat(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const wide = /(settee|chaise|compartment)/.test(kind);
  const seatW = b.w * (wide ? 0.88 : 0.68);
  const seatY = b.h * 0.34;
  add([seatW, b.h * 0.14, b.d * 0.68], [0, seatY, 0], p.fabric, { name: 'upholstered-seat-cushion' });
  add([seatW, b.h * (wide ? 0.42 : 0.48), b.d * 0.13], [0, b.h * 0.63, -b.d * 0.29], p.fabricDark, { rotation: [-0.1, 0, 0], name: 'upholstered-seat-back' });
  for (const side of [-1, 1]) {
    add([b.w * 0.09, b.h * 0.2, b.d * 0.65], [side * seatW * 0.52, b.h * 0.43, 0], p.fabricDark, { name: 'upholstered-seat-arm' });
    for (const z of [-1, 1]) add([b.w * 0.065, b.h * 0.3, b.d * 0.065], [side * seatW * 0.43, b.h * 0.15, z * b.d * 0.25], p.woodDark, { name: 'chair-wood-leg' });
  }
  if (/(hydraulic|gyroscopic|automated|dream_recording)/.test(kind)) {
    add([b.w * 0.1, b.h * 0.26, b.w * 0.1], [0, b.h * 0.15, 0], p.metal, { shape: 'cylinder', metalness: 0.62, name: 'chair-hydraulic-column' });
    add([b.w * 0.55, b.h * 0.055, b.w * 0.55], [0, b.h * 0.035, 0], p.metal, { shape: 'cylinder', metalness: 0.54, name: 'chair-steel-base' });
  }
  if (variant % 2 === 1) {
    for (let button = 0; button < (wide ? 6 : 4); button += 1) {
      add([b.w * 0.025, b.w * 0.025, b.d * 0.018], [((button % (wide ? 3 : 2)) - (wide ? 1 : 0.5)) * seatW * 0.26, b.h * (0.57 + Math.floor(button / (wide ? 3 : 2)) * 0.15), -b.d * 0.225], p.fabricDark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'upholstery-button' });
    }
  }
}

function buildBed(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.91, b.h * 0.09, b.d * 0.9], [0, b.h * 0.18, 0], p.woodDark, { name: 'bed-wood-frame' });
  add([b.w * 0.86, b.h * 0.16, b.d * 0.86], [0, b.h * 0.29, 0], p.light, { name: 'bed-mattress' });
  add([b.w * 0.86, b.h * 0.035, b.d * 0.62], [0, b.h * 0.39, b.d * 0.1], p.fabric, { name: 'bed-fabric-blanket' });
  add([b.w * 0.74, b.h * 0.16, b.d * 0.2], [0, b.h * 0.43, -b.d * 0.28], p.light, { name: 'bed-pillow' });
  add([b.w * 0.9, b.h * 0.5, b.d * 0.08], [0, b.h * 0.5, -b.d * 0.42], p.wood, { name: 'bed-headboard' });
  if (kind.includes('canopy')) {
    for (const x of [-0.43, 0.43]) for (const z of [-0.42, 0.42]) add([b.w * 0.045, b.h * 0.94, b.d * 0.045], [x * b.w, b.h * 0.5, z * b.d], p.woodDark, { name: 'canopy-bed-post' });
    add([b.w * 0.9, b.h * 0.035, b.d * 0.88], [0, b.h * 0.96, 0], p.woodDark, { name: 'canopy-bed-roof-frame' });
    for (const side of [-1, 1]) add([b.w * 0.34, b.h * 0.7, b.d * 0.025], [side * b.w * 0.28, b.h * 0.64, -b.d * 0.405], shifted(p.fabric, variant + side), { opacity: 0.84, name: 'canopy-bed-curtain' });
  }
}

function buildCasework(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const low = /(map_|sideboard|bureau)/.test(kind);
  const height = b.h * (low ? 0.68 : 0.86);
  const y = b.h * 0.07 + height / 2;
  add([b.w * 0.9, height, b.d * 0.82], [0, y, 0], p.wood, { name: 'casework-wood-carcass' });
  add([b.w * 0.96, b.h * 0.055, b.d * 0.9], [0, y + height / 2, 0], p.woodDark, { name: 'casework-wood-cornice' });
  const rows = /(apothecary|specimen|key_cabinet|drawer|pigeonhole|filing)/.test(kind) ? 4 : 3;
  const columns = /(map_|sideboard)/.test(kind) ? 3 : 2;
  const front = b.d * 0.43;
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const cellW = b.w * 0.74 / columns;
    const cellH = height * 0.72 / rows;
    const x = (column - (columns - 1) / 2) * cellW;
    const cellY = b.h * 0.12 + (row + 0.5) * cellH;
    add([cellW * 0.9, cellH * 0.82, b.d * 0.035], [x, cellY, front], (row + column + variant) % 2 ? p.wood : p.woodDark, { name: /pigeonhole|key_cabinet/.test(kind) ? 'casework-open-cubby' : 'casework-wood-drawer' });
    add([b.w * 0.06, b.h * 0.018, b.d * 0.025], [x, cellY, front + b.d * 0.03], p.brass, { name: 'casework-brass-handle', metalness: 0.62 });
  }
  if (/(hutch|wardrobe|armoire|reliquary|shrine)/.test(kind)) {
    add([b.w * 0.68, height * 0.45, b.d * 0.02], [0, y + height * 0.15, front + b.d * 0.015], p.glass, { opacity: 0.28, name: 'casework-glass-door' });
    for (const side of [-1, 1]) add([b.w * 0.025, height * 0.45, b.d * 0.03], [side * b.w * 0.18, y + height * 0.15, front + b.d * 0.035], p.brass, { name: 'casework-door-frame', metalness: 0.54 });
  }
}

function buildWorkSurface(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const topY = b.h * 0.57;
  add([b.w * 0.95, b.h * 0.08, b.d * 0.82], [0, topY, 0], p.wood, { rotation: kind.includes('drafting') ? [-0.16, 0, 0] : undefined, name: 'work-table-wood-top' });
  for (const x of [-0.4, 0.4]) for (const z of [-0.32, 0.32]) add([b.w * 0.065, topY, b.d * 0.065], [x * b.w, topY / 2, z * b.d], p.woodDark, { name: 'work-table-leg' });
  add([b.w * 0.3, b.h * 0.28, b.d * 0.65], [-b.w * 0.27, topY - b.h * 0.18, 0], p.woodDark, { name: 'work-table-drawer-bank' });
  for (let drawer = 0; drawer < 2; drawer += 1) add([b.w * 0.24, b.h * 0.09, b.d * 0.025], [-b.w * 0.27, topY - b.h * (0.11 + drawer * 0.12), b.d * 0.34], p.wood, { name: 'work-table-drawer' });

  if (kind.includes('typewriter') || kind.includes('teletype')) {
    add([b.w * 0.38, b.h * 0.17, b.d * 0.3], [b.w * 0.13, topY + b.h * 0.11, 0], p.paintDark, { name: 'typewriter-machine-body' });
    for (let key = 0; key < 12; key += 1) add([b.w * 0.035, b.h * 0.018, b.d * 0.035], [b.w * (0.13 + ((key % 6) - 2.5) * 0.043), topY + b.h * (0.19 + Math.floor(key / 6) * 0.025), b.d * 0.12], p.light, { name: 'typewriter-key' });
    add([b.w * 0.45, b.h * 0.035, b.d * 0.035], [b.w * 0.13, topY + b.h * 0.24, -b.d * 0.05], p.metal, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], metalness: 0.55, name: 'typewriter-carriage-rail' });
  } else if (kind.includes('billiards')) {
    add([b.w * 0.82, b.h * 0.035, b.d * 0.68], [0, topY + b.h * 0.06, 0], '#476d50', { name: 'billiards-fabric-bed' });
    for (const x of [-0.35, 0, 0.35]) for (const z of [-0.27, 0.27]) add([b.w * 0.055, b.h * 0.025, b.d * 0.055], [x * b.w, topY + b.h * 0.085, z * b.d], p.paint, { shape: 'sphere', name: 'billiards-ball' });
  } else if (kind.includes('map') || kind.includes('chart')) {
    add([b.w * 0.7, b.h * 0.012, b.d * 0.58], [0, topY + b.h * 0.055, 0], p.light, { name: 'paper-map-sheet' });
    for (let line = -2; line <= 2; line += 1) add([b.w * 0.015, b.h * 0.009, b.d * 0.48], [line * b.w * 0.12, topY + b.h * 0.064, 0], shifted(p.paint, line + variant), { name: 'paper-map-route' });
  } else {
    add([b.w * 0.42, b.h * 0.025, b.d * 0.36], [b.w * 0.15, topY + b.h * 0.055, 0], p.light, { name: 'paper-work-sheet' });
    add([b.w * 0.025, b.h * 0.24, b.w * 0.025], [b.w * 0.32, topY + b.h * 0.12, 0], p.metal, { shape: 'cylinder', rotation: [0, 0, -0.45], name: 'workbench-metal-tool' });
  }
}

function buildTravelStorage(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const stacked = kind.includes('luggage_trunks') || kind.includes('steamer_trunk');
  const count = stacked ? 3 : 2;
  for (let item = 0; item < count; item += 1) {
    const width = b.w * (0.84 - item * 0.1);
    const height = b.h * (stacked ? 0.26 : 0.34);
    const y = b.h * 0.04 + height / 2 + item * height * 0.88;
    const x = stacked ? (item % 2 ? b.w * 0.08 : -b.w * 0.04) : (item - 0.5) * b.w * 0.38;
    add([width, height, b.d * 0.76], [x, y, 0], shifted(p.wood, variant + item), { name: 'travel-trunk-wood-body' });
    for (const side of [-1, 1]) add([b.w * 0.045, height * 0.96, b.d * 0.78], [x + side * width * 0.32, y, 0], p.brass, { name: 'travel-trunk-metal-strap', metalness: 0.58 });
    add([b.w * 0.13, b.h * 0.025, b.d * 0.035], [x, y, b.d * 0.4], p.brass, { name: 'travel-trunk-latch', metalness: 0.62 });
  }
  if (kind.includes('rack')) {
    for (const x of [-0.44, 0.44]) add([b.w * 0.055, b.h * 0.72, b.d * 0.055], [x * b.w, b.h * 0.38, 0], p.metal, { name: 'luggage-rack-steel-post', metalness: 0.56 });
    add([b.w * 0.92, b.h * 0.055, b.d * 0.72], [0, b.h * 0.74, 0], p.metal, { name: 'luggage-rack-top-rail', metalness: 0.56 });
  }
}

function buildCart(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const deckY = b.h * 0.36;
  add([b.w * 0.9, b.h * 0.07, b.d * 0.78], [0, deckY, 0], p.metal, { name: 'service-cart-steel-deck', metalness: 0.5 });
  add([b.w * 0.86, b.h * 0.045, b.d * 0.72], [0, b.h * 0.68, 0], p.metal, { name: 'service-cart-upper-shelf', metalness: 0.5 });
  for (const x of [-0.4, 0.4]) for (const z of [-0.32, 0.32]) {
    add([b.w * 0.04, b.h * 0.55, b.d * 0.04], [x * b.w, b.h * 0.43, z * b.d], p.metal, { name: 'service-cart-frame', metalness: 0.58 });
    add([b.w * 0.11, b.w * 0.11, b.d * 0.055], [x * b.w, b.h * 0.08, z * b.d], p.paintDark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'service-cart-wheel' });
  }
  if (/(pastry|tea|anesthesia|oscilloscope)/.test(kind)) {
    for (let item = -1; item <= 1; item += 1) add([b.w * 0.16, b.h * 0.1, b.d * 0.2], [item * b.w * 0.24, b.h * 0.75, 0], item === 0 ? p.glass : p.light, { shape: item === 0 ? 'cylinder' : 'box', opacity: item === 0 ? 0.62 : 1, name: item === 0 ? 'service-cart-glass-vessel' : 'service-cart-supply-box' });
  }
  if (variant % 2) add([b.w * 0.58, b.h * 0.055, b.d * 0.055], [0, b.h * 0.84, -b.d * 0.32], p.brass, { name: 'service-cart-handle', metalness: 0.55 });
}

function buildConsole(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.92, b.h * 0.48, b.d * 0.72], [0, b.h * 0.28, 0], p.paint, { name: 'control-console-painted-cabinet' });
  add([b.w * 0.86, b.h * 0.3, b.d * 0.11], [0, b.h * 0.64, -b.d * 0.27], p.paintDark, { rotation: [-0.18, 0, 0], name: 'control-console-sloped-panel' });
  const controls = /(switchboard|exchange|signal_frame|mail_sorter)/.test(kind) ? 18 : 12;
  const columns = controls === 18 ? 6 : 4;
  for (let control = 0; control < controls; control += 1) {
    const x = ((control % columns) - (columns - 1) / 2) * b.w * (columns === 6 ? 0.11 : 0.16);
    const y = b.h * (0.58 + Math.floor(control / columns) * 0.1);
    add([b.w * 0.045, b.w * 0.045, b.d * 0.025], [x, y, b.d * 0.37], control % 4 === variant % 4 ? p.glow : p.light, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], emissive: control % 5 === variant % 5 ? p.glow : undefined, emissiveIntensity: 0.18, name: /switchboard|exchange/.test(kind) ? 'switchboard-jack' : 'control-console-button' });
  }
  if (/(telegraph|teletype)/.test(kind)) {
    add([b.w * 0.52, b.h * 0.03, b.d * 0.32], [0, b.h * 0.52, b.d * 0.19], p.light, { name: 'telegraph-paper-roll' });
    add([b.w * 0.05, b.h * 0.24, b.w * 0.05], [b.w * 0.22, b.h * 0.62, b.d * 0.3], p.metal, { shape: 'cylinder', rotation: [0, 0, -0.5], name: 'telegraph-key-lever' });
  }
  if (/(pneumatic|mail_sorter)/.test(kind)) {
    for (let tube = -2; tube <= 2; tube += 1) add([b.w * 0.07, b.h * 0.36, b.w * 0.07], [tube * b.w * 0.16, b.h * 0.8, -b.d * 0.18], p.glass, { shape: 'cylinder', opacity: 0.42, name: 'pneumatic-glass-tube' });
  }
}

function buildKiosk(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.86, b.h * 0.9, b.d * 0.76], [0, b.h * 0.48, 0], p.paint, { name: 'kiosk-painted-cabinet' });
  add([b.w * 0.66, b.h * 0.3, b.d * 0.025], [0, b.h * 0.7, b.d * 0.395], p.glass, { opacity: 0.82, emissive: p.glow, emissiveIntensity: 0.1, name: 'kiosk-display-glass' });
  add([b.w * 0.72, b.h * 0.06, b.d * 0.24], [0, b.h * 0.47, b.d * 0.33], p.metal, { rotation: [-0.16, 0, 0], name: 'kiosk-control-deck' });
  for (let control = 0; control < 6; control += 1) add([b.w * 0.05, b.w * 0.05, b.d * 0.03], [((control % 3) - 1) * b.w * 0.16, b.h * (0.49 + Math.floor(control / 3) * 0.075), b.d * 0.46], control % 2 ? p.glow : p.light, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], emissive: control % 3 === variant % 3 ? p.glow : undefined, emissiveIntensity: 0.16, name: 'kiosk-control-button' });
  add([b.w * 0.52, b.h * 0.1, b.d * 0.035], [0, b.h * 0.93, b.d * 0.39], p.light, { name: kind.includes('fortune') ? 'fortune-teller-marquee' : 'kiosk-information-marquee' });
}

function buildKeyboardInstrument(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.9, b.h * 0.74, b.d * 0.68], [0, b.h * 0.43, -b.d * 0.08], p.wood, { name: 'organ-wood-case' });
  add([b.w * 0.78, b.h * 0.07, b.d * 0.48], [0, b.h * 0.48, b.d * 0.23], p.woodDark, { name: 'organ-keyboard-bed' });
  for (let key = 0; key < 15; key += 1) {
    const black = key % 7 === 1 || key % 7 === 4 || key % 7 === 6;
    add([b.w * 0.045, b.h * (black ? 0.035 : 0.025), b.d * (black ? 0.19 : 0.27)], [((key - 7) * b.w * 0.048), b.h * (black ? 0.535 : 0.515), b.d * (black ? 0.2 : 0.27)], black ? p.paintDark : p.light, { name: black ? 'organ-black-key' : 'organ-ivory-key' });
  }
  for (let pipe = -5; pipe <= 5; pipe += 1) {
    const height = b.h * (0.24 + (5 - Math.abs(pipe)) * 0.065);
    add([b.w * 0.052, height, b.w * 0.052], [pipe * b.w * 0.07, b.h * 0.62 + height / 2, -b.d * 0.1], pipe % 2 ? p.brass : p.metal, { shape: 'cylinder', metalness: 0.68, name: 'organ-metal-pipe' });
  }
  for (let pedal = -4; pedal <= 4; pedal += 1) add([b.w * 0.055, b.h * 0.025, b.d * 0.28], [pedal * b.w * 0.075, b.h * 0.12, b.d * 0.18], pedal % 2 ? p.woodDark : p.light, { name: 'organ-foot-pedal' });
  void variant;
}

function buildClock(root: THREE.Group, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.82, b.h * 0.9, b.d * 0.72], [0, b.h * 0.48, 0], p.wood, { name: 'clock-wood-case' });
  add([b.w * 0.62, b.w * 0.62, b.d * 0.035], [0, b.h * 0.73, b.d * 0.38], p.light, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'clock-face' });
  for (let hour = 0; hour < 12; hour += 1) {
    const angle = hour / 12 * Math.PI * 2;
    add([b.w * 0.025, b.h * 0.055, b.d * 0.02], [Math.sin(angle) * b.w * 0.24, b.h * 0.73 + Math.cos(angle) * b.w * 0.24, b.d * 0.415], p.paintDark, { rotation: [0, 0, -angle], name: 'clock-hour-marker' });
  }
  addBeamBetween(root, [0, b.h * 0.73, b.d * 0.43], [b.w * 0.18, b.h * 0.78, b.d * 0.43], b.w * 0.025, b.d * 0.025, p.paintDark, 'clock-minute-hand');
  addBeamBetween(root, [0, b.h * 0.73, b.d * 0.44], [-b.w * 0.06, b.h * 0.88, b.d * 0.44], b.w * 0.032, b.d * 0.025, p.paintDark, 'clock-hour-hand');
  add([b.w * 0.08, b.h * 0.38, b.w * 0.08], [0, b.h * 0.34, b.d * 0.32], p.brass, { shape: 'cylinder', metalness: 0.58, name: 'clock-pendulum-rod' });
  add([b.w * 0.22, b.w * 0.22, b.d * 0.04], [0, b.h * 0.17, b.d * 0.34], p.brass, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], metalness: 0.58, name: 'clock-pendulum-bob' });
  void variant;
}

function buildAudio(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.86, b.h * 0.58, b.d * 0.74], [0, b.h * 0.32, 0], p.wood, { name: 'audio-wood-cabinet' });
  if (/(gramophone|phonograph)/.test(kind)) {
    add([b.w * 0.52, b.h * 0.035, b.d * 0.48], [0, b.h * 0.64, 0], p.paintDark, { shape: 'cylinder', name: 'phonograph-record-platter' });
    add([b.w * 0.08, b.h * 0.36, b.w * 0.08], [b.w * 0.15, b.h * 0.79, 0], p.brass, { shape: 'cylinder', rotation: [0, 0, -0.32], metalness: 0.62, name: 'gramophone-horn-neck' });
    add([b.w * 0.72, b.h * 0.72, b.d * 0.62], [b.w * 0.02, b.h * 0.9, b.d * 0.1], p.brass, { shape: 'cone', rotation: [Math.PI / 2, 0, 0], metalness: 0.55, name: 'gramophone-flared-horn' });
  } else {
    for (let reel = -1; reel <= 1; reel += 2) add([b.w * 0.28, b.w * 0.28, b.d * 0.04], [reel * b.w * 0.2, b.h * 0.68, b.d * 0.39], p.metal, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.56, name: 'audio-tape-reel' });
    add([b.w * 0.68, b.h * 0.22, b.d * 0.035], [0, b.h * 0.38, b.d * 0.39], p.fabricDark, { name: 'radio-speaker-fabric' });
    for (let dial = -2; dial <= 2; dial += 1) add([b.w * 0.055, b.w * 0.055, b.d * 0.025], [dial * b.w * 0.13, b.h * 0.24, b.d * 0.42], dial === variant % 5 - 2 ? p.glow : p.brass, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'audio-control-dial' });
  }
}

function buildOpticalInstrument(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const centerY = b.h * 0.62;
  add([b.w * 0.66, b.h * 0.065, b.d * 0.66], [0, b.h * 0.04, 0], p.paintDark, { name: 'optical-tripod-base' });
  for (const side of [-1, 0, 1]) add([b.w * 0.045, b.h * 0.58, b.w * 0.045], [side * b.w * 0.23, b.h * 0.31, (side === 0 ? -1 : 1) * b.d * 0.18], p.metal, { shape: 'cylinder', rotation: [side === 0 ? 0.13 : -0.08, 0, side * 0.24], metalness: 0.58, name: 'optical-tripod-leg' });
  add([b.w * 0.14, b.h * 0.28, b.w * 0.14], [0, centerY, 0], p.metal, { shape: 'cylinder', metalness: 0.58, name: 'optical-pedestal' });
  const horizontal = /(telescope|spotlight|projector|lantern|stereoscope)/.test(kind);
  add([b.w * 0.25, horizontal ? b.d * 0.72 : b.w * 0.72, b.w * 0.25], [0, b.h * 0.76, 0], p.paint, { shape: 'cylinder', rotation: horizontal ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2], name: 'optical-instrument-barrel' });
  add([b.w * 0.23, b.d * 0.04, b.w * 0.23], [0, b.h * 0.76, b.d * 0.38], p.glass, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], opacity: 0.55, emissive: p.glow, emissiveIntensity: 0.12, name: 'optical-glass-lens' });
  add([b.w * 0.15, b.d * 0.035, b.w * 0.15], [0, b.h * 0.76, -b.d * 0.38], p.paintDark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'optical-eyepiece' });
  if (kind.includes('film_projector') || kind.includes('magic_lantern')) for (const side of [-1, 1]) add([b.w * 0.36, b.w * 0.36, b.d * 0.055], [side * b.w * 0.27, b.h * 0.95, -b.d * 0.08], p.metal, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'projector-film-reel' });
  void variant;
}

function buildTextileMachine(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  for (const x of [-0.43, 0.43]) add([b.w * 0.065, b.h * 0.86, b.d * 0.065], [x * b.w, b.h * 0.46, 0], p.woodDark, { name: 'loom-wood-upright' });
  for (const y of [0.16, 0.88]) add([b.w * 0.9, b.h * 0.055, b.d * 0.08], [0, b.h * y, 0], p.woodDark, { name: 'loom-wood-crossbeam' });
  for (const y of [0.34, 0.72]) add([b.w * 0.78, b.w * 0.1, b.w * 0.1], [0, b.h * y, 0], p.metal, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], metalness: 0.46, name: 'loom-fabric-roller' });
  for (let thread = -7; thread <= 7; thread += 1) add([b.w * 0.012, b.h * 0.42, b.d * 0.012], [thread * b.w * 0.048, b.h * 0.54, 0], thread % 3 === 0 ? p.fabric : p.light, { name: 'loom-warp-thread' });
  add([b.w * 0.66, b.h * 0.27, b.d * 0.035], [0, b.h * 0.49, b.d * 0.035], shifted(p.fabric, variant), { name: 'loom-woven-fabric' });
  if (kind.includes('sewing')) {
    add([b.w * 0.32, b.h * 0.24, b.d * 0.26], [0, b.h * 0.78, b.d * 0.15], p.paint, { name: 'sewing-machine-body' });
    add([b.w * 0.025, b.h * 0.18, b.w * 0.025], [b.w * 0.1, b.h * 0.67, b.d * 0.17], p.metal, { shape: 'cylinder', name: 'sewing-machine-needle' });
  }
}

function buildPress(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.9, b.h * 0.09, b.d * 0.82], [0, b.h * 0.06, 0], p.paintDark, { name: 'press-cast-base' });
  for (const x of [-0.4, 0.4]) add([b.w * 0.08, b.h * 0.76, b.d * 0.08], [x * b.w, b.h * 0.45, 0], p.paint, { name: 'press-cast-upright' });
  add([b.w * 0.9, b.h * 0.08, b.d * 0.12], [0, b.h * 0.84, 0], p.paint, { name: 'press-crosshead' });
  for (const y of [0.38, 0.56]) add([b.w * 0.68, b.w * 0.13, b.w * 0.13], [0, b.h * y, 0], p.metal, { shape: 'cylinder', rotation: [0, 0, Math.PI / 2], metalness: 0.6, name: 'press-steel-roller' });
  add([b.w * 0.56, b.h * 0.03, b.d * 0.58], [0, b.h * 0.29, 0], p.wood, { name: 'press-work-bed' });
  add([b.w * 0.18, b.h * 0.18, b.d * 0.08], [b.w * 0.48, b.h * 0.57, 0], p.metal, { shape: 'torus', rotation: [0, Math.PI / 2, 0], metalness: 0.6, name: 'press-handwheel' });
  if (kind.includes('kiln')) add([b.w * 0.6, b.h * 0.52, b.d * 0.62], [0, b.h * 0.38, 0], '#8d7561', { shape: 'cylinder', name: 'ceramic-kiln-body' });
  void variant;
}

function buildHabitat(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.92, b.h * 0.16, b.d * 0.86], [0, b.h * 0.09, 0], p.paintDark, { name: 'habitat-painted-base' });
  for (const x of [-0.42, 0.42]) for (const z of [-0.37, 0.37]) add([b.w * 0.045, b.h * 0.76, b.d * 0.045], [x * b.w, b.h * 0.55, z * b.d], p.metal, { name: 'habitat-metal-frame', metalness: 0.48 });
  add([b.w * 0.9, b.h * 0.055, b.d * 0.8], [0, b.h * 0.94, 0], p.metal, { name: 'habitat-roof-frame', metalness: 0.48 });
  add([b.w * 0.82, b.h * 0.68, b.d * 0.018], [0, b.h * 0.6, b.d * 0.38], p.glass, { opacity: 0.25, name: 'habitat-front-glass' });
  for (const x of [-0.41, 0.41]) add([b.w * 0.018, b.h * 0.68, b.d * 0.7], [x * b.w, b.h * 0.6, 0], p.glass, { opacity: 0.22, name: 'habitat-side-glass' });
  if (/(aquarium|tidal|jellyfish|filter_bank)/.test(kind)) {
    add([b.w * 0.78, b.h * 0.49, b.d * 0.66], [0, b.h * 0.47, 0], '#6b9ca5', { opacity: 0.3, name: 'aquarium-water-tank' });
    add([b.w * 0.68, b.h * 0.08, b.d * 0.56], [0, b.h * 0.23, 0], '#756653', { name: 'aquarium-gravel-bed' });
    for (let frond = -2; frond <= 2; frond += 1) add([b.w * 0.08, b.h * (0.15 + (frond % 2) * 0.05), b.d * 0.05], [frond * b.w * 0.13, b.h * 0.33, 0], p.foliage, { shape: 'cone', rotation: [0, 0, frond * 0.13], name: 'aquarium-plant-frond' });
  } else if (kind.includes('aviary')) {
    for (let bar = -4; bar <= 4; bar += 1) add([b.w * 0.018, b.h * 0.65, b.w * 0.018], [bar * b.w * 0.085, b.h * 0.59, b.d * 0.385], p.metal, { shape: 'cylinder', name: 'aviary-cage-bar', metalness: 0.48 });
    add([b.w * 0.65, b.h * 0.035, b.d * 0.035], [0, b.h * 0.53, 0], p.wood, { name: 'aviary-wood-perch' });
  } else {
    add([b.w * 0.74, b.h * 0.11, b.d * 0.58], [0, b.h * 0.24, 0], p.soil, { name: 'botanical-soil-bed' });
    for (let plant = -2; plant <= 2; plant += 1) {
      add([b.w * 0.025, b.h * (0.2 + (plant % 2) * 0.05), b.w * 0.025], [plant * b.w * 0.14, b.h * 0.4, 0], p.foliage, { shape: 'cylinder', name: 'botanical-plant-stem' });
      add([b.w * 0.13, b.h * 0.22, b.d * 0.055], [plant * b.w * 0.14 + (plant % 2 ? b.w * 0.05 : -b.w * 0.05), b.h * 0.54, 0], shifted(p.foliage, plant + variant), { shape: 'cone', rotation: [0, 0, plant % 2 ? -0.55 : 0.55], name: 'botanical-tapered-leaf' });
    }
  }
}

function buildDisplay(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.92, b.h * 0.16, b.d * 0.84], [0, b.h * 0.09, 0], p.woodDark, { name: 'museum-display-base' });
  add([b.w * 0.82, b.h * 0.7, b.d * 0.68], [0, b.h * 0.56, 0], p.glass, { opacity: 0.22, name: 'museum-display-glass-case' });
  for (const x of [-0.41, 0.41]) for (const z of [-0.34, 0.34]) add([b.w * 0.035, b.h * 0.72, b.d * 0.035], [x * b.w, b.h * 0.56, z * b.d], p.brass, { name: 'museum-display-frame', metalness: 0.52 });
  if (/(mineral|specimen|insect)/.test(kind)) {
    for (let specimen = 0; specimen < 9; specimen += 1) {
      const x = ((specimen % 3) - 1) * b.w * 0.22;
      const y = b.h * (0.32 + Math.floor(specimen / 3) * 0.2);
      add([b.w * 0.1, b.h * 0.11, b.d * 0.08], [x, y, b.d * 0.12], shifted(specimen % 2 ? p.paint : p.brass, specimen + variant), { shape: specimen % 2 ? 'cone' : 'box', rotation: [0.2, specimen * 0.25, 0.1], name: 'museum-labeled-specimen' });
      add([b.w * 0.13, b.h * 0.035, b.d * 0.025], [x, y - b.h * 0.085, b.d * 0.2], p.light, { name: 'paper-specimen-label' });
    }
  } else if (kind.includes('anatomy')) {
    add([b.w * 0.34, b.h * 0.5, b.d * 0.2], [0, b.h * 0.52, 0], '#a87968', { name: 'anatomy-model-torso' });
    add([b.w * 0.2, b.h * 0.2, b.d * 0.18], [0, b.h * 0.83, 0], '#c7a082', { shape: 'sphere', name: 'anatomy-model-head' });
  } else {
    add([b.w * 0.66, b.h * 0.42, b.d * 0.42], [0, b.h * 0.47, 0], shifted(p.paint, variant), { name: 'museum-diorama-scenery' });
    add([b.w * 0.62, b.h * 0.035, b.d * 0.05], [0, b.h * 0.28, b.d * 0.36], p.light, { name: 'paper-museum-caption' });
  }
}

function buildMedicalMachine(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.72, b.h * 0.45, b.d * 0.64], [0, b.h * 0.27, 0], p.paint, { name: 'medical-painted-machine' });
  for (const x of [-0.28, 0.28]) for (const z of [-0.25, 0.25]) add([b.w * 0.1, b.w * 0.1, b.d * 0.055], [x * b.w, b.h * 0.055, z * b.d], p.paintDark, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'medical-cart-wheel' });
  add([b.w * 0.11, b.h * 0.46, b.w * 0.11], [0, b.h * 0.65, -b.d * 0.18], p.metal, { shape: 'cylinder', metalness: 0.58, name: 'medical-articulated-column' });
  addBeamBetween(root, [0, b.h * 0.83, -b.d * 0.18], [b.w * 0.25, b.h * 0.93, b.d * 0.02], b.w * 0.07, b.d * 0.07, p.metal, 'medical-articulated-arm');
  add([b.w * 0.34, b.w * 0.34, b.d * 0.14], [b.w * 0.27, b.h * 0.91, b.d * 0.08], p.light, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: kind.includes('xray') ? 'xray-emitter-head' : 'medical-lamp-head' });
  for (let lens = 0; lens < 4; lens += 1) {
    const angle = lens / 4 * Math.PI * 2;
    add([b.w * 0.07, b.w * 0.07, b.d * 0.025], [b.w * 0.27 + Math.cos(angle) * b.w * 0.1, b.h * 0.91 + Math.sin(angle) * b.w * 0.1, b.d * 0.16], p.glass, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], opacity: 0.55, emissive: p.glow, emissiveIntensity: 0.18, name: 'medical-glass-lens' });
  }
  add([b.w * 0.3, b.h * 0.14, b.d * 0.035], [-b.w * 0.15, b.h * 0.4, b.d * 0.34], p.paintDark, { name: 'medical-control-panel' });
  void variant;
}

function buildScientificInstrument(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.72, b.h * 0.08, b.d * 0.72], [0, b.h * 0.05, 0], p.woodDark, { name: 'scientific-instrument-base' });
  add([b.w * 0.1, b.h * 0.62, b.w * 0.1], [0, b.h * 0.36, 0], p.metal, { shape: 'cylinder', metalness: 0.58, name: 'scientific-instrument-column' });
  if (/(orrery|eclipse|lunar|planetarium|star_chart)/.test(kind)) {
    add([b.w * 0.22, b.w * 0.22, b.w * 0.22], [0, b.h * 0.67, 0], p.glow, { shape: 'sphere', emissive: p.glow, emissiveIntensity: 0.16, name: 'orrery-central-star' });
    for (let orbit = 0; orbit < 4; orbit += 1) {
      const radius = b.w * (0.2 + orbit * 0.09);
      add([radius * 2, radius * 2, b.w * 0.02], [0, b.h * (0.67 + (orbit - 1.5) * 0.025), 0], orbit % 2 ? p.metal : p.brass, { shape: 'torus', rotation: [Math.PI / 2 + orbit * 0.16, orbit * 0.21, 0], metalness: 0.6, name: 'orrery-orbit-ring' });
      const angle = orbit * 1.8 + variant * 0.37;
      add([b.w * 0.07, b.w * 0.07, b.w * 0.07], [Math.cos(angle) * radius, b.h * 0.67 + Math.sin(angle * 0.7) * b.h * 0.08, Math.sin(angle) * radius], shifted(p.paint, orbit), { shape: 'sphere', name: 'orrery-planet' });
    }
  } else if (/(weather_vane)/.test(kind)) {
    add([b.w * 0.78, b.h * 0.04, b.d * 0.1], [0, b.h * 0.78, 0], p.brass, { name: 'weather-vane-arrow', metalness: 0.62 });
    add([b.w * 0.22, b.h * 0.28, b.d * 0.05], [-b.w * 0.32, b.h * 0.78, 0], p.brass, { shape: 'cone', rotation: [0, 0, -Math.PI / 2], metalness: 0.62, name: 'weather-vane-arrowhead' });
    for (const axis of [-1, 1]) add([b.w * 0.04, b.h * 0.04, b.d * 0.78], [0, b.h * 0.65 + axis * b.h * 0.04, 0], p.metal, { name: 'weather-vane-compass-arm' });
  } else {
    add([b.w * 0.68, b.h * 0.34, b.d * 0.16], [0, b.h * 0.68, -b.d * 0.18], p.paint, { name: 'scientific-gauge-panel' });
    for (let gauge = 0; gauge < 5; gauge += 1) add([b.w * 0.1, b.w * 0.1, b.d * 0.03], [(gauge - 2) * b.w * 0.14, b.h * 0.7, b.d * 0.3], p.light, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'scientific-instrument-gauge' });
    for (let gauge = 0; gauge < 5; gauge += 1) addBeamBetween(root, [(gauge - 2) * b.w * 0.14, b.h * 0.7, b.d * 0.34], [(gauge - 2) * b.w * 0.14 + b.w * 0.035, b.h * 0.74, b.d * 0.34], b.w * 0.014, b.d * 0.014, p.paintDark, 'scientific-gauge-needle');
  }
}

function buildStage(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.94, b.h * 0.12, b.d * 0.84], [0, b.h * 0.07, 0], p.woodDark, { name: 'theater-wood-stage' });
  for (const x of [-0.43, 0.43]) add([b.w * 0.07, b.h * 0.78, b.d * 0.07], [x * b.w, b.h * 0.51, -b.d * 0.3], p.wood, { name: 'theater-proscenium-upright' });
  add([b.w * 0.92, b.h * 0.08, b.d * 0.12], [0, b.h * 0.9, -b.d * 0.3], p.wood, { name: 'theater-proscenium-header' });
  for (const side of [-1, 1]) add([b.w * 0.24, b.h * 0.64, b.d * 0.04], [side * b.w * 0.32, b.h * 0.52, -b.d * 0.25], shifted(p.fabric, variant + side), { rotation: [0, 0, -side * 0.08], name: 'theater-fabric-curtain' });
  if (kind.includes('puppet') || kind.includes('automaton')) {
    for (let actor = -1; actor <= 1; actor += 1) {
      add([b.w * 0.12, b.h * 0.24, b.d * 0.1], [actor * b.w * 0.22, b.h * 0.37, 0], shifted(p.paint, actor + variant), { name: 'stage-puppet-body' });
      add([b.w * 0.1, b.w * 0.1, b.w * 0.1], [actor * b.w * 0.22, b.h * 0.55, 0], p.light, { shape: 'sphere', name: 'stage-puppet-head' });
      add([b.w * 0.012, b.h * 0.3, b.w * 0.012], [actor * b.w * 0.22, b.h * 0.73, 0], p.metal, { name: 'stage-puppet-control-wire', metalness: 0.45 });
    }
  }
}

function buildArchitecturalModel(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.94, b.h * 0.08, b.d * 0.86], [0, b.h * 0.05, 0], p.woodDark, { name: 'architectural-model-table' });
  if (kind.includes('spiral_stair')) {
    add([b.w * 0.08, b.h * 0.86, b.w * 0.08], [0, b.h * 0.48, 0], p.metal, { shape: 'cylinder', metalness: 0.58, name: 'spiral-stair-center-column' });
    for (let step = 0; step < 12; step += 1) {
      const angle = step / 12 * Math.PI * 2 * 1.5;
      add([b.w * 0.34, b.h * 0.035, b.d * 0.13], [Math.cos(angle) * b.w * 0.2, b.h * (0.14 + step * 0.065), Math.sin(angle) * b.d * 0.2], p.metal, { rotation: [0, -angle, 0], metalness: 0.45, name: 'spiral-stair-step' });
    }
  } else {
    const floors = kind.includes('hotel_cutaway') ? 4 : 3;
    for (let floor = 0; floor < floors; floor += 1) {
      const floorY = b.h * (0.14 + floor * 0.2);
      add([b.w * 0.82, b.h * 0.04, b.d * 0.66], [0, floorY, 0], p.wood, { name: 'architectural-model-floor' });
      for (const x of [-0.38, 0, 0.38]) add([b.w * 0.035, b.h * 0.18, b.d * 0.66], [x * b.w, floorY + b.h * 0.1, 0], shifted(p.paint, floor + x + variant), { name: 'architectural-model-wall' });
      for (let room = -1; room <= 1; room += 1) add([b.w * 0.12, b.h * 0.08, b.d * 0.16], [room * b.w * 0.24, floorY + b.h * 0.065, b.d * 0.16], shifted(p.fabric, room + floor), { name: 'architectural-miniature-furniture' });
    }
    add([b.w * 0.88, b.h * 0.04, b.d * 0.72], [0, b.h * (0.18 + floors * 0.2), 0], p.woodDark, { name: 'architectural-model-roof' });
  }
}

function buildScreen(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  const panels = kind.includes('canopy') ? 4 : 3;
  for (let panel = 0; panel < panels; panel += 1) {
    const width = b.w * 0.82 / panels;
    const x = (panel - (panels - 1) / 2) * width * 1.03;
    add([width * 0.92, b.h * 0.78, b.d * 0.06], [x, b.h * 0.5, 0], shifted(p.fabric, variant + panel), { rotation: [0, panel % 2 ? 0.09 : -0.09, 0], name: 'divider-fabric-panel' });
    for (const side of [-1, 1]) add([b.w * 0.025, b.h * 0.84, b.d * 0.04], [x + side * width * 0.47, b.h * 0.5, 0], p.woodDark, { name: 'divider-wood-frame' });
  }
}

function buildServiceFixture(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.92, b.h * 0.5, b.d * 0.78], [0, b.h * 0.29, 0], p.wood, { name: 'service-counter-cabinet' });
  add([b.w, b.h * 0.07, b.d * 0.9], [0, b.h * 0.57, 0], p.light, { name: 'service-countertop' });
  for (let panel = -2; panel <= 2; panel += 1) add([b.w * 0.14, b.h * 0.27, b.d * 0.03], [panel * b.w * 0.17, b.h * 0.3, b.d * 0.41], panel % 2 ? p.woodDark : p.wood, { name: 'service-counter-panel' });
  if (/(fountain|dessert|pastry)/.test(kind)) {
    for (let tier = 0; tier < 3; tier += 1) {
      add([b.w * (0.5 - tier * 0.11), b.h * 0.05, b.d * (0.5 - tier * 0.11)], [0, b.h * (0.66 + tier * 0.13), 0], p.brass, { shape: 'cylinder', metalness: 0.44, name: 'service-display-tier' });
      for (let item = -1; item <= 1; item += 1) add([b.w * 0.08, b.h * 0.07, b.d * 0.08], [item * b.w * (0.13 - tier * 0.02), b.h * (0.72 + tier * 0.13), 0], shifted(p.paint, item + tier + variant), { shape: 'cylinder', name: 'service-display-pastry' });
    }
  } else {
    for (let tap = -2; tap <= 2; tap += 1) {
      add([b.w * 0.04, b.h * 0.27, b.w * 0.04], [tap * b.w * 0.15, b.h * 0.72, 0], p.metal, { shape: 'cylinder', metalness: 0.62, name: 'service-fountain-tap' });
      add([b.w * 0.1, b.h * 0.04, b.d * 0.12], [tap * b.w * 0.15, b.h * 0.83, b.d * 0.05], p.metal, { name: 'service-tap-handle', metalness: 0.62 });
    }
  }
}

function buildRackOrStand(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.86, b.h * 0.07, b.d * 0.72], [0, b.h * 0.045, 0], p.woodDark, { name: 'display-rack-base' });
  for (const x of [-0.4, 0.4]) add([b.w * 0.055, b.h * 0.84, b.d * 0.055], [x * b.w, b.h * 0.48, 0], p.metal, { name: 'display-rack-upright', metalness: 0.48 });
  for (const y of [0.3, 0.56, 0.82]) add([b.w * 0.82, b.h * 0.04, b.d * 0.62], [0, b.h * y, 0], p.wood, { name: 'display-rack-shelf' });
  if (kind.includes('reel')) for (let row = 0; row < 3; row += 1) for (let column = -2; column <= 2; column += 1) add([b.w * 0.13, b.w * 0.13, b.d * 0.04], [column * b.w * 0.15, b.h * (0.34 + row * 0.26), b.d * 0.28], p.metal, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], name: 'film-reel' });
  else for (let item = 0; item < 9; item += 1) add([b.w * 0.11, b.h * 0.13, b.d * 0.18], [((item % 3) - 1) * b.w * 0.23, b.h * (0.38 + Math.floor(item / 3) * 0.26), 0], shifted(p.paint, item + variant), { name: 'rack-stored-item' });
}

function buildIndustrialMachine(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.9, b.h * 0.52, b.d * 0.75], [0, b.h * 0.31, 0], p.paint, { name: 'industrial-painted-machine' });
  add([b.w * 0.78, b.h * 0.26, b.d * 0.1], [0, b.h * 0.69, -b.d * 0.28], p.paintDark, { name: 'industrial-control-panel' });
  for (let gauge = -2; gauge <= 2; gauge += 1) add([b.w * 0.11, b.w * 0.11, b.d * 0.03], [gauge * b.w * 0.14, b.h * 0.7, b.d * 0.39], p.light, { shape: 'cylinder', rotation: [Math.PI / 2, 0, 0], name: 'industrial-pressure-gauge' });
  for (let pipe = -2; pipe <= 2; pipe += 1) add([b.w * 0.065, b.h * (0.3 + (pipe % 2) * 0.1), b.w * 0.065], [pipe * b.w * 0.16, b.h * 0.88, -b.d * 0.2], pipe % 2 ? p.brass : p.metal, { shape: 'cylinder', metalness: 0.62, name: 'industrial-steel-pipe' });
  add([b.w * 0.34, b.w * 0.34, b.d * 0.07], [b.w * 0.36, b.h * 0.4, b.d * 0.4], p.metal, { shape: 'torus', rotation: [Math.PI / 2, 0, 0], metalness: 0.62, name: 'industrial-control-handwheel' });
  void kind;
  void variant;
}

function buildFrameInstrument(root: THREE.Group, kind: string, b: Bounds, p: Palette, variant: number): void {
  const add = partAdder(root);
  add([b.w * 0.88, b.h * 0.07, b.d * 0.72], [0, b.h * 0.04, 0], p.woodDark, { name: 'instrument-frame-base' });
  for (const x of [-0.42, 0.42]) add([b.w * 0.055, b.h * 0.84, b.d * 0.055], [x * b.w, b.h * 0.48, 0], p.metal, { name: 'instrument-frame-upright', metalness: 0.55 });
  add([b.w * 0.9, b.h * 0.055, b.d * 0.08], [0, b.h * 0.9, 0], p.metal, { name: 'instrument-frame-crossbeam', metalness: 0.55 });
  if (kind.includes('resonance')) {
    for (let horn = -3; horn <= 3; horn += 1) add([b.w * 0.22, b.h * 0.3, b.d * 0.22], [horn * b.w * 0.11, b.h * (0.45 + Math.abs(horn) * 0.055), 0], horn % 2 ? p.brass : p.paint, { shape: 'cone', rotation: [0, 0, horn * 0.1], metalness: 0.4, name: 'resonance-flared-horn' });
  } else {
    for (let string = -7; string <= 7; string += 1) add([b.w * 0.012, b.h * (0.55 - Math.abs(string) * 0.02), b.w * 0.012], [string * b.w * 0.05, b.h * 0.55, 0], string % 2 ? p.brass : p.light, { shape: 'cylinder', metalness: 0.48, emissive: kind.includes('light') ? p.glow : undefined, emissiveIntensity: kind.includes('light') ? 0.12 : 0, name: kind.includes('light') ? 'light-organ-pipe' : 'weather-harp-string' });
  }
  void variant;
}

function partAdder(parent: THREE.Object3D) {
  return (
    scale: [number, number, number],
    position: [number, number, number],
    color: string,
    options: PartOptions = {},
  ): THREE.Mesh => {
    const opacity = options.opacity ?? 1;
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.62,
      metalness: options.metalness ?? 0.08,
      emissive: options.emissive ?? '#000000',
      emissiveIntensity: options.emissiveIntensity ?? 0,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 0.5,
    });
    const mesh = new THREE.Mesh(geometryForShape(options.shape ?? 'box'), material);
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    if (options.rotation) mesh.rotation.set(...options.rotation);
    mesh.name = options.name ?? 'production-prop-part';
    mesh.castShadow = opacity > 0.5;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
}

function addBeamBetween(
  parent: THREE.Object3D,
  start: [number, number, number],
  end: [number, number, number],
  thickness: number,
  depth: number,
  color: string,
  name: string,
): THREE.Mesh {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  return partAdder(parent)(
    [thickness, length, depth],
    [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2],
    color,
    { rotation: [0, 0, -Math.atan2(dx, dy)], name },
  );
}

function paletteFor(kind: string, variant: number, accent: string, body: string): Palette {
  const seed = hashString(`${kind}:${variant}`);
  const primary = new THREE.Color(body).offsetHSL(((seed % 7) - 3) * 0.006, 0.01, (variant - 3.5) * 0.012);
  const secondary = new THREE.Color(accent).offsetHSL(((seed % 5) - 2) * 0.008, 0.03, (variant % 3 - 1) * 0.025);
  const wood = primary.clone().lerp(new THREE.Color('#805b3b'), 0.42).getStyle();
  const woodDark = new THREE.Color(wood).multiplyScalar(0.52).getStyle();
  const paint = secondary.getStyle();
  const paintDark = secondary.clone().multiplyScalar(0.42).getStyle();
  const metal = secondary.clone().lerp(new THREE.Color('#aeb4b8'), 0.68).getStyle();
  const brass = new THREE.Color('#a9843d').offsetHSL(0, 0, (variant % 3 - 1) * 0.035).getStyle();
  const fabric = primary.clone().lerp(secondary, 0.35).getStyle();
  const fabricDark = new THREE.Color(fabric).multiplyScalar(0.56).getStyle();
  const light = primary.clone().lerp(new THREE.Color('#eee8da'), 0.72).getStyle();
  const glow = ['#e7b950', '#67c6d0', '#d8799f', '#9dce72', '#df794d'][variant % 5]!;
  const foliage = new THREE.Color('#4f7546').offsetHSL((seed % 5 - 2) * 0.012, 0.03, (variant % 3 - 1) * 0.025).getStyle();
  return {
    wood,
    woodDark,
    paint,
    paintDark,
    metal,
    brass,
    fabric,
    fabricDark,
    light,
    glass: '#aacbd1',
    glow,
    foliage,
    soil: '#493a2b',
  };
}

function shifted(color: string, index: number): string {
  const delta = ((Math.abs(Math.floor(index)) % 5) - 2) * 0.025;
  return new THREE.Color(color).offsetHSL(delta * 0.18, delta * 0.2, delta).getStyle();
}
