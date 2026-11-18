"""Issue 002: HTTP 429 is not proof that a new user's free allowance is exhausted."""

import io
import json
from urllib.error import HTTPError

import pytest

from gymlog import assistant, create_app


def fail_with_rate_limit(monkeypatch, body, stage="/models", headers=None):
    """Fake a price lookup or completion rejection, tracking every outgoing request."""
    calls = []

    def respond(request, timeout):
        """Supply free prices unless this is the endpoint being tested."""
        calls.append(request.full_url)
        if request.full_url.endswith(stage):
            raise HTTPError(
                request.full_url, 429, "Too Many Requests", headers or {}, io.BytesIO(body)
            )
        return io.BytesIO(
            json.dumps(
                {
                    "data": [
                        {
                            "id": "google/gemma-4-31b-it",
                            "pricing": [{"input_price": 0, "output_price": 0}],
                        }
                    ]
                }
            ).encode()
        )

    monkeypatch.setattr(assistant, "urlopen", respond)
    return calls


def test_price_lookup_rate_limit_never_claims_a_used_free_allowance(monkeypatch):
    """A failed metadata request must stop before any chat is sent."""
    calls = fail_with_rate_limit(monkeypatch, b"{}")
    with pytest.raises(assistant.AssistantUnavailable) as result:
        assistant.complete("fake-secret", "google/gemma-4-31b-it", [])
    assert result.value.status == 429
    assert "model-price check" in str(result.value)
    assert "No chat request was sent" in str(result.value)
    assert "free AI request limit is reached" not in str(result.value)
    assert calls == ["https://router.requesty.ai/v1/models"]


@pytest.mark.parametrize(
    "message",
    [
        "Your organization reached its limit of concurrent requests",
        "You reached your user-level limit of concurrent requests",
    ],
)
def test_router_concurrency_limit_is_not_daily_quota(monkeypatch, message):
    """Identify Requesty's documented account-concurrency errors."""
    fail_with_rate_limit(
        monkeypatch,
        json.dumps(
            {
                "error": {
                    "origin": "router",
                    "message": message,
                }
            }
        ).encode(),
        stage="/chat/completions",
    )
    with pytest.raises(assistant.AssistantUnavailable) as result:
        assistant.complete("fake-secret", "google/gemma-4-31b-it", [])
    assert "simultaneous-request" in str(result.value)
    assert "daily" not in str(result.value)


def test_provider_rate_limit_and_retry_after_are_explained(monkeypatch):
    """Distinguish a busy upstream model and show its wait time without retrying."""
    calls = fail_with_rate_limit(
        monkeypatch,
        json.dumps(
            {
                "error": {
                    "origin": "provider",
                    "message": "Too many requests",
                }
            }
        ).encode(),
        stage="/chat/completions",
        headers={"Retry-After": "30"},
    )
    with pytest.raises(assistant.AssistantUnavailable) as result:
        assistant.complete("fake-secret", "google/gemma-4-31b-it", [])
    assert "model provider" in str(result.value)
    assert "30 seconds" in str(result.value)
    assert "daily" not in str(result.value)
    assert len(calls) == 2


def test_daily_allowance_requires_an_explicit_router_reason(monkeypatch):
    """Only identify a daily limit when the router actually reports one."""
    fail_with_rate_limit(
        monkeypatch,
        json.dumps(
            {
                "error": {
                    "origin": "router",
                    "message": "Daily free request limit reached",
                }
            }
        ).encode(),
        stage="/chat/completions",
    )
    with pytest.raises(assistant.AssistantUnavailable) as result:
        assistant.complete("fake-secret", "google/gemma-4-31b-it", [])
    assert "daily free allowance" in str(result.value)


@pytest.mark.parametrize(
    "body",
    [
        b"not-json fake-secret private-training-detail",
        b"[]",
        b'{"error":null}',
        json.dumps(
            {"error": {"origin": "router", "message": "fake-secret private-training-detail"}}
        ).encode(),
        b"x" * 9000,
    ],
)
def test_untrusted_error_details_are_bounded_and_never_echoed(monkeypatch, body):
    """Malformed errors and echoed sensitive text must remain private."""
    fail_with_rate_limit(monkeypatch, body, headers={"Retry-After": "fake-secret"})
    with pytest.raises(assistant.AssistantUnavailable) as result:
        assistant.complete("fake-secret", "google/gemma-4-31b-it", [])
    assert result.value.status == 429
    assert "fake-secret" not in str(result.value)
    assert "private-training-detail" not in str(result.value)
    assert "model-price check" in str(result.value)


@pytest.mark.parametrize(
    "configured_model, expected_model",
    [
        (None, "nvidia/nemotron-3.5-lightning-30b-a3b"),
        ("google/gemma-4-31b-it", "google/gemma-4-31b-it"),
    ],
)
def test_default_model_and_explicit_override_reach_provider(
    tmp_path, monkeypatch, configured_model, expected_model
):
    """Use the replacement free model by default without overriding explicit local choices."""
    monkeypatch.setenv("GYMLOG_INSTANCE", str(tmp_path))
    monkeypatch.delenv("REQUESTY_MODEL", raising=False)
    if configured_model:
        monkeypatch.setenv("REQUESTY_MODEL", configured_model)
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-only",
            "DATABASE": str(tmp_path / "test.db"),
            "AI_ENABLED": True,
            "REQUESTY_API_KEY": "fake-secret",
        }
    )
    seen = []

    def reply(key, model, messages):
        """Capture the model selected by the app, without consuming real requests."""
        seen.append(model)
        return json.dumps({"reply": "Which days do you train?", "plans": []})

    monkeypatch.setattr(assistant, "complete", reply)
    browser = app.test_client()
    token = browser.get("/api/session").json["csrf"]
    registered = browser.post(
        "/api/register",
        json={
            "username": "alice",
            "password": "test-password-long",
        },
        headers={"X-CSRF-Token": token},
    )
    response = browser.post(
        "/api/assistant",
        json={
            "consent": True,
            "messages": [{"role": "user", "content": "Help me plan my week"}],
        },
        headers={"X-CSRF-Token": registered.json["csrf"]},
    )
    assert response.status_code == 200
    assert seen == [expected_model]
