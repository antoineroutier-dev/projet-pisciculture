import { useEffect, useMemo, useRef, useState } from "react";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import FarmMap from "./FarmMap";
import { stepSchool, swimRotation } from "./swimming";
import { animateFish, clearFishTextures, createFish } from "./fish3d";
import { createFarm, disposeObject, POND_POSITIONS } from "./farm3d";
import { type Pond, type SpeciesId } from "./game";
import type { SceneMode } from "./world/types";
export default function FarmScene({ponds, selected, select, day, mode, species, clearWater, reset}: {
  ponds:Pond[]; selected:number; select:(id:number)=>void; day:number;
  mode:SceneMode; species:SpeciesId; clearWater:boolean; reset:number;
}) {
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const state = useMemo(() => ({ponds, selected, select, day, mode, species, clearWater, reset}),
    [ponds, selected, select, day, mode, species, clearWater, reset]);
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
    scene.background = new T.Color("#dbe6dc");
    scene.fog = new T.Fog("#dbe6dc", 100, 220);
    const camera = new T.PerspectiveCamera(40, 1, 0.08, 250);
    camera.position.set(37, 36, 45);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 0, -2);
    controls.minDistance = 6;
    controls.maxDistance = 100;
    controls.maxPolarAngle = Math.PI / 2 - 0.045;
    controls.enablePan = true;
    const sky = new T.HemisphereLight("#eef4ec", "#736749", 1.05);
    scene.add(sky);
    const sun = new T.DirectionalLight("#fff0ce", 2.5);
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
    let farm = createFarm(latest.current.ponds);
    scene.add(farm.root);
    let specimen = createFish("trout", true);
    specimen.scale.setScalar(2.1);
    specimen.position.y = 1.7;
    specimen.visible = false;
    scene.add(specimen);
    let pendingFrames = 2;
    let signature = latest.current.ponds
        .map((p) =>
          [
            p.built,
            p.species,
            p.count > 0,
            p.upgrade,
            p.facility,
            p.constructionDays > 0,
          ].join(":"),
        )
        .join("|"),
      cameraKey = "",
      fishSpecies: SpeciesId = "trout";
    let frame = 0,
      lastRender = 0,
      lastSwim = 0;
    const raycaster = new T.Raycaster(),
      pointer = new T.Vector2();
    let down = { x: 0, y: 0 };
    let active = true,
      needsRender = true;
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
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const animate = (ms: number) => {
      frame = requestAnimationFrame(animate);
      if (
        !active ||
        document.hidden ||
        ms - lastRender < (window.innerWidth < 700 ? 50 : 32)
      )
        return;
      lastRender = ms;
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
      const nextSignature = state.ponds
        .map((p) =>
          [
            p.built,
            p.species,
            p.count > 0,
            p.upgrade,
            p.facility,
            p.constructionDays > 0,
          ].join(":"),
        )
        .join("|");
      if (nextSignature !== signature) {
        const swimmers = new globalThis.Map(
          state.ponds.map((p) => [
            p.id,
            farm.fish.filter((f) => f.pondId === p.id).map((f) => f.swimmer),
          ]),
        );
        scene.remove(farm.root);
        disposeObject(farm.root);
        farm = createFarm(state.ponds);
        for (const p of state.ponds) {
          farm.fish
            .filter((f) => f.pondId === p.id)
            .forEach((f, i) => {
              const previous = swimmers.get(p.id)?.[i];
              if (previous?.species === f.swimmer.species) f.swimmer = previous;
            });
        }
        scene.add(farm.root);
        signature = nextSignature;
      }
      const key = `${state.mode}:${state.mode === "pond" ? state.selected : ""}:${state.reset}:${state.mode === "fish" ? camera.aspect : ""}`;
      if (key !== cameraKey) {
        controls.maxPolarAngle =
          state.mode === "fish" ? Math.PI - 0.1 : Math.PI / 2 - 0.045;
        controls.minDistance = state.mode === "fish" ? 3.5 : 6;
        controls.maxDistance = state.mode === "fish" ? 13 : 100;
        if (state.mode === "farm") {
          camera.position.set(37, 36, 45);
          controls.target.set(0, 0, -2);
        }
        if (state.mode === "buildings") {
          camera.position.set(-7, 5.2, -3);
          controls.target.set(-10, 2.1, -17);
        }
        if (state.mode === "pond") {
          const [x, z] = POND_POSITIONS[state.selected - 1];
          camera.position.set(x + 2.5, 8, z + 11);
          controls.target.set(x, 0.55, z);
        }
        if (state.mode === "fish") {
          const distance = Math.max(7.5, 9 / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
          camera.position.set(-0.1, 2.15, distance);
          controls.maxDistance = Math.max(13, distance * 1.8);
          controls.target.set(0, container.clientWidth < 700 ? 1.2 : 1.7, 0);
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
        state.mode === "fish" ? "#d9e2da" : "#dbe6dc",
      );
      const [sx, sz] = POND_POSITIONS[state.selected - 1];
      farm.selection.position.set(sx, 1.035, sz);
      farm.normal.offset.set(time * 0.008, time * 0.006);
      for (const water of farm.waters) {
        const p = state.ponds[water.userData.pondId - 1];
        water.material.opacity = state.clearWater
          ? 0.28
          : p.facility === "earth"
            ? 0.92
            : 0.64;
        water.material.color.set(
          p.facility === "earth"
            ? "#617747"
            : p.tan > 1
              ? "#596e4d"
              : "#397876",
        );
      }
      for (const p of state.ponds) {
        const members = farm.fish.filter((f) => f.pondId === p.id);
        stepSchool(
          members.map((f) => f.swimmer),
          delta,
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
          animateFish(f.mesh, swim.phase, swim.effort, swim.turn);
        }
      }
      if (specimen.visible) {
        specimen.position.y = 1.7 + Math.sin(time * 0.8) * 0.03;
        animateFish(specimen, time * 5.5, 0.55);
      }
      controls.update();
      renderer.render(scene, camera);
      renderer.domElement.dataset.frame = "rendered";
      renderer.domElement.dataset.view = state.mode;
      renderer.domElement.dataset.species = state.species;
      renderer.domElement.dataset.day = String(state.day);
      renderer.domElement.dataset.settled = String(pendingFrames === 0);
      renderer.domElement.dataset.camera = [...camera.position.toArray(), ...controls.target.toArray()].map(n => n.toFixed(3)).join(",");
    };
    frame = requestAnimationFrame(animate);
    setReady(true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      disposeObject(farm.root);
      disposeObject(specimen);
      clearFishTextures();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);
  return <div className="world-scene" data-testid="farm-scene" data-ready={ready && !error ? "true" : "false"}>
    <div className="world-canvas" ref={host} hidden={!!error} />
    {error && <div className="world-fallback">
      <p role="status">Carte de secours · la 3D est indisponible.</p>
      <FarmMap ponds={ponds} selected={selected} select={select} />
    </div>}
    {!ready && !error && <div className="world-loading" role="status">Préparation du terrain…</div>}
  </div>;
}
