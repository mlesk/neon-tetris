/* M-A + M-B pure logic. No DOM. Single collision oracle. */
(function (root) {
  'use strict';
  var COLS = 10, ROWS = 20, HIDDEN = 2, TOTAL = ROWS + HIDDEN;
  var GRAVITY = [800, 720, 630, 550, 470, 400, 330, 270, 220, 180, 150, 130, 110, 100, 90];
  var SHAPES = {
    I: [[0, 1], [1, 1], [2, 1], [3, 1]],
    O: [[1, 0], [2, 0], [1, 1], [2, 1]],
    T: [[1, 0], [0, 1], [1, 1], [2, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    J: [[0, 0], [0, 1], [1, 1], [2, 1]],
    L: [[2, 0], [0, 1], [1, 1], [2, 1]]
  };
  var HUES = { I: 'cyan', O: 'gold', T: 'violet', S: 'lime', Z: 'rose', J: 'azure', L: 'tangerine' };
  var KINDS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  var KICKS = [0, -1, 1, -2, 2];
  var LINE_POINTS = [0, 100, 300, 500, 800];
  var SPEED_FACTORS = { slow: 1.6, normal: 1.0, fast: 0.55 };

  function rotCell(x, y, rot, kind) {
    if (kind === 'O') return [x, y];
    var cx = x, cy = y;
    for (var i = 0; i < ((rot % 4) + 4) % 4; i++) {
      var nx = 3 - cy, ny = cx;
      cx = nx; cy = ny;
    }
    return [cx, cy];
  }

  function pieceCells(piece) {
    var base = SHAPES[piece.kind], out = [];
    for (var i = 0; i < base.length; i++) {
      var r = rotCell(base[i][0], base[i][1], piece.rot, piece.kind);
      out.push([piece.x + r[0], piece.y + r[1]]);
    }
    return out;
  }

  function emptyWell() {
    var w = [];
    for (var y = 0; y < TOTAL; y++) { w.push(new Array(COLS).fill('')); }
    return w;
  }

  function collides(well, cells) {
    for (var i = 0; i < cells.length; i++) {
      var x = cells[i][0], y = cells[i][1];
      if (x < 0 || x >= COLS || y >= TOTAL) return true;
      if (y < 0) continue;
      if (well[y][x]) return true;
    }
    return false;
  }

  function cellsEqual(a, b) {
    if (a.length !== b.length) return false;
    var sa = a.map(String).sort().join('|'), sb = b.map(String).sort().join('|');
    return sa === sb;
  }

  var Engine = {
    COLS: COLS, ROWS: ROWS, HIDDEN: HIDDEN, GRAVITY: GRAVITY, KINDS: KINDS, HUES: HUES,
    emptyWell: emptyWell,
    pieceCells: pieceCells,
    collides: collides,
    spawnPiece: function (well, kind) {
      var p = { kind: kind, rot: 0, x: 3, y: 0, hue: HUES[kind] };
      if (collides(well, pieceCells(p))) return { topOut: true, piece: p };
      return { topOut: false, piece: p };
    },
    tryMove: function (piece, well, dx, dy) {
      var q = { kind: piece.kind, rot: piece.rot, x: piece.x + dx, y: piece.y + dy, hue: piece.hue };
      if (collides(well, pieceCells(q))) return piece;
      return q;
    },
    tryRotate: function (piece, well, dir) {
      var nr = (((piece.rot + dir) % 4) + 4) % 4;
      for (var k = 0; k < KICKS.length; k++) {
        var q = { kind: piece.kind, rot: nr, x: piece.x + KICKS[k], y: piece.y, hue: piece.hue };
        // I-piece floor nudge: allow one upward shift near floor
        var cands = [q];
        if (piece.kind === 'I') cands.push({ kind: piece.kind, rot: nr, x: piece.x + KICKS[k], y: piece.y - 1, hue: piece.hue });
        for (var c = 0; c < cands.length; c++) {
          if (!collides(well, pieceCells(cands[c]))) return cands[c];
        }
      }
      return piece;
    },
    computeGhost: function (piece, well) {
      var q = { kind: piece.kind, rot: piece.rot, x: piece.x, y: piece.y, hue: piece.hue };
      while (!collides(well, pieceCells({ kind: q.kind, rot: q.rot, x: q.x, y: q.y + 1, hue: q.hue }))) q.y++;
      return pieceCells(q);
    },
    hardDrop: function (piece, well) {
      var q = { kind: piece.kind, rot: piece.rot, x: piece.x, y: piece.y, hue: piece.hue };
      var d = 0;
      while (!collides(well, pieceCells({ kind: q.kind, rot: q.rot, x: q.x, y: q.y + 1, hue: q.hue }))) { q.y++; d++; }
      return { cells: pieceCells(q), piece: q, distance: d };
    },
    lockPiece: function (well, piece) {
      var cells = pieceCells(piece), nw = well.map(function (r) { return r.slice(); });
      for (var i = 0; i < cells.length; i++) {
        var x = cells[i][0], y = cells[i][1];
        if (y >= 0 && y < TOTAL && x >= 0 && x < COLS) nw[y][x] = piece.hue;
      }
      return nw;
    },
    detectClears: function (well) {
      var rows = [];
      for (var y = 0; y < TOTAL; y++) {
        var full = true;
        for (var x = 0; x < COLS; x++) if (!well[y][x]) { full = false; break; }
        if (full) rows.push(y);
      }
      return rows;
    },
    collapseWell: function (well, cleared) {
      if (!cleared.length) return well.map(function (r) { return r.slice(); });
      var set = {}, i;
      for (i = 0; i < cleared.length; i++) set[cleared[i]] = true;
      var kept = [];
      for (var y = 0; y < TOTAL; y++) if (!set[y]) kept.push(well[y].slice());
      while (kept.length < TOTAL) kept.unshift(new Array(COLS).fill(''));
      return kept;
    },
    scoreFor: function (clearedCount, level, dropDistance) {
      var pts = LINE_POINTS[clearedCount] * level + (dropDistance || 0);
      var names = ['No clear', 'Single', 'Double', 'Triple', 'TETRIS'];
      return { points: pts, reasonText: names[clearedCount] + ' xL' + level + (dropDistance ? ' +' + dropDistance : '') };
    },
    levelFor: function (totalRows) {
      var n = Math.min(15, Math.floor(totalRows / 10) + 1);
      return { number: n, gravityMs: GRAVITY[n - 1] };
    },
    speedFactor: function (name) {
      return SPEED_FACTORS[name] || SPEED_FACTORS.normal;
    },
    checkTopOut: function (well, spawned) {
      if (spawned && spawned.topOut) return 'over';
      for (var y = 0; y < HIDDEN; y++) for (var x = 0; x < COLS; x++) if (well[y][x]) return 'over';
      return 'playing';
    },
    celebrationFor: function (count) {
      var m = {
        0: { scale: 'none', shake: 0, cue: 'none', glowMs: 0 },
        1: { scale: 'pop', shake: 0, cue: 'clear1', glowMs: 200 },
        2: { scale: 'boom', shake: 5, cue: 'clear2', glowMs: 500 },
        3: { scale: 'mega', shake: 9, cue: 'clear3', glowMs: 900 },
        4: { scale: 'eruption', shake: 16, cue: 'clear4', glowMs: 2000 }
      };
      return m[count] || m[0];
    },
    cellsEqual: cellsEqual,
    prefDefault: function (key) {
      if (key === 'best') return 0;
      if (key === 'mute') return false;
      if (key === 'ghost') return true;
      return null;
    },
    bestAfter: function (prevBest, score) {
      prevBest = (typeof prevBest === 'number' && prevBest >= 0) ? prevBest : 0;
      return score > prevBest ? score : prevBest;
    },
    addScore: function (prevList, score) {
      var list = Array.isArray(prevList) ? prevList.filter(function (n) { return typeof n === 'number' && n > 0; }).sort(function (a, b) { return b - a; }).slice(0, 3) : [];
      score = (typeof score === 'number' && score > 0) ? Math.floor(score) : 0;
      var rank = 0;
      if (score > 0 && (list.length < 3 || score > list[list.length - 1])) {
        var i = 0;
        while (i < list.length && list[i] >= score) i++;
        list.splice(i, 0, score);
        list = list.slice(0, 3);
        rank = i + 1;
      }
      return { list: list, rank: rank };
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  root.TetrisEngine = Engine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
