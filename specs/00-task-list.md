# GymLog — the task list

Eight tasks that take the BRD from the current hand-written UI to a mobile-first React app. Each
one is a slice you can show someone: it ends with a working screen or a working API, its own
branch, and tests that go from red to green.

Every task follows the course planning sheet: **Why / What / Out of scope / Done when**, with
concrete values in the checks. Read `AGENTS.md` first — especially **Mobile first**.

| # | Task | Spec | Branch | BRD | Needs |
| --- | --- | --- | --- | --- | --- |
| 1 | App shell and accounts | `01-app-shell-and-accounts.md` | `feature/app-shell` | ACC-01, 03–05, NAV-01–03 | — |
| 2 | Ship the React app to production | `02-build-and-deploy.md` | `feature/deploy-react` | — | — |
| 3 | Exercise stats API | `03-exercise-stats-api.md` | `feature/exercise-stats-api` | RUN-04, REV-04–06 | — |
| 4 | Create a workout | `04-workout-builder.md` | `feature/workout-builder` | PLN-01–11 | 1 |
| 5 | Log a workout | `05-log-a-workout.md` | `feature/log-workout` | RUN-01–10 | 1, 3 |
| 6 | Weight Tracker | `06-weight-tracker.md` | `feature/weight-tracker` | WGT-01–06 | 1 |
| 7 | History and exercise progress | `07-history-and-progress.md` | `feature/history-progress` | REV-01–07 | 3, 6 |
| 8 | Switch users to the new app | `08-switch-to-react.md` | `feature/switch-to-react` | all | 1–7 |
| 11 | A real exercise catalogue | `11-exercise-catalogue.md` | `feature/exercise-catalogue` | PLN-02, PLN-12 | — |

## Who can start when

Tasks 1, 2 and 3 have no dependencies — **three people start on day one**. Task 3 is backend-only
(Python, pytest), a good fit for whoever prefers it.

As soon as task 1 is merged, 4, 5 and 6 can run in parallel. Task 5 does not wait for task 4:
templates made in the current UI at `/` work in the new one, because both use the same API.
Task 7 needs the stats API (3) and the line chart built in the Weight Tracker (6). Task 8 is last
and small — do it together.

A possible split for four people:

| Person | Order |
| --- | --- |
| A | 1 → 4 |
| B | 2 → 6 |
| C | 3 → 7 |
| D | reviews 1 and 3, then 5 |

## Already done

- Tasks 1–8 — built together on `feature/react-app`: the React app is GymLog, the old UI is gone.
  Still open from task 8: the walkthrough on a real phone against production.
- ACC-01 to ACC-05 (register, keep old accounts, protect, sign in, sign out) — task 10,
  `10-register-and-login.md`, built in the API and the current UI at `/`.
- PLN-12 (exercise catalogue) — `backend/gymlog/exercises.json`, a repository task.
- Every rule in the BRD is already enforced by the API (`models.py`). Tasks 1, 4, 5, 6 and 7
  build screens on top of it; they should not need new validation rules.

## How to work a task

1. `git switch main && git pull`, then `git switch -c <branch from the table>`. Never commit to
   main.
2. Put your name on the spec's `Assignee:` line (only if it is empty) and commit it first:
   `Assign task <n> to <name>`.
3. Read the spec. Write or run its tests and watch them fail.
4. Build until they pass. Change no test to make it pass.
5. Check the screen at 375 × 667 and on a real phone (see `AGENTS.md`).
6. Run all the checks from `AGENTS.md`, paste the output into the pull request with a phone
   screenshot, and ask a teammate to review.
7. Commit with the message the spec suggests.
