# Task 16 — Edit a body-weight measurement

Assignee: annalisa2912

## Why

Users need to correct a body-weight entry without creating a second measurement for the same
date. This extends WGT-03 and WGT-06 in the existing Weight Tracker.

## What

- Add an **Edit** button beside each entry in the Weight Tracker's measurement history.
- Selecting Edit loads that entry's date and weight into the form and makes the date read-only
  while editing, so the change updates the selected entry rather than creating another date.
- Change the form action to **Update weight** and provide a **Cancel** action while editing.
- Save through the existing `POST /api/weights` upsert. Keep the current entry and form values
  available if saving fails; show the server's error sentence.
- After saving, refresh the chart, latest measurement and history from the updated journal state.

## Out of scope

- Deleting a measurement, changing its date, or adding weight goals.
- Changes to chart scaling or to the weight API and database schema.

## Done when

- With 80.2 kg saved for 2026-11-06, tap Edit: the form shows 2026-11-06 and 80.2 kg, and the
  date cannot be changed during the edit.
- Change the value to 80.5 kg and tap Update weight: the history has one entry for 6 Nov 2026 at
  80.5 kg, and the chart and latest value reflect 80.5 kg.
- Tap Edit and then Cancel: the saved measurement remains unchanged and the form returns to its
  normal save state.
- If saving fails, show the server's error sentence and keep the entered value available to retry.
- The Edit and Cancel controls are at least 44 × 44 px, and the flow fits at 375 × 667 without
  horizontal scrolling.
- Check the flow in a browser at 375 × 667 and on a real phone before merging.

Commit as `Feature: edit body-weight measurements`.
