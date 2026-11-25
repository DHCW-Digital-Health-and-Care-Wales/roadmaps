# DEF-041: The editor's status messages quote English it cannot mark

- **Status**: Needs triage — found by DEF-033 delivery
- **Severity**: Low — in Welsh, a screen reader reads an English title, tag or detail
  quoted in a message with Welsh pronunciation
- **Area**: Features/UI
- **Epic**: EPC-022-monorepo-and-backend-foundation
- **Depends on**: none
- **Binding ADRs**: ADR-008
- **Suggested model**: Opus — messages built as plain text would have to carry elements
- **Delivered**: _(add on delivery)_

## Summary

A Product Lead using the editor in Welsh hears what they just did in a status message:
the title quick add added, a tag removed or renamed, a detail moved or removed. The
message is Welsh and the words it quotes are English, but nothing in the page says so,
so a screen reader reads them with Welsh pronunciation (WCAG 2.2 SC 3.1.2, Language of
Parts). Some of these messages also show on screen; sighted Product Leads see no
difference.

## Reproduce

At commit `83510047` on the default branch, with a roadmap whose item has the tag
"Patients" and the details "Book by phone" and "Book online":

1. Choose Cymraeg and open the roadmap.
2. Under "Nesaf" (Next), quick add an item titled "Hearing aids".
3. Edit the first item, open its tags and remove "Patients".
4. Open its details and remove "Book by phone".

**Expected**: in each message, only the quoted English carries `lang="en"`.
**Actual**: the status lines read `Ychwanegwyd “Hearing aids” o dan Nesaf.`,
`Tynnwyd “Patients”.` and `Tynnwyd “Book by phone”.`, each plain text with no `lang`.

## Cause

Verified: each message is built as one string, which can't mark a part of itself. The
search: `rg -n '\{\{(title|tag|tags|typed|detail|parent|horizon)\}\}'
apps/editor/src/i18n/locales/en.ts`, leaving out the entries read as an attribute or
as a control's hidden words, which stay unmarked (STY-098 D2 and its Delivery).

- `editing/quick-add.tsx`: `roadmaps.items.quickAdd.added`, given to the page's status
  line as a string.
- `editing/tags-field.tsx` (`messageText`, `notesText`): `roadmaps.edit.tags.added`,
  `.removed`, `.putBack` and `.notes.*`, in its status line and in the shut field's
  hint; and `.noMatch`, a line of its own quoting what was typed.
- `editing/details-messages.ts` (`detailsMessageText`):
  `roadmaps.edit.details.said.movedIn`, `.movedOutUnder`, `.newUnder`, `.removed` and
  `.putBack`.

`roadmaps.items.unplaced.unknownHorizon` (`components/horizon-flag.tsx`) and
`roadmaps.publish.notice.refused.removal.writtenAs`
(`editing/conflict-review-dialog.tsx`) quote text of no known language: the open
question.

## Acceptance criteria

### S1: English quoted in a status message is marked alone

**Given** the editor in Welsh and an item with the tag "Patients"
**When** a Product Lead removes the tag and the status line says so
**Then** only "Patients" in the message carries `lang="en"`

## Open questions

1. **Should a horizon quoted as written be marked English?** A card and a conflict
   quote a horizon the editor doesn't recognise, as someone typed it into the
   spreadsheet, which may be in either language.
   - (a) Leave it unmarked (recommended): its language isn't known.
   - (b) Mark it English, as the spreadsheet's other unpaired text is treated.

## Decisions
