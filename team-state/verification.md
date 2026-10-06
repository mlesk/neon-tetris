# Verification — Neon Tetris PWA

## Build
- `node --check engine.js` -> exit 0
- `node --check game.js` -> exit 0
- `python3 -m http.server 8901` + curl all shell files (index.html, styles.css, engine.js, game.js, manifest.webmanifest, sw.js, icon-192.png) -> all HTTP 200
- No build step by design (static no-build bundle per architecture); checks above are the full build.

## Tests
- `node tests.mjs` -> exit 0 (14 passed, 0 failed)
  - T-A1 ghost-truth x200 ok (C2 AC1/AC2: ghost == hardDrop cells)
  - T-A2 nudge-safety ok (C1 AC2: rotate never overlaps)
  - T-B1 ladder + gap-free collapse ok (C3 AC1)
  - T-B2 eruption distinct ok (C3 AC2)
  - T-B3 input live under celebration ok (C3 AC3)
  - T-B4 level + top-out ok (C4 AC1/AC2)
  - T-C1 best compare-and-swap + corrupt-default ok (C4 AC3/S2)
  - T-C2 shell files + manifest + worker ok (C5 AC1/AC2/AC3)
  - T-C3 mute gate ok (S1/W6)

## Acceptance map (requirements -> evidence)
- C1.1 slide promptly within walls: tryMove bounds logic + T-A2 + manual play (arrows).
- C1.2 wall-nudge spin never clips: tryRotate KICKS order + T-A2 all kinds/rots/poses.
- C1.3 rapid taps honored: repeat-while-held only on steer + T-B3 liveness + gravity/input decoupling (game.js step).
- C2.1 ghost updates within one frame: computeGhost per frame in draw + T-A1.
- C2.2 hard drop locks on ghost cells + distance scoring: hardDrop==ghost invariant (T-A1) + doHardDrop +2/cell.
- C2.3 ghost-off drops identically: prefs.ghost gates render only, logic untouched (game.js draw vs hardDrop).
- C3.1 full rows clear, gap-free, ordered rewards: detectClears+collapseWell + T-B1.
- C3.2 4-row eruption distinct: celebrationFor(4)=eruption + T-B2 + erupt() shockwave/shake/fanfare/rim glow.
- C3.3 celebration never eats input: overlay-only particles + pendingCollapse flash with live intake + T-B3.
- C4.1 level every 10 rows quickens: levelFor + gravity table + T-B4 + LEVEL banner.
- C4.2 top-out ends with score+best + one-action restart: checkTopOut + showOver + Space/R/tap restart.
- C4.3 best survives reload: prefs best compare-and-swap + T-C1 + localStorage roundtrip.
- C5.1 offline repeat visit plays: sw.js cache-first SHELL + T-C2 file presence + serve smoke.
- C5.2 home-screen install full-screen: manifest (name/icons/display standalone) + apple-touch-icon + T-C2.
- C5.3 desktop folder plays with no backend: file:// + http both serve static shell (serve smoke 200s, zero backend).

## Gaps
none

## Handoff
- stage: implementation
- status: ready-for-ship
- key decisions:
  - Static bundle, single offline worker, zero backend.
  - Engine pure + tested (14/14); shell renders facts only.
  - Space starts/restarts for arcade feel; sound silent until first gesture.
- open risks:
  - Top gravity speeds may want playtest tuning (constants only).
  - Low-end phones may want particle auto-throttle (scale mapping unchanged).
- next agent reads: none — ship it. Open index.html locally or serve the folder; on phones use Add to Home Screen after one online visit.

## Post-ship tweak 2026-10-06 (full-window follow-ups)
- Panels top-aligned via align-self:flex-start; score/next now sit at top.
- Speed control: engine speedFactor slow 1.6 / normal 1.0 / fast 0.55 applied to gravity interval; segmented control in left panel + keys 1/2/3; choice persisted device-local with safe default.
- Tests: node tests.mjs -> exit 0 (17 passed, incl. T-SPD ladder/default/wiring).
- NEXT toggle: button in NEXT label flips canvas visibility, persisted device-local, safe default visible.
- Tests: node tests.mjs -> exit 0 (18 passed, incl. T-NXT wiring).
- Top 3: engine addScore keeps sorted top 3 with rank; legacy best migrates; board shows TOP 3, game-over card names the rank.
- Tests: node tests.mjs -> exit 0 (23 passed, incl. T-TOP insert/rank/sanitize/wiring).
- UI overhaul: HUD (score/best/level/rows + next corner) above board; hints/ladder/top3 behind ⓘ modal; hold removed; speed cycler in topbar default fast; mouse click pauses; STOP quits to menu.
- Tests: node tests.mjs -> exit 0 (26 passed, incl. T-UI hud/modal/stop/hold-removed/html-shell).
- HUD fit: fitHud caps HUD to well-box width on init/resize; next is borderless 88px, click toggles shape on/off; toggle button removed.
- PWA: CACHE bumped to neon-tetris-v2 for changed shell.
- Tests: node tests.mjs -> exit 0 (26 passed, incl. reworked T-NXT).
- HUD polish: NEXT label removed; hidden state draws faint piece with circle-slash; score/best/level/rows unified at one size with wider gaps.
- Tests: node tests.mjs -> exit 0 (26 passed, incl. reworked T-NXT).
- Title/HUD: brand moved above score as gametitle; next canvas display:block removes baseline gap.
- Tests: node tests.mjs -> exit 0 (26 passed).
- Top row: title 20px left plus compact buttons right, both capped to board width via fitHud; 16px blank row before HUD.
- Tests: node tests.mjs -> exit 0 (26 passed).
- Ship: https://github.com/mlesk/neon-tetris public, Pages legacy build from main root -> https://mlesk.github.io/neon-tetris/ (200).
