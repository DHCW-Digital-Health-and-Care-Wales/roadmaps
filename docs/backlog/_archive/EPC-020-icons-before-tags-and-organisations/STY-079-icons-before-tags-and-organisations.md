# STY-079: A Product Lead sees a tag icon before "Tags" and a building icon before "Organisations"

- **Status**: Done — delivered in the PR below; grilled with the owner on 2026-11-19 (D1–D5)
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy)
- **Epic**: [EPC-020-icons-before-tags-and-organisations](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-008, ADR-010
- **Suggested model**: Sonnet — one small icon component placed at eight known sites, the
  rules already settled
- **Delivered**: _the PR, added once it exists_

## Summary

Everywhere the editor names an item's tags or organisations, a Product Lead now sees
lucide's tag icon before "Tags" and its building-complex icon before "Organisations":
on a card and on an opened compact row, in the Add and Edit item forms, in the conflict
review, in the "What changes" list, and on the Families page's "Organisations" heading.
The icons only decorate: a screen reader still says "Tags" and "Organisations". No other
field gets one, and no new words are written. One deliberate cost: the refusal's
"First item: Tags" line is rebuilt in English and Welsh so the icon can sit in it.

## Scope

`features/roadmaps`: the item fields, the item form's labels, the conflict review, the
"What changes" list and the Families page. `i18n/`: the refusal's `target` wording, the
only string whose shape changes. Nothing in `domain/` or `infrastructure/`.

## Acceptance criteria

### S1: A card shows the icons before its Tags and Organisations labels (owner, D1)

**Given** an item with tags and organisations, in the Cards view
**When** the card shows
**Then** the "Tags" label has the tag icon before it, and the "Organisations" label has
the building-complex icon before it, each on the label's line
**And** Phase, Description, Expected outcome and Details have no icon (D3)
**And** an item with no tags, or no organisations, still shows no label and no icon for
the one it lacks

### S2: An opened compact row shows them the same way (owner, D1)

**Given** the same item in the Compact view, its row opened
**When** the row shows its fields, in two columns on a desktop and one on a phone
**Then** "Tags" and "Organisations" have their icons exactly as on a card (S1)
**And** the closed row, which shows no field labels, is unchanged

### S3: The Add item form shows them before its two labels (owner, D1)

**Given** the Add item dialog, with the Tags and Organisations fields shut
**When** a Product Lead sees the form, and again after opening either field
**Then** the tag icon is before "Tags" and the building-complex icon before
"Organisations", shut and open
**And** "Change tags" and "Change organisations" are named as they are today

### S4: The Edit item form shows them, including locked Welsh tags (owner, D1)

**Given** the Edit item dialog for an item, and for an item whose tags have Welsh
versions, so its Tags field is shown but locked
**When** the form shows
**Then** both forms have the icons before "Tags" and "Organisations", the locked field's
"Tags" included
**And** the locked field's note and a field's error messages read as they do today

### S5: A refused edit's target line shows them (owner, D1, D5)

**Given** a refused publish where a co-lead changed the Tags of an item the Product Lead
also changed, and another conflict on its Organisations
**When** the Product Lead opens the review
**Then** the first conflict's visible target line reads "First item: " then the tag icon
then "Tags", and the other's reads "First item: " then the building-complex icon then
"Organisations"; every other field's line reads as today
**And** the hidden words that name "Keep mine" and "Use theirs" stay plain text, with no
icon (D2)

### S6: A refused removal's "Current text" list shows them (owner, D1)

**Given** a refused publish where the Product Lead removed an item that a co-lead changed
the tags and organisations of
**When** the Product Lead opens the review
**Then** its "Current text" list's "Tags" and "Organisations" labels have their icons
**And** the list's other labels have none, and its words and order are as today

### S7: "What changes" shows them in its lines (owner, D1, D5)

**Given** a roadmap with an item whose title, tags and organisations are changed
**When** the Product Lead opens the publish dialog's "What changes"
**Then** the item's line lists its changed fields in their order, with the icon before
"Tags" and before "Organisations" and none before "Title"
**And** the commas between them, the other parts' lines and the order of the lines are
as today

### S8: The Families page's "Organisations" heading shows the icon (owner, D1)

**Given** the Families, categories and organisations page
**When** it shows its "Organisations" section
**Then** the building-complex icon is before the heading, sized to it (D4)
**And** the section is still named "Organisations", by its heading, and the other
headings on the page have no icon

### S9: The icons say nothing to a screen reader (owner, D2)

**Given** any place S1–S8 draws an icon
**When** assistive technology reads it
**Then** the icon is hidden from it, and every name and label that said "Tags" or
"Organisations" says the same words as before
**And** no string is added to the catalogues for the icons

### S10: The icon looks like part of its label (owner, D3, D4)

**Given** any place S1–S8 draws an icon, in the light and dark themes, at a phone's width
**When** the label shows
**Then** the icon is the label's colour, as tall as its text, with a small gap, and
centred on the line
**And** it never sits alone on a line apart from its word: the two wrap together
**And** it has no colour of its own, so it follows the label in any theme
**And** no other field's label has an icon at any of these places (D3)

### S11: Welsh shows the same icons (D1)

**Given** the editor in Welsh
**When** each place in S1–S8 shows
**Then** each site's Welsh label has the same icon before it: "Tagiau" on the card and
on the form's locked tags, "Tagiau (Saesneg)" on the form's editable field, in the review
and in "What changes", and "Sefydliadau" for Organisations everywhere
**And** the rebuilt refusal line reads as natural Welsh, with the icon before the field
name, written with the `copywriter` skill

## Tests _(optional)_

Component tests hold S1–S9 at each site, read by accessible name so an icon that leaked
into a name fails them. S10 and S11 are observed in the running app in both themes, at a
phone's width and in Welsh, and the evidence goes in Delivery.

## Decisions

- **D1** (owner, 2026-11-19, grilling round 1 Q1): which places get the icons → all
  four chosen: the item card and opened compact row, the Add and Edit item form, the
  conflict review and "What changes" lists, and the Families page's "Organisations"
  heading. Sets S1–S8.
- **D2** (owner, 2026-11-19, grilling round 1 Q2): what assistive technology says →
  the icon is decorative and hidden; every accessible name stays "Tags" or
  "Organisations". Sets S5, S9.
- **D3** (owner, 2026-11-19, grilling round 1 Q3): other fields → no, only these two.
  Sets S1, S10.
- **D4** (owner, 2026-11-19, grilling round 1 Q4): how it looks → the label's colour,
  the label's text height, a small gap, centred on the line; no new token. Sets S8,
  S10.
- **D5** (owner, 2026-11-19, grilling round 2): the two places that name a field inside
  a line of text (the refusal's "First item: Tags", and "What changes") → the icon
  goes in the line too, over leaving them plain. Their field names stop being plain
  strings, and the refusal's `target` wording is rebuilt in English and Welsh. Sets
  S5, S7, S11.
- **D6** (agent, 2026-11-19): a one-story epic, EPC-020, with no `Depends on`, over
  waiting for STY-075 or STY-076, because neither changes the field labels this story
  touches. They overlap only in files the owner's other deliveries may be editing:
  rebase, not sequence.

## Starting point

_Audited at `b968cd2`._

- **A label is a `string` almost everywhere.** `EditFormField.label` runs into
  `OpeningField` (Organisations directly, Tags through `TagsField`) and `FixedField`.
  The same two words come from `roadmaps.items.fields.*` (the card, and the form's locked
  Welsh tags), `roadmaps.edit.itemFields.*` (the form's other labels, the review and
  "What changes") and `roadmaps.families.organisations.heading`. The icon goes where a
  label is drawn, chosen by the field, not by the catalogue key, or the locked field is
  missed (S4).
- **Only a removal's review lists field labels.** An edit conflict's "Current text" is
  a bare value under its target line; the "Current text" `dl` of labels belongs to
  `RemovalConflictItem`, so S5 and S6 are two conflicts, never one.
- **The conflict review's `target` is used twice.** `ConflictItem` draws it visibly
  (a bold line) and again inside a `sr-only` span on "Keep mine" and "Use theirs". Only
  the visible line gets the icon (S5, D2): the hidden words stay a string.
- **"What changes" joins its fields into one string** (`fields.join(", ")`), so it has
  to become a list of nodes to carry the icons (S7).
- **Both icons are in the installed lucide-react (1.70.0):** `TagIcon` and
  `BuildingComplexIcon`. The app draws its icons as `XIcon`, `ArrowRightLeftIcon`
  and the like with `aria-hidden="true"`.

## Out of scope

- **Icons beside the other field labels.** Phase, Description, Expected outcome and
  Details stay plain (D3). Bring it back if the owner wants the card to read by icon.
- **Icons on a tag itself or an organisation's name.** Only the heading is marked, not
  the badges or names under it.
- **A stronger or accent-coloured icon.** The owner chose the label's own colour (D4).

## Delivery

### Departures

- **S5, S11 (the refusal's wording)**: the `target` key, `"{{subject}}: {{field}}"`, is
  replaced by `targetLead`, `"{{subject}}:"`, in both catalogues; the field's name is
  drawn after it as a node, so the icon can stand before it, and the words the buttons'
  hidden text reads are built from the same two parts. The English and Welsh read
  exactly as they did ("First item: Tags", "Eitem gyntaf: Tagiau (Saesneg)"): the
  copywriter's judgement was that the wording needs no change, only its shape, and
  that a lead-in with no placeholder for the name is the plainest shape for a name that
  is not a string (agent, routine; D5 expected the wording to be rebuilt, and it was,
  as a shape).
- **Scope**: the icon is chosen by the field's name in `FieldName`
  (`components/field-name.tsx`), a field's `name` or a card's key, so the form,
  the card, the review and "What changes" share one table (`tags`, `organisations`,
  `organisationIds`). `EditFormField.label` stays a string; `EditForm` wraps the label
  of a field that opens, is fixed or is tags, so the locked Welsh tags are not missed
  (S4). `OpeningField`, `TagsField` and `FixedField` take their `label` as a node.
- **Tests**: the page tests are written after the code and shown red by breaking it
  (below), not test-first. Existing tests that read a label by `getByText(…, { selector:
"dt" })` or a target line by `/: /` read a label whose words now sit in a span of
  their own: they read it through `fieldTerm` (`testing/field-term.ts`) and `/:$/`.
- **S9**: lucide gives its icons `aria-hidden="true"` itself; `FieldName` sets it too, as
  the app's other icons do, so the property does not rest on the library's default.

### Contract for dependents

- **`FieldName`** (`features/roadmaps/components/field-name.tsx`) takes `field`
  (optional) and the name as children; a field with no icon renders its children
  unchanged. A new field that should carry an icon is one line in its table.
- **`roadmaps.publish.notice.refused.targetLead`** replaces `…refused.target`.
- **Data source**: nothing read or written changes.

### Scenario evidence

| Scenario | Held by                                                                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1, S9   | `roadmap-detail-page-field-icons.test.tsx` (`a card (S1)`)                                                                                                     |
| S2       | `roadmap-detail-page-field-icons.test.tsx` (`an opened compact row (S2)`)                                                                                      |
| S3, S4   | `roadmap-detail-page-field-icons.test.tsx` (`the item form (S3, S4)`, the Add form, the locked Welsh tags)                                                     |
| S5, S6   | `roadmap-detail-page-field-icons.test.tsx` (`the review of a refused publish (S5, S6)`): the line's icon, the buttons' hidden words plain, a removal's labels  |
| S7       | `roadmap-detail-page-field-icons.test.tsx` (`What changes (S7)`)                                                                                               |
| S8       | `families-page.test.tsx` (`draws the building icon before its heading…`)                                                                                       |
| S10      | `tests/e2e/field-icons.spec.ts` (level with the word, as tall as its text, the label's colour, at 1280 and 375 px); observed in both themes in the screenshots |
| S11      | `roadmap-detail-page-field-icons.test.tsx` (`the Welsh interface (S11)`); `tests/e2e/field-icons.spec.ts` (Welsh card)                                         |

Shown red by breaking the finished code: `FieldName` returning its children with no
icon fails ten of the new tests across the card, compact row, forms, review, "What
changes" and Families. Dropping `aria-hidden` from `FieldName` fails none, since lucide
sets it itself (above).
