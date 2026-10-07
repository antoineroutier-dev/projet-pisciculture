/** Independent steering in metres/seconds. Presentation only: never alters farm biology. */
import type { SpeciesId } from "./game";
export interface Swimmer {
  x: number;
  z: number;
  y: number;
  heading: number;
  speed: number;
  phase: number;
  age: number;
  wander: number;
  seed: number;
  turn: number;
  effort: number;
  species: SpeciesId;
}
export interface SwimBounds {
  halfWidth: number;
  halfDepth: number;
}
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const wrapped = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
function random(s: Swimmer) {
  s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
export function createSwimmer(
  index: number,
  species: SpeciesId,
  bounds: SwimBounds,
): Swimmer {
  const s: Swimmer = {
    x: 0,
    z: 0,
    y: 0.42,
    heading: 0,
    speed: 0.2,
    phase: 0,
    age: 0,
    wander: 0,
    seed: (index + 1) * 7919,
    turn: 0,
    effort: 0.5,
    species,
  };
  s.x = (random(s) * 2 - 1) * bounds.halfWidth * 0.7;
  s.z = (random(s) * 2 - 1) * bounds.halfDepth * 0.7;
  s.heading = random(s) * Math.PI * 2;
  s.phase = random(s) * Math.PI * 2;
  s.age = random(s) * 50;
  return s;
}
export function swimRotation(heading: number) {
  return Math.PI - heading;
} // The model's snout points toward local −X.
export function stepSchool(
  school: Swimmer[],
  elapsed: number,
  bounds: SwimBounds,
  health = 1,
) {
  if (!(elapsed > 0) || !Number.isFinite(elapsed)) return;
  // Capping elapsed prevents a hidden tab or expensive frame from jumping the fish forward.
  const steps = Math.ceil(Math.min(0.1, elapsed) / 0.025),
    dt = Math.min(0.1, elapsed) / steps;
  for (let k = 0; k < steps; k++) {
    const previous = school.map((s) => ({
      x: s.x,
      z: s.z,
      heading: s.heading,
      speed: s.speed,
    }));
    for (const [i, s] of school.entries()) {
      s.age += dt;
      s.wander +=
        -s.wander * 0.7 * dt + (random(s) - 0.5) * Math.sqrt(dt) * 0.85;
      const base =
        s.species === "trout" ? 0.54 : s.species === "carp" ? 0.25 : 0.38;
      const burst = Math.max(0, Math.sin(s.age * 0.67 + i * 1.7)) ** 3;
      let wantedSpeed =
        base * (0.48 + 0.85 * burst) * (0.45 + 0.55 * clamp(health, 0, 1));
      let fx = Math.cos(s.heading + s.wander * 0.8),
        fz = Math.sin(s.heading + s.wander * 0.8);
      // Anticipate the wall before the head reaches it, rather than bouncing on contact.
      const look = 1.5 + s.speed * 1.8;
      const px = s.x + Math.cos(s.heading) * look,
        pz = s.z + Math.sin(s.heading) * look;
      const wallX = Math.max(0, Math.abs(px) - (bounds.halfWidth - 0.7));
      const wallZ = Math.max(0, Math.abs(pz) - (bounds.halfDepth - 0.6));
      fx -= Math.sign(px) * wallX * 3.4;
      fz -= Math.sign(pz) * wallZ * 3.4;
      let near = 0,
        cx = 0,
        cz = 0,
        ax = 0,
        az = 0;
      for (const [j, other] of previous.entries()) {
        if (i === j) continue;
        const dx = s.x - other.x,
          dz = s.z - other.z,
          distance = Math.hypot(dx, dz);
        if (distance < 1.1 && distance > 0.001) {
          const repel = ((1.1 - distance) * 2.3) / distance;
          fx += dx * repel;
          fz += dz * repel;
        }
        if (distance < 3.3) {
          near++;
          cx += other.x;
          cz += other.z;
          ax += Math.cos(other.heading);
          az += Math.sin(other.heading);
        }
      }
      if (near) {
        const social = s.species === "carp" ? 0.035 : 0.075;
        fx += (cx / near - s.x) * social + (ax / near) * 0.12;
        fz += (cz / near - s.z) * social + (az / near) * 0.12;
      }
      // A weak current preference for trout, without assigning a circular track.
      if (s.species === "trout") fx -= 0.1;
      const error = wrapped(Math.atan2(fz, fx) - s.heading);
      const maxTurn = s.species === "carp" ? 0.95 : 1.35;
      const desiredTurn = clamp(error * 1.5, -maxTurn, maxTurn);
      s.turn += (desiredTurn - s.turn) * (1 - Math.exp(-dt * 3.5));
      s.heading = wrapped(s.heading + s.turn * dt);
      wantedSpeed *= 1 - Math.min(0.65, Math.abs(error) * 0.23);
      s.speed += (wantedSpeed - s.speed) * (1 - Math.exp(-dt * 1.1));
      const vx = Math.cos(s.heading),
        vz = Math.sin(s.heading);
      // Brake before the outer safety envelope. Coordinates never get reflected or respawned.
      const gapX = bounds.halfWidth - Math.abs(s.x),
        gapZ = bounds.halfDepth - Math.abs(s.z);
      const braking = Math.min(
        1,
        vx * s.x > 0 ? Math.max(0, gapX / 0.4) : 1,
        vz * s.z > 0 ? Math.max(0, gapZ / 0.4) : 1,
      );
      s.x = clamp(
        s.x + vx * s.speed * braking * dt,
        -bounds.halfWidth,
        bounds.halfWidth,
      );
      s.z = clamp(
        s.z + vz * s.speed * braking * dt,
        -bounds.halfDepth,
        bounds.halfDepth,
      );
      s.effort = clamp((s.speed / base) * (0.7 + burst * 0.3), 0.08, 1.4);
      s.phase += dt * (2.5 + s.effort * 5.5);
      const targetDepth =
        (s.species === "carp" ? 0.375 : 0.435) +
        Math.sin(s.age * 0.28 + i * 2.1) * 0.035;
      s.y += (targetDepth - s.y) * (1 - Math.exp(-dt * 0.65));
    }
  }
}
