export type CameraCommand =
  | { kind: "rotate"; amount: number }
  | { kind: "zoom"; amount: number }
  | { kind: "pan"; x: number; z: number };
const listeners = new Set<(c: CameraCommand) => void>();
export function moveCamera(c: CameraCommand) {
  const sensitivity =
    typeof document === "undefined"
      ? 1
      : Number(document.documentElement.dataset.cameraSensitivity) || 1;
  const adjusted: CameraCommand =
    c.kind === "pan"
      ? { ...c, x: c.x * sensitivity, z: c.z * sensitivity }
      : { ...c, amount: c.amount * sensitivity };
  for (const fn of listeners) fn(adjusted);
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent("etangs-camera-command", { detail: adjusted }),
    );
}
export function subscribeCamera(fn: (c: CameraCommand) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
