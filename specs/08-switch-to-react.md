# Task 8 — Switch users to the new app

> Branch `feature/switch-to-react`. Needs tasks 1–7 merged and deployed. Do it together.

## Why

Two UIs for one app is twice the bugs and confusing for users. Once the React app does
everything in the BRD, it becomes the app, and the old hand-written UI is removed so nobody fixes
the same thing twice again.

## What

- [ ] React serves at `/` instead of `/next/`: Vite `base: '/'`, Flask serves `frontend/dist`
      at `/` with the client-route fallback; `/next/...` redirects to the same path at `/` so old
      bookmarks keep working.
- [ ] Delete `backend/gymlog/static/` and `backend/tests/model.test.mjs`, and remove the
      `node --test` step from CI and `CLAUDE.md`.
- [ ] The security headers still apply to every page (`Content-Security-Policy`,
      `X-Frame-Options`), and the React app works under them.
- [ ] README, `CLAUDE.md` and `docs/DEPLOYMENT.md` describe one app.
- [ ] Walk through the BRD "Release acceptance" list on a real phone against production.

## Out of scope

- New features. If the walkthrough finds a missing behaviour, write an issue in `issues/`.

## Done when

- All backend tests pass; frontend lint, format and build pass.
- `https://nickkkk3105.pythonanywhere.com/` opens the React app; `/next/review` redirects to
  `/review`; `/assets/training.js` is a 404.
- On a phone against production, the BRD release acceptance holds: account isolation (two
  accounts, neither sees the other's data), the bench top and back-off set plan, a workout logged
  without RPE, opening progress mid-session without losing inputs, and a same-date weight update.
- `grep -r "gymlog/static" .` finds nothing outside git history.

Commit as `Feature: the React app is GymLog`.
