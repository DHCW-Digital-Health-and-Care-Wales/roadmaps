import { useId, useLayoutEffect, useRef } from "react"
import { useTranslation } from "react-i18next"

import {
  ITEM_TEXT_FIELDS,
  itemValue,
  type ItemChanges,
  type ItemTextField,
} from "@/domain/roadmap/roadmap-changes"
import { localise } from "@/domain/roadmap/localised-text"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import {
  ROADMAP_PLACEMENTS,
  type RoadmapPlacement,
} from "@/domain/roadmap/roadmap-placement"
import { useLanguage } from "@/i18n"

import { RoadmapItemCard } from "../components/roadmap-item-card"
import { EditControls } from "./edit-controls"
import { EditForm, type EditFormField } from "./edit-form"
import { editFormFields } from "./edit-form-fields"
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
  item: RoadmapItem
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
 * An item's card with its pending English and placement shown and tagged, an Edit that
 * turns the card into a form for its title, description, expected outcome, phase and
 * placement (STY-025 S1–S4, S6; STY-031 S3), and a Move menu (STY-031 S1, S2). Its other
 * fields stay on show; nothing is written until the roadmap is published.
 */
export function EditableItemCard({
  roadmapId,
  items,
  item,
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

  return (
    <RoadmapItemCard
      item={shown}
      headingId={headingId}
      form={
        mode.editing ? (
          <EditForm
            fields={[...text.fields, placementField]}
            initial={{
              ...text.initial,
              placement: itemValue(shown, "placement"),
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
