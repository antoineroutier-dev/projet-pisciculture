import * as T from "three";
import { hasIce, sceneWeather, type Season } from "./lifeSelectors";
import { paint } from "./palette";
import { disposeObject, type FarmObjects } from "../farm3d";
import type { FarmState } from "./artSelectors";
import type { GameClock } from "../state/useGameClock";
import { createSky } from "./sky";
import { wind, windStrength } from "./vegetation";
import { waterUniforms } from "./water";

const DEG = Math.PI / 180;
/** Stylised sun path: never zenithal, so even noon keeps long readable shadows. */
export function sunDirection(hour: number, target = new T.Vector3()) {
  const elevation = (9 + 34 * Math.sin(hour * Math.PI)) * DEG,
    azimuth = (205 - 120 * hour) * DEG;
  return target.set(
    Math.cos(elevation) * Math.cos(azimuth),
    Math.sin(elevation),
    Math.cos(elevation) * Math.sin(azimuth),
  );
}

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
  const dome = createSky(scene);
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
  // A small flock wheeling over the farm; hidden when motion is reduced.
  const birdMaterial = new T.MeshBasicMaterial({
      color: paint("bird"),
      side: T.DoubleSide,
      fog: true,
    }),
    wingGeometry = new T.BufferGeometry();
  wingGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute([0, 0, -0.18, 0, 0, 0.22, 0.95, 0.05, 0], 3),
  );
  const birds = new T.Group();
  birds.name = "birds";
  for (let i = 0; i < 7; i++) {
    const bird = new T.Group();
    for (const side of [-1, 1]) {
      const wing = new T.Mesh(wingGeometry, birdMaterial);
      wing.scale.x = side;
      wing.userData.side = side;
      bird.add(wing);
    }
    bird.userData.offset = i;
    birds.add(bird);
  }
  root.add(birds);
  let glass: T.MeshStandardMaterial | undefined;
  const ice = new Map<number, T.Mesh>();
  let seasonKey = "",
    hour = 0.5,
    previousDay = 0;
  const colors = {
    zenith: new T.Color(paint("sky-zenith")),
    horizon: new T.Color(paint("sky-horizon")),
    dusk: new T.Color(paint("sky-dusk")),
    night: new T.Color(paint("night-sky")),
    rainZenith: new T.Color(paint("rain-sky")),
    rainHorizon: new T.Color(paint("rain-horizon")),
    sun: new T.Color(paint("sun")),
    sunset: new T.Color(paint("sunset")),
    hemiSky: new T.Color(paint("sky-light")),
    hemiGround: new T.Color(paint("ground-light")),
    cloud: new T.Color(paint("cloud")),
    cloudRain: new T.Color(paint("cloud-rain")),
  };
  const state = {
    sun: new T.Vector3(),
    zenith: new T.Color(),
    horizon: new T.Color(),
    sunColor: new T.Color(),
    cloudTint: new T.Color(),
    cloudOpacity: 1,
    clouds: 8,
    drift: 0,
  };
  function update(
    game: FarmState,
    clock: Pick<GameClock, "active" | "phase">,
    ms: number,
    reduced: boolean,
    cameraDistance: number,
    rainCount = 240,
    presentationHour?: number,
    camera?: T.Camera,
  ) {
    wind.value = reduced ? 0 : ms * 0.001;
    windStrength.value = reduced ? 0 : 1;
    const w = sceneWeather(game.day),
      key = `${w.season}:${w.frost}:${[...farm.ponds.values()].map((p) => p.group.uuid).join(":")}`;
    if (key !== seasonKey) {
      const season: Season = w.season;
      seasonKey = key;
      for (const [object, prefix] of [
        ["terrain", "ground"],
        ["foliage", "foliage"],
        ["meadow", "ground"],
        ["bushes", "foliage"],
      ]) {
        const mesh = farm.root.getObjectByName(object) as
          | T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>
          | undefined;
        if (mesh) mesh.material.color.set(paint(`${prefix}-${season}`));
      }
      const flowers = farm.root.getObjectByName("flowers");
      if (flowers) flowers.visible = season === "spring" || season === "summer";
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
    if (presentationHour !== undefined) hour = presentationHour;
    sunDirection(hour, state.sun);
    const light = Math.max(0.12, Math.sin(hour * Math.PI)),
      golden = 1 - T.MathUtils.smoothstep(state.sun.y, 0.16, 0.5),
      rainy = w.rainy ? 1 : 0;
    sun.position.copy(state.sun).multiplyScalar(80);
    sun.target.position.set(0, 0, 0);
    sun.intensity = (0.5 + light * 2.3) * (rainy ? 0.55 : 1);
    sun.color.copy(colors.sun).lerp(colors.sunset, golden * 0.85);
    sky.intensity = (0.62 + light * 0.5) * (rainy ? 1.1 : 1);
    sky.color.copy(colors.hemiSky);
    sky.groundColor.copy(colors.hemiGround);
    state.sunColor.copy(sun.color);
    state.zenith
      .copy(colors.night)
      .lerp(rainy ? colors.rainZenith : colors.zenith, Math.min(1, light * 2));
    state.horizon
      .copy(colors.night)
      .lerp(
        rainy ? colors.rainHorizon : colors.horizon,
        Math.min(1, light * 1.9),
      )
      .lerp(colors.dusk, rainy ? 0 : golden * 0.6);
    state.cloudTint
      .copy(rainy ? colors.cloudRain : colors.cloud)
      .lerp(colors.sunset, rainy ? 0 : golden * 0.5)
      .multiplyScalar(0.55 + light * 0.45);
    state.cloudOpacity = rainy ? 0.95 : w.label === "Éclaircies" ? 0.95 : 0.88;
    state.clouds = rainy ? 18 : w.label === "Éclaircies" ? 15 : 11;
    state.drift = reduced ? 0 : ms * 0.0000035;
    waterUniforms.uTime.value = reduced ? 0 : ms * 0.001;
    waterUniforms.uSunDir.value.copy(state.sun);
    waterUniforms.uSunColor.value
      .copy(sun.color)
      .multiplyScalar(Math.min(1.2, sun.intensity / 2.4));
    waterUniforms.uSkyZenith.value.copy(state.zenith);
    waterUniforms.uSkyHorizon.value.copy(state.horizon);
    if (farm.root.visible) scene.background = state.horizon;
    if (camera) dome.update(state, camera);
    dome.root.visible = farm.root.visible;
    if (scene.fog instanceof T.Fog) {
      scene.fog.color.copy(state.horizon);
      scene.fog.near = Math.max(60, cameraDistance + (rainy ? 12 : 40));
      scene.fog.far = scene.fog.near + (rainy ? 120 : 210);
    }
    root.visible = farm.root.visible;
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
    // Warm windows as the light fades.
    if (!glass)
      farm.root.traverse((o) => {
        if (
          o instanceof T.Mesh &&
          o.material instanceof T.MeshStandardMaterial &&
          o.material.name === "window-glass"
        )
          glass = o.material;
      });
    if (glass)
      glass.emissiveIntensity =
        Math.max(0, 1 - light * 1.6) * 1.4 + rainy * 0.25;
    for (const smoke of farm.root.getObjectsByProperty("name", "smoke"))
      smoke.children.forEach((puff, i) => {
        const t = reduced
          ? puff.userData.phase
          : (ms * 0.00022 + puff.userData.phase) % 1;
        puff.position.set(t * 1.6, t * 4.2, -t * 0.6);
        // Puffs swell then thin out as they rise.
        puff.scale.setScalar((0.5 + t * 1.9) * (t > 0.82 ? (1 - t) / 0.18 : 1));
        puff.visible = !rainy || i < 3;
      });
    birds.visible = !reduced && !rainy && farm.root.visible;
    if (birds.visible)
      birds.children.forEach((bird) => {
        const k = bird.userData.offset,
          angle = ms * 0.00012 + k * 0.32,
          radius = 30 + (k % 3) * 2.5;
        bird.position.set(
          Math.cos(angle) * radius - 4,
          24 + Math.sin(ms * 0.0007 + k) * 0.8 + (k % 2) * 1.5,
          Math.sin(angle) * radius - 6,
        );
        bird.rotation.y = -angle;
        const flap = Math.sin(ms * 0.012 + k * 1.7) * 0.55;
        for (const wing of bird.children)
          wing.rotation.z = flap * wing.userData.side;
      });
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
      dome.dispose();
      scene.remove(root);
      disposeObject(root);
    },
  };
}
