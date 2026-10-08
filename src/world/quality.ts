import { t } from "../i18n";
export type Quality = "low" | "medium" | "high" | "ultra";
export type Graphics = {
  version: 1;
  quality: Quality | "auto";
  labels: boolean;
};
export const GRAPHICS_KEY = "les-etangs-graphics-v1";
export const QUALITY = {
  low: {
    get label() {
      return t("m_5bd34386f0");
    },
    ratio: 0.75,
    shadow: 0,
    trees: 46,
    forest: 170,
    grass: 1600,
    flowers: 260,
    rain: 60,
    post: "none",
    fps: 30,
  },
  medium: {
    get label() {
      return t("m_28eca2c0e2");
    },
    ratio: 1,
    shadow: 1024,
    trees: 70,
    forest: 280,
    grass: 3800,
    flowers: 700,
    rain: 120,
    post: "grade",
    fps: 60,
  },
  high: {
    get label() {
      return t("m_fee2b9ad30");
    },
    ratio: 1.5,
    shadow: 2048,
    trees: 90,
    forest: 380,
    grass: 6800,
    flowers: 1200,
    rain: 180,
    post: "fxaa-grade",
    fps: 60,
  },
  ultra: {
    get label() {
      return t("m_ac364e1afd");
    },
    ratio: 2,
    shadow: 4096,
    trees: 90,
    forest: 420,
    grass: 9000,
    flowers: 1600,
    rain: 240,
    post: "cinematic",
    fps: 60,
  },
} as const;
export function parseGraphics(raw: string | null): Graphics {
  try {
    const v = JSON.parse(raw || "{}");
    return {
      version: 1,
      quality: v && Object.hasOwn(QUALITY, v.quality) ? v.quality : "auto",
      labels: v?.labels !== false,
    };
  } catch {
    return { version: 1, quality: "auto", labels: true };
  }
}
/** Conservative initial choice; the player can always override it. */
export function detectQuality({
  renderer,
  threads,
  width,
  maxTextureSize,
}: {
  renderer: string;
  threads: number;
  width: number;
  maxTextureSize: number;
}): Quality {
  if (
    /swiftshader|llvmpipe|software/i.test(renderer) ||
    threads < 4 ||
    maxTextureSize < 4096
  )
    return "low";
  if (width < 900 || threads < 8) return "medium";
  return "high";
}
