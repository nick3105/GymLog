"""Small Requesty HTTP adapter; validation and coaching rules live in models.py."""

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .models import assistant_rate_limit_message, is_free_assistant_model

BASE_URL = "https://router.requesty.ai/v1"


class AssistantUnavailable(Exception):
    """A safe, readable error that does not expose provider responses or credentials."""

    def __init__(self, message, status=503):
        """Keep the user-facing reason separate from the upstream HTTP error."""
        super().__init__(message)
        self.status = status


def read_error_details(error):
    """Read a small provider error for classification without exposing its raw text."""
    try:
        raw = error.read(8193)
        if len(raw) > 8192:
            return {}
        return json.loads(raw)
    except (ValueError, UnicodeError, OSError):
        return {}
    finally:
        error.close()


def fetch_json(key, path, body=None):
    """Make one bounded HTTPS request without logging credentials or retrying."""
    request = Request(
        BASE_URL + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    try:
        with urlopen(request, timeout=25) as response:
            raw = response.read(2 * 1024 * 1024 + 1)
            if len(raw) > 2 * 1024 * 1024:
                raise ValueError("Response too large")
            return json.loads(raw)
    except HTTPError as error:
        if error.code == 429:
            details = read_error_details(error)
            retry_after = (error.headers or {}).get("Retry-After")
            raise AssistantUnavailable(
                assistant_rate_limit_message(path, details, retry_after), 429
            ) from None
        if error.code in (401, 403):
            raise AssistantUnavailable(
                "Check the server's REQUESTY_API_KEY and its approved free model."
            ) from None
        raise AssistantUnavailable(
            "The AI provider is unavailable. Please try again later."
        ) from None
    except (URLError, TimeoutError, OSError):
        raise AssistantUnavailable(
            "The AI did not respond in time. Check your connection and try again."
        ) from None
    except (ValueError, UnicodeError):
        raise AssistantUnavailable(
            "The AI response could not be read. Please try again.", 502
        ) from None


def complete(key, model, messages):
    """Check live prices, then ask only the pinned free model for a JSON answer."""
    available = fetch_json(key, "/models")
    if not is_free_assistant_model(available, model):
        raise AssistantUnavailable(
            "This model is not confirmed free. Choose an available free Requesty model on the server."
        )
    result = fetch_json(
        key,
        "/chat/completions",
        {
            "model": model,
            "messages": messages,
            "max_tokens": 4096,
            "temperature": 0.3,
            "response_format": {"type": "json_object"},
        },
    )
    try:
        choice = result["choices"][0]
        if choice.get("finish_reason") != "stop":
            raise ValueError("Incomplete answer")
        content = choice["message"]["content"]
        if not isinstance(content, str):
            raise ValueError("Missing text")
        return content
    except (KeyError, IndexError, TypeError, AttributeError, ValueError):
        raise AssistantUnavailable("The AI answer was incomplete. Please try again.", 502) from None
