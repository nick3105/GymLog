# Task 31 — Autosave active workout drafts

Assignee: annalisa2912

## Why

An active workout currently lives in the browser tab. If the user closes GymLog, the unfinished workout can be lost. Saving the draft to the signed-in user's account lets them reopen the app and continue where they stopped, including on another device.

## What

- Automatically save the active workout draft to the server as the signed-in user changes set values, skips or restores a set, or adds an extra set.
- Restore the user's latest saved draft after a reload, closing and reopening the browser, or signing in to the same account on another device.
- Keep the draft private to its user. Every API and database read or write must be authenticated and filtered by `user_id`.
- Show a clear **Saving**, **Saved**, or save-error status. A failed save keeps all entered values visible and gives the user a way to retry. The UI must make clear when the latest changes have not reached the server yet.
- Keep the active draft separate from completed workout history. **Finish & save** still creates the completed session; only after that succeeds should the draft be cleared. Preserve the existing duplicate-save protection and keep the draft if finishing fails.
- **Discard** asks for confirmation and deletes the active draft only after confirmation. Cancelling keeps it. Signing out alone does not delete the server draft.
- Keep at most one active workout draft per account. If a draft exists, offer to resume it or explicitly discard it before starting a different workout; never silently overwrite it.
- Use the existing Flask, SQLite, and React stack. Add a schema migration and tests for upgrading existing data if storage changes.

## Out of scope

- Offline editing or a guarantee that edits made without a network connection reach the server.
- Simultaneous editing of the same draft on multiple devices. The newest server-confirmed draft is the one restored.
- Autosaving unsaved workout-template changes.
- Changing how a completed workout is saved or displayed in history.

## Done when

- Start a workout and enter values in multiple sets. After the UI reports **Saved**, close the tab or browser, reopen GymLog, sign in to the same account, and resume with the saved values intact.
- Reload the page and navigate to another GymLog page and back; the active workout remains available and can be resumed.
- Sign in on another device as the same user and resume the latest server-saved draft.
- Sign in as a second user and verify that the first user's draft is neither visible nor editable. Sign back in as the first user and verify that their draft is unchanged.
- Simulate a failed draft save: keep the entered values, show a clear error, and allow retry. After retry succeeds and shows **Saved**, closing and reopening GymLog restores the values.
- A failed **Finish & save** keeps the draft and retry creates exactly one completed session. A successful finish clears the draft and the completed session appears in history.
- Confirmed **Discard** clears only the current user's draft; cancelling keeps it. Signing out and back in preserves it.
- Starting another workout while a draft exists never overwrites it without an explicit choice.
- Add backend tests for authentication, user isolation, draft save/restore, finish cleanup, discard cleanup, and database upgrades; add frontend tests for save status, restore behavior, retry, and resume/discard choices.
- Check the full flow at 375 × 667 and on a real phone before merging.

Commit as `Feature: autosave active workout drafts`.
