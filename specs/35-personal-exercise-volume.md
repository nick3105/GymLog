# Task 35 - Personal exercise volume and Review recovery
Assignee: nick3105

## Why
Review's Body load fails with a KeyError when a completed workout includes a personal
exercise. Users also need to choose whether new personal exercises count toward volume.
Covers PLN-15 and REV-09, and extends task 26's weekly set accounting.

## What
- User decision, 2026-11-18: new personal exercises offer the 17 precise Weekly volume
  muscles and `None - Don't count towards volume`. One completed repetition set credits
  exactly 1 direct set to the selected muscle, and 0 to every other muscle.
- Use `primaryMuscle` (a taxonomy ID or `none`) in new creation requests. The server derives
  the display group, volumeMuscle and eligibility; clients cannot submit coefficients.
  Timed holds remain excluded from Weekly volume, as in task 26.
- Snapshot the choice in templates and sessions. Corrections and retries preserve it.
  Previously saved personal exercises and old group-based creation requests keep their
  existing weekly exclusion; do not infer a precise muscle from a broad legacy group.
- Body load uses the owner's combined catalogue, skips the None group and includes personal
  exercises with a muscle group, including legacy ones. Keep its kg/seconds accounting.
  Precise groups appear in its list; the body picture shades their corresponding regions.
- Creation gets its muscle options from the server. Labels in the picker, builder, session,
  history and Weekly volume accurately explain inclusion or exclusion.
- Preserve ownership filters, existing IDs and historical snapshots. No database schema
  changes or rewriting existing records are needed; documents gain optional metadata.

## Out of scope
Editing existing personal exercises, changing built-in coefficients, changing timed-set
weekly accounting, deploying, pushing or opening a pull request.

## Done when
- Reproduce issue 004 with a disposable journal; Review returns 200 after the fix.
- Test all 17 choices and None, direct factor 1, zero indirect credits, skipped/zero-weight
  sets, timed holds, old snapshots, correction, retry, week boundaries and user isolation.
- Existing tests remain unchanged and pass. Run the full Python and frontend checks.
- At 375 x 667, create a personal exercise with a precise muscle and with None, log them,
  and check Review and Weekly volume without horizontal scrolling. Controls are at least
  44 px and input text at least 16 px. Real-phone check/screenshot required before merging.
