import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  FACE_ACCESSORY_STYLES,
  FACE_BROW_STYLES,
  FACE_EYE_SHAPES,
  FACE_HAIR_STYLES,
  FACE_KIT_STYLES,
  FACE_MARKING_STYLES,
  FACE_MOUTH_STYLES,
  FACE_NOSE_STYLES,
  buildFaceKit,
  faceFeatureProfile,
  type FaceFeatureProfile,
  type FaceKitStyle,
} from '../src/world/faceKits';

describe('expanded face generation', () => {
  it('builds twenty-three recognizably different human, animal, and mechanical face kits', () => {
    expect(FACE_KIT_STYLES).toHaveLength(23);
    const signatures = new Set<string>();
    const newStyles = new Set([
      'equine', 'ursine', 'caprine', 'bovine', 'porcine', 'simian', 'mustelid',
      'proboscidean', 'crustacean', 'arachnid',
    ]);

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
      if (newStyles.has(style)) expect(meshes.length, style).toBeGreaterThanOrEqual(24);
      expect(kit.userData.faceFeatureProfile, style).toBeDefined();
      expect(kit.userData.faceFeatureCount, style).toBeGreaterThan(0);
      for (const mesh of meshes) {
        expect(mesh.position.toArray().every(Number.isFinite), `${style}:${mesh.name}:position`).toBe(true);
        expect(mesh.scale.toArray().every((value) => Number.isFinite(value) && value > 0), `${style}:${mesh.name}:scale`).toBe(true);
        expect(mesh.geometry.getAttribute('position')?.count, `${style}:${mesh.name}:geometry`).toBeGreaterThan(0);
      }
      signatures.add(signature.join('|'));
      disposeKit(kit);
    }

    expect(signatures.size).toBe(FACE_KIT_STYLES.length);
  });

  it('independently mixes the complete eye, brow, nose, mouth, hair, marking, and accessory pools', () => {
    const profiles = FACE_KIT_STYLES.flatMap((style) =>
      Array.from({ length: 160 }, (_, variant) =>
        faceFeatureProfile(`feature-profile-${variant}`, variant, style),
      ),
    );
    const signatures = new Set(profiles.map((profile) => JSON.stringify(profile)));

    expect(new Set(profiles.map((profile) => profile.eyeShape))).toEqual(new Set(FACE_EYE_SHAPES));
    expect(new Set(profiles.map((profile) => profile.eyeCount))).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    expect(new Set(profiles.map((profile) => profile.browStyle))).toEqual(new Set(FACE_BROW_STYLES));
    expect(new Set(profiles.map((profile) => profile.noseStyle))).toEqual(new Set(FACE_NOSE_STYLES));
    expect(new Set(profiles.map((profile) => profile.mouthStyle))).toEqual(new Set(FACE_MOUTH_STYLES));
    expect(new Set(profiles.map((profile) => profile.hairStyle))).toEqual(new Set(FACE_HAIR_STYLES));
    expect(new Set(profiles.map((profile) => profile.markingStyle))).toEqual(new Set(FACE_MARKING_STYLES));
    expect(new Set(profiles.map((profile) => profile.accessoryStyle))).toEqual(new Set(FACE_ACCESSORY_STYLES));
    expect(new Set(profiles.map((profile) => profile.markingCount))).toEqual(
      new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    );
    expect(signatures.size).toBeGreaterThan(3_500);

    expect(faceFeatureProfile('stable-face', 4, 'cervine')).toEqual(
      faceFeatureProfile('stable-face', 4, 'cervine'),
    );
  });

  it('renders every generated profile dimension as geometry rather than metadata only', () => {
    const targets = new Map<string, { profile: FaceFeatureProfile; seed: string; variant: number; style: FaceKitStyle }>();
    for (const style of FACE_KIT_STYLES) {
      for (let variant = 0; variant < 600; variant += 1) {
        const seed = `rendered-feature-${style}-${variant}`;
        const profile = faceFeatureProfile(seed, variant, style);
        const entries = [
          `eye:${profile.eyeShape}`, `eye-count:${profile.eyeCount}`, `brow:${profile.browStyle}`,
          `nose:${profile.noseStyle}`, `mouth:${profile.mouthStyle}`, `hair:${profile.hairStyle}`,
          `marking:${profile.markingStyle}`, `accessory:${profile.accessoryStyle}`,
        ];
        for (const entry of entries) if (!targets.has(entry)) targets.set(entry, { profile, seed, variant, style });
      }
    }

    expect([...FACE_EYE_SHAPES].every((value) => targets.has(`eye:${value}`))).toBe(true);
    expect([...FACE_ACCESSORY_STYLES].every((value) => targets.has(`accessory:${value}`))).toBe(true);

    const samples = new Map([...targets.values()].map((sample) => [
      `${sample.seed}:${sample.variant}:${sample.style}`,
      sample,
    ]));
    const eyeSignatures = new Map<string, string>();
    for (const { profile, seed, variant, style } of samples.values()) {
      const kit = buildFaceKit(style, seed, variant, '#75d9ee');
      const meshes = kit.children.filter((object): object is THREE.Mesh => object instanceof THREE.Mesh);
      const names = meshes.map((mesh) => mesh.name);
      const eyes = meshes.filter((mesh) => mesh.name === `face-generated-eye-${profile.eyeShape}`);
      expect(eyes, `${style}:${profile.eyeShape}:${profile.eyeCount}`).toHaveLength(profile.eyeCount);
      eyeSignatures.set(profile.eyeShape, eyes.map((mesh) => `${mesh.geometry.type}:${mesh.scale.toArray().join(',')}`).join('|'));
      expect(names.some((name) => name.startsWith('face-generated-brow-')), profile.browStyle).toBe(profile.browStyle !== 'absent');
      expect(names.some((name) => name.includes('nose') && name.startsWith('face-generated-')), profile.noseStyle).toBe(profile.noseStyle !== 'absent');
      expect(names.some((name) => name.includes('mouth') && name.startsWith('face-generated-')), profile.mouthStyle).toBe(true);
      expect(names.some((name) => /^face-generated-(?:.*hair|halo|mane)/.test(name)), profile.hairStyle).toBe(profile.hairStyle !== 'bare');
      expect(names.some((name) => name.includes(`marking-${profile.markingStyle}`)), profile.markingStyle).toBe(profile.markingStyle !== 'none' && profile.markingCount > 0);
      expect(names.some((name) => name.startsWith('face-generated-accessory-')), profile.accessoryStyle).toBe(profile.accessoryStyle !== 'none');
      disposeKit(kit);
    }

    expect(eyeSignatures.size).toBe(FACE_EYE_SHAPES.length);
    expect(new Set(eyeSignatures.values()).size).toBeGreaterThanOrEqual(8);
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
