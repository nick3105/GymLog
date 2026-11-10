# GymLog — notes for AI assistants (Claude Code, Codex, …)

A training journal built by a four-person team for Introduction to Programming, Nova SBE
2026/27. The requirements live in `docs/BRD.md`. Most of the team are **beginners**: they must be
able to read, explain and change every line. **Teach, don't just do.**

The working process deliberately copies Festival Architect (`../NOVA-festival-architect`):
specs before code, one task per branch, tests that go red before they go green. When something
here is unclear, look at how that project did it.

## Mobile first

GymLog is used **in the gym, on a phone, between sets** — one hand, sweaty fingers, a few
seconds of attention. Design every screen for that first; the desktop is the bonus.

- **Build for a 375 px wide screen first.** Tailwind classes without a prefix are the phone
  layout; add `sm:`, `md:`, `lg:` only to widen it. Never design at desktop width and squeeze.
- **No horizontal scrolling, ever.** Tables become stacked cards on phones.
- **Big targets:** anything tappable is at least 44 × 44 px with space around it. No tiny icon
  buttons, no hover-only actions — phones have no hover.
- **Thumb reach:** the main action of a screen (Start, Save set, Finish & save) sits at the
  bottom, sticky if the screen scrolls. Navigation on phones is a bottom bar, not a sidebar.
- **Fast input:** number fields use `inputmode="decimal"` (weight) or `inputmode="numeric"`
  (reps), prefilled with the target or last value so a set is one or two taps. Input text is at
  least 16 px, or iOS zooms in.
- **One job per screen.** If a phone screen needs explaining, it is doing too much.
- **Unsaved work survives:** a locked phone, an incoming call or switching apps must not lose an
  active workout (BRD: Draft behaviour, RUN-09).
- Respect the notch and home bar: `env(safe-area-inset-*)` on fixed top and bottom bars.

**Every visible change is checked at 375 × 667 (iPhone SE)** in the browser's device toolbar,
and on a real phone before merging. A screenshot from the phone goes into the pull request.

## Running things

- Backend: `cd backend && uv run flask --app gymlog run --debug`, then
  open http://127.0.0.1:5000/. The first time, run `uv run python setup_secret.py` before that.
  uv installs Python and the libraries by itself — never use `pip` or `python -m venv`.
- Frontend: `cd frontend && npm install && npm run dev`, then open
  http://localhost:5173/next/. Vite forwards `/api` to Flask, so the backend must be running too.
- On a real phone: run Vite with `npm run dev -- --host` and open the Network URL it prints,
  plus `/next/`, from a phone on the same Wi-Fi.
- Start with a fresh local journal: stop Flask, delete `backend/instance/`, run
  `setup_secret.py` again.
- Checks — CI runs exactly these on every pull request, so run them before pushing:
  - `cd backend && uv run ruff format --check . && uv run ruff check . && uv run pytest && node --test tests/model.test.mjs`
  - `cd frontend && npm run lint && npm run format:check && npm run build`
  - `uv run ruff format .` and `npm run format` fix formatting for you.

## Project layout

```
backend/
  gymlog/app.py          routes, sign-in, CSRF, security headers — no business rules
  gymlog/models.py       validation and calculations (1RM) — no Flask, no SQL
  gymlog/storage.py      every SQL query — no Flask, no rules
  gymlog/exercises.json  the exercise catalogue
  gymlog/static/         legacy hand-written UI — bug fixes only, new screens go in frontend/
  instance/              private databases and settings.json — git-ignored
  tests/                 pytest, one file per feature or bug
  setup_secret.py        creates the session-signing key
  wsgi.py                PythonAnywhere entry point
frontend/
  src/                   React + TypeScript screens; colours in src/index.css
docs/BRD.md              business requirements (ACC, NAV, PLN, RUN, REV, WGT)
docs/DEPLOYMENT.md       PythonAnywhere, backup, recovery
specs/                   what to build, one file per feature
issues/                  what is broken, one file per bug
```

The dependency direction is one-way: **React → `/api` → `app.py` → `models.py` / `storage.py`**.

- **Rules live in `models.py`**, in plain Python. The API decides; React shows what it decided.
  A rule written in TypeScript as well is a rule that will drift — if React needs to know
  something (e.g. a live 1RM while typing), say so in the spec and agree where it lives.
- `app.py` reads the request, calls `models` and `storage`, returns JSON. Every route is under
  `/api`. Every route that touches a journal uses `@authenticated` and `g.user_id`.
- `storage.py` never decides anything: it reads and writes, always filtered by `user_id`.

## Data conventions

- **Every query that reads or writes a journal filters by `user_id`.** A missing filter shows
  one person's training to another — the worst bug this app can have. Each new query gets a test
  that a second user cannot see or change it.
- Weights are kilograms; reps are whole numbers; RPE is 1–10 in steps of 0.5 (BRD PLN-09).
- Dates are ISO text, `"2026-11-09"`. A session's `day` is the user's local date; timestamps
  (`createdAt`, `completedAt`) are UTC. Compare dates as `date` objects, never as text you did
  not write yourself.
- Exercise IDs in `exercises.json` never change — they link past results (PLN-12). Saved
  templates and sessions keep a snapshot of the names, so a rename never rewrites history.
- Never store a computed number you can recompute (1RM, totals). Compute it from the sets.
- Schema changes go through `storage.initialize` with a new `SCHEMA_VERSION` and a test that
  upgrades the previous version with data in it. Production data must survive every deploy.
- `backend/instance/` holds real people's training data and password hashes. **Never read,
  print, copy or commit it** — not even to debug.

## Code style

The grader and the team read this code. Plain beats clever.

- **Match the file you are in.** Do not reformat or restyle code you were not asked to change.
- New Python: `for` loops and `if` statements over clever one-liners; full-word names
  (`best_estimate`, not `be`); functions are verbs (`save_weight`), predicates are questions
  (`is_signed_in`). A one-line docstring on every new function.
- New TypeScript: function components and hooks only; one component per file in
  `src/components/`, one screen per file in `src/pages/`. Props are typed; no `any`.
- Styling is Tailwind classes only — no new CSS files, no inline `style`. Colours are added to
  `@theme` in `src/index.css`, never hard-coded in a component.
- Icons come from `lucide-react`. Do not add any other library — UI kit, state manager, chart,
  date or form library — without asking first.
- Every refusal explains itself in plain English: "Weight must be between 0 and 1000." —
  never `False`, a status code or "Invalid input".
- Comments explain *why*, only where the reason is not obvious.

## How it looks

Dark charcoal, light text, one lime accent doing all the work an accent does.

| Colour | Tailwind | Hex | Used for |
| --- | --- | --- | --- |
| Ink | `bg-ink` | `#10120f` | the page |
| Panel | `bg-panel` | `#191c17` | cards, bars, inputs |
| Border | `border-border` | `#2b3027` | dividers |
| Text | `text-text` | `#f1f3ec` | all text |
| Muted | `text-muted` | `#979f90` | labels, secondary text |
| Lime | `text-lime` / `bg-lime` | `#c5f467` | the primary action, progress, the selected thing |

- Lime means "do this" or "you did this". One lime button per screen.
- Errors are a sentence next to the field that caused them, not a colour alone and not a pop-up.
- Gym lighting is harsh and phones are held at arm's length: keep contrast high and text at
  least 16 px for anything you need to read mid-workout.

## Tests

- Backend: `backend/tests/test_<feature>.py` per feature, one test per bug in `issues/`. Build the
  app with `create_app({"SECRET_KEY": ..., "DATABASE": <tmp_path file>})` and drive it through
  `test_client()` and `/api/register` — never against `backend/instance/`.
- Frontend logic (formatting, validation helpers) gets unit tests with vitest.
- A test states the correct behaviour and may be red until the code catches up. **Never edit,
  delete or skip a test to make it pass.** If a test looks wrong, say so and stop.
- Each BRD section ends with its acceptance checks as tests (BRD "Release acceptance").

## Workflow

- **Specs before code.** Each feature gets `specs/<n>-<name>.md` in the course planning format:
  **Why / What / Out of scope / Done when**, with concrete values and the BRD IDs it covers.
  Its "Done when" includes how it looks and works at 375 px.
- **Every spec has an assignee.** The line `Assignee:` sits right under the title; empty means
  nobody has taken it yet. One person per spec — they own it until it is merged.
- **Starting a spec means claiming it:**
  1. Read its `Assignee:` line. If it names someone else, stop and tell the user — don't build
     someone else's task without their say.
  2. If it is empty, ask the user for their name (suggest `git config user.name`), write it
     there, and make that the first commit on the branch: `Assign task <n> to <name>`.
  3. Offer to push the branch and open a draft pull request straight away, so the team sees the
     task is taken.
- Each bug gets `issues/<nnn>-<name>.md`: what happens, what should happen, how to reproduce.
- **One task per branch** (`feature/<name>`, `fix/<nnn>-<name>`), a pull request into `main`,
  one reviewer from the team. **Never commit to `main`.** Fill in the PR template.
- Commit messages: `Feature: <what you built>` or `Fix issue 001: <what is true now>`.
  Subject line first; a short body only when the why is not obvious.
- **Change code only when asked** to build one spec or fix one issue. Fix that one thing. Other
  bugs or ideas you notice: mention them, do not fix them.
- **When unsure, ask — don't guess.** If the spec, the BRD or the code leaves a choice open
  while building (a missing value, two readings of a rule, a design decision, a needed library),
  stop and ask the user, with the options and your recommendation. Write the answer into the
  spec so the next person doesn't have to ask again.
- After every change run the checks above and paste the final output. The output is the proof,
  not a sentence.
- **Confirm before** creating repos, pushing, opening or merging pull requests, or anything
  touching PythonAnywhere — those are shared, visible actions.

## How to answer

- Every claim about the code comes with **file and line**. Show the lines; don't paraphrase a
  function that can just be read.
- When asked "where does X happen", walk the chain: the button in `frontend/src/…` → the
  `/api/…` route in `app.py` → the rule in `models.py` → the query in `storage.py`.
- Tie behaviour to the BRD: cite `RUN-09`, `WGT-03`. If the BRD does not decide something, say
  so and ask instead of guessing.
- After a change, explain it in two or three sentences a beginner can repeat to the grader.
- Prefer showing how to verify something (run it, tap it on a phone, read the test) over
  asserting it.
