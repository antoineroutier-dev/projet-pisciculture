export type CameraCommand =
  | { kind: "rotate"; amount: number }
  | { kind: "zoom"; amount: number }
  | { kind: "pan"; x: number; z: number };
const listeners = new Set<(c: CameraCommand) => void>();
export function moveCamera(c: CameraCommand) {
  for (const fn of listeners) fn(c);
}
export function subscribeCamera(fn: (c: CameraCommand) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
