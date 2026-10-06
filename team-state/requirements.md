# Requirements — Neon Tetris PWA

## Target
An arcade-quality falling-block puzzle game that plays instantly on desktop browsers and installs on phones as a home-screen game for short joyful sessions.

## User & Outcome
- User: a casual player with minutes to spare who loves arcade feel, juicy feedback, and one-more-try challenge on phone or desktop.
- Single most important outcome (O1): the player feels arcade delight within 30 seconds of opening and keeps chasing a better score through fast, fair, readable play.
- Done statement (observable): a first-time visitor can start a game in one tap or keypress, steer and drop pieces with keys and touch, see where pieces will land, clear rows to trigger visible rewards, and after game over can restart instantly with their best score still shown.

## Out-of-scope
1. Accounts, sign-in, profiles, or named player identity.
2. Payments, prizes, paid unlocks, or billing.
3. Online matchmaking, live opponents, or shared rooms.
4. Chat, comments, feeds, or community spaces.
5. Moves of past records from prior games or imports.
6. Multiple language editions or locale switching.
7. Tracking dashboards or behavior views of any kind.
8. Native store packaging beyond the installable web game (no separate phone binaries).

## Capabilities

### Core

#### C1 — Falling-piece steering
- Trigger: a new piece appears at the top of the well and begins to fall.
- Inputs: left / right / down nudges, rotate left / right, pause and restart intents from keys or touch.
- Outputs: piece visibly moves, spins with wall nudges when tight, locks into the stack when it can no longer fall.
- Success criteria: steering feels instant (no missed taps), rotation never traps a piece unfairly, locked pieces match what was shown.

#### C2 — Landing preview and instant drop
- Trigger: a falling piece is active on the board.
- Inputs: current piece shape, spin, position, plus the settled stack below.
- Outputs: a faint outline on the settled stack showing exactly where the piece would rest; a hard-drop action that slams the piece there at once.
- Success criteria: preview always matches the true rest spot; dropping never lands elsewhere; preview can be hidden by the player.

#### C3 — Row clearing with explosive reward
- Trigger: locked pieces complete one or more horizontal rows.
- Inputs: the settled stack with full rows, count of rows cleared at once (1–4).
- Outputs: rows flash, burst into particles with screen shake scaled to row count, score jumps with floating text, special fanfare and slow glow for 4-row clears.
- Success criteria: every full row clears; single vs double vs triple vs fourfold rewards are visibly and audibly distinct; stacked multi-row clears feel bigger than singles.

#### C4 — Score, levels, and game flow
- Trigger: the player starts, pauses, tops out, or restarts a run.
- Inputs: start / pause / restart intents, rows cleared, drop distance, time survived, level number.
- Outputs: running score, level, rows count, next-piece view, hold-piece view, game-over card with score plus best, instant restart.
- Success criteria: scoring rewards drops and bigger clears; level speeds up falls fairly; best score survives a reload; game over triggers only when new pieces have no room.

#### C5 — Installable offline-ready play
- Trigger: the player opens the game from a browser or from a home-screen icon.
- Inputs: open-from-browser intent, add-to-home-screen intent, with or without a live connection after first visit.
- Outputs: full game playable after first visit even with flaky or missing connection; home-screen icon with splash look; desktop local-file play with no hosted backend needed.
- Success criteria: second visit loads and plays with connection off; icon plus name appear when installed; desktop folder opens and plays without setup.

### Supporting

#### S1 — Sound and motion feel
- Trigger: the player acts (move, spin, drop, clear) or toggles sound.
- Inputs: game events plus mute / unmute intent.
- Outputs: clicks, thuds, whooshes, fanfares, background pulse that respects mute; motion never blocks input.
- Success criteria: mute silences everything; no event sound lags behind its visual by a noticeable beat.

#### S2 — Best-score memory
- Trigger: a run ends or a new run begins.
- Inputs: just-finished score, stored best from prior visits.
- Outputs: updated best shown on board and game-over card, kept across reloads on the same device.
- Success criteria: best never resets on refresh; ties keep the old best; a fresh device starts at zero.

#### S3 — Touch play
- Trigger: the player uses a phone or touch screen.
- Inputs: swipes to steer, tap to spin, swipe-down or button to drop, on-screen buttons for hold and pause.
- Outputs: same moves as keys, sized for thumbs, with no page scroll during play.
- Success criteria: a full game is winnable by touch alone; no gesture scrolls the page mid-game.

### Deferred

#### D1 — Head-to-head contests
- Trigger: a future request to compete live.
- Inputs: deferred.
- Outputs: deferred.
- Success criteria: deferred until solo delight (O1) is proven.

#### D2 — Daily seeds and challenges
- Trigger: a future request for same-board daily runs.
- Inputs: deferred.
- Outputs: deferred.
- Success criteria: deferred until scoring and levels feel right.

#### D3 — Replays and share clips
- Trigger: a future request to replay or share runs.
- Inputs: deferred.
- Outputs: deferred.
- Success criteria: deferred until core game earns return visits.

## Workflows

### W1 — Play a run (C1 + C4)
1. Player presses start (tap, click, or key).
2. Pieces fall one by one; player steers with arrows or swipes, spins with up / Z / X or tap, soft-drops with down.
3. Pieces lock; score ticks for drops; level rises every 10 rows and falls quicken.
4. Stack reaches the top with no room for a new piece → game-over card shows score plus best → one key/tap restarts.
5. Failure branch: if input repeats too fast, moves queue without loss; if the player pauses, the fall freezes and resumes exactly.

### W2 — Aim with preview and slam (C2)
1. While a piece falls, a ghost outline marks its rest spot on the stack.
2. Player steers/spins; ghost updates live to match the true rest spot.
3. Player taps space / drop button → piece slams to the ghost spot with dust burst and locks.
4. Player may hide the ghost in settings; drops then behave identically minus the outline.
5. Failure branch: if the rest spot is blocked mid-spin by a wall nudge, the ghost snaps to the corrected spot, never to a floating spot.

### W3 — Clear rows with bang (C3)
1. Locked stack completes ≥1 row.
2. Full rows flash white, then burst into shards scaled to count (1 = pop, 2 = boom, 3 = mega, 4 = screen-shaking eruption with rainbow shockwave).
3. Floating score text pops; level/rows update; fanfare plays scaled to count.
4. Stack above falls into the gap without overlap or holes.
5. Failure branch: if four rows clear during high speed, the celebration never blocks the next piece; play continues under the particles.

### W4 — Keep a best across visits (C4 + S2)
1. Run ends → game compares score to stored best on the device.
2. Higher score replaces best at once; card shows "NEW BEST" glow.
3. Player reloads days later → best still shown before the first move.
4. Failure branch: if stored best is missing or unreadable, best shows 0 without error and the next good run writes it fresh.

### W5 — Install and play offline (C5)
1. Player visits once with connection; game files plus icon settle on the device.
2. Player adds to home screen (phone) or keeps the local folder (desktop).
3. Player reopens with connection off → game starts and plays fully.
4. Failure branch: first-ever visit with no connection shows a friendly "connect once to load" note instead of a blank screen.

### W6 — Feel and hush (S1 + S3)
1. Every move, spin, drop, and clear pairs a look with a sound.
2. Player toggles mute → all sound stops, visuals continue unchanged.
3. On touch screens, buttons and swipes mirror keys with no page scroll.
4. Failure branch: if sound cannot start (browser block), play continues silent with no error card; first tap enables sound.

### Cross-capability flows
- X1 (W1 → W2 → W3): steer → aim with ghost → slam → rows burst and score climbs.
- X2 (W3 → W1 → W4): bigger clears → faster levels → game over → best updates.
- X3 (W5 → W1 → W6): offline open → instant run → full feel with or without sound.

## Acceptance criteria

### C1 — Falling-piece steering
- Given a fresh run, when the player holds left or right, then the piece slides promptly and stays within the well walls. [Traces to O1]
- Given a piece against a wall or stack, when the player spins, then it nudges into the nearest fitting spin or stays put without clipping through settled blocks. [Traces to O1]
- Given a fast fall, when the player taps keys or buttons rapidly, then no more than one in twenty taps is lost and locked spots match shown spots. [Traces to O1]

### C2 — Landing preview and instant drop
- Given an active piece, when the stack below changes, then the ghost outline updates within one frame to the exact rest cells. [Traces to O1]
- Given an active piece with ghost on, when the player hard-drops, then the piece locks exactly on the ghost cells and drop points match distance fallen. [Traces to O1]
- Given the ghost toggle off, when the player drops, then the piece still lands on the true rest cells with identical scoring. [Traces to O1]

### C3 — Row clearing with explosive reward
- Given 1, 2, 3, or 4 full rows, when the lock settles, then those rows clear, rows above fall straight down with no gaps, and score follows single < double < triple < fourfold ordering. [Traces to O1]
- Given a 4-row clear, when it fires, then a distinct eruption (shockwave plus shake plus fanfare) plays that singles never trigger. [Traces to O1]
- Given any clear during fast play, when particles play, then the next piece is already steerable with no input eaten by the celebration. [Traces to O1]

### C4 — Score, levels, and game flow
- Given a new run, when the player clears 10 rows, then level rises by one and fall speed quickens while steering stays fair. [Traces to O1]
- Given a topped-out well, when a new piece has no room, then the game ends at once with score plus best shown and restart ready in one action. [Traces to O1]
- Given a finished run with a new high, when the player reloads and returns, then the best shown equals that high. [Traces to O1]

### C5 — Installable offline-ready play
- Given a first visit with connection, when the player returns with connection off, then the game loads and a full run is playable. [Traces to O1]
- Given a phone browser, when the player installs to home screen, then an icon plus name launches the game full-screen without browser chrome. [Traces to O1]
- Given the desktop folder with no hosted backend, when the player opens the start page, then the game plays fully. [Traces to O1]

## Non-functional posture
- Freshness: each run starts from a clean well with current best shown; no stale stack ever leaks into a new game.
- Loss-tolerance: a lost connection, reload, or crash never wipes the stored best and never leaves a blank screen on reopen.
- Performance: motion holds near 60 frames per second on an ordinary laptop and stays input-first on phones.
- Audit: every score change has a visible reason (drop distance, row count, level) shown as floating text or board counts.

## Handoff
- stage: requirements
- status: ready-for-review
- key decisions:
  - Single casual player and single delight outcome (O1) with 30-second fun gate.
  - Five core capabilities covering steering, ghost plus drop, explosive clears, score plus flow, installable offline play.
  - Eight out-of-scope items deferring accounts, payments, live opponents, chat, imports, locales, tracking views, store binaries.
  - Touch, sound feel, and best-score memory kept as supporting, not core.
- open risks:
  - Explosion joy must never eat inputs at high speed.
  - Ghost must stay pixel-true under wall nudges.
  - Offline first-visit with no connection needs a kind note, not a blank page.
- next agent reads: this file plus team-state/decisions.md, then shapes the game structure without adding implementation detail.

<!-- gate-result: PASS date=2026-10-02 reviewer=dm-agent-team -->
