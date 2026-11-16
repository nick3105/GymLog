"""Validation and calculations, independent of Flask and SQLite."""

import hashlib
import json
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


PERSONAL_GROUPS = {
    "Chest",
    "Shoulders",
    "Triceps",
    "Back",
    "Biceps",
    "Forearms",
    "Quads",
    "Hamstrings & glutes",
    "Calves",
    "Core",
}


def validate_personal_exercise(body):
    """Validate an owner-private exercise without accepting visibility or muscle metadata."""
    if not isinstance(body, dict):
        raise ValueError("Enter a personal exercise.")
    if set(body) - {"requestId", "name", "group", "measurement"}:
        raise ValueError("Personal exercises accept only a name, group and measurement.")
    name = body.get("name")
    if not isinstance(name, str) or not 1 <= len(name.strip()) <= 80:
        raise ValueError("Exercise name must contain 1–80 characters.")
    group = body.get("group")
    if not isinstance(group, str) or group not in PERSONAL_GROUPS:
        raise ValueError("Choose a muscle group from the exercise catalogue.")
    measurement = body.get("measurement", "repetitions")
    if measurement not in ("repetitions", "duration"):
        raise ValueError("Choose repetitions or seconds.")
    try:
        request_id = str(UUID(str(body.get("requestId"))))
    except (ValueError, TypeError, AttributeError):
        raise ValueError("A valid creation request ID is required.") from None
    return {
        "requestId": request_id,
        "name": name.strip(),
        "group": group,
        "measurement": measurement,
    }


def note(value, maximum, label):
    """Validate optional plain-text notes using Unicode code-point limits."""
    if not isinstance(value, str) or len(value) > maximum:
        raise ValueError(f"{label} must be text with at most {maximum} characters.")
    return value


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
        if not s.get("skipped", False) and "durationSeconds" not in s
    ]
    return max((value for value in estimates if value is not None), default=None)


def exercise_stats(sessions, exercise_id, include_average_weight=False):
    """Last performance and the estimated 1RM trend of one exercise, from any template."""
    ordered = sorted(sessions, key=lambda session: (session["day"], session["completedAt"]))
    last = None
    points = []
    weight_points = []
    for session in ordered:
        for exercise in session["exercises"]:
            if exercise["id"] != exercise_id:
                continue
            performed = [row for row in exercise["sets"] if not row.get("skipped", False)]
            if not performed:
                continue
            last = {"day": session["day"], "sets": performed}
            if include_average_weight:
                weights = [row["weight"] for row in performed if "durationSeconds" not in row]
                if weights:
                    average = math.floor(sum(weights) / len(weights) * 10 + 0.5) / 10
                    weight_points.append({"day": session["day"], "weight": average})
            estimate = best_1rm(exercise["sets"])
            if estimate is not None:
                points.append({"day": session["day"], "estimate": estimate})
    estimates = [point["estimate"] for point in points]
    result = {
        "last": last,
        "points": points,
        "best": max(estimates, default=None),
        "latest": estimates[-1] if estimates else None,
    }
    if include_average_weight:
        averages = [point["weight"] for point in weight_points]
        result["averageWeight"] = {
            "points": weight_points,
            "best": max(averages, default=None),
            "latest": averages[-1] if averages else None,
        }
    return result


def validate_instructions(body, source=None, completed=False):
    """Normalize reminder text and optional completion flags without creating set records."""
    source = source or {}
    result = {}
    for field in ("warmup", "cooldown"):
        value = body.get(field, source.get(field, ""))
        if not isinstance(value, str) or len(value) > 100:
            raise ValueError(f"{field.capitalize()} must contain at most 100 characters.")
        value = value.strip()
        if value or (not completed and field in body):
            result[field] = value
        if completed:
            done = body.get(f"{field}Done", source.get(f"{field}Done", False))
            if not isinstance(done, bool):
                raise ValueError(f"{field.capitalize()} Done must be true or false.")
            if value:
                result[f"{field}Done"] = done
    return result


def validate_supersets(exercises):
    """Require each superset to contain exactly two adjacent exercises."""
    groups = {}
    for position, exercise in enumerate(exercises):
        group = exercise.get("supersetId")
        if group is None or group == "":
            continue
        if not isinstance(group, str) or not re.fullmatch(r"[a-zA-Z0-9_-]{1,60}", group):
            raise ValueError("A superset ID must contain 1–60 letters, numbers, - or _.")
        groups.setdefault(group, []).append(position)
    for positions in groups.values():
        if len(positions) != 2 or positions[1] != positions[0] + 1:
            raise ValueError("A superset must contain exactly two adjacent exercises.")


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
        if "note" in entry:
            item["note"] = note(entry["note"], 500, "Exercise note")
        if catalogue[exercise_id].get("source") == "personal":
            item.update(source="personal", volumeEligible=False)
        if entry.get("supersetId") is not None and entry.get("supersetId") != "":
            item["supersetId"] = entry["supersetId"]

        timed = catalogue[exercise_id].get("measurement") == "duration"
        if timed:
            item["measurement"] = "duration"
            if "targets" not in entry:
                raise ValueError("Enter a duration target for every timed set.")
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
                if timed:
                    targets.append(
                        {
                            "durationSeconds": number(
                                row.get("durationSeconds"), "Target seconds", 1, 86400, integer=True
                            ),
                            "rpe": rpe,
                        }
                    )
                    continue
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
    document = {"name": name.strip(), "exercises": result}
    if "note" in body:
        document["note"] = note(body["note"], 1000, "Workout note")
    validate_supersets(result)
    document.update(validate_instructions(body))
    return document


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
        if "supersetId" in actual and actual["supersetId"] != planned.get("supersetId"):
            raise ValueError("Session superset groups must match the selected workout.")
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
            if planned.get("measurement") == "duration":
                sets.append(
                    {
                        "durationSeconds": number(
                            row.get("durationSeconds"), "Seconds", 1, 86400, integer=True
                        ),
                        "rpe": rpe,
                    }
                )
                continue
            sets.append(
                {
                    "weight": number(row.get("weight"), "Weight", 0, 1000),
                    "reps": number(row.get("reps"), "Reps", 1, 100, integer=True),
                    "rpe": rpe,
                }
            )
        snapshot = dict(planned)
        if "note" in actual or "note" in planned:
            snapshot["note"] = note(
                actual.get("note", planned.get("note", "")), 500, "Exercise note"
            )
        completed.append(
            {
                **snapshot,
                "plannedSets": planned["sets"],
                "sets": sets,
                "estimated1rm": best_1rm(sets),
            }
        )
    if not any(not row.get("skipped", False) for exercise in completed for row in exercise["sets"]):
        raise ValueError("Complete at least one set before saving, or discard this workout.")
    document = {
        "clientId": client_id,
        "templateId": template["id"],
        "name": template["name"],
        "day": day,
        "exercises": completed,
        **validate_instructions(body, template, completed=True),
    }
    if "note" in body or "note" in template:
        document["note"] = note(body.get("note", template.get("note", "")), 1000, "Workout note")
    return document


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
        {
            **body,
            "clientId": saved["clientId"],
            "warmup": saved.get("warmup", ""),
            "cooldown": saved.get("cooldown", ""),
            "warmupDone": body.get("warmupDone", saved.get("warmupDone", False)),
            "cooldownDone": body.get("cooldownDone", saved.get("cooldownDone", False)),
        },
        {**saved, "id": saved["templateId"], "exercises": planned},
    )
    for exercise, original in zip(corrected["exercises"], saved["exercises"], strict=True):
        if "plannedSets" in original:
            exercise["plannedSets"] = original["plannedSets"]
        else:
            exercise.pop("plannedSets", None)
    return {**saved, **corrected}


def validate_volume_preferences(body, muscles):
    """Validate editable goals and optional evidence context without prescribing volume."""
    if not isinstance(body, dict) or not isinstance(body.get("goals", {}), dict):
        raise ValueError("Enter muscle goals as an object.")
    goals = {}
    for muscle, value in body.get("goals", {}).items():
        if muscle not in muscles:
            raise ValueError("Choose a muscle from the volume list.")
        goals[muscle] = number(value, "Weekly set goal", 0, 1000)
    profile = body.get("profile", {})
    if not isinstance(profile, dict):
        raise ValueError("Enter your profile as an object.")
    choices = {
        "ageBand": ("", "under18", "18-39", "40-64", "65+"),
        "experience": ("", "under1", "1-3", "3+"),
        "gender": ("", "woman", "man", "nonbinary", "self-described", "prefer-not-to-say"),
    }
    result = {}
    for field, options in choices.items():
        value = profile.get(field, "")
        if value not in options:
            raise ValueError("Choose one of the listed profile options.")
        result[field] = value
    return {"goals": goals, "profile": result}


def weekly_volume(sessions, week, registry, preferences, allow_draft=False):
    """Count reviewed or explicitly enabled local-preview set credits for one calendar week."""
    try:
        start = date.fromisoformat(week)
    except (ValueError, TypeError):
        raise ValueError("Choose a valid week date.") from None
    start -= timedelta(days=start.weekday())
    try:
        end = start + timedelta(days=6)
    except OverflowError:
        raise ValueError("Choose a week within the supported date range.") from None
    profiles = {row["exerciseId"]: row for row in registry["exercises"]}
    starting_goal = 10
    muscles = {
        muscle["id"]: {
            "muscle": muscle["id"],
            "direct": 0.0,
            "indirect": 0.0,
            "total": 0.0,
            "goal": preferences.get("goals", {}).get(muscle["id"], starting_goal),
            "goalSource": "saved" if muscle["id"] in preferences.get("goals", {}) else "starter",
            "exercises": [],
        }
        for muscle in registry["taxonomy"]
    }
    excluded = {}
    counted_sets = 0
    for session in sessions:
        day = date.fromisoformat(session["day"])
        if not start <= day <= end:
            continue
        for exercise in session["exercises"]:
            performed = [row for row in exercise["sets"] if not row.get("skipped", False)]
            if not performed:
                continue
            profile = profiles.get(exercise["id"])
            reason = None
            if exercise.get("source") == "personal" or exercise["id"].startswith("custom-"):
                reason = "Personal exercise"
            elif exercise.get("measurement") == "duration":
                reason = "Timed holds"
            elif profile is None:
                reason = "No muscle mapping"
            elif not profile.get("coefficients"):
                reason = "Mapping needs review"
            elif not profile.get("eligibleForProductionCounting", False) and not allow_draft:
                reason = "Draft mapping disabled"
            if reason is not None:
                excluded[reason] = excluded.get(reason, 0) + len(performed)
                continue
            count = sum("durationSeconds" not in row for row in performed)
            timed_count = len(performed) - count
            if timed_count:
                excluded["Timed holds"] = excluded.get("Timed holds", 0) + timed_count
            counted_sets += count
            for muscle, coefficient in profile["coefficients"].items():
                if coefficient <= 0 or not count:
                    continue
                contribution = count * coefficient
                kind = "direct" if muscle in profile["directMuscles"] else "indirect"
                muscles[muscle][kind] += contribution
                muscles[muscle]["total"] += contribution
                muscles[muscle]["exercises"].append(
                    {
                        "id": exercise["id"],
                        "name": exercise["name"],
                        "day": session["day"],
                        "sets": count,
                        "coefficient": coefficient,
                        "contribution": contribution,
                    }
                )
    return {
        "weekStart": start.isoformat(),
        "weekEnd": end.isoformat(),
        "muscles": list(muscles.values()),
        "excluded": excluded,
        "countedSets": counted_sets,
        "draftPreview": allow_draft,
        "startingGoal": starting_goal,
        "mappingVersion": hashlib.sha256(
            json.dumps(registry, sort_keys=True).encode("utf-8")
        ).hexdigest(),
        "profile": preferences.get("profile", {}),
        "goals": preferences.get("goals", {}),
        "revision": preferences.get("revision", 0),
    }


def validate_coach_request(body):
    """Require explicit sharing consent and a normalized existing username lookup."""
    if not isinstance(body, dict) or body.get("consent") is not True:
        raise ValueError("Confirm that you want to share saved workouts and notes with this coach.")
    username = body.get("username")
    if not isinstance(username, str) or not USERNAME.fullmatch(username.strip().lower()):
        raise ValueError("Enter the coach's username.")
    return username.strip().lower()


def validate_new_coaching(coachee_id, coach_id, existing):
    """Permit one current coach request per coachee and safe retries of the same request."""
    if coachee_id == coach_id:
        raise ValueError("Choose another person as your coach.")
    if existing and existing["coach_id"] != coach_id:
        raise ValueError(
            "End your current coach relationship or request before assigning another coach."
        )


def validate_coaching_transition(relationship, actor_id, action):
    """Return an authorized relationship state without reviving cancelled requests."""
    state = relationship["state"]
    if action in ("accept", "decline"):
        if relationship["coach_id"] != actor_id:
            raise ValueError("Only the requested coach can accept or decline this request.")
        target = "accepted" if action == "accept" else "declined"
        if state not in ("pending", target):
            raise ValueError("This coaching request is no longer pending.")
        return target
    if action == "cancel":
        if relationship["coachee_id"] != actor_id or state not in ("pending", "cancelled"):
            raise ValueError("Only the coachee can cancel a pending request.")
        return "cancelled"
    if action == "revoke":
        if actor_id not in (relationship["coachee_id"], relationship["coach_id"]):
            raise ValueError("This coaching relationship is not yours.")
        if state not in ("accepted", "revoked"):
            raise ValueError("Only an accepted coaching relationship can be ended.")
        return "revoked"
    raise ValueError("Choose accept, decline, cancel or revoke.")
