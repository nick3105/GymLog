# GymLog

**[Open GymLog in your browser](https://nick3105.github.io/GymLog/)** — no downloads or installation.

The website works on phones and computers. Entries stay in the current page session and reset on refresh. For web source files and collaboration notes, see [WEB_README.md](WEB_README.md).

The original Python desktop starter is also included below.

---

# GymLog — Python desktop starter

A beginner-friendly CustomTkinter app for a four-student Introduction to Programming project. Dark charcoal panels, lime accents, a scrollable dashboard and a small workout form. No accounts, server or database.

## Run in five minutes

Use Python 3.10 or newer with Tkinter installed, on a desktop computer. Extract the ZIP first. Open a terminal **inside the GymLog folder** (the folder containing `main.py`).

Windows PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe main.py
```

macOS / Linux:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python main.py
```

Using the environment's Python directly avoids activation-policy issues. Internet is needed for installation, then the app runs offline. Dependencies of CustomTkinter are installed automatically. The direct dependency is pinned for a consistent starting point; this is not a fully locked dependency set.

If Python is missing, install it from https://www.python.org/downloads/. Check Tkinter with `python -m tkinter` (or `py -m tkinter` / `python3 -m tkinter`). It should open a test window. On Ubuntu/Debian, install the matching `python3-tk` and `python3-venv` packages if missing. If you see `No module named customtkinter`, use the same environment's Python for both install and run. A graphical desktop is required; a browser notebook cannot display this native window.

## What works now

- Dashboard with this week's workout count and training minutes, plus total session count.
- Fixed four-workout weekly goal with a progress bar capped at 100%.
- Workout history sorted newest date first.
- Log a workout with a name and a whole-number duration from 1–600 minutes.
- Validation messages, Enter to save, Escape to close, immediate dashboard updates.
- Three explicitly labelled sample sessions, dated relative to launch day.

**All entries live in memory. Closing the app discards new entries and reloads sample data next launch.** Weekly totals run Monday through today using the computer's local date. Depending on the day you launch, some sample entries may belong to last week. New entries use today's date. There are no calorie estimates, streaks or medical claims.

## Repository map

```text
GymLog/
├── main.py                  # Starts the event loop
├── requirements.txt         # One direct dependency
├── gymlog/
│   ├── __init__.py
│   ├── app.py               # Window, dashboard and form callbacks
│   ├── models.py            # Workout data, validation and weekly filtering
│   ├── theme.py             # Shared colour palette
│   └── widgets.py           # Reusable labels and statistic cards
├── tests/
│   ├── test_models.py       # Data validation and date boundaries
│   └── smoke_gui.py         # Opens widgets and exercises the form
├── docs/
│   ├── CODE_GUIDE.md        # Short walkthrough
│   └── TEAM_PLAN.md         # Four-person tasks and four-week plan
├── CONTRIBUTING.md          # Branch, commit, review and merge workflow
└── .github/
    └── pull_request_template.md
```

## Check your changes

From the repository folder, using your environment's Python:

```sh
python -m unittest discover -s tests -v
python -m tests.smoke_gui
```

Replace `python` with `.\.venv\Scripts\python.exe` on Windows or `.venv/bin/python` on macOS/Linux. The smoke check briefly opens real windows and requires a desktop. Also manually resize the window, scroll the history, try blank/invalid inputs and save a valid workout. Check that counters update and reopening the app resets the session.

Read [the code guide](docs/CODE_GUIDE.md), [team plan](docs/TEAM_PLAN.md) and [contribution workflow](CONTRIBUTING.md) before dividing up work.

## Realistic MVP boundary

The starter is a runnable foundation, not a full fitness platform. The course MVP can refine this single-user flow: log a named workout, validate duration, review history and understand the weekly summary. Leave login, cloud sync, social features, nutrition, wearables and databases out of the course MVP. Agree with your teacher before adding persistence or exercise-level sets/reps.

CustomTkinter reference: https://customtkinter.tomschimansky.com/documentation/
