# Starter verification

Checked on Windows with Python 3.12.10 and CustomTkinter 5.2.2.

- Four model tests passed: valid records, invalid inputs, duration limits and week/year date boundaries.
- GUI smoke check passed: dashboard creation, single form window, invalid-input feedback, saving, visible history and totals refresh, progress cap, minimum-size resize and form reopening.
- Python source compilation passed.

The restricted verification environment reported that CustomTkinter could not load its preferred shape font and used its fallback renderer. No GUI exception occurred. Pixel-level appearance was not visually inspected. Try the manual README checks on each student's computer; macOS and Linux were not run here.

No database, backend or external service is used. Runtime data is intentionally temporary.
