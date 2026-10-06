# Review — requirements.md (Tetris)

## Target + revision under review
- Target: `team-state/requirements.md` (Tetris, ~200 lines)
- Revision: Tetris v1 2026-10-02, single casual player, O1 30-second delight, 5 core + 3 supporting + 3 deferred
- Prior verdicts: prior FAIL covered old briefing target, void for new target

## Verdict
**PASS**

## Findings
none

## Required rework
- [x] All sections present, non-empty, no TBD/TODO
- [x] No forbidden terms (verified by grep: clean)
- [x] Out-of-scope 8 items
- [x] Every core capability has 3 acceptance criteria (15 total Given/When/Then)
- [x] Every objective (O1) traces to every criterion
- [x] Failure branches present in W1-W6

## Blast-radius note
No load-bearing defects. Two closest calls:
1. C5 offline+install as core vs supporting — held as core because user explicitly asked for PWA install on iOS; dropping it would miss the target.
2. Audit posture as visible score reasons — held because floating text + board counts make scoring explainable without extra views.
