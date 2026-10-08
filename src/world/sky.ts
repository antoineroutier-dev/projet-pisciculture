import * as T from "three";
import { paint } from "./palette";
import { seeded } from "./terrain";

/** Painted cumulus: overlapping soft puffs with a cooler underside. */
function cloudTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!,
    r = seeded(77);
  const puff = (x: number, y: number, radius: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(0.55, `${color}cc`);
    g.addColorStop(1, `${color}00`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };
  for (let i = 0; i < 9; i++)
    puff(50 + r() * 156, 74 + r() * 16, 26 + r() * 18, paint("cloud-shadow"));
  for (let i = 0; i < 14; i++)
    puff(56 + r() * 144, 52 + r() * 26, 22 + r() * 22, paint("cloud"));
  const texture = new T.CanvasTexture(c);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

export type SkyState = {
  sun: T.Vector3;
  zenith: T.Color;
  horizon: T.Color;
  sunColor: T.Color;
  cloudTint: T.Color;
  cloudOpacity: number;
  clouds: number;
  drift: number;
};

export function createSky(scene: T.Scene) {
  const root = new T.Group();
  root.name = "sky";
  const uniforms = {
    zenith: { value: new T.Color() },
    horizon: { value: new T.Color() },
    ground: { value: new T.Color() },
    sunColor: { value: new T.Color() },
    sunDir: { value: new T.Vector3(0, 1, 0) },
  };
  const dome = new T.Mesh(
    new T.SphereGeometry(300, 32, 16),
    new T.ShaderMaterial({
      uniforms,
      side: T.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = vec4(p.xy, p.w * 0.9999, p.w);
        }`,
      fragmentShader: `
        uniform vec3 zenith;
        uniform vec3 horizon;
        uniform vec3 ground;
        uniform vec3 sunColor;
        uniform vec3 sunDir;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(horizon, zenith, pow(clamp(h, 0.0, 1.0), 0.3));
          col = mix(col, ground, smoothstep(0.0, -0.3, h));
          float s = max(dot(d, normalize(sunDir)), 0.0);
          float above = smoothstep(-0.03, 0.04, h);
          col += sunColor * (pow(s, 10.0) * 0.32 + pow(s, 80.0) * 0.5) * above;
          col = mix(col, sunColor * 2.6, smoothstep(0.9975, 0.999, s) * above);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  dome.name = "sky-dome";
  dome.renderOrder = -1000;
  dome.frustumCulled = false;
  root.add(dome);
  const texture = cloudTexture(),
    cloudMaterial = new T.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
  const r = seeded(5),
    clouds: T.Sprite[] = [];
  for (let i = 0; i < 14; i++) {
    const sprite = new T.Sprite(cloudMaterial);
    // Golden-angle spacing keeps any visible subset spread around the horizon.
    const angle = i * 2.39996 + r() * 0.3,
      radius = 150 + r() * 70;
    sprite.position.set(
      Math.cos(angle) * radius,
      26 + r() * 30,
      Math.sin(angle) * radius,
    );
    sprite.scale.set(70 + r() * 50, 30 + r() * 16, 1);
    sprite.renderOrder = -999;
    sprite.userData.angle = angle;
    sprite.userData.radius = radius;
    clouds.push(sprite);
    root.add(sprite);
  }
  scene.add(root);
  return {
    root,
    update(state: SkyState, camera: T.Camera) {
      root.position.set(camera.position.x, 0, camera.position.z);
      uniforms.zenith.value.copy(state.zenith);
      uniforms.horizon.value.copy(state.horizon);
      uniforms.ground.value.copy(state.horizon).multiplyScalar(0.92);
      uniforms.sunColor.value.copy(state.sunColor);
      uniforms.sunDir.value.copy(state.sun);
      cloudMaterial.color.copy(state.cloudTint);
      cloudMaterial.opacity = state.cloudOpacity;
      clouds.forEach((cloud, i) => {
        cloud.visible = i < state.clouds;
        const angle = cloud.userData.angle + state.drift;
        cloud.position.x = Math.cos(angle) * cloud.userData.radius;
        cloud.position.z = Math.sin(angle) * cloud.userData.radius;
      });
    },
    dispose() {
      scene.remove(root);
      dome.geometry.dispose();
      (dome.material as T.Material).dispose();
      cloudMaterial.dispose();
      texture.dispose();
    },
  };
}
