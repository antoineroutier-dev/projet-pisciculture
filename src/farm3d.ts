import * as T from "three";
import { type Pond } from "./game";
import { createFish } from "./fish3d";

export const POND_POSITIONS: [number, number][] = [
  [-9, -1],
  [9, -0.4],
  [-9, 12],
  [10, 12],
];
export type FishInstance = {
  mesh: T.Group;
  pondId: number;
  phase: number;
  scale: number;
};
export type FarmObjects = {
  root: T.Group;
  targets: T.Mesh[];
  fish: FishInstance[];
  waters: T.Mesh<T.PlaneGeometry, T.MeshPhysicalMaterial>[];
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
    stone: ["#a89e88", "#b5ac96", "#938e7e", "#c1b69f"],
    wood: ["#81664a", "#8b7150", "#987c56", "#69543e"],
    roof: ["#525d60", "#606b6d", "#6c7678", "#4a5659"],
    ground: ["#829166", "#75895d", "#909971", "#6d8159"],
    gravel: ["#c5bda6", "#b0ad96", "#d2c9b0", "#999d8b"],
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
        ctx.strokeStyle = "#302e231f";
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
        ctx.strokeStyle = "#322b1e27";
        ctx.beginPath();
        const x = i * 30 + r() * 25;
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 8, 150, x - 5, 380, x + 3, 512);
        ctx.stroke();
      }
    }
  for (let i = 0; i < 22000; i++) {
    ctx.fillStyle = i % 2 ? "#f6edc316" : "#18201c13";
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
export function createFarm(ponds: Pond[]): FarmObjects {
  const root = new T.Group();
  const targets: T.Mesh[] = [],
    fish: FishInstance[] = [],
    waters: T.Mesh<T.PlaneGeometry, T.MeshPhysicalMaterial>[] = [];
  const r = seeded(139);
  const stone = surface("stone"),
    wood = surface("wood"),
    slate = surface("roof"),
    ground = surface("ground"),
    gravel = surface("gravel");
  stone.repeat.set(2, 1);
  slate.repeat.set(2, 2);
  ground.repeat.set(28, 28);
  gravel.repeat.set(10, 2);
  const materials = {
    stone: new T.MeshStandardMaterial({ map: stone, roughness: 0.92 }),
    wood: new T.MeshStandardMaterial({ map: wood, roughness: 0.82 }),
    roof: new T.MeshStandardMaterial({
      map: slate,
      roughness: 0.73,
      metalness: 0.08,
      side: T.DoubleSide,
    }),
    concrete: new T.MeshStandardMaterial({ color: "#b5b6a3", roughness: 0.96 }),
    darkwood: new T.MeshStandardMaterial({ color: "#594b35", roughness: 0.87 }),
    trim: new T.MeshStandardMaterial({ color: "#ddd5bd", roughness: 0.86 }),
    greenwood: new T.MeshStandardMaterial({ color: "#476052", roughness: 0.8 }),
    glass: new T.MeshStandardMaterial({
      color: "#9db2ae",
      metalness: 0.55,
      roughness: 0.16,
    }),
    metal: new T.MeshStandardMaterial({
      color: "#8c9590",
      metalness: 0.75,
      roughness: 0.35,
    }),
  };
  const floor = new T.Mesh(
    new T.PlaneGeometry(220, 180, 30, 30),
    new T.MeshStandardMaterial({ map: ground, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.12;
  floor.receiveShadow = true;
  root.add(floor);
  const roadMat = new T.MeshStandardMaterial({ map: gravel, roughness: 0.94 });
  box(root, [7, 0.1, 85], [0, -0.05, 12], roadMat);
  box(root, [50, 0.08, 4], [0, -0.035, 5.5], roadMat);
  box(root, [43, 0.08, 4], [0, -0.035, -8], roadMat);
  building(root, -10, -17, 9, 6, 0, materials);
  building(root, 10, -16, 10, 7, 0, materials, true);
  // Water intake channel and headworks; stream is a real separate source in the scene.
  box(root, [64, 0.16, 2.4], [0, -0.01, -27], materials.concrete);
  const normal = waterNormal();
  const stream = new T.Mesh(
    new T.PlaneGeometry(65, 2.05),
    new T.MeshPhysicalMaterial({
      color: "#658f86",
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
  for (const p of ponds) {
    const [x, z] = POND_POSITIONS[p.id - 1];
    const earth = p.facility === "earth";
    const w = earth ? 13 : 12,
      d = earth ? 8 : 5.8;
    if (!p.built) {
      box(
        root,
        [w, 0.045, d],
        [x, 0, z],
        new T.MeshStandardMaterial({
          color: p.constructionDays ? "#b6a083" : "#7f8b59",
          roughness: 1,
        }),
      );
      for (const xx of [-w / 2, w / 2])
        for (const zz of [-d / 2, d / 2]) {
          box(root, [0.12, 0.95, 0.12], [x + xx, 0.47, z + zz], materials.wood);
        }
      if (p.constructionDays) {
        for (let i = 0; i < 8; i++)
          box(
            root,
            [0.7, 0.3, 1.2],
            [x - 3 + (i % 4) * 1.0, 0.2 + Math.floor(i / 4) * 0.3, z],
            materials.concrete,
          );
      }
    } else {
      const shell = new T.Group();
      shell.position.set(x, 0, z);
      root.add(shell);
      const basinMat = earth
        ? new T.MeshStandardMaterial({ color: "#726d45", roughness: 1 })
        : materials.concrete;
      box(shell, [w + 0.5, 0.35, d + 0.5], [0, 0.06, 0], basinMat);
      // Above-ground rim: 0.8 m wall, interior water at 0.64 m.
      for (const zz of [-d / 2, d / 2]) {
        box(shell, [w + 0.5, 0.8, 0.3], [0, 0.44, zz], basinMat);
        box(
          shell,
          [w + 0.7, 0.1, 0.48],
          [0, 0.89, zz],
          earth ? materials.wood : materials.trim,
        );
      }
      for (const xx of [-w / 2, w / 2]) {
        box(shell, [0.3, 0.8, d], [xx, 0.44, 0], basinMat);
        box(
          shell,
          [0.48, 0.1, d + 0.35],
          [xx, 0.89, 0],
          earth ? materials.wood : materials.trim,
        );
      }
      const waterMat = new T.MeshPhysicalMaterial({
        color: earth ? "#596f43" : "#387775",
        transparent: true,
        opacity: earth ? 0.92 : 0.62,
        roughness: 0.18,
        metalness: 0.16,
        normalMap: normal,
        normalScale: new T.Vector2(0.14, 0.12),
        envMapIntensity: 1.5,
        side: T.DoubleSide,
        depthWrite: false,
      });
      const water = new T.Mesh(
        new T.PlaneGeometry(w - 0.3, d - 0.3, 10, 7),
        waterMat,
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(x, 0.67, z);
      water.userData.pondId = p.id;
      root.add(water);
      waters.push(water);
      // Timber access platform, guard rails and sluice boards.
      box(root, [2.2, 0.12, d + 1.9], [x + w / 2 + 1, 0.5, z], materials.wood);
      for (let k = 0; k < 4; k++) {
        box(
          root,
          [0.1, 1.15, 0.1],
          [x + w / 2 + 1.9, 1, z - d / 2 + k * (d / 3)],
          materials.darkwood,
        );
      }
      box(
        root,
        [0.08, 0.08, d + 1],
        [x + w / 2 + 1.9, 1.53, z],
        materials.darkwood,
      );
      box(
        root,
        [1, 0.75, 0.15],
        [x + w / 2 - 0.25, 0.57, z],
        materials.greenwood,
      );
      pipe(
        root,
        new T.Vector3(x - w / 2 - 1, 0.3, z - 1),
        new T.Vector3(x - w / 2 - 1, 1.2, z - 1),
        0.15,
        materials.metal,
      );
      pipe(
        root,
        new T.Vector3(x - w / 2 - 1, 1.2, z - 1),
        new T.Vector3(x - w / 2 + 0.5, 1.2, z - 1),
        0.15,
        materials.metal,
      );
      // Thin falling inlet ribbon, intentionally distinct from the pond surface.
      const fall = new T.Mesh(
        new T.PlaneGeometry(0.22, 0.56),
        new T.MeshPhysicalMaterial({
          color: "#b8e0d9",
          transparent: true,
          opacity: 0.55,
          roughness: 0.2,
          side: T.DoubleSide,
        }),
      );
      fall.position.set(x - w / 2 + 0.5, 0.91, z - 1);
      root.add(fall);
      if (p.upgrade >= 1) {
        box(
          root,
          [0.8, 0.5, 0.8],
          [x + w / 2 + 1, 0.78, z - d / 2 + 0.5],
          materials.greenwood,
        );
        for (let j = 0; j < 3; j++) {
          const ring = new T.Mesh(
            new T.TorusGeometry(0.3 + j * 0.13, 0.012, 4, 30),
            new T.MeshBasicMaterial({
              color: "#d6e5d9",
              transparent: true,
              opacity: 0.45 - j * 0.1,
            }),
          );
          ring.rotation.x = Math.PI / 2;
          ring.position.set(x + w / 2 - 1, 0.69, z);
          root.add(ring);
        }
      }
      if (p.upgrade >= 2) {
        const filter = new T.Mesh(
          new T.CylinderGeometry(0.6, 0.6, 1.3, 20),
          materials.greenwood,
        );
        filter.position.set(x - w / 2 - 1, 0.8, z + 1.4);
        filter.castShadow = true;
        root.add(filter);
        pipe(
          root,
          new T.Vector3(x - w / 2 - 1, 1.3, z + 1.4),
          new T.Vector3(x - w / 2 + 0.4, 1.3, z + 1.4),
          0.09,
          materials.metal,
        );
      }
      if (p.facility === "ras") {
        // Clear greenhouse roof, with access left visible from the front.
        const glass = new T.MeshPhysicalMaterial({
          color: "#d5e8db",
          roughness: 0.06,
          metalness: 0.08,
          transparent: true,
          opacity: 0.13,
          side: T.DoubleSide,
          depthWrite: false,
        });
        for (let j = 0; j < 5; j++) {
          const zz = z - d / 2 - 1 + (j * (d + 2)) / 4;
          pipe(
            root,
            new T.Vector3(x - w / 2 - 0.5, 0, zz),
            new T.Vector3(x - w / 2 - 0.5, 3.2, zz),
            0.045,
            materials.metal,
          );
          pipe(
            root,
            new T.Vector3(x + w / 2 + 0.5, 0, zz),
            new T.Vector3(x + w / 2 + 0.5, 3.2, zz),
            0.045,
            materials.metal,
          );
          pipe(
            root,
            new T.Vector3(x - w / 2 - 0.5, 3.2, zz),
            new T.Vector3(x, 4.6, zz),
            0.045,
            materials.metal,
          );
          pipe(
            root,
            new T.Vector3(x + w / 2 + 0.5, 3.2, zz),
            new T.Vector3(x, 4.6, zz),
            0.045,
            materials.metal,
          );
        }
        const greenhouse = new T.Group();
        greenhouse.position.set(x, 0, z);
        root.add(greenhouse);
        roof(greenhouse, w + 1, d + 2, 1.4, 3.2, glass);
      }
      if (p.count && p.species)
        for (let i = 0; i < 8; i++) {
          const f = createFish(p.species, false);
          const scale = 0.17 + p.weight ** (1 / 3) * 0.14;
          f.scale.setScalar(scale);
          f.position.set(
            x + (r() - 0.5) * (w - 3),
            0.42,
            z + (r() - 0.5) * (d - 1.2),
          );
          root.add(f);
          fish.push({ mesh: f, pondId: p.id, phase: r() * Math.PI * 2, scale });
        }
    }
    const hit = new T.Mesh(
      new T.BoxGeometry(w, 0.05, d),
      new T.MeshBasicMaterial({ visible: false }),
    );
    hit.position.set(x, 1, z);
    hit.userData.pondId = p.id;
    root.add(hit);
    targets.push(hit);
  }
  // Service yard: feed silo, clean storage and stone boundary.
  const silo = new T.Group();
  silo.position.set(18, 0, -15);
  root.add(silo);
  const metalWhite = new T.MeshStandardMaterial({
    color: "#d1d1bd",
    metalness: 0.3,
    roughness: 0.5,
  });
  const siloBody = new T.Mesh(
    new T.CylinderGeometry(1.05, 1.05, 3, 20),
    metalWhite,
  );
  siloBody.position.y = 3.1;
  siloBody.castShadow = true;
  silo.add(siloBody);
  const cone = new T.Mesh(new T.ConeGeometry(1.1, 1, 20), materials.roof);
  cone.position.y = 5.1;
  silo.add(cone);
  for (const [xx, zz] of [
    [-0.7, -0.7],
    [0.7, -0.7],
    [-0.7, 0.7],
    [0.7, 0.7],
  ])
    box(silo, [0.1, 2, 0.1], [xx, 1, zz], materials.metal);
  for (let i = 0; i < 10; i++) {
    box(
      root,
      [1.1, 0.32, 0.65],
      [6 + (i % 5) * 1.2, 0.38 + Math.floor(i / 5) * 0.34, -10.6],
      new T.MeshStandardMaterial({
        color: i % 3 ? "#b9ac89" : "#9b9e7c",
        roughness: 0.9,
      }),
    );
  }
  // Instanced trees keep draw calls bounded while retaining canopy variation.
  const leafGeometry = new T.SphereGeometry(1, 24, 18);
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
    new T.MeshStandardMaterial({ roughness: 1, color: "#415a31" }),
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
        new T.Color().setHSL(
          0.22 + r() * 0.035,
          0.2 + r() * 0.14,
          0.28 + r() * 0.13,
        ),
      );
    }
  }
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
      color: "#7c8b51",
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
      new T.Color().setHSL(
        0.19 + r() * 0.05,
        0.2 + r() * 0.2,
        0.34 + r() * 0.12,
      ),
    );
  }
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
      color: "#ece5bf",
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
  return { root, targets, fish, waters, selection, normal };
}
export function disposeObject(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>(),
    textures = new Set<T.Texture>();
  root.traverse((o) => {
    if (o instanceof T.Mesh || o instanceof T.Line) {
      if (o.geometry) geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        materials.add(m);
    }
  });
  for (const m of materials) {
    for (const value of Object.values(m))
      if (value instanceof T.Texture) textures.add(value);
    m.dispose();
  }
  for (const g of geometries) g.dispose();
  for (const t of textures) if (!t.userData.shared) t.dispose();
}
