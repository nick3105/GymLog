# Task 18 — Remind users to log today's body weight

Assignee: annalisa2912

## Why

People may forget to record their body weight. A small reminder when they open GymLog can bring
them to the Weight Tracker without interrupting their workout or requiring device notifications.

## What

- When a signed-in user opens GymLog, show a non-blocking reminder if they have not saved a body
  weight measurement for today's date in their local timezone.
- Include a clear action that opens the Weight Tracker.
- Let the user dismiss the reminder for the current app visit. It may appear again the next time
  they open GymLog if today's measurement is still missing.
- Hide the reminder as soon as a measurement for today is saved during the current visit.
- Do not show the reminder when a measurement for today's local date already exists.
- Use the existing journal data; do not add a server-side notification schedule or store reminder
  preferences.

## Out of scope

- Push notifications, browser notification permission, service workers, or scheduled delivery.
- A configurable reminder time, recurring schedule, or reminder settings screen.
- Reminders to change or reach a weight goal.

## Done when

- With no measurement for today's local date, signing in shows one dismissible reminder and a
  **Log today's weight** action that opens the Weight Tracker.
- Dismissing the reminder hides it while navigating around the app; reopening the app shows it
  again if no measurement has been saved for today.
- Saving a measurement for today hides the reminder immediately, without reloading the page.
- A measurement from yesterday or a future date does not count as today's entry.
- With a measurement for today's local date already saved, no reminder appears after sign-in or
  app reload.
- Signed-out users do not see a personal weight-entry reminder.
- The reminder is accessible, easy to dismiss on a 375 × 667 phone screen, and does not block the
  page or cause horizontal scrolling.
- Check the reminder flow in a browser at 375 × 667 and on a real phone before merging.

Commit as `Feature: remind users to log today's weight`.
