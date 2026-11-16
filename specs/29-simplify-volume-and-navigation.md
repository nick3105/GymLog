# Task 29 — Simplify volume and exercise progress navigation
Assignee: nick3105

## Why
Create and Review remain separate destinations, following the user's revised preference.
A new account should have an obvious first-workout button on Home.
Weekly volume should show performed sets and an editable default goal of 10.

## What
Remove Optional evidence context and its age/experience/gender controls from Weekly volume.
Remove optimal-volume explanations and research links. Keep the counting explanation,
exclusions, editable goals and default10 for every muscle group. Saved goals take precedence.
The existing preference API remains compatible but the UI no longer submits profile inputs.
Collapse the exercise's superset selector behind a chain icon and blue Link as superset
action at the bottom of its card. Expand on click, preserving drag-to-pair behavior.
Keep Create and Review as separate desktop/mobile navigation entries and Home cards.
Review workouts contains volume/progress actions and history, without the creation box.
A new account sees Create your first workout here on Home.
Use /create for the builder and redirect the earlier /review/create URL to /create.
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
At375x667 the bottom bar has Home/Start/Create/Review/Weight without horizontal scrolling.
New and existing accounts can reach the builder from Create and Home; /review/create
redirects to /create and marks Create active in navigation.
Weekly volume has no profile inputs or optimal-range content, default10 remains editable,
saved custom/zero goals remain intact, and goal changes warn before leaving unsaved.
Coach builder and old workout links still work. TypeScript, lint, tests and build pass.

A superset selector is initially collapsed, opens by clicking its labelled chain action,
and remains usable by keyboard. Pairing/unpairing and drag-to-pair keep working.
Exercise Progress shows each performed exercise once, searches correctly, keeps newest-first
order and opens charts. Empty history and no search matches have clear messages. At 375px
Review actions wrap without horizontal scrolling and exercise rows have 44px touch targets.
