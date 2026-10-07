import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  Focus,
  Fish,
  Map,
  RotateCcw,
  Maximize2,
  Eye,
  Camera,
  Warehouse,
} from "lucide-react";
import FarmMap from "./FarmMap";
import { stepSchool, swimRotation } from "./swimming";
import { animateFish, clearFishTextures, createFish } from "./fish3d";
import { createFarm, disposeObject, POND_POSITIONS } from "./farm3d";
import { SPECIES, number, type Pond, type SpeciesId } from "./game";

type SceneMode = "farm" | "pond" | "fish" | "buildings";
import { FishArt } from "./FishArt";
export default function FarmScene({
  ponds,
  selected,
  select,
  day,
}: {
  ponds: Pond[];
  selected: number;
  select: (id: number) => void;
  day: number;
}) {
  const [started, setStarted] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<SceneMode>("farm");
  const [species, setSpecies] = useState<SpeciesId>("trout");
  const [clearWater, setClearWater] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [reset, setReset] = useState(0);
  const [showPlate, setShowPlate] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const latest = useRef({
    ponds,
    selected,
    select,
    day,
    mode,
    species,
    clearWater,
    reset,
    landscape,
    showPlate,
  });
  latest.current = {
    ponds,
    selected,
    select,
    day,
    mode,
    species,
    clearWater,
    reset,
    landscape,
    showPlate,
  };
  const selectedPond = ponds[selected - 1];
  useEffect(() => {
    if (!started || !host.current) return;
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
      if (
        (reduced ||
          state.showPlate ||
          (state.landscape && state.mode === "farm")) &&
        !needsRender &&
        !changed
      )
        return;
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
      const key = `${state.mode}:${state.mode === "pond" ? state.selected : ""}:${state.reset}`;
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
          camera.position.set(-0.1, 2.15, 7.5);
          controls.target.set(0, 1.7, 0);
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
  }, [started]);
  function setView(next: SceneMode) {
    setStarted(true);
    setMode(next);
    if (next !== "farm") setLandscape(false);
    setShowPlate(next === "fish");
    if (next === "fish" && selectedPond.species)
      setSpecies(selectedPond.species);
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.current?.requestFullscreen();
    } catch {
      setNotice("Le plein écran est indisponible dans ce navigateur.");
    }
  }
  return (
    <div
      className="scene-shell"
      ref={shell}
      data-testid="farm-scene"
      data-ready={ready && !error ? "true" : "false"}
    >
      <div className="scene-toolbar">
        <div className="scene-tabs" aria-label="Vues de l’exploitation">
          {(
            [
              { id: "farm", label: "La ferme", icon: <Map size={14} /> },
              { id: "pond", label: "Le bassin", icon: <Focus size={14} /> },
              { id: "fish", label: "Les poissons", icon: <Fish size={14} /> },
              {
                id: "buildings",
                label: "Bâtiments",
                icon: <Warehouse size={14} />,
              },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              aria-pressed={mode === v.id}
              onClick={() => setView(v.id)}
            >
              {v.icon}
              {v.label}
            </button>
          ))}
        </div>
        <div className="scene-utilities">
          <button
            aria-label="Réinitialiser la caméra"
            onClick={() => setReset((x) => x + 1)}
          >
            <RotateCcw size={15} />
          </button>
          <button
            aria-label="Vue plein écran"
            onClick={() => void fullscreen()}
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>
      <div className="scene-viewport">
        <div
          className={`scene-canvas ${error ? "has-error" : ""} ${showPlate ? "showing-plate" : ""}`}
          ref={host}
        />
        {!started && !landscape && mode === "farm" && (
          <div className="scene-site-plan">
            <FarmMap ponds={ponds} selected={selected} select={select} />
          </div>
        )}
      </div>
      {error && (
        <div className="scene-fallback">
          <p role="status">{error}</p>
          <FarmMap ponds={ponds} selected={selected} select={select} />
        </div>
      )}
      {started && !ready && !error && (
        <div className="scene-loading">Préparation de la visite…</div>
      )}
      {landscape && mode === "farm" && (
        <div className="landscape-observation">
          <img
            src={`${import.meta.env.BASE_URL}assets/farm-landscape.png`}
            alt="Vue d’ambiance de la ferme : maison en pierre, grange, bassin de truites et étang bordé de végétation."
          />
          <div className="landscape-hotspots">
            {ponds.slice(0, 2).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  select(p.id);
                  setView("pond");
                }}
              >
                <span>{String(p.id).padStart(2, "0")}</span>
                <strong>{p.name}</strong>
                <small>{number(p.count)} poissons · visiter</small>
              </button>
            ))}
          </div>
        </div>
      )}
      {showPlate && (
        <div className="photo-observation">
          <FishArt species={species} />
          <span>
            Planche d’identification artistique générée · proportions
            indicatives
          </span>
        </div>
      )}
      {mode === "fish" ? (
        <>
          <div className="species-picker" aria-label="Espèce à observer">
            {Object.values(SPECIES).map((s) => (
              <button
                key={s.id}
                aria-pressed={species === s.id}
                onClick={() => setSpecies(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className="fish-observation">
            <div>
              <span className="section-kicker">
                OBSERVATION NATURALISTE · VUE AGRANDIE
              </span>
              <h3>{SPECIES[species].name}</h3>
              <em>{SPECIES[species].latin}</em>
              <p>{SPECIES[species].identification}</p>
            </div>
            <button
              className="button light"
              aria-pressed={showPlate}
              onClick={() => setShowPlate(!showPlate)}
            >
              <Camera size={15} />
              {showPlate ? "Modèle 3D" : "Planche réaliste"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="scene-location" hidden={!started && !landscape}>
            <span>DOMAINE DES SAULES</span>
            <strong>
              {mode === "pond"
                ? selectedPond.name
                : mode === "buildings"
                  ? "La maison d’exploitation"
                  : "Une ferme au fil de l’eau"}
            </strong>
            <small>
              {mode === "pond"
                ? `${selectedPond.volume} m³ · ${selectedPond.count ? number(selectedPond.count) + " poissons" : "bassin sans lot"}`
                : "Bâtiments de pierre · eau de source · étang de terre"}
            </small>
          </div>
          <div className="scene-bottom">
            {mode === "farm" && (
              <button
                className="landscape-toggle"
                aria-pressed={landscape}
                onClick={() => {
                  setStarted(true);
                  setLandscape(started ? !landscape : false);
                }}
              >
                <Camera size={14} />
                {!started || landscape
                  ? "Explorer en 3D"
                  : "Illustration d’ambiance"}
              </button>
            )}
            <span
              style={{
                display: landscape && mode === "farm" ? "none" : undefined,
              }}
            >
              Glissez pour tourner · molette ou pincement pour zoomer
            </span>
            <button
              style={{
                display: landscape && mode === "farm" ? "none" : undefined,
              }}
              aria-pressed={clearWater}
              disabled={!selectedPond.count}
              onClick={() => {
                setStarted(true);
                setLandscape(false);
                setMode("pond");
                setClearWater(!clearWater);
              }}
            >
              <Eye size={14} />
              {clearWater ? "Vue pédagogique" : "Observer sous l’eau"}
            </button>
          </div>
          <div
            className="scene-pond-picker"
            aria-label="Sélection des bassins en 3D"
          >
            {ponds.map((p) => (
              <button
                key={p.id}
                aria-label={`Sélectionner ${p.name}`}
                aria-pressed={selected === p.id}
                onClick={() => {
                  select(p.id);
                  if (mode === "pond") setReset((r) => r + 1);
                }}
              >
                <span>{String(p.id).padStart(2, "0")}</span>
                {p.name}
              </button>
            ))}
          </div>
        </>
      )}
      {notice && (
        <p className="scene-notice" role="status">
          {notice}
        </p>
      )}
      <div className="scene-caption">
        {error
          ? "Carte de secours · la gestion et les commandes des bassins restent disponibles."
          : landscape && mode === "farm"
          ? "Illustration d’ambiance générée · consultez la 3D pour voir les travaux et l’état actuel de la ferme."
          : !started
            ? "Plan du terrain : les emplacements grisés ne sont pas aménagés. Ouvrez la 3D pour visiter."
            : mode === "fish"
              ? "Modèle anatomique original et illustration générée : repères visuels, pas une mesure scientifique."
              : clearWater
                ? "Observation pédagogique : transparence de l’eau accentuée. Les poissons visibles sont un échantillon du lot."
                : "Rendu 3D en temps réel · poissons à échelle indicative · échantillon visuel du lot."}
      </div>
    </div>
  );
}
