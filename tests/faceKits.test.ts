import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  FACE_KIT_STYLES,
  buildFaceKit,
  faceFeatureProfile,
} from '../src/world/faceKits';

describe('expanded face generation', () => {
  it('builds thirteen recognizably different human, animal, and mechanical face kits', () => {
    expect(FACE_KIT_STYLES).toHaveLength(13);
    const signatures = new Set<string>();

    for (const [index, style] of FACE_KIT_STYLES.entries()) {
      const kit = buildFaceKit(style, `face-style-${style}`, index % 6, '#75d9ee');
      const meshes: THREE.Mesh[] = [];
      const signature: string[] = [];
      kit.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        meshes.push(object);
        signature.push([
          object.name,
          object.geometry.type,
          ...object.scale.toArray(),
          ...object.position.toArray(),
        ].join(':'));
      });
      expect(meshes.length, style).toBeGreaterThanOrEqual(14);
      expect(kit.userData.faceFeatureProfile, style).toBeDefined();
      signatures.add(signature.join('|'));
      disposeKit(kit);
    }

    expect(signatures.size).toBe(FACE_KIT_STYLES.length);
  });

  it('mixes eye, brow, nose, mouth, hair, and marking features deterministically', () => {
    const profiles = FACE_KIT_STYLES.flatMap((style) =>
      Array.from({ length: 48 }, (_, variant) =>
        faceFeatureProfile(`feature-profile-${variant % 11}`, variant, style),
      ),
    );
    const signatures = new Set(profiles.map((profile) => JSON.stringify(profile)));

    expect(new Set(profiles.map((profile) => profile.eyeShape)).size).toBe(6);
    expect(new Set(profiles.map((profile) => profile.eyeCount))).toEqual(new Set([1, 2, 3, 4]));
    expect(new Set(profiles.map((profile) => profile.browStyle)).size).toBe(6);
    expect(new Set(profiles.map((profile) => profile.noseStyle)).size).toBe(6);
    expect(new Set(profiles.map((profile) => profile.mouthStyle)).size).toBe(6);
    expect(new Set(profiles.map((profile) => profile.hairStyle)).size).toBe(6);
    expect(new Set(profiles.map((profile) => profile.markingCount))).toEqual(
      new Set([0, 1, 2, 3, 4, 5, 6]),
    );
    expect(signatures.size).toBeGreaterThan(300);

    expect(faceFeatureProfile('stable-face', 4, 'cervine')).toEqual(
      faceFeatureProfile('stable-face', 4, 'cervine'),
    );
  });
});

function disposeKit(kit: THREE.Group): void {
  kit.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) material.dispose();
  });
}
