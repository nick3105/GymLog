# Task 5 — Log a workout

> Assignee:
>
> Branch `feature/log-workout`. Needs tasks 1 and 3. The most-used screen in the app.

## Why

This is GymLog's whole reason to exist: standing at the bar between sets, you see what you
planned and what you did last time, type what you just did in two taps, and at the end it is
safely saved. Every second of friction here is felt on every set of every workout.

## What

Implements RUN-01 to RUN-10 on `/next/start`. The API is `POST /api/sessions` (its validation is
the source of truth) and `GET /api/exercises/<id>/stats` from task 3.

- [ ] **Pick a workout** (RUN-01): saved templates with their exercises and set counts.
      Templates in either shape — per-set `targets` or one `targetReps`/`targetWeight` per
      exercise — both work.
- [ ] **The session** (RUN-02): one card per exercise, one row per planned set.
- [ ] Above each exercise, **Last time** from the stats API: date and sets, or "No previous
      results" (RUN-04).
- [ ] Each set row: actual weight (kg, 0 allowed), actual reps, optional RPE (RUN-05/06/07). The
      planned target is the placeholder (RUN-03). Numeric keyboards; inputs at least 16 px.
- [ ] **Live estimated 1RM** per exercise, updating as you type (RUN-08). This needs the 1RM rule
      in the browser: write it as `src/oneRepMax.ts` with a vitest test that uses **the same
      examples as** `test_estimate_rules` in `backend/tests/test_api.py`, so the two cannot drift.
- [ ] **Finish & save** (RUN-09): disabled until every set has weight and reps. Generates one
      `clientId` per session so a retry never creates a duplicate. On failure the inputs stay
      and the error sentence is shown; on success, a confirmation and the session in history.
- [ ] **Discard** asks first (RUN-10). Leaving the page or signing out with an unsaved session
      asks first too (ACC-05).
- [ ] **Survives the phone:** the active session is kept in `sessionStorage` per user, so
      locking the phone, switching apps or an accidental reload does not lose it.
- [ ] Phone layout: Finish & save sticky at the bottom; the set you are on is easy to find.

## Out of scope

- Rest timers, plate calculators, adding exercises mid-session, reordering sets.
- Opening exercise progress from the session (REV-03 — task 7 adds the link).
- Syncing an unfinished session to another device (BRD: Draft behaviour).

## Done when

`npm test` passes the 1RM examples (80 × 5 → 93.3; 80 × 5 @ 8 → 98.7; 80 × 9 @ 7 → 106.7;
100 × 1 → 100; 80 × 11 → none; 0 × 8 → none), and on a 375 × 667 screen:

- **Log the BRD example.** Start "Push day" (task 4's example). Placeholders show 3 / 100 / 9 and
  8 / 80 / –. Enter 100 × 3 @ 9 and 80 × 8 with RPE empty. Live 1RM shows **113.3 kg** — the
  better of 100 × 3 @ 9 (4 effective reps → 113.3) and 80 × 8 (101.3). Finish & save → saved, and it appears
  in `/api/state` with the second set's RPE `null`.
- **Last time.** Start the same workout again → above Bench press: the date and 100 × 3, 80 × 8.
- **Bodyweight set.** 0 kg × 12 for a set → accepted; no 1RM from that set.
- **Incomplete.** Leave one reps field empty → Finish & save stays disabled.
- **Network drop.** Turn Wi-Fi off, Finish & save → an error sentence, every number still there.
  Wi-Fi on, tap again → exactly one session saved.
- **Phone lock.** Enter two sets, lock the phone for a minute, unlock → both sets still there.
- **Discard.** Discard → asked; Yes → back to the workout list, nothing saved.

Commit as `Feature: log a workout`.
