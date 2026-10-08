import { enterGame } from "./ui-helpers";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { STORAGE_KEY, nextDay, parseSave } from "../src/game";
import { SAVE_KEY } from "../src/state/saves";
import { settleEvents } from "./ui-helpers";
import {PerspectiveCamera,Vector3} from "three";
import {POND_POSITIONS} from "../src/farm3d";
test("4a : travaux incrémentaux, bâtiments réels et scène persistante", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const start = parseSave(
    readFileSync("docs/ui/fixtures/chantier.json", "utf8"),
  )!;
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
    key: STORAGE_KEY,
    raw: JSON.stringify(start),
  });
  await page.goto("/");
  await enterGame(page);
  const canvas = page.locator('canvas[data-engine="three-webgl"]');
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  const original = await canvas.getAttribute("data-farm-id");
  const ponds = JSON.parse((await canvas.getAttribute("data-pond-groups"))!);
  const assets = JSON.parse((await canvas.getAttribute("data-asset-groups"))!);
  expect(assets.find((a: { id: string }) => a.id === "coldstore").objects).toBe(
    0,
  );
  expect(assets.find((a: { id: string }) => a.id === "workshop").objects).toBe(
    0,
  );
  let game = start;
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: "Jour suivant", exact: true })
      .click();
    await settleEvents(page);
    game = nextDay(game);
    await expect(canvas).toHaveAttribute("data-day", String(game.day), {
      timeout: 60000,
    });
  }
  const after = JSON.parse((await canvas.getAttribute("data-pond-groups"))!);
  expect(after.map((p: { uuid: string }) => p.uuid)).toEqual(
    ponds.map((p: { uuid: string }) => p.uuid),
  );
  expect(after[0].progress).toBeCloseTo(
    1 - game.ponds[0].constructionDays / 14,
  );
  expect(after[0].progress).toBeGreaterThan(ponds[0].progress);
  const finished = JSON.parse(
    (await canvas.getAttribute("data-asset-groups"))!,
  );
  expect(
    finished.find((a: { id: string }) => a.id === "warehouse").uuid,
  ).not.toBe(assets.find((a: { id: string }) => a.id === "warehouse").uuid);
  expect(
    finished.find((a: { id: string }) => a.id === "warehouse").progress,
  ).toBe(1);
  expect(finished.find((a: { id: string }) => a.id === "coldstore").uuid).toBe(
    assets.find((a: { id: string }) => a.id === "coldstore").uuid,
  );
  await expect(canvas).toHaveAttribute("data-farm-id", original!);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    ),
  ).toEqual(game);
  await page.getByRole("button", { name: "Logistique", exact: true }).click();
  await page.getByRole("tab", { name: "Clients", exact: true }).click();
  await page.getByText("Prix et espèces", { exact: true }).click();
  for (const species of ["trout", "carp", "tilapia"]) {
    const image = page.locator(
      `.market-species-card img[data-species="${species}"]`,
    );
    await expect(image).toBeVisible();
    expect(
      await image.evaluate((e) => (e as HTMLImageElement).naturalWidth),
    ).toBe(640);
  }
  await page.keyboard.press("Escape");
  await page.setViewportSize({width:390,height:844});
  await page.getByRole("radio",{name:"Le bassin",exact:true}).click();
  await expect(canvas).toHaveAttribute("data-view","pond",{timeout:60000});
  await expect(canvas).toHaveAttribute("data-settled","true",{timeout:60000});
  const values=(await canvas.getAttribute("data-camera"))!.split(",").map(Number);
  const camera=new PerspectiveCamera(40,390/844,.08,250);
  camera.position.fromArray(values);camera.lookAt(new Vector3().fromArray(values,3));camera.updateMatrixWorld();
  const [x,z]=POND_POSITIONS[0];
  for(const dx of [-6.8,6.8])for(const dz of [-3.8,3.8]){
    const point=new Vector3(x+dx,.7,z+dz).project(camera);
    expect(Math.abs(point.x)).toBeLessThan(1);expect(Math.abs(point.y)).toBeLessThan(1);
  }

});
