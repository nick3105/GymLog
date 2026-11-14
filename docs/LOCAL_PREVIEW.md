# Full GymLog local preview

Open http://127.0.0.1:5052. The server is currently running.
If it has stopped, double-click Start-Preview.cmd and keep its console open.
The launcher uses the integrated source checkout in the Codex work folder.

## Demo accounts

All three use the password `local-preview-password`.

| Username | What to test |
| --- | --- |
| coachee-demo | Start the full-feature workout, create personal exercises, edit notes and inspect weekly volume |
| coach-demo | Open Settings and Coachees, create/edit plans for coachee-demo, review saved training and notes |
| family-demo | Has a pending request to coach-demo, allowing you to test Accept, Decline or Cancel |

The coachee-demo / coach-demo relationship is already accepted. Sign out and sign in as the
other account to test both sides. You can also register more disposable accounts.

## Suggested test route

1. Sign in as coachee-demo. Open Start > Full feature demo > Start.
2. Read/edit the workout and exercise notes. Mark Warmup done.
3. The Bench press / Barbell row pair is a superset. The Next button alternates their sets.
   Enter actual values, try Skip/Restore and add an extra set if useful.
4. Plank uses seconds. My sport balance drill is personal and explicitly excluded from volume.
5. Mark Cooldown done and Finish & save. Review the saved notes, grouped exercises and values.
6. Open Edit workout from Review to correct notes, duration values and reminder completion.
7. Open Review > Weekly volume. Change weeks, expand exercise breakdowns and edit/save goals.
   Custom exercises and timed holds appear under excluded coverage.
8. Open an exercise's progress and switch Estimated 1RM / Average weight. Actual RPE changes
   the existing e1RM estimate, while target RPE does not.
9. From Start, edit the saved plan. Change warmup/cooldown text, notes, targets or the superset.
   Use Unlink superset, the Link as superset selector, or the distinct drag pairing target.
   Plan changes affect future starts; completed history keeps its snapshot.
10. Open Create > Create personal exercise to add a repetition-based or timed movement.
11. Sign in as coach-demo. Settings shows accepted coachee-demo and pending family-demo.
    Accept the family request if you wish, then open Coachees.
12. Open coachee-demo, review their completed workouts/notes and create another plan for them.
    Sign back in as coachee-demo to see and start that plan.
13. End a relationship in Settings to test revocation. Previously created plans stay with the
    coachee, while the coach loses access on the next request.

## What is provisional

Weekly volume uses a local-only opt-in to the draft anatomy mappings. Coefficients are
accounting estimates, not measured muscle-growth ratios. Goals are editable values you choose;
the app does not claim an exact individual optimum from age, gender or training experience.
Six unresolved mappings remain excluded. Coach-proposed volume goals are a later extension.

This is a local development preview using synthetic data. Nothing has been pushed, merged
or deployed to the live website. Real-phone verification and Linux deployment CI remain
necessary before release. Browser screenshot capture is currently unavailable.

## Checks completed

The combined API, privacy, notes, supersets, duration, volume and upgrade suites have 78 passing
tests. Frontend has 31 passing tests. TypeScript, oxlint, Ruff and production build pass.
The full backend collection is blocked on Windows by the deployment module's Linux fcntl import.
