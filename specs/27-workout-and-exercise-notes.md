# Task 27 — Workout and exercise notes
Assignee:

## Why

A workout or an individual exercise may need a technique reminder or training comment. Plan
notes should appear in every session started from that plan, and a user should be able to
correct notes in their plan, active workout or completed training. An accepted coach can see
shared notes as part of the relationship they and the coachee agreed to.

## What

Extends PLN-10, PLN-13, RUN-02, RUN-09, REV-02 and REV-08. Proposed requirement group `NTE`
covers notes. Integrates with task 22 for authorized coach visibility and task 23 for personal
exercise use.

- Create/Edit workout has a plain-text Workout note and one Exercise note per selected exercise
  card. Describe an exercise note as a reminder for that exercise in this plan, so one workout
  can use a different cue from another workout containing the same exercise.
- Starting a workout copies those notes into the active session snapshot. Show and allow
  editing the workout note and each exercise note while training. Preserve them when opening
  progress, reordering cards, skipping sets, saving fails or an active draft is reloaded.
- Finish saves the actual note text with that completed session. Review detail shows the
  workout note and each exercise note. The owner can edit notes later through Edit workout,
  including a notes-only correction. The original measurement, IDs, grouping, skipped sets and
  actual set values remain unchanged in a notes-only save.
- Editing a template note changes sessions started afterwards. Editing an active or completed
  session note changes that session only. Completed notes remain valid after the template is
  deleted or the exercise is renamed/retired. Renaming a personal exercise never rewrites notes.
- Keep notes as optional strings on the template and exercise snapshots, and on active and
  completed workout snapshots. Read missing values in older data as empty strings. Render as
  escaped plain text, preserving useful line breaks, never HTML or Markdown execution.
- Validate note type and length in models.py and use the existing owner-filtered template and
  session save paths. Keep inputs on a failed save. Session corrections must preserve completedAt
  and clientId and continue using the saved exercise snapshot. Note changes must not be mistaken
  for a second Finish retry with changed content that silently replaces an existing session.
- An accepted coach can read the coachee's workout and exercise notes through task 22's
  specifically scoped endpoints. The coachee sees this sharing scope before requesting a coach.
  Pending, declined, unrelated and revoked relationships cannot read notes. Clear cached
  coachee notes when access ends or the selected workspace changes.
- A coach can edit plan notes only on plans they are authorized to edit under task 22. The
  coachee owns active/completed session notes. Server enforcement uses accepted relationship,
  explicit owner and creator permissions, never a hidden UI control or a body user_id.
- Preserve the warmup/cooldown fields from task 25 as separate instruction/checklist sections.
  Notes have no sets, no estimated 1RM contribution and no weekly-volume contribution.

Proposed defaults for review before implementation

- Allow up to 1000 Unicode code points for a workout note and 500 per exercise note, including
  spaces and line breaks. Show a live count using the same code-point rule as the backend.
- Exercise notes belong to their occurrence within a workout plan. A global personal note
  automatically shared by every template using the same exercise is a separate capability.
- Coaches read active/completed notes once a session is saved. Unsaved phone drafts stay on
  that device. Coaches do not edit performed-session notes or receive live updates while
  the coachee is training.
- Notes-only session updates include a revision or equivalent compare-and-update guard. Two
  devices editing the same session should receive a readable conflict instead of silently
  losing one person's saved note. Preserve the losing draft for review and retry.

## Out of scope

Rich text, attachments, direct messages, clinical records, live draft sharing, per-set notes,
a global exercise annotation system, and sending notes to external services.

## Done when

- At 375 x 667, create "Upper" with workout note "Keep today easy" and Bench press note
  "Pause on chest". Start twice. Each session begins with copies of those notes. In the first,
  change the exercise note to "Paused all sets", finish, and verify the second session/template
  still contain "Pause on chest".
- Edit the saved session note to "Paused first two sets" without changing its date or numbers.
  Review shows the correction, performed values and completedAt remain stable, and exercise
  progress and weekly volume are unchanged. A deleted template does not prevent this edit.
- Notes survive active-draft reload, opening/closing progress and a failed Finish. Exercise
  notes follow their exercise IDs through reorder and task 24's pairing/unpairing.
- A coach sees the saved notes of an accepted coachee and can change authorized plan notes.
  Revocation blocks the next note read/write, including a stale open page. Another user
  cannot retrieve or mutate notes by substituting IDs. Private weights/security fields remain
  absent from coach responses.
- Empty notes and old snapshots work. API tests reject non-string/over-limit values. Unicode
  limits match the UI, and HTML/script-like content displays literally. Two-device conflicting
  edits produce a recoverable conflict while preserving the first saved version.
- Textareas and controls work with a keyboard, labels identify workout versus exercise scope,
  text is at least 16 px, controls at least 44 px and no horizontal scrolling. Include a
  real-phone screenshot and pass all repository checks before merging.
