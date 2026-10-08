import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { paint } from "./palette";
import {
  FARM_BOUNDS,
  isOpenGround,
  seeded,
  terrainHeight,
  fbm,
  CHANNEL_Z,
} from "./terrain";

type Point = [number, number];
/** Shared clock for the vertex wind; the weather layer advances it. */
export const wind = { value: 0 };
export const windStrength = { value: 1 };

function colored(
  geometry: T.BufferGeometry,
  bottom: string,
  top: string,
  y0: number,
  y1: number,
) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const p = g.getAttribute("position") as T.BufferAttribute,
    a = new T.Color(bottom),
    b = new T.Color(top),
    c = new T.Color(),
    colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    c.copy(a).lerp(
      b,
      Math.min(1, Math.max(0, (p.getY(i) - y0) / Math.max(0.01, y1 - y0))),
    );
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new T.BufferAttribute(colors, 3));
  g.deleteAttribute("uv");
  return g;
}
function jitter(geometry: T.BufferGeometry, amount: number, seed: number) {
  const r = seeded(seed),
    p = geometry.getAttribute("position") as T.BufferAttribute,
    moved = new Map<string, [number, number, number]>();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)}:${p.getY(i).toFixed(3)}:${p.getZ(i).toFixed(3)}`;
    let d = moved.get(key);
    if (!d) {
      d = [(r() - 0.5) * amount, (r() - 0.5) * amount, (r() - 0.5) * amount];
      moved.set(key, d);
    }
    p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
  }
  return geometry;
}
function blob(radius: number, x: number, y: number, z: number, sy = 1) {
  const g = new T.IcosahedronGeometry(radius, 1);
  g.scale(1, sy, 1);
  g.translate(x, y, z);
  return g;
}
function deciduousGeometry() {
  const trunk = colored(
    new T.CylinderGeometry(0.15, 0.26, 3.4, 6).translate(0, 1.7, 0),
    paint("timber"),
    paint("wood-mid"),
    0,
    3.4,
  );
  const crown = jitter(
    mergeGeometries([
      blob(1.9, 0, 4.4, 0, 0.9),
      blob(1.35, 1.15, 3.9, 0.35),
      blob(1.45, -1.0, 4.0, -0.4),
      blob(1.2, 0.2, 5.4, -0.25),
      blob(1.1, -0.3, 3.8, 1.0),
    ]),
    0.28,
    5,
  );
  return mergeGeometries([
    trunk,
    colored(crown, paint("leaf-shadow"), paint("leaf-light"), 2.6, 6.4),
  ]);
}
function coniferGeometry() {
  const trunk = colored(
    new T.CylinderGeometry(0.12, 0.2, 1.6, 5).translate(0, 0.8, 0),
    paint("timber"),
    paint("timber"),
    0,
    1,
  );
  const tiers = [
    new T.ConeGeometry(1.75, 2.8, 7).translate(0, 2.2, 0),
    new T.ConeGeometry(1.35, 2.4, 7).translate(0, 3.6, 0),
    new T.ConeGeometry(0.9, 2.0, 7).translate(0, 4.9, 0),
  ].map((g) => g.toNonIndexed());
  return mergeGeometries([
    trunk,
    colored(
      jitter(mergeGeometries(tiers), 0.12, 9),
      paint("conifer-shadow"),
      paint("conifer"),
      0.9,
      6,
    ),
  ]);
}
function bushGeometry() {
  return colored(
    jitter(
      mergeGeometries([
        blob(0.9, 0, 0.55, 0, 0.75),
        blob(0.7, 0.7, 0.45, 0.2, 0.75),
        blob(0.65, -0.6, 0.4, -0.15, 0.8),
      ]),
      0.15,
      12,
    ),
    paint("leaf-shadow"),
    paint("leaf"),
    0,
    1.3,
  );
}
function rockGeometry() {
  const g = jitter(new T.DodecahedronGeometry(0.7, 0), 0.28, 17);
  g.scale(1, 0.6, 0.85);
  return colored(g, paint("rock-shadow"), paint("rock"), -0.4, 0.4);
}
export function tuftGeometry(blades: number, height: number, seed: number) {
  const r = seeded(seed),
    positions: number[] = [];
  for (let i = 0; i < blades; i++) {
    const angle = (i / blades) * Math.PI * 2 + r() * 0.8,
      lean = 0.12 + r() * 0.16,
      h = height * (0.65 + r() * 0.5),
      w = 0.06 + r() * 0.04,
      cx = Math.cos(angle),
      cz = Math.sin(angle),
      px = -cz * w,
      pz = cx * w;
    positions.push(px, 0, pz, -px, 0, -pz, cx * lean, h, cz * lean);
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  // Grass is lit as if facing the sky so blades never flicker dark.
  const n = g.getAttribute("normal") as T.BufferAttribute;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return colored(g, paint("grass-light"), paint("grass-tip"), 0, height);
}
function flowerGeometry() {
  const head = new T.IcosahedronGeometry(0.11, 0).translate(0, 0.42, 0);
  return colored(head, paint("bloom"), paint("bloom"), 0, 1);
}
/** Vertex wind: tops sway, bases stay planted; disabled when the clock is still. */
export function windy(material: T.Material, strength: number, key: string) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = wind;
    shader.uniforms.uWindStrength = windStrength;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uWind;\nuniform float uWindStrength;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 anchor = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
        #else
          vec2 anchor = vec2(0.0);
        #endif
        float sway = sin(uWind * 1.4 + anchor.x * 0.31 + anchor.y * 0.23) * 0.6
          + sin(uWind * 2.3 + anchor.x * 0.77) * 0.3;
        float bend = max(0.0, position.y) * ${strength.toFixed(3)} * uWindStrength;
        transformed.x += sway * bend;
        transformed.z += sway * bend * 0.55;`,
      );
  };
  material.customProgramCacheKey = () => `wind-${key}`;
  return material;
}
function scatter(
  count: number,
  sample: () => Point,
  accept: (x: number, z: number) => boolean,
) {
  const points: Point[] = [];
  for (let i = 0; i < count * 12 && points.length < count; i++) {
    const [x, z] = sample();
    if (accept(x, z)) points.push([x, z]);
  }
  return points;
}
function spaced(points: Point[], min: number, x: number, z: number) {
  return points.every(([px, pz]) => Math.hypot(px - x, pz - z) > min);
}
/** Tall unmown grass and a few blooms filling a free plot; owned and disposed by its pond group. */
export function plotMeadow(
  x: number,
  z: number,
  width: number,
  depth: number,
  seed: number,
) {
  const r = seeded(seed),
    count = Math.round(width * depth * 2.4),
    geometry = tuftGeometry(8, 0.9, seed),
    material = windy(
      new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1,
        side: T.DoubleSide,
        color: paint("plot-grass"),
      }),
      0.2,
      "grass",
    ),
    mesh = new T.InstancedMesh(geometry, material, count),
    dummy = new T.Object3D(),
    tint = new T.Color();
  for (let i = 0; i < count; i++) {
    dummy.position.set(
      x + (r() - 0.5) * (width - 0.4),
      terrainHeight(x, z),
      z + (r() - 0.5) * (depth - 0.4),
    );
    dummy.rotation.set(0, r() * Math.PI * 2, 0);
    dummy.scale.set(0.8 + r() * 0.5, 0.7 + r() * 0.9, 0.8 + r() * 0.5);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, tint.setScalar(0.82 + r() * 0.35));
  }
  mesh.name = "plot-meadow";
  mesh.receiveShadow = true;
  return mesh;
}
/** Planned once so the painted ground can darken the soil beneath each tree. */
export function planTrees() {
  const r = seeded(139),
    near: Point[] = [];
  // Hedgerow trees around the working farm, then the woodland edge on the hills.
  const sample = (): Point => {
    const side = Math.floor(r() * 4);
    if (side === 0) return [-34 - r() * 26, (r() - 0.5) * 90];
    if (side === 1) return [34 + r() * 26, (r() - 0.5) * 90];
    if (side === 2) return [(r() - 0.5) * 110, -32 - r() * 22];
    return [(r() - 0.5) * 110, 26 + r() * 26];
  };
  for (let i = 0; i < 2400 && near.length < 90; i++) {
    const [x, z] = sample();
    if (isOpenGround(x, z, 2.5) && spaced(near, 4.2, x, z)) near.push([x, z]);
  }
  return near;
}
export function createVegetation(root: T.Group, trees: Point[]) {
  const r = seeded(211),
    dummy = new T.Object3D(),
    tint = new T.Color(),
    geometries: T.BufferGeometry[] = [],
    materials: T.Material[] = [];
  function instanced(
    name: string,
    geometry: T.BufferGeometry,
    material: T.Material,
    placements: {
      x: number;
      z: number;
      scale: number;
      sy?: number;
      ry?: number;
      color?: T.Color;
      y?: number;
    }[],
    shadow = true,
  ) {
    geometries.push(geometry);
    materials.push(material);
    const mesh = new T.InstancedMesh(
      geometry,
      material,
      Math.max(1, placements.length),
    );
    placements.forEach((p, i) => {
      dummy.position.set(p.x, p.y ?? terrainHeight(p.x, p.z), p.z);
      dummy.rotation.set(0, p.ry ?? r() * Math.PI * 2, 0);
      dummy.scale.set(p.scale, p.scale * (p.sy ?? 1), p.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, p.color ?? tint.setScalar(1));
    });
    mesh.count = placements.length;
    mesh.userData.capacity = placements.length;
    mesh.name = name;
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    root.add(mesh);
    return mesh;
  }
  const leafMaterial = windy(
    new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      flatShading: true,
    }),
    0.035,
    "leaf",
  );
  const foliage = instanced(
    "foliage",
    deciduousGeometry(),
    leafMaterial,
    trees.map(([x, z]) => ({
      x,
      z,
      scale: 0.85 + r() * 0.55,
      sy: 0.9 + r() * 0.3,
      color: new T.Color().setHSL(0, 0, 1).multiplyScalar(0.82 + r() * 0.3),
    })),
  );
  // Woodland on the hills: a closed horizon of conifers with a few broadleaves.
  const forest: Point[] = [];
  for (let i = 0; i < 6000 && forest.length < 420; i++) {
    const angle = r() * Math.PI * 2,
      radius = 70 + r() * 150,
      x = Math.cos(angle) * radius * 1.05,
      z = Math.sin(angle) * radius * 0.95 - 10;
    const outsideFarm =
      x < FARM_BOUNDS.minX - 10 ||
      x > FARM_BOUNDS.maxX + 10 ||
      z < FARM_BOUNDS.minZ - 8 ||
      z > FARM_BOUNDS.maxZ + 30;
    const clump = fbm(x * 0.03 + 11, z * 0.03 - 4);
    if (outsideFarm && clump > 0.42 && spaced(forest, 3.4, x, z))
      forest.push([x, z]);
  }
  forest.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
  const conifers = instanced(
    "conifers",
    coniferGeometry(),
    windy(
      new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        flatShading: true,
      }),
      0.02,
      "conifer",
    ),
    forest.map(([x, z]) => ({
      x,
      z,
      scale: 1.1 + r() * 1.1,
      sy: 0.9 + r() * 0.5,
      color: tint.clone().setScalar(0.8 + r() * 0.35),
    })),
  );
  const bushPoints: Point[] = [];
  // Along the front fence, around the yard corners and on the channel banks.
  for (let i = 0; i < 26; i++)
    bushPoints.push([(i % 2 ? 1 : -1) * (5 + r() * 23), 24.2 + r() * 1.4]);
  for (const [x, z] of [
    [-31, -20],
    [-31, -12],
    [30.5, -19],
    [30.5, -12.5],
    [-16, -23],
    [3, -23],
    [16, -23],
  ] as Point[])
    bushPoints.push([x + (r() - 0.5) * 2, z + (r() - 0.5) * 1.5]);
  bushPoints.push(
    ...scatter(
      40,
      () => [(r() - 0.5) * 120, (r() - 0.5) * 110],
      (x, z) => isOpenGround(x, z, 1.5) && spaced(bushPoints, 2.5, x, z),
    ),
  );
  const bushes = instanced(
    "bushes",
    bushGeometry(),
    windy(
      new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1,
        flatShading: true,
      }),
      0.05,
      "bush",
    ),
    bushPoints.map(([x, z]) => ({
      x,
      z,
      scale: 0.7 + r() * 0.7,
      color: tint.clone().setScalar(0.8 + r() * 0.35),
    })),
  );
  const rockPoints = scatter(
    70,
    () =>
      r() > 0.45
        ? [(r() - 0.5) * 70, CHANNEL_Z + (r() > 0.5 ? 2.2 : -2.2) + r() * 0.6]
        : [(r() - 0.5) * 240, (r() - 0.5) * 220],
    (x, z) =>
      Math.abs(z - CHANNEL_Z) < 3.2 ? Math.abs(x) < 33 : isOpenGround(x, z, 3),
  );
  const rocks = instanced(
    "rocks",
    rockGeometry(),
    new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      flatShading: true,
    }),
    rockPoints.map(([x, z]) => ({
      x,
      z,
      y: terrainHeight(x, z) + 0.05,
      scale: 0.35 + r() * (Math.abs(z - CHANNEL_Z) < 4 ? 0.5 : 1.4),
      color: tint.clone().setScalar(0.85 + r() * 0.3),
    })),
  );
  // Meadow tufts, denser near hedges and pond sites; never on lanes or in ponds.
  const grassPoints = scatter(
    9000,
    () => [(r() - 0.5) * 190, (r() - 0.5) * 170],
    (x, z) =>
      isOpenGround(x, z, 0.4) &&
      fbm(x * 0.09 + 2, z * 0.09) > 0.3 - Math.min(0.2, Math.hypot(x, z) / 400),
  );
  const meadow = instanced(
    "meadow",
    tuftGeometry(7, 0.5, 3),
    windy(
      new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1,
        side: T.DoubleSide,
      }),
      0.16,
      "grass",
    ),
    grassPoints.map(([x, z]) => ({
      x,
      z,
      scale: 0.7 + r() * 0.9,
      sy: 0.8 + r() * 0.7,
      color: tint.clone().setScalar(0.85 + r() * 0.3),
    })),
    false,
  );
  const blooms = [
    paint("bloom-white"),
    paint("bloom-yellow"),
    paint("bloom-violet"),
    paint("bloom-pink"),
  ];
  const flowerPoints = scatter(
    1600,
    () => [(r() - 0.5) * 170, (r() - 0.5) * 150],
    (x, z) => isOpenGround(x, z, 0.6) && fbm(x * 0.07 - 5, z * 0.07 + 8) > 0.56,
  );
  const flowers = instanced(
    "flowers",
    flowerGeometry(),
    new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7,
      flatShading: true,
    }),
    flowerPoints.map(([x, z]) => {
      const patch = Math.floor(fbm(x * 0.02, z * 0.02) * 9) % blooms.length;
      return {
        x,
        z,
        scale: 0.8 + r() * 0.6,
        color: new T.Color(
          blooms[(patch + (r() > 0.8 ? 1 : 0)) % blooms.length],
        ),
      };
    }),
    false,
  );
  return {
    foliage,
    conifers,
    bushes,
    rocks,
    meadow,
    flowers,
    dispose() {
      for (const mesh of [foliage, conifers, bushes, rocks, meadow, flowers]) {
        root.remove(mesh);
        mesh.dispose();
      }
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
