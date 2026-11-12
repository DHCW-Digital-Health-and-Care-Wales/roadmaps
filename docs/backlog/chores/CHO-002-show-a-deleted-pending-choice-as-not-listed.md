# CHO-002: A pending family or category deleted from its list shows as not listed

- **Status**: Proposed — declined from STY-028's review as a known gap; the owner may pay the cost later
- **Type**: Chore
- **Area**: Features/UI + i18n (en + cy)
- **Epic**: standalone
- **Depends on**: STY-028
- **Binding ADRs**: ADR-012, ADR-013
- **Suggested model**: Sonnet — a pending choice's display and its refusal, with the
  lists the page already reads
- **Delivered**: _(add on delivery)_

## Summary

A Product Lead chooses a family or category for a roadmap, and before they publish,
someone deletes it from its list. The page still shows the deleted family or category
by the name it was chosen with, and the publish is refused as `invalid-data`, writing
nothing: the notice says the roadmap isn't in the expected format and to ask the
spreadsheet owner, though the spreadsheet is fine and only the choice is gone. The
Product Lead can recover by choosing again, but nothing tells them to.

Done means a pending choice the re-read list no longer has shows as not listed, and a
publish refused for it says the choice is no longer in its list, so the Product Lead
chooses again.

## Measurement

_At commit `6459466`._ Found by review, not measured in use. It needs a family or
category deleted from its list while a choice of it is pending, which STY-029 (manage
families) makes possible from the editor. Before starting, check whether STY-029 or
STY-030 has changed how a deleted family is shown; if it has, close this or narrow it.

## Acceptance criteria

### S1: A deleted pending choice shows as not listed

**Given** a pending family choice
**When** that family is deleted from its list and the page reads the list again
**Then** the family field shows the choice as not listed, not by its old name

### S2: Its refusal says why

**Given** the same pending choice
**When** the Product Lead publishes
**Then** nothing is written, and the notice says the family is no longer listed and to
choose another, in English and Welsh

### S3: Categories behave the same

**Given** a pending category choice deleted from its list
**When** the page reads the list again and the Product Lead publishes
**Then** it is shown and refused as S1 and S2 set

## Decisions

## Out of scope

- Changing what the editor writes to the data source.
