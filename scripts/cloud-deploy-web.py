"""Publish only the reviewed static build through Firebase Hosting REST.

No service-account files, Firebase CLI default identity or persisted access tokens.
Reference: https://firebase.google.com/docs/hosting/api-deploy
"""

import argparse
import gzip
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

PROJECT = "greenprocure-511917"
PROJECT_NUMBER = "694155506378"
ACCOUNT = "anhminhnts2004@gmail.com"
APP_ID = "1:694155506378:web:a40e65eebd52c56eb53a33"
API = "https://firebasehosting.googleapis.com/v1beta1"
ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "apps" / "web" / "dist"
API_HOST = re.compile(
    r"greenprocure-api-(?:694155506378\.asia-southeast1|[a-z0-9-]+\.a)\.run\.app"
)
ASSET = re.compile(
    r"/assets/[A-Za-z0-9_-]+\.(?:js|css|svg|png|jpg|jpeg|webp|ico|woff|woff2)"
)
SHA256 = re.compile(r"[0-9a-f]{64}")
SERVING_CONFIG = {
    "rewrites": [{"glob": "**", "path": "/index.html"}],
    "headers": [
        {
            "glob": "**",
            "headers": {
                "Cache-Control": "no-cache",
                "X-Content-Type-Options": "nosniff",
                "Referrer-Policy": "strict-origin-when-cross-origin",
            },
        }
    ],
}


class ReleaseError(Exception):
    """A safe error that never embeds authentication headers or response bodies."""


def read_build(dist: Path) -> tuple[dict, dict[str, bytes]]:
    """Snapshot only reviewed, bounded output and match it to the build receipt."""
    if not dist.is_dir() or dist.is_symlink() or dist.is_junction():
        raise ReleaseError("Build production static files first.")
    files = {}
    total = 0
    for path in sorted(dist.rglob("*")):
        if path.is_symlink() or path.is_junction():
            raise ReleaseError("Links and junctions cannot be published.")
        if path.is_dir():
            if path.relative_to(dist).as_posix() != "assets":
                raise ReleaseError("Unexpected directory in static build.")
            continue
        relative = "/" + path.relative_to(dist).as_posix()
        if relative not in {"/index.html", "/release.json"} and not ASSET.fullmatch(
            relative
        ):
            raise ReleaseError(
                "Unexpected file in static build; publish only reviewed assets."
            )
        size = path.stat().st_size
        total += size
        if size > 10 * 1024 * 1024 or total > 20 * 1024 * 1024 or len(files) >= 100:
            raise ReleaseError("Static build exceeds this demo's publication bounds.")
        files[relative] = path.read_bytes()
    if not {"/index.html", "/release.json"}.issubset(files) or len(files) < 3:
        raise ReleaseError("Production build is incomplete or has no release receipt.")
    try:
        receipt = json.loads(files["/release.json"])
    except (ValueError, UnicodeError) as error:
        raise ReleaseError("Invalid build receipt.") from error
    if not isinstance(receipt, dict):
        raise ReleaseError("Invalid build receipt shape.")
    if (
        receipt.get("project") != PROJECT
        or receipt.get("firebase_app_id") != APP_ID
        or receipt.get("app_check") != "recaptcha-enterprise"
    ):
        raise ReleaseError(
            "Build receipt does not identify the selected production app."
        )
    if not isinstance(receipt.get("api_origin"), str):
        raise ReleaseError("Build receipt lacks the API origin.")
    origin = urlsplit(receipt["api_origin"])
    if (
        origin.scheme != "https"
        or not API_HOST.fullmatch(origin.netloc)
        or origin.path
        or origin.query
        or origin.fragment
    ):
        raise ReleaseError(
            "Build receipt does not identify the selected Cloud Run API."
        )
    try:
        built_at = datetime.fromisoformat(receipt["built_at"].replace("Z", "+00:00"))
        if built_at.tzinfo is None:
            raise ValueError("No timezone")
    except (KeyError, TypeError, ValueError) as error:
        raise ReleaseError("Build receipt lacks a valid timestamp.") from error
    expected = receipt.get("files")
    observed = {
        name: hashlib.sha256(content).hexdigest()
        for name, content in files.items()
        if name != "/release.json"
    }
    if expected != observed:
        raise ReleaseError(
            "Static files differ from their production build receipt; rebuild."
        )
    index = files["/index.html"].decode("utf-8")
    for asset in re.findall(r'(?:src|href)=["\'](/assets/[^"\']+)["\']', index):
        if asset not in files:
            raise ReleaseError("Index references an asset missing from the build.")
    return receipt, files


def get_token(gcloud: str) -> str:
    result = subprocess.run(
        [
            gcloud,
            "auth",
            "print-access-token",
            f"--account={ACCOUNT}",
            f"--project={PROJECT}",
            "--quiet",
        ],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    token = result.stdout.strip()
    if result.returncode or not token or any(char.isspace() for char in token):
        raise ReleaseError("Personal Google CLI authentication is unavailable.")
    return token


class RejectRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ReleaseError(
            "Hosting unexpectedly requested a redirect; authorization was not forwarded."
        )


class Hosting:
    def __init__(self, token: str):
        self._token = token
        self._opener = build_opener(RejectRedirects())

    def request(self, method: str, url: str, payload=None, *, binary: bool = False):
        parsed = urlsplit(url)
        if (
            parsed.scheme != "https"
            or parsed.netloc
            not in {
                "firebasehosting.googleapis.com",
                "upload-firebasehosting.googleapis.com",
            }
            or parsed.username
            or parsed.password
            or parsed.fragment
        ):
            raise ReleaseError("Refusing an unexpected Hosting API destination.")
        data = (
            payload
            if binary
            else (json.dumps(payload).encode("utf-8") if payload is not None else None)
        )
        request = Request(
            url,
            data=data,
            method=method,
            headers={
                "Authorization": f"Bearer {self._token}",
                "X-Goog-User-Project": PROJECT,
                "Content-Type": "application/octet-stream"
                if binary
                else "application/json",
            },
        )
        try:
            with self._opener.open(request, timeout=60) as response:
                body = response.read(1024 * 1024)
        except HTTPError as error:
            raise ReleaseError(
                f"Hosting {method} failed with HTTP {error.code}."
            ) from None
        except URLError:
            raise ReleaseError(
                "Hosting request failed; inspect the named version before retrying."
            ) from None
        if binary or not body:
            return {}
        try:
            return json.loads(body)
        except (ValueError, UnicodeError):
            raise ReleaseError("Hosting returned an invalid JSON response.") from None


def publish(hosting: Hosting, receipt: dict, files: dict[str, bytes]) -> dict:
    site = hosting.request("GET", f"{API}/projects/{PROJECT}/sites/{PROJECT}")
    allowed_names = {
        f"projects/{PROJECT}/sites/{PROJECT}",
        f"projects/{PROJECT_NUMBER}/sites/{PROJECT}",
    }
    if (
        site.get("name") not in allowed_names
        or site.get("defaultUrl") != f"https://{PROJECT}.web.app"
    ):
        raise ReleaseError("Existing Hosting site does not match the selected project.")
    compressed = {
        name: gzip.compress(content, mtime=0) for name, content in files.items()
    }
    hashes = {
        name: hashlib.sha256(content).hexdigest()
        for name, content in compressed.items()
    }
    by_hash = {hashes[name]: content for name, content in compressed.items()}
    version = hosting.request(
        "POST",
        f"{API}/sites/{PROJECT}/versions",
        {
            "config": SERVING_CONFIG,
            "labels": {"app": "greenprocure", "component": "web"},
        },
    )
    name = version.get("name", "")
    if (
        not re.fullmatch(rf"sites/{PROJECT}/versions/[A-Za-z0-9_-]+", name)
        or version.get("status") != "CREATED"
    ):
        raise ReleaseError("Hosting returned unexpected version metadata.")
    print(f"Prepared Hosting version: {name}", flush=True)
    populated = hosting.request(
        "POST", f"{API}/{name}:populateFiles", {"files": hashes}
    )
    required = populated.get("uploadRequiredHashes", [])
    expected_upload = (
        f"https://upload-firebasehosting.googleapis.com/upload/{name}/files"
    )
    if (
        not isinstance(required, list)
        or any(not isinstance(value, str) or value not in by_hash for value in required)
        or (required and populated.get("uploadUrl") != expected_upload)
    ):
        raise ReleaseError(
            "Hosting returned unexpected upload metadata; version was not released."
        )
    for digest in sorted(set(required)):
        hosting.request(
            "POST", f"{expected_upload}/{digest}", by_hash[digest], binary=True
        )
    finalized = hosting.request(
        "PATCH", f"{API}/{name}?updateMask=status", {"status": "FINALIZED"}
    )
    if finalized.get("name") != name or finalized.get("status") != "FINALIZED":
        raise ReleaseError(
            "Hosting did not finalize the expected version; nothing was released."
        )
    query = urlencode({"versionName": name})
    release = hosting.request(
        "POST",
        f"{API}/sites/{PROJECT}/releases?{query}",
        {
            "message": f"GreenProcure production app built {receipt['built_at']}",
        },
    )
    if (
        release.get("version", {}).get("name") != name
        or release.get("type") != "DEPLOY"
    ):
        raise ReleaseError(
            "Release outcome is unverified; inspect Hosting before retrying."
        )
    return {
        "site_url": f"https://{PROJECT}.web.app",
        "release": release.get("name"),
        "version": name,
        "files": len(files),
        "api_origin": receipt["api_origin"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--gcloud", default=r"C:\Google Cloud CLI\google-cloud-sdk\bin\gcloud.cmd"
    )
    parser.add_argument(
        "--publish",
        action="store_true",
        help="Publish this verified build to the live site.",
    )
    args = parser.parse_args()
    try:
        receipt, files = read_build(DIST)
        print(
            json.dumps(
                {
                    "project": PROJECT,
                    "api_origin": receipt["api_origin"],
                    "files": len(files),
                    "bytes": sum(map(len, files.values())),
                    "publish": args.publish,
                }
            )
        )
        if not args.publish:
            print(
                "Validated only; no token read or cloud request. Add --publish to release."
            )
            return 0
        result = publish(Hosting(get_token(args.gcloud)), receipt, files)
        print(json.dumps(result))
        return 0
    except (ReleaseError, OSError, subprocess.SubprocessError) as error:
        message = (
            str(error)
            if isinstance(error, ReleaseError)
            else "Local command or file access failed."
        )
        print(message, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
