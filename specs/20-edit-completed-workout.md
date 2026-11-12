# 20 — Correct a completed workout
Assignee: Gaia Bandini

## Why
Correct a mistyped result or record the actual training day after logging late (REV-01–06, REV-08).
This extends the baseline, which previously excluded completed-session corrections.

## What
From Review details, open Edit workout. Correct the date and existing performed sets' kg,
whole-number reps and optional RPE. Today and past dates only, in the browser's local timezone
(user decision, 2026-11-12). Keep skipped sets, exercise order, extra-set labels, snapshots,
ID and completion timestamp unchanged. Validate through Python and recompute progress.
Save replaces this session only, even if its original routine was changed or deleted.
Cancel confirms before discarding changes. Failed saves retain inputs for retry.

## Out of scope
Adding/removing exercises or sets, changing skipped status, deleting sessions, live estimates,
changing the saved routine, offline sync. This task stays local until publication is requested.

## Done when
- Date and numeric corrections update Review and exercise progress without duplicates.
- Invalid/future dates and invalid actual results are refused without modifying history.
- Another user cannot read or update the session; authentication and CSRF are required.
- Skipped sets remain excluded from calculations and at least one performed set remains.
- At 375 × 667, fields have readable labels and 44 px targets, no horizontal overflow,
  a bottom Save changes action, and Cancel returns to unchanged details.
- Check on a real phone before merging and attach a phone screenshot to the PR.

## Local verification — 2026-11-12
- User confirmed the local demo works and explicitly kept Skip/Restore out of this editor.
- Browser checked at 375 × 667: numeric correction saved, native date control saved a past
  date, invalid weight retained inputs, Cancel could stay or discard, no horizontal overflow.
- API tests cover privacy, CSRF, authentication, invalid/future dates, invalid numbers,
  fixed exercise/set structure, unchanged skipped rows, retry without duplicates, and corrections
  after deleting the routine. Progress recalculates from corrected actual results.
- Final checks: 69 Python tests and 25 frontend tests passed; Ruff, oxlint, Prettier,
  TypeScript and Vite build passed. Real-phone verification remains before merging.
- Local branch: `feature/edit-completed-workout`. Nothing published or merged.
