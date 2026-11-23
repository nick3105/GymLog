# Task 37 - Optional workout RPE
Assignee: nick3105

## Why
Plan and log workouts without entering effort ratings. Extends PLN-09 and RUN-07;
preserves RUN-08, RUN-09, REV-08 and the BRD estimated 1RM rule.

## What
- User decisions, 2026-11-22: one workout-level Use RPE toggle in Create and Edit.
  New workouts default off. Every previously saved workout defaults on, including
  workouts without any RPE targets. Previously started drafts also default on.
- Save the boolean `rpeEnabled` in the workout document and copy it into active
  drafts and completed session snapshots. A missing flag means on for compatibility
  with existing documents and older API clients; the new builder explicitly sends false.
- Off hides target and actual RPE inputs for repetition and timed exercises, and
  saves RPE as null. Hidden values never influence live or saved 1RM estimates.
  Enabling RPE retains the existing optional 1-10 ratings in steps of 0.5.
- Switching off clears the ratings when saving; completed history stays unchanged.
  Correcting an RPE-disabled completed session cannot add RPE back into its estimate.
- The API enforces the saved workout setting, rather than trusting session inputs.
- Scheduled copies and their shared workout editor preserve the RPE setting when
  adjusting sets or reps, without changing the reusable source workout.
  No schema change is needed: the flag is an optional field in existing JSON documents.
- An RPE-disabled 100 kg x 5 set estimates 116.7 kg, even if a client sends RPE 8.
  With RPE on and RPE 8, it estimates 123.3 kg. Without a rating it stays 116.7 kg.

## Out of scope
Per-exercise toggles, changing the 1RM formula, modifying old completed results,
new dependencies, deployment, and unrelated changes already in the working tree.

## Done when
- At 375 x 667, Create defaults off; Edit restores the saved setting, and old
  workouts open with RPE on. The toggle has a minimum 44 px touch target.
- Turning RPE on reveals its fields; off removes the column and gives remaining
  fields the space. No horizontal scrolling in either mode.
- Start, draft save/restore, Finish, and completed-session correction preserve the
  setting. Repetition and timed sets work with it off.
- Tests first demonstrate the missing behavior, then pass for disabled, enabled,
  legacy, reload and second-user isolation cases. All project checks pass.
- Browser checked at 375 x 667; a real-phone check and screenshot are required
  before merging.
