import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// A separate, self-contained edition: no server or external asset requests.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = await mkdtemp(join(tmpdir(), 'les-etangs-portable-'));
try {
  const result = await build({
    root,
    configFile: false,
    plugins: [react()],
    logLevel: 'error',
    build: {
      outDir: scratch,
      write: false,
      cssCodeSplit: false,
      modulePreload: false,
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  });
  if (Array.isArray(result) || !('output' in result)) throw new Error('Unexpected build output');
  const output = result.output;
  const page = output.find(x => x.type === 'asset' && x.fileName === 'index.html');
  if (!page) throw new Error('HTML missing');
  let html = String(page.source);
  for (const item of output) {
    if (item.type === 'chunk') {
      const tag = /<script\b[^>]*src="[^"]+"[^>]*><\/script>/;
      html = html.replace(tag, () => `<script type="module">${item.code.replace(/<\/script/gi, '<\\/script')}</script>`);
    } else if (item.fileName.endsWith('.css')) {
      html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, () => `<style>${String(item.source).replace(/<\/style/gi, '<\\/style')}</style>`);
    }
  }
  for (const [path, mime] of [['assets/farm-landscape.png', 'image/png'], ['assets/species-atlas.png', 'image/png'], ['favicon.svg', 'image/svg+xml']]) {
    const data = await readFile(join(root, 'public', path));
    html = html.replaceAll(`/${path}`, `data:${mime};base64,${data.toString('base64')}`);
  }
  // Vite emits local font files referenced by the bundled CSS. Embed those
  // emitted assets too; the portable must never depend on a sibling directory.
  const mimeTypes = { woff2: 'font/woff2', woff: 'font/woff', png: 'image/png', svg: 'image/svg+xml', webp: 'image/webp', ogg: 'audio/ogg', mp3: 'audio/mpeg' };
  for (const item of output) {
    if (item.type !== 'asset') continue;
    const mime = mimeTypes[item.fileName.split('.').at(-1)];
    if (!mime) continue;
    html = html.replaceAll(`/${item.fileName}`, `data:${mime};base64,${Buffer.from(item.source).toString('base64')}`);
  }
  for (const file of ['Inter-OFL.txt', 'Fraunces-OFL.txt', 'Lucide-ISC.txt', 'Three-MIT.txt']) {
    const license = await readFile(join(root, 'docs', 'licenses', file), 'utf8');
    html += `\n<!-- ${file}\n${license.replaceAll('--', '—')}\n-->`;
  }
  if (Buffer.byteLength(html) > 15_000_000) throw new Error('Portable exceeds the 15 MB budget');
  const target = process.argv[2] ? resolve(process.argv[2]) : join(root, 'portable', 'Les-Etangs.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html);
  console.log(`Portable game: ${target} (${Buffer.byteLength(html)} bytes; ${(Buffer.byteLength(html) / 1_000_000).toFixed(2)} MB)`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
