import * as T from "three";
import {
  POND_POSITIONS,
  ASSET_POSITIONS,
  disposeObject,
  type FarmObjects,
} from "../farm3d";
import { paint } from "./palette";
import { subscribeLife, type LifeMessage } from "./lifeBus";
import type { Cargo, LifeEvent } from "./lifeSelectors";
function block(
  g: T.Group,
  size: [number, number, number],
  position: [number, number, number],
  material: T.Material,
) {
  const m = new T.Mesh(new T.BoxGeometry(...size), material);
  m.position.set(...position);
  m.castShadow = true;
  g.add(m);
  return m;
}
function truck(cargo: Cargo) {
  const g = new T.Group(),
    cab = new T.MeshStandardMaterial({
      color: paint(
        cargo === "feed"
          ? "truck-feed"
          : cargo === "living"
            ? "truck-living"
            : "truck-cold",
      ),
      roughness: 0.8,
    }),
    white = new T.MeshStandardMaterial({
      color: paint("trim"),
      roughness: 0.8,
    }),
    dark = new T.MeshStandardMaterial({
      color: paint("timber"),
      roughness: 0.9,
    }),
    glass = new T.MeshStandardMaterial({
      color: paint("glass"),
      roughness: 0.3,
    });
  block(g, [1.65, 0.3, 3.7], [0, 0.52, 0], dark);
  block(g, [1.6, 1.2, 1.1], [0, 1.2, 1.2], cab);
  block(g, [1.4, 0.5, 0.06], [0, 1.55, 1.77], glass);
  if (cargo === "living") {
    const tank = new T.Mesh(new T.CylinderGeometry(0.8, 0.8, 2.2, 14), white);
    tank.rotation.x = Math.PI / 2;
    tank.position.set(0, 1.3, -0.55);
    tank.castShadow = true;
    g.add(tank);
    for (const z of [-1.2, -0.1])
      block(g, [1.7, 0.08, 0.12], [0, 1.87, z], cab);
  } else {
    block(g, [1.65, 1.65, 2.4], [0, 1.48, -0.6], white);
    block(g, [1.69, 0.3, 2.1], [0, 1.4, -0.6], cab);
    if (cargo === "cold") block(g, [0.8, 0.4, 0.3], [0, 2.3, 0.6], dark);
  }
  for (const x of [-0.85, 0.85])
    for (const z of [-1.2, 1.15]) {
      const wheel = new T.Mesh(
        new T.CylinderGeometry(0.34, 0.34, 0.2, 12),
        dark,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.38, z);
      g.add(wheel);
    }
  return g;
}
function path(event: Extract<LifeEvent, { kind: "truck" }>) {
  const start = new T.Vector3(0, 0.1, 35),
    road = new T.Vector3(0, 0.1, -8);
  if (event.cargo === "cold")
    return new T.CatmullRomCurve3(
      [
        new T.Vector3(22, 0.1, -10),
        new T.Vector3(22, 0.1, -8),
        road,
        new T.Vector3(0, 0.1, 12),
        start,
      ],
      false,
      "catmullrom",
      0.05,
    );
  const destination =
    event.cargo === "feed"
      ? new T.Vector3(9, 0.1, -10)
      : new T.Vector3(
          POND_POSITIONS[(event.pondId ?? 1) - 1][0],
          0.1,
          POND_POSITIONS[(event.pondId ?? 1) - 1][1] + 5,
        );
  const bend = new T.Vector3(0, 0.1, destination.z);
  return new T.CatmullRomCurve3(
    [start, new T.Vector3(0, 0.1, 20), bend, destination],
    false,
    "catmullrom",
    0.05,
  );
}
function splashes(reveal = false) {
  const g = new T.Group();
  if (!reveal)
    for (let i = 0; i < 3; i++) {
      const ring = new T.Mesh(
        new T.RingGeometry(0.82, 0.87, 32),
        new T.MeshBasicMaterial({
          color: paint("water-foam"),
          transparent: true,
          opacity: 0.5,
          side: T.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.userData.ring = i;
      g.add(ring);
    }
  const count = reveal ? 18 : 12,
    positions = new Float32Array(count * 3),
    geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
  const particles = new T.Points(
    geometry,
    new T.PointsMaterial({
      color: paint(reveal ? "leaf" : "water-foam"),
      size: reveal ? 0.14 : 0.1,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
  particles.frustumCulled = false;
  particles.userData.particles = true;
  g.add(particles);
  return g;
}
type Effect = {
  event: LifeEvent;
  group: T.Group;
  start: number;
  duration: number;
  timer: ReturnType<typeof setTimeout>;
  curve?: T.CatmullRomCurve3;
};
/** Temporary illustration of committed events; no simulation state or extra game timer. */
export function createLifeEffects(farm: FarmObjects, invalidate: () => void) {
  const root = new T.Group();
  root.name = "life-effects";
  const pending: LifeMessage[] = [],
    effects: Effect[] = [],
    silhouettes = new Map<string, T.Mesh>();
  const unsubscribe = subscribeLife((message) => {
    pending.push(message);
    invalidate();
  });
  function remove(effect: Effect) {
    clearTimeout(effect.timer);
    root.remove(effect.group);
    disposeObject(effect.group);
    effects.splice(effects.indexOf(effect), 1);
  }
  function clear() {
    for (const e of [...effects]) remove(e);
  }
  function make(event: LifeEvent, ms: number, reduced: boolean) {
    if (event.kind === "truck") {
      const old = effects.filter((e) => e.event.kind === "truck");
      if (old.length >= 3) remove(old[0]);
    } else
      for (const e of [...effects])
        if (
          e.event.kind === event.kind &&
          e.event.pondId === event.pondId &&
          ("asset" in e.event ? e.event.asset : undefined) ===
            ("asset" in event ? event.asset : undefined)
        )
          remove(e);
    const group =
      event.kind === "truck"
        ? truck(event.cargo)
        : splashes(event.kind === "reveal");
    if (event.kind === "truck")
      group.userData.worldTarget = { ...event, kind: "truck" };
    root.add(group);
    const duration = reduced ? 10000 : event.kind === "truck" ? 14000 : 3000;
    const effect: Effect = {
      event,
      group,
      start: ms,
      duration,
      timer: setTimeout(invalidate, duration + 30),
    };
    if (event.kind === "truck") effect.curve = path(event);
    else {
      const [x, z] = event.pondId
        ? POND_POSITIONS[event.pondId - 1]
        : ASSET_POSITIONS[
            event.kind === "reveal" && event.asset ? event.asset : "warehouse"
          ];
      group.position.set(x, event.kind === "feed" ? 0.7 : 1.2, z);
    }
    effects.push(effect);
  }
  function update(ms: number, reduced: boolean) {
    for (const message of pending.splice(0)) {
      if (message.type === "reset") {
        clear();
        continue;
      }
      for (const e of message.events) make(e, ms, reduced);
    }
    for (const effect of [...effects]) {
      const elapsed = ms - effect.start;
      if (elapsed > effect.duration) {
        remove(effect);
        continue;
      }
      const ratio = elapsed / effect.duration,
        { event, group } = effect;
      if (event.kind === "truck") {
        // Deliveries pull in, unload, then leave; dispatched cold lots only depart.
        const t = reduced
          ? event.cargo === "cold"
            ? 0
            : 1
          : event.cargo === "cold"
            ? ratio
            : ratio < 0.4
              ? ratio / 0.4
              : ratio < 0.6
                ? 1
                : 1 - (ratio - 0.6) / 0.4;
        const point = effect.curve!.getPoint(T.MathUtils.clamp(t, 0, 1)),
          heading = effect.curve!.getTangent(T.MathUtils.clamp(t, 0, 1));
        group.position.copy(point);
        group.rotation.y =
          Math.atan2(heading.x, heading.z) +
          (event.cargo !== "cold" && ratio > 0.6 && !reduced ? Math.PI : 0);
      } else {
        for (const child of group.children) {
          if (child instanceof T.Points) {
            const a = child.geometry.getAttribute(
              "position",
            ) as T.BufferAttribute;
            for (let i = 0; i < a.count; i++) {
              const angle = i * 2.399,
                phase = reduced ? 0.4 : (ratio + i / a.count) % 1,
                radius =
                  (event.kind === "reveal" ? 2.1 : 0.8) * Math.sqrt(phase);
              a.setXYZ(
                i,
                Math.cos(angle) * radius,
                Math.sin(phase * Math.PI) *
                  (event.kind === "reveal" ? 2 : 0.55),
                Math.sin(angle) * radius,
              );
            }
            a.needsUpdate = true;
          } else if (child instanceof T.Mesh) {
            const phase = reduced
              ? 0.4
              : (ratio * 2 + (child.userData.ring as number) / 3) % 1;
            child.scale.setScalar(0.2 + phase * 1.8);
            (child.material as T.MeshBasicMaterial).opacity = reduced
              ? 0.4
              : (1 - phase) * 0.55;
          }
        }
      }
    }
    const activeIds = new Set(farm.fish.map((f) => f.mesh.uuid));
    for (const [id, shadow] of silhouettes)
      if (!activeIds.has(id)) {
        root.remove(shadow);
        disposeObject(shadow);
        silhouettes.delete(id);
      }
    for (const f of farm.fish) {
      let shadow = silhouettes.get(f.mesh.uuid);
      if (!shadow) {
        const shape = new T.Shape();
        shape.moveTo(-1.06, 0);
        shape.quadraticCurveTo(-0.5, 0.23, 0.77, 0);
        shape.lineTo(1.2, 0.24);
        shape.lineTo(1.1, 0);
        shape.lineTo(1.2, -0.24);
        shape.lineTo(0.77, 0);
        shape.quadraticCurveTo(-0.5, -0.23, -1.06, 0);
        shadow = new T.Mesh(
          new T.ShapeGeometry(shape),
          new T.MeshBasicMaterial({
            color: paint("fish-pupil"),
            transparent: true,
            opacity: 0.12,
            depthWrite: false,
            side: T.DoubleSide,
          }),
        );
        shadow.rotation.x = -Math.PI / 2;
        silhouettes.set(f.mesh.uuid, shadow);
        root.add(shadow);
      }
      shadow.position.set(f.mesh.position.x, 0.685, f.mesh.position.z);
      shadow.rotation.z = f.mesh.rotation.y;
      shadow.scale.setScalar(f.mesh.scale.x);
    }
  }
  return {
    root,
    update,
    feeding: (pondId: number) =>
      effects.some((e) => e.event.kind === "feed" && e.event.pondId === pondId),
    diagnostics: () => effects.map((e) => e.event),
    dispose() {
      unsubscribe();
      clear();
      for (const shadow of silhouettes.values()) disposeObject(shadow);
      silhouettes.clear();
      root.clear();
    },
  };
}
