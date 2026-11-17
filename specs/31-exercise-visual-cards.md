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
new instructions, changes to Martin's completed spec 24, video files.

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

## Local verification — 17 November 2026
- Browser checked at 375 × 667: single-column cards, correct bench-press image and guide,
  missing-photo fallback for Spoto press, preserved search after closing the guide, no
  horizontal overflow (content width 375 px). Wider preview shows two columns.
- Initial version used static lazy photos; the revision below adds deliberate hold/hover previews.
- Frontend: 52 tests passed; oxlint, Prettier, TypeScript and production build passed.
- Backend: thumbnail availability and private exercise isolation covered in
  `backend/tests/test_exercise_cards.py`; original guide tests remain unchanged.
- Local preview: port 5058 with disposable data. Real-phone check still required before merge.

## Design revision — user feedback, 17 November 2026
- Put each name in a distinct header inside its own card, above the photo. Increase the gap
  between cards and add a visible outline so the name/photo relationship is unmistakable.
  This outline is an explicit exception to the default borderless card style requested by user.
- Hover or hold a finger still for one second to alternate the existing start/end photos
  every 850 ms. Stop on leave, release, scroll or pointer cancellation. A hold does not also
  open the guide; a normal tap still does. Respect reduced motion with static photos.
- Load the second photo only when preview starts. Do not animate cards without real photos.
- Missing photos use a compact, intentional text card with muscle and details/progress access,
  without a large empty frame or a misleading photo of a different movement.

## Revision verification
- Browser: delayed focus preview alternates the two actual bench-press images; the visible
  start/end positions were checked separately. Missing-photo card checked at 375 × 667,
  content width 375 px. Desktop shows distinct outlined cards with names above the photos.
- Frontend checks: 53 tests passed, oxlint, Prettier, TypeScript and Vite build passed.
- Touch hold/release and scrolling still need the user's real-phone check before publication.

## Label refinement — user decision, 17 November 2026
Remove all hold/preview instructions from photos; keep the gesture unchanged. Give the muscle
name a prominent accent pill (16 px). Show Open guide as a compact outlined pill inside the
card, keeping its target at least 44 px and avoiding nested interactive buttons.

- Preview responsiveness: preload the end-position photo during the one-second dwell, so
  the first switch does not wait for its download after the timer expires.

## iPhone interaction and layout — user feedback, 17 November 2026
- Keep touch-and-hold, not a Play button. Use native touch handlers, disable image dragging,
  selection and iOS image callouts, and cancel when the finger moves more than 10 px.
  Preserve vertical scrolling and normal short taps; a completed hold must not open the guide.
- Add an explicit List / Grid switch. List shows one card per row; Grid shows two even at
  375 px. Four columns are excluded on phones for readable names and recognisable photos.
  Start with List; keep the selected layout during guide navigation. Grid uses smaller card
  padding and allows full names to wrap; controls remain at least 44 px high.

- Further user clarification: provide three layouts. Default List is compact text rows (name,
  muscle, details action), Cards is one large photo card per row, Grid is two photo cards per
  row. This allows quick browsing of all 656 exercises without scrolling through large photos.
- Layout verification: compact List and two-column Grid checked at 375 × 667, both with
  content width 375 px. Cards selector also available; all three choices fit without scrolling.
  Frontend checks remain green: 53 tests, lint, formatting, TypeScript and production build.

## Final preview interaction — user decision, 17 November 2026
Supersedes all hold/hover decisions above: automatically alternate the real start/end photos
when at least 25% of the photo enters the viewport, without a dwell timer. Switch every 650 ms.
Stop when it leaves the viewport or the browser tab is hidden. Reduced-motion users get a static
photo. Keep the start photo visible until the end photo loads; failures keep a static photo.
List has no photos or animation; Cards and Grid use the same visibility behaviour.

## Final layout-specific preview — user correction, 17 November 2026
Supersedes autoplay for all layouts: Cards (one per row) autoplays while visible. Grid plays only
under the mouse or while a finger touches that card, stopping on leave/release/scroll. Touch
preview starts immediately; a hold lasting 400 ms suppresses the following details tap. Short
taps still open details. List stays static. Reduced motion and hidden-tab pauses still apply.

## iPhone loop and consistent grid sizing — 17 November 2026
User reports one movement only on iPhone and uneven grid boxes. Keep the visibility observer
independent of touch changes so a hold does not recreate it/reset the loop. Preserve active
touch across focus changes; allow 24 px finger jitter before cancelling for scroll.
Grid headers reserve equal space for the muscle badge and two name lines; long names are
clamped visually but remain in the full accessible name and details. All grid cards share the
same photo ratio and footer size. Missing-photo grid cards use a history/progress illustration
in that frame (not a pretend exercise photo). Large Cards keep full names and compact fallback.
- Grid sizing verified at 375 px: six cards (including three without photos) all measured
  165.5 × 306.33 px. Final frontend checks: 52 tests passed; lint, formatting, TypeScript and
  build passed. The iPhone continuous-hold loop still needs real-device confirmation.

## Phone Play controls — final user decision, 17 November 2026
Phones use explicit Play/Pause instead of touch-and-hold or autoplay, in both Cards and Grid.
One selected exercise ID belongs to the library: playing another replaces it, stopping the
previous one. List is unchanged. Opening details or changing layout clears the selection.
Desktop retains visible Cards autoplay and Grid hover/focus previews. Phone controls apply
at widths below 640 px or with a coarse primary pointer, including landscape phones.
Play is a separate real 44 px button, never nested inside another button; name and Open guide
are separate details actions. Deliberate Play can animate even when reduced motion is enabled;
automatic desktop previews still respect reduced motion. Offscreen/hidden-tab previews pause.

- User refinement: phone Play/Pause is an icon-only 44 px button below the photo, never over
  the image. Keep a full accessible Play/Pause label for assistive technology.

- Final refinement: single-column Cards autoplays on phones too; icon-only Play/Pause is
  only for phone Grid. Desktop behaviour and List remain unchanged.
