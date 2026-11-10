---
name: copywriter
description: Write or change user-facing copy in this product — connection and sign-in states, session expiry, access and loading errors, empty states, toasts, aria-labels, page titles — in English or Welsh. Use whenever a task adds or edits a string in `src/i18n/locales/en.ts` or `cy.ts`, reviews copy, or asks whether wording is on-voice. Carries the product's voice, the per-reader tone, and the judgement rules that `pnpm typecheck` and `pnpm lint` cannot make.
user-invocable: true
---

# Copywriter

The voice of a small web app read by people who want to look at their product
roadmaps. They arrive, connect a Google account, see their roadmaps and leave.
Most of the time the copy should be nearly invisible; it earns attention only
when something needs doing or has gone wrong.

**Two things carry the rules, and this is only one of them.** The type system
and the linter hold the mechanics: `pnpm typecheck` fails on a missing or extra
key and a missing Welsh plural form, and `pnpm lint` rejects literal JSX text
and literal `aria-label`/`title`/`alt`/`placeholder` attributes
(`i18next/no-literal-string`). Nothing checks the voice. This file and the
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

| Reader                      | Emphasis                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| **First visit, signed out** | What the app does and what connecting Google gives it, in one breath. No jargon about tokens           |
| **Connected viewer**        | Efficient. Roadmap names and counts, not adjectives. Copy stays out of the way                         |
| **Blocked viewer**          | Calm and specific about what is wrong and who can fix it: the reader, Google, or the spreadsheet owner |
| **Welsh-language reader**   | The same voice, equally plain. A Welsh string longer or more formal than its English is not done       |

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

Canonical patterns for each surface — connect prompt, expired session, access
error, load error, empty state, loading, toast, status label, count — are in
`references/patterns.md`. Start from the shape rather than from a blank line.

## Working order

1. Write the English first, in `src/i18n/locales/en.ts`. It is the source of
   truth (ADR-008). Keys are camelCase, grouped by feature. Map codes with
   template keys (``t(`errors.${error.kind}`)``) so `satisfies Record<…>` makes
   a new kind without copy a type error.
2. Add the Welsh to `src/i18n/locales/cy.ts` in the same change; `pnpm typecheck`
   fails until you do. The voice rules apply unchanged. Reuse the established
   terms: roadmap = _map trywydd_, spreadsheet = _taenlen_, connect = _cysylltu_
   (and see the existing strings for the rest).
3. Plurals: `foo_one`/`foo_other` in English (optional `foo_zero`); Welsh needs
   all six of `foo_zero`, `foo_one`, `foo_two`, `foo_few`, `foo_many`,
   `foo_other`. Call `t("foo", { count })` and format with `{{count, number}}`.
   Welsh also mutates the noun after some numerals (_dau fap_, not _dau map_);
   `roadmaps.count_*` in `cy.ts` shows the pattern.
4. `pnpm typecheck` (key parity and plural forms), then `pnpm lint` (no literal
   strings in JSX or attributes; `.ts` files are not covered, so keep copy out
   of them).
5. Update any Vitest test or Playwright spec asserting a string you changed;
   E2E locates things by accessible name and visible copy (`tests/e2e/AGENTS.md`).
6. **Welsh is machine-assisted.** Say in the handoff which Welsh strings you
   added or changed, so a fluent speaker can review them before launch.

## Where a budget bites

No script enforces length, so these are yours to hold: a **toast** is one
sentence, about 80 characters; an **alert or empty-state title** is a short
phrase (about 40) and its **description** at most two sentences; a **button** is
a verb or a verb and its object. Sentence case everywhere, including titles and
buttons, with the product name as the only capitalised proper noun. British
English spelling.

Welsh runs longer than English. When Welsh cannot fit, shorten the English too
rather than let one language spill. Mobile hides some labels (`common.shortAppName`);
a string that must fit a 375px header needs a short form.

## The authority

`docs/adr/ADR-008-internationalisation-english-and-welsh.md` carries the mechanics
and the reasoning behind them; `docs/GLOSSARY.md` the product vocabulary. When a
rule here seems wrong, look there before bending it.
