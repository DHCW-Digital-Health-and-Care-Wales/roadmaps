import { useId } from "react"
import { useTranslation } from "react-i18next"

import {
  EDITABLE_ITEM_FIELDS,
  itemText,
  type EditableItemField,
  type ItemChanges,
} from "@/domain/roadmap/roadmap-changes"
import { localise } from "@/domain/roadmap/localised-text"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { useLanguage } from "@/i18n"

import { RoadmapItemCard } from "../components/roadmap-item-card"
import { EditControls } from "./edit-controls"
import { useEditMode } from "./use-edit-mode"
import { EditForm } from "./edit-form"
import { editFormFields } from "./edit-form-fields"
import {
  applyItemChanges,
  editItem,
  matchItemChanges,
  undoItem,
  type ItemValues,
} from "./pending-changes"
import { usePendingChangesStore } from "./pending-changes-context"

/** Fields that hold paragraphs; the others are one line unless they already break. */
const multilineItemFields: ReadonlySet<EditableItemField> = new Set([
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
}

/**
 * An item's card with its pending English shown and tagged, and an Edit that turns the
 * card into a form for its title, description, expected outcome and phase (STY-025 S1–S4,
 * S6). Its other fields stay on show; nothing is written until the roadmap is published.
 */
export function EditableItemCard({
  roadmapId,
  items,
  item,
  position,
  entry,
}: EditableItemCardProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const store = usePendingChangesStore()
  const headingId = useId()
  const mode = useEditMode<RoadmapItem>()
  const shown = applyItemChanges(item, entry)
  const title = localise(shown.title, language)

  // Each change finds the item's entry afresh, so an edit never builds on a stale one;
  // a field's edit is made from the item as the form opened on it.
  const done = (values: ItemValues) => {
    const opened = mode.opened ?? item
    store.update(roadmapId, (changes) =>
      editItem(
        changes,
        matchItemChanges(items, changes).get(position),
        opened,
        position,
        values,
      ),
    )
    mode.close()
  }
  const undo = () => {
    store.update(roadmapId, (changes) => {
      const current = matchItemChanges(items, changes).get(position)
      return current ? undoItem(changes, current) : changes
    })
    mode.refocus()
  }

  const { fields, initial } = editFormFields(
    EDITABLE_ITEM_FIELDS,
    (field) => itemText(shown, field),
    (field) => t(`roadmaps.edit.itemFields.${field}`),
    multilineItemFields,
  )

  return (
    <RoadmapItemCard
      item={shown}
      headingId={headingId}
      form={
        mode.editing ? (
          <EditForm
            fields={fields}
            initial={initial}
            labelledBy={headingId}
            onDone={done}
            onCancel={mode.close}
          />
        ) : undefined
      }
      actions={
        mode.editing ? undefined : (
          <EditControls
            subject={title}
            changed={entry !== undefined}
            editButton={mode.editButton}
            onEdit={() => {
              mode.open(item)
            }}
            onUndo={undo}
          />
        )
      }
    />
  )
}
