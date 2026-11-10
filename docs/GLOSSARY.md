# DHCW Roadmap Editor

The shared vocabulary for Product Leads managing their public-facing roadmaps.
Interface copy speaks the user's words below; code speaks the same words, and data-source
words stay inside infrastructure (ADR-002). Terms marked _(planned)_ name things the
product brief describes and the code does not have yet.

## Language

### People

**Product Lead**:
The person accountable for a DHCW product who manages that product's roadmaps in this
tool; the primary user (`docs/backlog/personas/product-lead.md`).
_Avoid_: Product owner, admin, editor

**Public reader**:
Anyone outside DHCW who reads a published roadmap. They never use this tool, but every
roadmap item is written for them.
_Avoid_: Customer, end user

### Roadmaps

**Roadmap**:
A product's public plan, in the Now / Next / Later format, managed by its Product Lead.
Each roadmap is one visible worksheet of the connected spreadsheet today, but its
identity is opaque and outlives the data source.
_Avoid_: Sheet, worksheet, tab, board

**Horizon** _(planned)_:
One of a roadmap's three columns: **Now** (being worked on), **Next** (coming up) and
**Later** (intended, further out). A roadmap item sits in exactly one horizon. Horizons
are not dates.
_Avoid_: Column, lane, quarter, phase

**Roadmap item** _(planned)_:
One piece of work on a roadmap: a title, a description, expected outcomes, tags and any
other details that help a public reader. It fits on one card no bigger than a phone
screen.
_Avoid_: Ticket, task, feature, epic, story

**Expected outcome** _(planned)_:
The change a roadmap item should bring about for patients, staff or the public, in their
terms rather than as an output delivered.
_Avoid_: Deliverable, benefit, KPI

**Tag** _(planned)_:
A short label on a roadmap item for grouping and filtering, such as a theme or an
audience.
_Avoid_: Label, category, keyword

**Item card** _(planned)_:
A roadmap item as shown on a roadmap; its size is the budget for the item's text.

**Roadmap list**:
The roadmaps available to the user, in the order the data source gives them.
_Avoid_: Dashboard, workspace

**Roadmap detail**:
The page for one roadmap, reached from its card or by deep link.
_Avoid_: Roadmap view, sheet page

**Roadmap card**:
A roadmap's entry in the roadmap list, which opens its roadmap detail. Not to be
confused with an item card.

### Data source

**Data source**:
Where roadmaps are read from, hidden behind the roadmap repository. Today it is one Google
spreadsheet; a PostgreSQL-backed HTTP API is expected to replace it.
_Avoid_: Backend, database

**Roadmap repository**:
The single boundary through which the application reads roadmaps, whatever the data
source.
_Avoid_: Sheets client, API service

**Connected spreadsheet**:
The one Google spreadsheet, fixed by configuration, that the data source reads. Only
infrastructure and setup documentation use this term.
_Avoid_: Workbook, file

**Worksheet**:
A tab of the connected spreadsheet. Each visible worksheet is a roadmap; a hidden
worksheet is not shown. Only infrastructure uses this term.
_Avoid_: Sheet (ambiguous with spreadsheet)

### Connection

Plumbing: these terms matter while Google is the data source, and copy keeps them out of
the Product Lead's way.

**Connection**:
The user's authorisation for the app to read the data source on their behalf. It proves
access, not identity: the app never knows who the user is.
_Avoid_: Login, sign-in, account

**Connect**:
To grant the app access through Google's consent popup, starting a session.
_Avoid_: Log in, sign in

**Disconnect**:
To end the session, revoking access where possible and forgetting every roadmap read
under it.
_Avoid_: Log out, sign out

**Session**:
The period during which the app holds a valid access token. It ends by disconnecting or by
expiring.

**Expired session**:
A session whose access token has lapsed or was rejected by the data source; the user
reconnects to continue.
_Avoid_: Logged out, timed out

**Reconnect**:
To connect again after an expired session, usually without a fresh consent screen.

**Access token**:
The short-lived credential that lets the app read the data source during a session. It
lives in memory only and is never stored, logged or put in a URL.
_Avoid_: Session token, key

**Auth-scoped data**:
Anything read under a session, which is cleared when the session is disconnected and
refetched after it is renewed.

### Problems

**Problem kind**:
The category of a failure to read roadmaps (unauthenticated, forbidden, not found, rate
limited, network, invalid response, unknown), from which the interface chooses its
message and whether to offer Retry.
_Avoid_: Error code, status

**Retryable problem**:
A problem kind that may succeed if tried again: rate limited, network, or a data-source
failure on its side.

**Forbidden**:
The connected account may not read the connected spreadsheet; the remedy is to ask its
owner for access.
_Avoid_: Unauthorised (which means an expired session)

### Languages

**Supported language**:
A language the whole interface is offered in: English (`en`) and Welsh (`cy`).

**Catalogue**:
The complete set of interface copy for one supported language; every catalogue has the
same keys.
_Avoid_: Translation file, strings file

**Endonym**:
A language's name in that language ("English", "Cymraeg"), used by the language switcher.

### Delivery

**Record**:
A backlog item: a story (`STY-<nnn>`), a defect (`DEF-<nnn>`) or a chore (`CHO-<nnn>`),
filed under an epic (`EPC-<nnn>`) or standalone.
_Avoid_: Ticket, issue, task

**Story**:
A record that delivers a user-visible outcome, written as numbered scenarios.

**Defect**:
A record of behaviour that contradicts a written scenario or an ADR.
_Avoid_: Bug report

**Chore**:
A record with no user-facing change, such as a refactor, a dependency or a CI change.

**Epic**:
A group of related records with a shared assessment and sequencing.

**Owner**:
The person who decides product behaviour, accepts ADRs, triages defects and merges PRs.
_Avoid_: Product owner, stakeholder
