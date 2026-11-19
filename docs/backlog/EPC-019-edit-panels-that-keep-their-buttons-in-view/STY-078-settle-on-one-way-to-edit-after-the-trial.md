# STY-078: Settle on one way to edit after the side-panel trial

- **Status**: Placeholder — promoted once the owner has tried STY-077's side panel and chosen
- **Type**: Feature + Refactor
- **Area**: Features/UI + i18n (en + cy)
- **Epic**: [EPC-019-edit-panels-that-keep-their-buttons-in-view](README.md)
- **Depends on**: STY-077 (hard: the trial it settles)
- **Binding ADRs**: ADR-005, ADR-010
- **Suggested model**: Sonnet — removing one placement or making it permanent

## Summary

STY-077 makes the side panel a trial, chosen in the account menu and off by default.
After the trial the owner decides whether the forms always open as a side panel,
always as a dialog, or keep the choice. The losing placement goes, and with it the menu
item, its copy and its stored value.

## Why this is a placeholder

The owner chose (2026-11-19) to run the side panel as a trial and decide afterwards.
The decision is the owner's and waits on the trial.

## Rough shape of the work

_Not acceptance criteria._

- Side panel kept, toggle gone: `FormDialog` always sets `position="right"`; remove the
  preference (`components/edit-surface/`), its menu item, its two strings and its key. A
  stored value is simply no longer read.
- Dialog kept, toggle gone: remove the `right` position from `DialogContent` and the
  same preference pieces.
- Both kept: drop the trial wording from EPC-019 and STY-077's Status, and close this
  as Won't do.
