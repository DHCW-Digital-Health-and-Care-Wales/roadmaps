# Audience tone

One voice, four settings. The pillars never change; the emphasis does. The
product has no personas on file, so reason about the reader from
`docs/GLOSSARY.md` and what the screen is for.

## First visit, signed out

Somebody who has been sent a link or found the app and has not connected yet.
The landing page (`landing.*`) is their whole picture.

- Say what the app does for them, then what connecting does: "A simple way to
  explore and manage your product roadmaps." then "You'll need to connect Google
  so the app can load your roadmaps."
- Sell the outcome, never the mechanism. Not "OAuth consent", not "access
  token", not "spreadsheets.readonly scope".
- Say what the app will read once, in plain words. Never reassure with
  compliance vocabulary; say exactly what is and is not touched.
- One call to action. The button says what it does: "Connect Google".

## Connected viewer

Looking at their roadmaps, usually briefly, often on a phone.

- Front-load the object: "No roadmaps yet", not "It looks like there may not be
  any roadmaps yet".
- Numbers and names, not adjectives: "2 roadmaps", the roadmap's own name.
- Status is a label, not a sentence: "Google connected", "Session expired".
- A toast confirms what the reader just did and nothing else: "Connected to
  Google", "Disconnected from Google".
- Don't narrate loading with personality. "Loading roadmaps…" is the whole
  message.

## Blocked viewer

Something is wrong and they want it fixed: the session ended, Google was
unreachable, they have no access to the spreadsheet, a pop-up was blocked.

- State what happened in their terms, then the one thing to do, or who does it.
- Separate the three owners of a problem: the reader (connection, pop-ups,
  clicking Reconnect), Google (unreachable, rate limiting: "wait a moment and try
  again"), and someone else (the spreadsheet owner grants access).
- Never imply fault. "Access wasn't granted", not "You denied access".
- Offer Retry only where retrying can help, and Reconnect where only a new
  session can; copy for a retry-able error and a final one must differ
  accordingly.
- Stay calm. A routine expiry is not a failure; an unexpected data format is the
  app's problem, not the reader's.

## Welsh-language readers

Everyone who selects Cymraeg, or whose browser asks for it, reads the whole
product in Welsh, including toasts, aria-labels and the document title.

- The same plain voice: a translation that sounds like a form is not done.
  Address the reader directly and keep sentences short.
- Don't carry English word order or an English idiom across; write the Welsh a
  person would say.
- Use the terms already in `cy.ts` so the product reads consistently, and follow
  the plural and mutation patterns there.
- The strings are machine-assisted and not yet reviewed by a fluent speaker.
  Flag every new or changed one.

## Shared surfaces

Most keys are read by more than one setting. When they are, write for the least
technical reader who will see the string: everyone reads `errors.*`, and
`auth.errors.*` appears in toasts and panels alike.
