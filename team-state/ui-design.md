# UI Design — Neon Tetris PWA

## Experience POV
Midnight arcade volcano: a dark glass well on a neon-grid horizon where every lock thuds and every clear erupts. It optimizes for one emotion — gleeful power, the "I blew that up" grin that pulls one more run. No calm productivity tool could wear this skin unchanged.

## Design rails
- Type: system font stack, condensed display weight for score only. Why: instant load offline, zero font pipeline, arcade numerals pop without downloads.
- Color: near-black indigo backdrop, cyan/magenta/lime/tangerine piece neons, white-hot flash for clears. Why: dark well makes ghost outlines and explosions readable at a glance on phones in sunlight.
- Spacing/density: tight well-centered column, side panels collapse under the well on narrow screens. Why: thumbs reach drop/hold buttons without covering the stack; desktop gets stats at eye level.
- Motion: 60fps transforms only, particles on canvas overlay, screen shake scaled to row count (none for singles, heavy for fours). Why: juice never blocks steering; shake is the reward meter.
- Sound: synthesized blips (no audio files), mute-first until gesture. Why: offline-safe, zero weight, respects browser autoplay blocks.

## Key screens/flows

### S-W1 — The run (serves W1: Play a run)
- Layout in words: center well (10 wide × 20 tall), left rail score/level/rows/best, right rail next + hold + mute/ghost toggles; on phones rails fold into a top strip (score + best) and bottom thumb bar (steer/spin/drop/hold/pause).
- Empty: before first start — well shows faint demo stack + big START pulse. Recovery: any key/tap starts.
- Loading: first-visit cache fill — skeleton well shimmer ≤1s. Recovery: stays playable the moment shell parses; no spinner trap.
- Ready: countdown-less instant spawn; "GO" floating text. Recovery: n/a.
- Error: pause overlay freezes fall exactly; resume restores tick-for-tick. Recovery: resume button or P key.
- Done: game-over card — score, best, NEW BEST glow when beaten, rows + level + time, RESTART pulse. Recovery: one action restarts (R / tap).

### S-W2 — Aim and slam (serves W2)
- Layout: ghost outline in active-piece hue at 25% alpha inside well; drop button glows on desktop hint "SPACE".
- Empty: no active piece (during clear flash) — ghost hidden. Recovery: reappears with next spawn.
- Loading: n/a (same frame as piece).
- Ready: ghost tracks every steer/spin within one frame. Recovery: wall-nudge snaps ghost to corrected cells, never floating.
- Error: ghost toggle off — outline hidden, landing math identical. Recovery: toggle back on.
- Done: hard drop — piece streaks down with comet trail, lands with dust ring + thud. Recovery: n/a.

### S-W3 — Eruption (serves W3)
- Layout: full rows flash white 120ms, then burst into shards over the well; floating "+800 TETRIS!" text; level-up banner when crossing 10-row multiples.
- Empty: no full rows — no effect. Recovery: n/a.
- Loading: n/a.
- Ready: scale ladder — 1 pop, 2 boom + small shake, 3 mega + fanfare, 4 eruption (rainbow shockwave + heavy shake + slow glow). Recovery: n/a.
- Error: celebration during high speed never queues input; next piece steerable underneath. Recovery: particles auto-clear in <900ms.
- Done: stack above settles straight down, counts update. Recovery: n/a.

### S-W4 — Best across visits (serves W4)
- Layout: best pinned under score always; game-over card spotlights it.
- Empty: fresh device — best shows 0 with "set your legend" hint. Recovery: first scored run writes it.
- Loading: best read before first move; well never waits on it. Recovery: corrupt value → 0, silent.
- Ready: live best visible during play. Recovery: n/a.
- Error: store unreadable — play continues, best shows session best. Recovery: next good run retries the write.
- Done: new high → card erupts gold confetti + NEW BEST. Recovery: n/a.

### S-W5 — Install + offline (serves W5)
- Layout: install hint chip appears only when installable and not yet installed; offline badge appears only when offline.
- Empty: first-ever offline visit — kind "connect once to load" card, never blank. Recovery: connect + reload.
- Loading: cached shell boots instantly on repeat visits. Recovery: stale cache refreshes silently next online visit.
- Ready: home-screen icon (neon T on dark) launches full-screen, no browser chrome. Recovery: n/a.
- Error: flaky mid-game disconnect — play continues untouched. Recovery: n/a.
- Done: installed state hides the hint chip permanently. Recovery: n/a.

### S-W6 — Feel + touch (serves W6, supporting)
- Layout: thumb bar with large DROP, smaller left/right/down/spin/hold; desktop shows key hints.
- All five states: empty (no sound yet until gesture — silent, no error), loading (no sound), ready (full duet of look+sound), error (sound blocked → visuals continue, tiny "tap for sound" hint), done (game-over sting or silence when muted). Recovery: first tap enables sound; mute toggle always wins.

## Signature moments (hard cap 2)
1. **Tetris Eruption.** A 4-row clear detonates: white flash, rainbow shockwave ring, shard fountain, heavy shake, deep boom + rising fanfare, slow gold glow on the well rim for 2s. Fallback (pragmatic): flash + floating "TETRIS!" + single shake if particle budget is tight — still distinct from singles.
2. **Comet Slam.** Hard drops streak the piece down with a neon motion trail and land with an expanding dust ring + bass thud; soft drops leave faint afterimages. Fallback: instant lock + dust ring only, no trail — landing truth unchanged.

## Deliberate non-goals
1. Settings pages use stock toggles (mute, ghost, touch-hint) — no signature styling spent there.
2. Game-over card uses standard centered card pattern — distinctiveness lives in the eruption, not in form design.
3. No custom font or icon pipeline — system stack + inline vector icons only, for offline weight.
4. No multiplayer, daily-seed, or replay surfaces — deferred per requirements D1–D3.
5. No tutorial tour — one-line hints ("arrows steer, space slams") beat a coach-mark flow for a 30-second fun gate.

## Downstream literal-vs-illustrative notes
Literal (MUST honor, 9 items):
1. Ghost outline MUST match true rest cells within one frame and respect wall nudges.
2. Hard drop MUST land exactly on ghost cells when ghost is on.
3. 1/2/3/4 clears MUST be visibly and audibly distinct; 4-row MUST have shockwave + shake + fanfare.
4. Celebration MUST NEVER block or eat next-piece input.
5. Best MUST be visible before first move and survive reload.
6. Pause MUST freeze and resume tick-for-tick.
7. Touch layout MUST be fully playable without scrolling the page.
8. Mute MUST silence everything; sound MUST start silent until first gesture.
9. First-ever offline visit MUST show the kind note, never blank.
Illustrative (may bend): exact neon hexes, particle counts, shake amplitudes, copy wording, panel breakpoints, icon artwork — keep the POV, tune freely.

## Handoff
- stage: ui-design
- status: ready-for-review
- key decisions:
  - Midnight arcade volcano POV with gleeful-power emotion.
  - Two signature moments: Tetris Eruption + Comet Slam, each with fallback.
  - Five non-goals as pragmatism receipt.
  - Nine literal items for downstream.
- open risks:
  - Shake + particles on low-end phones may need auto-throttle.
  - Gold NEW BEST glow must not obscure restart action.
- next agent reads: requirements + architecture + this file + decisions, then writes module contracts without restyling the experience.

<!-- gate-result: PASS date=2026-10-02 reviewer=dm-agent-team -->
