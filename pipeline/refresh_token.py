"""Run this locally to refresh token.json when the Google OAuth token expires.

After running, copy the contents of pipeline/token.json into the TOKEN_JSON
GitHub Actions secret to keep the pipeline working.
"""

from google_auth_oauthlib.flow import InstalledAppFlow

flow = InstalledAppFlow.from_client_secrets_file(
    "credentials.json",
    ["https://www.googleapis.com/auth/documents.readonly"],
)
creds = flow.run_local_server(port=0)
open("token.json", "w").write(creds.to_json())
print("token.json updated — copy its contents into the TOKEN_JSON GitHub secret")
