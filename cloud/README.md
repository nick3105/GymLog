# GymLog — single-user training journal

This is the new **server-backed version**. It has one owner, reusable workout templates and actual results saved in SQLite. Open the hosted URL and sign in with the same password on a computer or phone. The GitHub Pages demo at the repository root remains a separate, session-only demo until a Python host is configured.

## Included flows

- **Home:** Start workout / Create workout / Review workouts.
- **Create workout:** choose exercises, set the number of sets, target reps and optional target weight. Save a repeatable template.
- **Start workout:** select a template. Each exercise has its own block and each set has a row for actual weight, reps and optional RPE. Enter 0 kg for a bodyweight-only set.
- **Finish & save session:** all planned sets require actual weight and reps. RPE can stay blank. A server response confirms saving; a connection failure keeps the form for retry. Repeated session submissions use the same ID to prevent duplicate results.
- **Review workouts:** open any completed session to see its original results. Templates remain unchanged.
- Above an exercise, **Last session** shows the latest saved results for that exercise, including when it appeared in a different template. This compares by stable exercise ID.

Unsaved forms are held in memory, with a warning before refresh/closing. Only a successful **Save workout** or **Finish & save session** persists records. Unfinished drafts are not synced between devices. A signed-in device loads the current journal on opening, Refresh, or starting a new session.

## Exercise catalogue

Edit `exercises.json` to add exercises, for example:

```json
{"id":"incline-bench-press","name":"Incline bench press","group":"Chest"}
```

Use unique, stable IDs and English names. Reload the host after editing. Saved templates and sessions contain snapshots of exercise names and targets, so catalogue changes do not rewrite history. A template already created before a rename retains its original label.

## Estimated 1RM

For sets of 2–10 reps with positive external load, the Epley estimate is **weight × (1 + reps / 30)**, rounded to 0.1 kg. A single rep is reported as its actual load. The highest valid set estimate appears at the upper right of the exercise block. Zero external load or more than 10 reps does not produce an estimate. RPE is saved independently and does not adjust the calculation. The 1–10 rep display cutoff is an app choice to avoid presenting long sets as precise estimates.

Formula reference: [US Marine Corps, Introduction to Assessments](https://www.tbs.marines.mil/Portals/230/TBS%20Redesign/MAFCE/FFI/3.%20Instructional%20Material/CourseStudentOutlines/FFIC1030_Introduction%20to%20Assessments_Student%20Outline.pdf). This is an estimate from completed sets, not a tested maximum.

## Files and responsibilities

```text
cloud/
  app.py                 Flask routes, sign-in and request protection
  models.py              Input validation and server-side 1RM calculations
  storage.py             Parameterised SQLite queries and persistent snapshots
  exercises.json         Editable exercise catalogue
  setup_owner.py         Sets the single owner's password privately
  run.py                 Local-only development server
  wsgi.py                Production host entry point
  requirements.txt       Server dependencies
  static/
    index.html           English page shell and login screen
    base.css             Original GymLog design palette
    training.css         New views and responsive exercise cards
    training.js          Form state, navigation and server calls
    training-model.mjs   Pure client-side calculation helpers
  tests/
    test_app.py           Database/authentication and two-device tests
    model.test.mjs        Frontend calculation/validation tests
  instance/              Created at setup; private, ignored by Git
```

The app uses no localStorage. Completed records are on the Python host in `instance/gymlog.sqlite3`. `instance/settings.json` contains a random session-signing key and a password hash, never the plaintext password. Neither file belongs in the public repository or an upload of source code. Flask serves only `static/`, not the source or instance directory.

## Run locally (developers)

Python 3.10+ is required. From this folder on Windows:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe setup_owner.py
.\.venv\Scripts\python.exe run.py --local
```

On macOS/Linux use `python3 -m venv .venv`, then `.venv/bin/python` for the remaining commands. Open `http://127.0.0.1:8770`. Setup asks for a password of at least 12 characters and stores a hash. Local HTTP mode binds only to localhost; internet hosting must use the HTTPS/WSGI instructions below. Visitors need no installation.

## Deploy to PythonAnywhere

1. Sign in to your own [PythonAnywhere account](https://www.pythonanywhere.com/login/). A [Beginner account](https://www.pythonanywhere.com/pricing/) can host one app. Free web apps currently have a one-month expiry and need renewal in the Web tab; consult the current account page. Do not choose a paid plan without agreeing its cost.
2. Open a Bash console and clone the public repository:

```sh
git clone https://github.com/nick3105/GymLog.git
cd GymLog/cloud
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python setup_owner.py
```

3. In **Web → Add a new web app**, select **Manual configuration** and the same Python version used to create the environment. For another available Python version, replace `python3.12` in the commands above accordingly.
4. Set the virtualenv to `/home/YOUR_USERNAME/GymLog/cloud/.venv` and the source directory to `/home/YOUR_USERNAME/GymLog/cloud`. Set the working directory there too if the host offers that field.
5. In the WSGI configuration file, replace the starter with:

```python
import sys
project = '/home/YOUR_USERNAME/GymLog/cloud'
if project not in sys.path:
    sys.path.insert(0, project)
from wsgi import application
```

6. Leave static mappings empty initially; Flask serves `/assets/`. Never map the project folder or `instance/` as static content. Enable **Force HTTPS**, then **Reload**. Open `https://YOUR_USERNAME.pythonanywhere.com/` and sign in.
7. Create a test template on one device, reload, then sign in on another device. Finish a session and verify that the other device can retrieve it using Refresh. Only after this check should the old GitHub Pages link redirect to the new hosted URL.

SQLite needs a persistent filesystem. Do not deploy this unchanged onto an ephemeral container disk. PythonAnywhere provides filesystem-backed SQLite; other platforms may require an explicitly persistent volume. Only one deployed app instance should use this database.

Provider documentation: [Flask deployment](https://help.pythonanywhere.com/pages/Flask), [available databases](https://help.pythonanywhere.com/pages/KindsOfDatabases), [free-account limits](https://help.pythonanywhere.com/pages/FreeAccountsFeatures/).

## Updating, backup and recovery

After merging source changes, run `git pull --ff-only` in the hosted repository and Reload in the Web tab. Private `instance/` files are ignored and are not replaced by source updates. A password reset requires host access: stop the app, move `instance/settings.json` to a private backup, run `setup_owner.py` again, then reload. The new key invalidates old sign-ins; the database remains intact.

Back up the database privately before major changes. While the app is stopped, copy `instance/gymlog.sqlite3` to a private backup location. For a live database use SQLite's backup API. Keep a separate protected backup of `settings.json` if you want to preserve existing sign-ins. Backups contain personal training data; do not commit them.

## Verification and team collaboration

From `cloud/`, with Flask installed:

```sh
python -m unittest discover -s tests -v
node --test tests/model.test.mjs
```

Python tests verify saving, retrieval from two independently signed-in clients, server restart persistence, optional RPE, immutable templates, repeat-submit deduplication, invalid input, CSRF/authentication, logout and the persistent login-attempt limit. JavaScript tests cover Epley estimates, previous performance across templates, and optional RPE.

Four-person division: A owns the HTML/CSS views; B the template/session form interactions; C models/storage/tests; D review views, deployment and documentation. Use small branches and one reviewer per pull request as described in the existing CONTRIBUTING guide.

## Deliberate limits

One owner/password, one exercise catalogue, no registration, no multi-user permissions, no social features and no offline synchronisation. Templates are created and reused; editing/deleting historical records is outside this first version. Every weight is in kg. The session date is your device's local date at session start; the server records completion time in UTC. The existing desktop app is independent and does not sync to this journal.
