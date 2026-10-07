import { createLifeEffects } from "./world/LifeEffects";
import { createWeather } from "./world/WeatherScene";
import { oxygenMotion } from "./world/lifeSelectors";
import type { GameClock } from "./state/useGameClock";
import { registerFeedbackProjector } from "./state/feedback";
import { useEffect, useMemo, useRef, useState } from "react";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import FarmMap from "./FarmMap";
import { stepSchool, swimRotation } from "./swimming";
import { animateFish, clearFishTextures, createFish } from "./fish3d";
import { createFarm, disposeObject, POND_POSITIONS } from "./farm3d";
import { type Pond, type SpeciesId } from "./game";
import { paint } from "./world/palette";
import type { FarmState } from "./world/artSelectors";
import type { SceneMode } from "./world/types";
export default function FarmScene({
  ponds,
  development,
  food,
  selected,
  select,
  day,
  mode,
  species,
  clearWater,
  reset,
  clock,
}: {
  ponds: Pond[];
  development: FarmState["development"];
  food: number;
  selected: number;
  select: (id: number) => void;
  day: number;
  mode: SceneMode;
  species: SpeciesId;
  clearWater: boolean;
  reset: number;
  clock: Pick<GameClock, "active" | "phase" | "seeking">;
}) {
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const state = useMemo(
    () => ({
      ponds,
      development,
      food,
      selected,
      select,
      day,
      mode,
      species,
      clearWater,
      reset,
      clock,
    }),
    [
      ponds,
      development,
      food,
      selected,
      select,
      day,
      mode,
      species,
      clearWater,
      reset,
      clock,
    ],
  );
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      setError(
        "La 3D n’est pas disponible dans ce navigateur. La carte de gestion reste utilisable.",
      );
      return;
    }
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1 : 1.5),
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.domElement.setAttribute(
      "aria-label",
      "Vue 3D de l’exploitation. Utilisez les boutons pour sélectionner une vue ou un bassin.",
    );
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.dataset.engine = "three-webgl";
    container.appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.background = new T.Color(paint("sky"));
    scene.fog = new T.Fog(paint("sky"), 100, 220);
    const camera = new T.PerspectiveCamera(40, 1, 0.08, 250);
    camera.position.set(37, 36, 45);
    const stopProjection = registerFeedbackProjector((id) => {
      if (latest.current.mode === "fish" || !POND_POSITIONS[id - 1])
        return null;
      const [x, z] = POND_POSITIONS[id - 1];
      const v = new T.Vector3(x, 1.5, z).project(camera),
        rect = renderer.domElement.getBoundingClientRect();
      return v.z < 1
        ? {
            x: rect.left + ((v.x + 1) * rect.width) / 2,
            y: rect.top + ((1 - v.y) * rect.height) / 2,
          }
        : null;
    });
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 0, -2);
    controls.minDistance = 6;
    controls.maxDistance = 100;
    controls.maxPolarAngle = Math.PI / 2 - 0.045;
    controls.enablePan = true;
    const sky = new T.HemisphereLight(
      paint("sky-light"),
      paint("ground-light"),
      1.05,
    );
    scene.add(sky);
    const sun = new T.DirectionalLight(paint("sun"), 2.5);
    sun.position.set(-30, 50, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(
      window.innerWidth < 700 ? 1024 : 2048,
      window.innerWidth < 700 ? 1024 : 2048,
    );
    sun.shadow.camera.left = -48;
    sun.shadow.camera.right = 48;
    sun.shadow.camera.top = 48;
    sun.shadow.camera.bottom = -48;
    sun.shadow.camera.far = 140;
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.00012;
    scene.add(sun);
    const pmrem = new T.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.45;
    room.dispose();
    pmrem.dispose();
    const farm = createFarm(latest.current);
    scene.add(farm.root);
    let specimen = createFish("trout", true);
    specimen.scale.setScalar(2.1);
    specimen.position.y = 1.7;
    specimen.visible = false;
    scene.add(specimen);
    let pendingFrames = 2;
    let cameraKey = "",
      fishSpecies: SpeciesId = "trout";
    let renderedFrames = 0;
    let frame = 0,
      lastRender = 0,
      lastSwim = 0;
    const raycaster = new T.Raycaster(),
      pointer = new T.Vector2();
    let down = { x: 0, y: 0 };
    let active = true,
      needsRender = true;
    const life = createLifeEffects(farm, () => {
      needsRender = true;
    });
    scene.add(life.root);
    const weatherScene = createWeather(scene, farm, sun, sky);
    let previousState = latest.current;
    controls.addEventListener("change", () => {
      needsRender = true;
    });
    const resize = () => {
      needsRender = true;
      const w = container.clientWidth,
        h = container.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const intersection = new IntersectionObserver((entries) => {
      active = entries[0].isIntersecting;
    });
    intersection.observe(container);
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (
        latest.current.mode === "fish" ||
        Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5
      )
        return;
      const b = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - b.left) / b.width) * 2 - 1,
        (-(e.clientY - b.top) / b.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(farm.targets, false)[0];
      if (hit) latest.current.select(hit.object.userData.pondId);
    };
    const contextLost = (e: Event) => {
      e.preventDefault();
      active = false;
      setError(
        "Le contexte graphique a été interrompu. La carte de secours permet de continuer la partie.",
      );
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionChanged = () => {
      needsRender = true;
      lastSwim = 0;
    };
    motionQuery.addEventListener("change", motionChanged);
    window.addEventListener("etangs-preferences", motionChanged);
    const animate = (ms: number) => {
      frame = requestAnimationFrame(animate);
      if (
        !active ||
        document.hidden ||
        ms - lastRender < (window.innerWidth < 700 ? 50 : 32)
      )
        return;
      lastRender = ms;
      const reduced =
        motionQuery.matches ||
        document.documentElement.dataset.motion === "reduce";
      const state = latest.current;
      const changed = state !== previousState;
      previousState = state;
      // Let freshly uploaded geometry/materials settle before freezing reduced-motion views.
      if (changed || needsRender) pendingFrames = 2;
      if (reduced && pendingFrames === 0) return;
      pendingFrames = Math.max(0, pendingFrames - 1);
      needsRender = false;
      const delta =
        reduced || !lastSwim ? 0 : Math.min(0.1, (ms - lastSwim) * 0.001);
      lastSwim = ms;
      const time = reduced ? 0 : ms * 0.001;
      if (changed) farm.update(state);
      renderer.domElement.dataset.farmId = farm.root.uuid;
      renderer.domElement.dataset.pondGroups = JSON.stringify(
        [...farm.ponds].map(([id, e]) => ({
          id,
          uuid: e.group.uuid,
          progress: e.group.userData.progress,
        })),
      );
      renderer.domElement.dataset.assetGroups = JSON.stringify(
        [...farm.assets].map(([id, e]) => ({
          id,
          uuid: e.group.uuid,
          progress: e.group.userData.progress,
          objects: e.group.children.length,
        })),
      );
      const key = `${state.mode}:${state.mode === "pond" ? state.selected : ""}:${state.reset}:${camera.aspect}`;
      if (key !== cameraKey) {
        controls.maxPolarAngle =
          state.mode === "fish" ? Math.PI - 0.1 : Math.PI / 2 - 0.045;
        controls.minDistance = state.mode === "fish" ? 3.5 : 6;
        controls.maxDistance =
          state.mode === "fish" ? 13 : state.mode === "buildings" ? 210 : 100;
        if (state.mode === "farm") {
          camera.position.set(37, 36, 45);
          controls.target.set(0, 0, -2);
        }
        if (state.mode === "buildings") {
          const distance = Math.max(
            58,
            60 /
              (2 *
                Math.tan(T.MathUtils.degToRad(camera.fov / 2)) *
                camera.aspect),
          );
          controls.target.set(0, 1.6, -16);
          camera.position
            .copy(controls.target)
            .add(
              new T.Vector3(0.12, 0.46, 0.88)
                .normalize()
                .multiplyScalar(distance),
            );
        }
        if (state.mode === "pond") {
          const [x, z] = POND_POSITIONS[state.selected - 1];
          controls.target.set(x, 0.55, z);
          const distance = Math.max(
            14,
            17 /
              (2 *
                Math.tan(T.MathUtils.degToRad(camera.fov / 2)) *
                camera.aspect),
          );
          camera.position
            .copy(controls.target)
            .add(
              new T.Vector3(2.5, 7.45, 11).normalize().multiplyScalar(distance),
            );
        }
        if (state.mode === "fish") {
          const distance = Math.max(
            8.8,
            9 /
              (2 *
                Math.tan(T.MathUtils.degToRad(camera.fov / 2)) *
                camera.aspect),
          );
          const offset = container.clientWidth < 700 ? 0 : 0.8;
          camera.position.set(-0.1 + offset, 2.15, distance);
          controls.maxDistance = Math.max(13, distance * 1.8);
          controls.target.set(
            offset,
            container.clientWidth < 700 ? 1.2 : 1.7,
            0,
          );
        }
        cameraKey = key;
        controls.update();
      }
      if (state.species !== fishSpecies) {
        scene.remove(specimen);
        disposeObject(specimen);
        specimen = createFish(state.species, true);
        specimen.scale.setScalar(2.1);
        specimen.position.y = 1.7;
        scene.add(specimen);
        fishSpecies = state.species;
      }
      farm.root.visible = state.mode !== "fish";
      specimen.visible = state.mode === "fish";
      scene.background = new T.Color(
        state.mode === "fish" ? paint("specimen-background") : paint("sky"),
      );
      const [sx, sz] = POND_POSITIONS[state.selected - 1];
      farm.selection.position.set(sx, 1.035, sz);
      farm.normal.offset.set(-time * 0.008, time * 0.006);
      for (const water of farm.waters) {
        const p = state.ponds[water.userData.pondId - 1];
        water.material.opacity = state.clearWater
          ? 0.28
          : p.facility === "earth"
            ? 0.92
            : 0.64;
        water.material.color.set(
          p.facility === "earth"
            ? paint("water-earth")
            : p.tan > 1
              ? paint("water-turbid")
              : paint("water-source"),
        );
      }
      for (const p of state.ponds) {
        const members = farm.fish.filter((f) => f.pondId === p.id);
        stepSchool(
          members.map((f) => f.swimmer),
          delta * oxygenMotion(p) * (life.feeding(p.id) ? 1.2 : 1),
          {
            halfWidth: p.facility === "earth" ? 5.1 : 4.8,
            halfDepth: p.facility === "earth" ? 2.9 : 1.75,
          },
          p.health / 100,
        );
        const [x, z] = POND_POSITIONS[p.id - 1];
        for (const f of members) {
          const swim = f.swimmer;
          f.mesh.position.set(x + swim.x, swim.y, z + swim.z);
          f.mesh.rotation.y = swimRotation(swim.heading);
          f.mesh.rotation.z = -swim.turn * 0.025;
          f.mesh.scale.setScalar(0.17 + p.weight ** (1 / 3) * 0.14);
          animateFish(
            f.mesh,
            swim.phase,
            swim.effort + (life.feeding(p.id) ? 0.25 : 0),
            swim.turn,
          );
        }
      }
      if (specimen.visible) {
        specimen.position.y = 1.7 + Math.sin(time * 0.8) * 0.03;
        animateFish(specimen, time * 5.5, 0.55);
      }
      controls.update();
      life.root.visible = farm.root.visible;
      life.update(ms, reduced);
      const conditions = weatherScene.update(
        state,
        state.clock,
        ms,
        reduced,
        camera.position.distanceTo(controls.target),
      );
      renderer.domElement.dataset.weather = JSON.stringify(conditions);
      renderer.domElement.dataset.life = JSON.stringify(life.diagnostics());
      renderer.render(scene, camera);
      renderer.domElement.dataset.frame = "rendered";
      renderer.domElement.dataset.renderCount = String(++renderedFrames);
      renderer.domElement.dataset.view = state.mode;
      renderer.domElement.dataset.species = state.species;
      renderer.domElement.dataset.day = String(state.day);
      renderer.domElement.dataset.ponds = state.ponds
        .map(
          (p) =>
            `${p.id}:${p.built}:${p.constructionDays}:${p.count}:${p.upgrade}`,
        )
        .join("|");
      renderer.domElement.dataset.settled = String(pendingFrames === 0);
      renderer.domElement.dataset.camera = [
        ...camera.position.toArray(),
        ...controls.target.toArray(),
      ]
        .map((n) => n.toFixed(3))
        .join(",");
    };
    frame = requestAnimationFrame(animate);
    setReady(true);
    return () => {
      stopProjection();
      cancelAnimationFrame(frame);
      motionQuery.removeEventListener("change", motionChanged);
      window.removeEventListener("etangs-preferences", motionChanged);
      observer.disconnect();
      intersection.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      scene.remove(life.root);
      life.dispose();
      weatherScene.dispose();
      farm.dispose();
      disposeObject(specimen);
      clearFishTextures();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div
      className="world-scene"
      data-testid="farm-scene"
      data-ready={ready && !error ? "true" : "false"}
    >
      <div className="world-canvas" ref={host} hidden={!!error} />
      {error && (
        <div className="world-fallback">
          <p role="status">Carte de secours · la 3D est indisponible.</p>
          <FarmMap ponds={ponds} selected={selected} select={select} />
        </div>
      )}
      {!ready && !error && (
        <div className="world-loading" role="status">
          Préparation du terrain…
        </div>
      )}
    </div>
  );
}
