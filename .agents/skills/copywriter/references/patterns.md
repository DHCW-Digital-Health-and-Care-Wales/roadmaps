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
roadmaps.empty.description  The connected spreadsheet doesn't list any roadmaps yet.
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

## Page notice

**Shape:** one sentence, about 80 characters, confirming what the reader just
did, or what blocked it, as a callout at the top of the page in view (DHCW's
notification banner; there are no toasts). A failure stays until the next
attempt or the reader dismisses it. A confirmation clears itself after a few
seconds (waiting while it is hovered or focused), or sooner on the next change
or page, so write it to be read at a glance; the header's status keeps the
state. A new notice replaces the old one.

```
auth.notifications.connected     Connected to Google
auth.notifications.disconnected  Disconnected from Google
auth.errors.popup-blocked        Your browser blocked the Google window. Allow pop-ups for this site and try again.
```

A notice that needs its consequence adds a short title and a second sentence:

```
auth.renewal.failed          Couldn't keep you connected
auth.renewal.reconnectLater  You'll need to reconnect when your session ends.
```

A publish's outcome takes this shape: a confirmation says what happened and when
the public sees it; a failure names the step, says why, then that nothing was lost.

```
roadmaps.publish.notice.published   Changes published. The public site shows them after its next nightly update.
roadmaps.publish.notice.failed.publish  Couldn't publish your changes
roadmaps.publish.notice.kept        Your changes are kept in this tab.
```

A query error the page already shows needs no notice. Say it once, where the
reader is looking.

## Edit form

**Shape:** Edit's accessible name adds what is edited ("Edit Minimal card", the
subject in a `sr-only` span after a `{" "}` text node). Labels are the glossary's
field names; in Welsh each says it is the English ("Teitl (Saesneg)"). The confirm
button is **Done**, never "Save", which names the write on a roadmap that is not
published; Cancel leaves the form. A required field's error is an instruction:
`roadmaps.edit.titleRequired` "Enter a title". What holds a pending change is tagged
"Changed"; Undo is "Undo changes" plus its subject.

## Add dialog

**Shape:** the button that opens it and its heading share their words ("Add a
roadmap"); the confirm button names the write ("Add roadmap"), never "Done", since it
writes at once. A hint says what a value is for, or what it settles for good. A field
that can't be sent is an instruction at the field; a failed write is a notice above
the buttons: the step, then why and who can put it right. One line under the fields
says what adding makes public.

```
roadmaps.add.addressHint             Its public address will end “{{address}}”. It can't be changed here later.
roadmaps.add.errors.shortName.taken  This short name is already in use. Choose another.
roadmaps.add.failed.title            Couldn't add the roadmap
roadmaps.add.note                    It starts not published, with no items. The public site doesn't show it until you publish it.
roadmaps.add.added                   {{title}} was added. It isn't published yet.
```

## Move menu

**Shape:** a button that names its verb and, for assistive technology, its subject
("Move Online booking"), opening a menu headed "Move to" that lists each other place by
the heading the page shows it under, in page order. The edit form's choice is labelled
"Horizon or section", with no "(Saesneg)" in Welsh since it is not English text; an
unplaced item's choice starts on "Choose a horizon or section", which can't be chosen
again.

## Publish and save

**Shape:** "Publish changes" on a published roadmap, "Save changes" on one that is
not; the count beside it matches ("2 unpublished changes", "1 change to save"). The
check is a question title naming the step ("Publish these changes?"), then what
follows for the public (the nightly note, or "nothing will be public"), then "What
changes": each subject by name with its changed fields. Its confirm button repeats
the step.

## Destructive question

**Shape:** a question title naming what is lost ("Discard all changes to this
roadmap?"), one line saying it cannot be undone, and a confirm button that repeats
the verb and its object ("Discard all changes"); Cancel is always there. When the
reader chose another action that would lose work, the question offers the safe way
first: Disconnect with changes pending asks "Keep your changes?" with "Keep changes
and disconnect", then "Discard changes and disconnect", then Cancel.

## Timeout warning

**Shape:** a title naming what is about to happen → when, as a countdown →
what follows. Two buttons: the one that keeps the reader working first.

```
auth.sessionWarning.title          Your session is about to end
auth.sessionWarning.endsIn         Your session ends in {{remaining}}.
auth.sessionWarning.afterwards     After that, you'll need to reconnect.
auth.sessionWarning.stayConnected  Stay connected
```

`{{remaining}}` is `formatDuration` (`@/i18n`): "1 minute and 49 seconds",
built from `common.duration.*` plurals, never concatenated.

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

A count with a second figure nests the parts' own plural keys, so neither is
concatenated in code:

```
roadmaps.countWithUnpublished   $t(roadmaps.count, …), $t(roadmaps.unpublishedCount, …)
                                → "3 roadmaps, 1 not published"
```

## Card badge and facts

**Shape:** a badge is a short noun phrase for a state the reader must not miss
("Not published"), never colour alone; a fact line is a label and its value in one key
(`roadmaps.card.productLead`: "Product lead: {{name}}"), shown only when the roadmap has
it, so no card carries an empty label. A date is written out from the catalogue's month
names (`formatCalendarDate`), never numerically.

## Accessible names

`aria-label`, `title` and `alt` are copy too, and go through `t()`. Describe the
control's purpose, not its look: `theme.switchToDark` ("Switch to dark theme"),
not "Moon icon". The language switcher's accessible name must contain its visible
text ("Language English"). A string read only by assistive technology follows the
same voice and the same en/cy parity.
