# GymLog exercise-volume catalogue audit

Draft review material, 12 November 2026. This file accompanies `VOLUME_COEFFICIENTS_DRAFT.json`.
It contains a complete identity-level audit of the catalogue and a proposed metadata-based
counting registry. Production counting is disabled for every row.

## Coverage

| Audit result | Exercises |
| --- | --- |
| Catalogue IDs audited, including the retired entry | 657 |
| Active selectable exercises | 656 |
| Draft numeric profiles inferred from anatomy metadata | 649 |
| Pending mapping with no numeric coefficients | 6 |
| Excluded timed hold | 1 |
| Excluded retired entry | 1 |
| Production-approved profiles | 0 |

The external metadata matches 614 catalogue IDs by a normalized exact ID and 37 by an
explicit proposed-name alias. Those 651 identity matches include the timed and retired entries.
Identity confidence does not establish confidence in a hypertrophy coefficient.

| Catalogue display group | Entries |
| --- | --- |
| Chest | 71 |
| Shoulders | 111 |
| Triceps | 68 |
| Back | 90 |
| Biceps | 50 |
| Forearms | 19 |
| Quads | 85 |
| Hamstrings & glutes | 68 |
| Calves | 15 |
| Core | 80 |

The counts include retired and timed rows. Every ID appears exactly once in the registry.
Validation checked equal ID sets, uniqueness and numeric values restricted to 1 or 0.5.

## What the coefficients mean

The draft convention assigns 1 to a source-labelled primary muscle and 0.5 to a
source-labelled secondary muscle. This is a starting point for set bookkeeping.
It does not quantify the proportion of muscle activation, mechanical work, hypertrophy or
an individual's response. A 0.7 triceps multiplier for chest press would imply precision
that this audit has not established.

The evidence behind the proposed counting convention and its limits is summarized in
[the scientific review](WEEKLY_VOLUME_RESEARCH.md). The registry remains an unvalidated
exercise-level mapping candidate.

Surface EMG amplitudes should not be transformed into these multipliers. A methodological
review describes the limited validation of acute EMG as a predictor of longitudinal
hypertrophy. [Vigotsky et al., 2022](https://pubmed.ncbi.nlm.nih.gov/35006527/)

The published dataset is an exercise-description source, with primary and secondary muscle
tags. It is not a scientific table of muscle-specific dose coefficients.
[free-exercise-db](https://github.com/yuhonas/free-exercise-db)

## Source and provenance

The source is pinned to free-exercise-db commit
`f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5`, containing 876 exercise definitions.
The registry records the source file hash, catalogue file hash, source exercise ID and
per-exercise source URL. The source is distributed under the Unlicense.
[Source JSON](https://github.com/yuhonas/free-exercise-db/blob/f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/dist/exercises.json),
[license](https://github.com/yuhonas/free-exercise-db/blob/f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/LICENSE.md)

Exact identity matches receive high identity confidence. Explicit aliases receive medium
identity confidence and a `human_alias_confirmation_required` flag. All rows have
`reviewRequired: true`, `eligibleForProductionCounting: false` and
`exerciseSpecificDoseEvidence: "not_established"`. No profile is ready for live use solely
because its name matched.

## Muscle taxonomy

The registry retains 17 muscle labels from the source.

| Registry ID | Meaning |
| --- | --- |
| abdominals | Abdominal muscle group, with individual muscles unspecified |
| abductors | Hip abductors |
| adductors | Hip adductors |
| biceps | Biceps group as labelled by source |
| calves | Calf group |
| chest | Pectoral group |
| forearms | Forearm group |
| glutes | Gluteal group |
| hamstrings | Hamstring group |
| lats | Latissimus group |
| lower_back | Lumbar extensor region |
| middle_back | Middle-back region, specific muscles unspecified |
| neck | Neck muscles, unspecified |
| quadriceps | Quadriceps group |
| shoulders | Deltoid region without separate heads |
| traps | Trapezius group |
| triceps | Triceps group |

These labels are more specific than GymLog's current picker groups but still include broad
regions. In particular, `shoulders` does not distinguish anterior, lateral and posterior
deltoids. `middle_back` may overlap a displayed upper-back/traps grouping.

The current Back picker combines lats, middle back, lower back, traps and neck.
Hamstrings & glutes combines hamstrings, glutes, abductors and adductors.
Those groups cannot be assigned a single evidence-based muscle-growth target by simply adding
their individual sets. If several registry labels are combined for a display group, count the
maximum credit for that group per set, not the sum. The safer product design keeps distinct
muscle targets and labels broader anatomical regions honestly. This is an implementation
proposal derived from the taxonomy.

## Review priorities

| Flag | Rows carrying it |
| --- | --- |
| Compound exercise may include stabilisers among secondary tags | 400 |
| Deltoid heads unspecified | 285 |
| Four or more secondary muscles in source | 100 |
| Explicit alias requires confirmation | 37 |
| Olympic/ballistic movement needs transfer review | 35 |
| Source primary lower-back or neck tag needs loading review | 15 |
| Missing exact variant, no numeric mapping | 6 |
| Generic pulldown assumed front wide grip | 1 |

Flags overlap. They identify work required before release.

Some source-derived examples expose why the draft requires review.

| Exercise | Metadata-derived draft | Required review |
| --- | --- | --- |
| Bench press | chest 1, shoulders 0.5, triceps 0.5 | Confirm conventional bench movement and keep the fractional convention visible |
| Chest press machine | chest 1, shoulders 0.5, triceps 0.5 | Machine geometry and grip vary |
| Squat | quadriceps 1, calves/glutes/hamstrings/lower back 0.5 each | Secondary tags do not establish hypertrophic set credit |
| Deadlift | lower back 1 and eight secondary groups at 0.5 | Separate prime-mover stimulus from grip and stabilisation and avoid summing all Back labels |
| Hip thrust | glutes 1, calves and hamstrings 0.5 | Do not infer dose credit for every listed stabiliser |
| Lat pulldown | lats 1, biceps/middle back/shoulders 0.5 | The generic name does not specify grip or elbow path |
| Rear delt fly | shoulders 1 | The source taxonomy loses the intended posterior-deltoid specificity |

The squat concern has direct longitudinal support. In a 10-week study of 17 men,
quadriceps and gluteal measures increased while hamstring volume did not change in either
squat-depth group. This does not prove a universal zero coefficient. It shows why a secondary
anatomy tag alone cannot justify half a hypertrophy set for hamstrings.
[Kubo et al., 2019](https://pubmed.ncbi.nlm.nih.gov/31230110/)

A human review should resolve each profile against its instructions, intended technique and
longitudinal evidence where available. An unreviewed metadata profile should never be
presented to the user as an individual muscle-growth optimum.

## Pending mappings

These entries deliberately have `coefficients: null`.

| ID | Reason |
| --- | --- |
| paused-bench-press | No exact source variant; inheritance from ordinary bench needs explicit review |
| spoto-bench-press | Partial range/technique is not described by an exact source variant |
| larsen-bench-press | Leg-drive restriction has no exact source metadata |
| chest-supported-row | Implement, grip and elbow path are unspecified |
| bulgarian-split-squat | The source has split-squat variants but no exact Bulgarian definition |
| one-leg-hip-thrusts | The bilateral thrust source is not automatically copied to the single-leg variant |

A release may ship with unclassified exercises only if the interface explicitly shows their
uncounted sets. It must not silently treat missing mappings as zero contribution.

## Excluded rows and historical treatment

Plank is a timed hold and has `status: "excluded_timed"`. Seconds are not converted to
hypertrophy set equivalents in this proposed first release. A future timed-exercise model
needs a separate evidence and product decision.

Bench Press - Powerlifting is retired and has `status: "excluded_retired"`. It stays out of
new exercise selection. All historical IDs, names and actual sets must remain intact.
Its old source primary tag is triceps, while ordinary bench press is tagged chest, which
also makes automatic history consolidation inappropriate.

For past sessions, use a documented mapping version to compute reports without rewriting
the saved exercise snapshots. If a retired ID later receives an approved legacy mapping,
show the resulting historical volume under that mapping version. Until then, display the
uncounted historical sets. Do not drop them or secretly merge exercise IDs.

Private user-created exercises are absent from this public registry and remain excluded
from automated volume calculations, as requested. Their logged sets should be reported as
uncounted custom sets.

## Implementation and acceptance proposal

Store this material under documentation or review assets while it is a draft. The running
app should not import it.

Before a production registry is introduced, require all of the following.

1. A versioned, reviewed muscle taxonomy and one reviewed profile per enabled exercise.
2. Separate direct-set and fractional-set totals, with the convention visible.
3. Completed working sets only. Skipped sets, warmup/cooldown text and timed holds do not add
   fractional hypertrophy sets. The treatment of unknown effort and low-effort sets must be
   an explicit rule rather than inferred from missing RPE.
4. Per-set grouping prevents a superset from counting twice. Each performed exercise set is
   counted once before muscle coefficients are applied.
5. Session dates follow the user's local week boundary, with an explicit week-start setting.
6. Mapping revisions are versioned. Editing/deleting a session recomputes its week's
   report. No computed totals are written into saved session snapshots.
7. The displayed comparison is described as a configurable reference range and accounting
   estimate. A person-specific biological optimum is not established by this registry.

Validation performed on the draft found 657 unique IDs, exactly equal to the input catalogue,
649 draft numeric profiles, six unresolved profiles and two explicit exclusions. No runtime
code, tests, migrations or user data were changed by this audit.
