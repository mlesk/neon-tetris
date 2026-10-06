/* M-C Shell & Memory. Renders M-A/M-B facts, never invents rules. */
(function () {
  'use strict';
  var E = window.TetrisEngine;
  var COLS = E.COLS, ROWS = E.ROWS, HIDDEN = E.HIDDEN, TOTAL = ROWS + HIDDEN;
  var CELL = 30, WW = COLS * CELL, WH = ROWS * CELL;

  var HUE_COLORS = {
    cyan: ['#22e6ff', '#0aa8ff'], gold: ['#ffd94d', '#ff9d0a'],
    violet: ['#c77bff', '#7b2fff'], lime: ['#a6ff4d', '#2ecc40'],
    rose: ['#ff5d7e', '#c81e5b'], azure: ['#4da6ff', '#1e40ff'],
    tangerine: ['#ffb14d', '#ff5e1a']
  };

  // ---------- prefs (durable device-local, silent-safe) ----------
  var prefs = { best: 0, mute: false, ghost: true, speed: 'fast', nextVisible: true, top3: [] };
  function loadPrefs() {
    try {
      var b = parseInt(localStorage.getItem('neon-tetris-best'), 10);
      prefs.best = (isNaN(b) || b < 0) ? E.prefDefault('best') : b;
      prefs.mute = localStorage.getItem('neon-tetris-mute') === '1';
      var g = localStorage.getItem('neon-tetris-ghost');
      prefs.ghost = g === null ? E.prefDefault('ghost') : g === '1';
      var s = localStorage.getItem('neon-tetris-speed');
      prefs.speed = (s === 'slow' || s === 'normal' || s === 'fast') ? s : 'fast';
      var nv = localStorage.getItem('neon-tetris-next');
      prefs.nextVisible = nv === null ? true : nv === '1';
      var t = null;
      try { t = JSON.parse(localStorage.getItem('neon-tetris-top3')); } catch (e2) { t = null; }
      prefs.top3 = E.addScore(t, 0).list;
      if (!prefs.top3.length && prefs.best > 0) prefs.top3 = [prefs.best];
    } catch (e) { prefs.best = 0; prefs.ghost = true; prefs.speed = 'fast'; prefs.nextVisible = true; prefs.top3 = []; }
  }
  function savePrefs() {
    try {
      prefs.best = prefs.top3.length ? prefs.top3[0] : prefs.best;
      localStorage.setItem('neon-tetris-best', String(prefs.best));
      localStorage.setItem('neon-tetris-mute', prefs.mute ? '1' : '0');
      localStorage.setItem('neon-tetris-ghost', prefs.ghost ? '1' : '0');
      localStorage.setItem('neon-tetris-speed', prefs.speed);
      localStorage.setItem('neon-tetris-next', prefs.nextVisible ? '1' : '0');
      localStorage.setItem('neon-tetris-top3', JSON.stringify(prefs.top3));
    } catch (e) { /* silent: session best continues */ }
  }

  // ---------- sound (synthesized, silent-until-gesture, mute wins) ----------
  var actx = null, audioUnlocked = false;
  function soundOn() { return !prefs.mute && audioUnlocked && !!actx; }
  function unlockAudio() {
    if (audioUnlocked) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = actx || new AC();
      if (actx.state === 'suspended') actx.resume();
      audioUnlocked = true;
      hideTapForSound();
    } catch (e) { /* silent continue = AudioBlocked fallback */ }
  }
  function tone(freq, dur, type, vol, when) {
    if (!soundOn()) return;
    try {
      var t = actx.currentTime + (when || 0);
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.08, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* silent */ }
  }
  function playCue(name) {
    if (!soundOn()) return;
    switch (name) {
      case 'move': tone(220, 0.05, 'square', 0.04); break;
      case 'rotate': tone(330, 0.06, 'square', 0.05); break;
      case 'soft': tone(180, 0.03, 'square', 0.02); break;
      case 'hard': tone(90, 0.18, 'sine', 0.22); tone(55, 0.25, 'sine', 0.18, 0.02); break;
      case 'lock': tone(140, 0.08, 'triangle', 0.10); break;
      case 'clear1': tone(523, 0.12, 'square', 0.08); break;
      case 'clear2': tone(523, 0.1, 'square', 0.09); tone(659, 0.12, 'square', 0.09, 0.08); break;
      case 'clear3': tone(523, 0.1, 'square', 0.1); tone(659, 0.1, 'square', 0.1, 0.08); tone(784, 0.16, 'square', 0.1, 0.16); break;
      case 'clear4':
        tone(65, 0.5, 'sawtooth', 0.2);
        [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, 0.18, 'square', 0.1, 0.1 + i * 0.09); });
        break;
      case 'level': tone(440, 0.1, 'triangle', 0.1); tone(880, 0.15, 'triangle', 0.1, 0.09); break;
      case 'over': [400, 300, 220, 150].forEach(function (f, i) { tone(f, 0.2, 'sawtooth', 0.09, i * 0.14); }); break;
      case 'start': tone(440, 0.08, 'square', 0.08); tone(660, 0.1, 'square', 0.08, 0.07); break;
    }
  }

  // ---------- state ----------
  var well, active, queue, score, rows, level, phase, best;
  var infoResume = false;
  var dropAcc = 0, lastT = 0, lockWait = 0;
  var particles = [], rings = [], floaters = [];
  var flashRows = [], flashT = 0, shake = 0, rimGlow = 0;
  var gameTime = 0;

  function bag() {
    var k = E.KINDS.slice();
    for (var i = k.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = k[i]; k[i] = k[j]; k[j] = t; }
    return k;
  }
  function refill() { while (queue.length < 7) queue = queue.concat(bag()); }
  function resetRun() {
    well = E.emptyWell(); queue = []; refill();
    score = 0; rows = 0; level = E.levelFor(0); gameTime = 0;
    particles = []; rings = []; floaters = []; flashRows = []; shake = 0; rimGlow = 0;
    spawnNext();
    phase = 'playing';
  }
  function spawnNext() {
    refill();
    var kind = queue.shift();
    var sp = E.spawnPiece(well, kind);
    active = sp.piece;
    if (E.checkTopOut(well, sp) === 'over') return gameOver();
    dropAcc = 0; lockWait = 0;
  }
  function gameOver() {
    phase = 'over';
    playCue('over');
    var res = E.addScore(prefs.top3, score);
    prefs.top3 = res.list;
    prefs.best = prefs.top3.length ? prefs.top3[0] : prefs.best;
    best = prefs.best; savePrefs();
    showOver(res.rank);
  }

  function lockActive(extraDrop) {
    well = E.lockPiece(well, active);
    var cleared = E.detectClears(well);
    var dropPts = extraDrop || 0;
    if (cleared.length) {
      var ev = E.scoreFor(cleared.length, level.number, dropPts);
      score += ev.points;
      rows += cleared.length;
      var nl = E.levelFor(rows);
      if (nl.number > level.number) { level = nl; playCue('level'); addFloater('LEVEL ' + nl.number, '#ffd94d', 1.4); }
      else level = nl;
      var cel = E.celebrationFor(cleared.length);
      playCue(cel.cue);
      erupt(cleared, cel, ev);
      // delay collapse slightly for flash readability, but input stays live
      flashRows = cleared.slice(); flashT = 130;
      pendingCollapse = cleared.slice();
    } else {
      if (dropPts) score += dropPts;
      playCue('lock');
      dustAt(E.pieceCells(active));
    }
    updatePanels();
  }
  var pendingCollapse = null;

  // ---------- eruptions + comet ----------
  function erupt(cleared, cel, ev) {
    var cx = WW / 2, cy = (cleared[0] - HIDDEN + 0.5) * CELL;
    flashRows = cleared.slice();
    var names = { pop: 'pop', boom: 'boom', mega: 'mega', eruption: 'eruption' };
    var count = cleared.length >= 4 ? 170 : cleared.length === 3 ? 110 : cleared.length === 2 ? 60 : 26;
    for (var i = 0; i < count; i++) {
      var row = cleared[Math.floor(Math.random() * cleared.length)];
      particles.push({
        x: Math.random() * WW, y: (row - HIDDEN + Math.random()) * CELL,
        vx: (Math.random() - 0.5) * (cleared.length >= 4 ? 560 : 320),
        vy: -Math.random() * (cleared.length >= 4 ? 620 : 380) - 60,
        life: 500 + Math.random() * (cleared.length >= 4 ? 700 : 400),
        age: 0, size: 2 + Math.random() * 4,
        color: ['#ffffff', '#22e6ff', '#ff5df2', '#ffd94d', '#a6ff4d'][Math.floor(Math.random() * 5)]
      });
    }
    if (cleared.length >= 2) rings.push({ x: cx, y: cy, r: 10, vr: cleared.length >= 4 ? 900 : 480, age: 0, life: cleared.length >= 4 ? 700 : 420, color: cleared.length >= 4 ? '#ff5df2' : '#22e6ff', width: cleared.length >= 4 ? 7 : 4 });
    if (cleared.length >= 4) { rings.push({ x: cx, y: cy, r: 4, vr: 620, age: 0, life: 900, color: '#ffd94d', width: 4 }); rimGlow = 2000; }
    shake = Math.max(shake, cel.shake);
    var label = cleared.length === 4 ? 'TETRIS! +' : cleared.length === 3 ? 'TRIPLE +' : cleared.length === 2 ? 'DOUBLE +' : 'SINGLE +';
    addFloater(label + ev.points, cleared.length >= 4 ? '#ffd94d' : '#ffffff', cleared.length >= 4 ? 1.8 : 1.2);
  }
  function dustAt(cells) {
    cells.forEach(function (c) {
      particles.push({ x: (c[0] + 0.5) * CELL, y: (c[1] - HIDDEN + 0.5) * CELL, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 120 - 20, life: 320, age: 0, size: 2 + Math.random() * 2, color: '#8b9bb4' });
    });
  }
  function cometTrail(fromCells, toCells) {
    toCells.forEach(function (c) {
      particles.push({ x: (c[0] + 0.5) * CELL, y: (c[1] - HIDDEN + 0.5) * CELL, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 200 - 80, life: 380, age: 0, size: 2 + Math.random() * 3, color: '#22e6ff' });
    });
    rings.push({ x: WW / 2, y: (toCells[0][1] - HIDDEN + 0.5) * CELL, r: 8, vr: 420, age: 0, life: 300, color: '#ffffff', width: 3 });
  }
  function addFloater(text, color, scale) {
    floaters.push({ text: text, color: color, scale: scale || 1, age: 0, life: 1400, y: WH * 0.45 });
  }

  // ---------- DOM ----------
  var cv, ctx, nextCv, nextCtx;
  var el = function (id) { return document.getElementById(id); };
  function updatePanels() {
    el('score').textContent = score;
    el('level').textContent = level.number;
    el('rows').textContent = rows;
    el('best').textContent = prefs.best;
    el('best2') && (el('best2').textContent = prefs.best);
    var ol = el('top3');
    if (ol) {
      ol.innerHTML = '';
      if (!prefs.top3.length) {
        var li0 = document.createElement('li');
        li0.className = 'empty'; li0.textContent = 'no scores yet';
        ol.appendChild(li0);
      } else {
        prefs.top3.forEach(function (n) {
          var li = document.createElement('li');
          li.textContent = n;
          ol.appendChild(li);
        });
      }
    }
    el('btn-mute').textContent = prefs.mute ? '🔇' : '🔊';
    el('btn-ghost').classList.toggle('off', !prefs.ghost);
    refreshSpeedBtn();
    applyNextVisible();
  }
  function drawMini(c, kinds) {
    var w = c.canvas.width, h = c.canvas.height;
    c.clearRect(0, 0, w, h);
    kinds.forEach(function (kind, idx) {
      var base = { I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]] }[kind];
      var s = kind === 'I' ? 11 : 14, ox = (w - 4 * s) / 2, oy = idx * (h / 3) + (h / 3 - 2 * s) / 2 - 4;
      if (kinds.length === 1) oy = (h - 2 * s) / 2 - 4;
      base.forEach(function (cell) { block2d(c, ox + cell[0] * s, oy + cell[1] * s, s - 1, HUE_COLORS[E.HUES[kind]]); });
    });
  }
  function block2d(c, x, y, s, grad) {
    var g = c.createLinearGradient(x, y, x, y + s);
    g.addColorStop(0, grad[0]); g.addColorStop(1, grad[1]);
    c.fillStyle = g;
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, s, s, 3); else c.rect(x, y, s, s);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)';
    c.fillRect(x + 2, y + 2, s - 4, 2);
  }

  function draw(dt) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = WW, h = WH;
    if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // backdrop grid
    ctx.fillStyle = '#0b0e1f'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,140,255,.08)'; ctx.lineWidth = 1;
    for (var gx = 1; gx < COLS; gx++) { ctx.beginPath(); ctx.moveTo(gx * CELL + .5, 0); ctx.lineTo(gx * CELL + .5, h); ctx.stroke(); }
    for (var gy = 1; gy < ROWS; gy++) { ctx.beginPath(); ctx.moveTo(0, gy * CELL + .5); ctx.lineTo(w, gy * CELL + .5); ctx.stroke(); }

    ctx.save();
    if (shake > 0.3) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    // settled
    for (var y = HIDDEN; y < TOTAL; y++) for (var x = 0; x < COLS; x++) {
      var v = well[y][x];
      if (!v) continue;
      var flashing = flashRows.indexOf(y) >= 0 && flashT > 0;
      if (flashing) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x * CELL + 1, (y - HIDDEN) * CELL + 1, CELL - 2, CELL - 2); }
      else block2d(ctx, x * CELL + 1, (y - HIDDEN) * CELL + 1, CELL - 2, HUE_COLORS[v] || ['#fff', '#888']);
    }
    // ghost
    if (active && prefs.ghost && phase === 'playing') {
      var g = E.computeGhost(active, well);
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5;
      g.forEach(function (c) {
        var gy2 = c[1] - HIDDEN;
        if (gy2 < 0) return;
        ctx.strokeRect(c[0] * CELL + 2, gy2 * CELL + 2, CELL - 4, CELL - 4);
      });
    }
    // active
    if (active && phase !== 'over') {
      E.pieceCells(active).forEach(function (c) {
        var gy3 = c[1] - HIDDEN;
        if (gy3 < 0) return;
        block2d(ctx, c[0] * CELL + 1, gy3 * CELL + 1, CELL - 2, HUE_COLORS[active.hue]);
      });
    }
    // particles
    particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
    rings.forEach(function (r) {
      ctx.globalAlpha = Math.max(0, 1 - r.age / r.life);
      ctx.strokeStyle = r.color; ctx.lineWidth = r.width;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.restore();

    // rim glow
    if (rimGlow > 0) {
      ctx.strokeStyle = 'rgba(255,217,77,' + Math.min(0.9, rimGlow / 2000) + ')';
      ctx.lineWidth = 4; ctx.strokeRect(2, 2, w - 4, h - 4);
    }
    // floaters
    ctx.textAlign = 'center'; ctx.font = 'bold 20px system-ui';
    floaters.forEach(function (f) {
      ctx.globalAlpha = Math.max(0, 1 - f.age / f.life);
      ctx.font = 'bold ' + Math.round(20 * f.scale) + 'px system-ui';
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color; ctx.shadowBlur = 12;
      ctx.fillText(f.text, w / 2, f.y);
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;
  }

  function step(t) {
    requestAnimationFrame(step);
    var dt = Math.min(100, t - (lastT || t)); lastT = t;
    if (phase === 'playing') {
      gameTime += dt;
      var baseInterval = level.gravityMs * E.speedFactor(prefs.speed);
      var interval = (el('btn-down') && touchDown) ? Math.min(40, baseInterval / 12) : baseInterval;
      if (keysDown) interval = Math.min(interval, baseInterval / 12);
      dropAcc += dt;
      // delayed collapse keeps flash readable without eating input
      if (flashT > 0) { flashT -= dt; if (flashT <= 0 && pendingCollapse) { well = E.collapseWell(well, pendingCollapse); pendingCollapse = null; flashRows = []; } }
      while (dropAcc >= interval) {
        dropAcc -= interval;
        var moved = E.tryMove(active, well, 0, 1);
        if (moved === active) {
          lockWait += interval;
          if (lockWait > 120) { lockWait = 0; dropAcc = 0; lockActive(0); if (phase !== 'playing') break; spawnNext(); }
          break;
        } else { active = moved; lockWait = 0; if (keysDown || touchDown) { score += 1; updatePanels(); } }
      }
    }
    // fx advance
    particles = particles.filter(function (p) { p.age += dt; p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; p.vy += 1400 * dt / 1000; return p.age < p.life; });
    rings = rings.filter(function (r) { r.age += dt; r.r += r.vr * dt / 1000; return r.age < r.life; });
    floaters = floaters.filter(function (f) { f.age += dt; f.y -= dt * 0.03; return f.age < f.life; });
    if (shake > 0) shake = Math.max(0, shake - dt * 0.03);
    if (rimGlow > 0) rimGlow -= dt;
    if (flashT > 0 && phase !== 'playing') flashT -= dt;
    draw(dt);
  }

  // ---------- intents ----------
  function doLeft() { if (phase !== 'playing') return; var q = E.tryMove(active, well, -1, 0); if (q !== active) { active = q; playCue('move'); } }
  function doRight() { if (phase !== 'playing') return; var q = E.tryMove(active, well, 1, 0); if (q !== active) { active = q; playCue('move'); } }
  function doRot(d) { if (phase !== 'playing') return; var q = E.tryRotate(active, well, d); if (q !== active) { active = q; playCue('rotate'); } }
  function doHardDrop() {
    if (phase !== 'playing') return;
    var h = E.hardDrop(active, well);
    score += h.distance * 2;
    cometTrail(E.pieceCells(active), h.cells);
    playCue('hard');
    active = h.piece;
    var from = active;
    lockActive(0); // drop points already added via score above? add distance text
    if (phase === 'playing') spawnNext();
    updatePanels();
  }
  function setSpeed(name) {
    if (name !== 'slow' && name !== 'fast') name = 'normal';
    if (prefs.speed === name) return;
    prefs.speed = name; savePrefs(); refreshSpeedBtn();
  }
  function cycleSpeed() {
    setSpeed(prefs.speed === 'fast' ? 'normal' : prefs.speed === 'normal' ? 'slow' : 'fast');
  }
  function refreshSpeedBtn() {
    var b = el('btn-speed');
    if (b) b.textContent = prefs.speed.toUpperCase();
  }
  function setNextVisible(v) {
    prefs.nextVisible = !!v; savePrefs(); applyNextVisible();
  }
  function applyNextVisible() {
    if (typeof nextCtx !== 'undefined' && nextCtx) {
      if (prefs.nextVisible) drawMini(nextCtx, queue.slice(0, 1));
      else drawHiddenNext();
    }
    var c = el('next');
    if (c) c.title = prefs.nextVisible ? 'click to hide next piece' : 'click to show next piece';
  }
  function drawHiddenNext() {
    drawMini(nextCtx, queue.slice(0, 1));
    var c = nextCtx, w = c.canvas.width, h = c.canvas.height;
    var cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 3;
    c.save();
    c.globalAlpha = 0.92;
    c.strokeStyle = '#ff5d7e';
    c.lineWidth = 4;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(cx - r * 0.7, cy + r * 0.7); c.lineTo(cx + r * 0.7, cy - r * 0.7); c.stroke();
    c.restore();
  }
  function fitHud() {
    var hud = el('hud'), box = el('well-box'), bar = el('topbar');
    if (box && box.clientWidth > 0) {
      if (hud) hud.style.maxWidth = box.clientWidth + 'px';
      if (bar) bar.style.maxWidth = box.clientWidth + 'px';
    }
  }
  function togglePause() {
    if (phase === 'playing') { phase = 'paused'; el('overlay').classList.add('show'); el('overlay-title').textContent = 'PAUSED'; el('overlay-sub').textContent = 'Press P or tap resume'; el('btn-resume').style.display = ''; el('btn-start').style.display = 'none'; el('btn-stop').style.display = ''; }
    else if (phase === 'paused') { phase = 'playing'; el('overlay').classList.remove('show'); }
  }
  function startGame() {
    unlockAudio();
    el('overlay').classList.remove('show');
    resetRun(); playCue('start'); updatePanels();
  }

  var keysDown = false, touchDown = false;
  function showOver(rank) {
    el('overlay').classList.add('show');
    el('overlay-title').textContent = 'GAME OVER';
    el('final-score').textContent = score;
    el('final-best').textContent = prefs.best;
    el('final-rows').textContent = rows;
    var nb = el('newbest');
    if (rank > 0) { nb.textContent = '✨ NEW #' + rank + ' BEST ✨'; nb.style.display = ''; }
    else nb.style.display = 'none';
    el('overlay-sub').textContent = 'Press R or tap restart';
    el('btn-resume').style.display = 'none'; el('btn-start').style.display = '';
    el('btn-start').textContent = '↻ RESTART';
    el('btn-stop').style.display = '';
  }
  function showStart() {
    el('overlay').classList.add('show');
    el('overlay-title').textContent = 'NEON TETRIS';
    el('overlay-sub').textContent = 'Arrows steer · Space slams · P pauses';
    el('gameover-stats').style.display = 'none';
    el('btn-resume').style.display = 'none';
    el('btn-stop').style.display = 'none';
    var st = el('btn-start'); st.style.display = ''; st.textContent = '▶ START';
  }
  function stopGame() {
    toggleInfo(false);
    well = E.emptyWell(); queue = []; refill();
    score = 0; rows = 0; level = E.levelFor(0); gameTime = 0;
    particles = []; rings = []; floaters = []; flashRows = []; pendingCollapse = null; shake = 0; rimGlow = 0;
    spawnNext(); phase = 'ready';
    updatePanels(); showStart();
  }
  function toggleInfo(force) {
    var m = el('info-modal');
    var open = m.style.display !== 'none';
    var want = (typeof force === 'boolean') ? force : !open;
    if (want === open) return;
    m.style.display = want ? 'flex' : 'none';
    if (want) {
      infoResume = (phase === 'playing');
      if (infoResume) phase = 'paused';
    } else if (infoResume) {
      infoResume = false;
      if (phase === 'paused') { phase = 'playing'; el('overlay').classList.remove('show'); }
    } else infoResume = false;
  }
  function hideTapForSound() { var n = el('tap-sound'); if (n) n.style.display = 'none'; }

  function bind() {
    document.addEventListener('keydown', function (ev) {
      if (ev.repeat && ['ArrowLeft', 'ArrowRight', 'ArrowDown'].indexOf(ev.code) < 0) { /* allow repeat only for steer */ }
      unlockAudio();
      switch (ev.code) {
        case 'ArrowLeft': doLeft(); ev.preventDefault(); break;
        case 'ArrowRight': doRight(); ev.preventDefault(); break;
        case 'ArrowDown': keysDown = true; ev.preventDefault(); break;
        case 'ArrowUp': case 'KeyX': doRot(1); ev.preventDefault(); break;
        case 'KeyZ': doRot(-1); ev.preventDefault(); break;
        case 'Space': if (phase !== 'playing') startGame(); else doHardDrop(); ev.preventDefault(); break;
        case 'KeyP': togglePause(); break;
        case 'KeyR': startGame(); break;
        case 'KeyM': prefs.mute = !prefs.mute; savePrefs(); updatePanels(); break;
        case 'KeyG': prefs.ghost = !prefs.ghost; savePrefs(); updatePanels(); break;
        case 'KeyI': toggleInfo(); break;
        case 'Escape': if (el('info-modal').style.display !== 'none') toggleInfo(false); else togglePause(); break;
        case 'Digit1': setSpeed('slow'); break;
        case 'Digit2': setSpeed('normal'); break;
        case 'Digit3': setSpeed('fast'); break;
        case 'Enter': if (phase !== 'playing') startGame(); break;
      }
    });
    document.addEventListener('keyup', function (ev) { if (ev.code === 'ArrowDown') keysDown = false; });
    // touch buttons
    var hold = function (id, fn, rep) {
      var n = el(id), t = null;
      var start = function (e) { e.preventDefault(); unlockAudio(); fn(); if (rep) t = setInterval(fn, rep); };
      var end = function () { if (t) clearInterval(t); t = null; };
      n.addEventListener('pointerdown', start);
      n.addEventListener('pointerup', end); n.addEventListener('pointerleave', end); n.addEventListener('pointercancel', end);
    };
    hold('btn-left', doLeft, 90); hold('btn-right', doRight, 90);
    hold('btn-rot', function () { doRot(1); });
    hold('btn-drop', doHardDrop);
    el('btn-pause').addEventListener('click', function () { unlockAudio(); togglePause(); });
    el('btn-mute').addEventListener('click', function () { unlockAudio(); prefs.mute = !prefs.mute; savePrefs(); updatePanels(); });
    el('btn-ghost').addEventListener('click', function () { prefs.ghost = !prefs.ghost; savePrefs(); updatePanels(); });
    el('next').addEventListener('click', function () { setNextVisible(!prefs.nextVisible); });
    window.addEventListener('resize', fitHud);
    el('btn-start').addEventListener('click', startGame);
    el('btn-resume').addEventListener('click', togglePause);
    el('btn-stop').addEventListener('click', stopGame);
    el('btn-speed').addEventListener('click', function () { unlockAudio(); cycleSpeed(); });
    el('btn-info').addEventListener('click', function () { toggleInfo(); });
    el('btn-info-close').addEventListener('click', function () { toggleInfo(false); });
    el('info-modal').addEventListener('click', function (e) { if (e.target === el('info-modal')) toggleInfo(false); });
    var bd = el('btn-down');
    bd.addEventListener('pointerdown', function (e) { e.preventDefault(); unlockAudio(); touchDown = true; });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { bd.addEventListener(ev, function () { touchDown = false; }); });
    // swipe on canvas: horizontal steer, tap spin, swipe-down hard drop
    var sx = 0, sy = 0, st = 0;
    cv.addEventListener('pointerdown', function (e) { unlockAudio(); sx = e.clientX; sy = e.clientY; st = Date.now(); });
    cv.addEventListener('pointerup', function (e) {
      if (e.pointerType === 'mouse') { togglePause(); return; }
      var dx = e.clientX - sx, dy = e.clientY - sy, adx = Math.abs(dx), ady = Math.abs(dy);
      if (Math.max(adx, ady) < 12 && Date.now() - st < 300) { doRot(1); return; }
      if (ady > 40 && ady > adx * 1.4) { if (dy > 0) doHardDrop(); return; }
      if (adx > 24) { (dx > 0 ? doRight : doLeft)(); }
    });
    document.addEventListener('touchmove', function (e) { if (e.target === cv) e.preventDefault(); }, { passive: false });
    // install
    var deferred = null;
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; el('install-chip').style.display = ''; });
    el('install-chip').addEventListener('click', function () { if (deferred) { deferred.prompt(); deferred = null; el('install-chip').style.display = 'none'; } });
    window.addEventListener('appinstalled', function () { el('install-chip').style.display = 'none'; });
    // offline badge
    var badge = function () { el('offline-badge').style.display = navigator.onLine ? 'none' : ''; };
    window.addEventListener('online', badge); window.addEventListener('offline', badge); badge();
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { });
    }
  }

  function init() {
    loadPrefs(); best = prefs.best;
    cv = el('well'); ctx = cv.getContext('2d');
    nextCv = el('next'); nextCtx = nextCv.getContext('2d');
    well = E.emptyWell(); queue = []; refill();
    score = 0; rows = 0; level = E.levelFor(0); phase = 'ready';
    spawnNext(); phase = 'ready';
    updatePanels();
    showStart();
    fitHud();
    if (!audioUnlocked) { var n = el('tap-sound'); if (n) n.style.display = ''; }
    bind();
    requestAnimationFrame(step);
  }
  document.addEventListener('DOMContentLoaded', init);
})();
