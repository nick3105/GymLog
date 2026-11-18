# Issue 004 - Personal exercise crashes Body load

## What happens
Review shows HTTP 500 in Body load after a workout with a personal exercise is saved.
`models.body_load` raises KeyError for the custom exercise ID because the route supplies
only built-in exercises. Reproduced with an isolated test database, not private data.

## What should happen
REV-09: Body load includes owned personal exercises with a selected group. None is excluded.
Review continues showing the report and history. New weekly-volume choices follow spec 35.

## How to reproduce
1. Register in a disposable journal and create a personal repetition exercise.
2. Add it to a template and save a completed set on 2026-11-17.
3. GET /api/body-load?days=7&today=2026-11-18.
4. Before the fix: KeyError at models.py's catalogue lookup, or HTTP 500 outside testing.
