# Google Cloud setup and troubleshooting

How to give the app an OAuth client and a spreadsheet, check it against the real
Google, and fix what goes wrong when connecting. The tests fake Google and need none
of this.

## Setup

You need one Google Cloud project with the Sheets API enabled and a **Web application**
OAuth client. These steps use the Google Cloud console's _Google Auth Platform_ pages
(older consoles call them "OAuth consent screen" and "Credentials").

1. **Project.** Open <https://console.cloud.google.com/>, then use the project picker to
   create a project (or select an existing one).
2. **Enable the Google Sheets API.** _APIs & Services → Library_, search for "Google
   Sheets API", then **Enable**. It must be the same project as the OAuth client.
3. **Configure the consent screen.** _Google Auth Platform → Get started_ (or
   _Branding_): app name "DHCW Roadmap Editor", user support email, developer contact email.
   Then _Audience_:
   - **Internal**: only accounts in your Google Workspace organisation; no test-user list
     and no verification needed.
   - **External**: any Google account. While the publishing status is **Testing**, only
     the accounts listed under _Audience → Test users_ (up to 100) can authorise, so add
     each person who will use the app.
4. **Declare the scope.** _Data Access → Add or remove scopes_, add
   `https://www.googleapis.com/auth/spreadsheets` (listed as a sensitive scope), and save.
5. **Create the OAuth client.** _Clients → Create client_:
   - Application type: **Web application**.
   - **Authorised JavaScript origins** — origins only (scheme, host and port; no path and
     no trailing slash):
     - `http://localhost:5173` (`pnpm editor:dev`)
     - `http://localhost:4173` (optional: `pnpm editor:preview`)
     - optional: `http://localhost:21010`, `21020` and so on, to sign in from a parallel
       worktree's `pnpm editor:dev` (`apps/editor/README.md`, _Parallel worktrees_)
     - `https://dhcw-digital-health-and-care-wales.github.io` (production; **not**
       `https://dhcw-digital-health-and-care-wales.github.io/roadmaps`, which
       Google rejects as it has a path)
   - **Authorised redirect URIs: leave empty.** The token model's popup returns the token
     to the opener page, so no redirect URI is involved; redirect URIs are only for the
     authorisation-code model's redirect mode.
   - Create it and copy the **Client ID**. Ignore the client secret: a static app cannot
     keep one, and this flow does not use it.
6. **Configure the app.** Put the client ID and spreadsheet ID in `apps/editor/.env.production` and
   `apps/editor/.env.example` (and your `apps/editor/.env.local`), then commit.
7. **Share the spreadsheet** with every account that will use the app. Viewer access is
   enough to read roadmaps; publishing needs Editor access.

Changes to origins can take from five minutes to a few hours to take effect.

## Check it against the real Google

The E2E suite fakes Google Identity Services and the Sheets API, so a change to how the
app signs in, reads or writes is proven against the real Google only by hand: run
`pnpm editor:dev` (or open the deployed site), choose **Connect Google**, sign in with an
account that can open the spreadsheet, and check the roadmaps load. For a change to
publishing, publish a change to a test spreadsheet (`apps/editor/tests/fixtures/sheets/README.md`
says how to make one), never the live one.

## Troubleshooting

| Symptom                                                                          | Cause and fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google's popup shows **Error 400: origin_mismatch** or **redirect_uri_mismatch** | The page's origin is not in the OAuth client's Authorised JavaScript origins. Add the exact origin: scheme, host and port, no path, no trailing slash (`http://127.0.0.1:5173` and `http://localhost:5173` differ). Do not add redirect URIs; this flow doesn't use them. Wait a few minutes for the change to apply.                                                                                                                                                             |
| Google's sign-in page says "to continue to" another app's name                   | The name comes from the OAuth client's Google Cloud project: _Google Auth Platform → Branding → App name_. Set it to "DHCW Roadmap Editor", or create a dedicated project for this app.                                                                                                                                                                                                                                                                                           |
| Popup shows **Error 401: invalid_client** / "OAuth client was not found"         | `VITE_GOOGLE_CLIENT_ID` is wrong or the client was deleted. Check `apps/editor/.env.production` (or `apps/editor/.env.local` for `pnpm editor:dev`) and rebuild.                                                                                                                                                                                                                                                                                                                  |
| "Your browser blocked the Google window"                                         | The popup was blocked. Allow pop-ups for the site and choose Connect again.                                                                                                                                                                                                                                                                                                                                                                                                       |
| "The Google window was closed before connecting finished"                        | The popup was closed before finishing. Connect again.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| "Access wasn't granted…" (**access_denied**)                                     | The user chose Cancel, or the app is External and in Testing and the account is not a test user (Google then shows "Error 403: access_denied … has not completed the Google verification process"). Add the account under _Audience → Test users_, or use an Internal app.                                                                                                                                                                                                        |
| "Access to Google Sheets is needed…"                                             | The Sheets checkbox was left unticked on the consent screen. Connect again and tick it.                                                                                                                                                                                                                                                                                                                                                                                           |
| **"Google hasn't verified this app"** screen                                     | Expected for an External app in Testing that requests a sensitive scope. Test users can continue past it. To remove it, complete Google's verification or use an Internal app; see the README's [Security and data access](../../apps/editor/README.md#security-and-data-access).                                                                                                                                                                                                 |
| "You don't have access to this spreadsheet" (**403**)                            | Either the account cannot open the spreadsheet (share it with the account), or the **Google Sheets API is not enabled** in the OAuth client's project. To tell them apart, open DevTools → Network → the `sheets.googleapis.com` request: "The caller does not have permission" means sharing; `SERVICE_DISABLED` / "Google Sheets API has not been used in project … or it is disabled" means enable the API (then wait a few minutes). A Workspace admin may also block access. |
| "This Google account isn't allowed to change this roadmap"                       | The account can open the spreadsheet but not edit it. Share it with the account as an Editor.                                                                                                                                                                                                                                                                                                                                                                                     |
| "The spreadsheet couldn't be found" (**404**)                                    | `VITE_GOOGLE_SPREADSHEET_ID` is wrong or the spreadsheet was deleted. Copy the ID from the spreadsheet URL.                                                                                                                                                                                                                                                                                                                                                                       |
| "Too many requests right now" (**429**)                                          | Sheets API per-minute quota exceeded. The app retries twice with back-off; wait a minute and choose Retry. Quotas: _APIs & Services → Google Sheets API → Quotas_.                                                                                                                                                                                                                                                                                                                |
| "Your session has expired"                                                       | Access tokens last about an hour, and the app expires the session a minute early (or on a 401). Choose **Reconnect**; Google usually skips the consent screen.                                                                                                                                                                                                                                                                                                                    |
| "Google couldn't be reached"                                                     | `accounts.google.com/gsi/client` failed to load: offline, a corporate proxy, or a blocker extension. Allow `accounts.google.com` and choose Connect (it retries the load).                                                                                                                                                                                                                                                                                                        |
| Popup opens but never completes, or closes at once                               | Strict privacy settings (third-party cookie blocking, Safari cross-site tracking prevention, Brave Shields, Firefox strict mode) or extensions can interfere with Google's sign-in. Allow `accounts.google.com`, or try a normal (non-private) window. If you host the app elsewhere, don't send `Cross-Origin-Opener-Policy: same-origin`; use `same-origin-allow-popups`.                                                                                                       |
| `pnpm editor:dev` shows "Invalid app configuration"                              | `apps/editor/.env.local` is missing: `cp apps/editor/.env.example apps/editor/.env.local`.                                                                                                                                                                                                                                                                                                                                                                                        |
