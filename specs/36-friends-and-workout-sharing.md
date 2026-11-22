# Task 36 — Add friends and share completed workouts
Assignee: annalisa2912

## Why

Training partners want to connect on GymLog and compare individual workouts when they choose
to share them. Each person controls who sees each workout.

## What

Extends the signed-in flow (ACC-04) and the completed-workout views (REV-01, REV-02).

- Add a Friends page between Exercises and Profile in the desktop sidebar. On phones, link
  to Friends from Home. Show the accepted-friend count above pending requests. Expand the
  count to view or remove friends. Enter an exact GymLog username, matched using the same
  case-insensitive rules as sign-in. Show incoming and outgoing requests and accepted friends.
  Only the recipient can accept or decline a pending request. Either friend can end the
  friendship. Reject self-requests and keep at most one pending or accepted relationship per
  pair, including when both people send a request at the same time.
- On Home, show a notice with the number of incoming pending requests and a link to Friends.
  Refresh on entry, when the tab becomes visible and every 30 seconds while Home is visible. Hide the notice after the last incoming request is accepted or declined.
- On Home, group unseen workout shares in one notice. For one share, show the sender and
  workout name and link to its details. For multiple shares, summarize how many workouts
  one sender shared or show the latest sender and count the other distinct senders. Link
  to Friends activity and mark the included shares as seen in this browser. Use the same
  refresh schedule as friend requests. Personal goal notices remain separate.
- **Finish & save** saves the workout privately. After the save succeeds, open a
  **Share this workout?** dialog on the saved workout page. The owner can select **All
  friends** or **Selected friends** and confirm with **Share workout**, or choose **Keep
  private**. Closing the dialog before sending a share keeps the workout private. Add the
  shares in one transaction after validating the audience. Repeated confirmation does not
  duplicate feed entries. Existing workouts keep their current access.
- On a completed workout in Review, add **Share workout**. Only the owner can share it.
  Open the same dialog to select **All friends** or edit the **Selected friends** checkboxes.
  Initialize the audience from existing access and preselect the current recipients when
  switching from All friends to Selected friends. Checking the last unselected friend
  switches the draft back to All friends. **Save & close** replaces the audience with the
  selected recipients. **Keep it private** clears all access when saved. **Cancel** discards
  the pending changes. A confirmed
  share appears in each recipient's **Friends activity** feed. Show the newest shares first, with the sender's
  username, workout name and training date. Opening a card shows a read-only view of the
  exercises and completed sets (reps, load or duration as recorded). Keep a visible **×** with an accessible close label
  on mobile and desktop that returns to Friends activity.
- Each share grants one friend access to one saved workout. The owner can see who has access
  and revoke it individually. Show the current saved workout details on each read. Deleting
  the workout or ending the friendship ends access. Adding the friend again requires a new
  share. Repeated sends or shares must create only one active record.
- Add a single comment thread per workout. The owner and currently authorized recipients
  can read and post plain-text comments of 1–500 characters. Existing workout notes remain
  separate. On Home, notify only the owner about comments by other accounts on that
  workout. **View comments** opens its thread in Review. Revoking a share also revokes read and write access to its comments.
- Extend WGT-07 with an optional **Share milestone** action when the latest saved weight
  meets the active goal. After saving the measurement that reaches the goal, open a
  **Share this milestone?** dialog. **Keep private** closes it, and **Share milestone**
  reopens it later. Share only the fact that a personal goal was reached with all or
  selected accepted friends. Recipients see a Home notice and can send one congratulations
  per milestone from Friends. The owner receives a Home notice and sees the congratulations
  in Friends. Use the same Home refresh schedule. Sharing and congratulating can be retried
  without creating duplicate activity. The milestone never includes any weights, the goal
  direction or the user's daily entries.
- Apply authentication and CSRF protection using the existing API patterns. Store friendships
  and shares separately from coaching, keyed by immutable account and workout IDs. Add the
  migration through `storage.initialize`. On every shared-workout read, verify the signed-in
  recipient, the active friendship and the share. Return only the approved fields. Validate
  eligibility and write relationship or share changes atomically. Keep request handling in
  `app.py`, validation in `models.py` and SQLite queries in `storage.py`.

## Out of scope

Public links, public feeds, likes, public comments, messaging, push notifications, photos and
sharing existing workouts in bulk. The shared view contains only the fields listed above.

## Done when

- At 375 × 667, Alice opens Friends from Home and sends Bob a request. Bob can decline or accept it.
  After acceptance both see each other in Friends. The flow fits the existing mobile
  navigation and the buttons are at least 44 × 44 px. Friends and Review work without
  horizontal scrolling, and rejected requests show a clear message by the form.
- With Bob signed in on Home, Alice sends a request and Bob sees the notice within 30 seconds.
  The link opens Friends. After Bob accepts or declines the last pending request and returns
  to Home, the notice disappears. Alice sees no notice for her outgoing request.
- Before Alice chooses to share, Bob's Friends activity feed is empty. Alice shares her completed
  “Upper body” workout with Bob. Bob sees it at the top of his feed and can open it to see
  Bench press, 3 sets of 8 at 40 kg.
  Bob sees no workout notes, body weight or other sessions, and Carol cannot open the share.
- With Bob and Carol accepted, Alice saves three workouts. In the post-save dialog she chooses
  All friends, Selected friends (Bob only), and Keep private respectively. Bob sees the first two, Carol sees only the first. The page can fit
  a long friends list in one collapsed count row, with requests and the feed still reachable.
- Alice reaches her goal and nothing appears for Bob until she confirms sharing with him.
  Bob sees the milestone and can congratulate Alice. Carol sees nothing, and sending
  congratulations twice produces a single notice for Alice. If Alice ends the friendship,
  Bob loses access to the milestone and can no longer send a congratulations.
- Pending and unrelated accounts cannot receive a share. A third account cannot accept a
  request intended for someone else, and Bob cannot edit or re-share Alice's workout.
- Revoking the share, deleting the workout and ending the friendship each remove access from
  the feed and from an already-open workout link on the next request. Re-friending does not
  restore old shares.
- Tests cover the happy path, authorization, duplicate and cross-requests, revoked access
  and a migration from a populated database. The existing checks pass.
