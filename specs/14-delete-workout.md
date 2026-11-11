# Task 14 — Delete a saved workout

Assignee: Gaia Bandini

Branch `feature/delete-workout`. Extends RUN-01 and workout planning with PLN-14.

## Why

Users need to remove routines they no longer use from Start workout.

## What

- Put a small lucide trash icon at the top right of each saved workout card.
  Its touch target is at least 44 × 44 px and its accessible label names the workout.
- Ask "Are you sure you want to delete [workout name]?" before making a request.
  Provide Cancel and Delete workout, with Cancel initially focused; Escape cancels.
  Explain that completed workouts remain in history.
- Cancel leaves the workout unchanged. Confirm removes only this user's template,
  through authenticated, CSRF-protected `POST /api/templates/<id>/delete` with `{}`.
- Keep completed sessions and their exercise progress unchanged. No schema migration.
- Only remove the card after the server confirms deletion. Keep the confirmation
  open with a plain error and retry option if the request fails; prevent repeated requests.
- While the current browser has a session in progress from this template, disable
  its trash button and explain that the user must finish or discard the session first.
- Other or nonexistent template IDs return the same 404 and cannot affect another user.

## Out of scope

Deleting completed sessions, undo/recycle bin, batch deletion, and cross-device
coordination of unsaved sessions.

## Done when

- Delete one of two templates: only the selected card disappears and stays absent after reload.
- Cancel or Escape preserves the saved routine and returns focus to its trash button.
- A template with completed sessions can be removed without changing any session JSON.
- A second user cannot delete it; signed-out or CSRF-free requests fail.
- A missing template returns a readable 404. Invalid requests never remove data.
- At 375 × 667 the trash control stays at the top right, long names wrap, and the
  confirmation fits the screen without horizontal scrolling. Check on a real phone before merge.

## Local verification — 2026-11-11

- Python: 44 tests passed, including deletion isolation and unchanged completed sessions/progress.
- React: 20 tests passed; lint, formatting, TypeScript and production build passed.
- Browser: desktop trash placement checked; 375 × 667 confirmation opens with Cancel focused. Cancel and Escape keep the workout and return focus to the trash button.
- Actual deletion is tested with disposable databases through the API; no existing demo workout was deleted during browser verification.
- Real-phone confirmation check and screenshot still required before merge.
