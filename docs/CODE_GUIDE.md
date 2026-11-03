# How the code fits together

Read in this order: `main.py`, `models.py`, `widgets.py`, `app.py`.

1. `main.py` creates `GymLogApp`, then calls `mainloop()`. The loop waits for clicks and key presses; do not add a second event loop.
2. `Workout` is a frozen dataclass: a small record with a name, integer minutes and date. `create_workout()` trims the name and raises a readable `ValueError` for bad input. Keeping this outside the GUI makes it easy to test.
3. `weekly_workouts()` calculates Monday and selects entries from Monday through today. It excludes future dates and prior weeks, including across month/year boundaries.
4. `GymLogApp.__init__()` creates the sidebar and scrollable content area. `self.workouts` is the single list holding app data. `demo_workouts()` supplies clearly labelled example entries.
5. `refresh()` destroys and rebuilds only dashboard content from that list. This is easy to follow and sufficient for a small course demo. It would need a different approach for thousands of records. The sidebar remains intact.
6. `open_log()` opens one child window. Its nested `save()` callback reads entry text, calls validation, appends a valid record, closes the form and refreshes the view. Invalid input leaves the form open and displays an error. No disk writes occur.
7. `theme.py` names the colours; `widgets.py` shares the label helper and `StatCard`. Change one colour constant to update its uses across the app.

## Useful Python concepts

- `self` refers to the current app or widget object.
- `command=self.open_log` passes a function to run on a click. Adding parentheses here would run it immediately.
- `try/except` converts validation failures into form feedback.
- A list comprehension selects this week's records; `sum()` totals their minutes.
- `grid()` arranges dashboard sections; `pack()` arranges children inside each section. Do not use both managers for siblings in the same parent.
- Dates are real `date` objects, not formatted strings. Formatting happens only for display.

## Small, safe changes to practise

Change the accent colour, improve form labels, add a cancel button, or add an empty-history message for a future no-demo mode. Keep changes small enough that every teammate can explain them. If you use ChatGPT, review every suggestion, run it and explain it in your own words before merging.
