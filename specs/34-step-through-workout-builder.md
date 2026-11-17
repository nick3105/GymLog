# 34 — Step through exercises while building a workout
Assignee: Gaia Bandini

## Why

Long workouts are difficult to create on a phone because every exercise and every planned set
is expanded on the same page. The user should be able to focus on one exercise at a time without
losing the overview of the workout (PLN-01, PLN-02).

## What

In Create and Edit workout, add a mobile-friendly stepper for the exercise plan. Show one exercise
card at a time, including its name, notes, targets and existing set controls. Provide clear 44 px
Previous and Next buttons, plus a progress label such as “Exercise 2 of 5”. A compact overview
shows which exercises are complete and lets the user jump directly to one. The current exercise
remains editable, and adding or removing an exercise keeps the stepper position sensible.

The workout name, warm-up, cool-down and Save action remain available. Existing validation rules,
duplicate-exercise behaviour, supersets, reordering, favourites and target calculations are
unchanged. The same interaction must work when editing an existing workout.

## Out of scope

Changing the workout data model or API, changing the order of exercises, changing set rules,
changing the active workout session screen, or adding a new navigation library.

## Done when

- Create and Edit can move between exercises with Previous and Next without losing typed values.
- Only the current exercise's detailed sets are expanded on a 375 × 667 phone screen; no
  horizontal scrolling is needed.
- The progress label and compact overview make the current position clear, and all navigation
  targets are at least 44 × 44 px.
- Saving from any step preserves the complete workout exactly as entered, including skipped or
  additional sets where supported.
- Existing builder tests still pass, and tests cover moving between steps, editing values, adding
  an exercise and saving from a non-first step.
- The relevant PLN acceptance checks are demonstrated in a real-phone screenshot attached to the
  pull request.
