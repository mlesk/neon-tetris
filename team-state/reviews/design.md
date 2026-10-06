# Review — design.md

## Target + revision under review
- Target: `team-state/design.md` (M-A/M-B/M-C, 10-step build order)
- Upstream: requirements Tetris v1 + architecture 3-comp + ui-design 9 literals

## Verdict
**PASS**

## Findings
none

## Required rework
- [x] Every arch component has module contract with operations + errors
- [x] Every operation traces to workflow step + boundary
- [x] Every remembered noun has shape with validation + stored/derived marking
- [x] Every ui-design literal (9) traces to operation/shape
- [x] Build order numbered inside-out covering all modules
- [x] Normative MUST language, no TBD, no source-code blocks

## Blast-radius note
Closest calls:
1. Gravity table values as constants with fixed semantics — held; playtest may tune numbers without changing level-up meaning.
2. Particle throttle risk left open — held; scale mapping is normative so throttle only reduces counts, never the 1/2/3/4 distinction.
