"""Read-only deployed foundation smoke test; it makes no model calls or mutations."""

import os
from urllib.parse import urlsplit

import httpx
import pytest

pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(
        os.getenv("RUN_LIVE_TESTS") != "1", reason="Deployed smoke test explicitly opt-in"
    ),
]


def test_deployed_foundation_health_and_auth():
    base_url = os.getenv("LIVE_API_URL", "")
    parsed = urlsplit(base_url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username:
        pytest.fail("LIVE_API_URL must be an explicitly configured HTTPS API origin")
    expected_ai = os.getenv("LIVE_EXPECT_AI_ENABLED", "false")
    if expected_ai not in {"true", "false"}:
        pytest.fail("LIVE_EXPECT_AI_ENABLED must be true or false")
    with httpx.Client(base_url=base_url, timeout=15) as client:
        health = client.get("/api/health")
        assert health.status_code == 200
        assert health.json()["environment"] == "production"
        assert health.json()["ai_enabled"] is (expected_ai == "true")
        assert client.get("/api/v1/cases").status_code == 401
