# Task 13 — Edit a saved workout

Assignee: Gaia Bandini

## Why

Users need to change an existing routine without rebuilding it from scratch.
This extends PLN-01–11 and RUN-01; completed history (REV-01–02) stays unchanged.

## What

- Add Edit workout beside Start session in the React saved-workout list.
- Reuse the builder with the saved name, exercises and individual targets filled in.
- Save changes to the same template ID, using the existing validation rules.
- Require authentication, CSRF and ownership for updates; missing or foreign IDs return 404.
- Cancel asks before discarding the draft. Failed saves keep the draft for retry.
- Completed session snapshots stay unchanged. Future sessions use the updated template.

## Out of scope

Deleting templates, changing completed sessions, synchronizing concurrent edits,
and editing a template during an active workout.

## Done when

- Rename Upper A to Upper B and change exercises and targets without creating a duplicate.
- Refresh or sign in on another device: the saved changes remain.
- Existing session JSON remains identical after the edit.
- Invalid updates never overwrite the saved template; another user cannot update it.
- Legacy templates load with their original targets.
- At 375 × 667, Edit workout is at least 44 px tall, cards have no horizontal
  overflow, and Save changes remains in the builder's sticky action bar.
- Check the flow in a browser and on a real phone before merging.
