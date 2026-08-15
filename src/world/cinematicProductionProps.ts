import * as THREE from 'three';
import { buildExpandedProductionProp } from './expandedPropModels';

type Bounds = { w: number; h: number; d: number };

/**
 * Reuse a verified production construction when a cinematic catalogue name is
 * genuinely the same real-world object. This runs before the broad cinematic
 * form chassis, which previously turned gates, carts, shelters, and machinery
 * into interchangeable cabinets and tables.
 */
export function buildCinematicProductionProp(
  kind: string,
  variant: number,
  accent: string,
  body: string,
  bounds: Bounds,
): THREE.Group | null {
  if (!kind.startsWith('cine_prop_')) return null;
  const key = kind.slice('cine_prop_'.length);
  const productionKind = productionKindFor(key);
  if (!productionKind) return null;

  const semanticVariant = (variant + key.length) % 8;
  const model = buildExpandedProductionProp(
    productionKind,
    semanticVariant,
    accent,
    body,
    bounds,
  );
  if (!model) return null;
  model.name = `${kind}-${variant}`;
  model.userData.detailTier = 'cinematic-production-prop';
  model.userData.cinematicSourceKind = kind;
  model.userData.reusedProductionKind = productionKind;
  return model;
}

function productionKindFor(key: string): string | null {
  if (/^(planter_box_row|hanging_planter|topiary_spiral|fern_stand|palm_in_lobby_pot|monstera_floor_plant|snake_plant_planter|fruit_tree|potted_orchid|bamboo_cluster|succulent_bowl|hanging_vines|herb_tower|azalea_bush|boxwood_hedge)$/.test(key)) return 'planter';
  if (/^(water_feature|birdbath)$/.test(key)) return 'fountain';
  if (/^(platform_shelter|bus_stop_shelter)$/.test(key)) return 'bus_shelter';
  if (key === 'garden_swing') return 'swing_set';
  if (/^(dry_goods_pallet|delivery_staging)$/.test(key)) return 'pallet_stack';
  if (/^(server_cabinet|router_rack)$/.test(key)) return 'server_rack';
  if (/^(office_partition|fitting_room|construction_fence)$/.test(key)) return 'privacy_screen';
  if (key === 'grocery_trolley') return 'shopping_cart';
  if (/^(printer_station|printer_fleet)$/.test(key)) return 'copy_machine';
  if (key === 'archive_cart') return 'archive_trolley';
  if (/^(fare_gate|subway_turnstile)$/.test(key)) return 'ticket_gate';
  if (/^(arrivals_board|video_wall|billboard|evacuation_map)$/.test(key)) return 'departure_board';
  if (/^(award_case|jewelry_counter|bakery_case|butcher_counter)$/.test(key)) return 'display_case';
  if (/^(display_shelf|shoe_display|perfume_counter|sunglass_spinner)$/.test(key)) return 'retail_display';
  if (key === 'tool_cart') return 'tool_chest';
  if (/^(bottle_crate_stack|toy_box)$/.test(key)) return 'warehouse_crate';
  if (key === 'airport_luggage_trolley') return 'luggage_cart';
  if (/^(vending_island|ticket_vending)$/.test(key)) return 'snack_machine';
  if (/^(industrial_shelving|chemical_shelf|pallet_rack|ladder_rack|lumber_rack|pipe_rack)$/.test(key)) return 'utility_shelf';
  if (/^(cone_cart|traffic_barrel)$/.test(key)) return 'traffic_cone';
  if (key === 'cable_spool') return 'pipe_cluster';
  if (key === 'campfire_ring') return 'fire_barrel';
  if (/^(concrete_barrier)$/.test(key)) return 'wooden_barricade';
  if (/^(altar_table|memorial_plinth)$/.test(key)) return 'altar';
  if (key === 'laundry_stack') return 'washer';
  if (/^(hospital_trolley|imaging_cart|blood_pressure_stand)$/.test(key)) return 'medical_cart';
  if (key === 'checkout_lane') return 'checkout';
  return null;
}
