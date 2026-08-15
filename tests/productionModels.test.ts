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
});

function inspect(model: THREE.Object3D): {
  meshes: number;
  triangles: number;
  textured: number;
  names: string[];
} {
  let meshes = 0;
  let triangles = 0;
  let textured = 0;
  const names: string[] = [];

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    meshes += 1;
    names.push(object.name);
    const geometry = object.geometry;
    triangles += geometry.index
      ? geometry.index.count / 3
      : geometry.getAttribute('position').count / 3;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.some((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return false;
      return Boolean(material.map || material.normalMap || material.roughnessMap);
    })) textured += 1;
  });

  return { meshes, triangles, textured, names };
}
