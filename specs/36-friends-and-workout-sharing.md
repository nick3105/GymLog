# Task 36 — Add friends and share completed workouts
Assignee: annalisa2912

## Why

Training partners want to connect on GymLog and compare individual workouts when they choose
to share them. Each person controls who sees each workout.

## What

Extends the signed-in flow (ACC-04) and the completed-workout views (REV-01, REV-02).

- Add a Friends section in Settings. Enter an exact GymLog username, matched using the same
  case-insensitive rules as sign-in. Show incoming and outgoing requests and accepted friends.
  Only the recipient can accept or decline a pending request. Either friend can end the
  friendship. Reject self-requests and keep at most one pending or accepted relationship per
  pair, including when both people send a request at the same time.
- On a completed workout in Review, add **Share workout**. Only the owner can share it.
  Select one accepted friend and confirm after seeing what will be shared. The workout appears in
  the friend's **Friends activity** feed. Show the newest shares first, with the sender's
  username, workout name and training date. Opening a card shows a read-only view of the
  exercises and completed sets (reps, load or duration as recorded).
- Each share grants one friend access to one saved workout. The owner can see who has access
  and revoke it individually. Show the current saved workout details on each read. Deleting
  the workout or ending the friendship ends access. Adding the friend again requires a new
  share. Repeated sends or shares must create only one active record.
- Apply authentication and CSRF protection using the existing API patterns. Store friendships
  and shares separately from coaching, keyed by immutable account and workout IDs. Add the
  migration through `storage.initialize`. On every shared-workout read, verify the signed-in
  recipient, the active friendship and the share. Return only the approved fields. Validate
  eligibility and write relationship or share changes atomically. Keep request handling in
  `app.py`, validation in `models.py` and SQLite queries in `storage.py`.

## Out of scope

Public links, public feeds, likes, comments, messaging, push notifications, photos and
sharing in bulk. The shared view contains only the fields listed above.

## Done when

- At 375 × 667, Alice sends Bob a request in Settings. Bob can decline it or accept it, and
  after acceptance both see each other in Friends. The flow fits the existing mobile
  navigation and the buttons are at least 44 × 44 px. Settings and Review work without
  horizontal scrolling, and rejected requests show a clear message by the form.
- Before Alice chooses to share, Bob's Friends activity feed is empty. Alice shares her completed
  “Upper body” workout with Bob. Bob sees it at the top of his feed and can open it to see
  Bench press, 3 sets of 8 at 40 kg.
  Bob sees no workout notes, body weight or other sessions, and Carol cannot open the share.
- Pending and unrelated accounts cannot receive a share. A third account cannot accept a
  request intended for someone else, and Bob cannot edit or re-share Alice's workout.
- Revoking the share, deleting the workout and ending the friendship each remove access from
  the feed and from an already-open workout link on the next request. Re-friending does not
  restore old shares.
- Tests cover the happy path, authorization, duplicate and cross-requests, revoked access
  and a migration from a populated database. The existing checks pass.
