# GymLog — Business Requirements Document

**Version 1.0 · Current functionality baseline**

## Purpose

GymLog lets users plan strength workouts, record their sets, review performance, and track body weight. Each user has a private journal they can access from a phone or computer. The app runs in a browser and uses English throughout.

## 1. Accounts and navigation

| ID | Function | Requirement |
|---|---|---|
| ACC-01 | **Create Account** | Let anyone create an account with a unique username (3–30 lowercase letters, numbers, `-` or `_`; case-insensitive) and a password of at least 12 characters. Signing up signs the user in. |
| ACC-02 | **Keep Existing Accounts** | Users from the earlier profile version keep their journal and password; their username is their former profile name (`nick`, `martin`, `anna-lisa`, `gaia`). |
| ACC-03 | **Protect Sign-in** | Store passwords only as hashes. After 10 failed sign-ins from one address, block further attempts for 15 minutes. |
| ACC-04 | **Sign In** | Let users sign in with their username and password. |
| ACC-05 | **Sign Out** | End the current sign-in and return to the sign-in screen. Warn before discarding unfinished work. |
| NAV-01 | **View Home** | Provide four starting points: **Start workout**, **Create workout**, **Review workouts**, and **Weight Tracker**. |
| NAV-02 | **Navigate from Sidebar** | Make Home and all four main functions accessible from the sidebar. |
| NAV-03 | **Refresh Journal** | Reload the signed-in user's saved data without interrupting an active workout. |

## 2. Workout planning

| ID | Function | Requirement |
|---|---|---|
| PLN-01 | **Add Workout** | Create and name a reusable workout template. |
| PLN-02 | **Select Exercise** | Choose an exercise from the catalogue. Added exercises remain available in the dropdown. |
| PLN-03 | **Add Exercise in Workout** | Add a selected exercise as a block with three initial set rows. Adding the same exercise again adds a set to its existing block. |
| PLN-04 | **Remove Exercise from Workout** | Remove an exercise and its planned sets from the unsaved template. |
| PLN-05 | **Add Set** | Add an individually configurable row to an exercise. |
| PLN-06 | **Remove Set** | Remove an individual set while keeping at least one set per exercise. |
| PLN-07 | **Set Target Reps** | Enter a required whole-number rep target for each set. |
| PLN-08 | **Set Target Weight** | Enter an optional target weight in kg for each set. |
| PLN-09 | **Set Target RPE** | Enter an optional target RPE for each set. RPE accepts values from 1 to 10 in increments of 0.5. |
| PLN-10 | **Save Workout Template** | Save the exercises and individual set targets so the workout can be selected and repeated later. Support up to 20 exercises per template and 20 sets per exercise. Existing templates with one target per exercise must remain usable. |
| PLN-11 | **Cancel Workout Creation** | Leave the builder without saving. Ask before discarding entered information. |
| PLN-13 | **Edit Saved Workout** | Edit a saved template’s name, exercises and set targets from Start workout. Save to the same template; completed sessions stay unchanged. Confirm before discarding edits and preserve inputs after a failed save. |
| PLN-12 | **Maintain Exercise Catalogue** | Let maintainers add or update exercises in `exercises.json`. Stable exercise IDs connect past results; catalogue changes must not rewrite saved workouts. |

**Example:** A user plans a bench press top set of **3 reps at 100 kg, RPE 9**, followed by a back-off set of **8 reps at 80 kg** with Target RPE left blank.

## 3. Workout execution

| ID | Function | Requirement |
|---|---|---|
| RUN-01 | **View Saved Workouts** | List saved templates with their exercises and set counts. |
| RUN-02 | **Start Workout** | Start a session from a saved template. Show each exercise in its own block and each planned set in its own row. |
| RUN-03 | **View Set Targets** | Show each set's planned values as placeholders. The user still enters the actual results. |
| RUN-04 | **View Last Performance** | Show the most recent completed results above each exercise, even if they came from a different template. Indicate when no previous results exist. |
| RUN-05 | **Log Actual Weight** | Enter actual weight in kg for each set. Accept 0 kg for a bodyweight-only set. |
| RUN-06 | **Log Actual Reps** | Enter the actual whole-number rep count for each set. |
| RUN-07 | **Log Actual RPE** | Optionally enter the RPE experienced for each set, independently of Target RPE. |
| RUN-08 | **View Live Estimated 1RM** | Update the best eligible estimated 1RM for an exercise as actual set results are entered. |
| RUN-09 | **Finish and Save Workout** | Require actual weight and reps for every planned set. Save the completed session separately from its template and confirm success. Keep inputs available for retry if saving fails and prevent duplicate session records on retry. |
| RUN-10 | **Discard Active Workout** | Let the user abandon an unsaved session after confirming. |

## 4. Review and progress

| ID | Function | Requirement |
|---|---|---|
| REV-01 | **View Workout History** | List completed sessions with their dates, workout names, and exercise and set counts. |
| REV-02 | **Review Workout Details** | Open a completed session to see actual weight, reps, optional RPE, and estimated 1RM by exercise. |
| REV-03 | **Open Exercise Progress** | Open an exercise's progress dashboard by selecting its name in the template builder, an active session, or a completed session. |
| REV-04 | **View Best Estimated 1RM** | Show the highest eligible estimated 1RM for the exercise across completed sessions. |
| REV-05 | **View Latest Estimated 1RM** | Show the latest eligible estimate for the exercise. |
| REV-06 | **View Estimated 1RM Trend** | Plot eligible estimates over time in a line chart. Identify the exercise and units, and show an empty state when no estimates exist. |
| REV-07 | **Return to Workout** | Close the dashboard and return to the same builder, session, or review view. Preserve any unsaved inputs. |

**Estimated 1RM rule:** Use actual sets of 1–10 reps with positive weight. Without actual RPE, use the completed reps. With actual RPE, add estimated reps in reserve (`10 − RPE`) and cap the effective rep count at 10. Apply Epley (`weight × (1 + effective reps / 30)`); for one effective rep, use the actual weight. The exercise estimate is the highest eligible set estimate. Target RPE does not affect the calculation.

## 5. Weight Tracker

| ID | Function | Requirement |
|---|---|---|
| WGT-01 | **Select Measurement Date** | Choose the date for a body weight measurement. |
| WGT-02 | **Save Body Weight** | Save the entered weight in kg against the selected date. |
| WGT-03 | **Update Daily Measurement** | Keep one measurement per date per user. Saving another weight for the same date replaces the previous value. |
| WGT-04 | **View Latest Body Weight** | Display the most recent measurement and its date. |
| WGT-05 | **View Body Weight Trend** | Display saved measurements in a line chart ordered by date. |
| WGT-06 | **View Measurement History** | Expand a list of saved dates and weights. |
| WGT-07 | **Set a Weight-Loss Goal** | Let a signed-in user save one private goal weight in kg, show the latest weight and remaining kg to lose, and keep the goal available across devices. |

## 6. Data and scope requirements

- **Private journals:** Users can access only their own templates, completed sessions, and body weight records. Hosting credentials and personal records must stay out of the public repository.
- **Cross-device access:** Saved records are available after signing in to the same account on another device.
- **Draft behavior:** Unsaved edits remain available during the current flow, including when opening exercise progress. They are not synchronized across devices or guaranteed to survive a page reload.
- **Current boundaries:** Correcting or deleting completed sessions, offline use, and data export are outside this baseline. Catalogue maintenance is a repository task; it is not an in-app exercise editor.
- **Release acceptance:** Verify account isolation, top and back-off set planning, workout logging without RPE, progress navigation without losing inputs, and same-date weight updates.
