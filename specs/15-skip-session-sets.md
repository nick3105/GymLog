# Task 15 — Skip a set during today's workout

Assignee: Gaia Bandini

Branch `feature/skip-session-sets`. Extends RUN-09 and REV-01–02.

## Why

A saved routine is a plan. A user who runs out of time must be able to log fewer
sets today without rewriting that plan or entering invented results.

## What

- Each planned set has a 44 px Skip set action below its inputs. Skipping displays
  "Skipped" and Restore set. Restore returns any values previously typed.
- Only the active session changes; saved templates and past results stay unchanged.
- A blank set still blocks Finish. Each row must be completed or explicitly skipped.
- The skip flag survives refresh and app switching through existing draft storage.
- Send skipped rows as `{skipped: true}`. Keep one row per planned set, in order.
  Old sessions and clients without this flag continue to work unchanged.
- Python validates the flag as a boolean and stores skipped rows distinctly from
  bodyweight sets. Skipped rows contribute nothing to live or saved estimated 1RM.
- Review details show skipped rows by their original set number. History counts
  completed and skipped rows separately. Last performance uses only performed
  sets; an exercise skipped entirely does not replace its previous performance.
- A failed save keeps the draft, including skips; retry uses the same client ID
  and cannot create duplicates. Journal isolation still applies.

## Out of scope

Adding sets, adding/removing exercises, editing completed sessions, and changing
the reusable template during a session.

## Done when

- Of three bench sets, complete the first two and skip the third, then save.
  History shows two actual sets and "Set 3 — Skipped". The template still has three sets.
- Skip a partially typed row and restore it: its values remain. Refresh preserves skips.
- Blank unskipped rows still block saving; false/string/numeric skip flags cannot bypass validation.
- Estimates and progress exclude skipped rows, including stale values from a skipped input.
- Retrying a save returns the same session; another account cannot access it.
- At 375 × 667 the inputs stay readable and Skip/Restore targets are at least 44 px.
- Verify on a real phone before merge.
