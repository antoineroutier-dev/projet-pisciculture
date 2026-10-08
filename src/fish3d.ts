import { paint } from "./world/palette";
import * as T from "three";
import type { SpeciesId } from "./game";

function random(seed: number) {
  let n = seed;
  return () => {
    n = (1664525 * n + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
const cache = new Map<SpeciesId, T.CanvasTexture>();
function skin(species: SpeciesId) {
  const existing = cache.get(species);
  if (existing) return existing;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const c = canvas.getContext("2d")!;
  const rand = random(67);
  const colors =
    species === "trout"
      ? [
          paint("fish-trout"),
          paint("fish-trout-belly"),
          paint("fish-trout"),
          paint("fish-trout-back"),
          paint("fish-trout"),
        ]
      : species === "carp"
        ? [
            paint("fish-carp"),
            paint("fish-carp-belly"),
            paint("fish-carp"),
            paint("fish-carp-back"),
            paint("fish-carp"),
          ]
        : [
            paint("fish-tilapia"),
            paint("fish-tilapia-belly"),
            paint("fish-tilapia"),
            paint("fish-tilapia-back"),
            paint("fish-tilapia"),
          ];
  const grad = c.createLinearGradient(0, 0, 0, 512);
  colors.forEach((color, i) => grad.addColorStop(i / 4, color));
  c.fillStyle = grad;
  c.fillRect(0, 0, 1024, 512);
  if (species === "trout") {
    c.fillStyle = paint("fish-trout-band");
    c.fillRect(0, 0, 1024, 14);
    c.fillRect(0, 244, 1024, 24);
    c.fillRect(0, 498, 1024, 14);
  }
  const size = species === "carp" ? 27 : species === "tilapia" ? 21 : 12;
  for (let y = -size; y < 512 + size; y += size * 0.68)
    for (let x = 0; x < 1024; x += size) {
      const xx = x + ((Math.round(y / (size * 0.68)) % 2) * size) / 2;
      c.strokeStyle = paint(
        species === "carp" ? "fish-scale" : "fish-scale-soft",
      );
      c.lineWidth = species === "carp" ? 2 : 1;
      c.beginPath();
      c.ellipse(xx, y, size * 0.54, size * 0.63, 0, 0, Math.PI);
      c.stroke();
      c.strokeStyle = paint("fish-scale-light");
      c.beginPath();
      c.ellipse(xx + 1, y - 2, size * 0.5, size * 0.57, 0, 0, Math.PI);
      c.stroke();
    }
  if (species === "trout")
    for (let i = 0; i < 850; i++) {
      const x = rand() * 1024,
        y = rand() * 512;
      if (Math.sin((1 - y / 512) * Math.PI * 2) < -0.08) continue;
      c.fillStyle = paint("fish-spot");
      c.beginPath();
      c.ellipse(
        x,
        y,
        1.2 + rand() * 2.8,
        1 + rand() * 2,
        rand() * 3,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
  if (species === "tilapia")
    for (let i = 0; i < 9; i++) {
      const x = 190 + i * 91;
      const stripe = c.createLinearGradient(x - 14, 0, x + 18, 0);
      stripe.addColorStop(0, paint("fish-stripe-clear"));
      stripe.addColorStop(0.5, paint("fish-stripe"));
      stripe.addColorStop(1, paint("fish-stripe-clear"));
      c.fillStyle = stripe;
      c.fillRect(x - 14, 0, 32, 512);
    }
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.userData.shared = true;
  cache.set(species, tex);
  return tex;
}
function fin(
  points: [number, number][],
  color: T.ColorRepresentation,
  detailed: boolean,
  striped = false,
) {
  const shape = new T.Shape();
  points.forEach(([x, y], i) =>
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y),
  );
  shape.closePath();
  const material = new T.MeshPhysicalMaterial({
    color,
    side: T.DoubleSide,
    transparent: true,
    opacity: 0.9,
    roughness: 0.62,
    metalness: 0.1,
    depthWrite: false,
  });
  const g = new T.Group();
  g.add(new T.Mesh(new T.ShapeGeometry(shape), material));
  if (detailed) {
    const rayMat = new T.LineBasicMaterial({
      color: striped ? paint("fish-tilapia-ray") : paint("fish-fin-ray"),
      transparent: true,
      opacity: 0.5,
    });
    const origin = new T.Vector3(points[0][0], points[0][1], 0.004);
    const edge = points.slice(1);
    for (const [x, y] of edge) {
      const geo = new T.BufferGeometry().setFromPoints([
        origin,
        new T.Vector3(x, y, 0.004),
      ]);
      g.add(new T.Line(geo, rayMat));
    }
  }
  return g;
}
/** Original anatomy meshes; visual specimens rather than scanned biological models. */
export function createFish(species: SpeciesId, detailed = true) {
  const group = new T.Group();
  const height = species === "trout" ? 0.205 : species === "carp" ? 0.39 : 0.46;
  const width = species === "trout" ? 0.135 : species === "carp" ? 0.24 : 0.17;
  const segments = detailed ? 56 : 24,
    rings = detailed ? 32 : 16,
    vertices: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments,
      x = -1.06 + u * 1.89;
    // Full head and shoulder, tapering to the caudal peduncle.
    const profilePoints = [
      [0, 0.055],
      [0.055, 0.29],
      [0.15, 0.65],
      [0.28, 0.95],
      [0.43, 1],
      [0.6, 0.83],
      [0.79, 0.43],
      [0.93, 0.16],
      [1, 0.09],
    ];
    const next = profilePoints.findIndex((v) => v[0] >= u);
    const lower = profilePoints[Math.max(0, next - 1)],
      upper = profilePoints[Math.max(0, next)];
    const blend = (u - lower[0]) / Math.max(0.001, upper[0] - lower[0]);
    // Cubic Hermite slopes stay continuous through the body profile control points.
    const left = profilePoints[Math.max(0, next - 2)],
      right = profilePoints[Math.min(profilePoints.length - 1, next + 1)];
    const span = upper[0] - lower[0];
    const m0 =
      ((upper[1] - left[1]) / Math.max(0.001, upper[0] - left[0])) * span;
    const m1 =
      ((right[1] - lower[1]) / Math.max(0.001, right[0] - lower[0])) * span;
    const t2 = blend * blend,
      t3 = t2 * blend;
    const profile = Math.max(
      0.02,
      (2 * t3 - 3 * t2 + 1) * lower[1] +
        (t3 - 2 * t2 + blend) * m0 +
        (-2 * t3 + 3 * t2) * upper[1] +
        (t3 - t2) * m1,
    );
    for (let j = 0; j <= rings; j++) {
      const angle = (j / rings) * Math.PI * 2;
      vertices.push(
        x,
        Math.sin(angle) * height * profile + Math.sin(u * Math.PI) * 0.025,
        Math.cos(angle) * width * profile,
      );
      uv.push(u, j / rings);
    }
  }
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < rings; j++) {
      const a = i * (rings + 1) + j,
        b = a + rings + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = new T.MeshPhysicalMaterial({
    map: skin(species),
    roughness: 0.65,
    metalness: 0.16,
    clearcoat: 0.25,
    clearcoatRoughness: 0.26,
  });
  const body = new T.Mesh(geo, mat);
  body.castShadow = true;
  group.add(body);
  const finColor =
    species === "trout"
      ? paint("fish-trout-fin")
      : species === "carp"
        ? paint("fish-carp-fin")
        : paint("fish-tilapia-fin");
  const tail = new T.Group();
  tail.position.set(0.77, 0, 0);
  const tailPoints: [number, number][] =
    species === "tilapia"
      ? [
          [0, 0],
          [0.16, 0.14],
          [0.4, 0.25],
          [0.47, 0.14],
          [0.49, 0],
          [0.47, -0.15],
          [0.4, -0.25],
          [0.16, -0.14],
        ]
      : [
          [0, 0],
          [0.28, 0.29],
          [0.49, 0.37],
          [0.42, 0.15],
          [0.33, 0],
          [0.42, -0.15],
          [0.49, -0.37],
          [0.28, -0.28],
        ];
  tailPoints.forEach((p) => {
    p[0] *= 0.95;
    p[1] *= 0.76;
  });
  tail.add(fin(tailPoints, finColor, detailed, species === "tilapia"));
  group.add(tail);
  if (detailed) {
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const yy = (t - 0.5) * 0.42;
      const line = new T.Line(
        new T.BufferGeometry().setFromPoints([
          new T.Vector3(0.04, 0, 0.003),
          new T.Vector3(0.4, yy, 0.003),
        ]),
        new T.LineBasicMaterial({
          color: paint("fish-tail-ray"),
          transparent: true,
          opacity: 0.5,
        }),
      );
      tail.add(line);
    }
    if (species === "tilapia")
      for (let i = 0; i < 4; i++) {
        const line = new T.Line(
          new T.BufferGeometry().setFromPoints([
            new T.Vector3(0.18 + i * 0.06, -0.11 - i * 0.027, 0.005),
            new T.Vector3(0.18 + i * 0.06, 0.11 + i * 0.027, 0.005),
          ]),
          new T.LineBasicMaterial({
            color: paint("fish-tilapia-stripe"),
            transparent: true,
            opacity: 0.8,
          }),
        );
        tail.add(line);
      }
  }
  const dorsal: [number, number][] =
    species === "trout"
      ? [
          [-0.1, height * 0.87],
          [-0.12, 0.34],
          [0.02, 0.35],
          [0.23, 0.2],
          [0.35, height * 0.63],
        ]
      : Array.from({ length: 22 }, (_, i) => {
          const x = -0.57 + i * 0.056;
          const top =
            i === 0 || i === 21
              ? height * 0.7
              : height * (1.34 + (i % 2) * 0.15) - Math.max(0, x) * 0.17;
          return [x, top] as [number, number];
        });
  if (species !== "trout")
    dorsal.push([0.59, height * 0.3], [-0.57, height * 0.7]);
  group.add(fin(dorsal, finColor, detailed));
  if (species === "trout")
    group.add(
      fin(
        [
          [0.43, 0.09],
          [0.45, 0.14],
          [0.49, 0.17],
          [0.53, 0.17],
          [0.56, 0.14],
          [0.59, 0.075],
        ],
        paint("fish-trout-adipose"),
        detailed,
      ),
    );
  const pectorals: T.Group[] = [];
  for (const sign of [-1, 1]) {
    const eye = new T.Group();
    eye.position.set(-0.77, height * 0.2, sign * width * 0.75);
    const iris = new T.Mesh(
      new T.SphereGeometry(detailed ? 0.052 : 0.043, 12, 8),
      new T.MeshPhysicalMaterial({
        color:
          species === "carp" ? paint("fish-carp-iris") : paint("fish-iris"),
        roughness: 0.22,
        metalness: 0.4,
      }),
    );
    iris.scale.set(1, 1, 0.5);
    eye.add(iris);
    const pupil = new T.Mesh(
      new T.SphereGeometry(detailed ? 0.032 : 0.029, 12, 8),
      new T.MeshPhysicalMaterial({
        color: paint("fish-pupil"),
        roughness: 0.06,
        clearcoat: 1,
      }),
    );
    pupil.position.z = sign * 0.022;
    pupil.scale.z = 0.55;
    eye.add(pupil);
    if (detailed) {
      const glint = new T.Mesh(
        new T.SphereGeometry(0.01, 7, 5),
        new T.MeshBasicMaterial({ color: paint("fish-highlight") }),
      );
      glint.position.set(-0.009, 0.013, sign * 0.038);
      eye.add(glint);
    }
    group.add(eye);
    const f = fin(
      [
        [0, 0],
        [0.17, -0.08],
        [0.3, -0.27],
        [0.09, -0.22],
      ],
      finColor,
      detailed,
    );
    f.position.set(-0.5, -height * 0.33, sign * width * 0.7);
    f.rotation.x = sign * 0.7;
    group.add(f);
    pectorals.push(f);
    const pelvic = fin(
      [
        [0, 0],
        [0.12, -0.04],
        [0.25, -0.19],
        [0.06, -0.16],
      ],
      finColor,
      detailed,
    );
    pelvic.position.set(0.15, -height * 0.61, sign * width * 0.45);
    pelvic.rotation.x = sign * 0.45;
    group.add(pelvic);
    if (detailed) {
      const points = [
        new T.Vector3(-0.64, height * 0.58, sign * width * 0.44),
        new T.Vector3(-0.5, height * 0.24, sign * width * 0.99),
        new T.Vector3(-0.5, -height * 0.2, sign * width * 0.99),
        new T.Vector3(-0.57, -height * 0.5, sign * width * 0.42),
      ];
      group.add(
        new T.Mesh(
          new T.TubeGeometry(
            new T.CatmullRomCurve3(points),
            16,
            0.009,
            4,
            false,
          ),
          new T.MeshStandardMaterial({
            color:
              species === "trout"
                ? paint("fish-trout-gill")
                : paint("fish-gill"),
            roughness: 0.5,
          }),
        ),
      );
    }
    if (species === "carp") {
      for (let b = 0; b < 2; b++) {
        const curve = new T.CatmullRomCurve3([
          new T.Vector3(-0.99, -0.05, sign * 0.08),
          new T.Vector3(-1.12, -0.14, sign * (0.1 + b * 0.025)),
          new T.Vector3(-1.16 + b * 0.08, -0.26 - b * 0.08, sign * 0.13),
        ]);
        group.add(
          new T.Mesh(
            new T.TubeGeometry(curve, 8, 0.009, 4, false),
            new T.MeshStandardMaterial({ color: paint("fish-carp-barbel") }),
          ),
        );
      }
    }
  }
  if (detailed && species === "carp") {
    const mouth = new T.Mesh(
      new T.TorusGeometry(species === "carp" ? 0.047 : 0.036, 0.009, 6, 20),
      new T.MeshStandardMaterial({
        color:
          species === "carp" ? paint("fish-carp-mouth") : paint("fish-mouth"),
        roughness: 0.3,
      }),
    );
    mouth.rotation.y = Math.PI / 2;
    mouth.position.set(-1.06, -0.02, 0);
    group.add(mouth);
  }
  // Store immutable coordinates in fish space for a continuous body/fin wave.
  // Eyes and the snout stay rigid; each fin uses the same displacement as its attachment.
  group.updateMatrixWorld(true);
  const surfaces: SwimSurface[] = [];
  group.traverse((node) => {
    if (!(node instanceof T.Mesh || node instanceof T.Line)) return;
    const geometry = node.geometry as T.BufferGeometry;
    const attr = geometry.getAttribute("position") as T.BufferAttribute;
    if (!attr) return;
    const original = new Float32Array(attr.array),
      xs = new Float32Array(attr.count);
    const point = new T.Vector3();
    let movable = false;
    for (let i = 0; i < attr.count; i++) {
      point.fromBufferAttribute(attr, i).applyMatrix4(node.matrixWorld);
      xs[i] = point.x;
      if (point.x > -0.6) movable = true;
    }
    if (!movable) return;
    const inverse = node.matrixWorld.clone().invert();
    const direction = new T.Vector3(0, 0, 1)
      .applyMatrix4(inverse)
      .sub(new T.Vector3().applyMatrix4(inverse));
    const normals =
      node === body
        ? new Float32Array(geometry.getAttribute("normal").array)
        : null;
    attr.setUsage(T.DynamicDrawUsage);
    surfaces.push({ geometry, original, xs, direction, normals });
  });
  group.userData = { surfaces, species };
  return group;
}
interface SwimSurface {
  geometry: T.BufferGeometry;
  original: Float32Array;
  xs: Float32Array;
  direction: T.Vector3;
  normals: Float32Array | null;
}
export function animateFish(
  fish: T.Group,
  phase: number,
  effort = 0.65,
  turn = 0,
) {
  const amplitude = 0.025 + Math.min(1.4, effort) * 0.09;
  for (const surface of fish.userData.surfaces as SwimSurface[]) {
    const { geometry, original, xs, direction, normals } = surface;
    const attr = geometry.getAttribute("position") as T.BufferAttribute;
    const normal = geometry.getAttribute("normal") as
      | T.BufferAttribute
      | undefined;
    for (let i = 0; i < xs.length; i++) {
      const u = Math.max(0, (xs[i] + 0.6) / 1.85);
      const angle = phase - u * 5.6;
      const wave = amplitude * u * u * Math.sin(angle) + turn * 0.045 * u * u;
      const at = i * 3;
      attr.setXYZ(
        i,
        original[at] + direction.x * wave,
        original[at + 1] + direction.y * wave,
        original[at + 2] + direction.z * wave,
      );
      if (normals && normal) {
        const slope =
          (amplitude *
            (2 * u * Math.sin(angle) - 5.6 * u * u * Math.cos(angle)) +
            turn * 0.09 * u) /
          1.85;
        const nx = normals[at] - slope * normals[at + 2],
          ny = normals[at + 1],
          nz = normals[at + 2];
        const length = Math.hypot(nx, ny, nz) || 1;
        normal.setXYZ(i, nx / length, ny / length, nz / length);
      }
    }
    attr.needsUpdate = true;
    if (normals && normal) normal.needsUpdate = true;
  }
}
export function clearFishTextures() {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}
