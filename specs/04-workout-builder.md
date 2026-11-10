# Task 4 — Create a workout

> Assignee: Martin Zvelebil
>
> **Done** on branch `feature/react-app` (React app at `/`, so `/next/...` below is now `/...`).
>
> Branch `feature/workout-builder`. Needs task 1.

## Why

A workout plan is made once and repeated for weeks, so building it can take a minute — but it
happens on a phone, often in the changing room. The builder has to make "bench press, a heavy top
set and a lighter back-off set" quick to enter without a keyboard full of fiddly fields.

## What

Implements PLN-01 to PLN-11 on `/next/create`. The API is `POST /api/templates`; its validation
in `models.validate_template` is the source of truth for every limit.

- [x] Name the workout (PLN-01).
- [x] Choose an exercise from the catalogue in `/api/state` and add it (PLN-02, PLN-03). A new
      exercise appears as a card with three set rows. Adding the same exercise again adds one set
      to its card instead of a second card. The catalogue stays selectable afterwards.
- [x] The exercise picker is grouped by muscle (task 11): a native `<select>` with one
      `<optgroup>` per `group`, in the order `/api/state` returns them — no hard-coded group
      list in React. Phones show their own scrollable picker with the group headings.
- [x] Each set row: target reps (required), target weight in kg (optional), target RPE
      (optional, 1–10 in 0.5 steps) (PLN-05, PLN-07, PLN-08, PLN-09). Numeric keyboards on
      phones.
- [x] Add a set; remove a set (never the last one); remove a whole exercise (PLN-04, PLN-05,
      PLN-06).
- [x] **Save** sends the targets per set and shows the server's sentence on error (PLN-10).
      Success returns to Start workout with a short confirmation.
- [x] **Cancel** asks before discarding anything typed (PLN-11).
- [x] Phone layout: one exercise card per row, set rows stacked, Save sticky at the bottom.

## Out of scope

- Editing or deleting a saved workout (BRD: outside this baseline).
- Adding exercises to the catalogue from the app (PLN-12 is a repository task).
- Opening exercise progress from the builder (REV-03 — task 7 adds the link).

## Done when

- **The BRD example.** On a 375 px screen create "Push day": Bench press with set 1 = 3 reps at
  100 kg RPE 9 and set 2 = 8 reps at 80 kg, RPE empty (remove the third row). Save → success.
  Reload; in `/api/state` the template has exactly those two targets, the second with
  `"rpe": null`.
- **Grouped picker.** The picker shows "Chest" first and "Core" last, every exercise under its
  group; adding Lateral raise puts it in a card with the group "Shoulders".
- **Same exercise twice.** Add Squat, then Squat again → one Squat card with 4 sets.
- **Last set.** On a card with one set, the remove-set button is disabled or absent.
- **Server says no.** Target RPE 8.3 → the server's sentence about 0.5 steps is shown next to the
  form; nothing is saved.
- **Cancel.** Type a name, tap Cancel → asked to confirm; "No" keeps the name, "Yes" leaves.
- **Old templates still work.** A template created in the current UI at `/` appears in the list
  of saved workouts (PLN-10: templates with one target per exercise stay usable).
- No horizontal scroll at 375 px with 20 sets on one exercise.

Commit as `Feature: create a workout`.
