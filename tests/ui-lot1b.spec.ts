import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { withoutWebGL } from "./ui-helpers";

const states = ["terrain-vide", "chantier", "elevage", "contrat-client", "lot-au-froid", "expedition", "cycle-paye"];
const panels = ["Construire", "Bassins", "Logistique", "Finances", "Journal", "Guide"];
async function importFixture(page:Page, state:string) {
  await page.getByRole("button",{name:"Paramètres & sauvegarde",exact:true}).click();
  await page.getByLabel("Fichier de sauvegarde").setInputFiles({name:`${state}.json`,mimeType:"application/json",buffer:readFileSync(`docs/ui/fixtures/${state}.json`)});
}

for (const [width,height] of [[1920,1080],[1440,900],[1280,800]]) {
  test(`1b : monde persistant, sept états et six panneaux en ${width}×${height}`,async({page},info)=>{
    test.setTimeout(240000);
    await page.setViewportSize({width,height});
    await page.goto("/");
    const canvas=page.locator('canvas[data-engine="three-webgl"]');
    await expect(canvas).toHaveAttribute("data-frame","rendered",{timeout:60000});
    await canvas.evaluate(e=>{e.setAttribute("data-identity","original");});
    const camera=await canvas.getAttribute("data-camera");
    const measures=[];
    for(const state of states){
      await importFixture(page,state);
      const dimensions=await canvas.evaluate(e=>{const r=e.getBoundingClientRect();return {ratio:r.width*r.height/(innerWidth*innerHeight),w:r.width,h:r.height};});
      expect(dimensions.ratio).toBeGreaterThanOrEqual(.7);
      for(const name of panels){
        await page.getByRole("navigation").getByRole("button",{name,exact:true}).click();
        await expect(canvas).toHaveCount(1);
        await expect(canvas).toHaveAttribute("data-identity","original");
        await expect(canvas).toHaveAttribute("data-camera",camera!);
        await expect(page.getByRole("heading",{name,exact:true})).toBeFocused();
        const geometry=await page.evaluate(()=>{
          const selectors=[".game-hud",".goal-hud",".game-dock",".management-panel",".world-controls"];
          const boxes=selectors.map(s=>({s,r:document.querySelector(s)!.getBoundingClientRect()}));
          const overlaps=[];
          for(let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++) {
            const a=boxes[i].r,b=boxes[j].r;
            if(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y) overlaps.push([boxes[i].s,boxes[j].s]);
          }
          return {overlaps,scrollX,scrollY,width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight};
        });
        expect(geometry.overlaps,`${state} / ${name}`).toEqual([]);
        expect(geometry.width).toBe(width);expect(geometry.height).toBe(height);
        expect(geometry.scrollX+geometry.scrollY).toBe(0);
        await page.keyboard.press("Escape");
      }
      const exposed=await page.evaluate(()=>{
        const area=[".game-hud",".goal-hud",".game-dock",".world-controls"].reduce((sum,s)=>{const r=document.querySelector(s)!.getBoundingClientRect();return sum+r.width*r.height;},0);
        return 1-area/(innerWidth*innerHeight);
      });
      expect(exposed).toBeGreaterThanOrEqual(.7);
      measures.push({state,...dimensions,unobscuredWithPanelsClosed:exposed});
    }
    await info.attach("world-measures",{body:JSON.stringify(measures),contentType:"application/json"});
  });
}

test("1b : raccourcis, restauration du focus, urgence et guide du modèle",async({page})=>{
  await withoutWebGL(page);
  await page.goto("/");
  const dock=page.getByRole("navigation");
  await expect(dock.getByRole("button")).toHaveCount(6);
  for(const [label,key] of [["Construire","c"],["Bassins","b"],["Logistique","l"],["Finances","f"],["Journal","j"],["Guide","g"]]){
    const opener=dock.getByRole("button",{name:label,exact:true});
    await opener.focus();await page.keyboard.press("Enter");
    await expect(page.locator(".management-heading h2")).toBeFocused();
    await page.keyboard.press("Escape");await expect(opener).toBeFocused();
    await page.keyboard.press(`Alt+${key}`);
    await expect(page.locator(".management-heading h2")).toHaveText(label);
    await page.keyboard.press("Escape");
  }
  await dock.getByRole("button",{name:"Guide",exact:true}).click();
  await expect(page.getByRole("heading",{name:"À propos du modèle",exact:true})).toBeVisible();
  expect((await page.locator(".game-hud,.goal-hud").allTextContents()).join(" ")).not.toContain("hypothèses");
  await expect(page.locator(".sidebar,.stats-grid,.page-heading,.main-footer,.objective-banner,.pond-tabs")).toHaveCount(0);
  await importFixture(page,"elevage");
  const seed=JSON.parse(readFileSync("docs/ui/fixtures/elevage.json","utf8"));
  seed.ponds[0].oxygen=1;
  await page.getByRole("button",{name:"Paramètres & sauvegarde",exact:true}).click();
  await page.getByLabel("Fichier de sauvegarde").setInputFiles({name:"urgent.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(seed))});
  await page.getByTestId("task-action").click();
  await expect(page.locator(".water-details")).toHaveAttribute("open","");
  await page.setViewportSize({width:390,height:844});
  const axe=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
  expect(axe.violations).toEqual([]);
});
