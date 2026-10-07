import fs from 'node:fs';
const [lot,reportPath]=process.argv.slice(2);
if(!lot||!reportPath) throw new Error('Usage: node scripts/report-ui.mjs lot-1b /tmp/playwright.json');
const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
const records=[];
function walk(suite){
 for(const spec of suite.specs||[]) for(const test of spec.tests||[]) {
  const result=test.results.at(-1);
  const attachments=(result?.attachments||[]).flatMap(a=>{
   if(a.contentType!=='application/json') return [];
   const raw=a.body ? Buffer.from(a.body,'base64').toString('utf8') : a.path ? fs.readFileSync(a.path,'utf8') : null;
   if(!raw) return [];
   return [{name:a.name,value:JSON.parse(raw)}];
  });
  records.push({title:spec.title,status:result?.status,durationMs:result?.duration,attachments});
 }
 for(const child of suite.suites||[]) walk(child);
}
report.suites.forEach(walk);
if(records.some(r=>r.status!=="passed")) throw new Error("La suite doit être entièrement verte avant de publier les mesures finales.");
const captures=JSON.parse(fs.readFileSync(`docs/ui/apres/${lot}/manifest.json`,'utf8'));
const typography=records.flatMap(r=>r.attachments.filter(a=>a.name==='font-measures').flatMap(a=>a.value));
const worlds=records.flatMap(r=>r.attachments.filter(a=>a.name==='world-measures').flatMap(a=>a.value));
const result={stats:report.stats,portableBytes:fs.statSync('portable/Les-Etangs.html').size,
 captureBytes:captures.totalBytes,captureCount:captures.captures.length,
 minimumFontPx:Math.min(...typography.map(v=>v.min)),typographyCombinations:typography.length,
 minimumCanvasRatio:Math.min(...worlds.map(v=>v.ratio)),minimumUnobscuredWorldRatioPanelsClosed:Math.min(...worlds.map(v=>v.unobscuredWithPanelsClosed)),records};
fs.writeFileSync(`docs/ui/verification/${lot}/measures.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,records:undefined}));
