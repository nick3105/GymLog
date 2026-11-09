"""Validation and calculations, independent of Flask and SQLite."""
from datetime import date
import math
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
    estimates = [estimated_1rm(s["weight"], s["reps"], s.get("rpe")) for s in sets]
    return max((value for value in estimates if value is not None), default=None)


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
        if not isinstance(entry, dict) or not isinstance(entry.get("id"), str) or entry["id"] not in catalogue:
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
                targets.append({"reps": number(row.get("reps"), "Target reps", 1, 100, integer=True),
                                "weight": number(row.get("weight"), "Target weight", 0, 1000, optional=True),
                                "rpe": rpe})
            item.update(sets=len(targets), targets=targets)
        else:
            item.update(sets=number(entry.get("sets"), "Sets", 1, 20, integer=True),
                        targetReps=number(entry.get("targetReps"), "Target reps", 1, 100, integer=True),
                        targetWeight=number(entry.get("targetWeight"), "Target weight", 0, 1000, optional=True))
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
    for actual, planned in zip(entries, template["exercises"]):
        if not isinstance(actual, dict) or actual.get("id") != planned["id"]:
            raise ValueError("Session exercises must match the selected workout.")
        rows = actual.get("sets")
        if not isinstance(rows, list) or len(rows) != planned["sets"]:
            raise ValueError(f"Complete all {planned['sets']} sets for {planned['name']}.")
        sets = []
        for row in rows:
            if not isinstance(row, dict):
                raise ValueError("Each set must contain weight and reps.")
            rpe = number(row.get("rpe"), "RPE", 1, 10, optional=True)
            if rpe is not None and (rpe * 2) % 1:
                raise ValueError("Use RPE steps of 0.5 (for example 7 or 7.5).")
            sets.append({
                "weight": number(row.get("weight"), "Weight", 0, 1000),
                "reps": number(row.get("reps"), "Reps", 1, 100, integer=True),
                "rpe": rpe,
            })
        completed.append({**planned, "plannedSets": planned["sets"], "sets": sets, "estimated1rm": best_1rm(sets)})
    return {"clientId": client_id, "templateId": template["id"], "name": template["name"], "day": day, "exercises": completed}
