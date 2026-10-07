import { expect, it } from "vitest";
import { createSwimmer, stepSchool, swimRotation } from "./swimming";
import type { SpeciesId } from "./game";

it.each(["trout", "carp", "tilapia"] as SpeciesId[])(
  "%s nage sans téléportation ni sortie du bassin pendant cinq minutes",
  (species) => {
    const bounds = { halfWidth: 4.8, halfDepth: 1.75 };
    const school = Array.from({ length: 8 }, (_, i) =>
      createSwimmer(i, species, bounds),
    );
    const initial = structuredClone(school);
    let totalDistance = 0,
      maxTurn = 0,
      minSpeed = Infinity,
      maxSpeed = 0,
      maxX = 0,
      maxZ = 0,
      maxDisplacement = 0,
      minHeadingAgreement = 1;
    for (let i = 0; i < 9000; i++) {
      const old = school.map((s) => ({ ...s }));
      stepSchool(school, 1 / 30, bounds);
      for (const [j, s] of school.entries()) {
        maxX = Math.max(maxX, Math.abs(s.x));
        maxZ = Math.max(maxZ, Math.abs(s.z));
        const displacement = Math.hypot(s.x - old[j].x, s.z - old[j].z);
        maxDisplacement = Math.max(maxDisplacement, displacement);
        const turn = Math.abs(
          Math.atan2(
            Math.sin(s.heading - old[j].heading),
            Math.cos(s.heading - old[j].heading),
          ),
        );
        maxTurn = Math.max(maxTurn, turn);
        totalDistance += displacement;
        if (j === 0) {
          minSpeed = Math.min(minSpeed, s.speed);
          maxSpeed = Math.max(maxSpeed, s.speed);
        }
        if (displacement > 0.0001) {
          const y = swimRotation(s.heading);
          // Local −X transformed by rotation around Y must face the actual travel direction.
          const dot =
            -Math.cos(y) * (s.x - old[j].x) + Math.sin(y) * (s.z - old[j].z);
          minHeadingAgreement = Math.min(
            minHeadingAgreement,
            dot / displacement,
          );
        }
      }
    }
    expect(maxX).toBeLessThanOrEqual(bounds.halfWidth);
    expect(maxZ).toBeLessThanOrEqual(bounds.halfDepth);
    expect(maxDisplacement).toBeLessThan(0.04);
    expect(minHeadingAgreement).toBeGreaterThan(0.99);
    expect(maxTurn).toBeLessThan(0.05);
    expect(totalDistance).toBeGreaterThan(100);
    expect(school.map((s) => s.phase)).not.toEqual(initial.map((s) => s.phase));
    expect(maxSpeed - minSpeed).toBeGreaterThan(0.05);
    expect(new Set(school.map((s) => s.phase.toFixed(3))).size).toBe(8);
  },
);

it("plafonne le rattrapage après un onglet masqué, et reste immobile quand le mouvement est réduit", () => {
  const bounds = { halfWidth: 4.8, halfDepth: 1.75 };
  const school = [createSwimmer(0, "trout", bounds)];
  const old = school.map((s) => ({ ...s }));
  stepSchool(school, 0, bounds);
  expect(school).toEqual(old);
  stepSchool(school, 120, bounds);
  expect(
    Math.hypot(school[0].x - old[0].x, school[0].z - old[0].z),
  ).toBeLessThan(0.1);
});
