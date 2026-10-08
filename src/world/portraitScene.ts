import * as T from "three";
import { createFish, clearFishTextures } from "../fish3d";
import { disposeObject } from "../farm3d";
import { paint } from "./palette";
import type { SpeciesId } from "../game";
/** Asset authoring only. The game loads the baked local WebP, not a second canvas. */
export function renderPortrait(species: SpeciesId) {
  const renderer = new T.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(640, 300);
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new T.Scene(),
    fish = createFish(species, true);
  scene.add(fish);
  scene.add(
    new T.HemisphereLight(paint("sky-light"), paint("ground-light"), 2.4),
  );
  const light = new T.DirectionalLight(paint("sun"), 3);
  light.position.set(-3, 4, 5);
  scene.add(light);
  const fill = new T.DirectionalLight(paint("sky-light"), 1.1);
  fill.position.set(2, 1, -3);
  scene.add(fill);
  const bounds = new T.Box3().setFromObject(fish),
    size = bounds.getSize(new T.Vector3()),
    center = bounds.getCenter(new T.Vector3());
  const aspect = 640 / 300,
    height = Math.max(size.y * 1.24, (size.x / aspect) * 1.18);
  const camera = new T.OrthographicCamera(
    (-height * aspect) / 2,
    (height * aspect) / 2,
    height / 2,
    -height / 2,
    0.1,
    20,
  );
  camera.position.copy(center).add(new T.Vector3(0, 0.12, 5));
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const data = renderer.domElement.toDataURL("image/webp", 0.9);
  disposeObject(fish);
  clearFishTextures();
  renderer.dispose();
  renderer.forceContextLoss();
  return data;
}
