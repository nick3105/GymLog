# GymLog

Plan strength workouts, log every set, follow your estimated 1RM and body weight — from a phone
or a computer. Requirements: [docs/BRD.md](docs/BRD.md).

**Live journal:** https://nickkkk3105.pythonanywhere.com/ (the old GitHub Pages address redirects
there via the root `index.html`). Hosting, backup and renewal: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Status: replacing the UI

One Flask app in `backend/` serves everything:

| URL | What | State |
|---|---|---|
| `/` | the current UI (hand-written JS in `backend/gymlog/static/`) | **what users see** |
| `/next/` | the new React UI from `frontend/` | being built, screen by screen |
| `/api/...` | the JSON API both UIs use | shared |

When `/next/` covers the BRD it moves to `/` and `gymlog/static/` is deleted.

## Run it locally

You need [uv](https://docs.astral.sh/uv/) and [Node.js](https://nodejs.org/) 22 or newer.

```sh
# once: choose a local password for Nick's profile (stored hashed in backend/instance/)
cd backend
uv run python setup_owner.py

# terminal 1 — API and current UI on http://127.0.0.1:5000
cd backend
uv run flask --app gymlog run --debug

# terminal 2 — new UI on http://localhost:5173/next/
cd frontend
npm install
npm run dev
```

The new UI should say **API: connected**. Your local `backend/instance/` is a separate,
throwaway journal — never copy the production one to your computer.

## Checks

The same commands run in GitHub Actions on every pull request.

```sh
cd backend && uv run ruff format --check . && uv run ruff check . && uv run pytest && node --test tests/model.test.mjs
cd frontend && npm run lint && npm run format:check && npm run build
```

`npm run format` and `uv run ruff format .` fix formatting for you.

## How it fits together

```
browser ──► React (/next/) or current UI (/) ──fetch /api/...──► Flask ──► SQLite (backend/instance/)
```

- In development Vite serves the React app and forwards `/api` requests to Flask.
- In production Flask serves both UIs and the API from one PythonAnywhere web app.

```
backend/
  gymlog/app.py          create_app(): routes, sign-in, CSRF and security headers
  gymlog/models.py       input validation and the estimated 1RM rule
  gymlog/storage.py      SQLite queries
  gymlog/exercises.json  the exercise catalogue
  gymlog/static/         the current UI
  tests/                 pytest (API, serving) and node --test (current UI's helpers)
  setup_owner.py         sets Nick's password and the session key
  wsgi.py                PythonAnywhere entry point
frontend/src/            the new React UI; colours in index.css
docs/                    BRD and deployment
```

## Exercise catalogue

Add exercises to `backend/gymlog/exercises.json`, then reload the app:

```json
{"id": "incline-bench-press", "name": "Incline bench press", "group": "Chest"}
```

IDs must be unique and never change: they link past results (PLN-12). Saved workouts keep a
snapshot of the name, so renaming an exercise does not rewrite history.
