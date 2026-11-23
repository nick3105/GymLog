"""Fill a local TimeToLift journal with 28 weeks of training through the running API."""

import argparse
import json
import urllib.error
import urllib.request
from datetime import UTC, date, datetime, timedelta
from http.cookiejar import CookieJar
from urllib.parse import urlsplit
from uuid import uuid4

DEFAULT_ADDRESS = "http://127.0.0.1:5000"
USERNAME = "demo"
PASSWORD = "demo-password-123"

# Each workout lists the exercise ID, number of sets, target reps and starting weight in kg.
# Plank uses a target in seconds instead of reps.
WORKOUTS = {
    "Push": [
        ("bench-press", 4, 5, 45),
        ("overhead-press", 3, 8, 22.5),
        ("triceps-pushdown", 3, 12, 12.5),
        ("push-up", 2, 10, 0),
    ],
    "Pull": [
        ("barbell-row", 4, 8, 35),
        ("lat-pulldown", 3, 10, 30),
        ("barbell-curl", 3, 10, 15),
        ("cable-wrist-curl", 2, 15, 7.5),
    ],
    "Legs": [
        ("squat", 4, 5, 60),
        ("romanian-deadlift", 3, 8, 65),
        ("standing-calf-raise", 3, 12, 30),
        ("plank", 3, 45, 0),
    ],
}
ORDER = ["Push", "Pull", "Legs"]
TRAINING_WEEKS = 28
SESSIONS = TRAINING_WEEKS * len(ORDER)
DAYS_BEFORE_WEEK_END = (5, 3, 1)
# Reduce the gain after each four-week training block.
BLOCK_MULTIPLIERS = (1.0, 0.85, 0.70, 0.55, 0.45, 0.35, 0.25)
# Initial gain per week and rounding step, in kg, reps, or seconds.
PROGRESSION = {
    "bench-press": (2.5, 2.5),
    "overhead-press": (1.0, 1.25),
    "triceps-pushdown": (0.5, 0.5),
    "push-up": (1.0, 1),
    "barbell-row": (1.5, 2.5),
    "lat-pulldown": (1.25, 2.5),
    "barbell-curl": (0.5, 0.5),
    "cable-wrist-curl": (0.25, 0.5),
    "squat": (2.5, 2.5),
    "romanian-deadlift": (3.0, 2.5),
    "standing-calf-raise": (1.5, 2.5),
    "plank": (3.0, 5),
}
FAVORITES = ["bench-press", "squat", "plank"]


def call(opener, address, path, body=None, token=None):
    """Send one request to the API and return its status code and JSON answer."""
    headers = {"Content-Type": "application/json"}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["X-CSRF-Token"] = token
    request = urllib.request.Request(f"{address}/api/{path}", data=data, headers=headers)
    try:
        with opener.open(request) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, json.load(error)


def send(opener, address, path, body, token):
    """Save something through the API; stop with the API's own sentence if it refuses."""
    status, answer = call(opener, address, path, body, token)
    if status >= 400:
        raise ValueError(answer.get("error", f"The API refused {path}."))
    return answer


def save_personal_exercises(opener, address, token):
    """Create the demo's rep-based and timed exercises in the owner's catalogue."""
    status, response = call(opener, address, "exercises/personal/muscles")
    if status not in (200, 404):
        raise ValueError(response["error"])

    exercise_ids = {}
    for workout, name, measurement, muscle, group in (
        ("Push", "Band chest fly", "repetitions", "chest", "Chest"),
        ("Legs", "Single-leg balance", "duration", "none", "Core"),
    ):
        body = {"requestId": str(uuid4()), "name": name, "measurement": measurement}
        # Earlier versions accept a broad group instead of a primary muscle.
        if status == 200:
            body["primaryMuscle"] = muscle
        else:
            body["group"] = group
        exercise = send(opener, address, "exercises/personal", body, token)
        exercise_ids[workout] = exercise["id"]
    return exercise_ids


def template_body(name, personal_id):
    """Build a saved workout, including notes and special targets."""
    exercises = []
    for exercise_id, sets, reps, weight in WORKOUTS[name]:
        if exercise_id == "plank":
            target = {"durationSeconds": reps}
        else:
            target = {"reps": reps, "weight": weight}
        exercise = {"id": exercise_id, "targets": [dict(target) for _ in range(sets)]}
        if exercise_id == "bench-press":
            exercise["note"] = "Pause briefly at the chest on the first set."
            exercise["targets"][0]["rpe"] = 8
        if exercise_id in ("triceps-pushdown", "push-up"):
            exercise["supersetId"] = "push-finisher"
        exercises.append(exercise)

    template = {"name": name, "exercises": exercises}
    if name == "Push":
        template.update(
            note="Keep the bench sets controlled and finish with the superset.",
            warmup="Do five minutes of easy cycling and two light bench sets.",
            cooldown="Walk for two minutes and stretch your chest gently.",
        )
        exercises.append({"id": personal_id, "targets": [{"reps": 12, "weight": 0}] * 2})
    if name == "Legs":
        exercises.append({"id": personal_id, "targets": [{"durationSeconds": 30}] * 2})
    if name == "Pull":
        template["rpeEnabled"] = False
    return template


def progress_by_week(week):
    """Add up each elapsed week's contribution, tapering after every four weeks."""
    progress = 0
    for elapsed_week in range(week):
        progress += BLOCK_MULTIPLIERS[elapsed_week // 4]
    return progress


def session_sets(exercise, gain, log_top_set_rpe):
    """Apply the exercise's gain in its own unit to each completed set."""
    rows = []
    for index, target in enumerate(exercise["targets"]):
        if exercise.get("measurement") == "duration":
            rows.append({"durationSeconds": target["durationSeconds"] + gain, "rpe": None})
            continue
        weight, reps = target["weight"], target["reps"]
        if weight > 0:
            weight += gain
        else:
            reps += gain
        rpe = 8 if log_top_set_rpe and index == 0 else None
        rows.append({"weight": weight, "reps": reps, "rpe": rpe})
    return rows


def session_body(template, number, day, progression):
    """Build the completed session for one day in the demo plan."""
    week = number // len(ORDER)
    progress = progress_by_week(week)
    exercises = []
    for position, exercise in enumerate(template["exercises"]):
        initial_gain, increment = progression[exercise["id"]]
        gain = round(initial_gain * progress / increment) * increment
        log_top_set_rpe = position == 0 and template.get("rpeEnabled", True)
        rows = session_sets(exercise, gain, log_top_set_rpe)
        exercises.append({"id": exercise["id"], "sets": rows})
    session = {
        "clientId": f"00000000-0000-4000-8000-{number:012d}",
        "templateId": template["id"],
        "day": day.isoformat(),
        "exercises": exercises,
    }

    # Show an extra bench set and reminder checkboxes in the newest Push.
    if number == SESSIONS - len(ORDER):
        exercises[0]["sets"].append(dict(exercises[0]["sets"][-1]))
        session["warmupDone"] = True
        session["cooldownDone"] = False
    if template["name"] == "Legs" and week == TRAINING_WEEKS - 3:
        exercises[2]["sets"][-1] = {"skipped": True}
    return session


def draft_body(template, today):
    """Prepare a resumable Push workout with the first bench set filled in."""
    exercises = []
    for exercise in template["exercises"]:
        sets = [{"weight": "", "reps": "", "rpe": ""} for _ in exercise["targets"]]
        exercises.append({**exercise, "sets": sets})

    target = exercises[0]["targets"][0]
    exercises[0]["sets"][0] = {
        "weight": f"{target['weight']:g}",
        "reps": str(target["reps"]),
        "rpe": f"{target['rpe']:g}",
    }
    return {
        "clientId": str(uuid4()),
        "startedAt": datetime.now(UTC).isoformat(),
        "templateId": template["id"],
        "name": template["name"],
        "day": today.isoformat(),
        "rpeEnabled": template.get("rpeEnabled", True),
        "note": template["note"],
        "warmup": template["warmup"],
        "cooldown": template["cooldown"],
        "warmupDone": True,
        "cooldownDone": False,
        "exercises": exercises,
    }


def seed(address, username=USERNAME, *, with_draft=False):
    """Register a fresh demo account, fill its journal and return its username."""
    address = address.rstrip("/")
    if urlsplit(address).hostname not in ("localhost", "127.0.0.1"):
        raise ValueError(
            f"Demo data is only for a local TimeToLift journal. Use {DEFAULT_ADDRESS}."
        )
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))
    _, answer = call(opener, address, "session")
    status, answer = call(
        opener, address, "register", {"username": username, "password": PASSWORD}, answer["csrf"]
    )
    if status == 409:
        name = "The demo user" if username == USERNAME else f"The demo user {username}"
        raise ValueError(f"{name} already exists. Choose a fresh username with --username.")
    if status >= 400:
        raise ValueError(answer["error"])
    token = answer["csrf"]
    username = answer["username"]

    personal_ids = save_personal_exercises(opener, address, token)
    progression = {**PROGRESSION, personal_ids["Push"]: (0.5, 1), personal_ids["Legs"]: (1.5, 5)}
    templates = {}
    for name in ORDER:
        body = template_body(name, personal_ids.get(name))
        templates[name] = send(opener, address, "templates", body, token)
    for exercise_id in FAVORITES:
        send(opener, address, f"exercises/{exercise_id}/favorite", {}, token)

    today = date.today()
    for number in range(SESSIONS):
        week, workout = divmod(number, len(ORDER))
        day = today - timedelta(weeks=TRAINING_WEEKS - week - 1, days=DAYS_BEFORE_WEEK_END[workout])
        template = templates[ORDER[workout]]
        send(opener, address, "sessions", session_body(template, number, day, progression), token)

    for days_ago in range(30, 0, -1):
        kg = round(84.0 - 0.1 * (30 - days_ago), 1)
        day = (today - timedelta(days=days_ago)).isoformat()
        send(opener, address, "weights", {"day": day, "kg": kg}, token)
    send(opener, address, "weight-goal", {"kg": 78, "mode": "lose"}, token)
    send(
        opener,
        address,
        "volume/preferences",
        {"goals": {"chest": 12, "quadriceps": 10}, "revision": 0},
        token,
    )
    if with_draft:
        send(opener, address, "workout-draft", draft_body(templates["Push"], today), token)
    return username


def main():
    """Read the command line and print the new demo account's sign-in details."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("address", nargs="?", default=DEFAULT_ADDRESS, help="local Flask address")
    parser.add_argument("--username", default=USERNAME, help="new account name (default: demo)")
    parser.add_argument(
        "--with-draft", action="store_true", help="include an unfinished Push workout"
    )
    options = parser.parse_args()
    try:
        username = seed(options.address, options.username, with_draft=options.with_draft)
    except ValueError as error:
        raise SystemExit(str(error)) from None
    except urllib.error.URLError:
        raise SystemExit(
            f"Cannot reach TimeToLift at {options.address}. Start it first: "
            "uv run flask --app gymlog run --debug"
        ) from None
    print(
        f"Demo journal ready: {len(WORKOUTS)} templates, {SESSIONS} sessions over {TRAINING_WEEKS} weeks, "
        "30 days of body weight and a 78 kg goal.\n"
        f"Sign in as {username} with the password {PASSWORD}."
    )
    if options.with_draft:
        print("Open Start and tap Resume workout to try the unfinished Push workout.")


if __name__ == "__main__":
    main()
