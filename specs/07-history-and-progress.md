# Task 7 — History and exercise progress

> Branch `feature/history-progress`. Needs tasks 3 and 6 (and adds links into 4 and 5 if they
> are merged).

## Why

Logging is only worth it if you can look back: what did I do on Tuesday, and is my bench going
up? The answer has to be one tap away from wherever the exercise name appears — and looking at it
must never cost you the workout you are in the middle of typing.

## What

Implements REV-01 to REV-07 on `/next/review`.

- [ ] **History** (REV-01): completed sessions, newest first — date, workout name, number of
      exercises and sets.
- [ ] **Session details** (REV-02): tap a session → each exercise with its sets (weight, reps,
      RPE or "–") and the exercise's estimated 1RM.
- [ ] **Exercise progress** (REV-03 to REV-06): a full-screen sheet with the exercise name, best
      and latest estimated 1RM, and the 1RM trend using `LineChart` from task 6. Data comes from
      `GET /api/exercises/<id>/stats` (task 3). Empty state: "No estimates yet."
- [ ] Every exercise name in session details is a link to its progress. If tasks 4 and 5 are
      merged, add the same link in the workout builder and the active session (REV-03).
- [ ] **Back** closes the sheet and returns to exactly where you were — scroll position and every
      unsaved input in the builder or session kept (REV-07). The browser/phone back gesture does
      the same.

## Out of scope

- Editing or deleting a completed session (BRD: outside this baseline).
- Comparing two exercises, filters, search, export.

## Done when

On a 375 × 667 screen, with the two sessions from task 3's **Estimates** example saved:

- **History.** Two sessions listed, 6 Nov above 4 Nov, each with its name and counts.
- **Details.** Open 6 Nov → Bench press 80 × 5 @ 8, estimated 1RM 98.7 kg.
- **Progress.** Tap "Bench press" → best 98.7 kg, latest 98.7 kg, a chart with two points
  (93.3, 98.7). An exercise never logged → "No estimates yet."
- **Nothing lost.** In an active session type 60 × 8 in the first set, open Bench press
  progress, go Back (button and phone back gesture) → still in the session, 60 × 8 still there.
- No horizontal scroll in history, details or progress at 375 px.

Commit as `Feature: history and exercise progress`.
