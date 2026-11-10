# Task 2 — Ship the React app to production

> Assignee:
>
> Branch `feature/deploy-react`. No BRD ID: this is what makes every React task reach users.

## Why

Flask serves the React app from `frontend/dist`, but that folder is built by `npm run build` and
is git-ignored. PythonAnywhere only runs `git pull` — so today `/next/` returns 404 in
production. Until the build reaches the host, nothing the team builds in React can be used at
the gym.

## What

- [ ] A GitHub Actions workflow `.github/workflows/deploy.yml`: on every push to `main`, run
      `npm ci && npm run build` in `frontend/` and push the result to a branch called `deploy`
      that contains the whole repository **plus** `frontend/dist`.
- [ ] `docs/DEPLOYMENT.md`: PythonAnywhere follows `deploy` instead of `main`
      (`git switch deploy`, then `git pull` on every update). Write the one-time switch and the
      updated "Updating after a merge" steps.
- [ ] A health check: `GET /api/health` also returns which commit is running (read from an
      environment variable or a file the workflow writes), so anyone can see what is live.
- [ ] Nobody ever commits to `deploy` by hand — say so in the workflow and in `CONTRIBUTING.md`.

## Out of scope

- Reloading PythonAnywhere automatically (the free plan has no deploy hook; a person clicks
  Reload).
- Preview environments for pull requests.
- Moving React from `/next/` to `/` — task 8.

## Done when

- After merging, the workflow run on `main` is green and the `deploy` branch contains
  `frontend/dist/index.html`.
- On PythonAnywhere: `git pull` on `deploy`, Reload, then
  `https://nickkkk3105.pythonanywhere.com/next/` shows the React app on a phone, and
  `/api/health` shows the same commit as the latest `main`.
- The current UI at `/` still works: sign in, see your workouts.
- A push to a feature branch does **not** change `deploy`.

Commit as `Feature: build the React app for production`.
