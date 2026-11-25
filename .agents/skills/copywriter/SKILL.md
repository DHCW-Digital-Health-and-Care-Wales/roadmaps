---
name: copywriter
description: The product's voice and copy rules, in English and Welsh, for the editor and the public site. Use whenever a task adds or edits a string in either app's `src/i18n/locales/en.ts` or `cy.ts`, reviews copy, or asks whether wording is on-voice.
---

# Copywriter

The voice of an internal tool for NHS Wales organisations (DHCW first), in which
Product Leads, Tenant Admins and Viewers work with public Now / Next / Later
roadmaps (`docs/backlog/personas/`).
Product Leads come to get a job done: move an item, sharpen its outcome, fix a
tag. The interface copy should be nearly invisible, earning attention only when
something needs a decision or has gone wrong. What they publish is shown on a
separate public site (`apps/public-site/`), so editor copy also helps them write
it well: field labels, hints and examples are copy too. The public site's own
copy follows the same rules in the register _The public site_ sets.

**Two things carry the rules, and this is only one of them.** The type system
and the linter hold the mechanics: `pnpm typecheck` fails on a missing or extra
key and a missing Welsh plural form, and `pnpm lint` rejects literal JSX text
and configured user-facing attributes (`i18next/no-literal-string` in each app's
`eslint.config.ts`). Nothing checks the voice. This file and the
reviewers (`quality-review`) are the only gate on it, so apply it deliberately.

## The voice, in four lines

1. **Clear & uncluttered** — the plainest accurate words, one idea per sentence,
   nothing the reader did not need.
2. **Calm & proportionate** — the temperature matches the stakes. An expired
   session is routine, not an emergency. Never borrow alarm to win attention;
   never flatten a real consequence to stay pleasant.
3. **Grounded & human** — written by a person who uses the app. Not a brand
   voice, not a system log, not Google's error text.
4. **Plain about consequence** — say what happened, what it affects, and who can
   put it right.

## Who is reading

- **Product Lead, editing**: the main reader. Efficient and exact; labels and
  hints that help them write a good item within the card budget, and a clear
  answer to "what is pending, and what will publishing change?".
- **Product Lead, blocked**: calm and specific about what is wrong, whether
  their work is safe, and who can fix it: them, the data source, or someone
  who grants access.
- **Product Lead, arriving**: what the tool is for and the one step to start.
  Connecting is a step, not the subject; no jargon about Google or tokens.
- **Tenant Admin**: manages one organisation's members, invitations, roles and
  shared lists, and steps in on roadmaps. Name roles and organisations plainly,
  make one-time invitation links unmistakable, and state blast radius before
  confirming destructive or tenant-wide changes.
- **Viewer and read-only states**: reads current roadmaps, unpublished drafts,
  history and the member directory without editing (including a Product Lead on
  an unassigned peer roadmap or read-only list). Distinguish published from
  draft at a glance, point neutrally to who can help (an assigned lead or
  Admin), and never shame with "access denied" on screens they are meant to
  read.
- **Public reader**: reads published roadmaps on `apps/public-site/`. There,
  write directly in plain, outcome-first language; in the editor, let them shape
  field hints and examples.
- **Welsh-language reader**: the same voice, equally plain. A Welsh string
  longer or more formal than its English is not done. This covers interface
  copy; Welsh roadmap content is optional for now, so never block publishing on
  it.

Full nuance: `references/audiences.md`. Product terms and their meanings:
`docs/GLOSSARY.md`.

## The five judgement calls

**1. Delete the explanation.** Remove any sentence explaining why the product
behaves as it does. Then ask: can the reader still act? If yes, it was for us.
Nobody needs to know about OAuth, tokens, scopes or HTTP status codes; they need
"Reconnect to Google to load your latest roadmaps." A disclaimer about our own
limits is the same thing in a safety jacket: turn it into an instruction.

**2. Calibrate the alarm.** State the event as fact; keep the risk conditional.
"Your session has expired" is a fact and a routine one: no "Oops", no "Error!",
no red unless the reader lost something. One instruction, once — never stack
"now", "immediately" and "please".
Losing pending edits and publishing are the real consequences in this product:
say plainly, before Publish, that it makes the edits public on the public site,
and confirm afterwards what was published.

**3. Name the recourse.** If something is wrong for the reader, do they know who
fixes it? Each failure has an owner, and the string names the one that is the
reader's to act on: "Check your internet connection and try again" (reader),
"Ask the spreadsheet owner for access" (someone else), "Allow pop-ups for this
site" (reader's browser). Say so even when the answer is "nobody — try later".

**4. Say whose move it is.** Attribute the cause plainly and without blame:
"Google couldn't be reached", "Your browser blocked the Google window", "Access
wasn't granted". Never "an error occurred", never a passive that hides the
actor, and never a sentence that makes the reader feel they failed.

**5. Address the reader who has to act.** If most readers have nothing to do, do
not tell them so. "Connected to Google" needs no "You can now close this
message"; the absence of an instruction is the instruction.

## Keep the source out of the copy

Google Sheets is a temporary data source (ADR-002). Say "roadmaps" wherever you
can. Name the spreadsheet only where the reader can act on it (access denied,
not found, the empty list), and keep those words in the few keys that need them,
so replacing the source later is a copy change in a handful of places. Never
show a spreadsheet ID, worksheet name, HTTP status, error code, token or raw
Google message: the domain and infrastructure layers emit codes (`AppError.kind`,
`AuthErrorCode`), and the UI maps them to copy.

## Shapes to copy

Canonical patterns for each surface built so far are in
`references/patterns.md`, one heading per surface. A delivery corrects an
example there that its copy change makes false. One that sets a new pattern
names it in its handoff, and its retrospective adds it, since a delivery
makes no incidental skill change
(`docs/operations/authoring-agent-instructions.md`, _Where it goes_). Start
from the shape rather than from a blank line.

## Working order

1. Write the English first, in the app's `src/i18n/locales/en.ts`. It is the source of
   truth (ADR-008). Keys are camelCase, grouped by feature. Map codes with
   template keys (in the editor, ``t(`errors.${error.kind}`)``) so
   `satisfies Record<…>` makes a new kind without copy a type error.
2. Add the Welsh to the app's `src/i18n/locales/cy.ts` in the same change; `pnpm typecheck`
   fails until you do. The voice rules apply unchanged. Reuse the established
   terms: roadmap = _map trywydd_, spreadsheet = _taenlen_, connect = _cysylltu_
   (and see the existing strings for the rest).
3. Plurals, in the editor: `foo_one`/`foo_other` in English (optional `foo_zero`);
   Welsh needs all six of `foo_zero`, `foo_one`, `foo_two`, `foo_few`, `foo_many`,
   `foo_other`. Call `t("foo", { count })` and format with `{{count, number}}`.
   The public site writes them its own way (_The public site_).
   Welsh also mutates the noun after some numerals (_dau fap_, not _dau map_);
   `roadmaps.count_*` in `cy.ts` shows the pattern.
4. `pnpm typecheck` (key parity and plural forms), then `pnpm lint` (no literal
   strings in JSX or attributes; `.ts` files are not covered, so keep copy out
   of them).
5. Update any Vitest test, Playwright spec or ARIA snapshot asserting a string
   you changed (`apps/editor/tests/e2e/AGENTS.md`, `apps/public-site/AGENTS.md`).
6. **Welsh is machine-assisted**, and a fluent speaker reads all of `cy.ts`
   before launch (`apps/editor/README.md`, _Languages_). List the Welsh strings you added or
   changed in the PR's Copy section, with any doubt a reviewer raised about
   one; that read is the launch's, so it is no owner question.

## Where a budget bites

No script enforces length, so these are yours to hold: a **page notice** is
one sentence, about 80 characters; an **alert or empty-state title** is a short
phrase (about 40) and its **description** at most two sentences; a **button** is
a verb or a verb and its object. A **field hint** is one short sentence. No
character limit is enforced on roadmap items yet; when one is, show it, not
only enforce it. Sentence case everywhere, including titles and
buttons, with the product name as the only capitalised proper noun. British
English spelling.

Welsh runs longer than English. When Welsh cannot fit, shorten the English too
rather than let one language spill. Mobile hides some labels (`common.shortAppName`);
a string that must fit a 375px header needs a short form.

## The public site

`apps/public-site/src/i18n/locales/en.ts` and `cy.ts` hold the public site's
interface and the fixed text it owns about horizons, sections, categories and
organisations; roadmap content is sheet data, never catalogue text. The
working order holds, in this register and with the site's own catalogue shape:

- **Typed objects, read by property** (ADR-008's amendments):
  components read `useStrings()`, with no i18n library. A value filled in is a
  typed function (`({ organisation }) => …`), and a count is
  `plural("cy", { … })` with all six Welsh forms, unformatted; `cy.ts` must give
  each the same arguments.
- **Write for the public reader**: health boards, Welsh Government
  stakeholders, DHCW staff, patients and the public, who come to see what DHCW
  plans, not to do a job. Say what a page shows in their words, with none of
  the editor's vocabulary (Product Lead, publish, pending, spreadsheet).
- **Keep plans provisional**: roadmaps carry no dates and are not fixed
  plans, so no string promises when or whether something is delivered.
- **Roadmap is _trywydd_** here (plural _trywyddion_), with the singular
  after a number and its mutation (_2 drywydd_, _3 thrywydd_);
  `landing.roadmapCount` in `cy.ts` shows the pattern.

## The authority

`docs/adr/ADR-008-internationalisation-english-and-welsh.md` carries the mechanics
and the reasoning behind them; `docs/GLOSSARY.md` the product vocabulary. When a
rule here seems wrong, look there before bending it.
