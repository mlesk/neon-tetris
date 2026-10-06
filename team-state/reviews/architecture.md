# Review — architecture.md

## Target + revision under review
- Target: `team-state/architecture.md` (3 components, static no-build)
- Upstream: `team-state/requirements.md` Tetris v1 (5 core C1-C5)

## Verdict
**PASS**

## Findings
none

## Required rework
- [x] Stack decided with deviation rationale (no-build static vs TS default, logged)
- [x] Component map covers every core (C1+C2→A, C3+C4→B, C5→C)
- [x] Every edge has owner + shape contract (intake, render, sound, store, offline, clock)
- [x] Every NFR line has mechanism
- [x] No code, no source-tree paths, no method signatures

## Blast-radius note
Closest calls:
1. Single offline worker as only platform piece — held; no second infra added.
2. All rule truth in A/B with C purely rendering — held; prevents ghost/lock drift if oracle is shared.
