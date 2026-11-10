# Audience tone

One voice, several settings. The pillars never change; the emphasis does. The
primary reader is the Product Lead (`docs/backlog/personas/product-lead.md`);
read the persona, and the assumptions it lists, before writing for a new
screen.

## Product Lead, editing

Managing their own roadmap: moving items between Now, Next and Later, writing
or sharpening an item's title, description and expected outcomes, tagging it.

- Front-load the object: "No items in Next", not "It looks like there may not
  be any items here yet".
- Numbers and names, not adjectives: "3 items", the roadmap's own name.
- Labels name the field in the glossary's words (title, description, expected
  outcome, tag); a hint says what good looks like in one sentence, for the
  public reader the item is written for.
- Make the state of their work obvious: which edits are pending and what
  publishing will change. A page notice confirms what they just did and nothing else:
  "Published 3 changes to Patient app".
- Don't narrate loading with personality. "Loading roadmaps…" is the whole
  message.

## Product Lead, blocked

Something is wrong and they want it fixed: the session ended, the data source
was unreachable, they have no access, a publish failed.

- First say whether their pending edits are safe. A failed publish that kept them
  says so; one that lost them says exactly what to redo.
- State what happened in their terms, then the one thing to do, or who does it.
- Separate the owners of a problem: the Product Lead (connection, pop-ups,
  clicking Reconnect), the data source (unreachable, rate limiting: "wait a
  moment and try again"), and someone else (whoever grants access).
- Never imply fault. "Access wasn't granted", not "You denied access".
- Offer Retry only where retrying can help, and Reconnect where only a new
  session can; copy for a retry-able error and a final one must differ
  accordingly.
- Stay calm. A routine expiry is not a failure; an unexpected data format is the
  app's problem, not theirs.

## Product Lead, arriving

A member of DHCW staff opening the tool before connecting. The landing page (`landing.*`) is their
whole picture.

- Say what the tool is for, then the one step to start. Connecting is that
  step, not the subject: no "OAuth consent", "access token" or "scope".
- Say what the app will read once, in plain words. Never reassure with
  compliance vocabulary; say exactly what is and is not touched.
- One call to action. The button says what it does: "Connect Google".

## Public reader

Reads the public site, a separate app, and never this tool, so no interface
string is addressed to them. Health boards and Welsh Government stakeholders
come first, then DHCW staff, then patients and the public. They shape the hints, examples and limits that guide what a
Product Lead writes: plain English and Welsh, outcomes before outputs, no
internal jargon or unexplained acronyms, and nothing that only works on a card
wider than a phone.

## Welsh-language readers

Everyone who selects Cymraeg, or whose browser asks for it, reads the whole
product in Welsh, including notices, aria-labels and the document title.

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
`auth.errors.*` appears in page notices and panels alike.
