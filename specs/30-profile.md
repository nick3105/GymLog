# Task 30 — Your profile and training statistics
Assignee: Martin Zvelebil

## Why
GymLog keeps months of training but never sums it up. A lifter wants to see, in one place, how
much they have done, how consistent they are, what their records are and how long they train,
and to have a level to work towards.

## What
Covers REV-11 and RUN-11 (new). Branch `feature/profile`.

### Recording workout duration (RUN-11)
- Starting a workout saves `startedAt`, the phone's current time in UTC ISO format
  (`"2026-11-16T17:02:11.123Z"`), in the draft. It survives a reload with the rest of the draft.
- Finishing sends `startedAt`. The API stores it if it is a valid date and time with a time
  zone; otherwise: "The workout start time is not valid." Drafts started before this change
  have no `startedAt` and save as before.
- **Duration** = `completedAt` − `startedAt`. It is computed, never stored. Only durations from
  1 minute to 4 hours count. A shorter one is a test, and a longer one is a workout left open,
  e.g. overnight. Older workouts have no duration.
- Correcting a completed workout (REV-08) keeps its `startedAt`.

### The profile (REV-11)
`GET /api/profile?today=2026-11-16`, signed in only. Every number is calculated in
`models.profile_stats(sessions, weights, catalogue, today)` from the user's own data.
"Performed set" means a set that was not skipped. Weeks run Monday to Sunday, by session `day`.

**Header:** a circle with the username's first letter (gradient), the username, and the level.
- **Level** by completed workouts: Bronze 0–9, Silver 10–49, Gold 50–149, Platinum 150+.
  Under the badge: "7 workouts to Silver". At Platinum: "Top level".

**Overview:** workouts, performed sets, total reps, **total lifted** (Σ weight × reps, in kg;
from 10,000 kg it shows tonnes, "12.4 t"), time held (Σ seconds of timed sets), different
exercises trained.

**Consistency**
- Current streak: weeks in a row with at least one workout, ending this week. If this week has
  no workout yet, the count ends last week, so a streak doesn't break on Monday morning.
- Longest streak in weeks.
- Workouts this week, and in this calendar month.
- Workouts per week on average: workouts ÷ weeks from the first workout's week to this week,
  one decimal.
- Training days in the last 30 days (`today` and the 29 days before).

**Duration** (only workouts with a counted duration; the section says "Recorded from
16 Nov 2026" and "No timed workouts yet" until there is one):
- average workout, total time trained, longest workout. Shown as "1 h 05 min" or "48 min".
  Under them: "Recorded from 16 Nov 2026. Older workouts have no duration."

**Averages:** sets per workout, weight per set (only sets with weight above 0 kg), RPE (only
sets with RPE). Each is "–" when there is nothing to average.

**Records**
- Heaviest set: weight, reps, exercise name and day (most weight; ties → more reps, then the
  earlier day).
- Best estimated 1RM: exercise, kg and day, using `estimated_1rm` (BRD 1RM rule).
- Biggest workout: the session with the most kg lifted, its name and day.
- Most reps in one set: reps, exercise, day.

**Favourites:** most trained exercise (performed sets), favourite workout (most completed
template name), top muscle group (performed sets, catalogue group).

**Body weight:** latest, and change since the first measurement ("−2.9 kg since 17 Oct 2026").

Every "favourite" or "record" is "–" without data. A new user sees the header with Bronze,
"10 workouts to Silver", zeros in the overview, and "–" everywhere else.

### Screen
- `/profile`, title "Your profile". Sections are cards in the order above. Each number is big
  `font-mono`, with an uppercase label above it, two per row at 375 px.
- Reached by tapping the username in the top bar, now a link of at least 44 × 44 px, and from
  a desktop sidebar entry "Profile". The phone bottom bar stays as spec 29 fixed it.

## Out of scope
A rating score, uploading a photo, sharing or comparing with others, editing the username,
pausing the duration timer, adding duration to old workouts, charts on the profile, coachee
profiles.

## Done when
`uv run pytest tests/test_profile.py` is green with at least:
- **New user:** 0 workouts, Bronze, `toNextLevel` 10, every record `null`.
- **Levels:** 9 → Bronze, 10 → Silver, 50 → Gold, 150 → Platinum (on `models` directly).
- **Totals:** bench 100 × 5 twice + one skipped set, Plank 60 s, push-up 0 × 20 →
  4 performed sets, 30 reps, 1,000 kg, 60 s, 3 exercises. Average weight per set 100 kg.
- **Streaks:** workouts in the weeks of 26 Oct, 2 Nov and 9 Nov, none yet in the week of
  16 Nov, `today` 2026-11-16 (Monday) → current 3, longest 3. Adding 19 Oct and 5 Oct
  (gap on 12 Oct) → current 4, longest 4 (19 Oct – 9 Nov); 5 Oct stays a streak of 1.
- **Duration:** 45 min and 30 s and 5 h workouts → only 45 min counts. `startedAt` survives
  saving, a retried save, and a correction. `"startedAt": "yesterday"` → 400 with the sentence.
- **Records** for heaviest set, best 1RM, biggest workout and most reps, with ties as above.
- **Privacy:** a second user's sessions and weights never change the numbers.
- `today` missing or invalid → 400; signed out → 401.

`npm test` covers the duration and tonnes formatting and the UTC format of `startTime()`, which
Start workout puts in the draft.

At 375 × 667 with demo data plus one timed workout: tap the username → profile, every card
fits without horizontal scrolling, numbers are readable at arm's length.

Commit as `Feature: profile and training statistics`.
