/** Capture immediately after a real render; preserveDrawingBuffer stays off. */
let capture: (() => Promise<string | null>) | null = null;
export const captureWorld = () => (capture ? capture() : Promise.resolve(null));
export function registerSceneSnapshots(invalidate: () => void) {
  const pending = new Map<
    (image: string | null) => void,
    ReturnType<typeof setTimeout>
  >();
  const request = () =>
    new Promise<string | null>((resolve) => {
      pending.set(
        resolve,
        setTimeout(() => {
          pending.delete(resolve);
          resolve(null);
        }, 30000),
      );
      invalidate();
    });
  capture = request;
  const finish = (value: string | null) => {
    for (const [resolve, timer] of pending) {
      clearTimeout(timer);
      resolve(value);
    }
    pending.clear();
  };
  return {
    afterRender(canvas: HTMLCanvasElement) {
      if (!pending.size) return;
      try {
        const scale = Math.min(320 / canvas.width, 180 / canvas.height);
        const thumb = document.createElement("canvas");
        thumb.width = Math.max(1, Math.round(canvas.width * scale));
        thumb.height = Math.max(1, Math.round(canvas.height * scale));
        const context = thumb.getContext("2d");
        if (!context) {
          finish(null);
          return;
        }
        context.drawImage(canvas, 0, 0, thumb.width, thumb.height);
        const data = thumb.toDataURL("image/webp", 0.55);
        finish(data.length <= 180_000 ? data : null);
      } catch {
        finish(null);
      }
    },
    dispose() {
      if (capture === request) capture = null;
      finish(null);
    },
  };
}
