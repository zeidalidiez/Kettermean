import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { ASSETS } from '../src/world/assetCatalog';
import { buildModel, clearModelMaterialCache, type PropKind } from '../src/world/models';

interface AuditRow {
  id: string;
  kind: string;
  meshes: number;
  triangles: number;
  texturedRatio: number;
  roundedRatio: number;
}

afterAll(() => clearModelMaterialCache());

describe('full production model audit', () => {
  it('builds every catalogue asset inside production quality limits', () => {
    const rows: AuditRow[] = [];
    const failures: string[] = [];
    const bannedDecoration = /(cine-variant|variant-(masterwork|exhibition)-finial|atelier-variant-.*-(finial|medal)|face-rivet|orbiting|family-.*-(stamp|maker-mark)|edge-screw|arm-stud|tuft-row)/i;
    const roundedSemantic = /(balloon|bubble|orb|orrery|planet|lunar_globe|jellyfish|globe|eclipse_engine)/i;

    for (let index = 0; index < ASSETS.length; index += 1) {
      const asset = ASSETS[index]!;
      let model: THREE.Group;
      try {
        model = buildModel(
          asset.kind as PropKind,
          '#6a7a8a',
          '#c4b59a',
          asset.id,
        );
      } catch (error) {
        failures.push(`${asset.id}: build threw ${String(error)}`);
        continue;
      }

      let meshes = 0;
      let triangles = 0;
      let textured = 0;
      let rounded = 0;
      const bannedNames: string[] = [];
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        meshes += 1;
        const geometry = object.geometry;
        triangles += geometry.index
          ? geometry.index.count / 3
          : geometry.getAttribute('position').count / 3;
        if (/Sphere|Capsule|Torus/.test(geometry.type)) rounded += 1;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        if (materials.some((material) => {
          if (!(material instanceof THREE.MeshStandardMaterial)) return false;
          return Boolean(material.map || material.normalMap || material.roughnessMap);
        })) textured += 1;
        if (bannedDecoration.test(object.name)) bannedNames.push(object.name);
      });

      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      if (meshes === 0) failures.push(`${asset.id}: empty model`);
      if (![size.x, size.y, size.z].every(Number.isFinite) || size.x <= 0 || size.y <= 0 || size.z <= 0) {
        failures.push(`${asset.id}: invalid bounds ${size.toArray().join(',')}`);
      }
      if (triangles > 35_000) failures.push(`${asset.id}: ${Math.round(triangles).toLocaleString()} triangles`);
      if (meshes > 220) failures.push(`${asset.id}: ${meshes} meshes`);
      if (bannedNames.length > 0) failures.push(`${asset.id}: banned decoration ${[...new Set(bannedNames)].join(', ')}`);
      if (meshes >= 10 && rounded / meshes >= 0.72 && !roundedSemantic.test(asset.id)) {
        failures.push(`${asset.id}: ${percent(rounded / meshes)} non-semantic rounded primitives`);
      }

      rows.push({
        id: asset.id,
        kind: asset.kind,
        meshes,
        triangles,
        texturedRatio: meshes > 0 ? textured / meshes : 0,
        roundedRatio: meshes > 0 ? rounded / meshes : 0,
      });

      // Bound memory while still exercising every real ID and variant.
      if ((index + 1) % 160 === 0) clearModelMaterialCache();
    }

    const byTriangles = [...rows].sort((a, b) => b.triangles - a.triangles).slice(0, 12);
    const byMeshes = [...rows].sort((a, b) => b.meshes - a.meshes).slice(0, 12);
    const bubbleHeavy = rows
      .filter((row) => row.meshes >= 10 && row.roundedRatio >= 0.55 && !/(balloon|bubble|orb)/.test(row.id))
      .sort((a, b) => b.roundedRatio - a.roundedRatio)
      .slice(0, 12);

    console.log(`Audited ${rows.length.toLocaleString()} assets across ${new Set(rows.map((row) => row.kind)).size.toLocaleString()} model kinds.`);
    console.log(`Triangle range: ${Math.round(Math.min(...rows.map((row) => row.triangles))).toLocaleString()}–${Math.round(Math.max(...rows.map((row) => row.triangles))).toLocaleString()}.`);
    console.log(`Median texture coverage: ${percent(median(rows.map((row) => row.texturedRatio)))}.`);
    printRows('Highest triangle counts', byTriangles, (row) => `${Math.round(row.triangles).toLocaleString()} tris / ${row.meshes} meshes`);
    printRows('Highest mesh counts', byMeshes, (row) => `${row.meshes} meshes / ${Math.round(row.triangles).toLocaleString()} tris`);
    printRows('Rounded-primitive warnings', bubbleHeavy, (row) => `${percent(row.roundedRatio)} rounded / ${row.meshes} meshes`);

    expect(failures.slice(0, 40), `${failures.length} catalogue audit failure(s)`).toEqual([]);
  }, 120_000);
});

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function printRows(title: string, values: AuditRow[], detail: (row: AuditRow) => string): void {
  console.log(`\n${title}:`);
  if (values.length === 0) {
    console.log('  none');
    return;
  }
  for (const row of values) console.log(`  ${row.id}: ${detail(row)}`);
}
