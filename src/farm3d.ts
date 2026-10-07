import * as T from "three";
import { type Pond } from "./game";
import { createSwimmer, type Swimmer } from "./swimming";
import { createFish } from "./fish3d";
import { paint } from "./world/palette";
import {
  assetIds,
  assetState,
  pondStructure,
  pondProgress,
  pondSize,
  type FarmState,
} from "./world/artSelectors";
import type { Asset } from "./development";
type WaterMesh = T.Mesh<T.BufferGeometry, T.MeshPhysicalMaterial>;

export const POND_POSITIONS: [number, number][] = [
  [-9, -1],
  [9, -0.4],
  [-9, 12],
  [10, 12],
];
export const ASSET_POSITIONS: Record<Asset, [number, number]> = {
  warehouse: [9, -16],
  coldstore: [22, -16],
  workshop: [-23, -16],
};
export type FishInstance = {
  mesh: T.Group;
  pondId: number;
  swimmer: Swimmer;
  scale: number;
};
export type FarmObjects = {
  root: T.Group;
  targets: T.Mesh[];
  fish: FishInstance[];
  waters: WaterMesh[];
  update: (state: FarmState) => void;
  dispose: () => void;
  ponds: Map<number, { group: T.Group }>;
  assets: Map<Asset, { group: T.Group }>;
  selection: T.Mesh;
  normal: T.CanvasTexture;
};
function seeded(seed: number) {
  let n = seed;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
function surface(kind: "stone" | "wood" | "roof" | "ground" | "gravel") {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  const r = seeded(52);
  const palette = {
    stone: [
      paint("stone-mid"),
      paint("stone"),
      paint("stone-shadow"),
      paint("stone-light"),
    ],
    wood: [
      paint("wood-shadow"),
      paint("wood-mid"),
      paint("wood"),
      paint("wood-dark"),
    ],
    roof: [
      paint("roof-shadow"),
      paint("roof"),
      paint("roof-light"),
      paint("roof-dark"),
    ],
    ground: [
      paint("grass"),
      paint("grass-shadow"),
      paint("grass-light"),
      paint("grass-dark"),
    ],
    gravel: [
      paint("gravel"),
      paint("gravel-shadow"),
      paint("gravel-light"),
      paint("gravel-dark"),
    ],
  }[kind];
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, 512, 512);
  if (kind === "stone" || kind === "roof")
    for (let y = 0; y < 512; y += kind === "roof" ? 40 : 70)
      for (let x = -90; x < 512; x += kind === "roof" ? 70 : 110) {
        ctx.fillStyle = palette[Math.floor(r() * 4)];
        const xx = x + (Math.floor(y / (kind === "roof" ? 40 : 70)) % 2) * 40;
        ctx.fillRect(
          xx + 2,
          y + 2,
          (kind === "roof" ? 70 : 110) - 4,
          (kind === "roof" ? 40 : 70) - 4,
        );
        ctx.strokeStyle = paint("mortar");
        ctx.lineWidth = 2;
        ctx.strokeRect(
          xx + 2,
          y + 2,
          (kind === "roof" ? 70 : 110) - 4,
          (kind === "roof" ? 40 : 70) - 4,
        );
      }
  if (kind === "wood")
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = palette[Math.floor(r() * 4)];
      ctx.fillRect(i * 30, 0, 28, 512);
      for (let j = 0; j < 10; j++) {
        ctx.strokeStyle = paint("wood-grain");
        ctx.beginPath();
        const x = i * 30 + r() * 25;
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 8, 150, x - 5, 380, x + 3, 512);
        ctx.stroke();
      }
    }
  for (let i = 0; i < 5500; i++) {
    ctx.fillStyle = i % 2 ? paint("grain-light") : paint("grain-shadow");
    const size = kind === "gravel" ? 1 + r() * 5 : 1 + r() * 2;
    ctx.fillRect(r() * 512, r() * 512, size, size);
  }
  const tex = new T.CanvasTexture(c);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
export function waterNormal() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(128, 128);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4;
      img.data[i] =
        128 +
        Math.sin(x * 0.31 + y * 0.13) * 22 +
        Math.cos(y * 0.21 - x * 0.18) * 17;
      img.data[i + 1] = 128 + Math.cos(x * 0.15 + y * 0.32) * 25;
      img.data[i + 2] = 245;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const tex = new T.CanvasTexture(c);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(4, 3);
  return tex;
}
function box(
  parent: T.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: T.Material,
) {
  const mesh = new T.Mesh(new T.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function pipe(
  parent: T.Object3D,
  a: T.Vector3,
  b: T.Vector3,
  r: number,
  material: T.Material,
) {
  const delta = b.clone().sub(a);
  const mesh = new T.Mesh(
    new T.CylinderGeometry(r, r, delta.length(), 8),
    material,
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
function roof(
  parent: T.Group,
  w: number,
  d: number,
  h: number,
  y: number,
  material: T.Material,
) {
  const positions = [
    -w / 2,
    0,
    -d / 2,
    -w / 2,
    0,
    d / 2,
    0,
    h,
    -d / 2,
    0,
    h,
    d / 2,
    0,
    h,
    -d / 2,
    0,
    h,
    d / 2,
    w / 2,
    0,
    -d / 2,
    w / 2,
    0,
    d / 2,
    -w / 2,
    0,
    -d / 2,
    0,
    h,
    -d / 2,
    w / 2,
    0,
    -d / 2,
    -w / 2,
    0,
    d / 2,
    0,
    h,
    d / 2,
    w / 2,
    0,
    d / 2,
  ];
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute(
    "uv",
    new T.Float32BufferAttribute(
      [
        0, 0, 0, 3, 2, 0, 2, 3, 0, 0, 0, 3, 2, 0, 2, 3, 0, 0, 0.5, 1, 1, 0, 0,
        0, 0.5, 1, 1, 0,
      ],
      2,
    ),
  );
  geo.setIndex([0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7, 8, 9, 10, 11, 13, 12]);
  geo.computeVertexNormals();
  const mesh = new T.Mesh(geo, material);
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function building(
  parent: T.Group,
  x: number,
  z: number,
  w: number,
  d: number,
  rotation: number,
  materials: Record<string, T.MeshStandardMaterial>,
  barn = false,
) {
  const g = new T.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotation;
  parent.add(g);
  box(g, [w + 0.4, 0.4, d + 0.4], [0, 0.05, 0], materials.concrete);
  box(g, [w, 3.8, d], [0, 2, 0], materials.stone);
  if (barn) box(g, [w - 0.12, 2.5, d + 0.02], [0, 2.4, 0], materials.wood);
  roof(g, w + 0.8, d + 0.8, 2, 3.85, materials.roof);
  // Gable timber framing, eaves, gutters, downpipes.
  box(g, [w + 0.8, 0.15, 0.18], [0, 3.8, d / 2 + 0.26], materials.darkwood);
  for (const sign of [-1, 1]) {
    pipe(
      g,
      new T.Vector3(sign * (w / 2 + 0.3), 3.82, -d / 2 - 0.3),
      new T.Vector3(sign * (w / 2 + 0.3), 3.82, d / 2 + 0.3),
      0.075,
      materials.metal,
    );
    pipe(
      g,
      new T.Vector3(sign * (w / 2 + 0.2), 3.8, d / 2),
      new T.Vector3(sign * (w / 2 + 0.2), 0.2, d / 2),
      0.06,
      materials.metal,
    );
  }
  for (const xx of [-w * 0.31, w * 0.31]) {
    box(g, [1.5, 1.45, 0.2], [xx, 2.45, d / 2 + 0.07], materials.trim);
    box(g, [1.2, 1.17, 0.09], [xx, 2.47, d / 2 + 0.19], materials.glass);
    box(g, [0.055, 1.18, 0.07], [xx, 2.47, d / 2 + 0.25], materials.trim);
    box(g, [1.23, 0.05, 0.07], [xx, 2.47, d / 2 + 0.25], materials.trim);
    for (const s of [-1, 1])
      box(
        g,
        [0.3, 1.4, 0.11],
        [xx + s * 0.91, 2.45, d / 2 + 0.1],
        materials.greenwood,
      );
    box(g, [1.65, 0.15, 0.4], [xx, 1.63, d / 2 + 0.18], materials.trim);
  }
  box(
    g,
    [barn ? 2.3 : 1.4, 2.6, 0.18],
    [0, 1.4, d / 2 + 0.12],
    materials.greenwood,
  );
  for (const sign of [-1, 1]) {
    box(
      g,
      [0.1, 2.72, 0.24],
      [sign * (barn ? 1.21 : 0.78), 1.42, d / 2 + 0.17],
      materials.trim,
    );
  }
  box(
    g,
    [barn ? 2.6 : 1.7, 0.13, 0.23],
    [0, 2.77, d / 2 + 0.16],
    materials.trim,
  );
  box(g, [0.09, 2.45, 0.06], [0, 1.42, d / 2 + 0.25], materials.darkwood);
  if (barn) {
    for (const s of [-1, 1]) {
      const beam = box(
        g,
        [0.06, 2.6, 0.055],
        [s * 0.6, 1.4, d / 2 + 0.25],
        materials.darkwood,
      );
      beam.rotation.z = s * 0.42;
    }
  }
  box(g, [0.7, 2.2, 0.7], [-w * 0.3, 4.8, -d * 0.24], materials.stone);
  box(g, [0.85, 0.16, 0.85], [-w * 0.3, 5.97, -d * 0.24], materials.roof);
  // Porch and naturally weathered deck.
  box(g, [w * 0.68, 0.12, 2.25], [0, 0.19, d / 2 + 1.25], materials.wood);
  roof(g, w * 0.6, 2.5, 0.55, 3.05, materials.roof).position.z = d / 2 + 1.2;
  for (const xx of [-w * 0.28, w * 0.28])
    box(g, [0.16, 2.85, 0.16], [xx, 1.6, d / 2 + 2.22], materials.darkwood);
  return g;
}
function roundedRectangle(w: number, d: number, r: number) {
  const s = new T.Shape(),
    x = -w / 2,
    y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  s.closePath();
  return s;
}
export function createFarm(initial: FarmState): FarmObjects {
  const root = new T.Group();
  const targets: T.Mesh[] = [],
    fish: FishInstance[] = [],
    waters: WaterMesh[] = [];
  const r = seeded(139);
  const stone = surface("stone"),
    wood = surface("wood"),
    slate = surface("roof"),
    ground = surface("ground"),
    gravel = surface("gravel");
  for (const texture of [stone, wood, slate, ground, gravel])
    texture.userData.shared = true;
  stone.repeat.set(2, 1);
  slate.repeat.set(2, 2);
  ground.repeat.set(28, 28);
  gravel.repeat.set(10, 2);
  const materials = {
    soil: new T.MeshStandardMaterial({ color: paint("soil"), roughness: 1 }),
    reed: new T.MeshStandardMaterial({ color: paint("reed"), roughness: 1 }),
    leaf: new T.MeshStandardMaterial({
      color: paint("leaf"),
      side: T.DoubleSide,
      roughness: 1,
    }),
    machine: new T.MeshStandardMaterial({
      color: paint("machine"),
      roughness: 0.75,
    }),
    stone: new T.MeshStandardMaterial({ map: stone, roughness: 0.92 }),
    wood: new T.MeshStandardMaterial({ map: wood, roughness: 0.82 }),
    roof: new T.MeshStandardMaterial({
      map: slate,
      roughness: 0.73,
      metalness: 0.08,
      side: T.DoubleSide,
    }),
    concrete: new T.MeshStandardMaterial({
      color: paint("concrete"),
      roughness: 0.96,
    }),
    darkwood: new T.MeshStandardMaterial({
      color: paint("timber"),
      roughness: 0.87,
    }),
    trim: new T.MeshStandardMaterial({ color: paint("trim"), roughness: 0.86 }),
    greenwood: new T.MeshStandardMaterial({
      color: paint("shutter"),
      roughness: 0.8,
    }),
    glass: new T.MeshStandardMaterial({
      color: paint("glass"),
      metalness: 0.55,
      roughness: 0.16,
    }),
    metal: new T.MeshStandardMaterial({
      color: paint("metal"),
      metalness: 0.75,
      roughness: 0.35,
    }),
  };
  materials.reed.userData.seasonal = "reed";
  const floor = new T.Mesh(
    new T.PlaneGeometry(220, 180, 30, 30),
    new T.MeshStandardMaterial({ map: ground, roughness: 1 }),
  );
  floor.name = "terrain";
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.12;
  floor.receiveShadow = true;
  root.add(floor);
  const roadMat = new T.MeshStandardMaterial({ map: gravel, roughness: 0.94 });
  box(root, [7, 0.1, 85], [0, -0.05, 12], roadMat);
  box(root, [50, 0.08, 4], [0, -0.035, 5.5], roadMat);
  box(root, [43, 0.08, 4], [0, -0.035, -8], roadMat);
  building(root, -10, -17, 9, 6, 0, materials);

  // Water intake channel and headworks; stream is a real separate source in the scene.
  box(root, [64, 0.16, 2.4], [0, -0.01, -27], materials.concrete);
  const normal = waterNormal();
  const stream = new T.Mesh(
    new T.PlaneGeometry(65, 2.05),
    new T.MeshPhysicalMaterial({
      color: paint("stream"),
      roughness: 0.17,
      metalness: 0.28,
      normalMap: normal,
      normalScale: new T.Vector2(0.18, 0.18),
    }),
  );
  stream.rotation.x = -Math.PI / 2;
  stream.position.set(0, 0.09, -27);
  root.add(stream);
  for (const sign of [-1, 1])
    box(root, [65, 0.2, 0.25], [0, 0.1, -27 + sign * 1.2], materials.stone);
  type PondGroup = {
    group: T.Group;
    key: string;
    targets: T.Mesh[];
    fish: FishInstance[];
    waters: WaterMesh[];
    progress?: T.Mesh;
  };
  const pondGroups = new Map<number, PondGroup>();
  const assetGroups = new Map<
    Asset,
    { group: T.Group; key: string; progress?: T.Mesh; stock?: T.Group }
  >();
  const sharedMaterials = new Set<T.Material>(Object.values(materials));
  normal.userData.shared = true;
  function progressMarker(
    parent: T.Group,
    x: number,
    z: number,
    width: number,
  ) {
    box(parent, [width, 0.65, 0.12], [x, 1.8, z], materials.darkwood);
    const fill = box(
      parent,
      [width - 0.12, 0.22, 0.14],
      [x, 1.8, z + 0.01],
      materials.trim,
    );
    box(parent, [0.12, 1.7, 0.12], [x, 0.9, z], materials.wood);
    return fill;
  }
  function earthworks(
    parent: T.Group,
    x: number,
    z: number,
    w: number,
    d: number,
  ) {
    box(parent, [w, 0.12, d], [x, 0.03, z], materials.soil);
    const foundation = box(
      parent,
      [w - 0.5, 0.18, d - 0.5],
      [x, 0.16, z],
      materials.concrete,
    );
    foundation.name = "foundation";
    for (let i = 0; i < 6; i++)
      box(
        parent,
        [0.8, 0.3, 1.2],
        [x - 2 + (i % 3), 0.36 + Math.floor(i / 3) * 0.3, z + d / 2 + 0.9],
        materials.trim,
      );
    const machine = new T.Group();
    machine.position.set(x + w / 2 - 1.3, 0.2, z + d / 2 - 1.1);
    parent.add(machine);
    box(machine, [1.5, 0.4, 1.9], [0, 0.2, 0], materials.darkwood);
    box(machine, [1.1, 0.65, 1.15], [0, 0.7, 0], materials.machine);
    box(machine, [0.85, 0.8, 0.75], [0, 1.35, -0.12], materials.glass);
    const boom = new T.Group();
    boom.name = "excavator";
    machine.add(boom);
    pipe(
      boom,
      new T.Vector3(0.25, 0.8, 0.2),
      new T.Vector3(0.25, 2.4, 1.15),
      0.12,
      materials.machine,
    );
    pipe(
      boom,
      new T.Vector3(0.25, 2.4, 1.15),
      new T.Vector3(0.25, 0.5, 2.4),
      0.1,
      materials.machine,
    );
    box(boom, [0.75, 0.35, 0.55], [0.25, 0.35, 2.5], materials.metal);
    return progressMarker(parent, x, z + d / 2 + 0.7, 2.8);
  }
  function makePond(p: Pond): PondGroup {
    const group = new T.Group();
    group.name = `pond-${p.id}`;
    root.add(group);
    const entry: PondGroup = {
      group,
      key: pondStructure(p),
      targets: [],
      fish: [],
      waters: [],
    };
    const [x, z] = POND_POSITIONS[p.id - 1],
      [w, d] = pondSize(p),
      earth = p.facility === "earth";
    if (!p.built) {
      for (const xx of [-w / 2, w / 2])
        for (const zz of [-d / 2, d / 2]) {
          box(group, [0.1, 1, 0.1], [x + xx, 0.5, z + zz], materials.wood);
          box(
            group,
            [0.35, 0.22, 0.025],
            [x + xx + 0.17, 0.87, z + zz],
            materials.machine,
          );
        }
      for (const zz of [-d / 2, d / 2])
        pipe(
          group,
          new T.Vector3(x - w / 2, 0.63, z + zz),
          new T.Vector3(x + w / 2, 0.63, z + zz),
          0.018,
          materials.trim,
        );
      for (const xx of [-w / 2, w / 2])
        pipe(
          group,
          new T.Vector3(x + xx, 0.63, z - d / 2),
          new T.Vector3(x + xx, 0.63, z + d / 2),
          0.018,
          materials.trim,
        );
      if (p.constructionDays) entry.progress = earthworks(group, x, z, w, d);
      else
        for (let i = 0; i < 18; i++) {
          const tuft = new T.Mesh(
            new T.ConeGeometry(0.15, 0.6, 4),
            materials.reed,
          );
          tuft.position.set(
            x + (r() - 0.5) * (w - 1),
            0.3,
            z + (r() - 0.5) * (d - 1),
          );
          group.add(tuft);
        }
    } else {
      if (earth) {
        const bankShape = roundedRectangle(w + 1.8, d + 1.8, 1.8);
        bankShape.holes.push(roundedRectangle(w - 0.3, d - 0.3, 1.1));
        const bank = new T.Mesh(
          new T.ExtrudeGeometry(bankShape, {
            depth: 0.65,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 1,
            bevelSize: 0.32,
            bevelThickness: 0.2,
            curveSegments: 6,
          }),
          materials.soil,
        );
        bank.rotation.x = -Math.PI / 2;
        bank.position.set(x, 0.15, z);
        bank.receiveShadow = true;
        bank.castShadow = true;
        group.add(bank);
        for (let i = 0; i < 26; i++) {
          const side = i % 2 ? -1 : 1,
            xx = x + (r() - 0.5) * (w - 2),
            zz = z + side * (d / 2 + 0.25);
          for (let j = 0; j < 3; j++)
            pipe(
              group,
              new T.Vector3(xx + j * 0.06, 0.25, zz),
              new T.Vector3(xx + 0.1 + j * 0.08, 1 + r() * 0.7, zz + 0.1),
              0.027,
              materials.reed,
            );
        }
        for (let i = 0; i < 7; i++) {
          const pad = new T.Mesh(
            new T.CircleGeometry(0.18 + r() * 0.12, 12, 0, Math.PI * 1.85),
            materials.leaf,
          );
          pad.name = "lily-pad";
          pad.rotation.x = -Math.PI / 2;
          pad.position.set(
            x - w / 2 + 1 + r(),
            0.695,
            z + (r() - 0.5) * (d - 2),
          );
          group.add(pad);
        }
      } else {
        box(group, [w + 0.5, 0.32, d + 0.5], [x, 0.06, z], materials.concrete);
        for (const zz of [-d / 2, d / 2]) {
          box(
            group,
            [w + 0.5, 0.8, 0.3],
            [x, 0.44, z + zz],
            materials.concrete,
          );
          box(group, [w + 0.6, 0.1, 0.43], [x, 0.89, z + zz], materials.trim);
        }
        for (const xx of [-w / 2, w / 2]) {
          box(group, [0.3, 0.8, d], [x + xx, 0.44, z], materials.concrete);
          box(group, [0.43, 0.1, d + 0.35], [x + xx, 0.89, z], materials.trim);
        }
      }
      const geometry = earth
        ? new T.ShapeGeometry(roundedRectangle(w - 0.3, d - 0.3, 1.1), 10)
        : new T.PlaneGeometry(w - 0.3, d - 0.3, 8, 5);
      const water = new T.Mesh(
        geometry,
        new T.MeshPhysicalMaterial({
          color: paint(earth ? "water-earth" : "water-source"),
          transparent: true,
          opacity: earth ? 0.92 : 0.64,
          roughness: 0.32,
          metalness: 0.08,
          normalMap: normal,
          normalScale: new T.Vector2(0.12, 0.1),
          side: T.DoubleSide,
          depthWrite: false,
        }),
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(x, 0.67, z);
      water.userData.pondId = p.id;
      group.add(water);
      entry.waters.push(water);
      box(
        group,
        [1.35, 0.13, d + 1.4],
        [x + w / 2 + 0.85, 0.5, z],
        materials.wood,
      );
      for (const zz of [-d / 2, d / 2])
        box(
          group,
          [0.09, 1.1, 0.09],
          [x + w / 2 + 1.4, 1, z + zz],
          materials.darkwood,
        );
      box(
        group,
        [0.08, 0.08, d],
        [x + w / 2 + 1.4, 1.5, z],
        materials.darkwood,
      );
      pipe(
        group,
        new T.Vector3(x - w / 2 - 0.5, 0.1, z - 1),
        new T.Vector3(x - w / 2 - 0.5, 1.3, z - 1),
        0.13,
        materials.metal,
      );
      pipe(
        group,
        new T.Vector3(x - w / 2 - 0.5, 1.3, z - 1),
        new T.Vector3(x - w / 2 + 0.6, 1.3, z - 1),
        0.13,
        materials.metal,
      );
      for (const [fx, fz, height, cy] of [
        [x - w / 2 + 0.6, z - 1, 0.62, 0.98],
        [x + w / 2 + 0.3, z + 1, 0.5, 0.42],
      ]) {
        const fall = new T.Mesh(
          new T.PlaneGeometry(0.3, height),
          new T.MeshBasicMaterial({
            color: paint("water-foam"),
            transparent: true,
            opacity: 0.55,
            side: T.DoubleSide,
          }),
        );
        fall.position.set(fx, cy, fz);
        group.add(fall);
      }
      if (!earth)
        for (let i = 0; i < 7; i++) {
          const foam = new T.Mesh(
            new T.PlaneGeometry(0.2 + r() * 0.35, 0.055),
            new T.MeshBasicMaterial({
              color: paint("water-foam"),
              transparent: true,
              opacity: 0.42,
              depthWrite: false,
            }),
          );
          foam.rotation.x = -Math.PI / 2;
          foam.position.set(
            x - w / 2 + 0.55 + r(),
            0.69,
            z - 1 + (r() - 0.5) * 0.8,
          );
          group.add(foam);
        }
      if (p.upgrade >= 1) {
        box(
          group,
          [0.8, 0.5, 0.8],
          [x + w / 2 + 0.8, 0.82, z - d / 2 + 0.5],
          materials.greenwood,
        );
        for (let j = 0; j < 3; j++) {
          const ring = new T.Mesh(
            new T.TorusGeometry(0.3 + j * 0.13, 0.012, 4, 24),
            new T.MeshBasicMaterial({
              color: paint("water-foam"),
              transparent: true,
              opacity: 0.45 - j * 0.1,
            }),
          );
          ring.rotation.x = Math.PI / 2;
          ring.position.set(x + w / 2 - 1, 0.69, z);
          group.add(ring);
        }
      }
      if (p.upgrade >= 2 || p.facility === "ras")
        for (let i = 0; i < (p.facility === "ras" ? 2 : 1); i++) {
          const filter = new T.Mesh(
            new T.CylinderGeometry(0.6, 0.6, 1.3, 16),
            materials.greenwood,
          );
          filter.position.set(x - w / 2 - 0.9, 0.8, z + 0.8 + i * 1.6);
          filter.castShadow = true;
          group.add(filter);
          pipe(
            group,
            new T.Vector3(x - w / 2 - 0.9, 1.3, z + 0.8 + i * 1.6),
            new T.Vector3(x - w / 2 + 0.4, 1.3, z + 0.8 + i * 1.6),
            0.09,
            materials.metal,
          );
          const lid = new T.Mesh(
            new T.CylinderGeometry(0.62, 0.62, 0.08, 16),
            materials.trim,
          );
          lid.position.copy(filter.position).y = 1.49;
          group.add(lid);
        }
      if (p.facility === "ras") {
        const glass = new T.MeshPhysicalMaterial({
          color: paint("glass"),
          roughness: 0.2,
          transparent: true,
          opacity: 0.13,
          side: T.DoubleSide,
          depthWrite: false,
        });
        for (let j = 0; j < 5; j++) {
          const zz = z - d / 2 - 1 + (j * (d + 2)) / 4;
          for (const sign of [-1, 1]) {
            pipe(
              group,
              new T.Vector3(x + sign * (w / 2 + 0.5), 0, zz),
              new T.Vector3(x + sign * (w / 2 + 0.5), 3.2, zz),
              0.045,
              materials.metal,
            );
            pipe(
              group,
              new T.Vector3(x + sign * (w / 2 + 0.5), 3.2, zz),
              new T.Vector3(x, 4.6, zz),
              0.045,
              materials.metal,
            );
          }
        }
        const greenhouse = new T.Group();
        greenhouse.position.set(x, 0, z);
        group.add(greenhouse);
        roof(greenhouse, w + 1, d + 2, 1.4, 3.2, glass);
      }
      if (p.count && p.species)
        for (let i = 0; i < Math.min(8, p.count); i++) {
          const mesh = createFish(p.species, false),
            scale = 0.17 + p.weight ** (1 / 3) * 0.14;
          mesh.scale.setScalar(scale);
          group.add(mesh);
          entry.fish.push({
            mesh,
            pondId: p.id,
            swimmer: createSwimmer(i + p.id * 13, p.species, {
              halfWidth: earth ? 5.1 : 4.8,
              halfDepth: earth ? 2.9 : 1.75,
            }),
            scale,
          });
        }
    }
    const hit = new T.Mesh(
      new T.BoxGeometry(w, 0.05, d),
      new T.MeshBasicMaterial({ visible: false }),
    );
    hit.position.set(x, 1, z);
    hit.userData.pondId = p.id;
    group.add(hit);
    entry.targets.push(hit);
    return entry;
  }
  function makeAsset(game: FarmState, id: Asset) {
    const state = assetState(game, id),
      group = new T.Group();
    group.name = id;
    root.add(group);
    const entry: {
        group: T.Group;
        key: string;
        progress?: T.Mesh;
        stock?: T.Group;
      } = { group, key: `${state.built}:${state.working}` },
      [x, z] = ASSET_POSITIONS[id];
    if (state.working) {
      entry.progress = earthworks(group, x, z, 8, 6);
      for (const sign of [-1, 1])
        for (let i = 0; i < 3; i++)
          pipe(
            group,
            new T.Vector3(x - 4 + i * 4, 0, z + sign * 3.2),
            new T.Vector3(x - 4 + i * 4, 3, z + sign * 3.2),
            0.055,
            materials.metal,
          );
    }
    if (state.built) {
      building(group, x, z, 8, 6, 0, materials, id !== "coldstore");
      if (id === "warehouse") {
        const silo = new T.Mesh(
          new T.CylinderGeometry(0.85, 0.85, 3, 16),
          materials.metal,
        );
        silo.position.set(x + 5.5, 2.5, z);
        silo.castShadow = true;
        group.add(silo);
        const top = new T.Mesh(
          new T.ConeGeometry(0.89, 0.8, 16),
          materials.roof,
        );
        top.position.set(x + 5.5, 4.4, z);
        group.add(top);
        for (const sx of [-0.5, 0.5])
          for (const sz of [-0.5, 0.5])
            box(
              group,
              [0.1, 1.3, 0.1],
              [x + 5.5 + sx, 0.65, z + sz],
              materials.metal,
            );
        const stock = new T.Group();
        entry.stock = stock;
        group.add(stock);
        for (let i = 0; i < 10; i++)
          box(
            stock,
            [0.9, 0.33, 0.6],
            [x - 2 + (i % 5), 0.4 + Math.floor(i / 5) * 0.34, z + 3.8],
            materials.trim,
          );
      }
      if (id === "coldstore") {
        box(group, [1.5, 1.4, 0.7], [x + 2, 1.8, z + 3.45], materials.trim);
        for (const sx of [-0.38, 0.38]) {
          const fan = new T.Mesh(
            new T.TorusGeometry(0.28, 0.035, 6, 16),
            materials.metal,
          );
          fan.position.set(x + 2 + sx, 1.8, z + 3.82);
          group.add(fan);
          for (let j = 0; j < 3; j++) {
            const blade = box(
              group,
              [0.48, 0.06, 0.03],
              [x + 2 + sx, 1.8, z + 3.85],
              materials.metal,
            );
            blade.rotation.z = (j * Math.PI) / 3;
          }
        }
      }
      if (id === "workshop")
        box(group, [3, 0.65, 0.12], [x, 3.3, z + 3.08], materials.machine);
    }
    return entry;
  }
  function update(game: FarmState) {
    for (const p of game.ponds) {
      let entry = pondGroups.get(p.id);
      if (!entry || entry.key !== pondStructure(p)) {
        const previous = entry?.fish.map((f) => f.swimmer);
        if (entry) {
          root.remove(entry.group);
          disposeObject(entry.group, sharedMaterials);
        }
        entry = makePond(p);
        pondGroups.set(p.id, entry);
        entry.fish.forEach((f, i) => {
          if (previous?.[i]?.species === f.swimmer.species)
            f.swimmer = previous[i];
        });
      }
      const progress = pondProgress(p);
      entry.group.userData.progress = progress;
      if (entry.progress) entry.progress.scale.x = Math.max(0.01, progress);
      const foundation = entry.group.getObjectByName("foundation");
      if (foundation) foundation.scale.x = Math.max(0.02, progress);
    }
    for (const id of assetIds) {
      const state = assetState(game, id),
        key = `${state.built}:${state.working}`;
      let entry = assetGroups.get(id);
      if (!entry || entry.key !== key) {
        if (entry) {
          root.remove(entry.group);
          disposeObject(entry.group, sharedMaterials);
        }
        entry = makeAsset(game, id);
        assetGroups.set(id, entry);
      }
      entry.group.userData.progress = state.progress;
      if (entry.progress)
        entry.progress.scale.x = Math.max(0.01, state.progress);
      if (entry.stock)
        entry.stock.children.forEach((child, i) => {
          child.visible = game.food > i * 50;
        });
    }
    targets.splice(
      0,
      targets.length,
      ...[...pondGroups.values()].flatMap((e) => e.targets),
    );
    fish.splice(
      0,
      fish.length,
      ...[...pondGroups.values()].flatMap((e) => e.fish),
    );
    waters.splice(
      0,
      waters.length,
      ...[...pondGroups.values()].flatMap((e) => e.waters),
    );
  }
  update(initial);
  // Instanced trees keep draw calls bounded while retaining canopy variation.
  const leafGeometry = new T.IcosahedronGeometry(1, 2);
  const leafPos = leafGeometry.getAttribute("position");
  for (let i = 0; i < leafPos.count; i++) {
    const x = leafPos.getX(i),
      y = leafPos.getY(i),
      z = leafPos.getZ(i);
    const f =
      1 + 0.035 * Math.sin(x * 12 + y * 10) + 0.035 * Math.cos(z * 16 - x * 9);
    leafPos.setXYZ(i, x * f, y * f, z * f);
  }
  leafGeometry.computeVertexNormals();
  const leaves = new T.InstancedMesh(
    leafGeometry,
    new T.MeshStandardMaterial({
      roughness: 1,
      color: paint("fish-highlight"),
    }),
    280,
  );
  const trunks = new T.InstancedMesh(
    new T.CylinderGeometry(0.11, 0.22, 3.8, 7),
    materials.darkwood,
    56,
  );
  const dummy = new T.Object3D();
  for (let i = 0; i < 56; i++) {
    const side = i % 4;
    const x =
      side === 0
        ? -30 - r() * 14
        : side === 1
          ? 30 + r() * 17
          : (r() - 0.5) * 90;
    const z =
      side === 2
        ? -33 - r() * 18
        : side === 3
          ? 26 + r() * 18
          : (r() - 0.5) * 75;
    const h = 1 + r() * 0.8;
    dummy.position.set(x, 1.7 * h, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, h, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    for (let j = 0; j < 5; j++) {
      dummy.position.set(
        x + (r() - 0.5) * 3,
        3.5 * h + r() * 1.6,
        z + (r() - 0.5) * 3,
      );
      dummy.scale.set(1.8 + r(), 1.5 + r() * 1.6, 1.8 + r());
      dummy.rotation.set(r(), r(), r());
      dummy.updateMatrix();
      leaves.setMatrixAt(i * 5 + j, dummy.matrix);
      leaves.setColorAt(
        i * 5 + j,
        new T.Color(paint("leaf")).multiplyScalar(0.85 + r() * 0.3),
      );
    }
  }
  leaves.name = "foliage";
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  trunks.castShadow = true;
  root.add(leaves, trunks);
  const grassGeo = new T.BufferGeometry();
  grassGeo.setAttribute(
    "position",
    new T.Float32BufferAttribute(
      [-0.025, 0, 0, 0.025, 0, 0, 0.015, 0.38, 0],
      3,
    ),
  );
  grassGeo.computeVertexNormals();
  const grass = new T.InstancedMesh(
    grassGeo,
    new T.MeshStandardMaterial({
      color: paint("meadow"),
      side: T.DoubleSide,
      roughness: 1,
    }),
    1800,
  );
  for (let i = 0; i < 1800; i++) {
    let x = (r() - 0.5) * 66,
      z = (r() - 0.5) * 65;
    if (Math.abs(x) < 23 && z > -24 && z < 22) {
      x = (r() > 0.5 ? 1 : -1) * (23 + r() * 10);
    }
    dummy.position.set(x, 0.02, z);
    dummy.scale.setScalar(0.6 + r());
    dummy.rotation.set(0, r() * 6.28, 0);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
    grass.setColorAt(
      i,
      new T.Color(paint("reed")).multiplyScalar(0.85 + r() * 0.3),
    );
  }
  grass.name = "meadow";
  root.add(grass);
  // Split-rail fencing with a gate across the front.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const x = side * (4 + i * 2.9);
      box(root, [0.13, 1.2, 0.13], [x, 0.6, 23], materials.wood);
      if (i < 8) {
        box(
          root,
          [2.95, 0.1, 0.09],
          [x + side * 1.45, 0.5, 23],
          materials.wood,
        );
        box(root, [2.95, 0.1, 0.09], [x + side * 1.45, 1, 23], materials.wood);
      }
    }
  }
  const selection = new T.Mesh(
    new T.RingGeometry(1, 1.025, 96),
    new T.MeshBasicMaterial({
      color: paint("selection"),
      transparent: true,
      opacity: 0.95,
      side: T.DoubleSide,
      depthWrite: false,
    }),
  );
  selection.rotation.x = -Math.PI / 2;
  selection.scale.set(7.8, 4.8, 1);
  selection.position.y = 1.03;
  root.add(selection);
  return {
    root,
    targets,
    fish,
    waters,
    selection,
    normal,
    update,
    ponds: pondGroups,
    assets: assetGroups,
    dispose() {
      disposeObject(root, sharedMaterials);
      normal.dispose();
      for (const m of sharedMaterials) m.dispose();
      for (const texture of [stone, wood, slate, ground, gravel])
        texture.dispose();
    },
  };
}
export function disposeObject(
  root: T.Object3D,
  preserved = new Set<T.Material>(),
) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>(),
    textures = new Set<T.Texture>();
  root.traverse((o) => {
    if (o instanceof T.Mesh || o instanceof T.Line || o instanceof T.Points) {
      if (o.geometry) geometries.add(o.geometry);
      if (o instanceof T.InstancedMesh) o.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        materials.add(m);
    }
  });
  for (const m of materials) {
    if (preserved.has(m)) continue;
    for (const value of Object.values(m))
      if (value instanceof T.Texture) textures.add(value);
    m.dispose();
  }
  for (const g of geometries) g.dispose();
  for (const t of textures) if (!t.userData.shared) t.dispose();
}
