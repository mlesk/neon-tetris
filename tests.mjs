// Design test seams T-A1..T-C3 against engine.js (single oracle) + shell file presence.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(src + '\nthis.__E = TetrisEngine;', sandbox);
const E = sandbox.__E || sandbox.TetrisEngine;

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('ok - ' + name); }
  else { fail++; console.log('FAIL - ' + name + ' ' + extra); }
}
function rand(n) { return Math.floor(Math.random() * n); }

// T-A1 ghost-truth: 200 VALID random pairs (sparse wells, retry on collide)
{
  let good = 0, tried = 0;
  while (good + tried < 400 && good < 200) {
    const well = E.emptyWell();
    const n = rand(25);
    for (let k = 0; k < n; k++) well[4 + rand(18)][rand(10)] = 'cyan';
    const kind = E.KINDS[rand(7)];
    const p = { kind, rot: rand(4), x: rand(10), y: rand(4), hue: 't' };
    if (E.collides(well, E.pieceCells(p))) { tried++; continue; }
    const g = E.computeGhost(p, well);
    const h = E.hardDrop(p, well);
    if (JSON.stringify(g.map(String).sort()) !== JSON.stringify(h.cells.map(String).sort())) {
      ok('T-A1 ghost==hardDrop', false, JSON.stringify({ p })); break;
    }
    good++;
  }
  ok('T-A1 ghost-truth x200', good >= 200, `matched ${good}`);
}

// T-A2 nudge-safety: all kinds x rots x wall poses
{
  let bad = 0;
  for (const kind of E.KINDS) {
    for (let rot = 0; rot < 4; rot++) {
      for (const x of [0, 1, 3, 6, 8]) {
        const well = E.emptyWell();
        const p = { kind, rot, x, y: 5, hue: 't' };
        if (E.collides(well, E.pieceCells(p))) continue;
        const q = E.tryRotate(p, well, 1);
        if (E.collides(well, E.pieceCells(q))) bad++;
      }
    }
  }
  ok('T-A2 nudge-safety never overlaps', bad === 0, `bad=${bad}`);
}

// T-B1 clear ladder ordering
{
  const L = 2, ds = [1, 2, 3, 4].map(c => E.scoreFor(c, L, 0).points);
  ok('T-B1 ladder single<double<triple<fourfold', ds[0] < ds[1] && ds[1] < ds[2] && ds[2] < ds[3], ds.join(','));
  // collapse gap-free fixture
  const well = E.emptyWell();
  for (let x = 0; x < 10; x++) well[21][x] = 'lime';
  well[20][0] = 'rose';
  const rows = E.detectClears(well);
  const collapsed = E.collapseWell(well, rows);
  ok('T-B1 detect+collapse gap-free', rows.length === 1 && collapsed[21][0] === 'rose' && collapsed[20].every(c => !c));
}

// T-B2 eruption distinct
{
  const c1 = E.celebrationFor(1), c4 = E.celebrationFor(4);
  ok('T-B2 eruption distinct', c4.scale === 'eruption' && c4.shake > c1.shake && c4.cue !== c1.cue);
}

// T-B3 non-blocking (structural): intake path independent of celebration
{
  const well = E.emptyWell();
  const sp = E.spawnPiece(well, 'T').piece;
  const moved = E.tryMove(sp, well, 1, 0);
  const cel = E.celebrationFor(4);
  ok('T-B3 input live under celebration', moved.x === sp.x + 1 && cel.scale === 'eruption');
}

// T-B4 level + topOut
{
  ok('T-B4 level rises at 10 rows', E.levelFor(0).number === 1 && E.levelFor(10).number === 2 && E.levelFor(10).gravityMs < E.levelFor(0).gravityMs);
  const well = E.emptyWell();
  for (let x = 0; x < 10; x++) well[0][x] = 'gold';
  const sp = E.spawnPiece(well, 'I');
  ok('T-B4 top-out detected', E.checkTopOut(well, sp) === 'over');
}

// T-C1 best durable
{
  ok('T-C1 best compare-and-swap', E.bestAfter(100, 150) === 150 && E.bestAfter(100, 80) === 100 && E.bestAfter(100, 100) === 100);
  ok('T-C1 corrupt best defaults', E.bestAfter(undefined, 50) === 50 && E.prefDefault('best') === 0 && E.prefDefault('ghost') === true);
}

// T-C2 offline shell files (presence = installable contract)
{
  const need = ['index.html', 'styles.css', 'game.js', 'engine.js', 'manifest.webmanifest', 'sw.js'];
  const missing = need.filter(f => !fs.existsSync(path.join(__dirname, f)));
  ok('T-C2 shell files present', missing.length === 0, 'missing: ' + missing.join(','));
  const man = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.webmanifest'), 'utf8'));
  ok('T-C2 manifest installable', !!man.name && !!man.icons && man.icons.length >= 2 && !!man.display);
  const sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
  ok('T-C2 worker caches shell', sw.includes('CACHE') && sw.includes('index.html'));
}

// T-C3 mute gate contract (mute pref gates cues; silent until first gesture)
// T-SPD speed factor ladder: fast quickens, slow relaxes, unknown defaults normal
{
  const game = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  ok('T-C3 mute gate in shell', game.includes('prefs.mute') && game.includes('soundOn') && game.includes('audioUnlocked'));
  ok('T-SPD speed ladder fast<normal<slow', E.speedFactor('fast') < E.speedFactor('normal') && E.speedFactor('normal') < E.speedFactor('slow'));
  ok('T-SPD unknown speed defaults normal', E.speedFactor('warp') === E.speedFactor('normal') && E.speedFactor(undefined) === 1.0);
  ok('T-SPD shell wires speed pref', game.includes("prefs.speed") && game.includes('btn-speed') && game.includes('setSpeed') && game.includes('cycleSpeed'));
  ok('T-UI hud plus modal plus stop', game.includes("el('score')") && game.includes('info-modal') && game.includes('stopGame') && game.includes('showStart') && game.includes("el('topbar')"));
  ok('T-UI hold removed', !game.includes('doHold') && !game.includes("el('hold')") && !game.includes('speed-seg') && !game.includes('refreshSpeedSeg'));
  ok('T-UI html shell', html.includes('id="hud"') && html.includes('id="info-modal"') && html.includes('id="btn-stop"') && html.includes('id="btn-speed"') && html.includes('gametitle') && !html.includes('id="hold"') && !html.includes('speed-seg') && !html.includes('class="brand"'));
  ok('T-NXT shell wires next toggle', game.includes("el('next')") && game.includes('nextVisible') && game.includes('setNextVisible') && game.includes('drawHiddenNext') && !game.includes('btn-next-toggle') && html.includes('id="next"') && !html.includes('btn-next-toggle') && !html.includes('>NEXT<'));
  ok('T-TOP insert/sort/cap', JSON.stringify(E.addScore([], 500).list) === '[500]' && E.addScore([500, 300], 400).list.join(',') === '500,400,300');
  var rLow = E.addScore([500, 400, 300], 100);
  ok('T-TOP full list rejects low', rLow.list.join(',') === '500,400,300' && rLow.rank === 0);
  var rMid = E.addScore([500, 300], 450);
  ok('T-TOP rank reported', rMid.rank === 2 && rMid.list.join(',') === '500,450,300');
  ok('T-TOP sanitizes + ignores zero', E.addScore('junk', 0).list.length === 0 && E.addScore([500, -5, 'x'], 0).list.join(',') === '500');
  ok('T-TOP shell wires top3', game.includes('addScore') && game.includes("el('top3')"));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
