import type { MoodAxis, RoomArchitecture, RoomEnvironment } from '../types';
import type { AssetCategory, AssetDef, ThemePreset } from './assetCatalog';
import { sceneSetIdsForTags } from './sceneSets';

interface SurrealFamily {
  id: string;
  kind: string;
  label: string;
  category: AssetCategory;
  tags: string[];
  scale: { x: number; y: number; z: number };
  renderCost: number;
}

const VARIANT_LABELS = [
  'bleached',
  'municipal',
  'neon',
  'corroded',
  'floral',
  'industrial',
  'mirrored',
  'monumental',
] as const;

const FAMILIES: SurrealFamily[] = [
  family('elevator_bank', 'elevator_bank', 'elevator bank', 'fixture', ['office', 'motel', 'mall', 'transit'], { x: 4.8, y: 3.1, z: 0.55 }, 5),
  family('escalator', 'escalator', 'motionless escalator', 'fixture', ['mall', 'terminal', 'transit', 'retail'], { x: 2.6, y: 2.8, z: 5.2 }, 5),
  family('gas_pump', 'gas_pump', 'roadside fuel pump', 'fixture', ['roadside', 'highway', 'parking', 'service'], { x: 1.15, y: 2.15, z: 0.8 }, 3),
  family('playground_slide', 'playground_slide', 'playground slide', 'fixture', ['outdoor', 'playground', 'park', 'school'], { x: 2.2, y: 2.6, z: 4.4 }, 4),
  family('satellite_dish', 'satellite_dish', 'receiver dish', 'fixture', ['outdoor', 'tech', 'field', 'industrial'], { x: 3.4, y: 3.5, z: 3.4 }, 4),
  family('motel_sign', 'motel_sign', 'roadside motel sign', 'decor', ['motel', 'roadside', 'night', 'retail'], { x: 3.2, y: 5.4, z: 0.7 }, 4),
  family('newsstand', 'newsstand', 'closed newsstand', 'fixture', ['station', 'plaza', 'retail', 'transit'], { x: 3.2, y: 2.8, z: 2.2 }, 4),
  family('shipping_container', 'shipping_container', 'shipping container', 'fixture', ['warehouse', 'loading', 'industrial', 'outdoor'], { x: 2.5, y: 2.6, z: 5.8 }, 4),
  family('upright_piano', 'upright_piano', 'upright piano', 'furniture', ['motel', 'school', 'chapel', 'leisure'], { x: 1.75, y: 1.45, z: 0.72 }, 4),
  family('chandelier', 'chandelier', 'hanging chandelier', 'fixture', ['motel', 'atrium', 'banquet', 'ceremonial'], { x: 2.2, y: 2.8, z: 2.2 }, 4),
  family('cemetery_gate', 'cemetery_gate', 'cemetery gate', 'fixture', ['outdoor', 'ceremonial', 'ruined', 'park'], { x: 5.8, y: 3.8, z: 1.0 }, 5),
  family('water_tower', 'water_tower', 'water tower', 'fixture', ['outdoor', 'industrial', 'roadside', 'field'], { x: 4.8, y: 8.5, z: 4.8 }, 5),
];

export const SURREAL_ASSETS: AssetDef[] = FAMILIES.flatMap((assetFamily) =>
  Array.from({ length: 8 }, (_, variant) => ({
    id: `${assetFamily.id}_${String(variant + 1).padStart(2, '0')}`,
    kind: assetFamily.kind,
    label: `${VARIANT_LABELS[variant]} ${assetFamily.label}`,
    category: assetFamily.category,
    tags: [...assetFamily.tags],
    setIds: sceneSetIdsForTags(assetFamily.tags),
    moods: ['upper', 'downer', 'static', 'dynamic'] as MoodAxis[],
    defaultScale: { ...assetFamily.scale },
    scaleRange: { min: 0.74, max: 1.7 },
    linksByDefault: false,
    solidDefault: true,
    weight: 0.72,
    renderCost: assetFamily.renderCost,
    family: assetFamily.id,
    variant,
  })),
);

export const SURREAL_ASSET_COUNT = SURREAL_ASSETS.length;

/** New themes live beside their asset data instead of growing assetCatalog.ts. */
export const SURREAL_THEMES: ThemePreset[] = [
  theme('flooded_subway_exchange', 'Flooded Subway Exchange', 'The timetable continues beneath ankle-deep water.', 'dynamic', 'open-hall', ['subway', 'station', 'wet', 'flooded', 'concourse'], ['ticket_gate_04', 'departure_board_07', 'newsstand_03', 'airport_seat_05', 'npc_conductor_02'], 82, 46, 14, palette('#234c55', '#24333a', '#3b6970', '#64d5df', '#315962', '#c9fbff', '#477780'), 'concourse'),
  theme('dust_archive_hall', 'Archive Beneath the Dust', 'Fingerprints appear on shelves before you touch them.', 'static', 'open-hall', ['archive', 'office', 'dusty', 'old', 'colonnade'], ['bookcase_06', 'archive_trolley_03', 'filing_cabinet_08', 'upright_piano_01', 'npc_librarian_04'], 68, 42, 13, palette('#736955', '#b9ad91', '#8f826b', '#c5a467', '#9b9079', '#f1dfb8', '#746b5a'), 'colonnade'),
  theme('mold_locker_complex', 'Locker Complex in Bloom', 'Green circles spread around every combination lock.', 'downer', 'interior', ['school', 'gym', 'moldy', 'wet', 'service'], ['locker_04', 'maintenance_sink_07', 'privacy_screen_02', 'exercise_bike_05', 'npc_coach_06'], 36, 32, 7, palette('#39422d', '#66705a', '#596447', '#94a553', '#515b46', '#e1e8ac', '#66714e'), 'chamber'),
  theme('electrified_arcade', 'Arcade on Emergency Power', 'Every cabinet awards the same impossible high score.', 'dynamic', 'open-hall', ['arcade', 'mall', 'electrified', 'neon', 'retail'], ['arcade_03', 'arcade_07', 'generator_02', 'server_rack_05', 'npc_mascot_08'], 62, 48, 12, palette('#151b29', '#08111f', '#28345a', '#35e9ff', '#131c36', '#c7fbff', '#253b68'), 'atrium'),
  theme('haunted_ballroom', 'Ballroom After the Last Dance', 'The chandelier sways to music too quiet to hear.', 'downer', 'open-hall', ['motel', 'banquet', 'haunted', 'ceremonial', 'atrium'], ['chandelier_07', 'upright_piano_04', 'dining_chair_02', 'folding_table_06', 'npc_bellhop_03'], 78, 66, 20, palette('#3a3847', '#181824', '#595568', '#aeb9e8', '#2d2d3b', '#eef1ff', '#55556c'), 'atrium'),
  theme('gilded_megamall', 'Gilded Megamall Rotunda', 'Gold leaf covers every store name except yours.', 'upper', 'open-hall', ['mall', 'retail', 'gilded', 'atrium', 'vast'], ['chandelier_02', 'retail_display_05', 'sectional_07', 'fountain_04', 'npc_vendor_01'], 104, 92, 29, palette('#5a4212', '#2d220d', '#82631a', '#e3b638', '#4b3a18', '#fff0a0', '#78601e'), 'atrium'),
  theme('bioluminescent_greenhouse', 'Bioluminescent Greenhouse', 'Plants illuminate labels written for different species.', 'upper', 'open-hall', ['greenhouse', 'garden', 'bioluminescent', 'lab', 'open'], ['greenhouse_table_06', 'planter_01', 'aquarium_tank_08', 'lab_bench_04', 'creature_fish_05'], 76, 56, 22, palette('#0d2b29', '#06181f', '#17443e', '#58f2b5', '#123630', '#b6ffda', '#21685a'), 'atrium'),
  theme('storm_coast_carpark', 'Coastal Car Park in the Storm', 'White lines vanish beneath rain before reaching the sea.', 'dynamic', 'outdoor', ['outdoor', 'parking', 'stormbound', 'wet', 'roadside'], ['streetlight_08', 'gas_pump_04', 'bus_shelter_02', 'traffic_cone_06', 'npc_raincoat'], 126, 82, 27, palette('#37424e', '#101923', '#4b5966', '#91b6d7', '#526477', '#e4f3ff', '#586b7d'), 'causeway'),
  theme('jungle_airport', 'Jungle Airport Terminal', 'Vines curl around a departure board listing only summer.', 'upper', 'open-hall', ['airport', 'terminal', 'jungle', 'tropical', 'overgrown'], ['airport_seat_04', 'departure_board_02', 'planter_07', 'tree_05', 'npc_tourist_06'], 116, 72, 26, palette('#36543a', '#172a24', '#4f7452', '#e9bd53', '#456b50', '#efffbd', '#5b805c'), 'concourse'),
  theme('elevator_city', 'City of Elevators', 'Every indicator stops between the same two floors.', 'static', 'open-hall', ['office', 'transit', 'elevator', 'civic', 'vast'], ['elevator_bank_01', 'elevator_bank_05', 'reception_desk_08', 'office_cubicle_03', 'npc_worker_02'], 96, 54, 24, palette('#555d63', '#22282d', '#778087', '#d0b861', '#3e474e', '#f5e8b2', '#69737a'), 'colonnade'),
  theme('container_horizon', 'Container Horizon', 'Freight doors form a city with no streets between them.', 'downer', 'outdoor', ['outdoor', 'warehouse', 'loading', 'industrial', 'vast'], ['shipping_container_02', 'shipping_container_06', 'water_tower_03', 'pallet_stack_07', 'npc_courier_05'], 148, 104, 34, palette('#4b5354', '#202a31', '#677173', '#d57550', '#475457', '#e9c7a8', '#687579'), 'field'),
  theme('silent_funeral_park', 'Funeral Park Transit Loop', 'The gate opens for buses that never appear.', 'downer', 'outdoor', ['outdoor', 'park', 'ceremonial', 'haunted', 'transit'], ['cemetery_gate_05', 'bus_shelter_08', 'garden_bench_02', 'streetlight_04', 'creature_crow_07'], 102, 76, 22, palette('#414943', '#1a2228', '#59615a', '#a6b1cc', '#3d4747', '#e5eaff', '#5a6463'), 'causeway'),
  theme('piano_furniture_showroom', 'Piano Furniture Showroom', 'Every instrument has one wet key.', 'static', 'open-hall', ['retail', 'motel', 'flooded', 'exhibition', 'open'], ['upright_piano_02', 'upright_piano_08', 'armchair_05', 'side_table_03', 'npc_vendor_04'], 74, 58, 14, palette('#33565f', '#252f33', '#577b83', '#75cbd1', '#42656d', '#d8ffff', '#5b7f84'), 'atrium'),
  theme('dish_array_meadow', 'Receiver Meadow', 'Dishes turn toward footsteps instead of stars.', 'dynamic', 'outdoor', ['outdoor', 'field', 'tech', 'meadow', 'vast'], ['satellite_dish_01', 'satellite_dish_07', 'water_tower_06', 'generator_05', 'npc_lab_tech_03'], 144, 112, 36, palette('#445643', '#091421', '#2f4652', '#b7a5ff', '#1f3541', '#ece5ff', '#526d72'), 'field'),
  theme('motel_sign_forest', 'Forest of Motel Signs', 'Vacancy lights point toward buildings that are not there.', 'dynamic', 'outdoor', ['outdoor', 'motel', 'roadside', 'neon', 'field'], ['motel_sign_01', 'motel_sign_03', 'motel_sign_06', 'gas_pump_08', 'npc_bellhop_05'], 122, 88, 31, palette('#25263b', '#080915', '#343457', '#ff72cb', '#15162b', '#ffd2f0', '#4a4668'), 'field'),
  theme('escalator_basin', 'Escalator Basin', 'Moving stairs descend into a floor that remains level.', 'dynamic', 'open-hall', ['mall', 'transit', 'basin', 'retail', 'uncanny'], ['escalator_02', 'escalator_06', 'newsstand_05', 'ticket_gate_01', 'npc_commuter_08'], 92, 76, 23, palette('#4b5464', '#1a202b', '#657184', '#66d8cf', '#303b49', '#d6fffb', '#617181'), 'basin'),
];

function family(
  id: string,
  kind: string,
  label: string,
  category: AssetCategory,
  tags: string[],
  scale: { x: number; y: number; z: number },
  renderCost: number,
): SurrealFamily {
  return { id, kind, label, category, tags, scale, renderCost };
}

function palette(
  floor: string,
  ceiling: string,
  walls: string,
  accent: string,
  fog: string,
  light: string,
  ambient: string,
): ThemePreset['palette'] {
  return { floor, ceiling, walls, accent, fog, light, ambient };
}

function theme(
  id: string,
  title: string,
  blurb: string,
  mood: MoodAxis,
  environment: RoomEnvironment,
  tags: string[],
  preferredAssets: string[],
  width: number,
  depth: number,
  height: number,
  colors: ThemePreset['palette'],
  architecture?: RoomArchitecture,
): ThemePreset {
  return { id, title, blurb, mood, environment, architecture, tags, preferredAssets, width, depth, height, palette: colors };
}
