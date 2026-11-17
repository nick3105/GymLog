# 33 — Favourite exercises in the workout builder
Assignee: Gaia Bandini

## Why
People often use the same exercises each week. Marking those exercises as favourites lets them
find them quickly while creating or editing a workout (PLN-02).

## What
This task is claimed on 17 November 2026. Each signed-in user can tap the 44 px star on an
exercise row in the library to add or remove it from their own favourites. A filled star is a
favourite; an outline star is not. The row still opens the guide when the user taps anywhere
else.

In Create and Edit workout, a 44 px star next to **Add an exercise** opens a small dropdown
directly below the control. It lists only the user's favourites, each with its muscle group; a
tap adds that exercise through the existing add behaviour. The ordinary search and muscle
picker remain available and unchanged. If there are no favourites, the dropdown plainly says so
and points the user to the Exercise library.

Favourite IDs are stored separately for each signed-in user. They may include an owned personal
exercise, but never someone else's private exercise. The API validates that the exercise is in
the selected user's catalogue before saving it. Create/Edit for a coachee does not expose the
coach's private favourite list.

## Out of scope
Changing the shared exercise catalogue, sharing favourites with other users, automatically
favouriting an exercise based on training history, reordering the ordinary catalogue, new
libraries, or changes to completed workouts.

## Done when
- Tapping a library star persists the current user's choice and never changes another user's
  favourites; API tests cover both ownership and a missing/foreign exercise.
- The builder star opens a dropdown with only that user's favourite exercises; tapping one adds
  it using the existing duplicate/add-set and 20-exercise rules.
- At 375 × 667 both stars are at least 44 × 44 px, the dropdown remains on screen without
  horizontal scrolling, and a real-phone screenshot goes in the pull request.
- Backend and frontend tests pass, including a database upgrade test for existing journals.
