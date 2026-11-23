# TimeToLift

TimeToLift is a mobile-first training journal built for Introduction to Programming at Nova SBE
(2026/27). Use it to plan strength workouts, log sets between lifts, and track progress over
time. Your journal is private by default and available wherever you sign in.

[Open the hosted app](https://nickkkk3105.pythonanywhere.com/)

## Project objectives

- Make it quick to plan a repeatable routine and log training on a phone.
- Use past results to track strength, training consistency, and body-weight goals.
- Give lifters control over what they share with friends and whom they grant coaching access.

## What you can do

| Where | What you can do |
| --- | --- |
| **Home and account** | Create an account, sign in, and return to the same journal from another device. Home shows your last session, workout totals, and links to your next task. |
| **Create workout** | Build reusable templates one exercise at a time. Reorder exercises, pair them into supersets, and set targets for reps or timed holds, weight, and optional rate of perceived exertion (RPE). Add workout and exercise notes and warm-up or cool-down instructions. |
| **Start workout** | Start a saved template, edit it for future workouts, or delete it while keeping completed sessions. Log actual reps, weight, hold duration, or RPE when enabled. Add or skip sets, check off warm-up and cool-down reminders, and see what you did last time. Your active draft autosaves, and **Resume workout** brings it back after a reload or sign-in. |
| **Schedule** | Put a workout on a specific day or plan an ordered workout series for any day that week. Move, remove, or adjust a scheduled copy independently. Start or resume the workout from Schedule and open its linked results with **Review workout** once it is complete. |
| **Competition prep** | Choose powerlifting, HYROX, or marathon and enter the event date, your current preparation, recent training, and availability. With AI enabled, preview a tailored plan, edit or remove workouts, and save the event and plan to Schedule. |
| **Review workouts** | Browse completed sessions in a list or monthly calendar. Open a session to see sets, notes, and duration when available, or correct the saved date and results. Use **Exercise Progress** to see estimated one-rep max (1RM) and average weight over time. |
| **Body load and weekly volume** | See where your training was concentrated on a body map. Compare estimated weekly sets per muscle with your own goals and inspect each exercise's contribution. |
| **Exercises** | Search the catalogue, filter by muscle group or equipment, and mark favourites. Switch between list, card, and grid views, and open illustrated guides where available. Create private exercises in the workout builder and choose a primary muscle or exclude them from volume. |
| **Weight Tracker** | Log or correct one measurement per date, follow the trend and history, and set, change, or clear a weight-gain or weight-loss goal. Home can remind you when today's entry is missing. |
| **Profile** | Add a profile photo and bio. See your training level, workouts, streaks, time spent training, and personal records. |
| **Friends** | Send, accept, or decline requests and remove friends. Share a completed workout with all or selected friends, comment on shared workouts, and change who has access. Share a reached weight goal as a milestone and congratulate friends on theirs. |
| **Settings and Coachees** | Request a coaching relationship and end access when you choose. Once accepted, your coach can review your saved workouts, exercise progress, and notes. They can create plans for you and edit the plans they created. |
| **Training assistant** | Open the star button to get feedback on your routine or generate new templates. Review each suggestion before you save it. |

The training assistant and competition-plan generation require opt-in setup with a server-side
Requesty API key and a free model. Both ask for consent before sending information to the provider.
See the [AI assistant setup guide](docs/AI_ASSISTANT.md).

## Install locally

Install [Git](https://git-scm.com/), [uv](https://docs.astral.sh/uv/getting-started/installation/),
and [Node.js 24](https://nodejs.org/) with npm. Node.js 24 matches the project's CI environment.
uv can install Python 3.12 for this project.

1. Clone the repository and enter its folder. The feature overview and demo commands below
   follow GitHub's `main` branch. If you already have an up-to-date checkout of `main`, open
   a terminal in the repository folder and continue to step 2.

   ```sh
   git clone https://github.com/nick3105/GymLog.git
   cd GymLog
   ```

2. Install the backend dependencies and create the local session-signing key. Run
   `setup_secret.py` once per checkout. If it reports that the key already exists, continue to
   the next step.

   ```sh
   cd backend
   uv sync --locked
   uv run python setup_secret.py
   cd ..
   ```

3. Install the frontend dependencies from the lockfile.

   ```sh
   cd frontend
   npm ci
   cd ..
   ```

## Run the application

Open two terminals in the repository root and keep both running while you use the app.

**Terminal 1 — Flask API on port 5000**

```sh
cd backend
uv run flask --app gymlog run --debug
```

**Terminal 2 — React app on port 5173**

```sh
cd frontend
npm run dev
```

Choose **Create account** to open your journal. For a first workout, go to **Create workout**,
save a template, then choose it from **Start workout**. Use `Ctrl+C` in each terminal to stop the
servers. [Open the local app](http://localhost:5173/)

To try the app on a phone, start the frontend with `npm run dev -- --host` in terminal 2 and
open the Network URL Vite prints on a phone connected to the same Wi-Fi.

### Try a journal with demo data

With Flask running locally, open a third terminal in the repository root and run:

```sh
cd backend
uv run python seed_demo.py --username demo-2
```

Sign in as `demo-2` with password `demo-password-123` to explore Push, Pull, and Legs templates,
84 completed sessions, favourite and personal exercises, weekly volume goals, and 30 body-weight
measurements. Choose another unused username to seed another account or omit `--username` to
create `demo`. Add `--with-draft` to try **Resume workout** with a partially logged Push session.

On an older branch with the original seeder, run `uv run python seed_demo.py` and sign in as
`demo` with the same password. The original seeder creates 21 completed sessions.

The local database and session key live in the Git-ignored `backend/instance/` directory. Keep
these files private.

## How it fits together

The frontend uses React, TypeScript, and Tailwind CSS. It sends requests to Flask, which validates
entries and stores them in SQLite. During development, Vite forwards `/api` requests to Flask.
On PythonAnywhere, Flask serves both the API and the built React app from `frontend/dist/`.

| Path | What to find there |
| --- | --- |
| [`frontend/src/pages/`](frontend/src/pages/) | Screens for planning, logging, and reviewing training |
| [`frontend/src/api.ts`](frontend/src/api.ts) | Frontend requests to the API |
| [`backend/gymlog/app.py`](backend/gymlog/app.py) | API routes and sign-in |
| [`backend/gymlog/models.py`](backend/gymlog/models.py) | Input validation and calculations |
| [`backend/gymlog/storage.py`](backend/gymlog/storage.py) | SQLite queries |
| [`backend/tests/`](backend/tests/) | Backend tests |

The [exercise catalogue](backend/gymlog/exercises.json) stores exercise IDs, names, muscle groups,
and equipment. Keep IDs stable so past results stay linked when an exercise is renamed (PLN-12).

## Run the checks

These commands run the same checks as GitHub Actions. Start each block from the repository root.

```sh
cd backend
uv run ruff format --check .
uv run ruff check .
uv run pytest
```

```sh
cd frontend
npm run lint
npm run format:check
npm test
npm run build
```

## Project documents

- [Business requirements](docs/BRD.md), including workout logging (RUN), progress (REV), body
  weight (WGT), scheduling (SCH), and competition prep (PREP)
- [Contributing](CONTRIBUTING.md)
- [Deployment and backups](docs/DEPLOYMENT.md)
- [Optional local training assistant](docs/AI_ASSISTANT.md)

## Team

| Name | Student number |
| --- | --- |
| Gaia Bandini | 83690 |
| Nick Scharkopf | 83445 |
| Martin Zvelebil | 83519 |
| Anna Lisa Heigle | 83452 |
