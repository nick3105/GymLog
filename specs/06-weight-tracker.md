# Task 6 — Weight Tracker

> Branch `feature/weight-tracker`. Needs task 1. Builds the line chart task 7 reuses.

## Why

Body weight is the one number most people check every morning. Logging it has to take five
seconds on a phone, and the trend has to be readable at a glance — one bad day should look like
noise, not a disaster.

## What

Implements WGT-01 to WGT-06 on `/next/weight`. The API is `POST /api/weights` and the `weights`
list in `/api/state`.

- [ ] A date field defaulting to today, and a weight field in kg with a decimal keyboard
      (WGT-01, WGT-02). Save shows the server's sentence on error.
- [ ] Saving a date that already has a weight replaces it (WGT-03, enforced by the API) — the
      screen says "Updated" instead of "Saved" so the user knows.
- [ ] Latest weight and its date, large, at the top (WGT-04).
- [ ] **`src/components/LineChart.tsx`**: a small reusable SVG line chart — points by date,
      oldest left, a label for the first and last date, the unit, and an empty state sentence.
      No chart library. Task 7 reuses it for 1RM, so take dates, values, a unit and an empty
      message as props, nothing weight-specific (WGT-05).
- [ ] A collapsible list of all measurements, newest first (WGT-06).
- [ ] Phone layout: the form at the top, chart full width, readable without zooming.

## Out of scope

- Deleting a measurement, units other than kg, goals, BMI.
- Several measurements on one day (WGT-03 says one per date).

## Done when

On a 375 × 667 screen:

- **First entry.** No data → "Add your first measurement to see your trend." Save 80.2 kg for
  2026-11-06 → latest shows 80.2 kg · 6 Nov 2026; the chart shows one point.
- **Same date replaces.** Save 80.5 for 2026-11-06 → "Updated"; the history still has one
  entry for that date, with 80.5.
- **Trend.** Add 81.0 for 2026-11-01 and 79.8 for 2026-11-08 → the chart goes 81.0, 80.5, 79.8
  left to right; latest is 79.8 · 8 Nov 2026.
- **Bad input.** 0 kg → the server's sentence; nothing saved.
- **Chart is reusable.** `LineChart` has no import from the weight page and no hard-coded "kg".
- The chart and the list fit 375 px without horizontal scrolling.

Commit as `Feature: weight tracker`.
