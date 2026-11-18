# Issue 002 - First AI request is reported as an exhausted free allowance

## What happens

The first chat attempt shows "The free AI request limit is reached. Please try again later."
The adapter maps every Requesty HTTP 429 to that sentence, including a rejected `/models`
price lookup. The response body and Retry-After header are discarded, hiding the distinction
between account concurrency limits, upstream model capacity and a daily free allowance.

## What should happen

For AI-05, explain which stage failed and distinguish documented router concurrency errors
from upstream model rate limits. Claim a daily allowance was reached only when Requesty
explicitly says so. Respect a bounded Retry-After value in the message without automatic
retries. Never echo the raw upstream body, credentials or personal data into the UI/logs.
If the price lookup fails, do not send chat or bypass the free-price guard.

The live retry with corrected error handling identified an upstream provider rate limit
on the Gemma chat request. The price lookup succeeded. Gemma is still listed as free; this
does not prove that the account's allowance is exhausted. Replace the default with the
currently free nvidia/nemotron-3.5-lightning-30b-a3b endpoint, keeping explicit local model
overrides and the live price guard. No paid fallback or service change is part of this fix.

## Reproduce

1. Start the local app with a Requesty key and send the first assistant message.
2. Alternatively fake an HTTP 429 from `/models` or `/chat/completions`.
3. Observe the same exhausted-free-limit sentence in both cases.

## Done when

New regression tests cover both stages, router/provider origin, an explicit daily limit,
Retry-After, malformed/oversized error bodies and private text never being echoed. The
original assistant tests continue to pass. Retry the local app to identify the actual cause.

## Verified locally

The live retry classified Gemma's response as an upstream model rate limit. With the new
default, the same pending starter message succeeded and returned two short questions about
the user's goal and experience. The existing Flask debug server reloaded the change.

The 375 x 667 browser check showed no horizontal overflow; Close/New chat were 44 px high
and Send was 48 x 48 px. Screenshot: `docs/screenshots/issue-002-assistant-mobile.jpg`.
A real phone check is still pending. No workout was created or changed by the smoke test.

Regression tests: 10 failed before the error fix, then all passed. The replacement-default
test also failed before changing the default. All 44 assistant tests now pass. Frontend:
30 tests pass, lint and production build pass. The full backend run has 119 passes, the
existing Windows temporary-SQLite cleanup failure and the Linux-only fcntl import error.
The existing 43 CRLF formatting warnings remain outside this fix.
