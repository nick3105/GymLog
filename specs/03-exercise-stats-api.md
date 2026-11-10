# Task 3 — Exercise stats API

> Assignee: Martin Zvelebil
>
> Branch `feature/exercise-stats-api`. Backend only: Python and pytest. Unblocks tasks 5 and 7.

## Why

"What did I lift last time?" and "Am I getting stronger?" are the two questions GymLog answers.
Today the current UI works both out in JavaScript (`gymlog/static/training-model.mjs`), which
means the rule exists twice and can drift. The rule belongs in Python, next to the 1RM rule it
uses, and the screens should only display the answer.

## What

Implements the data behind RUN-04 and REV-04, REV-05, REV-06.

- [ ] `GET /api/exercises/<exercise_id>/stats`, signed in only. It returns:
      - `last`: the most recent completed session containing this exercise — `{day, sets}` with
        each set's weight, reps and RPE — or `null` when there is none. "Most recent" is by
        session `day`, then by completion time. Sessions from **any** template count (RUN-04).
      - `points`: one `{day, estimate}` per completed session where the exercise has an eligible
        set, oldest first, using `models.best_1rm` on the saved sets (REV-06).
      - `best` and `latest`: the highest and the most recent `estimate`, or `null` (REV-04/05).
- [ ] An exercise ID not in the catalogue → 404 with a sentence. Another user's sessions are never
      counted.
- [ ] The calculation is a plain function in `models.py` (no Flask, no SQL) taking the user's
      sessions and an exercise ID, so it is tested without a request.

## Out of scope

- Changing the 1RM rule itself (BRD "Estimated 1RM rule" is already implemented and tested).
- Any screen — tasks 5 and 7 use this.
- Stats across all exercises, PRs, volume or streaks.

## Done when

`uv run pytest tests/test_exercise_stats.py` is green, with at least these cases:

- **No history.** A new user asks for `bench-press` → `last: null`, `points: []`,
  `best: null`, `latest: null`.
- **Across templates.** Session 1 (template "Upper A", 2026-11-04): bench 60 kg × 8. Session 2
  (template "Push", 2026-11-06): squat only. → `last.day` is `2026-11-04`.
- **Estimates.** Sessions on 2026-11-04 (bench 80 × 5, no RPE) and 2026-11-06 (bench 80 × 5 at
  RPE 8) → `points` are `93.3` then `98.7`; `best` 98.7; `latest` 98.7.
- **Ineligible sets.** Only 0 kg × 8 and 80 kg × 12 → no points, but `last` still shows them.
- **Privacy.** A second user with bench sessions → the first user's stats are unchanged.
- **Unknown exercise.** `/api/exercises/not-real/stats` → 404.
- **Signed out.** → 401.

Commit as `Feature: exercise stats API`.
