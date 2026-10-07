export type Quality = "low" | "medium" | "high" | "ultra";
export type Graphics = {
  version: 1;
  quality: Quality | "auto";
  labels: boolean;
};
export const GRAPHICS_KEY = "les-etangs-graphics-v1";
export const QUALITY = {
  low: {
    label: "Bas",
    ratio: 0.75,
    shadow: 0,
    trees: 16,
    grass: 360,
    rain: 60,
    post: "none",
    fps: 30,
  },
  medium: {
    label: "Moyen",
    ratio: 1,
    shadow: 512,
    trees: 28,
    grass: 900,
    rain: 120,
    post: "none",
    fps: 60,
  },
  high: {
    label: "Élevé",
    ratio: 1.5,
    shadow: 1024,
    trees: 44,
    grass: 1400,
    rain: 180,
    post: "fxaa",
    fps: 60,
  },
  ultra: {
    label: "Ultra",
    ratio: 2,
    shadow: 2048,
    trees: 56,
    grass: 1800,
    rain: 240,
    post: "fxaa-grade",
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
