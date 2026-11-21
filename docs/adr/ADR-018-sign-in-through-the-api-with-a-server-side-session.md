# ADR-018: People sign in through the API, with Google Workspace then Microsoft Entra ID, and hold a server-side session

- Status: Proposed — drafted from the owner's answers in the identity and authorisation
  grilling (2026-11-21), for the owner's acceptance; the options chosen are marked ✅.
  Once accepted, it supersedes ADR-003 for the API data source; ADR-003 stands for the
  Sheets adapter until the deployed editor switches to the API.
- Date: 2026-11-21

## Context

ADR-003 connects the editor to Google Sheets with a browser-held access token and never
learns who the user is. The API that replaces the spreadsheet (ADR-015, ADR-017) must
know who each person is: every change set names its person, a scratch is visible to its
owner alone, and row-level security reads the person and the tenant per transaction.
ADR-015 fixes the shape this ADR fills in: a person has one or more sign-in identities,
linked explicitly and never merged by email (Option 11); access is a membership granted
by a tenant admin's invitation (Option 12); writes to shared tables go to a platform
audit log (Option 27).

The owner wants sign-in with Google and Microsoft (2026-11-20): DHCW's Google Workspace
first, which today's editor already uses, then Microsoft Entra ID with single sign-on
through the NHS Wales directory, after which Google is retired (2026-11-21). Security is
the owner's first priority. The analysis behind this ADR, with its findings, is
[identity and authorisation](../analysis/identity-and-authorisation.md); the facts that
shape it:

- NHS Wales runs one Entra directory for every organisation, so a token's directory
  (`tid`) never says which tenant a person belongs to.
- An email claim is mutable and, on Entra, unverified unless its domain owner is: keying
  an account on it allows takeover.
- RFC 10017 (BCP 212) ranks a backend that runs the OAuth flow, leaving the browser only
  an `HttpOnly` cookie, as the most secure pattern for browser apps.
- The editor's GitHub Pages origin is shared with every organisation site (ADR-016).

## Decision

### The API runs the sign-in

- **The API is a confidential OpenID Connect client** for each provider: authorisation
  code with PKCE (`S256`), `state` and `nonce`, by a top-level navigation, never a
  popup, with `response_mode=query`. The browser never holds a provider token; the API
  keeps none after sign-in, since it calls no provider API. Scopes are `openid email
profile` only.
- **Providers are a fixed allow-list of exact issuers, in code**: DHCW's Google
  Workspace (`https://accounts.google.com`), then the NHS Wales directory as a
  single-tenant Entra registration (`https://login.microsoftonline.com/{tid}/v2.0`),
  never the `common` or `organizations` endpoints. The local mock provider's issuer is
  admitted only in an explicit local mode, which settings refuse in any deployed
  environment (ADR-017: an unset environment gets production rules). Adding a provider
  or directory amends this ADR.
- **Each provider has its own callback path**, and the sign-in transaction records the
  issuer it was started for, so a response from one provider cannot complete another's
  sign-in (RFC 9700, mix-up attacks).
- **ID tokens are validated in full by a maintained library**: signature against keys
  from the provider's pinned discovery document, an algorithm allow-list (`RS256`),
  exact `iss`, `aud` equal to the client ID, `exp` and `iat` within a minute's skew,
  `nonce`, and `azp` where present. Keys are cached; an unknown `kid` triggers one
  rate-limited refetch with a timeout; an unreachable key set fails closed. Tests cover
  each refused claim and a key rollover. python-jose and hand-rolled JWT parsing are
  banned (ruff banned-API); only the identity module imports the OIDC library, and only
  the session service writes sessions (import-linter).
- **The sign-in transaction is server-side**: the start endpoint stores the state, nonce,
  PKCE verifier, issuer and a return path checked against an allow-list (no open
  redirect), for ten minutes, behind a `__Host-` cookie with `SameSite=Lax` (the
  provider's redirect back is a cross-site navigation). A missing, reused or expired
  state is refused, which also defeats login CSRF. A refused sign-in lands on an editor
  route with an error code, so its copy is in English and Welsh (ADR-008).
- **Client authentication**: Google by its client secret, held in Secret Manager and
  rotated; Entra by a federated credential trusting the API's Google service account, or
  a certificate, never a client secret (confirmed in the Entra spike).
- **Local development and tests use the same code path** against a mock OIDC provider
  in Compose; there is no development-only sign-in route.

### Who a person is

- **An identity is `(issuer, subject)`**: Google's `sub`; Entra's `oid` under the NHS
  Wales directory's issuer (Entra's `sub` is pairwise per app registration). This
  refines ADR-015 Option 11's "provider and subject".
- **Email, name and other profile claims are display attributes**, refreshed at each
  sign-in, never a key: no lookup, link or grant matches on them, except an invitation's
  address below.
- **Google sign-in admits DHCW's Workspace only** (Option 3): an Internal OAuth client
  in DHCW's Workspace organisation, and the API also refuses a token whose `hd` is not
  on the allow-list or whose `email_verified` is not true.
- **No MFA requirement in the API for now** (Option 6): sign-in is as strong as the
  provider's own policy makes it, for every role. This is an accepted risk, revisited
  when Entra lands; the API refuses nothing on MFA claims it cannot rely on (Entra's
  v2.0 ID token carries none by default). With Entra, MFA and who may sign in at all are
  enforced by the NHS Wales directory: Conditional Access, and assignment required to
  the app's group.

### Getting in

- **A person record is created only when an invitation is redeemed** (Option 5). A
  sign-in by someone with no person record and no invitation is refused, writes nothing
  but a log line, and lands on "You haven't been invited". No one in the 125,000-strong
  directory leaves a row by trying.
- **An invitation is a single-use link and a matching verified email** (Option 4): a
  256-bit token, stored only as its SHA-256 hash, expiring after seven days, naming the
  tenant, the invited address, its provider and the roles. It is redeemed by a sign-in
  whose verified email (Google: `email` with `email_verified`; Entra: the claim named in
  the Entra spike, guests excluded) equals the invited address, compared case-folded.
  A forwarded link alone, or a spoofed email alone, admits nobody. A redeemed, revoked or
  expired invitation is refused with one code. Redeeming an invitation adds a membership
  to an existing person when that person is the one signed in.
- **The admin copies the invitation link** and sends it themselves (Option 7). The API
  sending email is a later decision.

### Linking identities and the move to Entra

- **Only the person attaches an identity** (Option 8): signed in, they complete a fresh
  sign-in with the other provider in the same browser, and the new identity becomes
  theirs. **The person removes one** (never their last), **or a platform operator does**.
  A tenant admin does neither: people are shared across tenants, so an admin of one
  tenant attaching or removing an identity would take over, or lock out, a person's
  access to another. A tenant admin ends a membership instead. This narrows ADR-015
  Option 11's "or by an admin" (_Consequences_).
- **Production may start on Google** (Option 2). When Entra lands, each person adds
  their NHS Wales Microsoft account while signed in with Google; on a date announced in
  advance, Google sign-in stops entirely (Option 9). Anyone who did not link is
  re-invited with their NHS Wales address and starts as a new person; their past change
  sets keep their old person.

### Sessions

- **A session is an opaque row in PostgreSQL** (Option 1): a 256-bit random ID in the
  cookie, only its SHA-256 hash stored, with the person, the identity and time of the
  sign-in, last activity, an idle and an absolute expiry, and revocation. It is found by
  hash through a definer function, as ADR-015's sign-in lookup is.
- **The cookie is `__Host-`, `Secure`, `HttpOnly`, `SameSite=Strict` and `Path=/`, with
  no expiry attribute.** A browser that restores sessions keeps it, so the server's
  timeouts, not the browser, end a session.
- **A session ends after 60 minutes without a request to the API, or 10 hours after
  sign-in, whichever comes first** (Option 10), both enforced by the API (ASVS 5.0 V7;
  NIST SP 800-63B-4 sets 1 and 24 hours for AAL2). A leaver disabled in Workspace or
  Entra keeps an open session at most that long.
- **Every request re-reads the session, the person and, for a tenant route, the
  membership and its roles**, and refuses a disabled person: removing a member, a role
  or a person bites on the next request. Last activity is written at most once a
  minute.
- **The session ID is replaced at sign-in and at linking an identity.** Signing out
  revokes the row and expires the cookie (no `Clear-Site-Data` for cookies, which would
  clear every site on the registrable domain); it does not sign the person out of the
  provider (Option 11). The next sign-in in that browser asks the provider to show its
  account picker (`prompt=select_account` for Google, and the Entra equivalent), so the
  next person at a shared desk cannot slip into the last one's account. "Sign out
  everywhere" revokes all the person's sessions.
- **Step-up is not required on Google**, which gives the API no proof of when or how a
  person last authenticated; access changes rely on the session lifetimes and on each
  being an attributed change set. With Entra, access changes and redaction will require
  an Entra authentication context (Option 12); that amends this ADR when Entra lands.

### The editor

- **The editor and the API share one origin in every environment** (Option 13):
  locally, Vite's dev server proxies `/api` to the API; hosted, one Cloud Run service
  serves the editor's built files and the API, and the API sets the editor's document
  headers; once the editor has its custom domain, the load balancer fronts that service.
  The editor's endpoints therefore send no CORS headers at all, replacing ADR-017's
  allow-list. **The public read has its own host**, with open CORS and no cookies
  (ADR-017), and its routes never read a session.
- **A state-changing request needs same-origin proof:** `Sec-Fetch-Site: same-origin`,
  or, where a browser sends no Fetch Metadata, an `Origin` equal to the editor's; else it
  is refused. A body must be `application/json`. No `GET` changes anything (tested).
  `SameSite=Strict` is a second layer: a host on the same registrable domain is
  same-site, not same-origin.
- **The editor's `AuthClient` is reshaped for the API data source**: `connect()` is a
  navigation to the API's sign-in start for the chosen provider; the state comes from a
  "who am I" call; the access token disappears from the port (ADR-016's tokens in
  memory become no token in the browser at all). A 401 moves the state to `expired`.
- **Expiry keeps an open form** (Option 14): two minutes before the idle limit the
  editor's session warning offers "Stay signed in", which extends it; before the
  absolute limit, and after any expiry, "Sign in again" opens the sign-in in a new tab,
  and the original tab re-checks "who am I" when it regains focus. Any request to the
  API counts as activity.
- **The account menu shows the person's name and their tenant** (Option 15), with a
  tenant switcher only for someone in more than one; the email is on the account page.
  ADR-003's "we never claim to know who the user is" ends with the Sheets adapter.

### Records, logs and limits

- **New shared tables** (ADR-015 _Tenancy_, amended): sessions and sign-in
  transactions, each with row-level security, visible only through their definer
  lookups and to the person they belong to. **Invitations are tenant-owned** and name an
  address, not a person, until they are redeemed; the redeemer has no tenant set yet, so
  redemption finds an invitation by its token hash through a definer function. New
  definer functions, each with a pinned `search_path` and `EXECUTE` revoked from
  `PUBLIC`: the session lookup, the transaction lookup and the invitation lookup.
- **Security events tied to a person go to the platform audit log** (ADR-015 Option
  27): signed in, signed out, session revoked, identity linked or removed, invitation
  created, redeemed or revoked, person disabled. Access changes are already change sets.
  **Unauthenticated failures** (a refused callback, an uninvited sign-in) go to the
  structured log on stdout only, never the database.
- **Logs carry IDs, never tokens, cookies, codes, ID tokens or email addresses**;
  redaction is by an allow-list of fields.
- **Retention, until the data protection assessment sets it** (Option 16): sign-in
  transactions deleted after a day, ended sessions after 30 days, spent or expired
  invitations after 90 days, security events kept two years; deleted by scheduled API
  jobs (ADR-017).
- **Rate limits live at the edge** (Option 17, EPC-023): per-address limits on sign-in
  and on the public read, and a capped instance count. The API adds only a cap on
  invitations created per admin, once invitations are emailed.
- **API responses** carry `Cache-Control: no-store` when signed in, `nosniff`,
  `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` and a
  same-origin resource policy; a body size limit (middleware, since Starlette sets
  none); a host allow-list; validation errors in ADR-017's envelope without the
  submitted input; no `/docs` or live OpenAPI route in production.

### Assurance

- **A threat model** of sign-in, sessions, invitations and linking is written with the
  first identity story and reviewed by DHCW's cyber security team; **an independent
  penetration test** comes before the deployed editor switches to the API (Option 18).

## Consequences

- **Accepted risks** (owner, 2026-11-21): no MFA evidence on Google sign-in, for every
  role, until Entra; up to 10 hours of access for a leaver whose session is open; no
  step-up on Google.
- **ADR-015 is amended** when this is accepted: Option 11's linking narrows to the
  person (attach, remove) and platform operators (remove); the shared tables and the
  closed list of definer functions gain those above; an invitation exists before its
  person, rather than as a pending membership of one.
- **ADR-017 is amended**: no CORS for the editor's endpoints; the API serves the
  editor's built files and document headers in hosted environments; a body size limit
  and no production docs route.
- **ADR-016's custom domain** stays a precondition of switching the deployed editor; the
  one-service hosting covers environments before it.
- **The `AuthClient` port, the session warning (STY-017) and the reconnect-from-action
  flow (STY-057)** change shape for the API data source in the switch-over epic; the
  Sheets adapter keeps ADR-003 until then.
- **Entra needs NHS Wales directory governance**: the app registration, its group
  assignment and Conditional Access are requested from the directory's administrators
  early, since production on Google is the fallback, not the aim.
- **Follow-on work**: the identity stories of EPC-022 (schema, sign-in with Google and
  the mock provider, sessions, invitations, the editor's adapter), a later Entra story
  with its spike (the email claim, client authentication, authentication context), and
  EPC-023 for the edge, the domain and the provider registrations.

## Options (owner's choice marked ✅, 2026-11-21)

1. **Where the session lives** — ✅ the API as OIDC client, an opaque PostgreSQL session
   behind an `HttpOnly` cookie. Lost: the API minting its own JWT and refresh token
   (permissions stale until expiry, signing keys and refresh families to guard); the
   editor holding provider tokens (within reach of page scripts, left on shared
   workstations). An identity broker (a third party in every sign-in, browser-persisted
   tokens) and IAP as the app's identity (cloud lock-in, no local path) were rejected in
   the analysis.
2. **Which provider first** — ✅ Google Workspace now, Entra next, so EPC-022 does not
   wait on directory governance; production may start on Google. Lost: Entra first;
   both together; the switch-over waiting for Entra.
3. **Which Google accounts** — ✅ DHCW's Workspace only (Internal client, `hd` and
   `email_verified` checked). Lost: any invited Google account (no control the app can
   rely on); named Workspace domains.
4. **Redeeming an invitation** — ✅ the link and a matching verified email. Lost: the
   email alone (access on an email claim); the link alone (a forwarded link admits the
   wrong person).
5. **When a person record is created** — ✅ when an invitation is redeemed. Lost: at
   first sign-in (rows for people who never use the tool).
6. **MFA** — ✅ none required for now; the provider's own policy. Lost: accepting
   Workspace 2-Step Verification once confirmed; admins waiting for Entra.
7. **Delivering an invitation** — ✅ the admin copies the link; email later.
8. **Who links identities** — ✅ the person attaches; the person or a platform operator
   removes. Lost: ADR-015's "or by an admin" (cross-tenant takeover or lock-out).
9. **Moving to Entra** — ✅ each person links, then Google stops on an announced date.
   Lost: re-inviting everyone (history split across two person records); an operator
   mapping by email (the matching Option 11 forbids). And once Entra works, ✅ Google is
   retired entirely, over retiring it only for people holding Entra and keeping both.
10. **Lifetimes** — ✅ 60 minutes idle, 10 hours absolute. Lost: 30 minutes and 8
    hours (interruptions mid-edit); 8 and 24 hours (a day on a shared desk).
11. **Signing out** — ✅ the app only, then the account picker. Lost: signing out of the
    provider too (signs people out of Microsoft 365); the app only with nothing more
    (one-click sign-in into the last person's account).
12. **Step-up** — ✅ none on Google, an Entra authentication context later. Lost:
    re-sign-in on Google (proves nothing); no step-up ever.
13. **Origins** — ✅ the editor and API on one origin in every environment, one Cloud
    Run service before the custom domain; the public read on its own host. Lost:
    separate origins with credentialed CORS; a load balancer and subdomain from day
    one; Firebase Hosting rewrites (only a cookie named `__session` reaches the API).
14. **Expiry in the editor** — ✅ warn, extend the idle limit, sign in again in a new
    tab. Lost: a redirect that loses an open form; today's flow unchanged.
15. **The account menu** — ✅ name and tenant. Lost: name only; nothing, as today.
16. **Retention** — ✅ defaults until the data protection assessment confirms them.
17. **Rate limits** — ✅ at the edge, plus an invitation cap once emailed. Lost: API
    counters in PostgreSQL (database writes from unauthenticated traffic).
18. **Assurance** — ✅ a threat model now, a penetration test before the switch-over.
