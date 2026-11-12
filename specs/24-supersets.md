# Task 24 — Pair exercises as supersets
Assignee:

## Why

A superset alternates sets of two exercises. The workout builder should express that pairing
while preserving each exercise's targets and results as separate records.

## What

Extends PLN-03, PLN-10, RUN-02 to RUN-04 and REV-02. Builds on task 9's reorder interaction.
Proposed requirement `PLN-16` covers pairing and unpairing exercises.

- Give each exercise card a Link as superset action. Show eligible second exercises and allow
  choosing one. Provide the same action through dragging the second card into a clearly marked
  pair target on the first card. Keep reorder insertion targets visually distinct from pair
  targets so a normal reorder does not silently create a superset.
- During drag, highlight the prospective pair and identify both names. Cancelled drags or drops
  outside valid targets restore the original order and membership. On phones retain task 9's
  hold-before-drag behavior, edge scrolling and normal page scrolling outside the handle.
- Display the two cards in one connected visual group with a chain symbol and the text
  "Superset A". Mark each exercise A1/A2. The symbol is decorative when the text supplies its
  meaning. Provide an accessible Unlink superset control.
- Keep a flat ordered exercise array and snapshot a stable supersetId on both members. Each
  exercise retains its ID, name, measurement, targets and actual sets. The server validates two
  distinct members per non-empty group, no overlap and adjacency in the saved order. Never
  merge two exercises' set rows or transfer one exercise's numbers to the other.
- Pairing places the second member immediately after the first while retaining the relative
  order of unrelated exercises. Reorder a linked pair as one unit. Removing a member or
  unlinking clears the other member's grouping and preserves its targets and position.
- Training mode shows A1 set 1, A2 set 1, A1 set 2, A2 set 2 as the suggested sequence while
  allowing direct access to any set. The grouping remains visible when scrolling. Preserve
  existing skip, restore and extra-set behavior. A superset is display/order metadata and does
  not change the recorded exercise identity, RPE calculation or per-muscle set accounting.
- Persist groups in saved templates, active drafts and completed-session snapshots. Editing a
  template changes future sessions. Completed history keeps its original pairing. Review
  detail displays the connected group and separate performed values.
- Treat absent supersetId as unpaired for all existing templates, sessions and active drafts.
  Validate grouping in models.py and keep the JSON storage path. Add a schema migration only
  if relational storage actually changes. Do not introduce a drag-and-drop dependency.

Proposed defaults for review before implementation

- Support pairs only in this release. Reject groups of three or more and nested groups with a
  readable explanation. Either repetition or timed exercises can be paired.
- Unequal set counts are allowed. Alternate while both members have remaining sets, then show
  the remaining sets of the other member. Extra sets stay inside the same two-exercise group.
- Removing an exercise asks the existing removal action to explain that the pair will unlink.
  Moving one member independently requires Unlink first, keeping drag behavior predictable.

## Out of scope

Circuits of three or more exercises, rest timers, automatic load changes, merging exercise
progress, and counting one paired round as one set.

## Done when

- At 375 x 667, add Bench press, Barbell row and Plank. Give Bench press 3 x 8 at 60 kg and row
  3 x 10 at 40 kg. Drag row onto Bench press's pair target. The cards connect, read Superset A,
  and retain all targets. Plank remains a separate exercise in its original relative position.
- Using only the keyboard, create the same pair through Link as superset, move the pair down
  and unlink it. Focus remains on a relevant card/control, and position/group changes are
  announced. Targets, inline errors and workout name survive every operation.
- Cancel a touch drag, press Escape during a mouse drag, and drop outside the list. No pairing
  or reordering is saved from cancelled interactions. Phone scrolling and edge scrolling work.
- Save, reload and start the workout. The suggested sequence alternates A1/A2 by set index.
  Skip one row, add an extra row and finish. Review shows the saved pair and original exercise
  IDs. Changing the template later does not change that completed session's grouping.
- Pair a two-set exercise and a three-set exercise. After two rounds, only the third set of the
  second exercise remains. Unlinking or removing one member never loses the other's values.
- API tests reject self-pairs, duplicate memberships, one-member, non-adjacent, forged and
  oversized groups. Cross-user template/session authorization remains intact.
- Old ungrouped templates, Plank duration handling, save retries and historical corrections
  work. No horizontal scrolling, all explicit actions at least 44 px, real-phone screenshot,
  and all repository checks pass before merging.
