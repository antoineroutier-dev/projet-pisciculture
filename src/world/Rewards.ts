import * as T from "three";
import { paint } from "./palette";
import type { AchievementId } from "../state/profile";
/** Original, cosmetic geometry. Created once and disposed with the farm. */
export function createRewards(parent: T.Group) {
  const garden = new T.Group(),
    bench = new T.Group();
  garden.name = "reward-garden";
  bench.name = "reward-bench";
  garden.position.set(9, 0, 19);
  const stone = new T.MeshStandardMaterial({
    color: paint("stone-light"),
    roughness: 1,
  });
  const wood = new T.MeshStandardMaterial({
    color: paint("wood-dark"),
    roughness: 0.85,
  });
  const leaf = new T.MeshStandardMaterial({
    color: paint("leaf"),
    roughness: 1,
    flatShading: true,
  });
  const flower = new T.MeshStandardMaterial({
    color: paint("stone-light"),
    roughness: 0.9,
  });
  const box = (
    root: T.Group,
    size: [number, number, number],
    at: [number, number, number],
    mat: T.Material,
  ) => {
    const mesh = new T.Mesh(new T.BoxGeometry(...size), mat);
    mesh.position.set(...at);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  };
  for (const x of [-3, 3]) box(garden, [0.3, 0.35, 5], [x, 0.16, 0], stone);
  for (const z of [-2.4, 2.4]) box(garden, [6, 0.35, 0.3], [0, 0.16, z], stone);
  const sphere = new T.IcosahedronGeometry(0.55, 1),
    bloom = new T.IcosahedronGeometry(0.12, 0);
  for (let i = 0; i < 8; i++) {
    const x = (i % 4) * 1.5 - 2.25,
      z = i < 4 ? -1.65 : 1.65;
    const bush = new T.Mesh(sphere, leaf);
    bush.position.set(x, 0.45, z);
    bush.scale.set(1, 0.7, 0.8);
    bush.castShadow = true;
    garden.add(bush);
    for (let j = 0; j < 3; j++) {
      const petal = new T.Mesh(bloom, flower);
      petal.position.set(x + (j - 1) * 0.2, 0.78, z);
      garden.add(petal);
    }
  }
  for (const x of [-1.2, 1.2]) box(bench, [0.15, 0.8, 0.7], [x, 0.4, 0], wood);
  box(bench, [3, 0.14, 0.8], [0, 0.83, 0], wood);
  box(bench, [3, 0.6, 0.12], [0, 1.18, -0.35], wood);
  garden.add(bench);
  parent.add(garden);
  return {
    update(ids: readonly AchievementId[]) {
      garden.visible = ids.includes("paid");
      bench.visible = ids.includes("cold");
    },
    garden,
    bench,
  };
}
