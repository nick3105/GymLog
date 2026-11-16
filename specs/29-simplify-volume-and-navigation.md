# Task 29 — Simplify volume and put workout creation in Review
Assignee: nick3105

## Why
Users visit workout creation less often after building their routines. Review should contain
the creation action, while a new account should have an obvious first-workout button.
Weekly volume should show performed sets and an editable default goal of 10.

## What
Remove Optional evidence context and its age/experience/gender controls from Weekly volume.
Remove optimal-volume explanations and research links. Keep the counting explanation,
exclusions, editable goals and default10 for every muscle group. Saved goals take precedence.
The existing preference API remains compatible but the UI no longer submits profile inputs.
Collapse the exercise's superset selector behind a chain icon and blue Link as superset
action at the bottom of its card. Expand on click, preserving drag-to-pair behavior.
Remove Create from the main desktop/mobile navigation and the permanent Home action cards.
Put Create workout in Review. A new account with no routines or history sees
Create your first workout here on Home and Review.
Use /review/create for the builder and preserve /create as a redirect for existing links.
Keep coach creation, workout editing, active drafts and normal save behavior working.
Add Exercise Progress beside Weekly volume in Review. Open /review/progress with a
searchable list of distinct exercises from completed history, newest training day first,
then completion time. Only include exercises with at least one performed set (including
zero-weight sets and timed holds); exclude planned-only and entirely skipped exercises.
Use the latest performed name, including personal exercises. Search names without case
sensitivity. Selecting an exercise opens the existing progress sheet and chart metric
controls. Closing it returns to the same search. Timed holds retain their seconds summary.

## Out of scope
Individualized recommendations, new scientific rules and deleting stored profile data.

## Done when
At375x667 the bottom bar has Home/Start/Review/Weight with no gap for Create.
New accounts can reach and save their first workout. Existing accounts can create more
from Review. /create redirects to /review/create and marks Review active in navigation.
Weekly volume has no profile inputs or optimal-range content, default10 remains editable,
saved custom/zero goals remain intact, and goal changes warn before leaving unsaved.
Coach builder and old workout links still work. TypeScript, lint, tests and build pass.

A superset selector is initially collapsed, opens by clicking its labelled chain action,
and remains usable by keyboard. Pairing/unpairing and drag-to-pair keep working.
Exercise Progress shows each performed exercise once, searches correctly, keeps newest-first
order and opens charts. Empty history and no search matches have clear messages. At 375px
Review actions wrap without horizontal scrolling and exercise rows have 44px touch targets.
