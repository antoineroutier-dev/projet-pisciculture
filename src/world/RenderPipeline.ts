import * as T from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { QUALITY, type Quality } from "./quality";
import type { FarmObjects } from "../farm3d";
export function renderPipeline(
  renderer: T.WebGLRenderer,
  scene: T.Scene,
  camera: T.Camera,
  sun: T.DirectionalLight,
  farm: FarmObjects,
) {
  renderer.info.autoReset = false;
  let composer: EffectComposer | undefined,
    fxaa: ShaderPass | undefined,
    current: Quality | undefined;
  function disposePost() {
    if (composer) {
      for (const p of composer.passes) p.dispose();
      composer.dispose();
    }
    composer = undefined;
    fxaa = undefined;
  }
  function resize() {
    const size = renderer.getSize(new T.Vector2()),
      ratio = renderer.getPixelRatio();
    composer?.setPixelRatio(ratio);
    composer?.setSize(size.x, size.y);
    fxaa?.uniforms.resolution.value.set(
      1 / (size.x * ratio),
      1 / (size.y * ratio),
    );
  }
  function quality(value: Quality) {
    if (current === value) return;
    current = value;
    const q = QUALITY[value];
    disposePost();
    renderer.setPixelRatio(
      Math.min(2, Math.max(0.5, window.devicePixelRatio * q.ratio)),
    );
    renderer.shadowMap.enabled = !!q.shadow;
    sun.castShadow = !!q.shadow;
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
    sun.shadow.mapSize.set(Math.max(256, q.shadow), Math.max(256, q.shadow));
    renderer.shadowMap.needsUpdate = true;
    (farm.root.getObjectByName("foliage") as T.InstancedMesh).count =
      q.trees * 5;
    (farm.root.getObjectByName("trunks") as T.InstancedMesh).count = q.trees;
    (farm.root.getObjectByName("meadow") as T.InstancedMesh).count = q.grass;
    if (q.post !== "none") {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      fxaa = new ShaderPass(FXAAShader);
      composer.addPass(fxaa);
      composer.addPass(new OutputPass());
      if (q.post === "fxaa-grade")
        composer.addPass(
          new ShaderPass({
            uniforms: { tDiffuse: { value: null } },
            vertexShader:
              "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
            fragmentShader:
              "uniform sampler2D tDiffuse; varying vec2 vUv; void main(){vec4 c=texture2D(tDiffuse,vUv);float edge=smoothstep(0.25,0.72,length(vUv-0.5));gl_FragColor=vec4(c.rgb*(1.0-0.06*edge),c.a);}",
          }),
        );
    }
    document.documentElement.dataset.quality = value;
    window.dispatchEvent(
      new CustomEvent("etangs-quality-changed", { detail: value }),
    );
    resize();
  }
  return {
    quality,
    resize,
    render: () => {
      renderer.info.reset();
      if (composer) composer.render();
      else renderer.render(scene, camera);
    },
    dispose: disposePost,
  };
}
