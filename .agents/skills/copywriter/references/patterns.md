# Copy patterns

The shape each surface takes, with a complete example to start from. Every
example is live copy from `src/i18n/locales/en.ts` — grep for the key to see it
in context.

## Connect prompt

**Shape:** what the app does → what connecting does. One button, the verb and
its object.

```
landing.tagline   A simple way to explore and manage your product roadmaps.
landing.accessNote  You'll need to connect Google so the app can load your roadmaps.
auth.connect      Connect Google
```

Say what is needed, not how it works. "Google" is the reader's account; the
protocol is ours.

## Expired session

**Shape:** the fact → the one action. Routine tone; this is not an error.

```
roadmaps.expired.title        Your session has expired
roadmaps.expired.description  Reconnect to Google to load your latest roadmaps.
auth.status.expired           Session expired
auth.reconnect                Reconnect
```

The title states the event; the description gives the action and the benefit.
Cached roadmaps may stay on screen: say what is old only if it matters.

## Access and permission error

**Shape:** what is wrong, in the reader's terms → who fixes it.

```
errors.forbidden   You don't have access to this spreadsheet. Ask the spreadsheet owner for access.
errors.not-found   The spreadsheet couldn't be found. Check that it still exists.
```

A permission error addresses the reader and never names the permission, the
scope or the status code. Name the spreadsheet only because the reader can act
on it.

## Connection and load error

**Shape:** what went wrong → the recovery, if there is one. One sentence; two
only when the second is the action.

```
roadmaps.loadFailed     Couldn't load your roadmaps
roadmaps.refreshFailed  Couldn't refresh your roadmaps
errors.network          Couldn't connect. Check your internet connection and try again.
errors.rate-limited     Too many requests right now. Wait a moment and try again.
errors.unknown          Something went wrong. Please try again.
errors.invalid-response The roadmap data was in an unexpected format.
auth.errors.popup-blocked  Your browser blocked the Google window. Allow pop-ups for this site and try again.
```

"Couldn't", not "failed to": the machine failed, not the reader. Recovery is
imperative. `errors.unknown` is the last resort, never the first choice: add an
`AppErrorKind` and its copy when a failure has its own recovery.

## Empty state

**Shape:** the title names the absence; the description says plainly what it
means, and the action if there is one. No apology, no joke, no exclamation mark.

```
roadmaps.empty.title        No roadmaps yet
roadmaps.empty.description  There are no visible roadmaps in the connected spreadsheet yet.
```

Never promise future behaviour the product has to keep: "we'll let you know as
soon as one appears" is a commitment every later feature inherits.

## Loading

**Shape:** the thing being loaded, then an ellipsis. No personality.

```
common.loading     Loading…
roadmaps.loading   Loading roadmaps…
auth.status.connecting  Connecting…
```

## Toast

**Shape:** one sentence, about 80 characters, confirming what the reader just
did, or what blocked it. Reuse one toast id so a new toast replaces the old one.

```
auth.notifications.connected     Connected to Google
auth.notifications.disconnected  Disconnected from Google
```

Toasts are not for query errors the page already shows, or for a closed pop-up.
Say it once, where the reader is looking.

## Status label

**Shape:** a short noun phrase or past participle, no full stop.

```
auth.status.ready      Not connected
auth.status.connected  Google connected
auth.status.error      Connection failed
```

## Count and plurals

**Shape:** a number and the noun, pluralised by the catalogue, never by string
concatenation.

```
roadmaps.count_zero   No roadmaps
roadmaps.count_one    {{count, number}} roadmap
roadmaps.count_other  {{count, number}} roadmaps
```

English needs `_one`/`_other` (and `_zero` if zero reads better). Welsh needs all
six categories: `_zero`, `_one`, `_two`, `_few`, `_many`, `_other`, with the noun
mutated after _dau_ (see `roadmaps.count_two` in `cy.ts`). Always call
`t("roadmaps.count", { count })`.

## Accessible names

`aria-label`, `title` and `alt` are copy too, and go through `t()`. Describe the
control's purpose, not its look: `theme.switchToDark` ("Switch to dark theme"),
not "Moon icon". The language switcher's accessible name must contain its visible
text ("Language English"). A string read only by assistive technology follows the
same voice and the same en/cy parity.
