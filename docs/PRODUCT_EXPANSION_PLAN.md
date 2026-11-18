# GymLog expansion plan

Prepared 12 November 2026 from the eight requested ideas.

Updated 14 November 2026. The integrated local preview now implements the workflows below.
See [the local testing guide](LOCAL_PREVIEW.md) for demo accounts and restart instructions.
The remaining release gates and scientific limitations are still applicable.

| Idea | Result | Next implementation gate |
| --- | --- | --- |
| 1 Coach/coachee | Implemented locally, spec 22 | Agree consent scope and relationship defaults before shared-journal access |
| 2 Personal exercises | Implemented locally, spec 23 | Add owner-scoped catalogue storage and migration tests |
| 3 Supersets | Implemented locally, spec 24 | Preserve exercise snapshots and separate pairing from reordering |
| 4 Warmup/cooldown | Implemented locally, spec 25 | Optional 100-character sections, Done checkboxes and old-draft compatibility |
| 5 Weekly volume | Spec 26, research memo and complete catalogue audit | Approve goal policy and review draft muscle mappings |
| 6 Chart metric switch | Spec 28 plus local implementation on feature/exercise-average-weight | Review code and run CI/real-phone verification |
| 7 Workout/exercise notes | Implemented locally, spec 27 | Review note scope, ownership and snapshot behavior |
| 8 Actual-RPE e1RM | Already implemented and covered by existing tests | No formula replacement needed |

## Files

- [Coach/coachee relationships](../specs/22-coaching-relationships.md)
- [Personal exercise catalogue](../specs/23-private-exercises.md)
- [Supersets](../specs/24-supersets.md)
- [Warmup/cooldown](../specs/25-warmup-cooldown.md)
- [Weekly volume and goals](../specs/26-weekly-volume-goals.md)
- [Workout/exercise notes](../specs/27-workout-and-exercise-notes.md)
- [Chart metric switch](../specs/28-exercise-chart-metrics.md)
- [Literature evidence review](WEEKLY_VOLUME_RESEARCH.md)
- [Catalogue audit and review priorities](VOLUME_CATALOGUE_AUDIT.md)
- [All 657 draft coefficient records](VOLUME_COEFFICIENTS_DRAFT.json)

## Proposed choices to review

Coaching starts with one accepted coach per coachee. The request explains access to existing
and future training history and saved notes. Body weights and account/security fields remain
outside that access. Either person can revoke, and the API checks every delegated operation.

Exercise notes are proposed to belong to each exercise's occurrence in a plan. Workout and
exercise notes copy into each new session. Session edits affect that session only. A single
global note shared across every use of an exercise would be a different scope and needs a
decision before implementation.

Supersets are initially pairs. Unequal set counts alternate until one exercise is exhausted.
Warmup and cooldown each allow 100 Unicode code points. Their Done states are optional
reminders and do not block saving a workout.

The chart uses the arithmetic average kg per performed repetition set in a session, including
zero-kg sets and excluding skipped/timed sets. This is an explicit interpretation of average
weight. It is independent of repetitions and differs from rep-weighted load or tonnage.

For volume, user/coach goals are editable. The research did not establish an exact personal
optimum from age, gender and experience. Proposed age/experience bands organize the evidence
context. Gender does not change the set goal automatically. Read the source-linked research
memo for populations, numerical results, limitations and the distinction between raw and
fractional sets.

## Catalogue audit status

All 657 existing IDs are represented exactly once. There are 649 numeric draft mappings,
6 pending variants, one timed exclusion and one retired entry. Every row requires review and
is disabled for production counting. Values 1 for direct and 0.5 for indirect work are a
proposed accounting convention. Anatomy metadata is not a measured muscle-growth coefficient.
Historical retired entries require a reviewed mapping rather than silently deleting old volume.

The pending variants are Paused Bench Press, Spoto Bench Press, Larsen Bench Press,
chest-supported row, Bulgarian split squat and One Leg Hip Thrusts. Their exact variant
metadata was insufficient, so the registry explicitly leaves coefficients unresolved.

## Verification and status

The integrated source is on local branch feature/local-product-preview. It includes the
chart switch, coaching, personal exercises, notes, supersets, reminders and weekly volume.

Verification completed
- 78 integrated backend tests passed, covering privacy, ownership, snapshots and schema upgrades.
- 31 frontend tests passed. TypeScript, oxlint, Ruff and production build pass.
- The full feature demo was saved in the browser at 375 x 667 and reviewed as the accepted coach.
  Notes, pair labels, reminders, seconds and personal-exercise exclusions survived the round trip.
- Concurrent fresh/v1/v2/v3 migrations and a legacy-upgrade race have regression coverage.
- Full backend collection has the Windows fcntl limitation. Unchanged checkout files can still
  trigger Prettier line-ending warnings. Changed frontend files were formatted.
- Screenshot capture is unavailable. Real-phone verification and Linux CI remain release gates.

Weekly volume draft counting is enabled only by VOLUME_DRAFT_PREVIEW in the disposable local
server. Default app configuration excludes unapproved mappings. Goals are editable owner
choices. No precise individualized optimum or coach-proposed volume-goal workflow is claimed.
Nothing from the integration branch has been pushed, merged into main or deployed.

## Existing e1RM behavior

The calculation already uses actual RPE to estimate reps in reserve. It caps effective reps
at ten and applies Epley. Target RPE does not substitute for actual RPE. For example,
80 kg x 5 at RPE 8 yields 98.7 kg, while 80 kg x 5 without RPE yields 93.3 kg.

The existing implementation in backend/gymlog/models.py lines 40-51 contains
`effective = min(10, reps + (10 - rpe if rpe is not None else 0))`.
Its frontend counterpart is frontend/src/oneRepMax.ts lines 13-23.
Existing backend/tests/test_exercise_stats.py::test_estimates verifies the RPE effect.
