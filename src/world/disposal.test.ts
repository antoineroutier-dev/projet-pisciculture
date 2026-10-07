import { expect, it } from "vitest";
import * as T from "three";
import { disposeObject } from "../farm3d";
it("libère géométries, particules et textures uniques sans détruire les matériaux partagés", () => {
  const root = new T.Group(),
    geometry = new T.BoxGeometry(),
    texture = new T.Texture(),
    material = new T.MeshBasicMaterial({ map: texture }),
    retained = new T.MeshBasicMaterial(),
    particles = new T.BufferGeometry(),
    pointsMaterial = new T.PointsMaterial();
  root.add(
    new T.Mesh(geometry, material),
    new T.Mesh(geometry, material),
    new T.Mesh(geometry, retained),
    new T.Points(particles, pointsMaterial),
  );
  const counts = {
    geometry: 0,
    texture: 0,
    material: 0,
    retained: 0,
    particles: 0,
    pointsMaterial: 0,
  };
  for (const [key, object] of Object.entries({
    geometry,
    texture,
    material,
    retained,
    particles,
    pointsMaterial,
  }))
    object.addEventListener("dispose", () => {
      counts[key as keyof typeof counts]++;
    });
  disposeObject(root, new Set([retained]));
  expect(counts).toEqual({
    geometry: 1,
    texture: 1,
    material: 1,
    retained: 0,
    particles: 1,
    pointsMaterial: 1,
  });
  retained.dispose();
});
