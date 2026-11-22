# 35 — Private friend connections and workout sharing
Assignee: Gaia Bandini

## Why

Training can be more motivating when people can connect with friends, while workout data must
remain private unless the owner explicitly chooses to share it. A small opt-in connection feature
adds social value without exposing anyone's journal by default (ACC-01, ACC-04).

## What

Signed-in users can search for another account by its username and send a friend request. The
recipient can accept or decline it. Each user can see a list of pending requests and accepted
friends, with clear statuses and actions that work on a phone.

An accepted friend cannot see any workout data by default. The owner can choose a sharing setting
for each friend: **Private** or **Completed workouts**. Changing the setting takes effect
immediately and can be revoked at any time. A friend can view only the completed workouts that the
owner has shared; active drafts, templates, notes and progress remain private unless a later spec
explicitly adds them.

Every friend and sharing query must be scoped to the signed-in user. A user cannot create a request
for themselves, see another user's pending requests, or view shared data without an accepted
connection and an explicit sharing setting.

## Out of scope

Profile photos, bios, comments, reactions, leaderboards, public profiles, invitations by email,
sharing active workout drafts or templates, and changing the existing workout/session model more
than needed for an opt-in read-only view.

## Done when

- A user can search by valid username, send a request, accept or decline it, and remove an
  accepted connection.
- Requests and friends show clear states at 375 × 667 with tap targets of at least 44 × 44 px.
- Completed-workout sharing is off by default, can be enabled per friend, and can be revoked.
- A non-friend, a declined requester, and a friend without sharing permission cannot see the
  owner's completed workouts.
- Tests cover self-requests, duplicate requests, request ownership, connection isolation,
  default-private sharing and revocation. All journal queries filter by user ID.
- The feature has a dedicated React screen and API routes; existing workout screens remain
  unchanged.
- Backend and frontend checks pass, and a mobile screenshot demonstrates the request and sharing
  flow in the pull request.
