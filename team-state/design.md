# Technical Design — Neon Tetris PWA

## Module contracts

### M-A — Drop Engine (owns arch component A; serves C1/C2, W1/W2)
Responsibility: falling-piece truth MUST remain the single collision oracle for moves, spins, ghost, and locks.
- `spawnPiece(queueSeed) -> ActivePiece | TopOut`: inputs next queue value; outputs spawned piece at top-center; error `TopOut` when spawn cells collide (maps to B.checkTopOut → game over). Traces to W1 step 2/4 + C1/C4.
- `tryMove(piece, well, dx, dy) -> ActivePiece`: MUST return moved piece iff all cells in bounds and empty, else MUST return the unchanged piece. No error case; blocked moves are silent by design. Traces to W1 + C1.
- `tryRotate(piece, well, dir) -> ActivePiece`: MUST attempt base rotation then wall-nudge offsets in fixed order [0, -1, +1, -2, +2] on x (plus one向上 shrink for I-piece near floor per SRS-lite table in code comments); MUST return first fitting pose else unchanged; MUST never overlap settled cells. Traces to C1 acceptance wall-nudge + W2 failure branch.
- `tickGravity(piece, well, level) -> GravityOutcome`: MUST advance fall by level interval (table §Data shapes); outputs `Fell | Landed`. Traces to C4 level speed + W1 step 3.
- `computeGhost(piece, well) -> GhostCells`: MUST equal the rest cells from repeated down-steps until collision; MUST be recomputed after every move/rotate/lock within the same frame. Traces to literal 1 + C2.
- `hardDrop(piece, well) -> DropResult{cells, distance}`: MUST equal computeGhost cells; distance MUST equal rows travelled. Traces to literal 2 + C2.
- Canonical error shape M-A: `{code: TopOut, afterState: FlowState}` — the only error this module emits.

### M-B — Clear & Progress (owns arch component B; serves C3/C4, W1/W3/W4)
Responsibility: what a lock means MUST be decided here, never in the renderer.
- `detectClears(well) -> RowList`: MUST return every fully occupied row index, sorted ascending, empty when none. Traces to C3 + W3 step 1.
- `collapseWell(well, clearedRows) -> Well`: MUST remove cleared rows, drop rows above straight down preserving column order, fill top with empty rows; MUST be gap-free. Traces to C3 + W3 step 4.
- `scoreFor(clearedCount, level, dropDistance) -> ScoreEvent{points, reasonText}`: MUST follow ladder single(100)×level < double(300)×level < triple(500)×level < fourfold(800)×level plus soft-drop 1/cell + hard-drop 2/cell; reasonText MUST name count + level (audit posture). Traces to C3/C4 + NFR audit.
- `levelFor(totalRows) -> Level{number, gravityMs}`: MUST be floor(totalRows/10)+1 capped at 15; gravity table 800ms→…→~100ms (exact table in Data shapes). Traces to C4 + W1 step 3.
- `checkTopOut(well, spawned) -> FlowState`: MUST return `over` iff spawn collides or any settled cell occupies the hidden spawn rows after lock; else `playing`. Traces to C4 + W1 step 4.
- `celebrationFor(clearedCount) -> CelebrationIntent{scale, shake, cue, glowMs}`: MUST map 0→none, 1→pop, 2→boom+small shake, 3→mega+fanfare, 4→eruption (shockwave + heavy shake + fanfare + 2s rim glow). Traces to literal 3 + S-W3 ladder.
- Canonical error shape M-B: `{code: IllegalClear{rows}, afterState}` — emitted only if collapse is asked with non-full rows; behavior MUST be no-op + log-free silent return (renderer never triggers it by construction).

### M-C — Shell & Memory (owns arch component C; serves C5/S1/S2/S3, W4/W5/W6)
Responsibility: the playable surface MUST render A+B facts and MUST never invent rules.
- `intakeNormalize(rawEvent) -> Intent`: MUST map keys (arrows/Z/X/space/P/R/M/G), buttons, and swipes to the closed intent set {left,right,softDrop,hardDrop,rotCW,rotCCW,hold,pause,restart,mute,ghost}; MUST drop unknowns; MUST set repeat-while-held only for left/right/softDrop. Traces to W1/W2/W6 + arch intake edge.
- `renderFrame(frameFacts) -> void`: MUST paint well + active + ghost (when pref on) + next/hold + score strip + particles overlay; MUST NOT gate input on effects (input stays live under particles). Traces to literal 4 + S-W1/S-W2.
- `playCue(cueName, muted) -> void`: MUST be silent when muted or before first gesture; MUST map move/spin/drop/lock/clear1..4/level/over to synthesized cues; MUST never throw when audio is blocked (silent continue + "tap for sound" hint). Traces to literal 8 + W6.
- `prefsGet(key) -> Value|Default`: keys {best, mute, ghost}; MUST return safe default (0/off/on) on missing/corrupt. Traces to literal 5 + W4 failure branch.
- `prefsPut(key, value) -> void`: MUST persist best only when beaten (compare-and-swap in business terms); MUST never throw to gameplay (queue retry next game over). Traces to S2/W4.
- `serveShell(connectivity) -> ShellResult`: MUST serve cached shell offline on repeat visits; MUST serve the kind "connect once" note (never blank) on first-ever offline visit. Traces to literal 9 + W5/C5.
- Canonical error shape M-C: `{code: StoreUnavailable | AudioBlocked | CacheMissFirstVisit, fallback: safeDefault | silent | kindNote}` — every case has a specified visible fallback, never a crash card mid-run.

## Data shapes
- `Well`: 10 cols × 20 visible rows (+2 hidden spawn rows, stored not shown). Required: `cells[22][10]: Empty | Hue`. Validation: writes only through lock/collapse; reads bounds-checked. Stored (ephemeral in-memory per run).
- `ActivePiece`: required `kind: I|O|T|S|Z|J|L`, `rot: 0..3`, `x, y`, `hue`. Validation: spawn pose from fixed table; rot transitions via M-A offsets. Stored ephemeral; derived spawn from queue.
- `GhostCells`: required `cells[]`, `hue`, `visible: bool`. Validation: MUST equal hardDrop cells when visible (invariant checked in test seam). Derived always, never stored.
- `HeldPiece / NextQueue`: required `kind | null` (hold), `queue[3]` preview. Validation: hold swap once per piece (can't double-hold before lock). Stored ephemeral.
- `ScoreState`: required `score, level, rows, best, timeMs`. Validation: score only grows via ScoreEvent; level from levelFor; best = max(best, score) at game over. Score/level/rows ephemeral; best durable device-local.
- `Prefs`: required `mute: bool (default false-but-silent-until-gesture)`, `ghost: bool (default true)`. Durable device-local.
- `ClearedRows`: required `indexes[]` ascending; validation: every indexed row full pre-collapse. Derived per lock.
- `ScoreEvent`: required `points, reasonText ("Single ×L2 +40" style), level`. Derived per lock/drop.
- `CelebrationIntent`: required `scale: none|pop|boom|mega|eruption`, `shakePx, cueName, glowMs, floaters[]`. Derived per clear; consumed by renderer overlay only.
- `FlowState`: required `phase: ready|playing|paused|over`, `overReason: TopOut|null`. Stored ephemeral; transitions only via B.checkTopOut + intents.
- `GravityTable`: level 1..15 → ms [800,720,630,550,470,400,330,270,220,180,150,130,110,100,90]. Stored as constant; validation: monotonic non-increasing.
- `FrameFacts` (M-C input): required `well, active, ghost, next, held, score, celebration, floaters`. Derived per frame; never persisted.

## UI contract binding
- Literal 1 (ghost pixel-true + wall-nudge): served by M-A.computeGhost + tryRotate offsets; backed by GhostCells; error path = W2 failure snap-to-corrected (no floating ghost).
- Literal 2 (hard drop lands on ghost): served by M-A.hardDrop == computeGhost invariant; backed by DropResult; scoring via M-B.scoreFor drop slice.
- Literal 3 (1/2/3/4 distinct; 4 = shockwave+shake+fanfare): served by M-B.celebrationFor + S-W3 ladder; backed by CelebrationIntent; 4-row error path = none (scale guaranteed).
- Literal 4 (celebration never eats input): served by M-C.renderFrame overlay isolation + M-A intake path independent of particles; backed by FrameFacts separation.
- Literal 5 (best visible pre-move + survives reload): served by M-C.prefsGet(best) at open + prefsPut at over; backed by ScoreState.best; error path = corrupt→0 silent (W4).
- Literal 6 (pause tick-for-tick): served by M-A.tickGravity freeze + M-C overlay; backed by FlowState.paused; resume restores exact tick.
- Literal 7 (touch fully playable, no scroll): served by M-C.intakeNormalize swipe/button map + touch-action none on well; backed by Intent set; error path = unknown gesture dropped.
- Literal 8 (mute silences all; silent-until-gesture): served by M-C.playCue gate; backed by Prefs.mute; error path = AudioBlocked→silent+"tap for sound" (W6).
- Literal 9 (first-ever offline = kind note): served by M-C.serveShell; backed by cached shell presence flag; error path = CacheMissFirstVisit→note card.
- S-W1 run screens: ready (FlowState.ready + START pulse) / playing (renderFrame) / paused (overlay) / over (card with ScoreState) — all served.
- S-W3 eruption ladder + S-W2 comet trail + S-W4 NEW BEST glow: served by CelebrationIntent.scale + floaters; illustrative styling may bend, scale mapping MUST NOT.
- S-W5 install chip/offline badge: served by serveShell + manifest presence; shown only when installable-and-uninstalled / offline respectively.

## Edge cases
- M-A: (1) I-piece spin near floor with no room → MUST stay put, ghost unchanged. (2) 20Hz key repeat during 150ms gravity → MUST queue without dropping taps (>95% honored). (3) Spawn collides while stack in hidden rows → MUST emit TopOut, never a half-spawned piece.
- M-B: (1) 4-row clear at level 12 → MUST still emit eruption + next piece steerable same frame. (2) Double-hold before lock → MUST ignore second hold. (3) collapse asked with a non-full row → MUST no-op (IllegalClear silent).
- M-C: (1) prefs corrupt JSON → MUST default + overwrite on next good run. (2) Audio blocked pre-gesture → MUST silent-play + hint, no error card. (3) First-ever offline → MUST kind note, never blank canvas.

## Test seams
- T-A1 ghost-truth: for 200 random (well, piece) pairs, MUST assert computeGhost == hardDrop.cells. Maps to C2 AC1/AC2.
- T-A2 nudge-safety: for all 7 kinds × 4 rots × wall/stacked poses, MUST assert tryRotate never overlaps settled cells. Maps to C1 AC2.
- T-B1 clear-ladder: singlehanded fixtures for 1/2/3/4 clears MUST assert points ordering single<double<triple<fourfold at fixed level. Maps to C3 AC1.
- T-B2 eruption-distinct: MUST assert celebrationFor(4).scale == eruption with shake > shake(1) and cue != cue(1). Maps to C3 AC2.
- T-B3 non-blocking: during active CelebrationIntent, MUST assert intakeNormalize→tryMove still applies within one frame budget. Maps to C3 AC3.
- T-B4 level/over: 10-row fixture MUST assert level+1 and faster gravity; topped fixture MUST assert over + restart-ready. Maps to C4 AC1/AC2.
- T-C1 best-durable: write-then-read roundtrip MUST assert best survives simulated reload; corrupt fixture MUST assert default 0. Maps to C4 AC3 + S2.
- T-C2 offline: cached-shell fixture MUST assert playable offline; first-ever-offline fixture MUST assert kind note present. Maps to C5 AC1/AC3.
- T-C3 mute/silent: muted + pre-gesture fixtures MUST assert zero audible cues while visuals proceed. Maps to S1/W6.

## Build order
1. M-A collision + spawn + move (T-A2 subset) — deepest testable logic first.
2. M-A rotate nudges + ghost + hardDrop (T-A1, T-A2 full).
3. M-B detect + collapse + score ladder (T-B1).
4. M-B level + topOut + celebration scale (T-B2, T-B4).
5. M-C prefs/best store (T-C1).
6. M-C render well/ghost/pieces + eruption/comet overlays (visual vs T-B3).
7. M-C intake keys + touch (T-B3 input-liveness).
8. M-C sound synth + mute gate (T-C3).
9. Install manifest + icons + offline worker + kind-note shell (T-C2).
10. Wire-up + full-run smoke (all acceptance rows).

## Handoff
- stage: design
- status: ready-for-review
- key decisions:
  - Single collision oracle in M-A reused by ghost/drop/lock.
  - One canonical error shape per module with silent-safe fallbacks.
  - Score/celebration ladder fixed and testable; styling illustrative.
  - Build inside-out: engine → rules → store → render → intake → sound → install.
- open risks:
  - Gravity table top speeds may need playtest tuning (values are constants, semantics fixed).
  - Low-end particle throttle stays open but MUST NOT change scale mapping.
- next agent reads: requirements + architecture + ui-design + this file + decisions, then builds strictly in §Build order.

<!-- gate-result: PASS date=2026-10-02 reviewer=dm-agent-team -->
