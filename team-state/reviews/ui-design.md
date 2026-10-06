# Review — ui-design.md

## Target + revision under review
- Target: `team-state/ui-design.md` (volcano POV, 6 screens S-W1..S-W6)
- Upstream: requirements Tetris v1 + architecture 3-component

## Verdict
**PASS**

## Findings
none

## Required rework
- [x] POV one paragraph, not competitor-generic
- [x] Rails each with why tied to POV/users
- [x] Every core workflow has screen with empty/loading/ready/error/done + recovery
- [x] Signature moments ≤2 with fallbacks
- [x] Non-goals ≥3 (5 listed)
- [x] Literal ≤10 (9 listed)

## Blast-radius note
Closest calls:
1. Six screens for five core + one supporting — held; W6 touch/feel needs explicit states to prevent scroll-trap.
2. Shake scaled to row count — held as specified ladder; low-end throttle left as open risk, not a state gap.
