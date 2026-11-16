# Task 22 — Body load analysis
Assignee: Martin Zvelebil

## Why
"Which parts of my body did I train, and which did I skip?" GymLog shows each exercise on its
own, but not how the training spreads across the body. A lifter who benches three times a week
and never trains calves cannot see that today.

## What
Covers REV-09 (new). Branch `feature/body-load`.

- **The rule lives in `models.body_load(sessions, catalogue_by_id, today, days)`.** Each
  exercise belongs to its catalogue `group` (Chest, Back, Shoulders, Biceps, Triceps,
  Forearms, Core, Quads, Hamstrings & glutes, Calves). The group comes from the catalogue by
  exercise ID, which never changes (PLN-12).
- **Load is counted in completed sets.** Every performed set counts as 1, so weighted,
  bodyweight (0 kg) and timed (Plank) sets are all included. Skipped sets do not count.
- **Volume is shown underneath:** `weight × reps` summed in kg, rounded to 0.1. Bodyweight and
  timed sets add 0 kg. Timed sets add their seconds to `durationSeconds` instead.
- **Period:** `days` is `7`, `28` or `all`. 7 means `today` and the 6 days before it. The
  React app sends the user's local `today`, as the Weight reminder does (WGT-08).
- **Level** for the body map is 0 for no sets, otherwise `ceil(3 × sets / most sets of any
  group)`: 1 light, 2 medium, 3 most. It is relative, so it works for every period.
- `GET /api/body-load?days=7&today=2026-11-16`, signed in only, returns:
  ```json
  {"groups": [{"group": "Chest", "sets": 6, "volumeKg": 2400.0, "durationSeconds": 0,
               "level": 3,
               "exercises": [{"id": "bench-press", "name": "Bench press", "sets": 6,
                              "volumeKg": 2400.0, "durationSeconds": 0}]}]}
  ```
  All ten groups are always listed: most sets first, ties in alphabetical order. Exercises
  inside a group follow the same order. Each exercise's name is the snapshot from its most
  recent session in the period.
- A missing or invalid `days` or `today` → 400 with a sentence.
- **Review page (`/review`)** gets a **Body load** card above the history:
  - Three pills: **7 days** (default), **28 days**, **All**. The selected pill is accent-coloured.
  - A front and back body figure, hand-drawn SVG in `components/BodyMap.tsx`. Each muscle region is
    filled by its group's level: border colour, then accent at 35 %, 65 % and 100 %. A legend
    underneath reads None, Light, Medium, Most. The figure is only a picture
    (`role="img"` with a text label); the list below is what you tap.
  - One row per trained group: name, sets (big, `font-mono`), volume in kg, seconds if any, and a
    bar sized to its share of the busiest group. Tapping the row (at least 44 px tall) opens its
    exercises. Each exercise name is an `ExerciseLink` that opens its progress sheet (REV-03).
  - One sentence for untrained groups: "Not trained: Calves, Forearms." Hidden when every
    group was trained.
  - No sessions in the period: "No completed sets in the last 7 days." The pills stay visible.

## Out of scope
Secondary muscles (a bench press counts for Chest only), recommended set targets, week-by-week
charts, tapping the body figure, changing the catalogue groups, any schema change.

## Done when
`uv run pytest tests/test_body_load.py` is green with at least:
- **Empty.** New user → ten groups, all `sets: 0`, `level: 0`.
- **Counting.** Bench 3 × (80 kg × 5) and one skipped set, plus Plank 60 s and 45 s, on
  2026-11-14 → Chest `sets: 3`, `volumeKg: 1200.0`, `level: 3`. Core `sets: 2`,
  `volumeKg: 0.0`, `durationSeconds: 105`, `level: 2`.
- **Bodyweight.** Push-up 0 kg × 20 → Chest `sets: 1`, `volumeKg: 0.0`.
- **Period.** Sessions on 2026-11-10 and 2026-11-09, `today` 2026-11-16: `days=7` counts only
  the 10th, `days=28` and `all` count both.
- **Order.** Groups with more sets come first. Ties are alphabetical.
- **Privacy.** A second user's sessions never change the first user's numbers.
- **Bad input.** `days=5`, a missing `today` and `today=16.11.2026` each → 400 with a sentence.
  Signed out → 401.

`npm test` covers the bar width helper and the "Not trained" sentence.

At 375 × 667: the card fits with no horizontal scrolling, the pills and rows are at least 44 px,
switching period updates the figure and the list, and the progress sheet opens from an exercise
and closes back to Review. A phone screenshot goes in the PR.

Commit as `Feature: body load analysis`.
