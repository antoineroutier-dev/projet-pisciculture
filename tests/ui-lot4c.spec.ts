import { enterGame } from "./ui-helpers";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { PerspectiveCamera, Vector3 } from "three";
import { parseSave, act, nextDay, STORAGE_KEY } from "../src/game";
import { SAVE_KEY } from "../src/state/saves";
import { QUALITY } from "../src/world/quality";
import { settleEvents } from "./ui-helpers";
test("4c : étiquettes sans recouvrement, sélection du monde et rotation au clavier", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  await page.addInitScript(
    (raw) => localStorage.setItem("les-etangs-save-v3", raw),
    readFileSync("docs/ui/fixtures/expedition.json", "utf8"),
  );
  await page.goto("/");
  await enterGame(page);
  const canvas = page.locator('canvas[data-engine="three-webgl"]');
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  const records = [];
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1280, 800],
    [1024, 768],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(canvas).toHaveAttribute(
      "data-viewport",
      `${width}x${height}`,
      { timeout: 60000 },
    );
    await expect(canvas).toHaveAttribute("data-settled", "true", {
      timeout: 60000,
    });
    const record = await page.evaluate(() => {
      const nodes = [
        ...document.querySelectorAll<HTMLElement>(
          ".game-hud,.goal-hud,.game-dock,.world-controls,.management-panel,.notification-stack,.world-label",
        ),
      ].filter(
        (e) =>
          e.getBoundingClientRect().width &&
          getComputedStyle(e).visibility !== "hidden" &&
          getComputedStyle(e).display !== "none",
      );
      const boxes = nodes.map((e) => ({
        name: e.className,
        ...e.getBoundingClientRect().toJSON(),
      }));
      const overlaps = [];
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i],
            b = boxes[j];
          if (
            a.left < b.right &&
            a.right > b.left &&
            a.top < b.bottom &&
            a.bottom > b.top
          )
            overlaps.push([a.name, b.name]);
        }
      return {
        width: innerWidth,
        height: innerHeight,
        overlaps,
        free:
          1 -
          boxes.reduce((a, b) => a + b.width * b.height, 0) /
            (innerWidth * innerHeight),
        labels: document.querySelectorAll('.world-label[aria-hidden="false"]')
          .length,
        min: Math.min(
          ...nodes
            .flatMap((e) => [e, ...e.querySelectorAll<HTMLElement>("*")])
            .map((e) => parseFloat(getComputedStyle(e).fontSize)),
        ),
      };
    });
    expect(record.overlaps).toEqual([]);
    expect(record.min).toBeGreaterThanOrEqual(12);
    if (width >= 1280) expect(record.free).toBeGreaterThanOrEqual(0.7);
    records.push(record);
  }
  await page.locator('.world-label[aria-hidden="false"]').first().click();
  await expect(page.locator(".management-panel")).toBeVisible();
  await expect(canvas).toHaveAttribute("data-settled", "true");
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(() => {
      const active = document.activeElement;
      return (
        active instanceof HTMLElement &&
        active !== document.body &&
        !active.closest('[inert],[aria-hidden="true"]') &&
        getComputedStyle(active).visibility !== "hidden" &&
        active.getClientRects().length > 0
      );
    }),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(canvas).toHaveAttribute("data-viewport", "1440x900");
  await expect(canvas).toHaveAttribute("data-settled", "true");
  const label = page.locator('.world-label[aria-hidden="false"]').first();
  await expect(label).toBeVisible();
  const id = await label.getAttribute("data-world-pond");
  await label.click();
  await expect(canvas).toHaveAttribute("data-selection", `pond:${id}`);
  await expect(page.locator(".management-panel")).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByLabel("Vue du terrain", { exact: true })
    .selectOption("buildings");
  await expect(canvas).toHaveAttribute("data-view", "buildings");
  await expect(canvas).toHaveAttribute("data-settled", "true");
  const values = (await canvas.getAttribute("data-camera"))!
      .split(",")
      .map(Number),
    camera = new PerspectiveCamera(40, 1440 / 900, 0.08, 400);
  camera.position.fromArray(values);
  camera.lookAt(new Vector3().fromArray(values, 3));
  camera.updateMatrixWorld();
  const v = new Vector3(9, 3, -16).project(camera),
    point = { x: (v.x + 1) * 720, y: (1 - v.y) * 450 };
  await page.mouse.move(point.x, point.y);
  await expect(canvas).toHaveAttribute("data-hover", "asset:warehouse");
  await page.mouse.click(point.x, point.y);
  await expect(
    page.getByRole("region", { name: "Élément sélectionné" }),
  ).toContainText("Magasin");
  await expect(canvas).toHaveAttribute("data-selection", "asset:warehouse");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Mettre en pause", exact: true })
    .focus();
  const before = await canvas.getAttribute("data-camera");
  await page.keyboard.press("e");
  await expect.poll(() => canvas.getAttribute("data-camera")).not.toBe(before);
  await page.keyboard.press("r");
  await expect(canvas).toHaveAttribute("data-settled", "true");
  await info.attach("world-label-measures", {
    body: JSON.stringify(records),
    contentType: "application/json",
  });
});
test("4c : quatre qualités persistantes sans reconstruire le terrain, étiquettes masquables", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(
    (raw) => localStorage.setItem("les-etangs-save-v3", raw),
    readFileSync("docs/ui/fixtures/elevage.json", "utf8"),
  );
  await page.goto("/");
  await enterGame(page);
  const canvas = page.locator('canvas[data-engine="three-webgl"]');
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  const uuid = await canvas.getAttribute("data-farm-id"),
    save = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
    records = [];
  await expect(canvas).toHaveAttribute("data-automatic-quality", "low");
  await page
    .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
    .click();
  await page.getByRole("tab", { name: "Affichage", exact: true }).click();
  for (const quality of [
    "low",
    "medium",
    "high",
    "ultra",
    "low",
    "high",
    "ultra",
    "low",
  ] as const) {
    await page
      .getByLabel("Qualité graphique", { exact: true })
      .selectOption(quality);
    await expect(canvas).toHaveAttribute("data-quality", quality);
    await expect(canvas).toHaveAttribute("data-settled", "true", {
      timeout: 60000,
    });
    await expect(canvas).toHaveAttribute("data-farm-id", uuid!);
    const actual = await canvas.evaluate((c) => ({
      width: (c as HTMLCanvasElement).width,
      resources: JSON.parse(c.dataset.resources!),
      quality: c.dataset.quality,
    }));
    expect(actual.width).toBe(Math.floor(1280 * QUALITY[quality].ratio));
    records.push(actual);
  }
  // The first shadow pass uploads scene geometry outside the camera frustum.
  // After that warm-up, another complete post-processing cycle must release its resources.
  const low = records.filter((r) => r.quality === "low");
  expect(low.at(-1)!.resources).toEqual(low[1].resources);
  expect(low.at(-1)!.resources.textures).toBe(low[0].resources.textures);
  const labels = page.getByRole("switch", {
    name: "Étiquettes dans le monde",
    exact: true,
  });
  await labels.click();
  await expect(labels).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("Escape");
  await expect(page.locator('.world-label[aria-hidden="false"]')).toHaveCount(
    0,
  );
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      SAVE_KEY,
    ),
  ).toMatchObject({
    game: JSON.parse(save!).game,
    ledger: JSON.parse(save!).ledger,
  });
  await expect(canvas).toHaveCount(1);
  await info.attach("quality-resources", {
    body: JSON.stringify(records),
    contentType: "application/json",
  });
});
test("4c : notification de livraison reliée au véhicule et à son panneau réel", async ({
  page,
}) => {
  test.setTimeout(150000);
  const seed = parseSave(
      readFileSync("docs/ui/fixtures/elevage.json", "utf8"),
    )!,
    ordered = act(seed, { type: "food", pack: 0 });
  expect(ordered.ok).toBe(true);
  const before = nextDay(ordered.game),
    after = nextDay(before);
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
    key: STORAGE_KEY,
    raw: JSON.stringify(before),
  });
  await page.goto("/");
  await enterGame(page);
  const canvas = page.locator('canvas[data-engine="three-webgl"]');
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  await page.getByRole("button", { name: "Jour suivant", exact: true }).click();
  await settleEvents(page);
  await expect(
    page.locator(".notification-target").filter({ hasText: "Aliments reçus" }),
  ).toBeVisible();
  expect(
    await page.locator(".notification-stack li").count(),
  ).toBeLessThanOrEqual(3);
  await page
    .locator(".notification-target")
    .filter({ hasText: "Aliments reçus" })
    .click();
  await expect(
    page.getByRole("region", { name: "Élément sélectionné" }),
  ).toContainText("25 kg reçus");
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    ),
  ).toEqual(after);
});

test("4c : perte du contexte, libération et reprise de la 3D sans perdre la partie", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.addInitScript(() => {
    const records: unknown[] = [];
    (window as unknown as { renderDisposals: unknown[] }).renderDisposals =
      records;
    window.addEventListener("etangs-render-disposed", (e) =>
      records.push((e as CustomEvent).detail),
    );
  });
  await page.goto("/");
  await enterGame(page);
  const canvas = page.locator('canvas[data-engine="three-webgl"]');
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  const save = await page.evaluate(
    (key) => localStorage.getItem(key),
    SAVE_KEY,
  );
  await page.evaluate(() => {
    (window as any).renderDisposals.length = 0;
  });
  for (let i = 0; i < 3; i++) {
    await canvas.evaluate((c) => {
      const gl = (c as HTMLCanvasElement).getContext("webgl2")!,
        extension = gl.getExtension("WEBGL_lose_context");
      if (!extension) throw Error("Missing context-loss extension");
      extension.loseContext();
    });
    await expect(canvas).toHaveCount(0);
    await expect(
      page.getByText("Carte de secours · la 3D est indisponible.", {
        exact: false,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Réessayer la 3D", exact: true })
      .click();
    await expect(canvas).toHaveAttribute("data-settled", "true", {
      timeout: 60000,
    });
    await expect(
      page.getByLabel("Vue du terrain", { exact: true }),
    ).toBeFocused();
  }
  const disposals = await page.evaluate(
    () =>
      (
        window as unknown as {
          renderDisposals: {
            contextLost: boolean;
            memory: { geometries: number; textures: number };
          }[];
        }
      ).renderDisposals,
  );
  expect(disposals).toHaveLength(3);
  expect(disposals.every((r) => r.contextLost)).toBe(true);
  expect(disposals).toEqual(
    Array.from({ length: 3 }, () => ({
      contextLost: true,
      memory: { geometries: 0, textures: 0 },
    })),
  );
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      SAVE_KEY,
    ),
  ).toMatchObject({
    game: JSON.parse(save!).game,
    ledger: JSON.parse(save!).ledger,
  });
  await expect(canvas).toHaveCount(1);
  await info.attach("renderer-disposals", {
    body: JSON.stringify(disposals),
    contentType: "application/json",
  });
});
