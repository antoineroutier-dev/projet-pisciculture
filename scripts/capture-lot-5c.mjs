import fs from "node:fs";
import {build} from "esbuild";
import {chromium,expect} from "@playwright/test";
const fr=JSON.parse(fs.readFileSync('src/i18n/fr.json','utf8')),en=JSON.parse(fs.readFileSync('src/i18n/en.json','utf8'));
function label(source){const key=Object.keys(fr).find(k=>fr[k]===source);if(!key)throw Error(`Missing capture label: ${source}`);return en[key];}
await build({
  stdin: {
    contents:
      'export * from "./src/game.ts"; export * from "./src/state/ledger.ts"; export * from "./src/state/saves.ts"; export { dailyFeed } from "./src/development.ts";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "/tmp/etangs-capture-5c-engine.mjs",
});
const {
  initialGame,
  initialLedger,
  act,
  nextDay,
  recordLedger,
  serializeSave,
  dailyFeed,
} = await import("/tmp/etangs-capture-5c-engine.mjs");
let game = initialGame(),
  ledger = initialLedger(game);
const step = (a) => {
  const result =
    a.type === "day" ? { game: nextDay(game), ok: true } : act(game, a);
  if (!result.ok) throw Error(result.message);
  ledger = recordLedger(ledger, game, result.game, a);
  game = result.game;
};
const days = (n) => {
  for (let i = 0; i < n; i++) step({ type: "day" });
};
step({ type: "survey" });
days(2);
step({ type: "plan", pondId: 1, species: "trout" });
step({ type: "build", pondId: 1 });
step({ type: "asset", asset: "warehouse" });
days(6);
const beforeBuilding = serializeSave(game, ledger);
days(8);
step({ type: "food", pack: 2 });
days(2);
step({ type: "stock", pondId: 1, species: "trout", count: 1000 });
days(3);
const beforeFish = serializeSave(game, ledger);
days(1);
step({ type: "autoFeed", pondId: 1, enabled: true });
step({ type: "asset", asset: "coldstore" });
for (let i = 0; i < 400 && game.ponds[0].weight < 0.45; i++) {
  if (
    game.food < dailyFeed(game) * 8 &&
    !game.development.orders.some((o) => o.kind === "feed")
  )
    step({ type: "food", pack: 2 });
  days(1);
}
step({ type: "contract", pondId: 1, buyer: "cooperative" });
const beforeHarvest = serializeSave(game, ledger);
step({ type: "harvest", pondId: 1 });
step({ type: "dispatch", id: game.development.batches[0].id });
days(7);
const beforePayment = serializeSave(game, ledger);
const directory='docs/ui/apres/lot-5c';fs.mkdirSync(directory,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu-rasterization','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const captures=[],errors=[];
try{
 for(const [width,height] of [[1440,900],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(raw=>{localStorage.setItem('les-etangs-save-v5',raw);localStorage.setItem('les-etangs-ui-v3',JSON.stringify({version:3,locale:'en',motion:'reduce'}));},fs.readFileSync('docs/ui/fixtures/cycle-paye.json','utf8'));
  await page.goto(process.env.UI_BASE_URL||'http://127.0.0.1:4177');
  const canvas=page.locator('canvas[data-engine="three-webgl"]');
  const button=(s)=>page.getByRole('button',{name:label(s),exact:true});
  const tab=(s)=>page.getByRole('tab',{name:label(s),exact:true}).click();
  async function snap(name){await page.mouse.move(width-1,height-1);await page.evaluate(()=>document.fonts.ready);if(await page.locator('.game-shell').count()){const g=await page.evaluate(()=>JSON.parse(localStorage.getItem('les-etangs-save-v5')).game);await expect(canvas).toHaveAttribute('data-day',String(g.day),{timeout:120000});await expect(canvas).toHaveAttribute('data-ponds',g.ponds.map(p=>`${p.id}:${p.built}:${p.constructionDays}:${p.count}:${p.upgrade}`).join('|'),{timeout:120000});}await expect(canvas).toHaveAttribute('data-settled','true',{timeout:120000});await canvas.evaluate(c=>c.getContext('webgl2')?.finish());await page.locator('.toast').waitFor({state:'hidden'});const file=`${directory}/${width}-${name}.jpg`;await page.screenshot({path:file,type:'jpeg',quality:67});captures.push({file,width,height,bytes:fs.statSync(file).size});console.log(file);}
  async function restore(value){while(await page.getByTestId('event-card').count())await button('Continuer').click();await button('Paramètres & sauvegarde').click();await tab('Partie');await page.getByLabel(label('Fichier de sauvegarde')).setInputFiles({name:'english-review.json',mimeType:'application/json',buffer:Buffer.from(value)});await page.getByRole('dialog').waitFor({state:'hidden'});if(await page.locator('.management-panel').count())await page.keyboard.press('Escape');}
  const seed=(name)=>restore(fs.readFileSync(`docs/ui/fixtures/${name}.json`,'utf8'));
  const panel=(name)=>page.locator('.game-dock').getByRole('button',{name:label(name),exact:true}).click();
  await snap('titre');await button('Nouvelle partie').click();await snap('nouvelle-partie');await page.keyboard.press('Escape');await button('Charger une partie').click();await snap('emplacements');await page.keyboard.press('Escape');await button('Crédits').click();await snap('credits');await page.keyboard.press('Escape');await button('Continuer').click();
  await button('Menu pause').click();await snap('pause');await page.keyboard.press('Escape');
  await seed('elevage');await snap('monde');
  await button('Paramètres & sauvegarde').click();
  for(const [name,slug] of [['Partie','sauvegarde'],['Affichage','affichage'],['Audio','audio'],['Jeu','jeu'],['Contrôles','controles'],['Langue','langue']]){await tab(name);await snap(slug);}
  await page.keyboard.press('Escape');
  await panel('Bassins');await snap('bassin');
  for(const [name,slug] of [['Alimentation','alimentation'],['Équipement','equipement'],['Historique','historique']]){await tab(name);await snap(slug);}
  await panel('Logistique');await snap('approvisionnement');
  for(const [name,slug] of [['Bâtiments','batiments'],['Clients','clients'],['Expéditions','expeditions']]){await tab(name);await snap(slug);}
  await seed('cycle-paye');await panel('Finances');await snap('finances');
  for(const [name,slug] of [['Prévision','prevision'],['Mois','mois'],['Cycles','cycles']]){await tab(name);await snap(slug);}
  await panel('Journal');await snap('journal');await panel('Guide');await snap('guide');
  for(const [name,slug] of [['Espèces','especes'],['Eau et alimentation','eau-sante'],['À propos du modèle','modele']]){await tab(name);await snap(slug);}
  await seed('terrain-vide');await panel('Construire');await snap('construire');
  await page.getByTestId('task-action').click();await page.getByTestId('task-action').click();await page.getByRole('dialog').waitFor();await snap('analyse');await page.keyboard.press('Escape');
  for(const [value,slug] of [[beforeBuilding,'premier-batiment'],[beforeFish,'premiers-poissons']]){await restore(value);await button('Jour suivant').click();await page.getByTestId('event-card').waitFor();await snap(slug);}
  await restore(beforeHarvest);await panel('Logistique');await tab('Clients');await page.getByRole('button',{name:'Harvest Les Saules',exact:true}).click();await snap('premiere-recolte');await button('Continuer').click();await snap('bilan-provisoire');
  await restore(beforePayment);await button('Jour suivant').click();await snap('premier-paiement');await button('Continuer').click();await snap('bilan-paye');
  await page.close();
 }
}finally{await browser.close();}
if(errors.length)throw Error(errors.join('\n'));
const totalBytes=captures.reduce((s,c)=>s+c.bytes,0);if(totalBytes>5e6)throw Error(`Capture budget exceeded: ${totalBytes}`);fs.writeFileSync(`${directory}/manifest.json`,JSON.stringify({totalBytes,captures},null,2)+'\n');console.log({totalBytes,count:captures.length});
