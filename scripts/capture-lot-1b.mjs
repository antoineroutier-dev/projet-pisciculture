import {chromium} from 'playwright';
import fs from 'node:fs';
const directory='docs/ui/apres/lot-1b';
fs.mkdirSync(directory,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page=await browser.newPage({reducedMotion:'reduce'});
const manifest=[];
page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
page.on('console',m=>{if(m.type()==='error') console.log('CONSOLE',m.text())});
const states=['terrain-vide','chantier','elevage','contrat-client','lot-au-froid','expedition','cycle-paye'];
for(const [width,height] of [[1440,900],[390,844]]){
 await page.setViewportSize({width,height});
 await page.goto('http://localhost:5173');
 await page.locator('canvas[data-frame="rendered"]').waitFor({timeout:120000});
 async function snap(name){
   const file=`${directory}/${width}-${name}.jpg`;
   await page.evaluate(()=>document.fonts.ready);
   await page.locator('canvas[data-settled="true"]').waitFor({timeout:120000});
   await page.locator('canvas[data-engine="three-webgl"]').evaluate(c=>c.getContext('webgl2')?.finish());
   await page.screenshot({path:file,type:'jpeg',quality:72});
   manifest.push({file,width,height,bytes:fs.statSync(file).size});
   console.log(file);
 }
 for(const state of states){
   await page.getByRole('button',{name:'Paramètres & sauvegarde',exact:true}).click();
   const raw=fs.readFileSync(`docs/ui/fixtures/${state}.json`);
   await page.getByLabel('Fichier de sauvegarde').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:raw});
   await page.locator(`canvas[data-day="${JSON.parse(raw).day}"]`).waitFor({timeout:120000});
   await page.locator('.toast').waitFor({state:'hidden',timeout:10000});
   await snap(state);
 }
 await page.getByRole('button',{name:'Paramètres & sauvegarde',exact:true}).click();
 await page.getByLabel('Fichier de sauvegarde').setInputFiles({name:'contract.json',mimeType:'application/json',buffer:fs.readFileSync('docs/ui/fixtures/contrat-client.json')});
 await page.locator('canvas[data-day="157"]').waitFor({timeout:120000});
 await page.locator('.toast').waitFor({state:'hidden',timeout:10000});
 for(const [name,id] of [['Construire','project'],['Bassins','ponds'],['Logistique','logistics'],['Finances','finance'],['Journal','journal'],['Guide','guide']]){
   await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();
   await snap(id);
   await page.keyboard.press('Escape');
 }
 await page.getByLabel('Vue du terrain',{exact:true}).selectOption('fish');
 await page.locator('canvas[data-view="fish"]').waitFor();
 await snap('poissons');
}
if(manifest.reduce((s,x)=>s+x.bytes,0)>5_000_000) throw new Error('Budget de captures dépassé');
fs.writeFileSync(`${directory}/manifest.json`,JSON.stringify({totalBytes:manifest.reduce((s,x)=>s+x.bytes,0),captures:manifest},null,2)+'\n');
await browser.close();
console.log(JSON.stringify({captures:manifest.length,bytes:manifest.reduce((s,x)=>s+x.bytes,0)}));
