# Task 11 — A real exercise catalogue

> Assignee: Martin Zvelebil
>
> Branch `feature/exercise-catalogue`. Backend data, one test, and search in the Create workout
> picker.

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
- [x] **Everything else a gym has:** 594 more from
      [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain, the
      Unlicense), 650 in total. Imported once, on 10 November 2026; from then on
      `exercises.json` is the source and IDs never change. How it was imported:
  - only `strength`, `powerlifting` and `olympic weightlifting`, and nothing with
    `force: static` (holds are timed) — no stretches, cardio, plyometrics or strongman
  - ID: the dataset ID in lowercase with `-` (`Barbell_Full_Squat` → `barbell-full-squat`);
    name: the dataset name as it is
  - group from the first primary muscle: lats, middle back, lower back, traps, neck → Back;
    forearms → Forearms; quadriceps → Quads; hamstrings, glutes, abductors, adductors →
    Hamstrings & glutes; abdominals → Core; the others by their own name
  - 55 dataset exercises that are already in the list under our name (e.g.
    `Barbell_Bench_Press_-_Medium_Grip` = Bench press) were skipped, so nothing appears twice
  - our 56 stay first in their group; the imported ones follow, A to Z
- [x] Every exercise has one `group`, the main muscle it trains. Groups come in **split order**,
      so the push day, the pull day and the leg day are each one block of the list:
      Chest, Shoulders, Triceps (push) → Back, Biceps, Forearms (pull) → Quads,
      Hamstrings & glutes, Calves (legs) → Core.
- [x] The file order is the display order: all exercises of a group sit together, groups in the
      order above, the most common exercise of each group first.
- [x] The nine existing exercises keep their ID and name, so saved workouts and past results
      still link (PLN-12). Their group may change (Deadlift: Posterior chain → Back) — templates
      store only ID and name, so nothing saved changes.
- [x] `backend/tests/test_exercises.py` checks all of this, so a later edit cannot break it.
- [x] Task 4 shows the list grouped (see `04-workout-builder.md`).
- [x] **Search** on Create workout: 650 is too many to scroll on a phone. Typing shows the first
      8 matches as 48 px rows; one tap adds the exercise and clears the search. Every word typed
      must appear in the name or the group, in any order, ignoring capitals, spaces and dashes
      (`pull up` finds Pull-up); names that start with the search come first. The grouped
      dropdown stays below it ("Or choose by muscle") for browsing.
      `frontend/src/exerciseSearch.ts`, tested in `exerciseSearch.test.ts`.

## Out of scope

- Users adding their own exercises, equipment filters, exercise pictures and instructions
  (the dataset has both; a later task could add them).
- A second group per exercise (bench press also trains triceps) — one main muscle is enough to
  find it.

## Done when

- `uv run pytest tests/test_exercises.py` passes and checks:
  - IDs are unique, lowercase words joined by `-`; names are unique.
  - The nine original IDs are there with their original names.
  - Every group is one of the ten above, each group is one block, and the blocks are in split
    order.
  - There are at least 600 exercises.
- `npm test` passes `exerciseSearch.test.ts`.
- `/api/state` returns the new list. At 375 px on Create workout: typing `lat pull` shows
  Lat pulldown first, one tap adds it as a card, and the search clears; the dropdown still shows
  the groups. A workout saved before this change still opens and starts.

Commit as `Feature: a real exercise catalogue`.
