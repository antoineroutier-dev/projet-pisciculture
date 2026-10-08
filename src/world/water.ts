import * as T from "three";

/** Shared by every pond and the stream; the weather layer keeps them in step with the sky. */
export const waterUniforms = {
  uTime: { value: 0 },
  uSunDir: { value: new T.Vector3(-0.6, 0.6, 0.4).normalize() },
  uSunColor: { value: new T.Color(1, 0.95, 0.85) },
  uSkyZenith: { value: new T.Color(0.25, 0.45, 0.7) },
  uSkyHorizon: { value: new T.Color(0.8, 0.75, 0.65) },
};

/**
 * Stylised water on top of the standard lit material: deep-to-shallow tint from a
 * rounded-rectangle distance field, sky reflection by Fresnel, sun glints on
 * procedural ripples, and a soft band of foam along the banks.
 */
export function waterMaterial({
  color,
  shallow,
  foam,
  half,
  radius,
  opacity,
  flow = [0.35, 0.2],
  ripple = 1,
  foamWidth = 0.45,
}: {
  color: string;
  shallow: string;
  foam: string;
  half: [number, number];
  radius: number;
  opacity: number;
  flow?: [number, number];
  ripple?: number;
  foamWidth?: number;
}) {
  const material = new T.MeshStandardMaterial({
    color,
    roughness: 0.18,
    metalness: 0,
    transparent: true,
    opacity,
    side: T.DoubleSide,
    depthWrite: false,
  });
  const local = {
    uShallow: { value: new T.Color(shallow) },
    uFoam: { value: new T.Color(foam) },
    uHalf: { value: new T.Vector2(...half) },
    uRadius: { value: radius },
    uFlow: { value: new T.Vector2(...flow) },
    uRipple: { value: ripple },
    uFoamWidth: { value: foamWidth },
  };
  material.userData.water = local;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, waterUniforms, local);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vWaterWorld;\nvarying vec2 vWaterLocal;",
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vWaterLocal = position.xy;
        vWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vWaterWorld;
        varying vec2 vWaterLocal;
        uniform float uTime;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uSkyZenith;
        uniform vec3 uSkyHorizon;
        uniform vec3 uShallow;
        uniform vec3 uFoam;
        uniform vec2 uHalf;
        uniform float uRadius;
        uniform vec2 uFlow;
        uniform float uRipple;
        uniform float uFoamWidth;
        float waterEdge() {
          vec2 q = abs(vWaterLocal) - (uHalf - vec2(uRadius));
          return -(length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius);
        }
        vec3 rippleNormal(vec2 p) {
          vec2 f = uFlow * uTime;
          float a = sin(p.x * 1.9 + p.y * 0.6 - f.x * 2.6) * 0.5;
          float b = sin(p.y * 2.7 - p.x * 1.1 + f.y * 3.1) * 0.35;
          float c = sin((p.x + p.y) * 5.3 - uTime * 2.2) * 0.15;
          float d = cos(p.x * 4.1 - p.y * 3.3 + uTime * 1.7) * 0.12;
          return normalize(vec3((a + c) * 0.11, 1.0, (b + d) * 0.11) * vec3(uRipple, 1.0, uRipple) + vec3(0.0, 0.0, 0.0));
        }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float waterDepth = smoothstep(0.0, 1.9, waterEdge());
        diffuseColor.rgb = mix(uShallow, diffuseColor.rgb, 0.35 + 0.65 * waterDepth);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        vec3 waterN = rippleNormal(vWaterWorld.xz);
        normal = normalize((viewMatrix * vec4(waterN, 0.0)).xyz);`,
      )
      .replace(
        "#include <opaque_fragment>",
        `vec3 viewDir = normalize(cameraPosition - vWaterWorld);
        float fresnel = pow(1.0 - clamp(dot(viewDir, waterN), 0.0, 1.0), 4.0);
        vec3 sky = mix(uSkyHorizon, uSkyZenith, clamp(reflect(-viewDir, waterN).y, 0.0, 1.0));
        outgoingLight = mix(outgoingLight, sky, 0.12 + 0.6 * fresnel);
        vec3 halfV = normalize(normalize(uSunDir) + viewDir);
        float glint = pow(max(dot(waterN, halfV), 0.0), 220.0);
        outgoingLight += uSunColor * glint * 3.2;
        float edge = waterEdge();
        float foamBand = 1.0 - smoothstep(0.05, uFoamWidth, edge);
        float foamNoise = 0.55 + 0.45 * sin(vWaterWorld.x * 7.0 + vWaterWorld.z * 5.0 + uTime * 1.6);
        outgoingLight = mix(outgoingLight, uFoam, foamBand * foamNoise * 0.55);
        diffuseColor.a = clamp(mix(diffuseColor.a, 1.0, fresnel * 0.5 + foamBand * 0.4), 0.0, 1.0);
        #include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => "stylised-water";
  return material;
}
