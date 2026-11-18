# Issue 003 - AI routines contain too few work sets for the requested time

## What happens

For a requested 60-90 minute workout the assistant proposes about five exercises with only
one set each. The prompt permits 1-20 sets without guidance on realistic work-set volume.
An optional model `sets` count beside a single target row is also ignored by the existing
per-target template format. Raw responses were not logged, so that second problem is a
possible format failure, not the established cause of this user's plan.

## What should happen

For AI-02/AI-04, regular multi-exercise AI routines have at least two work sets per exercise.
The assistant normally uses three for main lifts and two for accessories. For a typical
60-90 minute session, aim for 5-8 exercises and roughly 12-24 work sets, adjusted for the
user's experience, goal, limitations, recovery and the other training days. These are planning
defaults, not medical rules or a guarantee that everybody needs the same volume. Account for
warm-up, execution, rest and transitions. Explain when constraints justify a shorter session.

Use a compact AI format: `sets: 3` with one target row means three identical work sets.
Expand it into existing per-set targets on the server. Accept explicit per-set targets too;
reject conflicting counts instead of silently losing sets. Do not invent or silently add
sets when the AI actually proposed one. Reject one-set rows in multi-exercise AI routines.
Standalone exercise drills retain their existing validation, as do all manually created and
historical templates. No database or frontend business-rule changes are needed.

## Reproduce

1. Ask the assistant for a routine with 60-90 minutes per session.
2. Supply goals, experience, equipment, weekly schedule and limitations.
3. Observe several exercise cards with only one target row each.

## Done when

Regression tests reject five single-set exercises, accept mixed two/three-set routines,
preserve compact counts through explicit template save/reload, reject ambiguous/invalid
counts, preserve individual target values, and keep manual single-set workouts supported.
The system prompt explicitly budgets time, uses two/three-set examples and keeps weekly
recovery in scope. A live 60-90 minute request shows multiple target rows at 375 x 667;
do not save the live suggestions without the user's explicit choice. Run all checks and
record remaining environment failures. Real-phone verification remains required before merge.

## Verification

The new tests initially produced 13 failures and 1 pass. After the fix, all 58 assistant
tests pass, including 14 volume cases. Expanded counts survive an explicit save and reload
in a temporary test database. No existing test was changed or skipped.

Ruff format/check pass. Frontend lint, all 30 frontend tests and the production build pass.
The full backend run has 133 passes, the existing Windows SQLite cleanup failure and the
Linux-only fcntl collection error. The repository format check still flags 43 existing CRLF
files, which were left outside this fix.

At 375 x 667 the assistant has no horizontal overflow; its buttons are at least 44 px high.
Screenshot: `docs/screenshots/issue-003-assistant-mobile.jpg` (chat layout, not generated plans).
Two live attempts (three days, then a single day) timed out at the provider, so live plan
quality and the new generated cards could not be confirmed in this session. The synthetic
test input was cleared, and no user's saved workouts were changed. Real-phone and live
generation checks remain pending.
