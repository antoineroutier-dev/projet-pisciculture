import { createRewards } from "./world/Rewards";
import type { AchievementId } from "./state/profile";
import { t, displayText, useLocale } from "./i18n";
import { disposeRenderCaches } from "./world/renderCaches";
import { registerSceneSnapshots } from "./world/snapshots";
import { Button } from "./ui/Button";
import { WorldLabels } from "./world/WorldLabels";
import { createLabelLayout } from "./world/LabelLayout";
import { createCameraRig } from "./world/CameraRig";
import { renderPipeline } from "./world/RenderPipeline";
import {
  QUALITY,
  detectQuality,
  type Graphics,
  type Quality,
} from "./world/quality";
import { softContour, targetKey, type WorldTarget } from "./world/selection";
import { ASSET_POSITIONS } from "./farm3d";
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
  graphics,
  target,
  inspect,
  panelOpen,
  presentation = false,
  introFlight = false,
  source,
  rewards = [],
}: {
  presentation?: boolean;
  introFlight?: boolean;
  source?: () => void;
  rewards?: readonly AchievementId[];
  graphics: Graphics;
  target: WorldTarget | null;
  inspect: (target: WorldTarget) => void;
  panelOpen: boolean;
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
  const locale = useLocale();
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const recovering = useRef(false);
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
      clock: {
        active: clock.active,
        seeking: clock.seeking,
        phase: { started: clock.phase.started, duration: clock.phase.duration },
      },
      graphics,
      target,
      inspect,
      panelOpen,
      presentation,
      introFlight,
      rewards,
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
      clock.active,
      clock.seeking,
      clock.phase.started,
      clock.phase.duration,
      graphics,
      target,
      inspect,
      panelOpen,
      presentation,
      introFlight,
      rewards,
    ],
  );
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    if (!host.current || error) return;
    const container = host.current;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      setError(t("m_eba7171035"));
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
    renderer.domElement.setAttribute("aria-label", t("m_1a5af6074a"));
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.dataset.engine = "three-webgl";
    container.appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.background = new T.Color(paint("sky"));
    scene.fog = new T.Fog(paint("sky"), 100, 220);
    const camera = new T.PerspectiveCamera(40, 1, 0.08, 400);
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
    const cameraSensitivity = () => {
      const sensitivity =
        Number(document.documentElement.dataset.cameraSensitivity) || 1;
      controls.rotateSpeed = sensitivity;
      controls.zoomSpeed = sensitivity;
      controls.panSpeed = sensitivity;
    };
    cameraSensitivity();
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
    disposeRenderCaches(renderer, room);
    room.dispose();
    pmrem.dispose();
    const farm = createFarm(latest.current);
    const decorations = createRewards(farm.root);
    scene.add(farm.root);
    let specimen = createFish("trout", true);
    specimen.scale.setScalar(2.1);
    specimen.position.y = 1.7;
    specimen.visible = false;
    scene.add(specimen);
    let pendingFrames = 2;
    let fishSpecies: SpeciesId = "trout";
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
    const pipeline = renderPipeline(renderer, scene, camera, sun, farm);
    const invalidate = () => {
      needsRender = true;
    };
    const snapshots = registerSceneSnapshots(invalidate);
    const rig = createCameraRig(camera, controls, invalidate);
    const labels = createLabelLayout(container.parentElement!, invalidate);
    const selection = softContour(),
      hover = softContour(true);
    scene.add(selection.root, hover.root);
    let hovered: WorldTarget | null = null;
    const gl = renderer.getContext(),
      debug = gl.getExtension("WEBGL_debug_renderer_info");
    const hardware = debug
      ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    const automatic = detectQuality({
      renderer: hardware,
      threads: navigator.hardwareConcurrency || 4,
      width: container.clientWidth,
      maxTextureSize: renderer.capabilities.maxTextureSize,
    });
    let quality: Quality =
      latest.current.graphics.quality === "auto"
        ? automatic
        : latest.current.graphics.quality;
    pipeline.quality(quality);
    renderer.domElement.dataset.hardware = hardware;
    renderer.domElement.dataset.automaticQuality = automatic;
    function contour(
      outline: ReturnType<typeof softContour>,
      target: WorldTarget | null,
    ) {
      outline.root.rotation.y = 0;
      if (!target || latest.current.mode === "fish") {
        outline.hide();
        return;
      }
      if (target.kind === "pond") {
        const [x, z] = POND_POSITIONS[target.id - 1];
        const p = latest.current.ponds[target.id - 1];
        outline.show(x, z, 13.6, p.facility === "earth" ? 8.4 : 7.2);
      }
      if (target.kind === "asset") {
        const [x, z] = ASSET_POSITIONS[target.id];
        outline.show(x, z, 11.6, 11.2);
      }
      if (target.kind === "truck") {
        const obj = life.root.children.find(
          (o) =>
            targetKey(o.userData.worldTarget ?? null) === targetKey(target),
        );
        if (obj) {
          outline.show(obj.position.x, obj.position.z, 2.4, 4.7);
          outline.root.rotation.y = obj.rotation.y;
        } else outline.hide();
      }
    }
    function pick(e: PointerEvent): WorldTarget | null {
      if (latest.current.mode === "fish") return null;
      const b = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - b.left) / b.width) * 2 - 1,
        -((e.clientY - b.top) / b.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const objects = [
        ...farm.targets,
        ...[...farm.assets].map(([id, v]) => {
          v.group.userData.worldTarget = { kind: "asset", id };
          return v.group;
        }),
        ...life.root.children.filter((o) => o.userData.worldTarget),
      ];
      const hit = raycaster.intersectObjects(objects, true)[0];
      let object: T.Object3D | null = hit?.object ?? null;
      while (object) {
        if (object.userData.worldTarget)
          return object.userData.worldTarget as WorldTarget;
        if (object.userData.pondId)
          return { kind: "pond", id: object.userData.pondId };
        object = object.parent;
      }
      return null;
    }
    const onMove = (e: PointerEvent) => {
      if (e.buttons) return;
      const target = pick(e);
      if (targetKey(target) !== targetKey(hovered)) {
        hovered = target;
        invalidate();
      }
      renderer.domElement.style.cursor = target ? "pointer" : "grab";
    };
    const onLeave = () => {
      hovered = null;
      invalidate();
    };
    let previousState = latest.current;
    let stateUpdates = 0;
    controls.addEventListener("change", () => {
      needsRender = true;
    });
    const resize = () => {
      needsRender = true;
      renderer.domElement.dataset.settled = "false";
      const w = container.clientWidth,
        h = container.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      pipeline.resize();
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
      const hit = pick(e);
      if (hit) latest.current.inspect(hit);
    };
    const contextLost = (e: Event) => {
      e.preventDefault();
      active = false;
      setError(t("m_1223712dee"));
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerleave", onLeave);
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionChanged = () => {
      cameraSensitivity();
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
        ms - lastRender < 1000 / QUALITY[quality].fps
      )
        return;
      lastRender = ms;
      const reduced =
        motionQuery.matches ||
        document.documentElement.dataset.motion === "reduce";
      const state = latest.current;
      quality =
        state.graphics.quality === "auto" ? automatic : state.graphics.quality;
      pipeline.quality(quality);
      renderer.domElement.dataset.quality = quality;
      renderer.domElement.dataset.presentation = String(state.presentation);
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
      if (changed) {
        farm.update(state);
        stateUpdates++;
      }
      renderer.domElement.dataset.stateUpdates = String(stateUpdates);
      decorations.update(state.rewards);
      renderer.domElement.dataset.rewards = state.rewards
        .filter((id) => id === "paid" || id === "cold")
        .join(",");
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
      controls.enableDamping = !reduced;
      const tracked =
        state.target?.kind === "truck"
          ? life.root.children.find(
              (o) =>
                targetKey(o.userData.worldTarget ?? null) ===
                targetKey(state.target),
            )
          : undefined;
      const flying = rig.update(
        {
          ...state,
          targetPoint: tracked
            ? { x: tracked.position.x, z: tracked.position.z }
            : undefined,
        },
        ms,
        reduced,
      );
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
        QUALITY[quality].rain,
        state.presentation ? 0.82 : undefined,
      );
      renderer.domElement.dataset.weather = JSON.stringify(conditions);
      renderer.domElement.dataset.life = JSON.stringify(life.diagnostics());
      contour(selection, state.target);
      contour(hover, hovered);
      labels.update(camera, state.graphics.labels && state.mode !== "fish");
      const renderStart = performance.now();
      pipeline.render();
      snapshots.afterRender(renderer.domElement);
      if (renderer.domElement.dataset.measureGpu === "true") {
        gl.finish();
        renderer.domElement.dataset.gpuFrameMs = String(
          performance.now() - renderStart,
        );
        renderer.domElement.dataset.gpuCompletedAt = String(performance.now());
      }
      renderer.domElement.dataset.drawCalls = String(
        renderer.info.render.calls,
      );
      renderer.domElement.dataset.selection = targetKey(state.target);
      renderer.domElement.dataset.hover = targetKey(hovered);
      renderer.domElement.dataset.resources = JSON.stringify(
        renderer.info.memory,
      );
      renderer.domElement.dataset.frame = "rendered";
      renderer.domElement.dataset.viewport = `${container.clientWidth}x${container.clientHeight}`;
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
      renderer.domElement.dataset.settled = String(
        pendingFrames === 0 && !flying,
      );
      renderer.domElement.dataset.camera = [
        ...camera.position.toArray(),
        ...controls.target.toArray(),
      ]
        .map((n) => n.toFixed(3))
        .join(",");
    };
    frame = requestAnimationFrame(animate);
    setReady(true);
    window.dispatchEvent(new Event("etangs-world-ready"));
    if (recovering.current) {
      recovering.current = false;
      queueMicrotask(() =>
        document
          .querySelector<HTMLElement>(
            '.world-controls [role="radio"][aria-checked="true"]',
          )
          ?.focus(),
      );
    }
    return () => {
      stopProjection();
      cancelAnimationFrame(frame);
      motionQuery.removeEventListener("change", motionChanged);
      window.removeEventListener("etangs-preferences", motionChanged);
      observer.disconnect();
      intersection.disconnect();
      rig.dispose();
      snapshots.dispose();
      labels.dispose();
      disposeRenderCaches(renderer, scene);
      pipeline.dispose();
      selection.dispose();
      hover.dispose();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      scene.remove(life.root);
      life.dispose();
      weatherScene.dispose();
      farm.dispose();
      disposeObject(specimen);
      clearFishTextures();
      environment.dispose();
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      window.dispatchEvent(
        new CustomEvent("etangs-render-disposed", {
          detail: {
            contextLost: gl.isContextLost(),
            memory: { ...renderer.info.memory },
          },
        }),
      );
      renderer.domElement.remove();
    };
  }, [error]);
  useEffect(() => {
    host.current
      ?.querySelector("canvas")
      ?.setAttribute("aria-label", t("m_1a5af6074a"));
  }, [locale, ready]);
  return (
    <div
      className="world-scene"
      data-testid="farm-scene"
      data-ready={ready && !error ? "true" : "false"}
    >
      <div className="world-canvas" ref={host} hidden={!!error} />
      {ready && !error && !presentation && (
        <WorldLabels
          ponds={ponds}
          select={select}
          selected={target?.kind === "pond" ? target.id : null}
          source={source}
        />
      )}
      {displayText(
        error && (
          <div className="world-fallback">
            <p role="status">
              <span title={t("m_700e2d455f")}>{t("compact.map")}</span>
              {displayText(" ")}
              <Button
                className="retry-renderer"
                size="small"
                autoFocus={recovering.current}
                onClick={() => {
                  recovering.current = true;
                  setReady(false);
                  setError("");
                }}
              >
                {t("m_3a1117c870")}
              </Button>
            </p>
            {source && (
              <Button data-world-source="true" onClick={source}>
                {t("source.action")}
              </Button>
            )}
            <FarmMap ponds={ponds} selected={selected} select={select} />
          </div>
        ),
      )}
      {!ready && !error && (
        <div className="world-loading" role="status">
          {t("m_55ae92620d")}
        </div>
      )}
    </div>
  );
}
