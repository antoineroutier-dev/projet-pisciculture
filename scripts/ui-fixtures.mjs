import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';

// Reference saves are obtained exclusively through public engine operations.
const vite = await createServer({ server: { middlewareMode: true } });
try {
  const { initialGame, act, nextDay, parseSave } = await vite.ssrLoadModule('/src/game.ts');
  const { dailyFeed } = await vite.ssrLoadModule('/src/development.ts');
  const directory = 'docs/ui/fixtures';
  await mkdir(directory, { recursive: true });
  let game = initialGame();
  const manifest = [];
  const perform = action => {
    const result = act(game, action);
    if (!result.ok) throw new Error(`${JSON.stringify(action)}: ${result.message}`);
    game = result.game;
  };
  const advance = days => { for (let i = 0; i < days; i++) game = nextDay(game); };
  const save = async name => {
    const json = JSON.stringify(game, null, 2);
    parseSave(json);
    await writeFile(`${directory}/${name}.json`, json + '\n');
    manifest.push({ name, day: game.day, money: game.money, fish: game.ponds[0].count, weight: game.ponds[0].weight });
  };
  await save('terrain-vide');
  perform({ type: 'survey' }); advance(2);
  perform({ type: 'plan', pondId: 1, species: 'trout' });
  perform({ type: 'build', pondId: 1 });
  perform({ type: 'asset', asset: 'warehouse' });
  advance(4); await save('chantier'); advance(10);
  perform({ type: 'food', pack: 1 }); advance(2);
  perform({ type: 'stock', pondId: 1, species: 'trout', count: 1000 }); advance(4);
  perform({ type: 'autoFeed', pondId: 1, enabled: true });
  await save('elevage');
  let contractCaptured = false;
  for (let i = 0; i < 400 && game.ponds[0].weight < 0.45; i++) {
    if (game.food < dailyFeed(game) * 8 && !game.development.orders.some(o => o.kind === 'feed')) perform({ type: 'food', pack: 1 });
    if (game.ponds[0].weight >= 0.27 && !game.development.assets.coldstore && !game.development.works.length) perform({ type: 'asset', asset: 'coldstore' });
    if (game.ponds[0].weight >= 0.36 && game.development.assets.coldstore && !game.development.contracts.length) {
      perform({ type: 'contract', pondId: 1, buyer: 'cooperative' });
      if (!contractCaptured) { await save('contrat-client'); contractCaptured = true; }
    }
    advance(1);
  }
  if (game.ponds[0].weight < 0.45) throw new Error('Harvest did not mature');
  if (!game.development.contracts.length) perform({ type: 'contract', pondId: 1, buyer: 'cooperative' });
  perform({ type: 'harvest', pondId: 1 }); await save('lot-au-froid');
  perform({ type: 'dispatch', id: game.development.batches[0].id }); await save('expedition');
  advance(8);
  if (game.development.paid !== 1) throw new Error('Missing payment');
  await save('cycle-paye');
  await writeFile(`${directory}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(manifest, null, 2));
} finally { await vite.close(); }
