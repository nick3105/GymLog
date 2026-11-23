# TimeToLift

Plan strength workouts, log every set, follow your estimated 1RM and body weight, and set a
personal weight-loss or weight-gain goal — from a phone
or a computer. Requirements: [docs/BRD.md](docs/BRD.md).

## Team

- Gaia Bandini — 83690
- Nick Scharkopf — 83445
- Martin Zvelebil — 83519
- Anna Lisa Heigle — 83452

**Live journal:** https://nickkkk3105.pythonanywhere.com/ (the old GitHub Pages address redirects
there via the root `index.html`). Hosting, backup and renewal: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## What it is

A React app (`frontend/`) on top of a Flask JSON API (`backend/`). In production one Flask app
serves both: the API under `/api/...` and the built React app at every other address.

Active workouts autosave to the signed-in account. After reopening TimeToLift or signing back in, use
**Resume workout** to continue; finishing saves the session to history, while confirmed discard
removes only the unfinished draft.

## Run it locally

You need [uv](https://docs.astral.sh/uv/) and [Node.js](https://nodejs.org/) 22 or newer.

```sh
# once: create the session key in backend/instance/
cd backend
uv run python setup_secret.py

# terminal 1 — the API on http://127.0.0.1:5000
cd backend
uv run flask --app gymlog run --debug

# terminal 2 — the app on http://localhost:5173/
cd frontend
npm install
npm run dev
```

Open http://localhost:5173/ and create an account.

With local Flask running, open another terminal in `backend/` and seed a new demo account:

```sh
uv run python seed_demo.py --username demo-2
```

Sign in at http://localhost:5173/ as `demo-2` with the password `demo-password-123`.
Choose another unused name for another account, or omit `--username` to create `demo`.
The script stops if the username is already taken.

- **Start and Review** have Push, Pull and Legs and 84 sessions from 28 weeks of training.
  Major lifts progress fastest early on. Accessories add less, and bodyweight and timed
  exercises progress in reps or seconds.
- **Exercises** has three favourites and two personal exercises.
- **Weekly Volume** has chest and quadriceps goals. Open the previous week if the current
  week is empty.
- **Weight** has 30 measurements and a 78 kg goal. Today's entry is ready to fill in.

Add `--with-draft` to try **Resume workout** with a partially logged Push session.
If Flask uses a different port, pass its local address before the options, for example
`uv run python seed_demo.py http://127.0.0.1:5055 --username demo-2`.

On a phone on the same Wi-Fi: run `npm run dev -- --host` and open the Network address it prints.

## Checks

The optional local training assistant is available from the star bubble. Setup, sharing,
free-model limits and verification: [AI assistant](docs/AI_ASSISTANT.md).

The same commands run in GitHub Actions on every pull request.

```sh
cd backend && uv run ruff format --check . && uv run ruff check . && uv run pytest
cd frontend && npm run lint && npm run format:check && npm test && npm run build
```

`npm run format` and `uv run ruff format .` fix formatting for you.

## How it fits together

```
browser ──► React app ──fetch /api/...──► Flask ──► SQLite (backend/instance/)
```

- In development Vite serves the React app and forwards `/api` requests to Flask.
- In production Flask serves the built app (`frontend/dist/`) and the API from one PythonAnywhere
  web app. Every merge to `main` builds the app into the `deploy` branch, which PythonAnywhere
  runs (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

```
backend/
  gymlog/app.py          create_app(): routes, sign-in, CSRF and security headers
  gymlog/models.py       input validation and the estimated 1RM rule
  gymlog/storage.py      SQLite queries
  gymlog/exercises.json  the exercise catalogue
  tests/                 pytest, one file per feature
  setup_secret.py        creates the session-signing key
  wsgi.py                PythonAnywhere entry point
  deploy_webhook.py      updates PythonAnywhere when the deploy branch changes
frontend/src/
  pages/                 one screen per file (Home, Start, Session, Create, Review, Weight)
  components/            shared pieces: Layout (navigation), LineChart, ProgressSheet, …
  api.ts                 the one function that talks to /api
  JournalProvider.tsx    who is signed in, their journal, the workout in progress
  oneRepMax.ts           the 1RM rule for the live estimate (tested against the Python one)
  index.css              colours
docs/                    BRD and deployment
```

## Exercise catalogue

Add exercises to `backend/gymlog/exercises.json`, then reload the app:

```json
{"id": "incline-bench-press", "name": "Incline bench press", "group": "Chest"}
```

IDs must be unique and never change: they link past results (PLN-12). Saved workouts keep a
snapshot of the name, so renaming an exercise does not rewrite history.
