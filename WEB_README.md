# GymLog in your browser

Website: https://nick3105.github.io/GymLog/

Open the link on a phone or computer. No Python, installation or account needed.

## What this version does

Dashboard, Monday–today weekly totals, daily training chart, fixed four-workout goal, full history and a validated workout form. Three sample sessions are explicitly labelled. New workouts are dated today using your device's local date.

Entries stay only in the current page session. Refreshing resets to the sample workouts. Entries are not uploaded, shared between teammates or saved to a database.

## Beginner-friendly files

- `index.html`: page structure and accessible workout dialog.
- `web.css`: dark charcoal/lime design and mobile layouts; no external fonts or assets.
- `web-model.mjs`: data, local dates, validation and weekly calculations.
- `web.js`: click handlers and screen updates. User input is displayed with `textContent`.
- `web.test.mjs`: date and validation tests; run `node --test web.test.mjs`.

This is a small HTML/CSS/JavaScript adaptation. Python/CustomTkinter remains available as the original desktop version in the repository; it is not executed by the website.

## Hosting and local preview

GitHub Pages serves the root folder of `main`. Update the four web files through a reviewed pull request; GitHub republishes after merge. The repository and website are public. Viewing the app does not grant write access to the repository.

For developers only, preview with `python -m http.server 8765`, then open `http://localhost:8765`. The hosted website requires no local tools.

## Four-person division

A: page/CSS; B: form and callbacks; C: data functions and tests; D: history and docs. Coordinate edits to `web.js` and use the existing CONTRIBUTING guide. Check mobile width, keyboard navigation, invalid input, save→totals/history updates, goal cap and refresh reset before merging.
