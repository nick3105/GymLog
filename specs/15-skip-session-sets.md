# Task 15 — Skip or add sets during today's workout

Assignee: Gaia Bandini

Branch `feature/skip-session-sets`. Extends RUN-09 and REV-01–02.

## Why

A saved routine is a plan. A user who runs out of time must be able to log fewer
sets today without rewriting that plan or entering invented results.

## What

- Each planned set has a 44 px Skip set action below its inputs. Skipping displays
  "Skipped" and Restore set. Restore returns any values previously typed.
- Only the active session changes; saved templates and past results stay unchanged.
- At least one set in the whole workout must be performed. All sets of one exercise may be skipped if another exercise has at least one performed set. A fully skipped workout cannot be saved; restore a set or discard it.
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

## Add set extension

- Only in the active session, show + Add set below each exercise. It appends a blank
  weight/reps/optional-RPE row, marked Extra set; the user records actual values.
- Extra rows can be skipped and restored like planned rows. A new blank row blocks
  Finish until completed or skipped. All rows survive refresh via draft storage.
- Keep all planned rows, and accept additional rows up to the existing 20-set limit
  per exercise. Disable Add at 20 and while saving. Python enforces the same limit.
- Keep plannedSets and the original targets in the saved snapshot. Extra rows appear
  in session details and contribute to progress when performed, never to the template.
- Old sessions with exactly the planned count remain valid. Missing planned rows
  and more than 20 total rows remain invalid. Retry stays idempotent.

## Out of scope

Adding/removing exercises, editing completed sessions, and changing
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

## Local verification — 2026-11-11

- 51 Python tests and 22 React tests passed. Ruff, frontend lint, formatting, TypeScript and build passed.
- At 375 × 667, skipped rows and Restore controls fit the screen without horizontal overflow.
- Browser: skipping every row disables Finish; refresh retains all skips. Restore recovers 40 kg and 5 reps entered before skipping.
- Saved a session with all three bench sets skipped and one barbell-row set performed: review shows the three skips, the actual row and no bench estimate.
- Retry/idempotency, privacy, malformed flags and previous-performance preservation covered by API tests.
- A real-phone walkthrough and failed-save retry in the browser remain manual checks before merge.

## Add set verification — 2026-11-11

- 56 Python tests and 22 React tests passed; Ruff, frontend lint, formatting, TypeScript and build passed.
- API checks cover extra actual/skipped rows, blank rows, retry without duplicates, unchanged templates and the 20-set boundary.
- Browser at 375 × 667: Add set creates row 4 below three planned rows. A blank extra blocks Finish; reload retains the row and its 100 kg × 1 actuals.
- Saving shows Set 4 / Extra in review and includes it in the 100 kg estimate.
- Real-phone acceptance still required before merge.
