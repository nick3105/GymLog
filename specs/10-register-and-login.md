# Task 10 — Register and login

> Assignee: Martin Zvelebil
>
> **Done** — PR #5 (`6860d13`). Written after the fact, so the team can see what was built and
> how it was checked. Branch was `feat/register-login`.

## Why

The first version had a profile picker: four fixed profiles (`nick`, `martin`, `anna-lisa`,
`gaia`) and invitations to add more. It only worked for people the owner knew, and every new
user meant a manual step. A normal account — pick a username and password, sign in on any
device — is what everyone expects from an app, and it is the only way strangers can use GymLog.
The people already logging workouts must not lose anything on the way.

## What

Implements ACC-01 to ACC-05 in the API and the current UI at `/`.

- [x] **Create account** (ACC-01): `POST /api/register` with a username (3–30 lowercase letters,
      numbers, `-` or `_`; case-insensitive) and a password of at least 12 characters. The rule
      is `validate_registration` in `models.py`. Signing up signs you in. A taken username gets
      "That username is taken. Choose another one."
- [x] **Keep existing accounts** (ACC-02): on first start, `storage.initialize` moves each old
      per-profile journal into the single database as a user with the same name and password.
      It runs once, and if anything fails nothing changes.
- [x] **Protect sign-in** (ACC-03): passwords stored only as hashes; 10 failed attempts from
      one address block it for 15 minutes, and the block survives a server restart.
- [x] **Sign in** (ACC-04): `POST /api/login` with username and password. Wrong details get
      "That username and password do not match." — never which of the two was wrong.
- [x] **Sign out** (ACC-05): `POST /api/logout`; the UI asks first if a workout or template is
      unfinished.
- [x] **Every journal is private:** templates, sessions and weights carry a `user_id`, and every
      query in `storage.py` filters by it.
- [x] If a password changes (today only directly in the database — there is no screen for it),
      every device signed in with the old one is signed out.
- [x] The profile picker, invitations and `setup_owner.py` are gone; `setup_secret.py` only
      creates the session key.

## Out of scope

- The React sign-in screens — task 1.
- Password reset by email, changing username, deleting an account.

## Done when

All of these are tests in `backend/tests/` and pass in CI:

- **Registration rules** (`test_api.py::test_registration_rules`): `NICK` is taken (409);
  `ab`, `a b`, a 9-character password and a missing password are refused (400) without signing
  in; `Nick ` signs in as `nick`.
- **Isolation** (`test_users_are_isolated`): a new account sees an empty journal, cannot log a
  session against someone else's template (404), and saving a weight on the same date does not
  touch the other account's weight.
- **Rate limit** (`test_login_attempt_limit_is_persistent`): after 10 wrong passwords, even the
  right password gets 429 — also after the app restarts.
- **Sign out and CSRF** (`test_authentication_csrf_and_logout`).
- **Password change** (`test_password_change_signs_out_other_devices`): after the stored
  password changes, an existing sign-in gets 401.
- **Upgrade** (`test_upgrade.py`): old profiles keep their password and data, the upgrade runs
  once, and a failed upgrade changes nothing.
- On a phone at `/`: create an account, log a workout, sign out, sign in again — the workout is
  still there.

Commit was `Replace profiles and invitations with register and login`.
