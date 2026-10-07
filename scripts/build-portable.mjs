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
  const target = process.argv[2] ? resolve(process.argv[2]) : join(root, 'portable', 'Les-Etangs.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html);
  console.log(`Portable game: ${target} (${Math.round(Buffer.byteLength(html) / 1024 / 1024 * 10) / 10} MB)`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
