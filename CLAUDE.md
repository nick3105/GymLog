# GymLog — notes for Claude

A private training journal for a four-person Introduction to Programming team (Nova SBE).
Requirements live in `docs/BRD.md`; cite their IDs (`PLN-03`, `RUN-09`) instead of inventing rules.
Teammates are beginners: keep code plain and explain changes in two sentences.

## Migration in progress

`backend/` is production. It serves the current hand-written UI (`backend/gymlog/static/`) at `/`
and the new React UI (`frontend/`) at `/next/`. New screens are built in React against the
existing `/api` routes; touch `gymlog/static/` only to fix production bugs. When React covers
the BRD it moves to `/` and `gymlog/static/` is deleted.

## Running things

- Backend: `cd backend && uv run flask --app gymlog run --debug` (port 5000). Never use `pip`.
  First run needs `uv run python setup_owner.py` to create `backend/instance/settings.json`.
- Frontend: `cd frontend && npm run dev`, open `http://localhost:5173/next/`. Vite proxies `/api`.
- Checks (CI runs exactly these):
  - `cd backend && uv run ruff format --check . && uv run ruff check . && uv run pytest && node --test tests/model.test.mjs`
  - `cd frontend && npm run lint && npm run format:check && npm run build`

## Layout

```
backend/gymlog/      app.py (routes, auth), models.py (validation, 1RM), storage.py (SQLite)
backend/instance/    private databases and settings.json — git-ignored, never read or print
backend/tests/       pytest; pass SECRET_KEY, OWNER_PASSWORD_HASH and a temp DATABASE to create_app
backend/wsgi.py      PythonAnywhere entry point
frontend/src/        React + TypeScript; Tailwind classes only, palette in index.css @theme
docs/BRD.md          business requirements
docs/DEPLOYMENT.md   PythonAnywhere, backup, recovery
```

- Flask serves `frontend/dist` under `/next/` and falls back to `index.html` for client routes.
  Keep every API route under `/api`. Writes need the `X-CSRF-Token` from `GET /api/session`.
- Business rules (1RM, validation) live in plain Python, not in route functions and not in
  React — the frontend shows what the API decides.

## Conventions

- Styling: Tailwind utility classes. No new CSS files; add colours to `@theme` in `index.css`.
- Icons: `lucide-react`. Do not add another UI or state library without asking.
- Weights are kg. Exercise IDs are stable; renaming a name must not rewrite history (PLN-12).
- One task per branch, PR into `main`, never commit to `main`. Confirm before pushing,
  opening PRs or merging.
