# Task 28 — Switch exercise chart metrics
Assignee: nick3105

## Why
A user wants to inspect the average weight used as well as the estimated 1RM.

## What
Extend REV-03 to REV-06 with Estimated 1RM and Average weight controls.
Average weight means the arithmetic mean of external kg across performed repetition sets
in one saved session, with each set weighted equally. Zero-kg bodyweight sets count.
Skipped sets and timed holds are excluded. Include sets above 10 reps.
Round the session mean to 0.1 kg. Show one point per session, ordered as existing stats.
Keep the existing e1RM behavior and its actual-RPE adjustment unchanged.
Use an opt-in average-weight payload so existing API clients receive their existing shape.
This definition of "average" is a proposed implementation default, documented for review.

## Out of scope
Rep-weighted load, tonnage, duration charts, weekly volume and new chart libraries.

## Done when
At 375 x 667, open exercise progress and switch between both metrics using touch or keyboard.
Both controls are at least 44 px tall, the selected control is announced, and no horizontal
scroll appears. Labels, summary cards, chart and explanatory text match the selected metric.
60 kg and 80 kg sets show 70 kg regardless of reps. A skipped 200 kg set has no effect.
0 kg and 80 kg show 40 kg. An entirely skipped or timed session has no weight point.
Existing history and corrected sessions are recomputed. Another user's sets never contribute.
Default stats responses and existing e1RM tests continue to work.
