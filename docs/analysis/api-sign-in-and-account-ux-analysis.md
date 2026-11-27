# API-mode app shell, sign-in, Account and session expiry — UX analysis

- **Date**: 2026-11-26
- **Question**: how should the Roadmap Editor's app shell, sign-in and refusal landing, Account
  page, and session-expiry flows shift from Google Sheets connection mode to the API
  data source in `STY-109` (single-tenant DHCW UI, leaving clean room for `EPC-030`'s
  multi-tenant switcher, `EPC-025`'s `Members` utility slot and `EPC-028`'s Entra ID
  identity linking)?
- **Scope**: the authenticated desktop (1280px open sidebar and 64px folded rail) and
  phone (375px open `AccountMenu`, open navigation drawer, and English/Cymraeg width
  check) app shell (`AppShell`, `AppHeader`, `NavigationSidebar`, `NavigationDrawer`,
  `AccountMenu`); the unauthenticated sign-in landing, refusal screens (`not_invited`,
  `person_disabled`, `sign_in_failed`) and signed-in zero-membership screen (`No
organisation access`) in a clean header-only shell; the Account page and `Sign out
everywhere` confirmation; and the adapted API-mode session warnings (idle and
  pre-absolute-limit), post-expiry / 401 new-tab re-sign-in and different-person
  tab-focus discard notice (`STY-108` D2–D10, supporting `STY-109`). Base `99d77e0f`.
  Only documents and one prototype page were added; no application code, and no
  correction to the `ux-prototypes` skill's `mock.css` or starter (the page's shared
  stylesheet adds the 1280px desktop frame, navy sidebar/rail, phone navigation drawer,
  header-only shell and Account page panels strictly from
  `apps/editor/src/styles/globals.css` semantic tokens). Because `STY-108` D10 amended
  D3 to run ahead of `STY-107`, the designs ground against the planned `/me` shape and
  refusal codes in `ADR-018`, `ADR-019`, `STY-106`, `STY-107` and `STY-109` and flag
  unsettled wire details in _Decisions needed_.
- **Prototypes**: one self-contained page of **frames**,
  [`api-sign-in-and-account-ux-prototypes.html`](api-sign-in-and-account-ux-analysis/api-sign-in-and-account-ux-prototypes.html).
  The frames shape fits because every decision is about screen structure, chrome
  placement, state visibility and cross-screen flow rather than fine interaction inside
  a single editing control (`STY-108` D5). Eight designs across four journeys (3, 2, 2
  and 1), 25 desktop-and-phone artboards in total.
- **Sample world**: invented for Thursday 26 November 2026 (`26 Tachwedd 2026`). Tenant:
  `Digital Health and Care Wales` (slug `dhcw`; Welsh `Iechyd a Gofal Digidol Cymru`,
  folded-rail mark `DHCW`). Signed-in user in Journeys 1, 3 and 4: **Carys Evans**
  (`CE`, `carys.evans@wales.nhs.uk`, Google Workspace, last signed in `26 November 2026
at 09:14`, role **Product Lead**). Uninvited staff member in Journey 2: **Owen
  Thomas** (valid DHCW Google account, no person record). Signed-in user with zero
  active memberships in Journey 2: **Sian Morgan** (`SM`, `sian.morgan@wales.nhs.uk`).
  Different person who signs in on the browser in Journey 4: **Gareth Davies** (Admin).
  Realistic roadmap list canvas (per `STY-108` D8): **6 roadmaps, 1 not published**, in
  three product families — **Citizen Services** (`NHS Wales App` Live, `Patient
messaging` Beta · Not published), **Medicines & Diagnostics** (`Electronic
prescribing` Live, `Pathology results` Beta) and **Single Record** (`Shared care
record` Live, `Community nursing notes` Discovery); all three families (6 cards) are
  present in each list canvas behind the viewport clip. In Journey 4, `NHS Wales App` is
  open on `Now` with **2 unpublished changes** (`1 roadmap has unpublished changes` in
  the sidebar: `"Hospital appointment reminders"` moved up and `"Repeat prescription
status updates"` changed). Planted awkward cases: `Digital Health and Care Wales` (29
  characters) and `Iechyd a Gofal Digidol Cymru` (28 characters) in shell chrome;
  `Mapiau Trywydd` beside the menu, language and account buttons at 375px; `Community
nursing notes` wrapping in the 256px sidebar. Welsh frames reuse
  `apps/editor/src/i18n/locales/cy.ts` verbatim (`Iechyd a Gofal Digidol Cymru` logo
  alt, `Mapiau Trywydd`, `Dewislen`, `Iaith`, `Cyfrif`, `Beta`, phase banner, `Cau'r
neges`, `Eich mapiau trywydd`, `6 map trywydd, 1 heb ei gyhoeddi`, `Ychwanegu map
trywydd`, `Adnewyddu`, `Arweinydd cynnyrch`, `Diweddarwyd`, `Heb ei gyhoeddi`);
  **draft Welsh** drawn for prototype measurement is `Gwasanaethau Dinasyddion`,
  `Meddyginiaethau a Diagnosteg`, `Cofnod Sengl` (family titles) and `Sefydliad: Iechyd
a Gofal Digidol Cymru` (1C phone org strip).

## Readers and where they are

Three internal NHS Wales personas use the editor (DHCW first; nothing one tenant holds
is visible to another, ADR-015):

- **Product Lead** ([product-lead.md](../backlog/personas/product-lead.md)): spends about
  30 minutes a week updating public roadmaps (A1), primarily on desktop with phone as a
  secondary device for quick checks and small edits (A2). Sign-in is plumbing — they
  need to get in without jargon, keep open changes safe through an expired session (A9,
  A10), and know which organisation they are acting in (A14).
- **Tenant Admin** ([tenant-admin.md](../backlog/personas/tenant-admin.md)): typically a
  dual-hatted senior Product Lead or delivery manager who lands on the same roadmap list
  and reaches occasional admin tasks (members, invitations, lists) without the editor
  turning into an admin console (T1, T2). Desktop-primary, phone supported for urgent
  checks (T2).
- **Viewer** ([viewer.md](../backlog/personas/viewer.md)): visits occasionally, often
  from a shared roadmap link before a governance or communications review (V1, V2),
  desktop-primary with phone supported. Needs calm orientation (which organisation,
  their read-only role on Account) without noisy error chrome (V3).

Unauthenticated staff, uninvited staff (`not_invited`), disabled accounts
(`person_disabled`) and signed-in people whose memberships have all ended (`No
organisation access`) arrive on the entry routes before entering any tenant workspace.
Every screen must hold bilingual English and Welsh interface copy (ADR-008), including
keeping `Mapiau Trywydd` on one line at 375px (`apps/editor/tests/e2e/shell.spec.ts`).

## Journeys covered

| Group                                          | Journeys                                                                                                                                                                                                                                                                    | Stories                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1. Authenticated shell, identity & org context | Desktop 1280px open sidebar and 64px folded rail; named person + DHCW context; `AccountMenu` (Theme, Edit surface, Account, Sign out, `EPC-030` room); future `Members` utility slot beside Families; phone 375px open menu, open navigation drawer and Cymraeg width check | STY-108 (S1, S2, D4, D7, D8), STY-109 (S2, D1–D3, D5)        |
| 2. Sign-in, refusal & zero-membership landing  | Clean header-only shell; Sign in with Google landing; "You haven't been invited" (`not_invited`); failed sign-in notice (`sign_in_failed`); "No organisation access" (zero memberships, signed in)                                                                          | STY-108 (S1, S2, D5, D6), STY-109 (S1, D4), STY-106 (S1, S2) |
| 3. Account page                                | View display name, sign-in identity (provider, email, last sign-in, room for `EPC-028` Entra linking), organisation membership and role (room for `EPC-030`), and "Sign out everywhere" confirmation                                                                        | STY-108 (S1, S2, D4, D5), STY-109 (S3, D1)                   |
| 4. API-mode session expiry & re-sign-in        | 2-minute idle warning (`Stay signed in` via `/api/v1/auth/extend` or `Sign out`); 2-minute pre-absolute-limit warning (`Sign in again` in a new tab or `Sign out`); post-expiry / 401 (`Sign in again` in a new tab keeping open edits); different-person discard notice    | STY-108 (S1, D5), STY-109 (S4), STY-106 (S3)                 |

Persona assumptions relied on: Product Lead A1, A2, A4, A9, A10, A14; Tenant Admin T1,
T2; Viewer V2, V3.

**Excluded** (and why):

- **Invitation acceptance (`STY-112`) and Members & invitations (`STY-113`)**: removed
  from `STY-108` by D2; prototyped just-in-time in `EPC-025` after each story is
  grilled. Only the sidebar utility slot (`Members` beside `Families, categories and
organisations`) is placed here per D8.
- **Multi-tenant switcher, multi-tenant `/` landing/picker and joining a second tenant**:
  deferred to
  [EPC-030](../backlog/EPC-030-multi-tenant-organisation-switching-and-onboarding-ux/README.md)
  per D4 and ADR-018 _STY-108 amendments_. Clean room is reserved in `AccountMenu`, the
  shell and the Account page.
- **Microsoft Entra ID sign-in and identity linking/removal**: deferred to `EPC-028`.
  Clean room is reserved on the Sign-in and Account screens.
- **Sheets mode screens**: untouched (`STY-109` S5).
- **Roadmap scratch, shared draft, history, unassigned peer roadmaps and Viewer roadmap
  views**: `EPC-027`.
- **Six-monthly access review (`STY-114`) and ask-for-access (`STY-094`)**: later
  `EPC-025` stories.

## What every design shares

- **DHCW visual system (ADR-010)**: navy header and left sidebar (`#1b365d`), active
  blue `#0056b3` current-page highlight, DHCW full logo on desktop and knot icon on
  phone, compact type scale, square cards with bottom bar, centred `AlertDialog` on
  desktop and phone, yellow focus indicator and semantic tokens that carry over to dark
  theme automatically.
- **Voice and vocabulary (`copywriter`, `docs/GLOSSARY.md`)**: plain British English in
  sentence case. API-mode copy retires Sheets' `Connect` / `Disconnect` / `Reconnect` /
  `Stay connected` for `Sign in` / `Sign out` / `Sign in again` / `Stay signed in`. No
  internal jargon (`OIDC`, `cookie`, `token`, `401`, `tenantSlug`, `RLS` or raw refusal
  codes) ever reaches the screen. In code and records we say **tenant** (avoiding
  confusion with a roadmap item's **Organisations** list); in staff-facing UI copy we
  follow `STY-108` D6 and `tenant-admin.md` by saying **organisation** and naming
  `Digital Health and Care Wales` (`Iechyd a Gofal Digidol Cymru` in Welsh).
- **Single-tenant DHCW UI over multi-tenant routes (D4, `STY-109` D3)**: tenant routes
  carry `/#/$tenantSlug/…` under the hood while the UI shows the active organisation as
  calm context without a tenant switcher yet, leaving room for `EPC-030` without
  restructuring the shell.
- **Clean header-only shell when outside a tenant (D6)**: Sign-in, refusals and `No
organisation access` drop the sidebar, drawer menu button and search completely.
- **Preferences stay in `AccountMenu` (D7)**: `Switch to dark theme` and `Edit in a
dialog` / `Edit in a side panel` remain inside `AccountMenu` alongside `Account` and
  `Sign out`, keeping the top bar uncluttered. Email stays on each sign-in identity on
  the Account page, never in the header, menu or person-level profile header (ADR-018
  §Who a person is, Option 16).
- **Compact 375px phone header (D7)**: the phone Account trigger is always 32px square
  (icon-only or two-letter initials), keeping `Mapiau Trywydd` on one line beside the
  menu and language buttons.
- **Future utility slot beside `Families, categories and organisations` (D8)**: every
  authenticated sidebar and phone navigation drawer design places the future `EPC-025`
  `Members` link directly beneath `Families, categories and organisations` in the bottom
  utility group (and as a users icon beneath the globe icon in the 64px rail).
- **Nothing written to the public site**: all four journeys touch identity, shell and
  session state only.

## 1. Authenticated shell, identity and organisation context

Carys Evans (Product Lead) lands on `/#/dhcw/` to check her six DHCW roadmaps on a
1280px desktop (open sidebar, open `AccountMenu`, and folded 64px rail) and on a 375px
phone (open `AccountMenu`, open navigation drawer, and Cymraeg width check). She needs
to confirm who is signed in, which organisation she is acting in, reach Account / Theme
/ Edit surface / Sign out quickly, and find tenant-level tools (`Families, categories
and organisations` and future `Members`) without crowding the header or breaking Welsh
at 375px.

| Design                                                       | Idea                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Strengths                                                                                                                                                                                                                                                                                                                                                                                                                 | Risks                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Header identity menu, quiet sidebar organisation band** | Keeps `AccountMenu` in the top-right header (`[user] Carys Evans ▾` on desktop, 32px icon-only on phone) and adds a quiet `ORGANISATION / Digital Health and Care Wales` band at the top of the navy sidebar and phone navigation drawer (folding to a compact `DHCW` monogram in the 64px rail). `AccountMenu` shows name, role badge, org name, switcher room, `Account`, Theme, Edit surface and `Sign out`.                                                                                                                    | Clean separation of concerns: **sidebar/drawer = where you are** (organisation + its roadmaps + its utilities), **top-right header = who you are and your preferences**. Zero changes to the desktop header left side (logo stays pure). When `EPC-030` arrives, the sidebar/drawer org band turns directly into a tenant switcher button with no layout move. `Mapiau Trywydd` fits with generous margin on 375px phone. | On 375px phone, the active organisation is inside `AccountMenu` and the open navigation drawer rather than permanently visible on the main canvas (fine for single-tenant DHCW; `EPC-030` will revisit phone prominence). Adds 58px above Search in the desktop sidebar.                                                                                            |
| B. Sidebar person footer, minimal header                     | Moves `AccountMenu` to a pinned footer card at the bottom of the desktop sidebar (`CE Carys Evans / Product Lead`, opening its popover to the right of the sidebar so utility links stay unobstructed; folds to `CE` circle in the 64px rail, and appears at the foot of the phone navigation drawer too). Desktop header keeps `English` alone on the right and adds a vertical divider and plain `Digital Health and Care Wales` label beside `Roadmap Editor`. Phone keeps a 32px `CE` initials button in the top-right header. | Very clean desktop header (only `English` on the right) and familiar to users of Slack/Linear-style dashboards. `CE` initials button on 375px phone fits cleanly beside `Mapiau Trywydd` while hinting that someone specific is signed in.                                                                                                                                                                                | **Splits identity location between desktop and phone** (bottom-left on desktop, top-right on phone), making keyboard Tab order and mental model diverge across viewports and differing from the header-only shell (`No organisation access` has no sidebar). Bottom-pinned footer reduces vertical room for long family lists in both the sidebar and phone drawer. |
| C. Header identity & organisation pill, unchanged sidebar    | Leaves the sidebar and phone navigation drawer identical to today's Sheets navigation (except adding the future `Members` utility slot). Places both a bordered `Digital Health and Care Wales` pill beside `Roadmap Editor` and a `CE Carys Evans ▾` trigger in the top-right header. Phone adds a 1-line `Organisation: Digital Health and Care Wales` strip below the Beta banner and keeps a 32px icon-only Account trigger.                                                                                                   | Zero vertical height added to the sidebar or drawer; organisation context remains visible in the desktop header even when the sidebar is folded to the 64px rail, and always visible on phone via the quiet strip.                                                                                                                                                                                                        | Desktop header carries four distinct elements across one bar (logo + name + 29-char org pill + Language + named Account trigger), which crowds at `1024px` (`lg` breakpoint) in Cymraeg (`Golygydd Mapiau Trywydd` + `Iechyd a Gofal Digidol Cymru` + `Cymraeg` + long user name). Phone org strip costs 32px above the first roadmap card on every page.           |

**Recommendation**: **Design 1A** (Header identity menu, quiet sidebar organisation
band), with one optional add-on to consider from 1B: using the compact 32px **initials**
trigger (`CE`) instead of the generic user icon on 375px phone (Decision 2 below). 1A
keeps one consistent top-right `AccountMenu` across desktop, phone and the header-only
shell, leaves the desktop header uncrowded at 1024px in Welsh, and gives `EPC-030` a
natural, zero-rework home for the future tenant switcher at the top of the sidebar and
phone drawer.

## 2. Sign-in, refusal and zero-membership landing

Unauthenticated visitors, uninvited DHCW staff (`not_invited`), disabled accounts
(`person_disabled`), failed sign-in callbacks (`sign_in_failed`) and signed-in people
with zero active memberships (`No organisation access`) all arrive outside any tenant
workspace. Per `STY-108` D6, every screen in this journey uses a **clean header-only
shell** (navy DHCW header + Language switcher, plus `AccountMenu` when signed in with
zero memberships; no sidebar, drawer button or search).

Note on `person_disabled`: it uses the exact same dedicated refusal layout as `ab2`
("You haven't been invited"), swapping only the heading (`Your account has been
disabled`), body (`Your Roadmap Editor access has been turned off. Contact Digital Health
and Care Wales support if you think this is a mistake.`) and removing `Try a different
account` so a disabled user is not looped back into Google.

| Design                                | Idea                                                                                                                                                                                                                                                                                                                                                                                                                       | Strengths                                                                                                                                                                                                                                                                  | Risks                                                                                                                                                                                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Left-aligned DHCW start page**   | Direct descendant of today's `StartPage` and DHCW/GOV.UK service start pages: standard white canvas, left-aligned `max-w-2xl` column, `h1`, lead sentence, DHCW `InsetText`, auto-width primary `Sign in with Google` button (full-width on phone), and top `AuthNotice` (`Couldn't sign you in`) for `sign_in_failed`. `You haven't been invited` and `No organisation access` follow the exact same calm reading rhythm. | Native to DHCW and NHS Wales digital services; zero visual jump between Sheets `StartPage` and API sign-in. Reuses `InsetText`, `AuthNotice` and `PageContainer` directly with minimal custom layout. Works effortlessly at every width and language length.               | Large open white space on wide desktop monitors (1280px+); when `EPC-028` briefly shows two provider buttons (`Sign in with Microsoft` and `Sign in with Google`), stacking them left-aligned looks looser than inside a bounded panel. |
| B. Centred single-column sign-in card | Places sign-in, refusals and `No organisation access` inside a centred `520px` bordered DHCW card (`.card.bar`) over a quiet `--muted` background, with full-width stacked action buttons inside the card.                                                                                                                                                                                                                 | Visually distinguishes the anonymous entry gate from the authenticated workspace and provides an obvious container for two stacked provider buttons during `EPC-028`'s Google → Entra overlap. Inline alerts (`sign_in_failed`) sit right above the button they relate to. | Departs slightly from DHCW/GOV.UK left-aligned start-page conventions and introduces full-width buttons on desktop (acceptable inside a narrow 520px dialog-like card, though not used elsewhere on full pages).                        |

**Recommendation**: **Design 2A** (Left-aligned DHCW start page) if consistency with
DHCW/GOV.UK service pages and today's `StartPage` is the priority; **Design 2B** if you
prefer a bounded focal card that frames future dual-provider sign-in cleanly. Either
pattern satisfies D6 and `STY-109` S1/D4 with identical copy and header-only shell; this
is a pure visual-preference choice for the owner.

## 3. Account page

Carys Evans opens `Account` from `AccountMenu` to inspect her display name, sign-in
identity (provider, email, last sign-in), her DHCW membership and role (`Product Lead`),
or to run `Sign out everywhere` (`POST /api/v1/auth/sign-out-all`) if she left another
browser signed in. Both designs keep email strictly on each sign-in identity (ADR-018
§Who a person is, since Google and Entra emails can differ), render inside the
authenticated shell (using 1A's shell framing) for members with an active tenant, and
reserve clear structural room for `EPC-028`'s Entra identity linking and `EPC-030`'s
multiple organisation memberships. (When a zero-membership user such as Sian Morgan
opens `/account`, it renders in D6's header-only shell with a back link to `No
organisation access`.)

| Design                                  | Idea                                                                                                                                                                                                                                                                                                                                                        | Strengths                                                                                                                                                                                                                                                                                | Risks                                                                                                                                                                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Single-column DHCW summary lists** | One calm `max-w-2xl` reading column with three rule-separated sections (`Your details`, `Your organisation`, `Sessions`), using GOV.UK/DHCW key-value definition lists (`<dl>`), a quiet `Sign out everywhere` button opening a centred red-confirm `AlertDialog` on desktop and phone (no corner `×`, matching `DiscardDialog` and `DisconnectQuestion`).  | Pure DHCW/GOV.UK summary-list idiom: effortless to scan vertically on desktop and phone, naturally expands when `EPC-028` adds a second sign-in identity row or `EPC-030` adds additional organisation rows. Calm tone matches a rarely visited page (no red button until confirmation). | Tall on a 375px phone (requires scrolling to reach `Sessions`). Does not expose a one-click single-tab `Sign out` beside `Sign out everywhere` (routine `Sign out` stays in `AccountMenu`).                                         |
| B. Stacked DHCW section cards           | Two-up desktop grid (`Profile and organisation` card showing display name, organisation and role beside a `Sign-in methods` card holding each identity's email and `Active` status badge, per ADR-018) over a full-width `Sessions` card offering both `Sign out` and a red `Sign out everywhere` button (guarded by the same centred confirmation dialog). | Fits comfortably above the fold on 1280px desktop without scrolling. Keeps email strictly on each identity (ADR-018) and gives `EPC-028` an obvious home for an `"Add Microsoft account"` button and linked-identity badges.                                                             | Solid red `Sign out everywhere` button on the main page raises visual temperature on a calm read-only screen (`copywriter` rule 2: reserve red for destructive confirmation or actual loss). Slightly busier card borders on phone. |

**Recommendation**: **Design 3A** (Single-column DHCW summary lists), optionally taking
3B's `Active` status tag inside the sign-in identity row when `EPC-028` adds a second
identity. 3A stays visually calm, matches DHCW/GOV.UK summary lists, avoids putting a
loud red button on the resting page (reserving red for the `Sign out everywhere?`
confirmation dialog), and scales cleanly to multiple identities and organisations.

## 4. API-mode session expiry and re-sign-in

Carys Evans has `NHS Wales App` open on `Now` with **2 unpublished changes** (`1 roadmap
has unpublished changes` in the sidebar and `2 unpublished changes` in the pinned foot
bar). Four moments adapt today's `SessionWarning`, `ReconnectDialog` and `AuthNotice`
to ADR-018 Option 15 and `STY-109` S4 (keeping `AlertDialog` centred on both desktop
and phone, matching `apps/editor/src/components/ui/alert-dialog.tsx`):

1. **2-minute idle warning (`d8-ab1`)**: centred `AlertDialog` (with manual close `×`,
   matching `SessionWarning`) counting down (`1 minute and 48 seconds`), offering
   primary `Stay signed in` (`POST /api/v1/auth/extend`, extending the 60-minute idle
   limit without leaving the page) or secondary `Sign out`, reassuring Carys that her 2
   unpublished changes stay in this tab.
2. **2-minute pre-absolute-limit warning (`d8-ab2`)**: centred `AlertDialog` (with
   manual close `×`) shown two minutes before the 10-hour absolute limit when
   `POST /api/v1/auth/extend` can no longer extend the session (`STY-106` S3): keeps the
   `"Your session is about to end"` heading and live countdown (`1 minute and 48
seconds`), swapping the primary action to `Sign in again` (with external-link icon
   and screen-reader `(opens in a new tab)`) beside `Sign out`.
3. **Post-expiry / 401 (`d8-ab3`)**: centred `AlertDialog` (no corner `×`, matching
   `ReconnectDialog`) keeping the roadmap and its 2 unpublished changes intact behind
   the scrim, heading `"Your session has expired"`, offering primary `Sign in again`
   (opens in a new tab) and `Cancel`.
4. **Tab-focus different-person discard (`d8-ab4`)**: when Carys's tab regains focus,
   `GET /api/v1/me` detects that Gareth Davies signed in on the browser. Per ADR-018
   Option 15, the tab discards the 2 changes unsent, clears cached queries, and lands on
   the clean header-only Sign-in page with a dismissible destructive `AuthNotice` (red
   border per `copywriter` rule 2, because pending edits were lost): _"Someone else
   signed in on this browser. Your changes in this tab were discarded and this tab was
   signed out. Sign in with your account to continue."_

| Design                                                                                               | Idea                                                                                                                                                                                                                                                                                                                                                                                                                                      | Strengths                                                                                                                                                                                                                                                                                                | Risks                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Idle warning, pre-absolute warning, post-expiry new-tab re-sign-in & different-person discard** | Direct API-mode adaptation of `SessionWarning`, `ReconnectDialog` and `AuthNotice`: keeps exact DHCW centred `AlertDialog` geometry, live countdown announcements and pinned foot bar, swapping Sheets verbs (`Stay connected`, `Reconnect`) for API verbs (`Stay signed in`, `Sign in again` in a new tab), separating the pre-absolute-limit warning from post-expiry / 401, and adding the destructive notice on cross-person discard. | Zero relearning for Product Leads moving from Sheets to API. Preserves open edits across idle extension, pre-absolute warning and post-expiry / 401 re-sign-in. Explicitly flags new-tab opening to both sighted and screen-reader users. Clearly states loss and next step if another person signed in. | Relies on the user returning to the original tab after completing OIDC sign-in in the new tab (the new tab itself should either close cleanly or show a short `"You're signed in — you can return to your other tab"` confirmation; see Decision 8). |

**Recommendation**: **Design 4A** as drawn, settling Decisions 7–8 below before
`STY-109` builds it.

## Decisions needed

Each row is an owner choice to record in _Outcome_ (and carry into `STY-109` on this same
PR per `STY-108` D9), including rules the prototypes chose and unsettled `STY-106` /
`STY-107` contract details surfaced because `STY-108` ran ahead of `STY-107` (D10).

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Options                                                                                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Journey 1 — Authenticated shell & identity placement** (`STY-108` S2, `STY-109` S2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | **(a) 1A — Header identity menu + quiet sidebar org band (recommended)**; (b) 1B — Sidebar person footer + minimal header; (c) 1C — Header org pill + unchanged sidebar                                                                                                  |
| 2   | **Phone 375px Account trigger mark** (`STY-108` D7) — both fit beside `Mapiau Trywydd` on one line                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | **(a) Icon-only user mark (recommended — matches Sheets mode and avoids ambiguity for single-name or hyphenated names)**; (b) Two-letter initials (`CE`) as in 1B                                                                                                        |
| 3   | **Journey 2 — Sign-in, refusal & zero-membership layout** (`STY-108` S1, D6; `STY-109` S1, D4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | **(a) 2A — Left-aligned DHCW start page (recommended for DHCW consistency)**; (b) 2B — Centred single-column card (tighter container for future dual-provider sign-in)                                                                                                   |
| 4   | **Journey 3 — Account page layout** (`STY-108` S1, `STY-109` S3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | **(a) 3A — Single-column DHCW summary lists (recommended)**; (b) 3B — Stacked DHCW section cards                                                                                                                                                                         |
| 5   | **Shell wrapping `/account` when the user has an active organisation** (`STY-108` S2, `STY-109` D3) — zero-membership `/account` always uses D6's header-only shell                                                                                                                                                                                                                                                                                                                                                                                                                                                   | **(a) Full authenticated shell with sidebar and `Back to roadmaps` link, as drawn (recommended — keeps navigation one click away)**; (b) Header-only shell for `/account` regardless of membership                                                                       |
| 6   | **Refusal error routing split** (`STY-109` S1) — prototypes show a dedicated screen for `not_invited` (and `person_disabled`), and a dismissible `AuthNotice` on Sign-in for retryable `sign_in_failed`                                                                                                                                                                                                                                                                                                                                                                                                               | **(a) Split as drawn: dedicated refusal screen for `not_invited` / `person_disabled`, inline `AuthNotice` on Sign-in for retryable `sign_in_failed` (recommended)**; (b) Dedicated screen for all refusal codes                                                          |
| 7   | **Sign out / Sign out everywhere with pending edits** (before `EPC-027` server scratch exists)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | **(a) Confirm before discarding held edits (reusing a simplified version of Sheets' discard warning, without a "keep changes" option since another person may sign in next) (recommended)**; (b) Sign out immediately, discarding held edits                             |
| 8   | **New-tab re-sign-in return UX** (`STY-109` S4, Journey 4 `ab2`/`ab3`) — what the newly opened tab shows once OIDC callback finishes when launched from "Sign in again"                                                                                                                                                                                                                                                                                                                                                                                                                                               | **(a) Show a brief `"You're signed in — you can close this tab and return to your work"` message (with a link to roadmaps) (recommended — avoids leaving two duplicate workspaces open)**; (b) Land normally on `/#/dhcw/`                                               |
| 9   | **Future `Members` sidebar slot in `STY-109`** (`STY-108` D8) — shown in 1A–1C to settle placement beside `Families, categories and organisations`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | **(a) Omit `Members` in `STY-109` and add it in `STY-113` (`EPC-025`) in the exact slot settled here (recommended — no dead/stub nav link)**; (b) Render a disabled/coming-soon link in `STY-109`                                                                        |
| 10  | **Role permissions summary on Account page** (`STY-109` S3) — prototypes show a one-line plain-language summary of what `Product Lead` (or `Admin` / `Viewer`) can do                                                                                                                                                                                                                                                                                                                                                                                                                                                 | **(a) Show one-line plain-language summary per shipped role (recommended — helps Viewers and new leads understand their access)**; (b) Show role badge alone                                                                                                             |
| 11  | **Contract details deferred to `STY-106` / `STY-107` grilling** (surfaced by `STY-108` D10): exact refusal query codes (`not_invited`, `person_disabled`, `sign_in_failed`), `lastSignInAt` field presence on `/me` identities, URL-tenant-removed notice copy (`STY-109` D3), and whether `POST /api/v1/auth/sign-in` always passes `prompt=select_account` to Google or accepts an explicit account-picker parameter so `"Try a different account"` (`d4-ab2`, `d5-ab2`) does not silently loop the same uninvited Google account (`STY-106` S1/S3 currently specify `prompt=select_account` only after `sign-out`) | **(a) Confirm these wire names and the `prompt=select_account` contract when `STY-106` and `STY-107` are grilled, keeping `STY-108` designs decoupled from raw code names (recommended)**; (b) Pin exact query parameter, account-picker flag and refusal code names now |

## Not yet drawn

- **Dark theme artboards**: all frames use `globals.css` semantic tokens (no hardcoded
  colours), so dark theme follows automatically via `.dark`; dedicated dark captures
  will be verified during `STY-109` build (`screenshots.md`).
- **OIDC callback loading screen (`/auth/callback`)**: brief transitional `"Signing you
in…"` spinner state while `GET /api/v1/me` resolves before redirecting to `/#/dhcw/`.
- **Dedicated `person_disabled` refusal frame**: shares the exact layout of `ab2` ("You
  haven't been invited") without the `Try a different account` button; copy is specified
  under Journey 2 above.
- **URL-tenant-removed discard notice** (`STY-109` D3): when `/me` refresh shows the
  tab's URL tenant (`/$tenantSlug/`) is no longer an active membership, the tab discards
  held state unsent and routes to `No organisation access` (or the next active tenant in
  `EPC-030`) with a notice matching Journey 4 `ab4`'s pattern.
- **Waiting state after opening the new-tab re-sign-in** (`ab2`/`ab3` follow-up) and the
  confirmation message in the new tab (Decision 8).
- **Zero-membership `/account` view**: identical to 3A/3B inside D6's header-only shell,
  showing `"You don't belong to any organisations yet"` in place of the DHCW row and a
  back link to `No organisation access`.
- **Welsh review of drawn draft strings and upcoming `STY-109` copy**: the drawn draft
  Welsh strings (`Gwasanaethau Dinasyddion`, `Meddyginiaethau a Diagnosteg`, `Cofnod
Sengl`, and `Sefydliad: Iechyd a Gofal Digidol Cymru`) plus upcoming `STY-109` strings
  (such as `Allgofnodi` and the new sign-in/Account/session copy) will go through
  `copywriter` and full `cy.ts` catalogue parity in `STY-109` (human Welsh review before
  launch per ADR-008).

## What does not change

- **Google Sheets mode (`VITE_DATA_SOURCE=sheets` or unset)**: `StartPage`,
  `Connect Google`, `AccountMenu` (`Disconnect`), `SessionWarning` (`Stay connected`),
  `ReconnectDialog` (`Reconnect`), flat routes and every existing Sheets E2E spec stay
  unchanged (`STY-109` S5).
- **Sidebar roadmap navigation features**: search box, collapsible product families,
  `Close all` / `Open all`, draggable desktop width, 64px folded rail initials/tooltips,
  and unpublished-change dots/filter count stay unchanged.
- **Phase banner and footer**: DHCW `Beta` dismissible banner and footer (`© Digital
Health and Care Wales`, `View on GitHub`, version) stay unchanged.
- **Public site (`apps/public-site/`)**: completely untouched.

## Related

- [STY-108: UX prototypes for sign-in, account, invitation acceptance and members management](../backlog/EPC-024-tenancy-sign-in-and-optional-api-mode/STY-108-ux-prototypes-for-sign-in-account-invitation-acceptance-and-members-management.md)
- [STY-109: Editor sign-in, session expiry, tenant switcher and account page on the API](../backlog/EPC-024-tenancy-sign-in-and-optional-api-mode/STY-109-editor-sign-in-session-expiry-tenant-switcher-and-account-page-on-the-api.md)
- [EPC-024: Tenancy, sign-in and optional API mode](../backlog/EPC-024-tenancy-sign-in-and-optional-api-mode/README.md)
- [EPC-025: Tenant members and invitations](../backlog/EPC-025-tenant-members-and-invitations/README.md)
- [EPC-030: Multi-tenant organisation switching and onboarding UX](../backlog/EPC-030-multi-tenant-organisation-switching-and-onboarding-ux/README.md)
- [ADR-008: Internationalisation — English and Welsh](../adr/ADR-008-internationalisation-english-and-welsh.md)
- [ADR-010: Align the UI with the DHCW design system](../adr/ADR-010-align-the-ui-with-the-dhcw-design-system.md)
- [ADR-018: People sign in through the API and hold a server-side session](../adr/ADR-018-sign-in-through-the-api-with-a-server-side-session.md)
- [ADR-019: The API authorises every route by a declared policy](../adr/ADR-019-the-api-authorises-every-route-from-a-permission-catalogue-in-code.md)
- [Product Lead persona](../backlog/personas/product-lead.md),
  [Tenant Admin persona](../backlog/personas/tenant-admin.md),
  [Viewer persona](../backlog/personas/viewer.md)
- [Prototypes HTML page](api-sign-in-and-account-ux-analysis/api-sign-in-and-account-ux-prototypes.html)
