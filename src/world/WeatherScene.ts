import * as T from "three";
import { hasIce, sceneWeather, type Season } from "./lifeSelectors";
import { paint } from "./palette";
import { disposeObject, type FarmObjects } from "../farm3d";
import type { FarmState } from "./artSelectors";
import type { GameClock } from "../state/useGameClock";
/** Decorative weather observes the engine and the existing UI clock. */
export function createWeather(
  scene: T.Scene,
  farm: FarmObjects,
  sun: T.DirectionalLight,
  sky: T.HemisphereLight,
) {
  const root = new T.Group();
  root.name = "weather";
  scene.add(root);
  const cloudMaterial = new T.MeshBasicMaterial({
    color: paint("cloud"),
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const cloudGeometry = new T.IcosahedronGeometry(1, 1),
    clouds = new T.InstancedMesh(cloudGeometry, cloudMaterial, 24),
    dummy = new T.Object3D();
  for (let i = 0; i < 24; i++) {
    dummy.position.set(
      Math.sin(Math.floor(i / 3) * 3.713) * 42 + ((i % 3) - 1) * 3.2,
      17 + (Math.floor(i / 3) % 3) * 1.7,
      Math.cos(Math.floor(i / 3) * 2.317) * 36,
    );
    dummy.scale.set(5 + (i % 3), 1.5, 3);
    dummy.updateMatrix();
    clouds.setMatrixAt(i, dummy.matrix);
  }
  root.add(clouds);
  const rainPositions = new Float32Array(240 * 6),
    rainGeometry = new T.BufferGeometry();
  rainGeometry.setAttribute(
    "position",
    new T.BufferAttribute(rainPositions, 3),
  );
  const rain = new T.LineSegments(
    rainGeometry,
    new T.LineBasicMaterial({
      color: paint("rain"),
      transparent: true,
      opacity: 0.33,
      depthWrite: false,
    }),
  );
  rain.frustumCulled = false;
  root.add(rain);
  const foliage = farm.root.getObjectByName("foliage") as T.InstancedMesh;
  const baseMatrices = Array.from(
    { length: foliage.instanceMatrix.count },
    (_, i) => {
      const m = new T.Matrix4();
      foliage.getMatrixAt(i, m);
      return m;
    },
  );
  const windMatrix = new T.Matrix4();
  const ice = new Map<number, T.Mesh>();
  let season: Season | undefined,
    seasonKey = "",
    hour = 0.5,
    previousDay = 0;
  const daylight = new T.Color(paint("sky")),
    night = new T.Color(paint("night-sky")),
    rainy = new T.Color(paint("rain-sky"));
  function update(
    game: FarmState,
    clock: Pick<GameClock, "active" | "phase">,
    ms: number,
    reduced: boolean,
    cameraDistance: number,
    rainCount = 240,
  ) {
    for (let i = 0; i < foliage.count; i++) {
      windMatrix.copy(baseMatrices[i]);
      if (!reduced)
        windMatrix.elements[12] += Math.sin(ms * 0.0009 + i * 0.71) * 0.07;
      foliage.setMatrixAt(i, windMatrix);
    }
    foliage.instanceMatrix.needsUpdate = true;
    const w = sceneWeather(game.day),
      key = `${w.season}:${w.frost}:${[...farm.ponds.values()].map((p) => p.group.uuid).join(":")}`;
    if (key !== seasonKey) {
      season = w.season;
      seasonKey = key;
      for (const [object, prefix] of [
        ["terrain", "ground"],
        ["foliage", "foliage"],
        ["meadow", "ground"],
      ]) {
        const mesh = farm.root.getObjectByName(object) as
          | T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>
          | undefined;
        if (mesh) mesh.material.color.set(paint(`${prefix}-${season}`));
      }
      farm.root.traverse((o) => {
        if (o instanceof T.Mesh) {
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            if (
              m instanceof T.MeshStandardMaterial &&
              m.userData.seasonal === "reed"
            )
              m.color.set(paint(season === "winter" ? "soil" : "reed"));
        }
      });
      if (w.frost) {
        const terrain = farm.root.getObjectByName("terrain") as T.Mesh<
          T.BufferGeometry,
          T.MeshStandardMaterial
        >;
        terrain.material.color.lerp(new T.Color(paint("frost")), 0.4);
      }
    }
    if (!reduced && clock.active && Number.isFinite(clock.phase.duration))
      hour = T.MathUtils.clamp(
        (ms - clock.phase.started) / clock.phase.duration,
        0,
        1,
      );
    // Reduced motion uses stable daytime lighting, including while seeking.
    if (reduced) hour = 0.5;
    const light = Math.max(0.18, Math.sin(hour * Math.PI));
    sun.intensity = (0.5 + light * 2.2) * (w.rainy ? 0.72 : 1);
    sky.intensity = 0.7 + light * 0.4;
    sun.position.set(Math.cos(hour * Math.PI) * 45, 15 + light * 40, 25);
    sun.color.set(paint(hour < 0.2 || hour > 0.8 ? "sunset" : "sun"));
    const background = night.clone().lerp(w.rainy ? rainy : daylight, light);
    if (farm.root.visible) scene.background = background;
    if (scene.fog instanceof T.Fog) {
      scene.fog.color.copy(background);
      scene.fog.near = Math.max(55, cameraDistance + (w.rainy ? 10 : 35));
      scene.fog.far = scene.fog.near + (w.rainy ? 85 : 130);
    }
    root.visible = farm.root.visible;
    clouds.visible = w.rainy || w.label === "Éclaircies";
    cloudMaterial.opacity = w.rainy ? 0.43 : 0.22;
    clouds.position.x = reduced ? 0 : Math.sin(ms * 0.000015) * 8;
    rain.visible = w.rainy;
    rainGeometry.setDrawRange(0, rainCount * 2);
    if (w.rainy) {
      const positions = rainGeometry.getAttribute(
        "position",
      ) as T.BufferAttribute;
      for (let i = 0; i < 240; i++) {
        const x = ((i * 17.371) % 64) - 32,
          z = ((i * 9.719) % 60) - 30,
          y = reduced ? (i * 0.771) % 15 : 15 - ((ms * 0.012 + i * 0.771) % 15);
        positions.setXYZ(i * 2, x, y, z);
        positions.setXYZ(i * 2 + 1, x + 0.13, y - 0.65, z + 0.08);
      }
      positions.needsUpdate = true;
    }
    for (const pad of farm.root.getObjectsByProperty("name", "lily-pad"))
      pad.visible = w.season !== "winter";
    // Never draw frozen water above freezing. The standard annual climate does not force ice.
    for (const [id, mesh] of ice)
      if (
        !farm.waters.some((v) => v.userData.pondId === id) ||
        !hasIce(game.ponds[id - 1])
      ) {
        root.remove(mesh);
        disposeObject(mesh);
        ice.delete(id);
      }
    for (const water of farm.waters) {
      const id = water.userData.pondId as number;
      if (!hasIce(game.ponds[id - 1]) || ice.has(id)) continue;
      const mesh = new T.Mesh(
        water.geometry.clone(),
        new T.MeshStandardMaterial({
          color: paint("ice"),
          roughness: 0.48,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
        }),
      );
      mesh.position.copy(water.position).y += 0.02;
      mesh.rotation.copy(water.rotation);
      root.add(mesh);
      ice.set(id, mesh);
    }
    for (const excavator of farm.root.getObjectsByProperty("name", "excavator"))
      excavator.rotation.y = reduced ? 0 : Math.sin(ms * 0.0007) * 0.22;
    previousDay = game.day;
    return {
      season: w.season,
      rain: w.rainy,
      frost: w.frost,
      ice: [...ice.keys()],
      hour: Math.round(hour * 24 * 10) / 10,
      day: previousDay,
    };
  }
  return {
    update,
    dispose() {
      for (const mesh of ice.values()) {
        root.remove(mesh);
        disposeObject(mesh);
      }
      ice.clear();
      scene.remove(root);
      disposeObject(root);
    },
  };
}
