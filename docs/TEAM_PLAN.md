# Four students, four weeks

Adjust the dates to your course deadline. Keep the existing starter running at the end of every week.

| Student | First responsibility | Small issue and acceptance criteria | Reviewer |
|---|---|---|---|
| A | Dashboard and styling | Improve spacing/contrast in theme/widgets; dashboard remains usable at 900×650 | B |
| B | Workout form | Add a visible Cancel button; closing discards unsaved inputs; validation still works | C |
| C | Data and summaries | Explain and extend date-boundary tests; goal still caps visually at 100% | D |
| D | History, docs and integration | Add a no-demo empty-state option agreed by team; write reproducible manual checklist | A |

`app.py` contains both dashboard and form code intentionally to keep the starter small. A and B should schedule edits to this file rather than making broad simultaneous rewrites. C mainly owns `models.py` and tests; D mainly owns documentation. Rotate reviewers and demo presenters weekly.

| Week | Goal | Definition of done |
|---|---|---|
| 1 | Run and understand | All four run locally; create shared repo and issues; each explains a module; agree MVP |
| 2 | Complete small assigned improvements | Individual branches and reviewed PRs; log→history→summary flow works |
| 3 | Integrate and test | Test invalid inputs, Monday/Sunday boundaries, resizing, scrolling and reset behaviour; fix bugs |
| 4 | Polish and present | README works on a fresh clone; demonstrate the MVP and limits; freeze new features |

## Demo script

Show the sample dashboard, enter an invalid duration, correct it, save a workout, then show updated history and weekly counts. Close and reopen to explain the memory-only limitation. Each student explains their change and one review they performed.

## MVP completion checklist

- Fresh setup follows README without guessing paths.
- Valid entries appear once; bad input never changes totals.
- Weekly count and time match Monday–today history.
- Form, scroll and minimum window size are usable.
- No misleading save/persistence claims.
- All students have reviewed and can explain their contributions.
