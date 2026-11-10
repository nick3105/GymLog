# GymLog — hosting and operations

The live journal is https://nickkkk3105.pythonanywhere.com/, served by `backend/` on
PythonAnywhere. The free web app needs renewal in the Web tab every month; the next expiry is
6 December 2026.

## Private data

Everything personal lives in `backend/instance/`, which Git ignores:

| File | Contains |
|---|---|
| `gymlog.sqlite3` | every account (password hashes only), journal and login-attempt limit |
| `settings.json` | session-signing key (plus Nick's old password hash, used once by the upgrade) |
| `gymlog-<profile>.sqlite3` | old per-guest journals; copied into `gymlog.sqlite3` by the upgrade, then unused |

Never commit, upload or share these files. Flask serves only `frontend/dist/` (the built app),
never the source or `instance/`.

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
   - you can sign in with username `nick` and the old password, and your templates, sessions
     and weights are there; activated guests sign in with their profile name (`martin`, …)
   - the Error log in the Web tab is empty

6. Once it works: `rm -rf ~/GymLog/cloud`.

**Rollback** if step 5 fails: `cd ~/GymLog && git switch --detach a3a6f58`,
`mv backend/instance cloud/instance`, set the Web tab paths back to `.../GymLog/cloud` and
`.../GymLog/cloud/.venv`, restore the previous WSGI file (`from wsgi import application` with
`project = '/home/nickkkk3105/GymLog/cloud'`), Reload. Then tell the team.

## Upgrade to user accounts (automatic)

The first start after the register/login change rewrites `gymlog.sqlite3` in place: Nick (from
`settings.json`) and every activated guest become users with their old password, and the guest
files are copied in. It runs in one transaction — if anything fails the app does not start and the
database is unchanged; send the Error log to the team. Back up `instance/` first (step 1 above).
Everyone is signed out once because the cookie format changed.

## How a merge reaches production

PythonAnywhere runs the **`deploy` branch**, not `main`. On every merge to `main`,
`.github/workflows/deploy.yml` builds the React app and pushes `main` plus `frontend/dist/` as
`deploy` (with `frontend/dist/commit.txt` naming the commit). The push to `deploy` calls the
webhook below, which checks the new `deploy` out, runs `uv sync` and reloads the app.
`/api/health` then shows `"commit"` equal to the latest commit on `main`.

Nobody commits to `deploy` by hand — it is replaced on every merge.

## One-time switch to the `deploy` branch

Do this right after merging the pull request that made React the app (it deleted the old UI, so
until these steps run the site answers "The app is not built yet").

1. Check that the **Deploy** workflow on `main` is green in the Actions tab and the `deploy`
   branch exists on GitHub.
2. Back up `instance/` (see **Backup and recovery**), then in a **Bash console**:

   ```sh
   cd ~/GymLog
   git fetch origin deploy
   git checkout --force -B deploy origin/deploy
   cd backend && uv sync --no-dev
   ```

3. **Reload** in the Web tab. Check:
   - `https://nickkkk3105.pythonanywhere.com/` shows the sign-in screen of the new app
   - `/api/health` shows the same commit as the latest `main`
   - you can sign in and your workouts, sessions and weights are there

From then on the webhook does this on every merge. **Rollback:** `git checkout --force <older
commit of deploy>` in the console and Reload; or `git switch --detach 2fd4410` for the last
version with the old UI.

## Updating by hand (webhook off)

```sh
cd ~/GymLog
git fetch origin deploy
git checkout --force -B deploy origin/deploy
cd backend && uv sync --no-dev
```

Then **Reload** in the Web tab. `instance/` is never touched by updates.

## Automatic updates for the shared development site

Configure a GitHub repository webhook for push events with content type
`application/json` and payload URL
`https://nickkkk3105.pythonanywhere.com/_deploy/github`. Use a random secret
of at least 32 bytes and store the same secret on PythonAnywhere in a file
outside the repository with permissions `0600`.

In the PythonAnywhere WSGI configuration, add the following after
`from wsgi import application` (adjust the secret path to match the host):

```python
from pathlib import Path
from deploy_webhook import wrap

application = wrap(application, Path(project).parent, __file__, Path.home() / ".gymlog-deploy-secret")
```

Reload once to activate the receiver. A signed push to `deploy` checks out the
new build, installs locked runtime dependencies, and requests a reload. Pushes
to any other branch are ignored.
Check the webhook delivery response for the commit and verify `/api/health`
after the reload. Disable the webhook in GitHub to pause automatic updates.

## Backup and recovery

Back up before every risky change. With the web app disabled, `cp -a` the whole
`backend/instance` folder as in step 1. For a live copy of one database use SQLite's backup
command: `sqlite3 backend/instance/gymlog.sqlite3 ".backup ~/backups/gymlog.sqlite3"`.

There is no password reset in the app yet. Signing everyone out (for example after a leaked
key): disable the app, move `instance/settings.json` to a private backup, run
`uv run python setup_secret.py`, enable and reload.

SQLite needs a persistent disk. Do not deploy unchanged onto an ephemeral container, and run only
one app instance against the database.

Provider docs: [Flask deployment](https://help.pythonanywhere.com/pages/Flask),
[databases](https://help.pythonanywhere.com/pages/KindsOfDatabases),
[free-account limits](https://help.pythonanywhere.com/pages/FreeAccountsFeatures/).
