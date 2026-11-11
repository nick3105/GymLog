# Task 9 — Reorder exercises while creating a workout

Assignee: Gaia Bandini

Branch `feature/gaia-reorder-exercises`. Builds on Task 4, `specs/04-workout-builder.md`.

## Why

People plan workouts in the order they intend to train. They should be able to move an exercise after setting its targets without removing it and entering those targets again.

## What

- On `/create`, give each exercise card a labelled drag handle when the workout contains at least two exercises. Drag the handle with a mouse or a finger to move the entire card. Show the insertion position as the card moves. On a phone, allow the list to scroll when dragging near its edges and allow normal page scrolling from outside the handle.
- Provide accessible Move up and Move down controls for each card. Disable the control that would move a card past either end. Keep focus on the moved card and announce its new position, for example, “Bench press, 2 of 3.”
- Apply the new order when the user drops the card at a valid position. Cancelling the drag or dropping outside the list restores the prior order. Preserve every exercise ID, set row, target and validation error with its card.
- Save the exercises in the displayed order through `POST /api/templates`. After reload, the saved template and the workout started from it use that same order. If saving fails, keep the draft order so the user can retry.
- Related BRD IDs are PLN-02 and PLN-03 for adding exercises and PLN-10 for saving the template. Drag-and-drop is an added interaction for Task 4.

## Interaction agreed with Gaia

- Touch: hold the labelled grip for 300 ms, then move the card up or down. A short tap does not reorder. Moving before the hold activates cancels the gesture. Mouse: drag immediately from the grip.
- Use existing React and Pointer Events, with no new dependency. The card highlights when picked up, a lime insertion line previews the drop position, and Escape, pointer cancellation or a drop outside the list cancels.
- Reordering is available only while creating a new template; the saved-template editor and active sessions stay outside this task.

## Out of scope

- Reordering sets within an exercise, exercises in saved templates, or exercises in an active workout.
- Changes to the legacy UI, the exercise catalogue, or target validation.

## Done when

- On a 375 px touchscreen, add Squat, Bench press and Deadlift in that order. Give Bench press two distinct set targets. Drag Deadlift above Squat and see Deadlift → Squat → Bench press. The drop position is visible, the page can scroll during a long drag, and the layout has no horizontal scrolling. Bench press retains both targets.
- With a mouse, move a card downward. Start another drag and cancel it with Escape or by releasing outside the list. The previous order is preserved.
- Using only the keyboard, move Bench press up one position. Focus stays on the card and its new position is announced. With just one exercise there is no enabled reorder action.
- Save the workout, reload, and start it. The order matches the builder at Save, and all set targets match their original exercise. If a save attempt fails, the order and targets are still present for retry.
