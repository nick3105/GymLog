# Local training assistant

The star button opens a chat without leaving your current workout or builder. Ask for a weekly
plan or a short review. The assistant asks about your time, goals, experience, equipment,
limitations and the rest of your training week. Saved templates are context, not a schedule.

## Enable it locally (PowerShell)

1. Create a free account at <https://app.requesty.ai/> and create an API key. Use the free plan
   without payment details. This is separate from a ChatGPT subscription.
2. In your **backend terminal**, set the environment variables below, then start Flask as usual:

```powershell
cd backend
$env:GYMLOG_AI_ENABLED = '1'
$requestyKey = Read-Host 'Requesty API key' -AsSecureString
$env:REQUESTY_API_KEY = [System.Net.NetworkCredential]::new('', $requestyKey).Password
uv run flask --app gymlog run --debug
```

Do not paste the real key into chat, frontend files, screenshots or git. The key stays in the
server's environment. The prompt hides the key and keeps it out of the command text/history.
There is no browser setting for it and no extra Python package to install.
If you already have Flask running, stop it first and restart in this terminal.

In a second terminal:

```powershell
cd frontend
npm run dev
```

Open <http://localhost:5173/>, sign in, tap the star and read the sharing notice. Then try
“Build my training plan”. You can write in English or German; answers follow your language.
In Create/Edit workout, tick **Share current draft** if you want feedback on unsaved edits.
Complete required set targets first; invalid draft targets show a readable validation error.

The proposed workouts are separate cards. Inspect each exercise, set and target, then tap
**Save workout** for each card you want. Each becomes a new template in Start. Existing workouts
are never overwritten. Close/reopen retains the conversation; New chat clears it. Reloading or
signing out clears chat. Your active workout keeps its existing RUN-09 draft behaviour.

Regular multi-exercise AI routines now require at least two work sets per exercise. The model
normally uses three sets for main lifts and two for accessories, budgeting warm-up, rest and
transitions for the session length. A typical 60-90 minute planning default is 5-8 exercises
and 12-24 work sets, adjusted to the week's training and the user's constraints.
Compact model output such as `sets: 3` with one target row is expanded by the backend into
three independent rows before display/save. Explicit per-set targets still work. Counts that
conflict with individual rows are refused instead of silently becoming one set.
Manually created templates and standalone drills retain their existing set rules.

## Prepare for a competition

Open **Prepare for a competition** in the Assistant, or **Competition prep** from
Schedule. Enter the event date and your current preparation. The planner asks
about your recent training and the time you can make available, then drafts the
weeks leading to your event.

Agree to share the prep answers before generating. The competition name and
stored journal data stay in TimeToLift. Review the draft, edit or remove individual
workouts, and press **Save plan to Schedule** to add the event and training cards.

## Free model and availability

Default: `nvidia/nemotron-3.5-lightning-30b-a3b` through <https://router.requesty.ai/v1>.
This replaces Gemma after its upstream provider limited the first live chat (issue 002).
Requesty's documentation lists it as free on 2026-11-17, with 200 daily requests and 20 per minute
shared across a new organisation: <https://docs.requesty.ai/features/free-models>.

Free availability can change. Before sending chat, the server checks `/v1/models` and requires
every input/output pricing tier to be explicitly zero. Missing/paid models are refused; there
are no paid fallbacks or automatic retries. If a model retires, select another currently free
model with `$env:REQUESTY_MODEL = '<provider/model-id>'` and restart Flask. Price checking
reduces billing risk; use an account without purchased credits/payment details as well.

Source for live pricing fields: <https://docs.requesty.ai/api-reference/endpoint/models-list>.
HTTP requests use Python's standard library, have a 25-second timeout per request, and limit
reply size. Each turn uses a price lookup followed by a chat request. Quota, connectivity,
missing setup and unusable answers show an error; the typed question stays available to retry.
A 429 does not by itself prove that a free daily allowance is used. Errors distinguish a
rejected model-price lookup, Requesty account concurrency and an upstream model rate limit.
A safe Retry-After value is shown when supplied. No automatic retries or paid fallback occur.

The assistant is off unless explicitly enabled. Production deployment/configuration is outside
this task. No production settings or PythonAnywhere changes are needed for local development.

## What is shared

After the in-app agreement, each sent turn includes the last 12 chat messages, the signed-in
user's saved workout templates and the exercise catalogue. An unsaved builder is included only
when the checkbox is selected. No account identifiers, credentials, completed sessions or
body-weight history are included by the app. Anything you type in chat is shared, so avoid
sensitive medical details; “avoid overhead movements” can be enough. Provider retention/training
terms depend on the selected model; check its policy in Requesty's model library.

The assistant is a planning aid, not medical care. Validate suggestions against your experience
and constraints; pain/injury questions should go to a qualified professional.

## Check it

Tests use fake responses and consume no requests. `backend/tests/test_assistant.py` covers
authentication, CSRF, consent, input bounds, proposed-plan validation, separate users, missing
setup, prices, quota and network failures. `frontend/src/assistant.test.ts` checks chat payloads.
Run the normal backend/frontend checks from README.md.

For a manual check at 375 x 667:

1. Open/close the star on Home, Create, Start, Review, Weight and an active session. Check
   navigation and Save/Finish remain tappable, and the dialog has no horizontal scrolling.
2. Tab through the open modal and press Escape. Focus returns to the star, and builder/workout
   inputs stay unchanged. Test with the phone keyboard open as well.
3. Ask for a 3-day routine with 45-minute sessions. Confirm it asks about missing context,
   then shows saveable workout cards. Save one and find it in Start.
4. Share a draft for review, and explain what else you train during the week. Check feedback
   stays short and accounts for that context.
5. Temporarily unset the API key and restart: only the assistant becomes unavailable. Real
   provider responses still need a live check with your own key; automated tests cannot prove
   the quality or availability of a live model.

A real phone screenshot and team review are still required before merging.

## Initial verification on 2026-11-17 (before local setup)

- New backend tests: `32 passed in 6.40s`; Ruff format/check pass.
- Full backend run with collection errors allowed to continue: `1 failed, 107 passed, 1 error`.
  The existing password-change test fails during temporary SQLite-file cleanup on Windows
  (WinError 32). The existing deployment test cannot import Linux-only `fcntl` on Windows.
  No existing tests were changed or skipped.
- Frontend lint passes using the installed oxlint CLI. Formatting passes for changed source
  files. The repository-wide default format check reports 43 existing CRLF files; checking
  with `--end-of-line auto` passes. Unrelated files were left untouched.
- Production TypeScript passes when test files are excluded. Direct Node smoke checks for
  the chat payload pass. The full TypeScript/test commands are blocked by missing `vitest`.
- `npm` is unavailable in this execution environment; the underlying installed CLIs were used.
  Vite's build is blocked by missing `@fontsource-variable/inter` (the configured font packages
  are not installed). Package-registry DNS access is unavailable here, so dependencies could
  not be restored. Run `npm install` and all normal frontend checks in a regular local terminal.
- A temporary preview with fake responses and fallback fonts was started and then stopped.
  The browser could not reach it: local socket access is denied by this environment. No mobile
  layout, keyboard/focus interaction or live-provider conversation is claimed as verified.
- Git metadata is read-only here. Branch creation was denied; no commits, push or deployment
  were performed. Create the feature branch and complete the claiming commit before review.

## Follow-up after local setup (issue 002)

With the user's local backend/frontend running, a real request identified Gemma's upstream
provider rate limit. The default was changed to the free Nemotron Lightning endpoint above.
The same starter prompt then produced a valid answer with two questions about goal and
experience. The free-price check remained enabled; no saved workout was changed by this test.

The assistant was checked at 375 x 667 without horizontal overflow. Close and New chat are
44 px high; Send is 48 x 48 px. See [phone-size screenshot](screenshots/issue-002-assistant-mobile.jpg).
Real-phone testing is still pending.

Final targeted checks: 44 assistant tests pass, all 30 frontend tests pass, lint and production
build pass. Full backend: 119 passes, one existing Windows SQLite cleanup failure and one
Linux-only fcntl collection error. The default repository format check still flags the 43
existing CRLF files. See `issues/002-ai-rate-limit-message.md` for the reproduction and fix.

## Work-set follow-up (issue 003)

The volume rules and compact-count expansion above have 14 new regression cases. They
initially had 13 failures and 1 pass, then passed with all 44 previous assistant cases:
`58 passed in 7.61s`. Frontend lint, all 30 tests and the production build pass. Full backend:
133 passes, the same Windows temporary-SQLite cleanup failure and Linux-only fcntl error.
The 43 existing CRLF formatting warnings remain.

The assistant layout was checked at 375 x 667 with no horizontal overflow and controls at
least 44 px high: [layout screenshot](screenshots/issue-003-assistant-mobile.jpg).
Two live generation attempts timed out at Requesty, so no successful live multi-set plan is
claimed for this change. No existing user template was changed. Retry generation when the
provider responds; existing saved single-set routines need explicit editing or replacement
by the user. Live plan quality and a real-phone check remain pending.
