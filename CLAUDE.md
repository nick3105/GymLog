# GymLog — notes for Claude

A private training journal for a four-person Introduction to Programming team (Nova SBE).
Requirements live in `docs/BRD.md`; cite their IDs (`PLN-03`, `RUN-09`) instead of inventing rules.
Teammates are beginners: keep code plain and explain changes in two sentences.

## Migration in progress

The repo is moving from `cloud/` (Flask + hand-written JS, live on PythonAnywhere) to
`backend/` + `frontend/`. **Do not change `cloud/`** — it is production until the cutover MR.
Port behaviour from it, keeping its tests' intent.

## Running things

- Backend: `cd backend && uv run flask --app gymlog run --debug` (port 5000). Never use `pip`.
- Frontend: `cd frontend && npm run dev`. Vite proxies `/api` to Flask, so open the Vite URL.
- Checks (CI runs exactly these):
  - `cd backend && uv run ruff format --check . && uv run ruff check . && uv run pytest`
  - `cd frontend && npm run lint && npm run format:check && npm run build`

## Layout

```
backend/gymlog/      Flask app factory (create_app), API routes under /api
backend/tests/       pytest; build apps with create_app({...}) and use test_client()
backend/wsgi.py      PythonAnywhere entry point
frontend/src/        React + TypeScript; Tailwind classes only, palette in index.css @theme
docs/BRD.md          business requirements
```

- Production: Flask serves `frontend/dist` and falls back to `index.html` for client routes.
  Keep every API route under `/api` so it never collides with a frontend route.
- Business rules (1RM, validation) live in plain Python, not in route functions and not in
  React — the frontend shows what the API decides.

## Conventions

- Styling: Tailwind utility classes. No new CSS files; add colours to `@theme` in `index.css`.
- Icons: `lucide-react`. Do not add another UI or state library without asking.
- Weights are kg. Exercise IDs are stable; renaming a name must not rewrite history (PLN-12).
- One task per branch, PR into `main`, never commit to `main`. Confirm before pushing,
  opening PRs or merging.
