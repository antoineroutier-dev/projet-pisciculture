import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const target = process.argv[2] || 'avant';
const root = `docs/ui/${target}`;
const manifest = JSON.parse(await readFile('docs/ui/fixtures/manifest.json', 'utf8'));
const sizes = [[1920,1080], [1440,900], [1280,800], [390,844]];
const screens = [['projet','Mon projet'], ['bassins','Mes bassins'], ['logistique','Logistique'], ['marche','Marché'], ['journal','Journal'], ['guide','Guide']]
  .filter(([id]) => !process.env.UI_SCREENS || process.env.UI_SCREENS.split(',').includes(id));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const records = process.env.UI_SCREENS
  ? JSON.parse(await readFile(`${root}/manifest.json`, 'utf8')).filter(r => !screens.some(([id]) => id === r.screen))
  : [];
try {
  for (const state of manifest) {
    const save = await readFile(`docs/ui/fixtures/${state.name}.json`, 'utf8');
    for (const [width,height] of sizes) {
      const page = await browser.newPage({ viewport: { width,height }, reducedMotion: 'reduce' });
      await page.addInitScript(raw => localStorage.setItem('les-etangs-save-v3', raw), save);
      await page.goto(process.env.UI_BASE_URL || 'http://127.0.0.1:5173');
      await page.evaluate(() => document.fonts.ready);
      for (const [id,label] of screens) {
        await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: label, exact: true }).click();
        await page.evaluate(() => window.scrollTo(0,0));
        if (id === 'bassins') await page.locator('.scene-site-plan').waitFor();
        const path = `${root}/${state.name}/${width}x${height}-${id}.png`;
        await mkdir(`${root}/${state.name}`, { recursive: true });
        await page.screenshot({ path, fullPage: true, animations: 'disabled' });
        records.push({ path, state: state.name, screen: id, width, height, ...(await page.evaluate(() => ({
          documentHeight: document.documentElement.scrollHeight,
          minText: Math.min(...Array.from(document.querySelectorAll('body *')).filter(e => e.getClientRects().length && Array.from(e.childNodes).some(n => n.nodeType === 3 && n.textContent.trim())).map(e => parseFloat(getComputedStyle(e).fontSize))),
        }))) });
      }
      await page.close();
    }
    console.log(`${target}: ${state.name} — ${screens.length * sizes.length} captures`);
  }
  await writeFile(`${root}/manifest.json`, JSON.stringify(records, null, 2) + '\n');
} finally { await browser.close(); }
