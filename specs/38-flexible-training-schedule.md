# Task 38 - Flexible training schedule
Assignee: nick3105

## Why

Some workouts belong on a specific day. A three-day strength split can belong
to a week, with the user choosing when to do Day 1, Day 2 and Day 3. Stable
scheduled workout IDs and independent targets give future powerlifting, HYROX
and marathon preparation features a schedule to build on.

## What

- SCH-01: Open Schedule from Home and the desktop navigation. Show the current
  local Monday–Sunday week, with previous/next week, Today and a date picker.
- SCH-02: Assign an owned saved workout to a date from 2000 through 2100.
  Allow multiple workouts on a day.
- SCH-03: Create and edit a reusable ordered series with one to seven saved
  workouts, including repeats. Allow up to 100 series, with names of 1–60 characters.
- SCH-04: Assign a series to a week as Day 1, Day 2 and so on, without dates.
  Each assignment has independent workout copies. Keep up to 50 workouts per week.
- SCH-05: Edit the targets of a scheduled workout in the existing workout editor
  (PLN-05–10). A user can add a set, add reps or increase weight for one occurrence.
  Allow moving or removing a scheduled workout.
- SCH-06: Use snapshots for the series and week. Changes to the schedule preserve
  saved workouts, drafts and history. Editing or deleting a series keeps its
  already assigned workouts.
- SCH-07: Store schedules privately per account. Use an additive migration,
  authentication, CSRF, revision checks and safe retries for assignments.

## Out of scope

Starting workouts from Schedule, completion links, repeats across weeks,
copying weeks, manual activities, reminders and competition preparation.

## Done when

- Assign Upper to Tuesday 24 November 2026 and a three-workout series to the
  week of 23 November and the following week, both with no exact dates.
- Increase one workout from one set of 8 at 60 kg to two sets of 10 at 62.5 kg,
  then move it to Wednesday. Verify its original, series and other week have
  the old targets and that it has not created a completed session.
- Reorder and remove a series without changing its assigned weeks.
- Test populated schema version 10 migration, account isolation, stale
  revisions, assignment retries, year boundaries and capacity rollback.
- Check the flow at 375 × 667 and on a real phone before merging.
- Run all repository checks on feature/training-schedule.
