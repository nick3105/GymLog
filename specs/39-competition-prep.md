# Task 39 - AI competition preparation
Assignee: nick3105

## Why

An athlete preparing for a competition needs a schedule that fits the time left
and builds from their current training. An athlete halfway through a programme
needs a different plan from one who is just getting started.

## What

- PREP-01: Add **Competition prep** to Schedule and **Prepare for a competition**
  to the AI Assistant. Support powerlifting, HYROX and marathon. Ask for the
  event date and current stage before generating anything. A chat request can
  prefill a supported sport and an ISO date.
- PREP-02: Ask about recent training, time per session and sessions per week.
  Ask for exact weekdays only when wanted. Accept an optional goal, equipment
  or other commitments. An unknown benchmark does not prevent a plan.
- PREP-03: Generate a draft through the existing opt-in free model. Use up to
  24 calendar weeks, 1–7 sessions a week and 15–180 minutes a session. Show
  calendar dates, weekly focus, duration and actionable steps. Compute slots in
  Python using available days before the event. Leave flexible workouts undated
  and ordered. Competition day is a separate calendar marker.
- PREP-04: Preview local existing workout counts and edit names, durations or
  steps, or remove a session. Only **Save plan to Schedule** writes the event
  and workouts, in one revision-checked update. Retries must not duplicate data.
  Use the existing schedule JSON. Existing templates and history stay intact.
- PREP-06: Ask before sharing the user's prep answers with Requesty and its
  model host. Exclude event name, account details and stored journal data.
  Bound and validate provider output, allow one- to five-step training cards,
  and retain the intake or preview on error. Reuse AI-05/06 and SCH-01–07.

## Out of scope

Starting or logging activities from these planning cards, editing a saved block
in place, rescheduling a postponed event, race results, device imports, medical
advice, weight-cut plans, paid-model fallback and deployment changes.

## Done when

- From the Assistant, prepare for a dated powerlifting meet, report being midway
  through a programme, and choose three sessions per week. The draft reflects
  the reported stage and no session is scheduled on or after the event.
- Test all three sports with a fake provider. Confirm flexible and exact-day
  placement, differences in recent training, unknown benchmarks and clipped
  first/race weeks.
- Edit one occurrence and save. A repeat request produces the same event and
  workouts, a stale save preserves the draft, and another account sees neither.
- At 375 × 667, review a week, edit a workout, and save without horizontal scroll.
  The athlete sees the event and training cards after reload. Check a real phone
  before merging.
