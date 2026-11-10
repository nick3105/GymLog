# Task 1 — App shell and accounts

> Assignee:
>
> Branch `feature/app-shell`. Unblocks tasks 4, 5 and 6.

## Why

Every other screen lives inside this one. Before anyone can build "Create a workout", the React
app needs a way to sign in, a home screen and a navigation that works with one thumb. Getting the
shell right once means every later screen only fills in its own page.

## What

Implements ACC-01, ACC-03, ACC-04, ACC-05, NAV-01, NAV-02, NAV-03 in the React app at `/next/`.
The API already exists: `GET /api/session`, `POST /api/register`, `/api/login`, `/api/logout`,
`GET /api/state`.

- [ ] Add `react-router` for pages (agreed library — no other additions). Routes: `/next/` home,
      `/next/start`, `/next/create`, `/next/review`, `/next/weight`, `/next/signin`,
      `/next/register`. The four feature pages show a "Coming soon" placeholder.
- [ ] `src/api.ts`: one small `api(path, body?)` function. It fetches the CSRF token from
      `GET /api/session`, sends it as `X-CSRF-Token` on every POST, and turns an error response
      into an `Error` with the server's sentence.
- [ ] **Sign in** and **Create account** pages: username and password fields, the server's error
      shown under the form. Signing up signs you in (ACC-01).
- [ ] Not signed in → any page redirects to Sign in. Signed in → Sign in redirects home.
- [ ] **Home** (NAV-01): four big buttons — Start workout, Create workout, Review workouts,
      Weight Tracker — and the signed-in username.
- [ ] **Navigation** (NAV-02): a bottom bar on phones (Home + the four pages, icon and label),
      a left sidebar from `md:` up. The current page is highlighted in lime.
- [ ] **Sign out** (ACC-05) and **Refresh** (NAV-03) in a top bar. Refresh reloads `/api/state`.
- [ ] Keep `/api/state` in one place (a React context) so later pages read it, not refetch it.

## Out of scope

- The four feature pages themselves (tasks 4–7).
- Password reset, changing a username, deleting an account.
- Warning before signing out with unsaved work — task 5 adds that, once there is unsaved work.

## Done when

- `npm run lint`, `npm run format:check` and `npm run build` pass; backend tests still pass.
- **Create an account.** On a 375 px screen, create `anna` with password `short`: the page says
  the password needs at least 12 characters. With `anna-test-password` you land on Home and see
  `anna`.
- **Sign out and back in.** Sign out → Sign in page. Sign in as `ANNA` (capitals) with the right
  password → Home.
- **Wrong password.** `anna` / `wrong-password-123` → "That username and password do not match."
  — and still on Sign in.
- **Navigation on a phone.** At 375 × 667 the bottom bar shows five items, each at least 44 px
  tall, none cut off; tapping each changes the page and the highlight. No horizontal scrolling on
  any page. At 1280 px the bar becomes a sidebar.
- **Already signed in.** Reload `/next/weight` while signed in → still on Weight Tracker.

Commit as `Feature: app shell, sign in and create account`.
