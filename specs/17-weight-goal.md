# Task 17 — Set a body-weight goal

Assignee: annalisa2912

## Why

The Weight Tracker shows measurements and their trend, but users cannot see a chosen weight
target or how many kilograms remain to gain or lose. A simple, user-chosen goal makes that
progress visible without estimating how quickly it will happen.

## What

- Let a signed-in user choose whether they want to lose or gain weight, then set, change, or
  clear one optional goal weight in kg from the Weight Tracker.
- When a latest measurement exists, require a weight-loss goal to be lower than it and a
  weight-gain goal to be higher than it. If no measurement exists, allow setting a goal either way.
- Save the goal privately for that user through the existing API architecture. It must remain
  available after sign-out, reload, and sign-in on another device.
- When a goal and a latest weight exist, show the goal and remaining kilograms in the selected
  direction: for weight loss `max(latest weight − goal weight, 0)`; for weight gain
  `max(goal weight − latest weight, 0)`. Show **Goal reached** when the latest weight reaches or
  passes the goal in the selected direction; never show a negative remaining amount.
- When measurements and a goal exist, show a labelled horizontal goal line in the existing weight
  chart and include the goal in its vertical range.
- When a goal exists but there is no weight measurement yet, show the goal and explain that a
  measurement is needed to calculate what remains. When no goal exists, keep the existing Weight
  Tracker flow clear and offer a way to set one.
- Use the same valid kg range and decimal precision as body-weight measurements. Show a clear
  sentence on validation or save errors and keep the entered goal available for retry.
- Keep goal data isolated between users. Saving or changing one user's goal must not affect any
  other user's journal.

## Out of scope

- Maintenance goals, BMI, health advice, target-date predictions, or recommended goal weights.
- A progress percentage or starting-weight snapshot; this task reports the current remaining kg.
- Changes to measurement history or measurement editing.

## Done when

- On a 375 × 667 screen, choose lose and set a goal of 75 kg with a latest measurement of
  80.2 kg. The Weight Tracker shows **5.2 kg to lose**, with no horizontal scrolling.
- Save a new latest measurement of 79.8 kg. The remaining amount updates to **4.8 kg to lose**.
- Choose gain with a latest measurement of 80.2 kg and a goal of 85 kg. Show **4.8 kg to gain**.
- Reject a loss target equal to or above the latest measurement and a gain target equal to or
  below it, with a clear sentence beside the field.
- The chart shows a labelled horizontal goal line at **75 kg**, distinct from the measurement line.
- With a latest measurement of 75 kg or less, show a prominent positive **Goal reached — great
  work!** message and no negative remaining amount.
- With no measurements, setting a goal succeeds and the page explains that a measurement is
  needed to calculate the remaining amount.
- Change the goal, then clear it. Reloading the page reflects the saved or cleared state.
- Sign in as a second user and verify that user's goal is separate; sign back in as the first user
  and verify their goal is unchanged.
- If saving fails, show the server's error sentence and retain the entered goal for retry.
- Goal controls are at least 44 × 44 px and the flow works at 375 × 667 without horizontal
  scrolling.
- Check the flow in a browser at 375 × 667 and on a real phone before merging.

Commit as `Feature: set a body-weight goal`.
