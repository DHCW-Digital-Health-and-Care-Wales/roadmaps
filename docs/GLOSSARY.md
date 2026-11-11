# DHCW Roadmap Editor

The shared vocabulary for Product Leads managing their public-facing roadmaps.
Interface copy speaks the user's words below; code speaks the same words, and data-source
words stay inside infrastructure (ADR-002). Terms marked _(planned)_ name things the
product brief describes and the code does not have yet.

## Language

### People

**Product Lead**:
A DHCW member of staff who leads one or more products and manages their roadmaps in
this tool; a product may have several. The primary user
(`docs/backlog/personas/product-lead.md`). A roadmap names its product leads as free
text _(planned)_; the app does not know which Product Lead is using it.
_Avoid_: Product owner, admin, editor

**Public reader**:
Anyone who reads a roadmap on the public site: first health boards and Welsh Government
stakeholders, then DHCW staff, then patients and the public. They never use this tool,
but every roadmap item is written for them.
_Avoid_: Customer, end user

**Public site**:
The separate app that reads the shared data source and shows published roadmaps to
public readers. This tool never renders it.
_Avoid_: Viewer, front end, website

### Roadmaps

**Roadmap**:
A product's public plan, in the Now / Next / Later format, managed by its Product Lead.
Each roadmap is one row of the **roadmap index** (ADR-009). Its identity is the short
name the public site uses in its address (`producta`), and outlives the data source.
_Avoid_: Sheet, worksheet, tab, board

**Horizon**:
One of a roadmap's three columns: **Now** (being worked on), **Next** (coming up) and
**Later** (intended, further out). Horizons are not dates.
_Avoid_: Column, lane, quarter, phase

**Section**:
One of three groups shown around the horizons, shared with the public site: **Recently
delivered**, **Delivered this year** and **Not doing** (ADR-011).
_Avoid_: Horizon, status

**Placement**:
Where a roadmap item appears: one of the three horizons or one of the three sections.
A roadmap item has at most one; an item with none is an **unplaced item** (ADR-011).
Code and records use the word; interface copy names the horizon or section itself.
_Avoid_: Column, lane, status

**Unplaced item**:
A roadmap item with no recognised horizon or section, which the public site does not
show. The editor shows it, flagged, so the Product Lead can place it (ADR-011).
_Avoid_: Draft, hidden item

**Roadmap item**:
One piece of work on a roadmap: a title, a description, expected outcomes, tags and any
other details that help a public reader. It fits on one card no bigger than a phone
screen.
_Avoid_: Ticket, task, feature, epic, story

**Expected outcome**:
The change a roadmap item should bring about for patients, staff or the public, in their
terms rather than as an output delivered.
_Avoid_: Deliverable, benefit, KPI

**Tag**:
A short label on a roadmap item for grouping and filtering, such as a theme or an
audience. Free text chosen by the Product Lead today; a shared list may follow.
_Avoid_: Label, category, keyword

**Phase**:
A free-text word shown above a roadmap item's title, such as "Discovery" or "Beta",
saying what stage the work is at. Not a roadmap's status label.
_Avoid_: Stage, status

**Organisation**:
One of twelve fixed NHS Wales bodies a roadmap item's work is for, such as Cardiff and
Vale University Health Board, or **All Wales** for national work; shared with the public
site, which filters by it (ADR-011).
_Avoid_: Health board (only some are), customer

**Pending edit** _(planned)_:
A change to a roadmap or roadmap item that the Product Lead has made but not yet
published; the public site does not show it.
_Avoid_: Unsaved change, draft (drafts are a later feature)

**Publish** _(planned)_:
To write a roadmap's pending edits to the shared data source in one deliberate step,
after which the public site shows them. The MVP has no review or draft step.
_Avoid_: Save, sync, push, go live

**Stale roadmap** _(planned)_:
A roadmap not published for longer than the staleness threshold, suggested as six weeks.

**Item card** _(planned)_:
A roadmap item as shown on a roadmap; its size is the budget for the item's text.

**Roadmap list**:
The roadmaps available to the user, grouped by product family (families in name order,
then the roadmaps with no family) and sorted by title within each group.
_Avoid_: Dashboard, workspace

**Published roadmap**:
A roadmap the public site shows. A roadmap that is not published is still listed here,
marked "Not published" (ADR-009).
_Avoid_: Enabled, live, public roadmap

**Category**:
One of six fixed areas of care a roadmap belongs to, such as "GP & Community Services",
shared with the public site; a roadmap may have none.
_Avoid_: Group, section, tag

**Product family**:
An optional name grouping related products, such as "Single Record". The roadmap list
groups roadmaps under their family.
_Avoid_: Programme, portfolio

**Status label**:
Free text describing a product's stage, such as "Beta", shown as a badge.
_Avoid_: Phase (an item's tag on the public site), state

**Roadmap detail**:
The page for one roadmap, reached from its card or by deep link.
_Avoid_: Roadmap view, sheet page

**Roadmap card**:
A roadmap's entry in the roadmap list, which opens its roadmap detail. Not to be
confused with an item card.

### Data source

**Data source**:
Where roadmaps are read from and published to, hidden behind the roadmap repository,
and shared with the public site, so its format is a contract between the two apps. Today
it is one shared Google spreadsheet; a PostgreSQL-backed HTTP API is expected to replace
it.
_Avoid_: Backend, database

**Roadmap repository**:
The single boundary through which the application reads roadmaps, whatever the data
source.
_Avoid_: Sheets client, API service

**Connected spreadsheet**:
The one Google spreadsheet, fixed by configuration, that the data source reads. Only
infrastructure and setup documentation use this term.
_Avoid_: Workbook, file

**Roadmap index**:
The first worksheet of the connected spreadsheet, one row per roadmap, which the editor
and the public site both read (ADR-009). Only infrastructure and setup documentation use
this term.
_Avoid_: Roadmap list (the roadmaps shown to the user), roadmaps tab

**Worksheet**:
A tab of the connected spreadsheet. The first worksheet is the **roadmap index**; each
worksheet it names holds one roadmap's items, found by header rather than position. The
`Template` worksheet shows the permitted columns and is never read (ADR-009, ADR-011).
Only infrastructure uses this term.
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

**Renew**:
To extend a session before it ends, in one click ("Stay connected"), without a consent
screen. The roadmaps on screen stay; a renewal that fails leaves the session to expire.
_Avoid_: Refresh (the app holds no refresh token), extend

**Session warning**:
The dialog two minutes before a session ends, counting down and offering to renew the
session or disconnect.
_Avoid_: Timeout, logout warning

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
limited, network, invalid response, invalid data, unknown), from which the interface
chooses its message and whether to offer Retry. _Invalid data_ means the data source
answered but its content is not in the agreed format, so the remedy is to fix it, not to
retry (ADR-009).
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
