# Task 23 — Demo data for local testing
Assignee: Martin Zvelebil

## Why
A fresh local journal is empty. To see charts, history, body load or the weight goal, each
of us has to log weeks of workouts by hand first. One command should fill a local journal
with realistic training, so every feature can be tried in a minute.

## What
No BRD ID: a developer tool, not an app feature. Branch `feature/demo-data`.

- `backend/seed_demo.py`, Python standard library only (`urllib`, `http.cookiejar`, `json`,
  `datetime`). Run it while Flask is running: `uv run python seed_demo.py`. An optional
  argument gives another address: `uv run python seed_demo.py http://127.0.0.1:5055`.
  The default is `http://127.0.0.1:5000`, where Flask listens; on macOS `localhost:5000` can
  reach AirPlay instead.
- It goes **through the running API**, exactly as the React app does, so every rule in
  `models.py` checks the data. It never opens the database itself.
- It refuses any address whose host is not `localhost` or `127.0.0.1`: "Demo data is only
  for a local GymLog. Use http://127.0.0.1:5000." Production can never get demo data.
- It registers `demo` with the password `demo-password-123`. If `demo` already exists, it stops
  with: "The demo user already exists. Delete backend/instance/ for a fresh journal, or sign in
  as demo." Nothing is changed.
- Three templates with three set targets each:
  - **Push:** Bench press 4 × 5, Overhead press 3 × 8, Triceps pushdown 3 × 12,
    Push-up 2 × 15 at 0 kg.
  - **Pull:** Barbell row 4 × 8, Lat pulldown 3 × 10, Barbell curl 3 × 10,
    Cable wrist curl 2 × 15.
  - **Legs:** Squat 4 × 5, Romanian deadlift 3 × 8, Standing calf raise 3 × 12, Plank 3 × 60 s.
- 21 completed workouts, Push → Pull → Legs, every second day, from 41 days ago until
  yesterday. Weights go up 2.5 kg every round (bench 60 → 75 kg) so 1RM charts climb. The top
  set of each main lift has RPE 8. Plank holds grow by 5 s every round.
- So every case shows: the newest Push has one extra bench set, and one Legs workout skips its
  last calf raise set.
- Body weight on each of the last 30 days until yesterday, 84.0 kg going down 0.1 kg a day.
  A losing goal of 78 kg. No entry today, so the daily reminder (WGT-08) shows.
- Dates are the computer's local date, like the app's.
- At the end it prints what it made and how to sign in.

## Out of scope
Several demo users, deleting or resetting data, random data, production or PythonAnywhere,
any change to the app or the API.

## Done when
`uv run pytest tests/test_seed_demo.py` is green. The tests run the script against a temporary app
served on a free local port and check that:
- `demo` can sign in and has 3 templates, 21 sessions, 30 weights and a 78 kg losing goal.
- The newest session is yesterday and no weight is saved for today.
- The sessions train all ten muscle groups (checked against the catalogue groups in
  `/api/state`), so body load (spec 22) has something everywhere.
- A second run stops with the "already exists" sentence and changes nothing.
- `http://example.com` is refused with the local-only sentence.

Run by hand: start Flask on a fresh `backend/instance/`, run the script, sign in as `demo` at
375 × 667. Start, Review, an exercise's progress chart and Weight all show data.
The README's "Run it locally" says how to use it.

Commit as `Feature: demo data for local testing`.
