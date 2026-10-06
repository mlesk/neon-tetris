# AGENTS.md — Neon Tetris PWA

Guidance for agents working in this repository.

## What this is

A no-build, no-backend Tetris PWA: three static web files plus an offline worker,
installable on phones and playable straight from a folder. Everything is vanilla
JavaScript in an IIFE — no framework, no bundler, no `package.json`.

## Layout

| Path | Role |
|---|---|
| `engine.js` | Pure rules engine (module M-A/M-B). No DOM. Single collision oracle. |
| `game.js` | Shell + rendering + input + sound + prefs (module M-C). Renders engine facts, never invents rules. |
| `index.html` | DOM shell; loads `engine.js` then `game.js` as plain scripts. |
| `styles.css` | All styling. |
| `tests.mjs` | Node test suite. Runs the engine in a `vm` sandbox; also asserts shell wiring by string-matching source files. |
| `sw.js` | Offline-first service worker (cache-first shell). |
| `manifest.webmanifest` | Install metadata. |
| `icon.svg`, `icon-*.png`, `gen_icons.py` | Icons and their generator. |
| `team-state/` | Requirements, design, architecture, decisions, verification, reviews. |

## Commands

```sh
node tests.mjs                 # full test suite (must exit 0)
node --check engine.js         # syntax check
node --check game.js
python3 -m http.server 8901    # manual play test at http://localhost:8901
```

There is no build step. `node --check` plus `node tests.mjs` plus a serve smoke test
is the complete "build" — see `team-state/verification.md`.

## Architecture invariants (do not break)

- **One collision oracle.** `engine.js` owns `collides`/`pieceCells`; ghost, drop,
  rotate, lock, and spawn all go through it. `game.js` must never re-implement
  collision, gravity, scoring, or clearing logic.
- **Dependency direction is inward:** `game.js` → `engine.js`; the engine depends on
  nothing and must stay DOM-free so `tests.mjs` can run it in a sandbox.
- **Facts vs. presentation.** The engine returns data (`{points, reasonText}`,
  `{scale, shake, cue}`, etc.); the shell decides how to render it. Don't add
  rendering or DOM concerns to `engine.js`.
- **Ghost/hard-drop truth:** `computeGhost` cells MUST equal `hardDrop(...).cells`
  (test T-A1). Scoring ladder single < double < triple < TETRIS is fixed.
- **Non-blocking celebration:** cleared-row effects are overlay-only; input intake
  must stay live during them (test T-B3).
- **Silent-safe:** prefer prefs default over errors — missing/corrupt `localStorage`
  yields a safe default, never a broken screen. Audio stays silent until the first
  user gesture and is always gated by `soundOn()` (`prefs.mute` wins).

## Conventions

- Match the existing style: ES5-friendly `var`/`function` in `engine.js` (it must run
  as a classic script and under `vm`), IIFE-wrapped, `'use strict';`.
- `engine.js` exports via the CommonJS guard `if (typeof module !== 'undefined')` and
  sets `globalThis.TetrisEngine`.
- Keep the engine's public surface on the `Engine` object; tests call it directly.
- Section comments in `game.js` use the `// ---------- name ----------` banner form.
- Comment only what needs clarification; the code is intentionally terse.

## Persistence keys (device-local `localStorage`)

`neon-tetris-best`, `neon-tetris-mute`, `neon-tetris-ghost`, `neon-tetris-speed`,
`neon-tetris-next`, `neon-tetris-top3`. Add new prefs through `loadPrefs`/`savePrefs`
with a default from `E.prefDefault` or an explicit fallback, and read them
defensively.

## PWA gotcha

`sw.js` is cache-first with `var CACHE = 'neon-tetris-v1'`. **Bump that version
string whenever shell files change** (`index.html`, `styles.css`, `engine.js`,
`game.js`, `*.png`, etc.), otherwise returning visitors keep the stale cached copy.
Keep the `SHELL` list in sync with the files the app actually needs offline, and
update `manifest.webmanifest` if you add icons.

## Tests

- Tests are named by design seam (`T-A1`, `T-B1`, `T-C2`, `T-SPD`, `T-TOP`, …) and
  many assert shell wiring by grepping `game.js`/`index.html` for identifiers — so
  renaming a DOM id, function, or pref key used in those assertions will fail tests.
  Update `tests.mjs` in the same change when you rename such a symbol.
- New engine behavior needs an engine unit test; new shell wiring needs a wiring
  assertion. Keep the suite green before finishing (`node tests.mjs`).

## Docs

`team-state/` holds the requirements → design → architecture → verification chain.
`decisions.md` is append-only and orchestrator-owned. After changing behavior,
update `team-state/verification.md` (it tracks test counts and the acceptance map)
rather than rewriting the historic records.
