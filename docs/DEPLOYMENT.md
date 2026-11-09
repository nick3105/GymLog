# GymLog — hosting and operations

The live journal is https://nickkkk3105.pythonanywhere.com/, served by `backend/` on
PythonAnywhere. The free web app needs renewal in the Web tab every month; the next expiry is
6 December 2026.

## Private data

Everything personal lives in `backend/instance/`, which Git ignores:

| File | Contains |
|---|---|
| `gymlog.sqlite3` | Nick's journal, guest accounts, login-attempt limits |
| `gymlog-<profile>.sqlite3` | one journal per activated guest profile |
| `settings.json` | session-signing key and Nick's password hash (never the plaintext) |

Never commit, upload or share these files. Flask serves only `gymlog/static/` and
`frontend/dist/`, never the source or `instance/`.

## One-time switch from `cloud/` to `backend/`

Do this together with merging the pull request that moved `cloud/` into `backend/`. The
database is reused as-is, so nothing is migrated. Replace `nickkkk3105` if the account differs.

1. **Web tab → Disable** the web app, then back up in a **Bash console**:

   ```sh
   mkdir -p ~/backups
   cp -a ~/GymLog/cloud/instance ~/backups/instance-$(date +%F)
   ```

2. Merge the pull request on GitHub, then pull and move the private folder:

   ```sh
   cd ~/GymLog
   git pull --ff-only
   mv cloud/instance backend/instance
   ```

   `git pull` removes the tracked files in `cloud/`; `instance/` and `.venv/` stay behind
   because Git ignores them.

3. Install the dependencies with uv:

   ```sh
   command -v uv || pip3.12 install --user uv
   cd ~/GymLog/backend
   uv sync --no-dev
   ```

4. **Web tab:**
   - Source code and working directory: `/home/nickkkk3105/GymLog/backend`
   - Virtualenv: `/home/nickkkk3105/GymLog/backend/.venv`
   - WSGI configuration file, replace its contents with:

     ```python
     import sys
     project = '/home/nickkkk3105/GymLog/backend'
     if project not in sys.path:
         sys.path.insert(0, project)
     from wsgi import application
     ```

5. **Enable** and **Reload**. Check:
   - `https://nickkkk3105.pythonanywhere.com/api/health` shows `{"status": "ok"}`
   - you are still signed in (same `settings.json`), and your templates, sessions and weights
     are there; a guest profile can sign in too
   - the Error log in the Web tab is empty

6. Once it works: `rm -rf ~/GymLog/cloud`.

**Rollback** if step 5 fails: `cd ~/GymLog && git switch --detach a3a6f58`,
`mv backend/instance cloud/instance`, set the Web tab paths back to `.../GymLog/cloud` and
`.../GymLog/cloud/.venv`, restore the previous WSGI file (`from wsgi import application` with
`project = '/home/nickkkk3105/GymLog/cloud'`), Reload. Then tell the team.

`/next/` (the React preview) returns 404 in production until a later PR builds the frontend
for PythonAnywhere. That is expected.

## Updating after a merge

```sh
cd ~/GymLog
git pull --ff-only
cd backend && uv sync --no-dev
```

Then **Reload** in the Web tab. `instance/` is never touched by updates.

## Backup and recovery

Back up before every risky change. With the web app disabled, `cp -a` the whole
`backend/instance` folder as in step 1. For a live copy of one database use SQLite's backup
command: `sqlite3 backend/instance/gymlog.sqlite3 ".backup ~/backups/gymlog.sqlite3"`.

Nick's password reset needs host access: disable the app, move `instance/settings.json` to a
private backup, run `uv run python setup_owner.py`, enable and reload. The new key signs everyone
out; the databases are unchanged.

SQLite needs a persistent disk. Do not deploy unchanged onto an ephemeral container, and run only
one app instance against the database.

Provider docs: [Flask deployment](https://help.pythonanywhere.com/pages/Flask),
[databases](https://help.pythonanywhere.com/pages/KindsOfDatabases),
[free-account limits](https://help.pythonanywhere.com/pages/FreeAccountsFeatures/).
