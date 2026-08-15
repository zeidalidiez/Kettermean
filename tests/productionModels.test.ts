import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { geometryForShape } from '../src/world/modelQuality';
import { buildModel, clearModelMaterialCache, type PropKind } from '../src/world/models';

afterAll(() => clearModelMaterialCache());

describe('production model regressions', () => {
  it('keeps hard-surface boxes sharp and bounded', () => {
    const box = geometryForShape('box');
    expect(box.type).toBe('BoxGeometry');
    expect(box.getAttribute('position').count).toBe(24);
  });

  it('builds a readable textured character without ornamental scatter', () => {
    const model = buildModel(
      'cine_figure_chef' as PropKind,
      '#c76635',
      '#354c5b',
      'cine_npc_chef_04',
    );
    const report = inspect(model);

    expect(report.meshes).toBeGreaterThanOrEqual(20);
    expect(report.meshes).toBeLessThan(40);
    expect(report.triangles).toBeGreaterThan(700);
    expect(report.triangles).toBeLessThan(5_000);
    expect(report.textured / report.meshes).toBeGreaterThan(0.9);
    expect(report.names).toContain('character-face-texture');
    expect(report.names).toContain('character-garment-texture');
    expect(report.names.some((name) => /(finial|medal|stamp|orbit|welt-stud|face-rivet)/.test(name))).toBe(false);
  });

  it('builds animals from coherent anatomy rather than stacked spheres', () => {
    const model = buildModel(
      'cine_animal_tiger_cub' as PropKind,
      '#c66f32',
      '#c89243',
      'cine_creature_tiger_cub_04',
    );
    const report = inspect(model);

    expect(report.meshes).toBeLessThan(35);
    expect(report.triangles).toBeLessThan(5_000);
    expect(report.names).toContain('animal-torso-fur');
    expect(report.names).toContain('animal-shoulder-fur');
    expect(report.names.some((name) => name.includes('eye-sclera'))).toBe(false);
    expect(report.names.some((name) => /(finial|stud|orbit|plinth)/.test(name))).toBe(false);
  });

  it('uses a connected radial base for cinematic office chairs', () => {
    const model = buildModel(
      'cine_prop_ergonomic_office_chair' as PropKind,
      '#3c7896',
      '#4d5964',
      'cine_ergo_office_chair_04',
    );
    const report = inspect(model);

    expect(report.names.filter((name) => name === 'oc-base-spoke')).toHaveLength(5);
    expect(report.names.filter((name) => name === 'oc-caster-wheel')).toHaveLength(5);
    expect(report.names.some((name) => /(cine-variant|finial|edge-screw|arm-stud)/.test(name))).toBe(false);
    expect(report.textured / report.meshes).toBeGreaterThan(0.9);
  });

  it.each([
    ['detail_coat_check_island', 'masterwork_coat_check_01', ['coat-check-hanger', 'hanging-fabric-coat-body']],
    ['detail_wardian_plant_case', 'exhibition_wardian_case_01', ['wardian-front-glass', 'wardian-tapered-leaf']],
    ['atelier_prop_rain_orchestra', 'atelier_rain_orchestra_01', ['rain-orchestra-chime-tube', 'rain-orchestra-catch-tray']],
    ['atelier_prop_mycology_incubator', 'atelier_mycology_incubator_01', ['cultured-mushroom-stalk', 'cultured-mushroom-cap']],
    ['detail_magic_lantern', 'exhibition_magic_lantern_01', ['magic-lantern-box-body', 'projector-glass-lens']],
    ['detail_optometrist_phoropter', 'exhibition_phoropter_01', ['phoropter-lens-housing', 'phoropter-glass-lens']],
    ['detail_seismograph_desk', 'exhibition_seismograph_01', ['seismograph-paper-drum', 'seismograph-stylus-arm']],
    ['detail_seed_archive_carousel', 'exhibition_seed_carousel_01', ['seed-carousel-center-column', 'seed-carousel-labeled-drawer']],
    ['detail_processional_canopy', 'exhibition_canopy_01', ['canopy-brass-carrying-pole', 'processional-canopy-fabric-roof']],
    ['atelier_prop_surgical_carousel', 'atelier_surgical_carousel_01', ['surgical-carousel-arm', 'surgical-hanging-instrument']],
    ['atelier_prop_ceremonial_tea_robot', 'atelier_tea_robot_01', ['tea-robot-torso', 'tea-robot-serving-tray']],
    ['atelier_prop_polar_expedition_sledge', 'atelier_polar_sledge_01', ['expedition-sledge-runner', 'expedition-sledge-wood-slat']],
  ] as const)('keeps %s identifiable from functional parts', (kind, assetId, requiredNames) => {
    const model = buildModel(kind as PropKind, '#77899a', '#9e8669', assetId);
    const report = inspect(model);

    expect(model.userData.detailTier).toBe('production-prop');
    for (const requiredName of requiredNames) expect(report.names).toContain(requiredName);
    expect(report.surfaced / report.meshes).toBeGreaterThanOrEqual(0.8);
    expect(report.names.some((name) => /(finial|medal|maker-mark|edge-screw|arm-stud)/.test(name))).toBe(false);
  });

  it.each([
    ['picnic', 'picnic_table_01', ['picnic-tabletop-plank', 'picnic-angled-trestle-leg']],
    ['lab_bench', 'lab_bench_01', ['lab-chemical-resistant-worktop', 'lab-reagent-bottle']],
    ['greenhouse_table', 'greenhouse_table_01', ['greenhouse-worktop-slat', 'greenhouse-terracotta-pot']],
  ] as const)('builds %s as recognizable everyday equipment', (kind, assetId, requiredNames) => {
    const report = inspect(buildModel(kind as PropKind, '#77899a', '#9e8669', assetId));
    for (const requiredName of requiredNames) expect(report.names).toContain(requiredName);
    expect(report.rounded / report.meshes).toBeLessThan(0.55);
  });

  it.each([
    ['display_case', 'display_case_01', ['display-case-front-glass', 'display-case-curated-object']],
    ['planter', 'planter_01', ['planter-visible-soil', 'planter-branch']],
    ['tree', 'tree_01', ['tree-tapered-trunk', 'tree-structural-branch']],
    ['fountain', 'fountain_01', ['fountain-lower-basin-rim', 'fountain-center-water-jet']],
    ['bus_shelter', 'bus_shelter_01', ['bus-shelter-back-glass', 'bus-shelter-bench-seat']],
    ['swing_set', 'swing_set_01', ['swing-set-a-frame-leg', 'swing-set-seat']],
    ['pallet_stack', 'pallet_stack_01', ['pallet-deck-slat', 'pallet-load-bearing-stringer']],
    ['server_rack', 'server_rack_01', ['server-rack-blade', 'server-rack-status-led']],
    ['privacy_screen', 'privacy_screen_01', ['privacy-screen-washable-fabric', 'privacy-screen-stabilizing-foot']],
    ['shopping_cart', 'shopping_cart_01', ['shopping-cart-basket-rib', 'shopping-cart-caster-wheel']],
    ['copy_machine', 'copy_machine_01', ['copier-scanner-glass', 'copier-output-tray']],
    ['archive_trolley', 'archive_trolley_01', ['archive-trolley-book-shelf', 'archive-trolley-book']],
    ['ticket_gate', 'ticket_gate_01', ['ticket-gate-card-reader', 'ticket-gate-swing-arm']],
    ['departure_board', 'departure_board_01', ['departure-board-black-display', 'departure-board-split-flap-character']],
    ['retail_display', 'retail_display_01', ['retail-island-display-tier', 'retail-island-boxed-product']],
    ['tool_chest', 'tool_chest_01', ['tool-chest-drawer-front', 'tool-chest-caster']],
    ['drum_stack', 'drum_stack_01', ['industrial-steel-drum', 'industrial-drum-reinforcing-band']],
    ['luggage_cart', 'luggage_cart_01', ['luggage-cart-suitcase', 'luggage-cart-overhead-rail']],
    ['room_service', 'room_service_01', ['room-service-serving-deck', 'room-service-cloche-dome']],
    ['traffic_cone', 'traffic_cone_01', ['traffic-cone-square-rubber-base', 'traffic-cone-reflective-band']],
    ['exercise_bike', 'exercise_bike_01', ['exercise-bike-flywheel', 'exercise-bike-pedal-crank']],
    ['pool_ladder', 'pool_ladder_01', ['pool-ladder-curved-grab-section', 'pool-ladder-nonslip-rung']],
    ['utility_shelf', 'utility_shelf_01', ['utility-shelf-deck', 'utility-shelf-labeled-supply']],
    ['breaker_panel', 'breaker_panel_01', ['breaker-panel-toggle', 'breaker-panel-conduit']],
    ['boiler', 'boiler_01', ['boiler-pressure-vessel', 'boiler-pressure-gauge']],
    ['pipe_cluster', 'pipe_cluster_01', ['pipe-cluster-vertical-run', 'pipe-cluster-cross-main']],
    ['snack_machine', 'snack_machine_01', ['snack-machine-product-bag', 'snack-machine-delivery-bin']],
    ['luggage_pile', 'luggage_pile_01', ['luggage-pile-suitcase', 'luggage-pile-case-handle']],
    ['market_stall', 'market_stall_01', ['market-stall-striped-canopy', 'market-stall-produce-crate']],
    ['maintenance_sink', 'maintenance_sink_01', ['maintenance-sink-deep-basin', 'maintenance-sink-faucet-spout']],
    ['rubble_pile', 'rubble_pile_01', ['rubble-pile-broken-masonry', 'rubble-pile-exposed-rebar']],
    ['fire_barrel', 'fire_barrel_01', ['fire-barrel-steel-drum', 'fire-barrel-flame']],
    ['broken_column', 'broken_column_01', ['broken-column-fluted-shaft', 'broken-column-jagged-break']],
    ['collapsed_beam', 'collapsed_beam_01', ['collapsed-structural-i-beam', 'collapsed-beam-rubble']],
    ['wooden_barricade', 'wooden_barricade_01', ['barricade-a-frame-leg', 'barricade-warning-stripe']],
    ['altar', 'altar_01', ['altar-table-slab', 'altar-open-book']],
    ['warehouse_crate', 'warehouse_crate_01', ['shipping-crate-diagonal-brace', 'shipping-crate-stenciled-label']],
    ['generator', 'generator_01', ['generator-engine-block', 'generator-power-socket']],
    ['telescope', 'telescope_01', ['telescope-optical-tube', 'telescope-objective-lens']],
    ['washer', 'washer_01', ['washer-door-glass', 'washer-program-dial']],
    ['medical_cart', 'medical_cart_01', ['medical-cart-instrument-tray', 'medical-cart-supply-bottle']],
    ['checkout', 'checkout_01', ['checkout-conveyor-belt', 'checkout-register-display']],
  ] as const)('rebuilds expanded %s from object-specific parts', (kind, assetId, requiredNames) => {
    const model = buildModel(kind as PropKind, '#77899a', '#9e8669', assetId);
    const report = inspect(model);
    expect(model.userData.detailTier).toBe('expanded-production-prop');
    for (const requiredName of requiredNames) expect(report.names).toContain(requiredName);
    expect(report.meshes).toBeLessThan(70);
    expect(report.rounded / report.meshes).toBeLessThan(0.55);
  });

  it.each([
    ['cine_prop_topiary_spiral', 'planter', ['planter-visible-soil', 'planter-leaf-cluster']],
    ['cine_prop_water_feature', 'fountain', ['fountain-lower-basin-rim', 'fountain-center-water-jet']],
    ['cine_prop_bus_stop_shelter', 'bus_shelter', ['bus-shelter-back-glass', 'bus-shelter-bench-seat']],
    ['cine_prop_garden_swing', 'swing_set', ['swing-set-a-frame-leg', 'swing-set-seat']],
    ['cine_prop_server_cabinet', 'server_rack', ['server-rack-blade', 'server-rack-status-led']],
    ['cine_prop_grocery_trolley', 'shopping_cart', ['shopping-cart-basket-rib', 'shopping-cart-caster-wheel']],
    ['cine_prop_printer_fleet', 'copy_machine', ['copier-scanner-glass', 'copier-output-tray']],
    ['cine_prop_fare_gate', 'ticket_gate', ['ticket-gate-card-reader', 'ticket-gate-swing-arm']],
    ['cine_prop_arrivals_board', 'departure_board', ['departure-board-black-display', 'departure-board-split-flap-character']],
    ['cine_prop_jewelry_counter', 'display_case', ['display-case-front-glass', 'display-case-curated-object']],
    ['cine_prop_tool_cart', 'tool_chest', ['tool-chest-drawer-front', 'tool-chest-caster']],
    ['cine_prop_airport_luggage_trolley', 'luggage_cart', ['luggage-cart-suitcase', 'luggage-cart-overhead-rail']],
    ['cine_prop_ticket_vending', 'snack_machine', ['snack-machine-product-bag', 'snack-machine-delivery-bin']],
    ['cine_prop_laundry_stack', 'washer', ['washer-door-glass', 'washer-program-dial']],
    ['cine_prop_imaging_cart', 'medical_cart', ['medical-cart-instrument-tray', 'medical-cart-supply-bottle']],
    ['cine_prop_checkout_lane', 'checkout', ['checkout-conveyor-belt', 'checkout-register-display']],
  ] as const)('routes %s through the verified %s production model', (kind, productionKind, requiredNames) => {
    const model = buildModel(kind as PropKind, '#77899a', '#9e8669', `${kind}_01`);
    const report = inspect(model);
    expect(model.userData.detailTier).toBe('cinematic-production-prop');
    expect(model.userData.reusedProductionKind).toBe(productionKind);
    for (const requiredName of requiredNames) expect(report.names).toContain(requiredName);
  });

  it.each([
    ['cine_prop_forklift', ['forklift-lift-mast', 'forklift-load-fork']],
    ['cine_prop_pallet_jack', ['pallet-jack-lifting-fork', 'pallet-jack-steering-handle']],
    ['cine_prop_conveyor_section', ['conveyor-side-frame', 'conveyor-driven-roller']],
    ['cine_prop_rooftop_ac_unit', ['rooftop-ac-weather-housing', 'rooftop-ac-condenser-fan']],
    ['cine_prop_bbq_grill', ['bbq-grill-firebox', 'bbq-grill-cooking-grate']],
    ['cine_prop_vacuum_stand', ['vacuum-motor-canister', 'vacuum-floor-head']],
    ['cine_prop_scaffold_section', ['scaffold-vertical-tube', 'scaffold-work-platform']],
    ['cine_prop_drill_press_stand', ['drill-press-column', 'drill-press-bit']],
    ['cine_prop_pool_table', ['game-table-playing-surface', 'pool-table-ball']],
    ['cine_prop_treadmill', ['treadmill-running-belt', 'treadmill-control-console']],
    ['cine_prop_rowing_machine', ['rowing-machine-seat-rail', 'rowing-machine-pull-handle']],
    ['cine_prop_basketball_hoop', ['basketball-backboard', 'basketball-rim']],
    ['cine_prop_excavator_toy', ['toy-vehicle-chassis', 'toy-vehicle-lifting-boom']],
    ['cine_prop_robot_toy', ['toy-robot-torso', 'toy-robot-eye']],
    ['cine_prop_stuffed_rabbit', ['stuffed-animal-torso', 'stuffed-rabbit-ear']],
  ] as const)('gives %s functional cinematic geometry', (kind, requiredNames) => {
    const model = buildModel(kind as PropKind, '#77899a', '#9e8669', `${kind}_01`);
    const report = inspect(model);
    expect(model.userData.detailTier).toBe('cinematic-production-prop');
    expect(model.userData.productionCinematicProp).toBe(true);
    for (const requiredName of requiredNames) expect(report.names).toContain(requiredName);
    expect(report.meshes).toBeLessThan(80);
    if (kind.includes('stuffed_')) expect(report.rounded / report.meshes).toBeLessThan(0.4);
  });

  it.each([
    ['cine_prop_wheelchair', ['wheelchair-drive-wheel', 'wheelchair-footrest']],
    ['cine_prop_lab_fume_hood', ['fume-hood-sliding-sash', 'fume-hood-exhaust-duct']],
    ['cine_prop_microscope_station', ['microscope-optical-tube', 'microscope-specimen-stage']],
    ['cine_prop_centrifuge_bench', ['centrifuge-machine-body', 'centrifuge-sample-tube']],
    ['cine_prop_icu_monitor_stand', ['icu-monitor-vital-display', 'icu-monitor-waveform']],
    ['cine_prop_baggage_carousel', ['baggage-carousel-moving-belt', 'baggage-carousel-suitcase']],
    ['cine_prop_security_scanner', ['security-scanner-arch-column', 'security-scanner-sensor-array']],
    ['cine_prop_escalator_end', ['escalator-visible-step', 'escalator-balustrade']],
    ['cine_prop_pinball_machine', ['pinball-playfield-glass', 'pinball-backbox']],
    ['cine_prop_stage_lighting_rig', ['lighting-rig-top-truss', 'stage-light-can']],
    ['cine_prop_concert_speaker_stack', ['speaker-stack-cabinet', 'speaker-stack-driver']],
    ['cine_prop_drone_dock', ['drone-cross-arm', 'drone-rotor']],
    ['cine_prop_rooftop_solar_rig', ['solar-rig-photovoltaic-panel', 'solar-rig-cell-divider']],
    ['cine_prop_whiteboard', ['whiteboard-writing-surface', 'whiteboard-marker-tray']],
    ['cine_prop_pool_lane_marker', ['pool-lane-tension-rope', 'pool-lane-divider-float']],
  ] as const)('gives %s an object-specific production silhouette', (kind, requiredNames) => {
    const model = buildModel(kind as PropKind, '#77899a', '#9e8669', `${kind}_01`);
    const report = inspect(model);
    expect(model.userData.detailTier).toBe('cinematic-production-prop');
    expect(model.userData.productionCinematicProp).toBe(true);
    for (const requiredName of requiredNames) expect(report.names).toContain(requiredName);
    expect(report.meshes).toBeLessThan(80);
  });

  it.each([
    ['cine_prop_bonsai_table', ['bonsai-contorted-trunk', 'bonsai-clipped-foliage-pad']],
    ['cine_prop_herb_garden_shelf', ['herb-shelf-slatted-deck', 'herb-shelf-edible-leaf']],
    ['cine_prop_greenhouse_bench', ['greenhouse-bench-worktop-slat', 'greenhouse-bench-seedling']],
    ['cine_prop_terrarium_table', ['terrarium-front-glass', 'terrarium-climbing-branch']],
    ['cine_prop_picnic_basket', ['picnic-basket-woven-body', 'picnic-basket-carry-handle']],
    ['cine_prop_rose_arbor', ['rose-arbor-arched-rafter', 'rose-arbor-bloom']],
    ['cine_prop_garden_obelisk', ['garden-obelisk-tapered-rail', 'garden-obelisk-cross-tie']],
    ['cine_prop_beach_umbrella', ['beach-umbrella-striped-canopy', 'beach-umbrella-canopy-rib']],
    ['cine_prop_hammock_stand', ['hammock-stand-rising-support', 'hammock-sagging-fabric-panel']],
    ['cine_prop_greenhouse_frame', ['greenhouse-frame-roof-rafter', 'greenhouse-clear-roof-panel']],
    ['cine_prop_cold_frame', ['cold-frame-sloped-glass-lid', 'cold-frame-seedling']],
    ['cine_prop_potting_shed', ['potting-shed-plank-door', 'potting-shed-pitched-roof']],
  ] as const)('constructs %s from recognizable greenspace parts', (kind, requiredNames) => {
    const model = buildModel(kind as PropKind, '#668d52', '#8b7052', `${kind}_01`);
    const report = inspect(model);
    expect(model.userData.detailTier).toBe('cinematic-production-prop');
    expect(model.userData.productionCinematicProp).toBe(true);
    for (const requiredName of requiredNames) expect(report.names).toContain(requiredName);
    expect(report.meshes).toBeLessThan(80);
  });

  it.each([
    ['cine_prop_wheelbarrow', ['wheelbarrow-load-tray', 'wheelbarrow-front-wheel']],
    ['cine_prop_watering_cart', ['watering-cart-water-tank', 'watering-cart-hose-reel']],
    ['cine_prop_compost_bin', ['compost-bin-air-vent', 'compost-bin-harvest-door']],
    ['cine_prop_compost_tumbler', ['compost-tumbler-rotating-drum', 'compost-tumbler-crank']],
    ['cine_prop_rain_barrel', ['rain-barrel-storage-vessel', 'rain-barrel-spigot']],
    ['cine_prop_garden_tool_rack', ['garden-tool-long-handle', 'garden-tool-spade-head']],
    ['cine_prop_sprinkler', ['lawn-sprinkler-rotating-arm', 'lawn-sprinkler-water-nozzle']],
    ['cine_prop_soaker_hose_rack', ['hose-reel-wound-hose', 'hose-reel-crank']],
    ['cine_prop_sundial', ['sundial-engraved-dial-plate', 'sundial-shadow-gnomon']],
    ['cine_prop_garden_gnome', ['garden-gnome-pointed-beard', 'garden-gnome-tall-hat']],
    ['cine_prop_thermometer_post', ['garden-thermometer-glass-tube', 'garden-thermometer-scale-tick']],
  ] as const)('gives %s functional garden-equipment geometry', (kind, requiredNames) => {
    const model = buildModel(kind as PropKind, '#668d52', '#8b7052', `${kind}_01`);
    const report = inspect(model);
    expect(model.userData.detailTier).toBe('cinematic-production-prop');
    expect(model.userData.productionCinematicProp).toBe(true);
    for (const requiredName of requiredNames) expect(report.names).toContain(requiredName);
    expect(report.meshes).toBeLessThan(80);
  });

  it.each([
    ['cine_prop_fire_extinguisher_post', ['fire-extinguisher-pressure-cylinder', 'fire-extinguisher-discharge-hose']],
    ['cine_prop_elevator_bank_doors', ['elevator-bank-sliding-door', 'elevator-bank-call-button']],
    ['cine_prop_playpen', ['playpen-padded-rail', 'playpen-breathable-mesh-strand']],
    ['cine_prop_fish_tank_stand', ['aquarium-front-glass', 'aquarium-fish-body']],
    ['cine_prop_umbrella_table', ['umbrella-table-fabric-canopy', 'umbrella-table-canopy-rib']],
    ['cine_prop_high_chair', ['high-chair-removable-tray', 'high-chair-safety-harness']],
    ['cine_prop_soaking_tub', ['soaking-tub-water-surface', 'soaking-tub-faucet-spout']],
    ['cine_prop_rocking_chair', ['rocking-chair-curved-runner', 'rocking-chair-back-slat']],
  ] as const)('replaces the incorrect generic chassis for %s', (kind, requiredNames) => {
    const model = buildModel(kind as PropKind, '#668d52', '#8b7052', `${kind}_01`);
    const report = inspect(model);
    expect(model.userData.detailTier).toBe('cinematic-production-prop');
    expect(model.userData.productionCinematicProp).toBe(true);
    for (const requiredName of requiredNames) expect(report.names).toContain(requiredName);
    expect(report.meshes).toBeLessThan(80);
  });

  it.each([
    ['cine_prop_concession_stand', ['concession-stand-striped-canopy', 'concession-stand-packaged-snack']],
    ['cine_prop_ticket_booth', ['ticket-booth-service-window', 'ticket-booth-ticket-slot']],
    ['cine_prop_shop_mannequin', ['retail-mannequin-garment-torso', 'retail-mannequin-articulated-leg']],
    ['cine_prop_mannequin_pair', ['retail-mannequin-display-base', 'retail-mannequin-head']],
    ['cine_prop_clothing_rack', ['clothing-rack-hanger', 'clothing-rack-hanging-garment']],
    ['cine_prop_produce_bin', ['produce-display-sloped-crate', 'produce-display-fresh-item']],
    ['cine_prop_freezer_island', ['freezer-island-sliding-glass-lid', 'freezer-island-compressor-vent']],
    ['cine_prop_soda_fountain', ['soda-fountain-flavor-tap', 'soda-fountain-drip-tray']],
    ['cine_prop_food_truck_counter', ['food-truck-open-service-window', 'food-truck-window-awning']],
    ['cine_prop_hat_rack', ['hat-rack-display-hook', 'hat-rack-hat-crown']],
    ['cine_prop_deli_warmer', ['deli-warmer-sloped-glass', 'deli-warmer-food-tray']],
    ['cine_prop_coffee_bar', ['coffee-bar-espresso-machine', 'coffee-bar-cup']],
  ] as const)('gives retail fixture %s a dedicated silhouette', (kind, requiredNames) => {
    const model = buildModel(kind as PropKind, '#8c5b46', '#725a43', `${kind}_01`);
    const report = inspect(model);
    expect(model.userData.detailTier).toBe('cinematic-production-prop');
    expect(model.userData.productionCinematicProp).toBe(true);
    for (const requiredName of requiredNames) expect(report.names).toContain(requiredName);
    expect(report.meshes).toBeLessThan(80);
  });
});

function inspect(model: THREE.Object3D): {
  meshes: number;
  triangles: number;
  textured: number;
  surfaced: number;
  rounded: number;
  names: string[];
} {
  let meshes = 0;
  let triangles = 0;
  let textured = 0;
  let surfaced = 0;
  let rounded = 0;
  const names: string[] = [];

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    meshes += 1;
    names.push(object.name);
    const geometry = object.geometry;
    if (/Sphere|Capsule|Torus/.test(geometry.type)) rounded += 1;
    triangles += geometry.index
      ? geometry.index.count / 3
      : geometry.getAttribute('position').count / 3;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const hasTexture = materials.some((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return false;
      return Boolean(material.map || material.normalMap || material.roughnessMap);
    });
    if (hasTexture) textured += 1;
    if (hasTexture || materials.some((material) => material.transparent && material.opacity < 1)) surfaced += 1;
  });

  return { meshes, triangles, textured, surfaced, rounded, names };
}
