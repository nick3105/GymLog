# Task 26 — Weekly muscle volume and goals
Assignee:

## Why
Users want to compare their performed weekly sets with a useful muscle-specific goal.
The literature review does not establish a validated individual optimum from age, gender
and training experience. The product must explain what it counts and whose goal it shows.

## What
Extend REV-01 with a Weekly volume tab. See docs/WEEKLY_VOLUME_RESEARCH.md,
docs/VOLUME_CATALOGUE_AUDIT.md and docs/VOLUME_COEFFICIENTS_DRAFT.json.
These are planning evidence and an unapproved mapping candidate. Nothing in the draft
registry is eligible for production counting.

- Show a selected local-calendar week (Monday through Sunday), previous/next week controls,
  estimated performed sets per muscle, the user/coach goal, and the exercise breakdown.
  Identify which goal is used and show direct sets and estimated indirect contribution.
- Count completed, non-skipped repetition sets in saved sessions by the session's local day.
  Include extra sets and zero-external-load bodyweight work. Exclude unsaved plans, warmup/
  cooldown instructions, timed holds, and all personal exercises. Show excluded set counts
  and their reasons. Superset pairing never changes each member's individual contribution.
- Use a versioned, reviewed exercise-to-muscle registry. A proposed convention is direct 1,
  indirect 0.5 and excluded 0. Coefficients need not sum to 1. The draft's 17 muscle groups
  are distinct from the existing 10 picker groups. Do not substitute the picker group for
  an anatomical mapping or infer adaptive stimulus from EMG percentages.
- Every catalogue ID must have a reviewed numeric mapping or explicit exclusion reason.
  Resolve six currently pending mappings and review all 649 numeric draft profiles.
  Source metadata, aliases and heuristic role weights are not scientific validation.
  Never load docs/VOLUME_COEFFICIENTS_DRAFT.json automatically into the application.
- Compute totals in models.py from owned session snapshots. No cached totals or per-session
  computed volume stored in SQLite. Return counts, coverage, mapping version and goal source
  through an authenticated API. Existing authorization must exclude other users' sessions.
- Recompute after session corrections. Retired exercises in old history require a reviewed
  historical mapping; retirement alone must not erase their performed work. Unknown IDs
  remain visible as excluded coverage. Freeze or explicitly select a mapping version per
  comparison so a mapping change cannot silently rewrite historical comparisons.
- Allow editable weekly goals per muscle. Label them Your goal or Coach goal. An accepted
  coach may propose goals only through task 22's authorized workspace; the coachee confirms
  a proposed coach goal. Revocation ends delegated edits and preserves accepted owner goals.
- Optional age bands under 18 / 18-39 / 40-64 / 65+, and experience under 1 year / 1-under 3 /
  3+ years organize evidence context. These are product categories, not biological cutoffs.
  Do not apply gender multipliers. No date of birth or sensitive health fields are needed.
  For under-18s or rehab-specific needs, omit adult-evidence automatic recommendations.
- Show source-linked reference information beside editable goals. Do not present an exact
  evidence-derived Optimum number or automatic red/green adequacy judgement. Population
  ranges from older raw-set studies must not be compared as equivalent fractional sets.
- Reuse the current stack. If persisting goals/preferences, use the next schema migration,
  owner filters, CSRF, revision-safe updates and populated old-database upgrade tests.

Proposed defaults for review before implementation

- The first release tracks hypertrophy-related set exposure with optional manual goals.
  With no goal, show Not set rather than inventing a target. Strength and power goals need
  different evidence policies. Automatic recommended ranges require a later reviewed policy.
- Store age/experience context only when the user opts in. Gender is not required.
- Review direct/indirect muscle roles and technique-sensitive variants before activating
  mappings. All 657 draft rows currently have reviewRequired=true.

## Out of scope
Medical or rehabilitation prescriptions, calorie calculations, guaranteed optimal volume,
EMG-derived coefficients, automatic load progression and countdown timers.

## Done when
- At 375 x 667, Review > Weekly volume shows a readable stacked muscle list, week controls,
  goal labels, direct/indirect breakdown and exclusions without horizontal scrolling.
- With an approved test mapping chest=1 and triceps=0.5 for chest press, three performed sets
  yield chest=3 and triceps=1.5. A skipped fourth set adds zero. This is an accounting fixture.
- A completed personal exercise, Plank and warmup text do not enter numeric muscle totals.
  Personal/unsupported set coverage remains visible. A superset's two members count separately.
- Sunday/Monday boundaries use local session days, not UTC completion dates. Corrections,
  extra sets and repeated saves produce correct totals without double counting.
- Review confirms exact ID coverage, bounded finite coefficients, taxonomy, provenance,
  versioning and explicit exclusions. Pending/unreviewed rows cannot enter production totals.
- A stranger cannot read or change goals or totals. A pending/revoked coach has no access.
  Two-device goal conflicts preserve the first saved version and the losing draft.
- Before implementation, agree the reference-range policy and anatomical mappings. Run
  migration, accounting, ownership and boundary tests plus all repository checks.
