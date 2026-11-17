# 32 — Filter the exercise library by equipment
Assignee: Gaia Bandini

## Why
Find movements suitable for the equipment available in the gym without browsing hundreds
of irrelevant exercises (NAV-04, PLN-02).

## What
User requested this as a separate branch on 17 November 2026. Add an Equipment selector to
Exercises, working together with the existing muscle filter and ranked search, in every layout.
Options: All equipment, Barbell, Dumbbells, Cables, Machines, Bodyweight, Kettlebells, Bands,
and Other / unspecified. User explicitly approved Kettlebells, Bands and Other.
Default All; changing equipment preserves the query, muscle and layout. Announce result counts
and keep the existing no-results message. Closing a guide preserves the selected equipment.

Import equipment once from the same public-domain free-exercise-db snapshot already used by
spec 24 (commit f00c92c). Match existing guide source IDs, then exact normalised dataset IDs or
exact normalised names; do not infer equipment from substrings. Keep exercise IDs, names,
groups, order, guides and all saved routines/history unchanged. No runtime external requests.
Map barbell/e-z curl bar to Barbell; body only to Bodyweight; kettlebells to Kettlebells;
exercise/medicine balls, foam rolls, other or unspecified data to Other / unspecified.
Unmatched catalogue and private exercises remain available under All and Other / unspecified.
No edits to the private exercise form or historical snapshots.

## Out of scope
Changes to the Create/Edit picker, multiple-equipment selection, available-machine inventory,
exercise instructions/photos, new services/libraries, editing another person's tasks.

## Done when
- Every public catalogue record has a supported equipment category, and representative
  barbell, dumbbell, cable, machine, bodyweight, kettlebell and band examples are checked.
- Combining search, muscle and equipment preserves search order and returns their intersection.
- Private exercises stay private; unspecified equipment never hides them from All/Other.
- At 375 × 667 the selector is 44 px tall, readable, keyboard-accessible, and causes no overflow.
- All required checks pass; verify on a real phone before merging.

## Branch relationship
`feature/exercise-equipment-filter` starts from the completed local spec 31 branch, so the
preview includes the cards. The equipment changes are separate commits. Review/merge spec 31
first, or initially compare this branch against `feature/exercise-visual-cards` so its PR shows
only the equipment task. Neither branch tracks main and nothing is pushed automatically.

## Import record
Source: https://github.com/yuhonas/free-exercise-db/tree/f00c92c (`dist/exercises.json`),
public domain / Unlicense, downloaded to a temporary directory on 17 November 2026.
643 guide source IDs matched exactly; other exercises used exact normalised ID/name matches.
Unmatched items remain Other / unspecified. All fields except the new equipment tag were
compared with the pre-import catalogue and remained identical, including order.

## Menu design — user feedback, 17 November 2026
Replace the native select with a themed Equipment button and a native dialog styled as a
bottom sheet on phones and a centred panel on desktop. Large two-column options show a check
on the current selection; selection applies immediately and closes. Close/Escape keep the
previous value and return focus to the trigger. The sheet scrolls within short screens and
respects the home-bar safe area. No extra library or new CSS file.

## Final dropdown refinement — user correction
Supersedes the bottom sheet: keep a rounded trigger with a small chevron, and open a rounded
panel immediately below it. Single-column rounded option rows, selected checkmark, max height
42dvh with internal scrolling (keeps options above phone navigation). Outside click, focus leaving the control, or Escape closes it;
Escape and selection return focus to the trigger. No full-screen modal or bottom drawer.

## Local verification
- Full backend checks: 168 tests passed, Ruff lint and formatting passed.
- Frontend checks after final dropdown styling: 54 tests passed, oxlint, Prettier,
  TypeScript and production build passed.
- At 375 × 667: equipment plus muscle plus text search returned their intersection; opening
  and closing a guide preserved equipment. Dropdown selection and Escape closed the panel
  and selection returned keyboard focus to its trigger. No horizontal overflow.
- Preview runs locally on port 5058 with disposable data. Real-phone confirmation remains.
- Changes stay on `feature/exercise-equipment-filter`; no push or merge performed.
