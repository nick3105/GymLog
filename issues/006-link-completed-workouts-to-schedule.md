# Issue 006 — Link past scheduled workouts to Review

## Why

A calendar entry added for an already logged workout still offers **Start workout**.
For example, John Doe's Push workout was logged on 18 November 2026, and the dated
calendar entry added later does not carry the completed session's ID. Starting it
again could create a second history record for the same workout.

## What

- Open a dated calendar entry whose workout and date match an existing completed
  session. The signed-in owner can link the two records through the schedule API.
- Link 1–100 pairs in one revision-protected update. Require a dated entry with the
  same template and local date. Keep linking private to the account and allow each
  completed session to satisfy one calendar entry.
- Reuse **Completed** and **Review workout** for linked entries. Preserve the
  scheduled snapshot, the completed session's actual sets, and unrelated drafts.

## Out of scope

Automatic guesses about which workout matched, edits to historical workouts,
linking undated or in-progress entries, and changes to competition prep cards.

## Done when

- Both records stay owned by one account, a matching retry does not create a new
  session or bump the schedule revision, and a rejected pair leaves the whole batch
  unchanged.
- A linked entry cannot start. At 375 × 667 it shows **Completed** and opens the
  existing session through **Review workout**.
- Once the fix is deployed, use the API to match John's historical entries by
  their saved dates and templates. Verify that the week of 16 November shows
  three completed entries and that Review still has the original 84 records.

**BRD:** SCH-10, SCH-11, REV-01 and REV-02.
