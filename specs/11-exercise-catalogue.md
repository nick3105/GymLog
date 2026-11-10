# Task 11 — A real exercise catalogue

> Assignee: Martin Zvelebil
>
> Branch `feature/exercise-catalogue`. Backend data and one test. Task 4 shows it grouped.

## Why

The catalogue has nine exercises. Anyone who trains a normal split — push/pull/legs,
upper/lower, one muscle a day — cannot plan their week: no incline press, no lateral raise, no
Romanian deadlift. And nine names in one flat list hide how people actually think about a
workout: "today is chest and triceps". The list has to be complete enough for an ordinary gym,
and ordered so a phone user finds an exercise in one scroll.

## What

Implements PLN-02 and PLN-12 in `backend/gymlog/exercises.json`.

- [x] About 55 common gym exercises — barbell, dumbbell, cable, machine and bodyweight — that
      are logged as weight × reps. Nothing timed (plank) or for distance (running).
- [x] Every exercise has one `group`, the main muscle it trains. Groups come in **split order**,
      so the push day, the pull day and the leg day are each one block of the list:
      Chest, Shoulders, Triceps (push) → Back, Biceps (pull) → Quads, Hamstrings & glutes,
      Calves (legs) → Core.
- [x] The file order is the display order: all exercises of a group sit together, groups in the
      order above, the most common exercise of each group first.
- [x] The nine existing exercises keep their ID and name, so saved workouts and past results
      still link (PLN-12). Their group may change (Deadlift: Posterior chain → Back) — templates
      store only ID and name, so nothing saved changes.
- [x] `backend/tests/test_exercises.py` checks all of this, so a later edit cannot break it.
- [x] Task 4 shows the list grouped (see `04-workout-builder.md`).

## Out of scope

- The old UI at `/`: it gets the new exercises in its flat list, nothing else (AGENTS.md:
  bug fixes only).
- Users adding their own exercises, search, equipment filters, exercise pictures.
- A second group per exercise (bench press also trains triceps) — one main muscle is enough to
  find it.

## Done when

- `uv run pytest tests/test_exercises.py` passes and checks:
  - IDs are unique, lowercase words joined by `-`; names are unique.
  - The nine original IDs are there with their original names.
  - Every group is one of the nine above, each group is one block, and the blocks are in split
    order.
- `/api/state` returns the new list; in the old UI at `/` the Create workout dropdown shows it,
  and a workout saved before this change still opens and starts.

Commit as `Feature: a real exercise catalogue`.
