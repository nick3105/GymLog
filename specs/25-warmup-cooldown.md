# Task 25 — Warmup and cooldown checklist
Assignee:

## Why

A workout plan can include a short warmup and cooldown instruction without adding exercise
cards or artificial sets and repetitions. During training, each instruction needs one Done
checkbox.

## What

Extends PLN-01, PLN-10, RUN-02, RUN-09 and REV-02. Proposed requirement group `WUP` covers
these optional sections.

- Add optional Warmup and Cooldown plain-text fields to Create/Edit workout. Each field allows
  up to 100 Unicode code points, including spaces, punctuation and line breaks. Show a live
  count. Trim surrounding whitespace on save. Reject an over-limit value in the API with a
  field-specific English sentence, retaining the draft.
- Save warmup and cooldown text on the template and snapshot it when starting a session.
  Show warmup before the first exercise and cooldown after the last, each with a 44 px Done
  checkbox and the instruction text. There are no weight, reps, seconds or RPE inputs.
- Preserve each Done state in the active workout draft across reload, phone locking and
  temporary navigation to exercise progress. Restore unchecked state for a newly started
  session even if the previous session marked the section done.
- On Finish, save the instruction text and its boolean Done state in the completed-session
  snapshot. Review shows both. Template edits apply to future sessions. A coach may set these
  plan instructions under task 22's existing delegated-plan permissions.
- Empty fields produce no section or checkbox in training mode. Checkbox changes never create
  exercise/sets records and do not affect set counts, exercise progress, estimated 1RM or task
  26's muscle volume. Preserve the rule that at least one actual exercise set must be performed
  to save a session.
- Validate text type, length and Done boolean in models.py. Treat missing fields in old
  templates/sessions/drafts as empty text and false completion. Keep JSON snapshots compatible
  with existing history and note fields. Server validation must not trust client-side counts.
- Reuse the existing authenticated template/session endpoints, CSRF handling and owner scoping.
  A repeated Finish with the same clientId and unchanged checkbox values returns the saved
  session. Do not silently overwrite a previously saved different result on retry.

Proposed defaults for review before implementation

- Warmup and cooldown are reminders. An unchecked box does not block Finish and is saved as
  unchecked. Display the state without implying that the user performed the instruction.
- Instructions are edited in the template builder. Active training exposes only Done controls,
  as requested. Correcting a completed session may change Done state but retains the original
  instruction text. Free-form session comments belong to task 27.
- Count Unicode code points on both sides, using Python len and JavaScript Array.from, rather
  than UTF-16 length. A combined emoji can contain several code points and counts accordingly.

## Out of scope

Warmup exercise sets, timed countdowns, tracking time spent warming up, automatic coaching
advice, and adding warmup/cooldown activity to resistance-training volume.

## Done when

- At 375 x 667, create "Upper" with warmup "5 min easy bike, then light shoulder circles" and
  cooldown "Walk and stretch comfortably". Save and start. The warmup precedes exercises and
  cooldown follows them, each with a labelled checkbox and no numeric set inputs.
- Check Warmup, enter one Bench press set, reload, and verify the checkbox and entered set
  survive. Finish with Cooldown unchecked. Review shows the two original texts and their
  respective checked/unchecked states. A new session starts with both unchecked.
- Save a 100-code-point text successfully. Reject 101, a non-string value and a non-boolean
  checkbox through the API. A Unicode test covers emoji/supplementary characters consistently
  between the browser counter and API validation. Script-like text renders as literal text.
- Blank sections are absent during training. A completed checkbox alone cannot save a session
  with no performed exercise set. Warmup/cooldown never increase workout set counts or volume.
- Changing or deleting template instructions leaves completed history unchanged. Save retries,
  completed-workout corrections and second-user authorization behave consistently.
- Old templates and drafts without these fields still open and save. Keyboard users can edit
  text and toggle Done, text is at least 16 px, no horizontal scrolling, real-phone screenshot,
  and all repository checks pass before merging.
