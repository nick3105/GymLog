"""Fill a local GymLog with six weeks of demo training, through the running API (spec 23)."""

import json
import sys
import urllib.error
import urllib.request
from datetime import date, timedelta
from http.cookiejar import CookieJar
from urllib.parse import urlsplit

DEFAULT_ADDRESS = "http://127.0.0.1:5000"
USERNAME = "demo"
PASSWORD = "demo-password-123"

# Each workout: (exercise ID, sets, reps, first weight in kg). Weights go up 2.5 kg a round.
# Plank is held for seconds instead: its "reps" are the seconds of the first round.
WORKOUTS = {
    "Push": [
        ("bench-press", 4, 5, 60),
        ("overhead-press", 3, 8, 35),
        ("triceps-pushdown", 3, 12, 20),
        ("push-up", 2, 15, 0),
    ],
    "Pull": [
        ("barbell-row", 4, 8, 50),
        ("lat-pulldown", 3, 10, 45),
        ("barbell-curl", 3, 10, 25),
        ("cable-wrist-curl", 2, 15, 10),
    ],
    "Legs": [
        ("squat", 4, 5, 80),
        ("romanian-deadlift", 3, 8, 70),
        ("standing-calf-raise", 3, 12, 40),
        ("plank", 3, 45, 0),
    ],
}
ORDER = ["Push", "Pull", "Legs"]
SESSIONS = 21


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


def is_timed(exercise_id):
    """Plank is the only exercise held for seconds in the demo."""
    return exercise_id == "plank"


def template_body(name):
    """A template with one target per set, at the first round's numbers."""
    exercises = []
    for exercise_id, sets, reps, weight in WORKOUTS[name]:
        if is_timed(exercise_id):
            target = {"durationSeconds": 60}
        else:
            target = {"reps": reps, "weight": weight}
        exercises.append({"id": exercise_id, "targets": [target] * sets})
    return {"name": name, "exercises": exercises}


def session_sets(exercise_id, sets, reps, weight, round_number, is_main_lift):
    """The logged sets of one exercise in one round."""
    rows = []
    for index in range(sets):
        if is_timed(exercise_id):
            rows.append({"durationSeconds": reps + 5 * round_number, "rpe": None})
            continue
        load = weight + 2.5 * round_number if weight > 0 else 0
        # The top set of the main lift gets an RPE, so the 1RM estimate uses it.
        rpe = 8 if is_main_lift and index == 0 else None
        rows.append({"weight": load, "reps": reps, "rpe": rpe})
    return rows


def session_body(template, number, day):
    """Session `number` (0 is the oldest) of the demo plan, saved for `day`."""
    round_number = number // 3
    exercises = []
    for position, (exercise_id, sets, reps, weight) in enumerate(WORKOUTS[template["name"]]):
        rows = session_sets(exercise_id, sets, reps, weight, round_number, position == 0)
        exercises.append({"id": exercise_id, "sets": rows})
    # Show the rarer cases too: an extra bench set in the newest Push,
    # and a skipped calf raise set in one Legs workout.
    if number == SESSIONS - 3:
        exercises[0]["sets"].append(dict(exercises[0]["sets"][-1]))
    if number == 11:
        exercises[2]["sets"][-1] = {"skipped": True}
    return {
        "clientId": f"00000000-0000-4000-8000-{number:012d}",
        "templateId": template["id"],
        "day": day.isoformat(),
        "exercises": exercises,
    }


def seed(address):
    """Register the demo user at a local GymLog and save their templates, workouts and weights."""
    if urlsplit(address).hostname not in ("localhost", "127.0.0.1"):
        raise ValueError(f"Demo data is only for a local GymLog. Use {DEFAULT_ADDRESS}.")
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))
    _, answer = call(opener, address, "session")
    status, answer = call(
        opener, address, "register", {"username": USERNAME, "password": PASSWORD}, answer["csrf"]
    )
    if status == 409:
        raise ValueError(
            "The demo user already exists. Delete backend/instance/ for a fresh journal, "
            "or sign in as demo."
        )
    if status >= 400:
        raise ValueError(answer["error"])
    token = answer["csrf"]

    templates = {}
    for name in ORDER:
        templates[name] = send(opener, address, "templates", template_body(name), token)

    today = date.today()
    for number in range(SESSIONS):
        # Every second day, ending yesterday.
        day = today - timedelta(days=2 * (SESSIONS - number) - 1)
        template = templates[ORDER[number % 3]]
        send(opener, address, "sessions", session_body(template, number, day), token)

    for days_ago in range(30, 0, -1):
        kg = round(84.0 - 0.1 * (30 - days_ago), 1)
        day = (today - timedelta(days=days_ago)).isoformat()
        send(opener, address, "weights", {"day": day, "kg": kg}, token)
    send(opener, address, "weight-goal", {"kg": 78, "mode": "lose"}, token)


def main():
    address = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_ADDRESS
    try:
        seed(address.rstrip("/"))
    except ValueError as error:
        raise SystemExit(str(error)) from None
    except urllib.error.URLError:
        raise SystemExit(
            f"Cannot reach GymLog at {address}. Start it first: "
            "uv run flask --app gymlog run --debug"
        ) from None
    print(
        f"Demo journal ready: 3 workouts, {SESSIONS} completed sessions over six weeks, "
        "30 days of body weight and a 78 kg goal.\n"
        f"Sign in as {USERNAME} with the password {PASSWORD}."
    )


if __name__ == "__main__":
    main()
