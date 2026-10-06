# Architecture — Neon Tetris PWA

## Stack
- Stay on repo stack: repo is empty greenfield with no manifests, so no existing stack to honor (cites requirements Target: desktop local + phone install).
- YOLO call: plain static web trio (markup + style + script with no build step) plus install manifest plus offline worker. Rationale logged: smallest runtime that plays from a folder double-click and installs on phones with zero tooling; single device-local store; no new infra.
- New pieces: exactly one platform piece (offline worker for C5). No second platform piece (no backend, no push, no store binary) per out-of-scope 1/2/3/8.

## Component map
Three components, monolith-first in one static bundle, dependency direction inward to the rules:

- A — Drop Engine (owns C1 + C2). Responsibility: falling-piece truth — positions, spins with wall nudges, gravity ticks, ghost rest-spot math, lock decisions. Depends on nothing; publishes settled-stack + active-piece + ghost-spot facts.
  - Covers: C1 Falling-piece steering (W1), C2 Landing preview and instant drop (W2).
- B — Clear & Progress (owns C3 + C4). Responsibility: what a lock means — full-row detection, clear ordering single<double<triple<fourfold, score/level/rows accounting, top-out detection, celebration scale selection. Consumes A's lock facts; emits score events + celebration intents + flow state (ready/playing/paused/over).
  - Covers: C3 Row clearing with explosive reward (W3), C4 Score, levels, and game flow (W1/W4).
- C — Shell & Memory (owns C5 + S1 + S2 + S3). Responsibility: the playable surface — rendering the well/ghost/pieces/particles, sound pairing with mute, touch + key intake, device-local remembering of best/mute/ghost prefs, offline-first loading with install icon. Consumes A+B facts; never invents rules.
  - Covers: C5 Installable offline-ready play (W5), S1 Sound and motion feel, S2 Best-score memory, S3 Touch play (W6).
- Direction: C renders A+B; B consumes A; A standalone. No cycles.

## Boundary contracts
- Player intake edge (owner: C Shell & Memory → A/B): shape-level contract — normalized intents (steer, spin, soft-drop, hard-drop, hold, pause, restart, mute, ghost-toggle) with at-most-once per press plus repeat-while-held for steer; unknowns dropped silently. Cites W1/W2/W6.
- Render edge (owner: C): shape-level contract — frame facts (well cells, active cells, ghost cells, celebration intent with row-count scale, floating-text events) rendered at display rate; input never waits on effects. Cites C3/W3 non-blocking celebration.
- Sound edge (owner: C): shape-level contract — event → named cue mapping (move/spin/drop/lock/clear-1..4/level/top-out) gated by a single mute flag; silent-first until first user gesture. Cites S1/W6.
- Remembered-store edge (owner: C): shape-level contract — get/put of small named prefs (best, mute, ghost-visible) with missing-or-corrupt → safe default, never an error card. Cites W4/S2.
- Offline/install edge (owner: C): shape-level contract — first-visit caching of the game shell; offline reopen serves cached shell; first-ever offline visit serves a kind note, never blank. Cites C5/W5.
- Clock edge (owner: A for gravity, C for animation): shape-level contract — tick-driven gravity owned by A (level → interval), frame-driven motion owned by C; pause freezes both together. Cites W1 pause branch + C4 level speed.

## Persistence class
Remembered nouns and their class (single device-local store when a store is needed at all; no remote store per out-of-scope 1/2/3):
- Best score: durable device-local, written on game over when beaten, read before first move; transactional boundary is one run's end (compare-and-swap in business terms). Cites C4/S2/W4.
- Mute choice + ghost-visible choice: durable device-local prefs, written on toggle, read on open. Cites S1/C2.
- Active run (well stack, falling piece, score, level, rows): ephemeral in-memory only, discarded on reload; a reload never resumes a mid-run stack, only the best. Cites NFR freshness (clean well per run).
- Game files for offline: device cache of the shell, refreshed on next online visit. Cites C5.
- No relational need: no shared nouns across players, no queries beyond single-key reads (YOLO single-store default satisfied by zero-backend + device store).

## Cross-cutting
- Errors: owner B for rule errors (illegal spin → stay-put nudge), owner C for surface errors (missing store/cache → safe default / kind note). Mechanism class: silent-safe-defaults with no error cards during play; only first-ever-offline shows the note. Crosses A→B→C.
- Validation: owner A (board bounds + collision truth), owner B (row-full truth, top-out truth). Mechanism class: single collision oracle in A reused by ghost (C2), lock, and clear. Crosses A→B.
- Config/prefs: owner C. Mechanism class: three named flags with defaults (best=0, mute=off-but-silent-until-gesture, ghost=on). Crosses C→render/sound.
- Secrets: none. No tokens, no keys, nothing to rotate (out-of-scope 1/2 honored).
- Authn/authz: none. Single anonymous player on the device (out-of-scope 1 honored).
- Logging: owner C, mechanism class: no event collection at all (out-of-scope 7 honored); score reasons shown on-screen per audit posture, not shipped anywhere.

## Deployment topology
- Processes: one static bundle (no running processes). Hosts: any static file host OR a plain folder double-click on desktop (cites C5 desktop-local acceptance). Environments: single build, no env differences; connection-on vs connection-off handled by cached shell, not by separate deploys.
- Install: manifest + icon set + offline worker turn the same bundle into a home-screen game (full-screen, named icon) on phones. Desktop ignores install and plays as a page.
- Config differences: none between environments.

## NFR realization
- Freshness (clean well + current best each run): mechanism — run state constructed fresh on start from fixed spawn rules; best read once at open from device store. Cites requirements NFR freshness.
- Loss-tolerance (never blank, never wiped best): mechanism — cached shell serves offline reopens; missing/corrupt store → defaults; missed refresh keeps last shell with no error card except first-ever-offline note. Cites NFR loss-tolerance + W4/W5 failure branches.
- Performance (near 60fps, input-first): mechanism — fixed-timestep gravity decoupled from frame rendering; celebrations are particle overlays that never gate the next piece's intake; no per-frame allocation in hot loop. Cites NFR performance + W3 non-blocking.
- Audit (every score change visibly reasoned): mechanism — every B score event emits an on-screen reason (drop-distance ticks, row-count fanfare text, level-up banner) mirrored in board counts. Cites NFR audit.

## Handoff
- stage: architecture
- status: ready-for-review
- key decisions:
  - Static no-build bundle with single offline worker as the only platform piece.
  - Three components with strict direction C→B→A, rules never in the renderer.
  - Single collision oracle in A reused by ghost, lock, clear.
  - Device-local durable for best/prefs, ephemeral for runs, cached shell for offline.
- open risks:
  - Ghost math and wall-nudge math must share the oracle or they drift.
  - Particle overlays must stay off the input path at high levels.
- next agent reads: team-state/requirements.md + team-state/architecture.md + team-state/decisions.md, then designs the experience without contradicting components.

<!-- gate-result: PASS date=2026-10-02 reviewer=dm-agent-team -->
