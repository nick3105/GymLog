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
