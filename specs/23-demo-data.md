# Task 23 — Demo data for local testing
Assignee: Martin Zvelebil

## Why

A fresh local journal is empty. A seeded test account gives the team history, charts and
examples of workout features. A fresh username lets teammates test alongside existing accounts.

## What

This developer tool exercises PLN-09, PLN-10, RUN-09, REV-01 through REV-06, REV-09 and WGT-08
through the running API. Branch `feature/demo-seeder-refresh`.

- Run `uv run python seed_demo.py` from `backend/` while Flask is running. The default account is
  `demo`, with password `demo-password-123`. `--username demo-2` creates a different demo account
  with the same local-only password. An optional positional address still defaults to
  `http://127.0.0.1:5000`. The host must be `localhost` or `127.0.0.1`.
- An existing username is refused before writing journal data. The error tells the user to
  choose another name. Dates use the computer's local date.
- Seed 28 weeks, with a Push, Pull and Legs session in each seven-day block and rest days
  between sessions. The first workout is 194 days ago and the last one is yesterday
  (84 sessions altogether). Keep the extra bench set, skipped calf raise set and all ten
  catalogue muscle groups represented across the history.
- Bench and squat progress at roughly 2.5 kg per week early on and Romanian deadlift at
  roughly 3 kg per week. Accessories increase more slowly. Taper the rates every four weeks
  and round to practical loading increments, so some weeks repeat a weight. Bodyweight
  exercises increase in reps. Holds increase in seconds.
- Push has a bench target RPE of 8, workout and exercise notes, warm-up and cooldown
  reminders, and a triceps pushdown and push-up superset. Its newest session has warm-up
  checked and cooldown unchecked. Pull has RPE off on versions with the workout toggle.
- Add Band chest fly to Push and Single-leg balance to Legs. Where the API supports personal
  volume choices, the band fly counts toward chest and the balance hold is excluded. Favourite
  bench press, squat and plank. Set weekly chest and quadriceps goals of 12 and 10 sets.
- Keep 30 daily body-weight measurements through yesterday and a 78 kg loss goal. This leaves
  today's weight reminder available.
- With `--with-draft`, seed a Push workout for today with its first bench set filled in.
  The Start page offers to resume it.

## Out of scope

Changing app behaviour, modifying existing accounts, resetting the database, calling the
training assistant, adding coaching accounts, and seeding production or PythonAnywhere.

## Done when

- Tests check all 84 dates, all 14 exercises, the slower progression in the last month and
  user isolation. The draft stays out of completed history and belongs to its account.
- At 375 × 667, sign in, open Push in Start and Review, filter the exercises by favourites and
  open Weekly Volume and Weight. With `--with-draft`, tap Resume workout and see the first set.
- The README gives the command and sign-in details.
