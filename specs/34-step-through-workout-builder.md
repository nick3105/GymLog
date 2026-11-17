# 34 — Step through exercises while building a workout

Assignee: Gaia Bandini

## Why

Long workouts are difficult to create on a phone because every exercise and every planned set
is expanded on the same page. The user should be able to focus on one exercise at a time without
losing the overview of the workout (PLN-01, PLN-02).

## What

In Create and Edit workout, add a mobile-friendly collapsed exercise overview. Show the exercise
name and order for every exercise, while keeping its notes, targets and existing set controls
closed until the user taps that exercise. Show a progress label for the open exercise, or “All
exercises closed” when none is selected. The compact overview keeps the existing 44 px drag grip
and arrow controls so the user can reorder exercises without opening their details.

The workout name, warm-up, cool-down and Save action remain available. Existing validation rules,
supersets, reordering, favourites and target calculations are unchanged. In the exercise picker,
tapping an unselected exercise adds it and tapping a selected exercise removes it from the plan.
The same interaction must work when editing an existing workout.

## Out of scope

Changing the workout data model or API, changing the order of exercises, changing set rules,
changing the active workout session screen, or adding a new navigation library.

## Done when

- Create and Edit can open and close any exercise without losing typed values; all exercises may
  remain closed.
- Only the selected exercise's detailed sets are expanded on a 375 × 667 phone screen; no
  horizontal scrolling is needed.
- The compact overview supports the existing drag-and-drop reorder grip and arrow controls, and
  all navigation targets are at least 44 × 44 px.
- Saving from any step preserves the complete workout exactly as entered, including skipped or
  additional sets where supported.
- Existing builder tests still pass, and tests cover moving between steps, editing values, adding
  an exercise and saving from a non-first step.
- The relevant PLN acceptance checks are demonstrated in a real-phone screenshot attached to the
  pull request.
