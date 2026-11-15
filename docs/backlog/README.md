# Backlog

The index of the work the project knows about. New records start from
`_templates/`, statuses follow `_templates/status-lifecycle.md`, and delivery
follows `.agents/skills/implement-story/SKILL.md`: one record, one reviewed PR.
`docs/AGENTS.md` has the layout and ID rules. A record in a terminal status
moves to `_archive/`, where its row here still points.

## Personas

- [Product Lead](personas/product-lead.md): manages the public Now / Next / Later roadmaps
  of the products they lead; the primary user. Owner answers recorded 2026-11-10; format ownership answered 2026-11-11.

## Epics

| Epic                                                                                                     | Summary                                                                                                                                                                                                                           | Status |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| [EPC-001 Bootstrap](_archive/EPC-001-bootstrap/README.md)                                                | STY-001–STY-009: tooling, domain, Google auth and Sheets, i18n, app shell, roadmaps, E2E, CI/CD, final verification                                                                                                               | Done   |
| [EPC-002 Roadmap list from the roadmap index](_archive/EPC-002-roadmap-list-from-roadmaps-tab/README.md) | STY-010–STY-012: list the roadmaps the public site lists, with their information, grouped by family                                                                                                                               | Done   |
| [EPC-003 DHCW design alignment](_archive/EPC-003-dhcw-design-alignment/README.md)                        | STY-013–STY-018: DHCW tokens, type and focus; lint-enforced tokens; DHCW components, shell and logo; on-screen failures and a session warning; look checks without screenshots                                                    | Done   |
| [EPC-004 Roadmap items](_archive/EPC-004-roadmap-items/README.md)                                        | STY-019–STY-021: model a roadmap item from every column, read a roadmap's items by header, and show them on its page under the six placements                                                                                     | Done   |
| [EPC-005 Editing](_archive/EPC-005-editing/README.md)                                                    | STY-022–STY-026: item identity, a write that refuses on a co-lead's conflict, an "About this roadmap" block, editing in place with one publish per roadmap, and conflict review                                                   | Done   |
| [EPC-006 Product families and colours](_archive/EPC-006-product-families-and-colours/README.md)          | STY-027–STY-030: families and categories defined once in their own tabs, chosen per roadmap, managed in one page, out-of-step rows fixed                                                                                          | Done   |
| [EPC-007 Item placement and organisations](_archive/EPC-007-item-placement-and-organisations/README.md)  | STY-031–STY-034: move an item between horizons and sections; organisations served by the repository, listed, and chosen per item                                                                                                  | Done   |
| [EPC-008 Publishing and freshness](_archive/EPC-008-publishing-and-freshness/README.md)                  | STY-035–STY-036: publish or unpublish a roadmap from its page, refused when the public sync would fail; set its Last updated date                                                                                                 | Done   |
| [EPC-009 Item tags](_archive/EPC-009-item-tags/README.md)                                                | STY-037–STY-038: add, rename and remove an item's tags in its edit form, offered the tags the roadmap's other items carry (editor B chosen from four prototypes); Tags and Organisations open on request in the form              | Done   |
| [EPC-010 Item details](_archive/EPC-010-item-details/README.md)                                          | STY-039: write, nest, reorder and remove an item's details, the nested list the public site shows under “What this covers”, in its edit form (editor A, an outline, chosen from three prototypes)                                 | Done   |
| [EPC-011 Adding roadmaps and items](EPC-011-adding-roadmaps-and-items/README.md)                         | STY-040–STY-050: add a roadmap from the list, written at once and not published, and add items on its page, pending until published; one dialog adds and edits a roadmap, one an item; removing and reordering recorded for later | Active |

## Chores

| ID                                                                                      | Chore                                                                                                                  | Status      |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------- |
| [CHO-001](_archive/chores/CHO-001-carry-linked-name-with-pending-choice.md)             | Carry the linked name with each pending family/category choice, so renames before first publish are not conflicts      | Won't do    |
| [CHO-002](_archive/chores/CHO-002-show-a-deleted-pending-choice-as-not-listed.md)       | Show a pending family or category deleted from its list as not listed                                                  | Won't do    |
| [CHO-004](_archive/chores/CHO-004-share-the-write-failure-copy.md)                      | Share the eight-key write-failure copy between publishing, families, "Make it match" and adding a roadmap              | Done        |
| [CHO-005](chores/CHO-005-send-last-updated-to-the-api-in-utc.md)                        | Send a roadmap's Last updated to the future database API in UTC, once it replaces Sheets                               | Placeholder |
| [CHO-007](_archive/chores/CHO-007-rebase-an-open-date-form-after-marking-updated.md)    | An open About form takes a date its own "Mark as updated today" wrote as its own                                       | Won't do    |
| [CHO-008](_archive/chores/CHO-008-settle-the-test-first-rule.md)                        | Deliveries follow a test-first rule they can keep                                                                      | Done        |
| [CHO-009](chores/CHO-009-prototype-styles-match-the-app.md)                             | The `ux-prototypes` stylesheet still draws shadcn's greys, not the app's DHCW look                                     | Proposed    |
| [CHO-010](_archive/chores/CHO-010-check-adding-a-roadmap-against-a-real-spreadsheet.md) | Check STY-040's write (a copied `Template`, frozen, hidden or protected) against a real test spreadsheet               | Done        |
| [CHO-011](_archive/chores/CHO-011-the-dialog-tests-share-their-setup.md)                | The dialog tests share one way to open a dialog, one focus tour and one set of fixtures, before more dialogs copy them | Done        |
| [CHO-012](_archive/chores/CHO-012-the-other-tests-use-the-shared-fixtures.md)           | The other tests take their families, categories and connected state from the shared fixtures                           | Done        |
| [CHO-013](_archive/chores/CHO-013-the-page-focus-tour-tells-its-stops-apart.md)         | The page focus tour tells its stops apart, so it can't miss a text field                                               | Done        |
| [CHO-014](chores/CHO-014-slim-the-e2e-suite.md)                                         | The E2E suite holds geometry, and repeats a run per theme, language or width, only where that proves something         | Proposed    |
| [CHO-015](_archive/chores/CHO-015-check-adding-an-item-against-a-real-spreadsheet.md)   | Check STY-045's write (a new item's row appended to a roadmap's tab) against a real test spreadsheet                   | Done        |
| [CHO-016](chores/CHO-016-the-quality-reviewer-reads-the-whole-diff.md)                  | The quality reviewer reads the whole diff in one pass                                                                  | In progress |

Live chores sit in `chores/`; list each here as `CHO-<nnn>` with its Status token.

## Defects

| ID                                                                                                                 | Defect                                                                                         | Status       |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------ |
| [DEF-001](_archive/defects/DEF-001-roadmaps-heading-title-case.md)                                                 | The roadmaps heading is in Title Case                                                          | Done         |
| [DEF-002](_archive/defects/DEF-002-header-home-link-name-on-phones.md)                                             | On a phone, the header's home link is named without the word it shows                          | Done         |
| [DEF-003](_archive/defects/DEF-003-refusal-shows-stale-text-or-restores-removed-roadmap.md)                        | After a refused publish, "Use theirs" can show older text, and a removed roadmap can come back | Done         |
| [DEF-004](_archive/defects/DEF-004-pending-no-category-dropped-when-category-unlisted.md)                          | A pending "No category" is dropped, unwritten, once the roadmap's category leaves its list     | Won't fix    |
| [DEF-005](_archive/defects/DEF-005-about-form-shows-no-family-after-refresh.md)                                    | An open About form shows "No family" after Refresh reads a co-lead's family                    | Done         |
| [DEF-006](_archive/defects/DEF-006-a-refused-reconnect-drops-the-add-a-roadmap-dialog.md)                          | A reconnect Google refuses drops the "Add a roadmap" dialog and what was typed                 | Won't fix    |
| [DEF-007](_archive/defects/DEF-007-status-panels-have-rounded-corners.md)                                          | Status panels have rounded corners; cards and the About panel beside them are square           | Done         |
| [DEF-008](_archive/defects/DEF-008-focus-is-lost-after-add-a-roadmap-closes-in-safari.md)                          | Focus is lost when "Add a roadmap" closes, for a Product Lead who clicked it in Safari         | Done         |
| [DEF-009](_archive/defects/DEF-009-a-published-new-item-is-not-shown-when-the-read-after-it-fails.md)              | A new item that was published is not shown when the read after the publish fails               | Done         |
| [DEF-010](_archive/defects/DEF-010-a-publishing-dialog-changes-what-it-shows-once-written.md)                      | A dialog that publishes changes what it shows once its changes are no longer pending           | Done         |
| [DEF-011](_archive/defects/DEF-011-an-edit-back-to-the-text-last-read-is-dropped-before-a-read-holds-a-publish.md) | An edit back to the text last read is dropped while a published edit waits for a read          | Superseded   |
| [DEF-012](_archive/defects/DEF-012-an-item-without-an-id-edited-again-before-a-read-is-reported-changed.md)        | An item without an ID, edited again before a read holds its publish, is reported changed       | Superseded   |
| [DEF-013](_archive/defects/DEF-013-a-test-checks-the-roadmap-dialog-s-opening-focus-before-it-moves.md)            | A test checks the roadmap dialog's opening focus before it has moved                           | Done         |
| [DEF-014](_archive/defects/DEF-014-publish-roadmap-carries-its-dialog-and-outcome-to-another-roadmap.md)           | "Publish roadmap" carries its dialog and outcome onto another roadmap's page                   | Done         |
| [DEF-015](_archive/defects/DEF-015-a-write-the-editor-can-t-read-back-leaves-the-app-out-of-step.md)               | A write the editor can't read back leaves the app out of step with the data source             | Done         |
| [DEF-016](defects/DEF-016-the-item-dialog-s-focus-tour-counts-a-focus-guard-as-a-stop.md)                          | The item dialog's focus tour counts a focus guard as a stop                                    | Needs triage |

A defect found during delivery is recorded in `defects/` with
Status `Needs triage` and listed here until the owner triages it.
