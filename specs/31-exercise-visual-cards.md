# 31 — Visual exercise library
Assignee: Gaia Bandini

## Why
Make movements easier to recognise while browsing the exercise library (NAV-04, REV-10).

## What
User chose the Exercises library page and real exercise reference images on 17 November 2026.
Replace the plain rows with photo cards: one column at 375 px, two on wider screens.
Reuse existing local start-position photos, with the exercise name, muscle and an Open guide
label. Keep names readable, photo frames stable, and the whole card a generous tap target.
Reuse the existing search ranking, group order and guide/progress sheet navigation.
Load images lazily. Exercises without a guide or with an unavailable photo show a labelled
fallback instead of a broken image. No requests per exercise to fetch guide metadata.
Expose optional thumbnail metadata in the existing authenticated state response, using only
available catalogue guides; private exercises do not inherit another exercise's photo.

## Out of scope
The Create/Edit picker, new image downloads or services, new libraries, exercise data edits,
new instructions, changes to Martin's completed spec 24, animated thumbnails.

## Done when
- At 375 × 667 cards have 44 px targets, readable text and no horizontal overflow.
- Search and muscle filtering still find the same exercises in the same order.
- Tapping a card opens the correct existing guide; closing it keeps search and scroll.
- Known movements have the correct photo; missing/failed photos have a stable fallback.
- Thumbnail metadata respects the existing authenticated catalogue and user isolation.
- Required checks pass. Verify on a real phone and attach a screenshot before merging.

## Publication
Local preview first. Publishing the branch and opening a draft PR can claim the task visibly
once the user requests it; nothing is pushed or merged automatically.
