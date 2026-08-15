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
  ] as const)('rebuilds expanded %s from object-specific parts', (kind, assetId, requiredNames) => {
    const model = buildModel(kind as PropKind, '#77899a', '#9e8669', assetId);
    const report = inspect(model);
    expect(model.userData.detailTier).toBe('expanded-production-prop');
    for (const requiredName of requiredNames) expect(report.names).toContain(requiredName);
    expect(report.meshes).toBeLessThan(70);
    expect(report.rounded / report.meshes).toBeLessThan(0.55);
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
