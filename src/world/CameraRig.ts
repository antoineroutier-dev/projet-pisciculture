import * as T from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { POND_POSITIONS, ASSET_POSITIONS } from "../farm3d";
import type { SceneMode } from "./types";
import { subscribeCamera } from "./cameraBus";
import { targetKey, type WorldTarget } from "./selection";
export function createCameraRig(
  camera: T.PerspectiveCamera,
  controls: OrbitControls,
  invalidate: () => void,
) {
  let key = "",
    mode: SceneMode = "farm",
    animation: {
      start: number;
      from: T.Vector3;
      fromTarget: T.Vector3;
      to: T.Vector3;
      toTarget: T.Vector3;
    } | null = null;
  const cancel = () => {
    animation = null;
  };
  controls.addEventListener("start", cancel);
  const unsubscribe = subscribeCamera((command) => {
    animation = null;
    const offset = camera.position.clone().sub(controls.target);
    if (command.kind === "rotate")
      offset.applyAxisAngle(new T.Vector3(0, 1, 0), command.amount);
    if (command.kind === "zoom")
      offset.setLength(
        T.MathUtils.clamp(
          offset.length() * Math.exp(command.amount),
          controls.minDistance,
          controls.maxDistance,
        ),
      );
    if (command.kind === "pan") {
      const right = new T.Vector3()
          .crossVectors(offset, new T.Vector3(0, 1, 0))
          .normalize()
          .negate(),
        forward = offset.clone().setY(0).normalize();
      controls.target
        .addScaledVector(right, command.x)
        .addScaledVector(forward, command.z);
    }
    camera.position.copy(controls.target).add(offset);
    bound();
    controls.update();
    invalidate();
  });
  function bound() {
    const before = controls.target.clone();
    controls.target.x = T.MathUtils.clamp(
      controls.target.x,
      mode === "fish" ? -5 : -34,
      mode === "fish" ? 5 : 34,
    );
    controls.target.z = T.MathUtils.clamp(
      controls.target.z,
      mode === "fish" ? -5 : -32,
      mode === "fish" ? 5 : 32,
    );
    controls.target.y = T.MathUtils.clamp(
      controls.target.y,
      0,
      mode === "fish" ? 5 : 8,
    );
    camera.position.add(controls.target.clone().sub(before));
  }
  function update(
    s: {
      mode: SceneMode;
      selected: number;
      reset: number;
      target: WorldTarget | null;
      panelOpen: boolean;
      targetPoint?: { x: number; z: number };
      presentation?: boolean;
    },
    ms: number,
    reduced: boolean,
  ) {
    mode = s.mode;
    if (s.presentation) {
      controls.minDistance = 8;
      controls.maxDistance = 250;
      const distance = Math.max(
        66,
        54 /
          (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect),
      );
      const angle = 0.7 + (reduced ? 0 : Math.sin(ms * 0.00007) * 0.16);
      controls.target.set(camera.aspect > 1 ? -8 : 0, 0, -3);
      camera.position
        .copy(controls.target)
        .add(
          new T.Vector3(Math.sin(angle), 0.68, Math.cos(angle))
            .normalize()
            .multiplyScalar(distance),
        );
      controls.enabled = false;
      controls.update();
      return false;
    }
    const next = `${mode}:${mode === "pond" ? s.selected : ""}:${mode === "buildings" ? targetKey(s.target) : ""}:${s.reset}:${camera.aspect}`;
    if (next !== key) {
      const oldKey = key;
      key = next;
      controls.maxPolarAngle =
        mode === "fish" ? Math.PI - 0.1 : Math.PI / 2 - 0.045;
      controls.minDistance = mode === "fish" ? 3.5 : 8;
      controls.maxDistance = mode === "fish" ? 25 : 250;
      const target = new T.Vector3(0, 0, -2),
        position = new T.Vector3(37, 36, 45),
        fit = (width: number, min: number) =>
          Math.max(
            min,
            width /
              (2 *
                Math.tan(T.MathUtils.degToRad(camera.fov / 2)) *
                camera.aspect),
          );
      if (mode === "farm" && camera.aspect < 0.8)
        position
          .copy(target)
          .add(
            new T.Vector3(37, 36, 47).normalize().multiplyScalar(fit(54, 68)),
          );
      if (mode === "buildings") {
        const asset =
          s.target?.kind === "asset"
            ? ASSET_POSITIONS[s.target.id]
            : s.target?.kind === "truck" && s.targetPoint
              ? [s.targetPoint.x, s.targetPoint.z]
              : null;
        target.set(asset?.[0] ?? 0, 1.6, asset?.[1] ?? -16);
        position
          .copy(target)
          .add(
            new T.Vector3(0.12, 0.46, 0.88)
              .normalize()
              .multiplyScalar(fit(asset ? 18 : 60, asset ? 25 : 58)),
          );
      }
      if (mode === "pond") {
        const [x, z] = POND_POSITIONS[s.selected - 1];
        target.set(x, 0.55, z);
        position
          .copy(target)
          .add(
            new T.Vector3(2.5, 7.45, 11)
              .normalize()
              .multiplyScalar(fit(17, 14)),
          );
      }
      if (mode === "fish") {
        const distance = fit(9, 8.8),
          offset = camera.aspect < 0.8 ? 0 : 0.8;
        target.set(offset, camera.aspect < 0.8 ? 1.2 : 1.7, 0);
        position.set(-0.1 + offset, 2.15, distance);
        controls.maxDistance = Math.max(13, distance * 1.8);
      } else if (s.panelOpen && camera.aspect > 1) {
        // Put the subject in the remaining world beside the inspector.
        const right = new T.Vector3()
          .crossVectors(position.clone().sub(target), new T.Vector3(0, 1, 0))
          .normalize()
          .negate();
        const shift =
          position.distanceTo(target) *
          Math.tan(T.MathUtils.degToRad(camera.fov / 2)) *
          camera.aspect *
          0.3;
        target.addScaledVector(right, shift);
        position.addScaledVector(right, shift);
      }
      if (!oldKey || reduced) {
        camera.position.copy(position);
        controls.target.copy(target);
        animation = null;
        controls.update();
      } else
        animation = {
          start: ms,
          from: camera.position.clone(),
          fromTarget: controls.target.clone(),
          to: position,
          toTarget: target,
        };
    }
    if (animation) {
      const t = reduced
          ? 1
          : T.MathUtils.clamp((ms - animation.start) / 480, 0, 1),
        eased = t * t * (3 - 2 * t);
      camera.position.lerpVectors(animation.from, animation.to, eased);
      controls.target.lerpVectors(
        animation.fromTarget,
        animation.toTarget,
        eased,
      );
      if (t === 1) animation = null;
      invalidate();
    }
    bound();
    controls.update();
    return !!animation;
  }
  return {
    update,
    dispose() {
      unsubscribe();
      controls.removeEventListener("start", cancel);
    },
  };
}
