"""Validation and calculations, independent of Flask and SQLite."""

import math
import re
from datetime import UTC, date, datetime, timedelta
from uuid import UUID


def number(value, label, minimum, maximum, integer=False, optional=False):
    if optional and (value is None or value == ""):
        return None
    if value is None or isinstance(value, bool) or value == "":
        raise ValueError(f"{label} is required.")
    try:
        result = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{label} must be a number.") from None
    if not math.isfinite(result) or not minimum <= result <= maximum:
        raise ValueError(f"{label} must be between {minimum} and {maximum}.")
    if integer and not result.is_integer():
        raise ValueError(f"{label} must be a whole number.")
    return int(result) if integer else result


USERNAME = re.compile(r"[a-z0-9_-]{3,30}")


def validate_registration(body):
    """Return a normalised (username, password) pair or raise a readable ValueError."""
    if not isinstance(body, dict):
        raise ValueError("Enter a username and password.")
    username, password = body.get("username"), body.get("password")
    if not isinstance(username, str) or not USERNAME.fullmatch(username.strip().lower()):
        raise ValueError("Usernames are 3–30 characters: lowercase letters, numbers, - and _.")
    if not isinstance(password, str) or not 12 <= len(password) <= 1024:
        raise ValueError("Choose a password of at least 12 characters.")
    return username.strip().lower(), password


def estimated_1rm(weight, reps, rpe=None):
    """Epley estimate; one completed rep is the actual lifted load.

    Display estimates only for 1–10 reps with positive external load.
    Optional RPE adds estimated reps in reserve, capped at ten effective reps.
    """
    if not weight or not 1 <= reps <= 10:
        return None
    effective = min(10, reps + (10 - rpe if rpe is not None else 0))
    value = weight if effective == 1 else weight * (1 + effective / 30)
    return math.floor(value * 10 + 0.5) / 10


def best_1rm(sets):
    estimates = [
        estimated_1rm(s["weight"], s["reps"], s.get("rpe"))
        for s in sets
        if not s.get("skipped", False)
    ]
    return max((value for value in estimates if value is not None), default=None)


def exercise_stats(sessions, exercise_id):
    """Last performance and the estimated 1RM trend of one exercise, from any template."""
    ordered = sorted(sessions, key=lambda session: (session["day"], session["completedAt"]))
    last = None
    points = []
    for session in ordered:
        for exercise in session["exercises"]:
            if exercise["id"] != exercise_id:
                continue
            performed = [row for row in exercise["sets"] if not row.get("skipped", False)]
            if not performed:
                continue
            last = {"day": session["day"], "sets": performed}
            estimate = best_1rm(exercise["sets"])
            if estimate is not None:
                points.append({"day": session["day"], "estimate": estimate})
    estimates = [point["estimate"] for point in points]
    return {
        "last": last,
        "points": points,
        "best": max(estimates, default=None),
        "latest": estimates[-1] if estimates else None,
    }


def validate_template(body, catalogue):
    if not isinstance(body, dict):
        raise ValueError("A workout object is required.")
    name = body.get("name")
    if not isinstance(name, str) or not 1 <= len(name.strip()) <= 60:
        raise ValueError("Workout name must contain 1–60 characters.")
    entries = body.get("exercises")
    if not isinstance(entries, list) or not 1 <= len(entries) <= 20:
        raise ValueError("Choose between 1 and 20 exercises.")
    result, seen = [], set()
    for entry in entries:
        if (
            not isinstance(entry, dict)
            or not isinstance(entry.get("id"), str)
            or entry["id"] not in catalogue
        ):
            raise ValueError("Choose exercises from the exercise catalogue.")
        exercise_id = entry["id"]
        if exercise_id in seen:
            raise ValueError("Each exercise may appear only once in a workout.")
        seen.add(exercise_id)
        item = {"id": exercise_id, "name": catalogue[exercise_id]["name"]}
        if "targets" in entry:
            rows = entry["targets"]
            if not isinstance(rows, list) or not 1 <= len(rows) <= 20:
                raise ValueError("Choose between 1 and 20 sets.")
            targets = []
            for row in rows:
                if not isinstance(row, dict):
                    raise ValueError("Invalid set target.")
                rpe = number(row.get("rpe"), "Target RPE", 1, 10, optional=True)
                if rpe is not None and (rpe * 2) % 1:
                    raise ValueError("Use target RPE steps of 0.5.")
                targets.append(
                    {
                        "reps": number(row.get("reps"), "Target reps", 1, 100, integer=True),
                        "weight": number(
                            row.get("weight"), "Target weight", 0, 1000, optional=True
                        ),
                        "rpe": rpe,
                    }
                )
            item.update(sets=len(targets), targets=targets)
        else:
            item.update(
                sets=number(entry.get("sets"), "Sets", 1, 20, integer=True),
                targetReps=number(entry.get("targetReps"), "Target reps", 1, 100, integer=True),
                targetWeight=number(
                    entry.get("targetWeight"), "Target weight", 0, 1000, optional=True
                ),
            )
        result.append(item)
    return {"name": name.strip(), "exercises": result}


def validate_session(body, template):
    if not isinstance(body, dict):
        raise ValueError("A session object is required.")
    try:
        client_id = str(UUID(str(body.get("clientId"))))
    except (ValueError, TypeError, AttributeError):
        raise ValueError("A valid session ID is required.") from None
    try:
        day = date.fromisoformat(body.get("day", "")).isoformat()
    except (ValueError, TypeError):
        raise ValueError("A valid session date is required.") from None
    entries = body.get("exercises")
    if not isinstance(entries, list) or len(entries) != len(template["exercises"]):
        raise ValueError("Complete every exercise in the workout.")
    completed = []
    for actual, planned in zip(entries, template["exercises"], strict=True):
        if not isinstance(actual, dict) or actual.get("id") != planned["id"]:
            raise ValueError("Session exercises must match the selected workout.")
        rows = actual.get("sets")
        if not isinstance(rows, list) or not planned["sets"] <= len(rows) <= 20:
            raise ValueError(
                f"Keep all {planned['sets']} planned sets for {planned['name']}, with up to 20 total sets."
            )
        sets = []
        for row in rows:
            if not isinstance(row, dict):
                raise ValueError("Each set must contain weight and reps.")
            if "skipped" in row and not isinstance(row["skipped"], bool):
                raise ValueError("Skipped must be true or false.")
            if row.get("skipped", False):
                sets.append({"skipped": True})
                continue
            rpe = number(row.get("rpe"), "RPE", 1, 10, optional=True)
            if rpe is not None and (rpe * 2) % 1:
                raise ValueError("Use RPE steps of 0.5 (for example 7 or 7.5).")
            sets.append(
                {
                    "weight": number(row.get("weight"), "Weight", 0, 1000),
                    "reps": number(row.get("reps"), "Reps", 1, 100, integer=True),
                    "rpe": rpe,
                }
            )
        completed.append(
            {
                **planned,
                "plannedSets": planned["sets"],
                "sets": sets,
                "estimated1rm": best_1rm(sets),
            }
        )
    if not any(not row.get("skipped", False) for exercise in completed for row in exercise["sets"]):
        raise ValueError("Complete at least one set before saving, or discard this workout.")
    return {
        "clientId": client_id,
        "templateId": template["id"],
        "name": template["name"],
        "day": day,
        "exercises": completed,
    }


def validate_session_edit(body, saved):
    """Validate corrections against the saved snapshot, never the current template."""
    if not isinstance(body, dict):
        raise ValueError("A session object is required.")
    offset = number(body.get("timezoneOffset"), "Timezone offset", -840, 840, integer=True)
    local_today = (datetime.now(UTC) - timedelta(minutes=offset)).date()
    try:
        day = date.fromisoformat(body.get("day", ""))
    except (ValueError, TypeError):
        raise ValueError("A valid session date is required.") from None
    if day > local_today:
        raise ValueError("The workout date must be today or in the past.")
    entries = body.get("exercises")
    if not isinstance(entries, list) or len(entries) != len(saved["exercises"]):
        raise ValueError("Keep the original exercises and sets.")
    planned = []
    for actual, original in zip(entries, saved["exercises"], strict=True):
        if not isinstance(actual, dict) or actual.get("id") != original["id"]:
            raise ValueError("Keep the original exercises and sets.")
        rows = actual.get("sets")
        if not isinstance(rows, list) or len(rows) != len(original["sets"]):
            raise ValueError("Keep the original exercises and sets.")
        for row, previous in zip(rows, original["sets"], strict=True):
            if not isinstance(row, dict) or row.get("skipped", False) != previous.get(
                "skipped", False
            ):
                raise ValueError("Keep skipped sets unchanged when correcting a workout.")
        planned.append({**original, "sets": len(original["sets"])})
    corrected = validate_session(
        {**body, "clientId": saved["clientId"]},
        {"id": saved["templateId"], "name": saved["name"], "exercises": planned},
    )
    for exercise, original in zip(corrected["exercises"], saved["exercises"], strict=True):
        if "plannedSets" in original:
            exercise["plannedSets"] = original["plannedSets"]
        else:
            exercise.pop("plannedSets", None)
    return {**saved, **corrected}
