# 36 — Simple profile bio and avatar
Assignee: Gaia Bandini

## Why

When social features are added, people need a simple way to recognise their own account and
describe their training focus without uploading personal photos or introducing a media-storage
service (ACC-01, ACC-04).

## What

Add a short editable bio to the signed-in user's Profile screen. Limit it to 160 characters and
show a clear remaining-character count. Display an avatar made from the first letter of the
username with a stable colour derived from that username. The avatar is generated locally and is
not an uploaded image.

The profile screen shows the username, avatar, bio and existing training summary. Saving the bio
persists it to the signed-in account and is visible after signing in on another device. Empty bio
is allowed and restores the placeholder text. Other users' data is not exposed by this feature.

## Out of scope

Photo uploads, image processing, public profile pages, friends, workout sharing, comments, and
changes to training statistics.

## Done when

- A signed-in user can edit, clear and save a bio of 160 characters or fewer.
- The username avatar has a readable initial, stable colour and a tap target of at least 44 × 44 px
  if it is interactive; otherwise it is clearly decorative.
- The saved bio survives reload and sign-in on another device, and remains private to its owner.
- The screen works at 375 × 667 without horizontal scrolling and keeps the existing profile
  summary readable.
- Backend tests cover ownership and the character limit; frontend checks pass.
