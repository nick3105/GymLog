# Task 17 — Set a body-weight goal

Assignee: annalisa2912

## Why

The Weight Tracker shows measurements and their trend, but users cannot record a personal
weight-change goal or see how much remains. Users may want to lose or gain weight. A simple,
user-chosen goal makes that progress visible without estimating how quickly it will happen.

## What

- Let a signed-in user choose whether they want to lose or gain weight, then set, change, or clear
  one optional goal weight in kg from the Weight Tracker.
- Save the goal privately for that user through the existing API architecture. It must remain
  available after sign-out, reload, and sign-in on another device.
- When a goal and a latest weight exist, show the goal and remaining kilograms in the chosen
  direction: for losing, `max(latest weight − goal weight, 0)`; for gaining,
  `max(goal weight − latest weight, 0)`. Never show a negative remaining amount.
- Require a losing goal to be below the latest measurement, and a gaining goal to be above it.
- Show a prominent **Goal reached — great work!** status when a losing goal is met or passed
  downward, or a gaining goal is met or passed upward.
- Show the goal on the weight graph as a horizontal reference line with a compact label at the
  right edge. Keep the existing measurement labels readable.
- When a goal exists but there is no weight measurement yet, show the goal and explain that a
  measurement is needed to calculate what remains. When no goal exists, keep the existing Weight
  Tracker flow clear and offer a way to set one.
- Use the same valid kg range and decimal precision as body-weight measurements. Show a clear
  sentence on validation or save errors and keep the entered goal available for retry.
- Keep goal data isolated between users. Saving or changing one user's goal must not affect any
  other user's journal.
- Preserve the existing measurement-edit flow. Selecting **Edit** in the history loads the saved
  date and weight into the form and scrolls the form into view. The date stays fixed while editing,
  and **Update weight** changes the selected entry.

## Out of scope

- Maintenance goals, BMI, health advice, target-date predictions, or recommended goal weights.
- A progress percentage or starting-weight snapshot; this task reports the current remaining kg.
- Deleting measurements or changing a measurement's date while editing.

## Done when

- On a 375 × 667 screen, choose **Lose weight**, set a goal of 75 kg with a latest measurement of
  80.2 kg, and see **5.2 kg to lose**. The goal reference and its right-edge label are visible
  without horizontal scrolling.
- Save a new latest measurement of 79.8 kg. The remaining amount updates to **4.8 kg to lose**.
- With a latest measurement of 75 kg or less, show the prominent **Goal reached — great work!**
  status and no negative remaining amount.
- Choose **Gain weight**, set a goal of 82 kg with a latest measurement of 80.2 kg, and see
  **1.8 kg to gain**. Reject a goal at or below the latest weight for gaining and a goal at or
  above the latest weight for losing.
- With a latest measurement at or above a gaining goal, show **Goal reached — great work!** and no
  negative remaining amount.
- With no measurements, setting a goal succeeds and the page explains that a measurement is
  needed to calculate the remaining amount.
- Change the goal, then clear it. Reloading the page reflects the saved or cleared state.
- Sign in as a second user and verify that user's goal is separate; sign back in as the first user
  and verify their goal is unchanged.
- If saving fails, show the server's error sentence and retain the entered goal for retry.
- Goal controls are at least 44 × 44 px and the flow works at 375 × 667 without horizontal
  scrolling.
- From measurement history, tapping **Edit** scrolls the edit form into view and pre-fills the
  selected date and weight. Saving updates that date; it does not add a second entry.
- Check the flow in a browser at 375 × 667 and on a real phone before merging.

Commit as `Feature: set a body-weight goal`.
