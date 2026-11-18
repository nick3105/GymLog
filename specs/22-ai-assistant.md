# Task 22 - Training assistant
Assignee: nick3105

## Why
Help a user build a weekly routine or check their own workout, with short practical advice.
Requested and assigned by nick3105 on 2026-11-17. This extends the BRD; AI behaviour was not
defined in version 1.0. Existing PLN-01, PLN-02, PLN-09, PLN-10 and RUN-09 still apply.
New requirements are documented as AI-01 to AI-06 in the BRD.

## What
- A 56 px star bubble opens the assistant on every signed-in screen. On phones it sits above
  the bottom navigation and sticky Save/Finish actions. Opening it leaves the page mounted.
- A modal sheet has short messages, a message field, Close, New chat, and two starter prompts.
  Closing/reopening or navigating retains chat in memory; signing out clears it.
- Before creating plans, ask about minutes per session, sessions per week, goal/priorities,
  experience, available equipment, limitations, and other weekly training/sports. Ask at most
  two questions at once, skip facts already supplied. Ask which days if spacing is unknown.
- Reviews consider the whole week. Saved templates are available as context but are NOT a
  weekly schedule. Ask which ones are used, how often, and about other training. Include the
  current unsaved builder when explicitly shared. Never assume saved templates are all used.
- Replies use the user's language, normally at most 80 words (hard limit 1200 characters).
  A proposed weekly routine has up to 7 workout cards, each with catalogue exercises and sets.
  Users review each card and explicitly save it as a NEW template via the existing validated
  endpoint. No automatic changes or overwriting plans. No automatic weight prescriptions.
  For regular multi-exercise AI routines require at least two work sets per exercise, normally
  three on main lifts and two on accessories. For typical 60-90 minute sessions aim for 5-8
  exercises / 12-24 work sets, with warm-up, rests and transitions budgeted and weekly recovery
  considered. Explain when personal constraints justify less. Compact `sets` plus one target
  row must expand to that many independent target rows; conflicting counts are rejected.
  Standalone exercise drills and manual templates keep existing set rules (issue 003).
- Use Requesty (course recommendation), default nvidia/nemotron-3.5-lightning-30b-a3b,
  listed as free in the live model library on 2026-11-17. This replaces Gemma after its
  provider returned HTTP 429 on the first real chat (issue 002). An explicit REQUESTY_MODEL
  still takes precedence. Key via REQUESTY_API_KEY on the server only; no extra dependency.
  Before every chat call check the model's live input/output prices via /v1/models; refuse
  missing/non-zero prices. Never use paid fallbacks. Timeout 25 seconds, no automatic retries.
- AI is disabled unless GYMLOG_AI_ENABLED=1 (local opt-in). Show clear setup, quota, network
  and invalid-response errors. Missing keys must not break the rest of GymLog.
  A 429 alone is not proof of an exhausted free allowance: distinguish model-price lookup,
  router concurrency and upstream model limits; show safe Retry-After seconds (issue 002).
- First use explicitly asks to share chat and saved workout templates with Requesty and its
  model host. No passwords, usernames, completed sessions or body-weight history are sent.
  Limitations can be sensitive: explain this and allow avoiding medical details.
- Backend authenticates, checks CSRF, bounds chat (last 12 messages, 2000 characters each),
  validates structured model output and every proposed template through models.py.
  User/model text is untrusted; render plain React text, never HTML. Refuse medical diagnosis
  in instructions; pain/injury questions should be referred to a qualified professional.
- Rules and validation stay in models.py; provider HTTP lives in assistant.py; app.py only
  orchestrates. Reuse existing user-filtered template reads, no schema changes.

## Out of scope
Production deployment, provider account creation, paid models, medical advice, automatically
changing workouts, persistent chat storage, accessing completed sessions or body weight.

## Done when
- API tests go red then green with fake provider replies: valid chat/plans, invalid output,
  invalid exercise IDs/targets, unauthenticated/CSRF requests, missing consent/key, quota,
  timeout and free-price guard; a second user's templates never enter context.
- At 375 x 667, bubble and modal fit without horizontal scrolling, all buttons >=44 px,
  input >=16 px; sticky workout actions remain reachable. Close/Escape restores focus and
  leaves an active workout and builder unchanged. Keyboard focus stays inside the dialog.
- Ask for a 3-day routine; answer the questions; inspect and save a suggestion. Review a
  current draft alongside the rest of the week. Test unavailable-provider UI without losing
  the typed message or chat. A real phone check remains required before merging.
- Run all backend/frontend checks and provide their output. A live provider smoke test is
  possible only after the user supplies their own key in their local environment.

## Integration with current main
- The assistant uses the signed-in owner's combined built-in/personal exercise catalogue for
  draft validation, outgoing context and reply validation. Another user's private IDs stay invalid.
- Coaching builders must not publish a coachee's draft into the coach's own assistant context.
- Assistant draft state has its own React context inside JournalProvider; existing journal
  consumers and autosave behaviour keep their existing contract.

## Local environment note
Branch feature/ai-assistant and draft PR #41 were created with the user's terminal. Git
metadata remains read-only to this session; the user must record and push the prepared merge.
