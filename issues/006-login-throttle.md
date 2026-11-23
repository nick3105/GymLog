# Issue 006 - The sign-in limit can be bypassed and locks out everyone

## What happens
The limit of 10 failed sign-ins per 15 minutes (`app.py` `login`, `storage.login_blocked`) is
counted per `request.remote_addr`. Two problems, found in a security review:

1. **Guessing never stops.** A successful sign-in deletes the address's failed attempts. An
   attacker with their own account guesses a victim's password 9 times, signs in to their own
   account, and repeats forever.
2. **One person can lock everyone out.** On PythonAnywhere every request arrives from the load
   balancer, so `remote_addr` is the same for all visitors. Ten wrong passwords from anyone
   block every user's sign-in for 15 minutes, and can be repeated. The visitor's real address
   is in the `X-Real-IP` header, which PythonAnywhere's load balancer sets.

## What should happen
- Failed sign-ins are counted per real visitor address. On PythonAnywhere that is `X-Real-IP`;
  locally (no proxy) it stays `remote_addr`, and a client-sent `X-Real-IP` is ignored.
- A successful sign-in does not clear the failed attempts: they expire 15 minutes after the
  first one, as before.
- The limit stays per address only, not per username, so nobody can lock a known user out of
  their account by typing wrong passwords (decided with the team, 2026-11-23).

## How to reproduce
1. Register two accounts, `alice` and `eve`.
2. From one browser, sign in as `alice` with a wrong password 9 times, then as `eve` with the
   right password. Repeat three times: no request is ever refused with 429.
3. On PythonAnywhere, sign in with a wrong password 10 times, then sign in correctly from
   another phone: it is refused with "Too many sign-in attempts".

## Fix and verification
`create_app` takes a `TRUST_X_REAL_IP` setting (off by default); `wsgi.py`, the PythonAnywhere
entry point, turns it on. `storage.record_login` no longer deletes rows on success.
`backend/tests/test_login_throttle.py` covers both problems and that `X-Real-IP` is ignored
when the setting is off. This changes no screen.
