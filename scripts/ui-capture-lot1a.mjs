import { chromium } from 'playwright';
import { readFile, mkdir, writeFile, stat, readdir } from 'node:fs/promises';

// A small, reproducible selection. Never writes to the historical before matrix.
const root = 'docs/ui/apres/lot-1a';
const origin = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const records = [];
await mkdir(root, { recursive: true });
try {
  for (const [width, height] of [[1440,900], [390,844]]) {
    let page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    await page.goto(origin);
    const seed = async state => {
      await page.evaluate(raw => { localStorage.clear(); localStorage.setItem('les-etangs-save-v3', raw); },
        await readFile(`docs/ui/fixtures/${state}.json`, 'utf8'));
      await page.reload(); await page.evaluate(() => document.fonts.ready);
    };
    const position = async selector => page.locator(selector).first().evaluate(e => {
      window.scrollTo(0, e.getBoundingClientRect().top + scrollY - document.querySelector('.topbar').getBoundingClientRect().height - 12);
    });
    const capture = async (screen, state) => {
      const path = `${root}/${width}x${height}-${screen}.jpg`;
      await page.screenshot({ path, type: 'jpeg', quality: 72, animations: 'disabled' });
      records.push({ path, screen, state, width, height, bytes: (await stat(path)).size, ...await page.evaluate(() => {
        const texts = [...document.querySelectorAll('body *')].filter(e => e.getClientRects().length && !e.closest('[inert]') &&
          getComputedStyle(e).visibility !== 'hidden' && ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || e.matches('input,select,textarea')));
        return { minText: Math.min(...texts.map(e => parseFloat(getComputedStyle(e).fontSize))),
          hudNumbers: [...document.querySelectorAll('.hud-resources strong')].map(e => parseFloat(getComputedStyle(e).fontSize)),
          documentWidth: document.documentElement.scrollWidth, scrollY };
      }) });
    };
    await seed('contrat-client');
    for (const [id,label,selector] of [
      ['projet','Mon projet','main'], ['bassins','Mes bassins','.scene-shell'],
      ['logistique','Logistique','.logistics-section'], ['marche','Marché','.market-main'],
      ['journal','Journal','.journal-card'], ['guide','Guide','.guide-grid'],
    ]) {
      await page.getByRole('navigation').getByRole('button', { name: label, exact: true }).click();
      await page.locator(selector).first().waitFor();
      await position(selector);
      await capture(id, 'contrat-client');
      if (id === 'bassins') {
        await page.locator('.water-details summary').click();
        await position('.water-details');
        await capture('bassin-detail', 'contrat-client');
      }
    }
    await page.getByRole('button', { name: 'Paramètres & sauvegarde', exact: true }).click();
    await capture('parametres', 'contrat-client');
    await page.keyboard.press('Escape');
    await seed('chantier');
    await page.getByRole('navigation').getByRole('button', { name: 'Logistique', exact: true }).click();
    const trigger = page.getByRole('group', { name: 'Aménagez d’abord la chambre froide.' });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.focus();
    await page.getByRole('tooltip').waitFor();
    await capture('infobulle', 'chantier');
    await seed('contrat-client');
    await page.getByRole('navigation').getByRole('button', { name: 'Mes bassins', exact: true }).click();
    await page.getByRole('button', { name: 'Explorer en 3D', exact: true }).click();
    await page.locator('canvas[data-engine="three-webgl"][data-frame="rendered"]').waitFor({ timeout: 60000 });
    await position('.scene-shell');
    await capture('visite-3d', 'contrat-client');
    await page.getByRole('button', { name: 'Les poissons', exact: true }).click();
    await page.locator('.photo-observation').waitFor();
    await position('.scene-shell');
    await capture('identification', 'contrat-client');
    await page.close();
    page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        return type.includes('webgl') ? null : Reflect.apply(original, this, [type, ...args]);
      };
    });
    await page.goto(origin);
    await page.getByRole('navigation').getByRole('button', { name: 'Mes bassins', exact: true }).click();
    await page.getByRole('button', { name: 'Explorer en 3D', exact: true }).click();
    await page.locator('.scene-fallback').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await position('.scene-shell');
    await capture('sans-webgl', 'terrain-vide');
    await page.close();
  }
  const images = (await readdir(root)).filter(name => /\.(jpg|webp)$/.test(name));
  const bytes = (await Promise.all(images.map(name => stat(`${root}/${name}`)))).reduce((sum,s) => sum + s.size, 0);
  if (bytes > 5_000_000) throw new Error(`Screenshot budget exceeded: ${bytes} bytes`);
  await writeFile(`${root}/manifest.json`, JSON.stringify({ totalBytes: bytes, captures: records }, null, 2) + '\n');
  console.log(`${records.length} JPEG captures, ${bytes} bytes, minimum text ${Math.min(...records.map(r => r.minText))} px`);
} finally { await browser.close(); }
