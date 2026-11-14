import { useId, useLayoutEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"

import {
  ITEM_TEXT_FIELDS,
  itemValue,
  type ItemChanges,
  type ItemTextField,
  organisationIdsOf,
  organisationIdsValue,
} from "@/domain/roadmap/roadmap-changes"
import { localise } from "@/domain/roadmap/localised-text"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import {
  ROADMAP_PLACEMENTS,
  type RoadmapPlacement,
} from "@/domain/roadmap/roadmap-placement"
import { useLanguage } from "@/i18n"

import { DetailList } from "../components/detail-list"
import { RoadmapItemCard } from "../components/roadmap-item-card"
import { localiseDetails } from "../nest-item-details"
import { shortNamesOf, sortOrganisations } from "../sort-organisations"
import { EditControls } from "./edit-controls"
import { EditForm, type EditFormField } from "./edit-form"
import { editFormFields } from "./edit-form-fields"
import { tagsInUse } from "./item-tags"
import { MoveMenu } from "./move-menu"
import {
  applyItemChanges,
  editItem,
  matchItemChanges,
  undoItem,
  type ItemValues,
} from "./pending-changes"
import {
  usePendingChanges,
  usePendingChangesStore,
} from "./pending-changes-context"
import { awaitingRefresh } from "./pending-changes-store"
import { TagList } from "./tag-list"
import { useEditMode } from "./use-edit-mode"

/** Fields that hold paragraphs; the others are one line unless they already break. */
const multilineItemFields: ReadonlySet<ItemTextField> = new Set([
  "description",
  "expectedOutcome",
])

export interface EditableItemCardProps {
  roadmapId: string
  /** The roadmap's items as last read, to find the item's pending changes by. */
  items: readonly RoadmapItem[]
  /**
   * The roadmap's items as the page shows them, pending changes applied, in `items`'
   * order: the others' tags are offered in the form (STY-037 S3).
   */
  shownItems: readonly RoadmapItem[]
  item: RoadmapItem
  /** The organisation list the item's organisations are named from (ADR-014). */
  organisations: readonly Organisation[]
  /** Its 0-based place in `items`. */
  position: number
  /** Its pending changes, if any. */
  entry: ItemChanges | undefined
  /** Which control takes focus as the card renders, once; see `onFocusRequest`. */
  focusRequest?: CardControl | undefined
  /**
   * Asks for focus on a control of the item's card once the page has re-rendered: a
   * change may move it to another placement's list, as a new card.
   */
  onFocusRequest: (position: number, control: CardControl) => void
  /** Called once a `focusRequest` has been met. */
  onFocused: () => void
  /** Names the item to `onHold`. */
  holdKey: string
  /**
   * Holds the card in the placement it showed as its form opened, while the form is
   * open, so no change moves it to another list and loses the form; `undefined` lets it
   * go.
   */
  onHold: (key: string, placement: RoadmapPlacement | null | undefined) => void
}

/** A control on an item's card that focus can return to. */
export type CardControl = "edit" | "move"

/**
 * An item's card with its pending English, placement, tags, organisations and details
 * shown and tagged, an Edit that turns the card into a form for its title, description,
 * expected outcome, phase, placement (STY-025 S1–S4, S6; STY-031 S3), tags (STY-037),
 * organisations (STY-034 S1–S4) and details (STY-039), and a Move menu (STY-031 S1,
 * S2). Its other fields stay on show; nothing is written until the roadmap is
 * published.
 */
export function EditableItemCard({
  roadmapId,
  items,
  shownItems,
  item,
  organisations,
  position,
  entry,
  focusRequest,
  onFocusRequest,
  onFocused,
  holdKey,
  onHold,
}: EditableItemCardProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const store = usePendingChangesStore()
  const undoable = !awaitingRefresh(usePendingChanges(), roadmapId)
  const headingId = useId()
  const mode = useEditMode<{ read: RoadmapItem; shown: RoadmapItem }>()
  const moveButton = useRef<HTMLButtonElement>(null)
  const shown = applyItemChanges(item, entry)
  const title = localise(shown.title, language)

  // A layout effect, as `useEditMode`'s, so focus lands before the shell rescues it.
  useLayoutEffect(() => {
    if (focusRequest === undefined) return
    const control = focusRequest === "move" ? moveButton : mode.editButton
    control.current?.focus()
    onFocused()
  }, [focusRequest, mode.editButton, onFocused])

  const heldPlacement = mode.opened?.shown.placement
  useLayoutEffect(() => {
    if (heldPlacement === undefined) return
    onHold(holdKey, heldPlacement)
    return () => {
      onHold(holdKey, undefined)
    }
  }, [heldPlacement, holdKey, onHold])

  // Each change finds the item's entry afresh, so an edit never builds on a stale one;
  // a field's edit is made from the item as the form opened on it.
  const done = (values: ItemValues) => {
    const opened = mode.opened ?? { read: item, shown }
    store.update(roadmapId, (changes) =>
      editItem(
        changes,
        matchItemChanges(items, changes).get(position),
        opened.read,
        position,
        values,
        { shown: opened.shown, latest: item },
      ),
    )
    closeForm()
  }
  // Lets the card go in the same update, so focus follows it to the list it now shows in.
  const closeForm = () => {
    onHold(holdKey, undefined)
    mode.close()
    onFocusRequest(position, "edit")
  }
  const move = (placement: RoadmapPlacement) => {
    store.update(roadmapId, (changes) =>
      editItem(
        changes,
        matchItemChanges(items, changes).get(position),
        item,
        position,
        { placement },
      ),
    )
    onFocusRequest(position, "move")
  }
  const undo = () => {
    if (!undoable) return
    store.update(roadmapId, (changes) => {
      const current = matchItemChanges(items, changes).get(position)
      return current ? undoItem(changes, current) : changes
    })
    mode.refocus()
    onFocusRequest(position, "edit")
  }

  const text = editFormFields(
    ITEM_TEXT_FIELDS,
    (field) => itemValue(shown, field),
    (field) => t(`roadmaps.edit.itemFields.${field}`),
    multilineItemFields,
  )
  // The form keeps the placement it opened on, so its options follow that one: a
  // co-lead's placing the item since can't take the none option from the form's value.
  const openedPlacement = (mode.opened?.shown ?? shown).placement
  const placementField: EditFormField<"placement"> = {
    name: "placement",
    label: t("roadmaps.edit.itemFields.placement"),
    multiline: false,
    options: [
      // An unplaced item starts on none, which can't be chosen again (S4).
      ...(openedPlacement === null
        ? [
            {
              value: "",
              label: t("roadmaps.edit.choosePlacement"),
              disabled: true,
            },
          ]
        : []),
      ...ROADMAP_PLACEMENTS.map((placement) => ({
        value: placement,
        label: t(`roadmaps.items.placements.${placement}`),
      })),
    ],
  }

  // Tags stay English. The roadmap's other items' tags are counted only for a form.
  const editing = mode.editing
  const inUse = useMemo(
    () =>
      editing
        ? tagsInUse(
            shownItems
              .filter((_, at) => at !== position)
              .map(({ tags }) => tags.map(({ en }) => en)),
          )
        : [],
    [editing, shownItems, position],
  )
  // Tags with Welsh versions are shown as the card shows them, not changed (S20).
  const tagsField: EditFormField<"tags"> = item.hasWelshTags
    ? {
        name: "tags",
        label: t("roadmaps.items.fields.tags"),
        multiline: false,
        fixed: {
          text:
            shown.tags.length > 0 ? (
              <TagList
                tags={shown.tags.map((tag) => localise(tag, language))}
              />
            ) : (
              t("roadmaps.edit.tags.none")
            ),
          notice: t("roadmaps.edit.tags.welshLocked"),
        },
      }
    : {
        name: "tags",
        label: t("roadmaps.edit.itemFields.tags"),
        multiline: false,
        tags: { inUse },
      }

  // Short names and codes stay English; the order is the card's (ADR-014).
  const unknownCodes = (mode.opened?.read ?? item).unknownOrganisationCodes
  const organisationsField: EditFormField<"organisationIds"> = {
    name: "organisationIds",
    label: t("roadmaps.edit.itemFields.organisationIds"),
    multiline: false,
    options: sortOrganisations(
      organisations,
      ({ shortName }) => shortName,
      language,
    ).map(({ id, code, shortName }) => ({
      value: id,
      label: t("roadmaps.edit.organisationChoice", { shortName, code }),
    })),
    many: {
      ofValue: organisationIdsOf,
      toValue: organisationIdsValue,
      // Named as the card names them, which this field stands in for (STY-038 D2).
      summary: (chosen) =>
        shortNamesOf(organisations, chosen, language).join(", "),
      none: t("roadmaps.edit.organisations.none"),
      subject: t("roadmaps.edit.organisations.subject"),
    },
    ...(unknownCodes.length > 0 && {
      hint: t("roadmaps.edit.unknownOrganisations", {
        count: unknownCodes.length,
        codes: unknownCodes.join(", "),
      }),
    }),
  }

  // Details with Welsh versions are shown as the card shows them, not changed (S18).
  const detailsField: EditFormField<"details"> = item.hasWelshDetails
    ? {
        name: "details",
        label: t("roadmaps.items.fields.details"),
        multiline: false,
        fixed: {
          text:
            shown.details.length > 0 ? (
              <DetailList details={localiseDetails(shown.details, language)} />
            ) : (
              t("roadmaps.edit.details.none")
            ),
          notice: t("roadmaps.edit.details.welshLocked"),
        },
      }
    : {
        name: "details",
        label: t("roadmaps.edit.itemFields.details"),
        multiline: false,
        details: true,
      }

  return (
    <RoadmapItemCard
      item={shown}
      organisations={organisations}
      headingId={headingId}
      form={
        mode.editing ? (
          <EditForm
            fields={[
              ...text.fields,
              placementField,
              tagsField,
              organisationsField,
              detailsField,
            ]}
            initial={{
              ...text.initial,
              placement: itemValue(shown, "placement"),
              tags: itemValue(shown, "tags"),
              organisationIds: itemValue(shown, "organisationIds"),
              details: itemValue(shown, "details"),
            }}
            labelledBy={headingId}
            onDone={done}
            onCancel={closeForm}
          />
        ) : undefined
      }
      actions={
        mode.editing ? undefined : (
          <EditControls
            subject={title}
            changed={entry !== undefined}
            undoable={undoable}
            editButton={mode.editButton}
            move={
              <MoveMenu
                subject={title}
                placement={shown.placement}
                button={moveButton}
                onMove={move}
              />
            }
            onEdit={() => {
              mode.open({ read: item, shown })
            }}
            onUndo={undo}
          />
        )
      }
    />
  )
}
