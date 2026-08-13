import type { EntityBehavior, MoodAxis } from '../types';
import type { AssetCategory, AssetDef } from './assetCatalog';
import { sceneSetIdsForTags } from './sceneSets';

/**
 * Fifth collection: everyday objects, plants, and beings modeled at the highest
 * density yet, using a new `cine_` namespace that never overlaps the earlier
 * detail/exhibition/atelier builders. These are the "modern game" props — real
 * furniture, appliances, plants, and instruments — rather than liminal museum
 * pieces. Eight variants per family keeps the catalog dense.
 */
export const CINEMATIC_PROP_KINDS = [
  'cine_prop_ergonomic_office_chair',
  'cine_prop_plush_armchair',
  'cine_prop_sectional_sofa',
  'cine_prop_wooden_dining_set',
  'cine_prop_bistro_table',
  'cine_prop_bar_stool',
  'cine_prop_reading_bench',
  'cine_prop_garden_pavilion_bench',
  'cine_prop_work_desk',
  'cine_prop_executive_desk',
  'cine_prop_standing_desk',
  'cine_prop_conference_table',
  'cine_prop_round_coffee_table',
  'cine_prop_sideboard_buffet',
  'cine_prop_credenza',
  'cine_prop_dresser_wardrobe',
  'cine_prop_bookshelf_wall',
  'cine_prop_media_console',
  'cine_prop_nightstand_pair',
  'cine_prop_platform_bed',
  'cine_prop_wardrobe_armoire',
  'cine_prop_kitchen_island',
  'cine_prop_pantry_cabinet',
  'cine_prop_kitchen_appliance_suite',
  'cine_prop_laundry_stack',
  'cine_prop_bathroom_vanity',
  'cine_prop_pedestal_sink',
  'cine_prop_soaking_tub',
  'cine_prop_shower_stall',
  'cine_prop_office_partition',
  'cine_prop_reception_counter',
  'cine_prop_waiting_room_lounge',
  'cine_prop_exam_table',
  'cine_prop_hospital_trolley',
  'cine_prop_clinic_instrument_cabinet',
  'cine_prop_pharmacy_shelving',
  'cine_prop_lab_fume_hood',
  'cine_prop_microscope_station',
  'cine_prop_centrifuge_bench',
  'cine_prop_library_reading_room',
  'cine_prop_card_catalog',
  'cine_prop_archive_cart',
  'cine_prop_locker_row',
  'cine_prop_gym_bench_press',
  'cine_prop_treadmill',
  'cine_prop_lockers_lounge',
  'cine_prop_pool_lane_marker',
  'cine_prop_lifeguard_stand',
  'cine_prop_stadium_seat_row',
  'cine_prop_concession_stand',
  'cine_prop_ticket_booth',
  'cine_prop_terminal_check_in',
  'cine_prop_baggage_carousel',
  'cine_prop_airport_seating',
  'cine_prop_transit_platform_seat',
  'cine_prop_vending_island',
  'cine_prop_kiosk_payment',
  'cine_prop_atm_machine',
  'cine_prop_photo_booth',
  'cine_prop_arcade_cabinet_pair',
  'cine_prop_pinball_machine',
  'cine_prop_stage_lighting_rig',
  'cine_prop_concert_speaker_stack',
  'cine_prop_podium',
  'cine_prop_pulpit',
  'cine_prop_altar_table',
  'cine_prop_candle_rack',
  'cine_prop_planter_box_row',
  'cine_prop_hanging_planter',
  'cine_prop_bonsai_table',
  'cine_prop_topiary_spiral',
  'cine_prop_fern_stand',
  'cine_prop_palm_in_lobby_pot',
  'cine_prop_monstera_floor_plant',
  'cine_prop_snake_plant_planter',
  'cine_prop_herb_garden_shelf',
  'cine_prop_rose_arbor',
  'cine_prop_greenhouse_bench',
  'cine_prop_water_feature',
  'cine_prop_fish_tank_stand',
  'cine_prop_terrarium_table',
  'cine_prop_shop_mannequin',
  'cine_prop_display_shelf',
  'cine_prop_jewelry_counter',
  'cine_prop_clothing_rack',
  'cine_prop_shoe_display',
  'cine_prop_bakery_case',
  'cine_prop_butcher_counter',
  'cine_prop_produce_bin',
  'cine_prop_freezer_island',
  'cine_prop_soda_fountain',
  'cine_prop_espresso_machine',
  'cine_prop_food_truck_counter',
  'cine_prop_bbq_grill',
  'cine_prop_campfire_ring',
  'cine_prop_umbrella_table',
] as const;

export const CINEMATIC_HUMANOID_KINDS = [
  'cine_figure_barista',
  'cine_figure_chef',
  'cine_figure_server',
  'cine_figure_florist',
  'cine_figure_gardener',
  'cine_figure_bookseller',
  'cine_figure_librarian',
  'cine_figure_lab_assistant',
  'cine_figure_pharmacist',
  'cine_figure_nurse_practitioner',
  'cine_figure_physical_therapist',
  'cine_figure_personal_trainer',
  'cine_figure_swim_instructor',
  'cine_figure_stadium_attendant',
  'cine_figure_gate_agent',
  'cine_figure_pilot',
  'cine_figure_train_operator',
  'cine_figure_bus_driver',
  'cine_figure_shopkeeper',
  'cine_figure_butcher',
  'cine_figure_baker',
  'cine_figure_food_truck_cook',
  'cine_figure_bartender',
  'cine_figure_waiter',
  'cine_figure_porter',
  'cine_figure_concierge',
  'cine_figure_housekeeper',
  'cine_figure_security_officer',
  'cine_figure_technician',
  'cine_figure_driver',
  'cine_figure_delivery_courier',
  'cine_figure_musician',
  'cine_figure_artist',
  'cine_figure_photographer',
  'cine_figure_archivist',
  'cine_figure_curator',
  'cine_figure_architect',
  'cine_figure_engineer',
  'cine_figure_researcher',
  'cine_figure_teacher',
] as const;

export const CINEMATIC_CREATURE_KINDS = [
  'cine_animal_house_cat',
  'cine_animal_labrador',
  'cine_animal_border_collie',
  'cine_animal_goldfish',
  'cine_animal_koi',
  'cine_animal_budgerigar',
  'cine_animal_cockatiel',
  'cine_animal_hamster',
  'cine_animal_guinea_pig',
  'cine_animal_rabbit',
  'cine_animal_ferret',
  'cine_animal_turtle',
  'cine_animal_gecko',
  'cine_animal_chameleon',
  'cine_animal_parrot',
  'cine_animal_canary',
  'cine_animal_pigeon',
  'cine_animal_robin',
  'cine_animal_sparrow',
  'cine_animal_squirrel',
  'cine_animal_raccoon',
  'cine_animal_fox',
  'cine_animal_deer',
  'cine_animal_horse',
  'cine_animal_pony',
  'cine_animal_donkey',
  'cine_animal_goat',
  'cine_animal_sheep',
  'cine_animal_cow',
  'cine_animal_pig',
  'cine_animal_chicken',
  'cine_animal_duck',
  'cine_animal_goose',
  'cine_animal_turkey',
  'cine_animal_otter',
  'cine_animal_sea_lion',
  'cine_animal_dolphin',
  'cine_animal_whale_shark',
  'cine_animal_octopus',
  'cine_animal_stingray',
] as const;

export type CinematicPropKind = (typeof CINEMATIC_PROP_KINDS)[number];
export type CinematicHumanoidKind = (typeof CINEMATIC_HUMANOID_KINDS)[number];
export type CinematicCreatureKind = (typeof CINEMATIC_CREATURE_KINDS)[number];
export type CinematicModelKind =
  | CinematicPropKind
  | CinematicHumanoidKind
  | CinematicCreatureKind;

export type CinematicPropForm =
  | 'seating'
  | 'table'
  | 'casework'
  | 'soft'
  | 'kitchen'
  | 'clinical'
  | 'office'
  | 'leisure'
  | 'retail'
  | 'transport'
  | 'greenspace'
  | 'ceremonial'
  | 'aquatic'
  | 'industrial'
  | 'technology';

export interface CinematicFamilyDefinition {
  id: string;
  kind: CinematicModelKind;
  label: string;
  category: AssetCategory;
  tags: string[];
  scale: { x: number; y: number; z: number };
  form?: CinematicPropForm;
  behavior?: EntityBehavior;
}

const prop = (
  id: string,
  kind: CinematicPropKind,
  label: string,
  category: 'furniture' | 'fixture' | 'decor' | 'anomaly',
  tags: string[],
  scale: { x: number; y: number; z: number },
  form: CinematicPropForm,
): CinematicFamilyDefinition => ({ id, kind, label, category, tags, scale, form });

export const CINEMATIC_PROP_FAMILIES: CinematicFamilyDefinition[] = [
  // Seating
  prop('cine_ergo_office_chair', 'cine_prop_ergonomic_office_chair', 'ergonomic office chair', 'furniture', ['office', 'workplace'], { x: 0.72, y: 1.35, z: 0.72 }, 'seating'),
  prop('cine_plush_armchair', 'cine_prop_plush_armchair', 'plush lounge armchair', 'furniture', ['home', 'lobby'], { x: 1.05, y: 1.15, z: 1.0 }, 'seating'),
  prop('cine_sectional_sofa', 'cine_prop_sectional_sofa', 'wraparound sectional sofa', 'furniture', ['home', 'lobby'], { x: 3.0, y: 1.05, z: 2.2 }, 'seating'),
  prop('cine_wooden_dining_set', 'cine_prop_wooden_dining_set', 'family dining set', 'furniture', ['home', 'food'], { x: 2.1, y: 1.1, z: 2.1 }, 'seating'),
  prop('cine_bistro_table', 'cine_prop_bistro_table', 'two-top bistro table', 'furniture', ['food', 'mall'], { x: 1.1, y: 1.05, z: 1.1 }, 'table'),
  prop('cine_bar_stool', 'cine_prop_bar_stool', 'footrail bar stool', 'furniture', ['food', 'bar'], { x: 0.5, y: 1.25, z: 0.5 }, 'seating'),
  prop('cine_reading_bench', 'cine_prop_reading_bench', 'lobby reading bench', 'furniture', ['lobby', 'library'], { x: 1.9, y: 1.0, z: 0.62 }, 'seating'),
  prop('cine_garden_bench', 'cine_prop_garden_pavilion_bench', 'pavilion garden bench', 'furniture', ['park', 'garden'], { x: 1.8, y: 1.05, z: 0.62 }, 'seating'),

  // Tables and desks
  prop('cine_work_desk', 'cine_prop_work_desk', 'height-adjustable work desk', 'furniture', ['office', 'workplace'], { x: 1.8, y: 1.0, z: 0.85 }, 'table'),
  prop('cine_executive_desk', 'cine_prop_executive_desk', 'executive writing desk', 'furniture', ['office', 'civic'], { x: 2.1, y: 1.1, z: 1.0 }, 'table'),
  prop('cine_standing_desk', 'cine_prop_standing_desk', 'standing drafting desk', 'furniture', ['office', 'studio'], { x: 1.5, y: 1.45, z: 0.8 }, 'table'),
  prop('cine_conference_table', 'cine_prop_conference_table', 'conference meeting table', 'furniture', ['office', 'civic'], { x: 2.6, y: 0.9, z: 1.4 }, 'table'),
  prop('cine_round_coffee_table', 'cine_prop_round_coffee_table', 'round coffee table', 'furniture', ['home', 'lobby'], { x: 1.0, y: 0.55, z: 1.0 }, 'table'),
  prop('cine_sideboard_buffet', 'cine_prop_sideboard_buffet', 'sideboard buffet', 'furniture', ['home', 'banquet'], { x: 2.0, y: 1.2, z: 0.6 }, 'casework'),
  prop('cine_credenza', 'cine_prop_credenza', 'mid-century credenza', 'furniture', ['home', 'office'], { x: 1.9, y: 0.75, z: 0.55 }, 'casework'),

  // Casework and storage
  prop('cine_dresser_wardrobe', 'cine_prop_dresser_wardrobe', 'six-drawer dresser', 'furniture', ['home', 'bedroom'], { x: 1.8, y: 1.4, z: 0.6 }, 'casework'),
  prop('cine_bookshelf_wall', 'cine_prop_bookshelf_wall', 'wall bookshelf unit', 'furniture', ['home', 'library'], { x: 2.2, y: 2.0, z: 0.42 }, 'casework'),
  prop('cine_media_console', 'cine_prop_media_console', 'media console cabinet', 'furniture', ['home', 'leisure'], { x: 1.7, y: 0.65, z: 0.5 }, 'casework'),
  prop('cine_nightstand_pair', 'cine_prop_nightstand_pair', 'matched nightstand pair', 'furniture', ['home', 'bedroom'], { x: 0.65, y: 0.7, z: 0.5 }, 'casework'),
  prop('cine_platform_bed', 'cine_prop_platform_bed', 'platform bed with headboard', 'furniture', ['home', 'bedroom', 'hotel'], { x: 2.1, y: 1.1, z: 2.2 }, 'soft'),
  prop('cine_wardrobe_armoire', 'cine_prop_wardrobe_armoire', 'standing wardrobe armoire', 'furniture', ['home', 'bedroom'], { x: 1.3, y: 2.1, z: 0.7 }, 'casework'),

  // Kitchen
  prop('cine_kitchen_island', 'cine_prop_kitchen_island', 'worktop kitchen island', 'furniture', ['home', 'food'], { x: 2.4, y: 1.0, z: 1.1 }, 'kitchen'),
  prop('cine_pantry_cabinet', 'cine_prop_pantry_cabinet', 'tall pantry cabinet', 'furniture', ['home', 'food'], { x: 0.75, y: 2.1, z: 0.6 }, 'casework'),
  prop('cine_appliance_suite', 'cine_prop_kitchen_appliance_suite', 'integrated appliance suite', 'fixture', ['home', 'food'], { x: 2.6, y: 1.6, z: 0.75 }, 'kitchen'),
  prop('cine_laundry_stack', 'cine_prop_laundry_stack', 'stacked washer and dryer', 'fixture', ['home', 'laundry'], { x: 0.8, y: 2.0, z: 0.8 }, 'kitchen'),

  // Bath
  prop('cine_bathroom_vanity', 'cine_prop_bathroom_vanity', 'double-sink bathroom vanity', 'fixture', ['home', 'clinic'], { x: 1.6, y: 0.9, z: 0.55 }, 'casework'),
  prop('cine_pedestal_sink', 'cine_prop_pedestal_sink', 'porcelain pedestal sink', 'fixture', ['home', 'clinic'], { x: 0.6, y: 0.95, z: 0.5 }, 'kitchen'),
  prop('cine_soaking_tub', 'cine_prop_soaking_tub', 'clawfoot soaking tub', 'fixture', ['home', 'hotel'], { x: 1.8, y: 0.7, z: 0.9 }, 'soft'),
  prop('cine_shower_stall', 'cine_prop_shower_stall', 'frameless shower stall', 'fixture', ['home', 'hotel'], { x: 1.0, y: 2.2, z: 1.0 }, 'kitchen'),

  // Office / clinical
  prop('cine_office_partition', 'cine_prop_office_partition', 'felt office partition', 'fixture', ['office', 'workplace'], { x: 1.6, y: 1.5, z: 0.06 }, 'office'),
  prop('cine_reception_counter', 'cine_prop_reception_counter', 'reception welcome counter', 'furniture', ['office', 'lobby'], { x: 2.4, y: 1.2, z: 0.8 }, 'office'),
  prop('cine_waiting_lounge', 'cine_prop_waiting_room_lounge', 'waiting-room lounge', 'furniture', ['clinic', 'lobby'], { x: 2.2, y: 1.0, z: 0.9 }, 'seating'),
  prop('cine_exam_table', 'cine_prop_exam_table', 'padded examination table', 'furniture', ['clinic', 'clinical'], { x: 1.9, y: 0.95, z: 0.75 }, 'clinical'),
  prop('cine_hospital_trolley', 'cine_prop_hospital_trolley', 'multi-tier hospital trolley', 'fixture', ['clinic', 'hospital'], { x: 0.95, y: 1.2, z: 0.6 }, 'clinical'),
  prop('cine_instrument_cabinet', 'cine_prop_clinic_instrument_cabinet', 'clinic instrument cabinet', 'fixture', ['clinic', 'clinical'], { x: 0.9, y: 1.9, z: 0.5 }, 'casework'),
  prop('cine_pharmacy_shelving', 'cine_prop_pharmacy_shelving', 'pharmacy open shelving', 'fixture', ['clinic', 'retail'], { x: 1.8, y: 2.0, z: 0.45 }, 'casework'),
  prop('cine_lab_fume_hood', 'cine_prop_lab_fume_hood', 'laboratory fume hood', 'fixture', ['lab', 'school'], { x: 1.8, y: 1.2, z: 0.8 }, 'clinical'),
  prop('cine_microscope_station', 'cine_prop_microscope_station', 'microscope work station', 'furniture', ['lab', 'school'], { x: 1.4, y: 0.95, z: 0.8 }, 'clinical'),
  prop('cine_centrifuge_bench', 'cine_prop_centrifuge_bench', 'centrifuge bench line', 'fixture', ['lab', 'clinical'], { x: 2.0, y: 1.0, z: 0.75 }, 'clinical'),

  // Library / school
  prop('cine_library_reading_room', 'cine_prop_library_reading_room', 'reading-room table set', 'furniture', ['library', 'school'], { x: 2.4, y: 1.0, z: 1.4 }, 'table'),
  prop('cine_card_catalog', 'cine_prop_card_catalog', 'vintage card catalog', 'furniture', ['library', 'archive'], { x: 1.2, y: 1.3, z: 0.55 }, 'casework'),
  prop('cine_archive_cart', 'cine_prop_archive_cart', 'rolling archive cart', 'fixture', ['archive', 'office'], { x: 1.0, y: 1.1, z: 0.55 }, 'industrial'),
  prop('cine_locker_row', 'cine_prop_locker_row', 'metal locker row', 'fixture', ['school', 'gym'], { x: 2.6, y: 2.0, z: 0.55 }, 'casework'),

  // Leisure / fitness / aquatic
  prop('cine_gym_bench_press', 'cine_prop_gym_bench_press', 'gym bench press', 'fixture', ['gym', 'leisure'], { x: 1.8, y: 1.3, z: 1.1 }, 'leisure'),
  prop('cine_treadmill', 'cine_prop_treadmill', 'treadmill running machine', 'fixture', ['gym', 'leisure'], { x: 2.0, y: 1.5, z: 0.9 }, 'leisure'),
  prop('cine_lockers_lounge', 'cine_prop_lockers_lounge', 'gym lounge lockers', 'fixture', ['gym', 'leisure'], { x: 2.4, y: 1.9, z: 0.55 }, 'casework'),
  prop('cine_pool_lane_marker', 'cine_prop_pool_lane_marker', 'pool lane rope and float', 'fixture', ['pool', 'aquatic'], { x: 0.4, y: 0.2, z: 2.0 }, 'aquatic'),
  prop('cine_lifeguard_stand', 'cine_prop_lifeguard_stand', 'elevated lifeguard stand', 'fixture', ['pool', 'aquatic'], { x: 1.1, y: 1.6, z: 1.1 }, 'leisure'),
  prop('cine_stadium_seat_row', 'cine_prop_stadium_seat_row', 'stadium seat row', 'furniture', ['stadium', 'leisure'], { x: 2.4, y: 1.2, z: 0.8 }, 'seating'),
  prop('cine_concession_stand', 'cine_prop_concession_stand', 'concession serving counter', 'fixture', ['stadium', 'food'], { x: 2.2, y: 1.4, z: 1.0 }, 'retail'),
  prop('cine_ticket_booth', 'cine_prop_ticket_booth', 'ticket booth kiosk', 'fixture', ['station', 'theater'], { x: 1.4, y: 2.0, z: 1.1 }, 'retail'),

  // Transport
  prop('cine_terminal_check_in', 'cine_prop_terminal_check_in', 'airport check-in desk', 'furniture', ['airport', 'transit'], { x: 2.6, y: 1.2, z: 0.9 }, 'transport'),
  prop('cine_baggage_carousel', 'cine_prop_baggage_carousel', 'baggage carousel end', 'fixture', ['airport', 'transit'], { x: 2.2, y: 1.1, z: 1.2 }, 'transport'),
  prop('cine_airport_seating', 'cine_prop_airport_seating', 'airport gate seating', 'furniture', ['airport', 'transit'], { x: 2.4, y: 1.1, z: 0.9 }, 'seating'),
  prop('cine_transit_platform_seat', 'cine_prop_transit_platform_seat', 'platform waiting seat', 'furniture', ['station', 'transit'], { x: 1.7, y: 1.0, z: 0.6 }, 'seating'),
  prop('cine_vending_island', 'cine_prop_vending_island', 'vending machine island', 'fixture', ['station', 'transit'], { x: 2.0, y: 2.1, z: 1.0 }, 'retail'),

  // Retail / technology
  prop('cine_kiosk_payment', 'cine_prop_kiosk_payment', 'self-service payment kiosk', 'fixture', ['retail', 'technology'], { x: 0.85, y: 1.6, z: 0.7 }, 'technology'),
  prop('cine_atm_machine', 'cine_prop_atm_machine', 'bank ATM machine', 'fixture', ['retail', 'civic'], { x: 1.0, y: 2.1, z: 0.8 }, 'technology'),
  prop('cine_photo_booth', 'cine_prop_photo_booth', 'photo booth station', 'fixture', ['mall', 'leisure'], { x: 1.3, y: 2.2, z: 1.1 }, 'technology'),
  prop('cine_arcade_cabinet_pair', 'cine_prop_arcade_cabinet_pair', 'twin arcade cabinets', 'fixture', ['arcade', 'leisure'], { x: 1.9, y: 2.0, z: 1.0 }, 'technology'),
  prop('cine_pinball_machine', 'cine_prop_pinball_machine', 'glowing pinball machine', 'fixture', ['arcade', 'leisure'], { x: 0.95, y: 1.6, z: 1.6 }, 'technology'),
  prop('cine_stage_lighting_rig', 'cine_prop_stage_lighting_rig', 'truss stage lighting rig', 'fixture', ['theater', 'leisure'], { x: 2.4, y: 2.6, z: 1.0 }, 'technology'),
  prop('cine_concert_speaker_stack', 'cine_prop_concert_speaker_stack', 'concert speaker stack', 'fixture', ['theater', 'leisure'], { x: 1.1, y: 2.0, z: 1.1 }, 'technology'),

  // Ceremonial
  prop('cine_podium', 'cine_prop_podium', 'lectern podium', 'furniture', ['school', 'civic'], { x: 0.7, y: 1.4, z: 0.6 }, 'ceremonial'),
  prop('cine_pulpit', 'cine_prop_pulpit', 'chapel pulpit', 'furniture', ['chapel', 'ceremonial'], { x: 0.9, y: 1.8, z: 0.75 }, 'ceremonial'),
  prop('cine_altar_table', 'cine_prop_altar_table', 'ceremonial altar table', 'furniture', ['chapel', 'ceremonial'], { x: 1.8, y: 1.3, z: 0.8 }, 'ceremonial'),
  prop('cine_candle_rack', 'cine_prop_candle_rack', 'wrought candle rack', 'fixture', ['chapel', 'ceremonial'], { x: 0.9, y: 1.8, z: 0.9 }, 'ceremonial'),

  // Greenspace / plants
  prop('cine_planter_box_row', 'cine_prop_planter_box_row', 'planter box row', 'decor', ['park', 'garden'], { x: 1.8, y: 0.8, z: 0.7 }, 'greenspace'),
  prop('cine_hanging_planter', 'cine_prop_hanging_planter', 'hanging basket planter', 'decor', ['garden', 'lobby'], { x: 0.5, y: 1.0, z: 0.5 }, 'greenspace'),
  prop('cine_bonsai_table', 'cine_prop_bonsai_table', 'bonsai display table', 'decor', ['garden', 'home'], { x: 0.8, y: 0.9, z: 0.8 }, 'greenspace'),
  prop('cine_topiary_spiral', 'cine_prop_topiary_spiral', 'spiral topiary', 'decor', ['garden', 'park'], { x: 1.1, y: 2.2, z: 1.1 }, 'greenspace'),
  prop('cine_fern_stand', 'cine_prop_fern_stand', 'pedestal fern stand', 'decor', ['lobby', 'garden'], { x: 0.8, y: 1.4, z: 0.8 }, 'greenspace'),
  prop('cine_palm_lobby_pot', 'cine_prop_palm_in_lobby_pot', 'lobby palm in pot', 'decor', ['lobby', 'hotel'], { x: 1.2, y: 2.4, z: 1.2 }, 'greenspace'),
  prop('cine_monstera_floor_plant', 'cine_prop_monstera_floor_plant', 'monstera floor plant', 'decor', ['home', 'office'], { x: 1.0, y: 1.6, z: 1.0 }, 'greenspace'),
  prop('cine_snake_plant_planter', 'cine_prop_snake_plant_planter', 'snake plant in planter', 'decor', ['home', 'office'], { x: 0.7, y: 1.2, z: 0.7 }, 'greenspace'),
  prop('cine_herb_garden_shelf', 'cine_prop_herb_garden_shelf', 'kitchen herb shelf', 'decor', ['home', 'food'], { x: 1.1, y: 1.2, z: 0.4 }, 'greenspace'),
  prop('cine_rose_arbor', 'cine_prop_rose_arbor', 'climbing rose arbor', 'decor', ['garden', 'park'], { x: 1.6, y: 2.2, z: 1.0 }, 'greenspace'),
  prop('cine_greenhouse_bench', 'cine_prop_greenhouse_bench', 'greenhouse potting bench', 'furniture', ['garden', 'industrial'], { x: 1.8, y: 1.0, z: 0.8 }, 'greenspace'),
  prop('cine_water_feature', 'cine_prop_water_feature', 'recirculating water feature', 'decor', ['garden', 'lobby'], { x: 1.2, y: 1.1, z: 1.2 }, 'aquatic'),
  prop('cine_fish_tank_stand', 'cine_prop_fish_tank_stand', 'aquarium tank stand', 'furniture', ['home', 'aquarium'], { x: 1.2, y: 1.6, z: 0.6 }, 'aquatic'),
  prop('cine_terrarium_table', 'cine_prop_terrarium_table', 'terrarium display table', 'decor', ['home', 'garden'], { x: 1.1, y: 0.9, z: 0.7 }, 'greenspace'),

  // Retail fixtures
  prop('cine_shop_mannequin', 'cine_prop_shop_mannequin', 'garment shop mannequin', 'anomaly', ['retail', 'mall'], { x: 0.6, y: 1.9, z: 0.4 }, 'retail'),
  prop('cine_display_shelf', 'cine_prop_display_shelf', 'slatwall display shelf', 'fixture', ['retail', 'mall'], { x: 1.8, y: 2.0, z: 0.4 }, 'retail'),
  prop('cine_jewelry_counter', 'cine_prop_jewelry_counter', 'glass jewelry counter', 'furniture', ['retail', 'mall'], { x: 1.9, y: 1.1, z: 0.8 }, 'retail'),
  prop('cine_clothing_rack', 'cine_prop_clothing_rack', 'rolling clothing rack', 'fixture', ['retail', 'mall'], { x: 1.5, y: 1.8, z: 0.8 }, 'retail'),
  prop('cine_shoe_display', 'cine_prop_shoe_display', 'tiered shoe display', 'furniture', ['retail', 'mall'], { x: 1.4, y: 1.3, z: 0.6 }, 'retail'),
  prop('cine_bakery_case', 'cine_prop_bakery_case', 'bakery display case', 'furniture', ['food', 'retail'], { x: 2.2, y: 1.3, z: 0.8 }, 'retail'),
  prop('cine_butcher_counter', 'cine_prop_butcher_counter', 'butcher service counter', 'furniture', ['food', 'retail'], { x: 2.0, y: 1.2, z: 0.9 }, 'retail'),
  prop('cine_produce_bin', 'cine_prop_produce_bin', 'produce display bin', 'fixture', ['food', 'retail'], { x: 1.6, y: 1.0, z: 0.9 }, 'retail'),
  prop('cine_freezer_island', 'cine_prop_freezer_island', 'open freezer island', 'fixture', ['food', 'retail'], { x: 2.4, y: 1.2, z: 1.0 }, 'retail'),

  // Food service
  prop('cine_soda_fountain', 'cine_prop_soda_fountain', 'soda fountain dispenser', 'fixture', ['food', 'retail'], { x: 1.4, y: 1.5, z: 0.5 }, 'retail'),
  prop('cine_espresso_machine', 'cine_prop_espresso_machine', 'commercial espresso machine', 'fixture', ['food', 'retail'], { x: 1.0, y: 1.4, z: 0.7 }, 'kitchen'),
  prop('cine_food_truck_counter', 'cine_prop_food_truck_counter', 'food truck service counter', 'furniture', ['food', 'roadside'], { x: 2.2, y: 1.3, z: 1.0 }, 'retail'),
  prop('cine_bbq_grill', 'cine_prop_bbq_grill', 'commercial barbecue grill', 'fixture', ['food', 'park'], { x: 1.3, y: 1.2, z: 0.8 }, 'industrial'),
  prop('cine_campfire_ring', 'cine_prop_campfire_ring', 'campfire ring and logs', 'decor', ['park', 'outdoor'], { x: 1.4, y: 0.5, z: 1.4 }, 'industrial'),
  prop('cine_umbrella_table', 'cine_prop_umbrella_table', 'patio umbrella table', 'furniture', ['food', 'outdoor'], { x: 1.2, y: 2.4, z: 1.2 }, 'table'),
];

const being = (
  id: string,
  kind: CinematicHumanoidKind | CinematicCreatureKind,
  label: string,
  category: 'npc' | 'creature',
  tags: string[],
  scale: { x: number; y: number; z: number },
  behavior: EntityBehavior,
): CinematicFamilyDefinition => ({ id, kind, label, category, tags, scale, behavior });

export const CINEMATIC_BEING_FAMILIES: CinematicFamilyDefinition[] = [
  // Service / food staff
  being('cine_npc_barista', 'cine_figure_barista', 'counter barista', 'npc', ['food', 'retail', 'service'], { x: 0.98, y: 2.5, z: 0.8 }, 'wander'),
  being('cine_npc_chef', 'cine_figure_chef', 'line cook chef', 'npc', ['food', 'kitchen', 'service'], { x: 1.0, y: 2.5, z: 0.82 }, 'wander'),
  being('cine_npc_server', 'cine_figure_server', 'dining room server', 'npc', ['food', 'hotel', 'service'], { x: 0.96, y: 2.5, z: 0.78 }, 'wander'),
  being('cine_npc_bartender', 'cine_figure_bartender', 'lounge bartender', 'npc', ['food', 'hotel', 'bar'], { x: 1.0, y: 2.52, z: 0.82 }, 'stare'),
  being('cine_npc_waiter', 'cine_figure_waiter', 'banquet waiter', 'npc', ['food', 'banquet', 'service'], { x: 0.96, y: 2.5, z: 0.78 }, 'wander'),
  being('cine_npc_food_truck_cook', 'cine_figure_food_truck_cook', 'food truck cook', 'npc', ['food', 'roadside', 'service'], { x: 1.02, y: 2.52, z: 0.84 }, 'wander'),
  being('cine_npc_baker', 'cine_figure_baker', 'bakery bread baker', 'npc', ['food', 'retail', 'service'], { x: 1.0, y: 2.5, z: 0.82 }, 'idle'),
  being('cine_npc_butcher', 'cine_figure_butcher', 'market butcher', 'npc', ['food', 'retail', 'service'], { x: 1.04, y: 2.55, z: 0.86 }, 'idle'),
  being('cine_npc_shopkeeper', 'cine_figure_shopkeeper', 'corner shopkeeper', 'npc', ['retail', 'mall', 'service'], { x: 0.96, y: 2.5, z: 0.78 }, 'stare'),

  // Hotel / hospitality
  being('cine_npc_porter', 'cine_figure_porter', 'luggage porter', 'npc', ['hotel', 'lobby', 'service'], { x: 1.0, y: 2.55, z: 0.84 }, 'wander'),
  being('cine_npc_concierge', 'cine_figure_concierge', 'lobby concierge', 'npc', ['hotel', 'lobby', 'service'], { x: 0.98, y: 2.5, z: 0.8 }, 'stare'),
  being('cine_npc_housekeeper', 'cine_figure_housekeeper', 'linen housekeeper', 'npc', ['hotel', 'laundry', 'service'], { x: 0.96, y: 2.48, z: 0.78 }, 'wander'),
  being('cine_npc_security_officer', 'cine_figure_security_officer', 'lobby security officer', 'npc', ['hotel', 'office', 'civic'], { x: 1.04, y: 2.55, z: 0.86 }, 'stare'),
  being('cine_npc_technician', 'cine_figure_technician', 'building systems technician', 'npc', ['office', 'industrial', 'service'], { x: 1.0, y: 2.5, z: 0.82 }, 'wander'),
  being('cine_npc_driver', 'cine_figure_driver', 'shuttle driver', 'npc', ['roadside', 'transit', 'service'], { x: 1.02, y: 2.5, z: 0.84 }, 'idle'),
  being('cine_npc_delivery_courier', 'cine_figure_delivery_courier', 'parcel delivery courier', 'npc', ['office', 'transit', 'service'], { x: 1.0, y: 2.5, z: 0.8 }, 'wander'),

  // Retail / service staff
  being('cine_npc_florist', 'cine_figure_florist', 'flower shop florist', 'npc', ['retail', 'garden', 'service'], { x: 0.96, y: 2.48, z: 0.78 }, 'wander'),
  being('cine_npc_gardener', 'cine_figure_gardener', 'grounds gardener', 'npc', ['garden', 'park', 'outdoor'], { x: 1.04, y: 2.52, z: 0.86 }, 'wander'),

  // Education / library / culture
  being('cine_npc_bookseller', 'cine_figure_bookseller', 'independent bookseller', 'npc', ['retail', 'library', 'service'], { x: 0.96, y: 2.5, z: 0.78 }, 'stare'),
  being('cine_npc_librarian', 'cine_figure_librarian', 'reference librarian', 'npc', ['library', 'school', 'archive'], { x: 0.98, y: 2.5, z: 0.8 }, 'idle'),
  being('cine_npc_archivist', 'cine_figure_archivist', 'records archivist', 'npc', ['archive', 'civic', 'office'], { x: 0.96, y: 2.48, z: 0.78 }, 'wander'),
  being('cine_npc_curator', 'cine_figure_curator', 'museum curator', 'npc', ['museum', 'ceremonial'], { x: 0.98, y: 2.5, z: 0.8 }, 'stare'),
  being('cine_npc_artist', 'cine_figure_artist', 'studio artist', 'npc', ['studio', 'museum', 'leisure'], { x: 0.96, y: 2.48, z: 0.78 }, 'idle'),
  being('cine_npc_photographer', 'cine_figure_photographer', 'event photographer', 'npc', ['leisure', 'ceremonial', 'event'], { x: 0.96, y: 2.48, z: 0.78 }, 'wander'),
  being('cine_npc_musician', 'cine_figure_musician', 'performing musician', 'npc', ['theater', 'leisure', 'event'], { x: 1.0, y: 2.52, z: 0.82 }, 'stare'),
  being('cine_npc_teacher', 'cine_figure_teacher', 'classroom teacher', 'npc', ['school', 'education'], { x: 0.98, y: 2.5, z: 0.8 }, 'stare'),

  // Health / wellness
  being('cine_npc_lab_assistant', 'cine_figure_lab_assistant', 'laboratory assistant', 'npc', ['lab', 'school', 'clinical'], { x: 0.96, y: 2.48, z: 0.78 }, 'wander'),
  being('cine_npc_pharmacist', 'cine_figure_pharmacist', 'duty pharmacist', 'npc', ['clinic', 'retail', 'clinical'], { x: 0.98, y: 2.5, z: 0.8 }, 'idle'),
  being('cine_npc_nurse', 'cine_figure_nurse_practitioner', 'nurse practitioner', 'npc', ['clinic', 'hospital', 'clinical'], { x: 0.98, y: 2.5, z: 0.8 }, 'wander'),
  being('cine_npc_therapist', 'cine_figure_physical_therapist', 'physical therapist', 'npc', ['clinic', 'gym', 'clinical'], { x: 0.98, y: 2.5, z: 0.8 }, 'wander'),
  being('cine_npc_personal_trainer', 'cine_figure_personal_trainer', 'personal trainer', 'npc', ['gym', 'leisure'], { x: 1.02, y: 2.55, z: 0.84 }, 'wander'),
  being('cine_npc_swim_instructor', 'cine_figure_swim_instructor', 'pool swim instructor', 'npc', ['pool', 'aquatic', 'leisure'], { x: 1.0, y: 2.5, z: 0.82 }, 'wander'),
  being('cine_npc_stadium_attendant', 'cine_figure_stadium_attendant', 'stadium usher', 'npc', ['stadium', 'leisure', 'event'], { x: 0.98, y: 2.5, z: 0.8 }, 'wander'),

  // Transport / civic
  being('cine_npc_gate_agent', 'cine_figure_gate_agent', 'airline gate agent', 'npc', ['airport', 'transit', 'service'], { x: 0.98, y: 2.5, z: 0.8 }, 'idle'),
  being('cine_npc_pilot', 'cine_figure_pilot', 'uniformed pilot', 'npc', ['airport', 'transit'], { x: 1.0, y: 2.5, z: 0.82 }, 'stare'),
  being('cine_npc_train_operator', 'cine_figure_train_operator', 'subway train operator', 'npc', ['station', 'transit'], { x: 1.0, y: 2.5, z: 0.82 }, 'idle'),
  being('cine_npc_bus_driver', 'cine_figure_bus_driver', 'city bus driver', 'npc', ['roadside', 'transit', 'service'], { x: 1.02, y: 2.5, z: 0.84 }, 'idle'),

  // Professional / technical
  being('cine_npc_architect', 'cine_figure_architect', 'drafting architect', 'npc', ['office', 'civic', 'architecture'], { x: 0.98, y: 2.5, z: 0.8 }, 'stare'),
  being('cine_npc_engineer', 'cine_figure_engineer', 'systems engineer', 'npc', ['office', 'industrial', 'technology'], { x: 1.0, y: 2.5, z: 0.82 }, 'wander'),
  being('cine_npc_researcher', 'cine_figure_researcher', 'field researcher', 'npc', ['lab', 'school', 'archive'], { x: 0.96, y: 2.48, z: 0.78 }, 'wander'),

  // Domestic pets
  being('cine_creature_house_cat', 'cine_animal_house_cat', 'dozing house cat', 'creature', ['home', 'domestic'], { x: 0.7, y: 0.75, z: 1.1 }, 'wander'),
  being('cine_creature_labrador', 'cine_animal_labrador', 'friendly labrador', 'creature', ['home', 'park', 'domestic'], { x: 1.0, y: 1.15, z: 1.5 }, 'wander'),
  being('cine_creature_border_collie', 'cine_animal_border_collie', 'watchful border collie', 'creature', ['home', 'farm', 'park'], { x: 0.95, y: 1.1, z: 1.5 }, 'stare'),
  being('cine_creature_goldfish', 'cine_animal_goldfish', 'tank goldfish', 'creature', ['home', 'aquarium', 'domestic'], { x: 0.4, y: 0.35, z: 0.9 }, 'idle'),
  being('cine_creature_koi', 'cine_animal_koi', 'pond koi', 'creature', ['garden', 'aquatic'], { x: 0.5, y: 0.4, z: 1.2 }, 'wander'),
  being('cine_creature_budgerigar', 'cine_animal_budgerigar', 'perched budgerigar', 'creature', ['home', 'domestic'], { x: 0.28, y: 0.4, z: 0.35 }, 'idle'),
  being('cine_creature_cockatiel', 'cine_animal_cockatiel', 'crested cockatiel', 'creature', ['home', 'domestic'], { x: 0.3, y: 0.42, z: 0.38 }, 'idle'),
  being('cine_creature_hamster', 'cine_animal_hamster', 'wheel-running hamster', 'creature', ['home', 'nursery', 'domestic'], { x: 0.3, y: 0.28, z: 0.45 }, 'wander'),
  being('cine_creature_guinea_pig', 'cine_animal_guinea_pig', 'snuffling guinea pig', 'creature', ['home', 'nursery', 'domestic'], { x: 0.35, y: 0.3, z: 0.55 }, 'wander'),
  being('cine_creature_rabbit', 'cine_animal_rabbit', 'long-eared pet rabbit', 'creature', ['home', 'garden', 'domestic'], { x: 0.4, y: 0.5, z: 0.6 }, 'wander'),
  being('cine_creature_ferret', 'cine_animal_ferret', 'curious ferret', 'creature', ['home', 'domestic'], { x: 0.6, y: 0.4, z: 0.3 }, 'wander'),
  being('cine_creature_turtle', 'cine_animal_turtle', 'slow-moving pet turtle', 'creature', ['home', 'garden', 'aquatic'], { x: 0.45, y: 0.25, z: 0.7 }, 'idle'),
  being('cine_creature_gecko', 'cine_animal_gecko', 'terrarium gecko', 'creature', ['home', 'garden', 'aquatic'], { x: 0.4, y: 0.3, z: 0.5 }, 'idle'),
  being('cine_creature_chameleon', 'cine_animal_chameleon', 'color-shifting chameleon', 'creature', ['home', 'garden'], { x: 0.4, y: 0.35, z: 0.6 }, 'stare'),
  being('cine_creature_parrot', 'cine_animal_parrot', 'talking parrot', 'creature', ['home', 'leisure'], { x: 0.4, y: 0.5, z: 0.45 }, 'idle'),
  being('cine_creature_canary', 'cine_animal_canary', 'singing canary', 'creature', ['home', 'domestic'], { x: 0.22, y: 0.3, z: 0.28 }, 'idle'),

  // Birds
  being('cine_creature_pigeon', 'cine_animal_pigeon', 'plaza pigeon', 'creature', ['park', 'courtyard', 'plaza'], { x: 0.4, y: 0.4, z: 0.5 }, 'wander'),
  being('cine_creature_robin', 'cine_animal_robin', 'garden robin', 'creature', ['garden', 'park'], { x: 0.28, y: 0.3, z: 0.35 }, 'wander'),
  being('cine_creature_sparrow', 'cine_animal_sparrow', 'sidewalk sparrow', 'creature', ['park', 'plaza', 'outdoor'], { x: 0.22, y: 0.25, z: 0.3 }, 'wander'),

  // Mammals
  being('cine_creature_squirrel', 'cine_animal_squirrel', 'park squirrel', 'creature', ['park', 'garden', 'outdoor'], { x: 0.5, y: 0.6, z: 0.6 }, 'wander'),
  being('cine_creature_raccoon', 'cine_animal_raccoon', 'trash-can raccoon', 'creature', ['park', 'roadside', 'night'], { x: 0.8, y: 0.6, z: 1.0 }, 'wander'),
  being('cine_creature_fox', 'cine_animal_fox', 'orchard fox', 'creature', ['park', 'garden', 'outdoor'], { x: 0.8, y: 0.75, z: 1.4 }, 'stare'),
  being('cine_creature_deer', 'cine_animal_deer', 'meadow deer', 'creature', ['park', 'meadow', 'outdoor'], { x: 1.0, y: 1.8, z: 1.6 }, 'wander'),
  being('cine_creature_horse', 'cine_animal_horse', 'riding horse', 'creature', ['farm', 'outdoor', 'park'], { x: 1.4, y: 2.2, z: 2.4 }, 'stare'),
  being('cine_creature_pony', 'cine_animal_pony', 'gentle pony', 'creature', ['farm', 'park', 'outdoor'], { x: 1.2, y: 1.7, z: 2.0 }, 'wander'),
  being('cine_creature_donkey', 'cine_animal_donkey', 'patient donkey', 'creature', ['farm', 'outdoor'], { x: 1.2, y: 1.7, z: 2.0 }, 'idle'),
  being('cine_creature_goat', 'cine_animal_goat', 'curious goat', 'creature', ['farm', 'park', 'outdoor'], { x: 0.9, y: 0.9, z: 1.2 }, 'wander'),
  being('cine_creature_sheep', 'cine_animal_sheep', 'fluffy sheep', 'creature', ['farm', 'meadow', 'outdoor'], { x: 1.0, y: 0.9, z: 1.3 }, 'wander'),
  being('cine_creature_cow', 'cine_animal_cow', 'milking cow', 'creature', ['farm', 'meadow', 'outdoor'], { x: 1.4, y: 1.5, z: 2.0 }, 'idle'),
  being('cine_creature_pig', 'cine_animal_pig', 'muddy farm pig', 'creature', ['farm', 'outdoor'], { x: 1.1, y: 0.9, z: 1.4 }, 'wander'),
  being('cine_creature_chicken', 'cine_animal_chicken', 'pecking hen', 'creature', ['farm', 'outdoor'], { x: 0.5, y: 0.55, z: 0.6 }, 'wander'),
  being('cine_creature_duck', 'cine_animal_duck', 'pond duck', 'creature', ['farm', 'park', 'aquatic'], { x: 0.5, y: 0.5, z: 0.7 }, 'wander'),
  being('cine_creature_goose', 'cine_animal_goose', 'honking goose', 'creature', ['farm', 'park', 'aquatic'], { x: 0.6, y: 0.8, z: 0.8 }, 'wander'),
  being('cine_creature_turkey', 'cine_animal_turkey', 'strut turkey', 'creature', ['farm', 'outdoor'], { x: 0.7, y: 0.9, z: 0.8 }, 'wander'),

  // Wild / water
  being('cine_creature_otter', 'cine_animal_otter', 'slippery river otter', 'creature', ['park', 'aquatic', 'outdoor'], { x: 0.7, y: 0.4, z: 1.0 }, 'wander'),
  being('cine_creature_sea_lion', 'cine_animal_sea_lion', 'dockside sea lion', 'creature', ['aquatic', 'outdoor'], { x: 1.4, y: 0.9, z: 1.2 }, 'wander'),
  being('cine_creature_dolphin', 'cine_animal_dolphin', 'tank dolphin', 'creature', ['aquarium', 'aquatic'], { x: 1.4, y: 1.0, z: 2.2 }, 'orbit'),
  being('cine_creature_whale_shark', 'cine_animal_whale_shark', 'slow whale shark', 'creature', ['aquarium', 'aquatic'], { x: 1.8, y: 1.0, z: 3.2 }, 'orbit'),
  being('cine_creature_octopus', 'cine_animal_octopus', 'tank octopus', 'creature', ['aquarium', 'aquatic'], { x: 1.0, y: 1.0, z: 1.0 }, 'orbit'),
  being('cine_creature_stingray', 'cine_animal_stingray', 'gliding stingray', 'creature', ['aquarium', 'aquatic'], { x: 1.2, y: 0.4, z: 1.4 }, 'orbit'),
];

export const CINEMATIC_FAMILY_DEFINITIONS = [
  ...CINEMATIC_PROP_FAMILIES,
  ...CINEMATIC_BEING_FAMILIES,
];

export const CINEMATIC_BOUNDS: Record<CinematicModelKind, { w: number; h: number; d: number }> =
  Object.fromEntries(CINEMATIC_FAMILY_DEFINITIONS.map((family) => [
    family.kind,
    { w: family.scale.x, h: family.scale.y, d: family.scale.z },
  ])) as Record<CinematicModelKind, { w: number; h: number; d: number }>;

const VARIANT_LABELS = [
  'polished',
  'mint-condition',
  'warmly lit',
  'gently worn',
  'freshly cleaned',
  'antique-finished',
  'showroom',
  'quietly loved',
] as const;

export const CINEMATIC_VARIANTS_PER_FAMILY = 8;
const ALL_MOODS: MoodAxis[] = ['upper', 'downer', 'static', 'dynamic'];

export const CINEMATIC_PROP_RENDER_COST_BY_VARIANT = [12, 13, 15, 13, 14, 16, 14, 15] as const;
export const CINEMATIC_NPC_RENDER_COST_BY_VARIANT = [20, 21, 22, 22, 23, 21, 24, 22] as const;
export const CINEMATIC_CREATURE_RENDER_COST_BY_VARIANT = [24, 25, 26, 25, 27, 24, 28, 26] as const;

function cinematicRenderCost(category: AssetCategory, variant: number): number {
  if (category === 'npc') return CINEMATIC_NPC_RENDER_COST_BY_VARIANT[variant]!;
  if (category === 'creature') return CINEMATIC_CREATURE_RENDER_COST_BY_VARIANT[variant]!;
  return CINEMATIC_PROP_RENDER_COST_BY_VARIANT[variant]!;
}

export const CINEMATIC_ASSETS: AssetDef[] = CINEMATIC_FAMILY_DEFINITIONS.flatMap(
  (family) => Array.from({ length: CINEMATIC_VARIANTS_PER_FAMILY }, (_, variant) => ({
    id: `${family.id}_${String(variant + 1).padStart(2, '0')}`,
    kind: family.kind,
    label: `${VARIANT_LABELS[variant]} ${family.label}`,
    category: family.category,
    tags: [...family.tags, 'high-detail', 'cinematic'],
    setIds: sceneSetIdsForTags(family.tags),
    moods: [...ALL_MOODS],
    defaultScale: { ...family.scale },
    scaleRange: {
      min: family.category === 'npc' || family.category === 'creature' ? 0.82 : 0.72,
      max: family.category === 'npc' || family.category === 'creature' ? 1.7 : 1.62,
    },
    defaultBehavior: family.behavior,
    linksByDefault: false,
    solidDefault: family.category !== 'npc' && family.category !== 'creature',
    weight: family.category === 'npc' ? 1.05 : family.category === 'creature' ? 0.95 : 1.25,
    renderCost: cinematicRenderCost(family.category, variant),
    family: family.id,
    variant,
  })),
);

export const CINEMATIC_PROP_ASSET_COUNT = CINEMATIC_ASSETS.filter(
  (asset) => asset.category !== 'npc' && asset.category !== 'creature',
).length;
export const CINEMATIC_BEING_ASSET_COUNT = CINEMATIC_ASSETS.filter(
  (asset) => asset.category === 'npc' || asset.category === 'creature',
).length;
export const CINEMATIC_ASSET_COUNT = CINEMATIC_ASSETS.length;

export function isCinematicModelKind(kind: string): kind is CinematicModelKind {
  return kind in CINEMATIC_BOUNDS;
}

export function cinematicFamilyForKind(kind: CinematicModelKind): CinematicFamilyDefinition {
  return CINEMATIC_FAMILY_DEFINITIONS.find((family) => family.kind === kind)!;
}
