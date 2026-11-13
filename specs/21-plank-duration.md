# Task 21 — Plank sets in seconds
Assignee: nick3105

## Why
Planks are held for time. The user approved seconds for planning and logging them.

## What
Extend PLN-02, PLN-12, RUN-03, RUN-09 and REV-02 to timed sets.
Add Plank under Core with measurement "duration". Snapshot that measurement in templates,
active drafts and completed workouts. Store durationSeconds separately from reps and weight.
Allow whole seconds from 1 to 86400 and optional RPE in existing 0.5 steps.
New Plank cards start with three targets of 60 seconds.
Timed exercises show Seconds and optional RPE, with no weight, reps or estimated 1RM.
Support create/edit template, logging, extra/skipped sets, reload, history, last performance,
and correcting completed workouts. Existing repetition exercises and old drafts keep working.
The API determines the measurement from the catalogue or saved snapshot, never client input.

## Out of scope
Countdown timers, other timed exercises, duration charts and database schema changes.

## Done when
At 375 x 667 create Plank with three 60-second targets. Log 60, 45 and 30 seconds,
reload the active workout, save and reload history. All values show seconds.
Correct 45 to 50 seconds and verify the template still targets 60.
A mixed Bench press / Plank workout preserves each exercise's own fields.
Extra sets, skipped sets and retrying save behave as for repetition exercises.
Empty, zero, fractional, negative and over-86400 durations are rejected with a readable error.
Plank stats return the last durations and no 1RM points.
API tests cover round trips, edits, invalid durations, old templates and user isolation.
Frontend tests cover duration formatting, input completion and payloads.
No horizontal scrolling, numeric phone keyboard, controls at least 44 px.
