# Task 12 — Move production to a real database

> Assignee:
>
> **Needs the team's agreement first:** it adds a database and a library to the coding stack
> (`AGENTS.md` → Coding stack). Agree on the choices under **Decisions** before anyone starts.

## Why

Today every account, workout and weight lives in one SQLite file, `backend/instance/gymlog.sqlite3`,
on PythonAnywhere's disk. That was fine for four friends; it is not what we want once strangers
sign up:

- **Backups are manual.** Someone has to remember to copy `instance/`. If the file is deleted or
  corrupted, everything since the last copy is gone.
- **The data is tied to the code folder.** One wrong `git clean` or `rm -rf ~/GymLog` in the
  console removes every journal.
- **PythonAnywhere advises against SQLite for web apps:** its disks are network storage, so
  SQLite gets slow and can fail with "database is locked" when two people save at the same time.
- **Nobody else can look at the data** (to answer "where did my workout go?") without downloading
  the whole file.

PythonAnywhere includes a **MySQL** database on the free plan, managed and backed up by them,
separate from the code. That is the real database.

## Decisions

Proposed — confirm or change them with the team before starting:

| Question | Proposal | Why |
| --- | --- | --- |
| Which database? | **MySQL 8 on PythonAnywhere** | Free on our plan. Postgres is paid there. |
| Which Python driver? | **PyMySQL** (`uv add pymysql`) | Pure Python: installs on macOS, Windows and Linux with no compiler. `mysqlclient` is faster but needs MySQL's C libraries on every laptop. |
| ORM? | **No** — keep plain SQL in `storage.py` | The stack already says no ORM; there are about 15 queries. |
| Local development? | **SQLite stays** | Nobody has to install MySQL. The same `storage.py` talks to both. |
| Where does the password go? | `backend/instance/settings.json` (`"database": {...}`) | Same place as the session key; already Git-ignored. |

## What

- [ ] **One switch:** with no `database` entry in `settings.json`, GymLog uses
      `instance/gymlog.sqlite3` exactly as today. With
      `"database": {"host": ..., "user": ..., "password": ..., "name": ...}` it uses MySQL.
      Nothing else in the app knows which one is running.
- [ ] **`storage.py` works on both.** Every query runs on SQLite and MySQL. Where the two differ,
      `storage.py` has one small branch, not a second copy of the file:
  - placeholders: `?` (SQLite) vs `%s` (MySQL)
  - "insert unless it exists": `INSERT OR IGNORE` vs `INSERT IGNORE`
  - "insert or update": `ON CONFLICT … DO UPDATE` vs `ON DUPLICATE KEY UPDATE`
  - text keys: MySQL needs `VARCHAR(n)` for primary and unique keys (IDs are UUIDs, 36 characters;
    usernames at most 30)
  - schema version: `PRAGMA user_version` is SQLite-only; on MySQL use a one-row
    `schema_version` table
  - tables use `utf8mb4` so names with any character (emoji, ü, ř) are stored correctly
- [ ] **Case-insensitive usernames keep working** on MySQL (`NICK` is still taken when `nick`
      exists).
- [ ] **The old-profile upgrade stays SQLite-only** (`test_upgrade.py`). MySQL always starts from
      the current schema; production data arrives through the copy script below.
- [ ] **Copy script** `backend/copy_to_mysql.py`, run once on PythonAnywhere:
  - reads `instance/gymlog.sqlite3` and writes every user, template, session and weight into an
    **empty** MySQL database, in one transaction; it refuses to run if MySQL already has users
  - prints the row count per table for both databases; they must match
  - never changes the SQLite file — it stays as the backup
  - login attempts are not copied (they expire in 15 minutes anyway)
- [ ] **CI tests both databases:** the `backend` job in `.github/workflows/ci.yml` also runs
      `pytest` against a MySQL 8 service container, so a query that only works on SQLite turns
      the pull request red.
- [ ] **`docs/DEPLOYMENT.md`** gets a section "One-time switch to MySQL" (below) and an updated
      **Private data** table and backup section.
- [ ] **`AGENTS.md`** Coding stack table: Data row becomes "SQLite (local), MySQL 8 (production),
      through `sqlite3` and PyMySQL in `storage.py` — no ORM".

### The switch on PythonAnywhere (goes into `DEPLOYMENT.md`)

1. **Databases tab:** set a MySQL password, create a database `gymlog`. Note the host
   (`<user>.mysql.pythonanywhere-services.com`) and the full name (`<user>$gymlog`).
2. Merge the pull request; wait for the **Deploy** workflow and the webhook (the site keeps
   running on SQLite because `settings.json` has no `database` entry yet).
3. **Web tab → Disable** (so nobody saves during the copy). Back up `instance/`.
4. Add the `database` entry to `~/GymLog/backend/instance/settings.json`, then in a Bash console:
   `cd ~/GymLog/backend && uv run python copy_to_mysql.py`. Check that the counts match.
5. **Enable** and **Reload**. Sign in, check that workouts, sessions and weights are there; save
   one weight and see it in the MySQL console (`SELECT * FROM body_weights;`).

**Rollback:** remove the `database` entry from `settings.json` and Reload — the app is back on
the untouched SQLite file. Anything saved in between is only in MySQL; tell the team.

## Out of scope

- Using MySQL on our laptops (possible later; not needed for this task).
- Changing what is stored or how — the JSON `document` columns stay as they are.
- Automatic backups beyond what PythonAnywhere does for MySQL.
- Reaching the production database from outside PythonAnywhere (the free plan does not allow it).

## Done when

- `uv run pytest` passes on SQLite **and** against MySQL 8 in CI, with no test changed to make it
  pass. Run locally against MySQL by setting `GYMLOG_TEST_MYSQL` (e.g. a Docker
  `mysql:8` container) — CI sets it for the service container.
- A new test (`test_storage_mysql.py` or parametrised existing tests) proves on MySQL:
  register, sign in, `NICK` is taken when `nick` exists, saving a weight twice on the same date
  updates it (one row), saving the same session twice keeps one session, and accounts are
  isolated.
- `copy_to_mysql.py` is tested: a SQLite file with 2 users, templates, sessions and weights is
  copied and the counts and documents match; running it a second time refuses and changes
  nothing; a broken row mid-copy leaves MySQL empty.
- With no `database` entry, the app behaves exactly as before (all existing tests unchanged).
- On production after the switch: `/api/health` is ok, everyone's old data is there, and a new
  weight saved on a phone is visible in the MySQL console.

Commit message: `Use MySQL in production, keep SQLite for local development`.
