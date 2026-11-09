# GymLog

Plan strength workouts, log every set, follow your estimated 1RM and body weight — from a phone
or a computer. Requirements: [docs/BRD.md](docs/BRD.md).

**Live journal:** https://nickkkk3105.pythonanywhere.com/ (the old GitHub Pages address redirects
there via the root `index.html`).

## Status: moving to a new stack

| Folder | What | State |
|---|---|---|
| `cloud/` | Flask + hand-written JS + SQLite | **production** — see [cloud/README.md](cloud/README.md) for hosting, backup and renewal |
| `backend/` | Flask JSON API (Python, uv) | new, being built |
| `frontend/` | React + TypeScript + Tailwind (Vite) | new, being built |

Once the new app covers the BRD, a cutover PR migrates the production data, switches
PythonAnywhere to `backend/wsgi.py` and deletes `cloud/`.

## Run it locally

You need [uv](https://docs.astral.sh/uv/) and [Node.js](https://nodejs.org/) 22 or newer.

```sh
# terminal 1 — API on http://127.0.0.1:5000
cd backend
uv run flask --app gymlog run --debug

# terminal 2 — website on the URL Vite prints (http://localhost:5173)
cd frontend
npm install
npm run dev
```

Open the Vite URL. The page should say **API: connected**.

## Checks

The same commands run in GitHub Actions on every pull request.

```sh
cd backend && uv run ruff format --check . && uv run ruff check . && uv run pytest
cd frontend && npm run lint && npm run format:check && npm run build
```

`npm run format` and `uv run ruff format .` fix formatting for you.

## How it fits together

```
browser ──► frontend (React)  ──fetch /api/...──►  backend (Flask)  ──►  database
```

- In development Vite serves the React app and forwards `/api` requests to Flask.
- In production `npm run build` produces `frontend/dist`; Flask serves those files and the API
  from one PythonAnywhere web app.

```
backend/
  gymlog/__init__.py   create_app(): API routes and serving the built frontend
  tests/               pytest
  wsgi.py              PythonAnywhere entry point
frontend/
  src/App.tsx          the React app
  src/index.css        Tailwind and the GymLog colour palette
docs/BRD.md            business requirements
CLAUDE.md              conventions for the AI assistant (useful for humans too)
CONTRIBUTING.md        branch, review and merge workflow
```
