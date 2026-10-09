import * as T from "three";
import { paint } from "./palette";
import { seeded } from "./terrain";

/** Painted cumulus: crisp rounded puffs, a shaded underside and a flat base. */
function cloudTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!,
    r = seeded(77);
  const puff = (x: number, y: number, radius: number, color: string) => {
    const g = ctx.createRadialGradient(x, y - radius * 0.25, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(0.82, color);
    g.addColorStop(1, `${color}00`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };
  // Shadowed lower mass first, sunlit crowns on top.
  for (let i = 0; i < 10; i++)
    puff(110 + r() * 290, 168 + r() * 18, 44 + r() * 26, paint("cloud-shadow"));
  for (let i = 0; i < 12; i++)
    puff(120 + r() * 270, 132 + r() * 26, 40 + r() * 34, paint("cloud"));
  for (let i = 0; i < 5; i++)
    puff(170 + r() * 170, 104 + r() * 20, 36 + r() * 22, paint("cloud"));
  // Flat, softly fading base.
  ctx.globalCompositeOperation = "destination-out";
  const base = ctx.createLinearGradient(0, 186, 0, 214);
  base.addColorStop(0, `${paint("cloud")}00`);
  base.addColorStop(1, paint("cloud"));
  ctx.fillStyle = base;
  ctx.fillRect(0, 186, 512, 70);
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
    // Fog softens distant clouds into the haze and shares the smoke's sprite program.
    cloudMaterial = new T.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
  const r = seeded(5),
    clouds: T.Sprite[] = [];
  for (let i = 0; i < 18; i++) {
    const sprite = new T.Sprite(cloudMaterial);
    // Golden-angle spacing keeps any visible subset spread around the horizon.
    const angle = i * 2.39996 + r() * 0.3,
      radius = 140 + r() * 50;
    sprite.position.set(
      Math.cos(angle) * radius,
      12 + r() * 20,
      Math.sin(angle) * radius,
    );
    sprite.scale.set(60 + r() * 45, 24 + r() * 14, 1);
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
      // The dome and clouds travel with the camera, so they always sit on the far horizon.
      root.position.copy(camera.position);
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
      // Every sprite (clouds, chimney smoke) shares Three's quad; free its GPU buffers too.
      clouds[0]?.geometry.dispose();
      dome.geometry.dispose();
      (dome.material as T.Material).dispose();
      cloudMaterial.dispose();
      texture.dispose();
    },
  };
}
