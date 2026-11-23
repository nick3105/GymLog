# Task 40 — Start and log a scheduled workout

**Assignee:** nick3105

## Why

A trainee can add a set or adjust reps on a scheduled workout, but the Start screen opens the reusable workout. Training from Schedule should use the targets the trainee planned for that session and show where to review the result.

## What

- Open a dated workout or a workout from **Any day this week**, including an individual copy from a series. **Start workout** opens the existing logger using that copy's exercise order, groups, set targets, RPE setting, warm-up and cooldown. This works after the source changes or is deleted.
- Use the actual local day at Start for the history entry. Keep the scheduled day or flexible week for planning. A trainee can start from any visible week, so early and late sessions remain possible.
- Keep one active workout per account. **Resume workout** restores existing inputs after reload. Tell the trainee to finish or discard a different active workout first. Discard returns the entry to a startable state. A stale Start for a changed schedule requires a reload.
- Before starting, trainees can still adjust the scheduled copy for progression. While it is in progress or completed, the scheduled targets and placement are read-only. The existing logger accepts actual reps, extra sets and skipped sets.
- When a trainee logs an existing scheduled workout, save the completed session and its link to the private schedule entry together. After saving, show **Completed** and **Review workout** for that entry. Retrying the same save keeps one session and never clears a newer draft.

- A dated scheduled entry can also be linked through the API to an already completed session with the same date and template. See [issue 006](../issues/006-link-completed-workouts-to-schedule.md).

## Out of scope

Logging the AI Assistant's text-only competition cards, recording race or meet results, automatic rescheduling and automatic changes to future training targets.

## Done when

- Create a schedule, add a set and change the reps on one dated entry, then edit or delete its source. Start from Schedule and verify the logger shows the scheduled targets. Finish and review the actual sets. Verify the planned day and the logged day can differ.
- Start an undated copy from a series. Reload and resume it, then discard and start it again. Verify a different active workout blocks Start and one copy's completion does not affect the other entries.
- Verify account isolation, CSRF enforcement, stale edits, retry safety, and ordinary workout logging. Existing databases require no schema migration.
- At 375 × 667, verify the Start and Resume actions, readable status and Review link without horizontal scrolling. Check on a real phone and attach the screenshot before merging.

**BRD:** SCH-08 to SCH-11, RUN-09 and RUN-11.
