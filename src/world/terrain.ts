import * as T from "three";
import { paint } from "./palette";

/** Flat working area of the farm; hills only rise outside it. */
export const FARM_BOUNDS = { minX: -44, maxX: 44, minZ: -36, maxZ: 32 };
export const GROUND_Y = -0.04;
/** Painted ground covers this square around the farm (world units). */
export const PAINT_EXTENT = 120;
const PAINT_SIZE = 2048;

type Point = [number, number];
type Road = { points: Point[]; width: number; ruts?: boolean };
/** Lanes the trucks already follow, painted instead of extruded boxes. */
export const ROADS: Road[] = [
  {
    points: [
      [0, -11],
      [0, 30],
      [1.5, 42],
      [-3.5, 58],
      [2.5, 76],
      [-1, 98],
      [1, 125],
    ],
    width: 5.6,
    ruts: true,
  },
  {
    // Service loop around the pond plots, back to the farmyard.
    points: [
      [-25.5, -7.6],
      [-25.5, 3],
      [-23, 5.5],
      [23, 5.5],
      [25.5, 3],
      [25.5, -7.6],
    ],
    width: 3.8,
  },
];
export const YARD = { x0: -29, x1: 28.5, z0: -20.5, z1: -7.4 };
export const CHANNEL_Z = -27;
const PONDS: Point[] = [
  [-9, -1],
  [9, -0.4],
  [-9, 12],
  [10, 12],
];

export function seeded(seed: number) {
  let n = seed;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
function hash(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function smooth(t: number) {
  return t * t * (3 - 2 * t);
}
function valueNoise(x: number, z: number) {
  const xi = Math.floor(x),
    zi = Math.floor(z),
    xf = smooth(x - xi),
    zf = smooth(z - zi);
  const a = hash(xi, zi),
    b = hash(xi + 1, zi),
    c = hash(xi, zi + 1),
    d = hash(xi + 1, zi + 1);
  return a + (b - a) * xf + (c - a) * zf + (a - b - c + d) * xf * zf;
}
/** Fractal noise in [0, 1]. */
export function fbm(x: number, z: number, octaves = 4) {
  let sum = 0,
    amp = 0.5,
    norm = 0,
    f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * f, z * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}
function smoothstep(a: number, b: number, v: number) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
/** Distance outside the flat farm, weighted so the far side rises first. */
function outside(x: number, z: number) {
  const dx = Math.max(FARM_BOUNDS.minX - x, 0, x - FARM_BOUNDS.maxX);
  const back = Math.max(FARM_BOUNDS.minZ - z, 0);
  const front = Math.max(z - FARM_BOUNDS.maxZ, 0);
  return Math.hypot(dx * 0.85, back * 1.25 + front * 0.42);
}
/** Ground height; the farm stays flat, hills and a forest rim close the horizon. */
export function terrainHeight(x: number, z: number) {
  const d = outside(x, z);
  if (d <= 0) return GROUND_Y;
  const rise = smoothstep(0, 95, d);
  const ridges = fbm(x * 0.016 + 3.1, z * 0.016 - 1.7);
  return GROUND_Y + rise * (2 + 10 * ridges) + rise * rise * 6;
}
function segmentDistance(px: number, pz: number, a: Point, b: Point) {
  const vx = b[0] - a[0],
    vz = b[1] - a[1];
  const t = Math.max(
    0,
    Math.min(1, ((px - a[0]) * vx + (pz - a[1]) * vz) / (vx * vx + vz * vz)),
  );
  return Math.hypot(px - a[0] - vx * t, pz - a[1] - vz * t);
}
export function roadDistance(x: number, z: number) {
  let best = Infinity;
  for (const road of ROADS)
    for (let i = 1; i < road.points.length; i++)
      best = Math.min(
        best,
        segmentDistance(x, z, road.points[i - 1], road.points[i]) -
          road.width / 2,
      );
  return best;
}
/** Free meadow for decoration: no lane, yard, pond site, channel or building. */
export function isOpenGround(x: number, z: number, margin = 0) {
  if (roadDistance(x, z) < 0.8 + margin) return false;
  if (
    x > YARD.x0 - margin - 1 &&
    x < YARD.x1 + margin + 1 &&
    z > YARD.z0 - margin - 1 &&
    z < YARD.z1 + margin + 1
  )
    return false;
  if (Math.abs(z - CHANNEL_Z) < 2.4 + margin && Math.abs(x) < 34) return false;
  for (const [px, pz] of PONDS)
    if (Math.abs(x - px) < 9.2 + margin && Math.abs(z - pz) < 6.2 + margin)
      return false;
  // Reward garden and the gate.
  if (Math.abs(x - 9) < 4.5 && Math.abs(z - 19) < 3.5) return false;
  return true;
}

/** Same hue with zero alpha, so soft gradients never darken at their rim. */
function clear(color: string) {
  return color.length === 7 ? `${color}00` : color;
}
function toCanvas(v: number) {
  return ((v + PAINT_EXTENT) / (PAINT_EXTENT * 2)) * PAINT_SIZE;
}
const UNIT = PAINT_SIZE / (PAINT_EXTENT * 2);

/** Hand-painted look: noise mottling, soft-edged lanes, worn ruts, yard and damp banks. */
function paintGround(trees: Point[]) {
  const c = document.createElement("canvas");
  c.width = c.height = PAINT_SIZE;
  const ctx = c.getContext("2d")!;
  const r = seeded(907);
  ctx.fillStyle = paint("grass");
  ctx.fillRect(0, 0, PAINT_SIZE, PAINT_SIZE);
  // Broad patches of lighter, darker and drier grass.
  const shades = [
    paint("grass-light"),
    paint("grass-shadow"),
    paint("grass-dry"),
    paint("grass-dark"),
    paint("grass-light"),
  ];
  for (let i = 0; i < 1400; i++) {
    const x = r() * PAINT_SIZE,
      y = r() * PAINT_SIZE,
      radius = (6 + r() * 26) * UNIT * (i < 200 ? 2.2 : 1);
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius),
      shade = shades[i % shades.length];
    g.addColorStop(0, shade);
    g.addColorStop(1, clear(shade));
    ctx.globalAlpha = i < 200 ? 0.34 : 0.16 + r() * 0.16;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fine grass strokes give texture at close range.
  for (let i = 0; i < 18000; i++) {
    const x = r() * PAINT_SIZE,
      y = r() * PAINT_SIZE,
      len = 2 + r() * 4,
      angle = r() * Math.PI * 2;
    ctx.globalAlpha = 0.14 + r() * 0.18;
    ctx.strokeStyle = r() > 0.5 ? paint("grass-light") : paint("grass-dark");
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Damp, lusher grass around pond sites and along the channel.
  ctx.filter = `blur(${Math.round(UNIT * 2)}px)`;
  ctx.fillStyle = paint("grass-lush");
  ctx.globalAlpha = 0.45;
  for (const [px, pz] of PONDS) {
    ctx.beginPath();
    ctx.ellipse(
      toCanvas(px),
      toCanvas(pz),
      9.5 * UNIT,
      6.8 * UNIT,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillRect(toCanvas(-36), toCanvas(CHANNEL_Z - 3.4), 72 * UNIT, 6.8 * UNIT);
  // Contact shadows under trees ground them even without shadow maps.
  ctx.fillStyle = paint("ground-shade");
  for (const [tx, tz] of trees) {
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(
      toCanvas(tx + 0.8),
      toCanvas(tz + 0.6),
      2.6 * UNIT,
      2.2 * UNIT,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Gravel yard in front of the farm buildings.
  const yard = () => {
    ctx.beginPath();
    ctx.roundRect(
      toCanvas(YARD.x0),
      toCanvas(YARD.z0),
      (YARD.x1 - YARD.x0) * UNIT,
      (YARD.z1 - YARD.z0) * UNIT,
      3 * UNIT,
    );
  };
  ctx.filter = `blur(${Math.round(UNIT * 0.35)}px)`;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 0.9 * UNIT;
  ctx.strokeStyle = paint("grass-dark");
  yard();
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = paint("gravel");
  yard();
  ctx.fill();
  // Lanes: darker soft verge, gravel bed, then worn wheel ruts.
  const lane = (road: Road, width: number) => {
    ctx.lineWidth = width * UNIT;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    road.points.forEach(([x, z], i) =>
      i
        ? ctx.lineTo(toCanvas(x), toCanvas(z))
        : ctx.moveTo(toCanvas(x), toCanvas(z)),
    );
    ctx.stroke();
  };
  ctx.filter = `blur(${Math.round(UNIT * 0.35)}px)`;
  ctx.strokeStyle = paint("grass-dark");
  ctx.globalAlpha = 0.45;
  for (const road of ROADS) lane(road, road.width + 0.9);
  ctx.globalAlpha = 1;
  ctx.filter = `blur(${Math.max(1, Math.round(UNIT * 0.12))}px)`;
  ctx.strokeStyle = paint("gravel");
  for (const road of ROADS) lane(road, road.width);
  ctx.filter = "none";
  // Gravel speckles over lanes and yard.
  for (let i = 0; i < 60000; i++) {
    const x = (r() - 0.5) * PAINT_EXTENT * 2,
      z = (r() - 0.5) * PAINT_EXTENT * 2;
    const onYard = x > YARD.x0 && x < YARD.x1 && z > YARD.z0 && z < YARD.z1;
    if (!onYard && roadDistance(x, z) > -0.2) continue;
    ctx.globalAlpha = 0.35 + r() * 0.4;
    ctx.fillStyle =
      i % 3 === 0
        ? paint("gravel-light")
        : i % 3 === 1
          ? paint("gravel-shadow")
          : paint("gravel-dark");
    const s = 1 + r() * 2.5;
    ctx.fillRect(toCanvas(x), toCanvas(z), s, s);
  }
  ctx.filter = `blur(${Math.round(UNIT * 0.4)}px)`;
  for (const road of ROADS) {
    if (!road.ruts) continue;
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = paint("gravel-shadow");
    for (const offset of [-1.15, 1.15]) {
      ctx.lineWidth = 0.6 * UNIT;
      ctx.beginPath();
      road.points.forEach(([x, z], i) =>
        i
          ? ctx.lineTo(toCanvas(x + offset), toCanvas(z))
          : ctx.moveTo(toCanvas(x + offset), toCanvas(z)),
      );
      ctx.stroke();
    }
    // A grassy crown on the lane beyond the gate.
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = paint("grass-shadow");
    ctx.lineWidth = 0.9 * UNIT;
    ctx.beginPath();
    road.points
      .filter(([, z]) => z > 26)
      .forEach(([x, z], i) =>
        i
          ? ctx.lineTo(toCanvas(x), toCanvas(z))
          : ctx.moveTo(toCanvas(x), toCanvas(z)),
      );
    ctx.stroke();
  }
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  // Fade to the plain hill green at the border so clamped edges stay seamless.
  const edge = ctx.createRadialGradient(
    PAINT_SIZE / 2,
    PAINT_SIZE / 2,
    PAINT_SIZE * 0.36,
    PAINT_SIZE / 2,
    PAINT_SIZE / 2,
    PAINT_SIZE * 0.5,
  );
  edge.addColorStop(0, clear(paint("grass")));
  edge.addColorStop(1, paint("grass"));
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, PAINT_SIZE, PAINT_SIZE);
  ctx.strokeStyle = paint("grass");
  ctx.lineWidth = 24;
  ctx.strokeRect(0, 0, PAINT_SIZE, PAINT_SIZE);
  const texture = new T.CanvasTexture(c);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  return texture;
}
/** Grey speckle multiplied at close range so painted ground keeps a crisp grain. */
function detailTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const r = seeded(31);
  ctx.fillStyle = paint("detail-mid");
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = r() > 0.5 ? paint("detail-light") : paint("detail-dark");
    ctx.globalAlpha = 0.25 + r() * 0.35;
    const s = 1 + r() * 2;
    ctx.fillRect(r() * 256, r() * 256, s, s);
  }
  const texture = new T.CanvasTexture(c);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  return texture;
}

export function createTerrain(trees: Point[]) {
  const size = 560,
    segments = 180;
  const geometry = new T.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute("position") as T.BufferAttribute,
    uv = geometry.getAttribute("uv") as T.BufferAttribute,
    colors = new Float32Array(position.count * 3);
  const shade = new T.Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      z = position.getZ(i);
    const y = terrainHeight(x, z);
    position.setY(i, y);
    uv.setXY(
      i,
      (x + PAINT_EXTENT) / (PAINT_EXTENT * 2),
      1 - (z + PAINT_EXTENT) / (PAINT_EXTENT * 2),
    );
    // Hills: lighter crests, darker hollows and woodland patches.
    const out = smoothstep(4, 40, outside(x, z));
    const variation =
      0.82 +
      0.36 * fbm(x * 0.05 + 7, z * 0.05 - 3) +
      Math.min(0.12, (y - GROUND_Y) * 0.006);
    const k = 1 + (variation - 1) * out;
    shade.setRGB(k, k * (1 + 0.04 * out), k * (1 - 0.06 * out));
    colors.set([shade.r, shade.g, shade.b], i * 3);
  }
  geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const map = paintGround(trees),
    detail = detailTexture();
  const material = new T.MeshStandardMaterial({
    map,
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.detailMap = { value: detail };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_pars_fragment>",
        "#include <map_pars_fragment>\nuniform sampler2D detailMap;",
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        vec3 grain = texture2D(detailMap, vMapUv * 150.0).rgb * 2.0;
        diffuseColor.rgb *= mix(vec3(1.0), grain, 0.42);`,
      );
  };
  material.customProgramCacheKey = () => "painted-terrain";
  const mesh = new T.Mesh(geometry, material);
  mesh.name = "terrain";
  mesh.receiveShadow = true;
  return {
    mesh,
    textures: [map, detail],
  };
}
