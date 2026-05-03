"""Google authentication for the Spine Log pipeline."""

import json
import os
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/documents.readonly"]

_BASE_DIR = Path(__file__).parent
CREDENTIALS_FILE = str(_BASE_DIR / "credentials.json")
TOKEN_FILE = str(_BASE_DIR / "token.json")


def get_credentials() -> Credentials:
    """Return valid credentials.

    CI: uses GOOGLE_SERVICE_ACCOUNT_JSON env var (service account key JSON).
    Local: falls back to token.json / credentials.json (user OAuth flow).
    """
    # ── CI path: service account ──────────────────────────────────────────────
    sa_json_env = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if sa_json_env:
        info = json.loads(sa_json_env)
        return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)

    # ── Local path: read/write token.json ─────────────────────────────────────
    creds: Credentials | None = None

    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                CREDENTIALS_FILE, SCOPES
            )
            creds = flow.run_local_server(port=0)

        with open(TOKEN_FILE, "w") as fh:
            fh.write(creds.to_json())

    return creds
