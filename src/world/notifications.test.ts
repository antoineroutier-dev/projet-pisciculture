import { expect, it } from "vitest";
import { initialGame } from "../game";
import { criticalNotices, lifeNotice } from "./notifications";
it("garde les alertes critiques sans échéance, trois cartes maximum et un accès aux alertes restantes", () => {
  const g = initialGame();
  for (const p of g.ponds) {
    p.built = true;
    p.count = 100;
    p.species = "trout";
    p.oxygen = 1;
  }
  const before = JSON.stringify(g),
    notices = criticalNotices(g);
  expect(notices).toHaveLength(3);
  expect(notices.every((n) => n.kind === "critical" && !n.until)).toBe(true);
  expect(notices[2].text).toContain("2 autres");
  expect(JSON.stringify(g)).toBe(before);
  const notice = lifeNotice(
    { kind: "truck", id: 9, cargo: "feed", amount: 25 },
    100,
  );
  expect(notice?.until).toBe(16100);
  expect(notice?.target).toMatchObject({ id: 9, cargo: "feed" });
  expect(lifeNotice({ kind: "feed", pondId: 1, amount: 2 }, 100)).toBeNull();
});
