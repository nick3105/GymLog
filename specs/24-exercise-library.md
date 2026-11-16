# Task 24 — Exercise library and how-to guides
Assignee: Martin Zvelebil

## Why
In the middle of a workout, "how was a Romanian deadlift done again?" has no answer in GymLog.
Someone trying a new exercise from the 656 in the catalogue has only its name. The app should
show how each exercise is done, in the gym, with one tap from where you already are.

## What
Covers NAV-04 and REV-10 (new). Branch `feature/exercise-library`.

**Source.** [free-exercise-db](https://github.com/yuhonas/free-exercise-db), commit
`f00c92c`. It is public domain (the Unlicense), and our catalogue was built from it in spec 11.
For each exercise it has numbered instructions and two photos (start and end position).
The GIFs from `hasaneyldrm/exercises-dataset` were **not** used: their media belongs to Gym
visual, and that repository's licence says cloning it grants no right to use them.

**Imported once, on 16 November 2026** (like spec 11, no import script is kept; this is the record):
- A catalogue exercise gets the dataset exercise with the same name, ignoring capitals and
  punctuation (605 exercises with photos and steps).
- 38 of our hand-written exercises are matched by hand to the same movement, for example
  Bench press → `Barbell_Bench_Press_-_Medium_Grip`, Squat → `Barbell_Full_Squat`,
  Overhead press → `Standing_Military_Press`. The `source` field of each guide names it.
- Six have no fair equivalent and get no guide: Paused, Spoto and Larsen bench press,
  Cable lateral raise, Bulgarian split squat, One-leg hip thrust. Showing a different exercise
  would teach the wrong movement.
- Seven more get no guide because the dataset has no photos or no steps for them: Iron Cross,
  Push Press, One-Arm Kettlebell Swings, Side Jackknife, Kettlebell Halo, Kettlebell Halo with
  Overhead Extension, Kettlebell Overhead Triceps Extension.
- 643 of 656 exercises have a guide. Retired exercises get no guide.
- The photos are shrunk from 850 to 480 px wide (JPEG quality 70, macOS `sips`) so the 1,286
  photos take 46 MB instead of about 85 MB.

**Data**
- `backend/gymlog/exercise_guides.json`: `{"bench-press": {"source": "Barbell_Bench_Press_-_Medium_Grip", "steps": ["Lie back on a flat bench…", …]}, …}`.
- Photos: `frontend/public/exercise-images/<exercise id>/0.jpg` (start) and `1.jpg` (end). Vite
  copies them into the build and Flask serves them like any other built file. The security
  headers stay unchanged (`img-src 'self'`).

**API.** `GET /api/exercises/<id>/guide`, signed in only, returns
`{"steps": [...], "images": ["/exercise-images/bench-press/0.jpg", "/exercise-images/bench-press/1.jpg"]}`.
Both lists are empty when there is no guide. An ID not in the catalogue → 404 with a sentence.

**How to do it (REV-10).** The exercise sheet that opens from any exercise name (template
builder, active workout, review, body load, library) gets a **How to do it** section at the top,
above the progress:
- The two photos take turns every second, like a slow GIF, in a fixed 3:2 frame so nothing
  jumps. When the phone asks for reduced motion, both are shown side by side and nothing moves.
  Each photo has an alt text: "Bench press, start position" / "…, end position".
- The steps as a numbered list, at 16 px.
- A credit line: "Photos and steps: free-exercise-db (public domain)."
- No guide: "No guide yet for this exercise." The progress part is unchanged.
- The sheet's label changes from "Exercise progress" to "Exercise", with "Progress" as a label above
  the 1RM cards. As before, closing the sheet returns to the same screen and keeps every
  unsaved input (REV-07). This is the help during a workout.

**Library (NAV-04).** A new page, `/exercises`, titled "Exercises":
- The same search (`exerciseSearch.ts`) and muscle chips as the Create workout picker.
- With no search, every exercise is listed by group in catalogue order. Each row is at least
  48 px and shows the name and the group. Tapping it opens the exercise sheet.
- It is opened from a fifth Home card ("Exercise library — How every exercise is done.") and
  from the desktop sidebar. The phone bottom bar keeps its five buttons.

## Out of scope
Videos or real GIFs, more languages, equipment filters, adding or editing exercises in the
app, guides for the six exercises above, offline caching of photos.

## Done when
`uv run pytest tests/test_exercise_guides.py` is green and checks:
- Every guide belongs to a catalogue exercise that is not retired, has at least one step, and
  has both photos on disk.
- At least 640 exercises have a guide. The six above have none.
- `/api/exercises/bench-press/guide` returns steps and the two image paths, and the first
  image path is served by the built app.
- `/api/exercises/spoto-bench-press/guide` returns empty lists, `/api/exercises/not-real/guide`
  → 404, and signed out → 401.

`npm test` covers the alt texts and the library's grouping of exercises.

At 375 × 667: start a workout, type a weight, tap the exercise name. The photos alternate and
the steps are readable. Back returns to the workout with the weight still there. On Home, the
Exercise library card opens `/exercises`, typing `rdl` finds Romanian deadlift, and tapping it
opens its guide. No horizontal scrolling. Every tap target is at least 44 px.

Commit as `Feature: exercise library and how-to guides`.
