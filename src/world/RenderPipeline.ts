import * as T from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { HorizontalTiltShiftShader } from "three/addons/shaders/HorizontalTiltShiftShader.js";
import { VerticalTiltShiftShader } from "three/addons/shaders/VerticalTiltShiftShader.js";
import { QUALITY, type Quality } from "./quality";
import type { FarmObjects } from "../farm3d";

/** Display-space grade: gentle S-curve, saturation, warm highlights, cool shadows, vignette. */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    contrast: { value: 1.06 },
    saturation: { value: 1.03 },
    warmth: { value: 1 },
    vignette: { value: 0.22 },
  },
  vertexShader:
    "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float contrast;
    uniform float saturation;
    uniform float warmth;
    uniform float vignette;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, saturation);
      col = (col - 0.5) * contrast + 0.5;
      col += vec3(0.03, 0.014, -0.022) * smoothstep(0.45, 1.0, l) * warmth;
      col += vec3(-0.018, 0.004, 0.028) * (1.0 - smoothstep(0.0, 0.42, l)) * warmth;
      float d = length((vUv - 0.5) * vec2(1.2, 1.0));
      col *= 1.0 - vignette * smoothstep(0.32, 0.9, d);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a);
    }`,
};

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
    bloom: UnrealBloomPass | undefined,
    tilt: ShaderPass[] = [],
    current: Quality | undefined;
  function disposePost() {
    if (composer) {
      for (const p of composer.passes) p.dispose();
      composer.dispose();
    }
    composer = undefined;
    fxaa = undefined;
    bloom = undefined;
    tilt = [];
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
    if (tilt.length) {
      tilt[0].uniforms.h.value = 5 / (size.x * ratio);
      tilt[1].uniforms.v.value = 5 / (size.y * ratio);
    }
  }
  function counts(q: (typeof QUALITY)[Quality]) {
    for (const [name, count] of [
      ["foliage", q.trees],
      ["conifers", q.forest],
      ["meadow", q.grass],
      ["flowers", q.flowers],
    ] as const) {
      const mesh = farm.root.getObjectByName(name) as
        | T.InstancedMesh
        | undefined;
      if (mesh) mesh.count = Math.min(count, mesh.userData.capacity ?? count);
    }
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
    sun.shadow.radius = q.shadow >= 2048 ? 3 : 2;
    renderer.shadowMap.needsUpdate = true;
    counts(q);
    if (q.post !== "none") {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      if (q.post === "cinematic") {
        bloom = new UnrealBloomPass(new T.Vector2(256, 256), 0.32, 0.5, 0.9);
        composer.addPass(bloom);
      }
      composer.addPass(new OutputPass());
      if (q.post !== "grade") {
        fxaa = new ShaderPass(FXAAShader);
        composer.addPass(fxaa);
      }
      if (q.post === "cinematic") {
        // Miniature focus band: only the far top and near bottom soften.
        const h = new ShaderPass(HorizontalTiltShiftShader),
          v = new ShaderPass(VerticalTiltShiftShader);
        h.uniforms.r.value = v.uniforms.r.value = 0.5;
        tilt = [h, v];
        composer.addPass(h);
        composer.addPass(v);
      }
      const grade = new ShaderPass(GradeShader);
      grade.uniforms.vignette.value = q.post === "grade" ? 0.16 : 0.22;
      composer.addPass(grade);
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
