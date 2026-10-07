import * as T from "three";
import { paint } from "./palette";
import { disposeObject } from "../farm3d";
import type { Asset } from "../development";
import type { Cargo } from "./lifeSelectors";
export type WorldTarget =
  | { kind: "pond"; id: number }
  | { kind: "asset"; id: Asset }
  | {
      kind: "truck";
      id: number;
      cargo: Cargo;
      amount: number;
      pondId?: number;
    };
export function targetKey(target: WorldTarget | null) {
  return target
    ? `${target.kind}:${target.id}${target.kind === "truck" ? ":" + target.cargo : ""}`
    : "";
}
function rectangle(w: number, d: number, r: number) {
  const s = new T.Shape();
  s.moveTo(-w / 2 + r, -d / 2);
  s.lineTo(w / 2 - r, -d / 2);
  s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  s.lineTo(w / 2, d / 2 - r);
  s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  s.lineTo(-w / 2 + r, d / 2);
  s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  s.lineTo(-w / 2, -d / 2 + r);
  s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  return s;
}
/** Soft contour follows the rectangular footprint; it never paints a white ellipse over the water. */
export function softContour(hover = false) {
  const root = new T.Group();
  let dimensions = "";
  return {
    root,
    show(x: number, z: number, width: number, depth: number) {
      root.visible = true;
      root.position.set(x, 0.14, z);
      const key = `${width}:${depth}`;
      if (key !== dimensions) {
        disposeObject(root);
        root.clear();
        dimensions = key;
        for (const [spread, opacity] of [
          [0.6, 0.12],
          [0.35, 0.22],
          [0.16, 0.85],
        ]) {
          const shape = rectangle(
              width + spread * 2,
              depth + spread * 2,
              0.7 + spread,
            ),
            hole = rectangle(width, depth, 0.7);
          shape.holes.push(new T.Path(hole.getPoints(10)));
          const mesh = new T.Mesh(
            new T.ShapeGeometry(shape),
            new T.MeshBasicMaterial({
              color: paint(hover ? "hover" : "selection"),
              transparent: true,
              opacity: opacity * (hover ? 0.8 : 1),
              side: T.DoubleSide,
              depthWrite: false,
            }),
          );
          mesh.rotation.x = -Math.PI / 2;
          root.add(mesh);
        }
      }
    },
    hide() {
      root.visible = false;
    },
    dispose() {
      disposeObject(root);
      root.clear();
    },
  };
}
