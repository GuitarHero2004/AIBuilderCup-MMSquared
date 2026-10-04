"""Real SDK/emulator checks. Start isolated emulators and set RUN_EMULATOR_TESTS=1."""

import os
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.getenv("RUN_EMULATOR_TESTS") != "1", reason="Emulators explicitly opt-in"
    ),
]


def emulator_settings():
    return Settings(
        _env_file=None,
        app_env="local",
        google_cloud_project="demo-greenprocure",
        firebase_auth_emulator_host=os.getenv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099"),
        firestore_emulator_host=os.getenv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080"),
        firebase_storage_emulator_host=os.getenv(
            "FIREBASE_STORAGE_EMULATOR_HOST", "127.0.0.1:9199"
        ),
        app_check_required=False,
        allowed_origins=["http://localhost:5173"],
    )


def sign_in(config):
    # Settings validates a demo project and loopback host before this local-only request.
    response = httpx.post(
        f"http://{config.firebase_auth_emulator_host}/identitytoolkit.googleapis.com/v1/accounts:signUp",
        params={"key": "local-test-key"},
        json={"returnSecureToken": True},
        timeout=10,
    )
    response.raise_for_status()
    identity = response.json()
    return {"Authorization": "Bearer " + identity["idToken"]}, identity["localId"]


def test_real_token_persistence_restart_owner_isolation_and_atomic_cap(payload):
    config = emulator_settings()
    (alice, _), (bob, _) = sign_in(config), sign_in(config)
    with TestClient(create_app(config)) as first:
        response = first.post("/api/v1/cases", headers=alice, json=payload)
        assert response.status_code == 201, response.text
        case = response.json()
        assert first.get("/api/v1/cases", headers=bob).json() == {"items": []}
        assert first.get(f"/api/v1/cases/{case['id']}", headers=bob).status_code == 404
        with ThreadPoolExecutor(max_workers=2) as pool:
            responses = list(
                pool.map(
                    lambda _: first.post("/api/v1/cases", headers=alice, json=payload), range(2)
                )
            )
        assert sorted(response.status_code for response in responses) == [201, 429]
    with TestClient(create_app(config)) as restarted:
        assert restarted.get(f"/api/v1/cases/{case['id']}", headers=alice).json() == case
        assert len(restarted.get("/api/v1/cases", headers=alice).json()["items"]) == 2
        assert (
            restarted.get("/api/v1/cases", headers={"Authorization": "Bearer invalid"}).status_code
            == 401
        )


def test_direct_browser_firestore_and_storage_read_write_are_denied(payload):
    config = emulator_settings()
    headers, uid = sign_in(config)
    with TestClient(create_app(config)) as api:
        created = api.post("/api/v1/cases", json=payload, headers=headers)
        assert created.status_code == 201, created.text
    document = (
        f"http://{config.firestore_emulator_host}/v1/projects/{config.google_cloud_project}"
        f"/databases/(default)/documents/users/{uid}/cases/{created.json()['id']}"
    )
    with httpx.Client(timeout=10) as browser:
        assert browser.get(document, headers=headers).status_code == 403
        assert (
            browser.patch(
                document, headers=headers, json={"fields": {"name": {"stringValue": "denied"}}}
            ).status_code
            == 403
        )

        # This admin seed is possible only against the validated loopback demo emulator.
        # An existing object makes the read-denial test distinguish authorization from 404.
        bucket = f"{config.google_cloud_project}.appspot.com"
        object_name = f"users/{uid}/rules-probe.txt"
        storage = f"http://{config.firebase_storage_emulator_host}/v0/b/{bucket}/o"
        seeded = browser.post(
            storage,
            params={"uploadType": "media", "name": object_name},
            headers={"Authorization": "Bearer owner", "Content-Type": "text/plain"},
            content=b"Synthetic rules test only",
        )
        assert seeded.status_code == 200, seeded.text
        firebase_headers = {
            "Authorization": headers["Authorization"].replace("Bearer ", "Firebase ", 1)
        }
        download = browser.get(
            f"{storage}/{quote(object_name, safe='')}",
            params={"alt": "media"},
            headers=firebase_headers,
        )
        assert download.status_code == 403, download.text
        upload = browser.post(
            storage,
            params={"uploadType": "media", "name": f"users/{uid}/denied.txt"},
            headers=firebase_headers | {"Content-Type": "text/plain"},
            content=b"Denied write",
        )
        assert upload.status_code == 403, upload.text
