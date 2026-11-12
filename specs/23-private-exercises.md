# Task 23 — Personal exercise catalogue
Assignee: nick3105

## Why

A person may need a rehabilitation or sport-specific exercise that is absent from the shared
catalogue. They can create a private exercise and use it in their workouts without publishing it
for other users or implying that GymLog knows its muscle-volume contribution.

## What

Extends PLN-02, PLN-03 and PLN-12. Proposed new requirement `PLN-15` covers personal exercises.
Depends on task 21 for timed sets. Integrate with task 22 when a coach creates a plan for a coachee.

- In the exercise picker, provide Create personal exercise even when the search has no matches.
  The form includes name, primary catalogue group and measurement. Use existing repetition
  sets or duration in seconds, with the existing validation and display paths for each.
- Show "Personal exercise — excluded from weekly volume estimates" before creation, in the
  picker result and in its details. Task 26 must list excluded performed sets separately from
  estimated muscle totals. A chosen group alone never makes a private exercise volume-eligible.
- A successful create returns the exercise to the current picker and allows adding it to the
  current workout. Preserve the workout draft when the form is cancelled or a save fails.
- Store personal exercises in SQLite with a stable opaque ID, owner user_id, name, group,
  measurement and timestamps. Choose IDs that cannot collide with built-in catalogue IDs.
  The owner is the authenticated user, or the explicitly authorized coachee in task 22's coach
  workspace. A coach-created personal exercise belongs to the coachee, survives revocation and
  never appears in the coach's own catalogue merely because they created it.
- Return a combined picker catalogue of active built-in exercises plus exercises owned by the
  selected journal owner. Authorize template validation and exercise-stat routes against that
  same owner-specific catalogue. Personal name, targets and measurement are snapshotted in
  templates and sessions just as built-in exercises are.
- Every personal-exercise query and mutation includes owner user_id. A supplied exercise ID,
  group or source field never grants access. Only the server marks source as personal and
  volume eligibility as excluded. Do not accept client-supplied muscle coefficients.
  Creation accepts a stable client-generated request ID, unique with owner user_id, so retrying
  an interrupted request returns its original exercise instead of inserting another.
- Proposed routes are authenticated `POST /api/exercises/personal` and owner-scoped catalogue
  retrieval through `/api/state`. Coach routes use task 22's delegated namespace and accepted
  relationship check. Return plain-English field errors and apply CSRF to creation.
- Add a versioned SQLite migration and tests with populated old data. Existing built-in IDs,
  templates, sessions and old active drafts remain usable. Use the current Python/React stack.

Proposed defaults for review before implementation

- Names contain 1–80 Unicode code points after trimming. A case-insensitive duplicate name
  within the same personal catalogue is rejected. Duplicate built-in names are discouraged in
  the picker but remain distinct IDs if the user confirms the personal variant.
- Creation supports the ten existing primary groups. Rehabilitation context stays in optional
  exercise notes from task 27, rather than introducing a separate health-data field here.
- The first release supports creation and use. Renaming, archiving, changing measurement after
  creation, and permanently deleting personal exercises are separate follow-ups.

## Out of scope

Publishing to the shared exercise catalogue, muscle-coefficient editing, importing exercises
from external services, exercise images, and clinical guidance about rehabilitation movements.

## Done when

- At 375 x 667, Alice opens Create personal exercise from an empty "rehab rotation" search,
  sees the weekly-volume exclusion and creates "Rehab shoulder rotation" in Shoulders with
  repetition sets. The original workout name/targets remain, and the new exercise can be added.
- Alice creates a seconds-based "Balance hold", plans 3 x 30 seconds, logs 30/25/20 and sees
  seconds in history. The ID stays stable through reload and later workout use.
- Bob cannot search, fetch stats for, or use Alice's personal exercise in a submitted template
  by guessing its ID. An accepted coach can use it only inside Alice's authorized workspace.
- A coach creates "Alice rehab" for Alice and the relationship ends. Alice still owns the
  exercise and its completed results. The coach cannot continue reading or using it for Alice.
- Task 26 counts neither the personal exercise's group nor its chosen name toward muscle
  volume. It reports the performed personal sets as excluded with the displayed explanation.
- Reject blank and over-limit names, invalid group/measurement and forged owner/source fields.
  A failed request retains all form values. Duplicate retries do not create duplicate exercises.
- Upgrade a populated previous schema without losing IDs or journal records. Existing built-in
  selection, Plank, template editing and saved-workout correction tests still pass.
- All actions are keyboard-accessible, text input is at least 16 px and controls at least 44 px.
  No horizontal scrolling at 375 px. Run all checks and attach a real-phone screenshot.
