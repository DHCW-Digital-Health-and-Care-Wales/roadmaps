import { CircleCheckIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import type { ItemValues } from "@/domain/roadmap/roadmap-changes"
import {
  isRoadmapPlacement,
  type RoadmapPlacement,
} from "@/domain/roadmap/roadmap-placement"

import { blankItem } from "../editing/pending-changes"
import type { PublishAction } from "../editing/pending-changes-store"
import { FormDialog, type FormDialogProps } from "./form-dialog"
import { ItemForm, type ItemFormProps } from "./item-form"

/** What follows adding an item: the dialog closes, or its form empties for the next. */
export type AfterAdding = "close" | "another"

/** Where the adding form starts when quick add opens it: its title and placement. */
export interface AddingStart {
  readonly title: string
  readonly placement: RoadmapPlacement
}

/** What the dialog is given to add items, however many before it closes. */
interface AddingItems {
  /** What publishing the roadmap's changes is called, which the form's note names. */
  action: PublishAction
  /** What the first form starts from, when not an empty item (STY-081 S2). */
  start?: AddingStart | undefined
  /** "Add item" or "Add and start another" was chosen, with the new item's values. */
  onAdd: (values: ItemValues, then: AfterAdding) => void
}

/** What the dialog is given to edit an item: the item, and what Done does. */
type EditingItem = Pick<ItemFormProps, "opened" | "item" | "onDone">

export type ItemDialogProps = (AddingItems | EditingItem) &
  Pick<ItemFormProps, "tagsInUse" | "organisations"> &
  Pick<FormDialogProps, "open" | "onClose" | "opener">

/**
 * The item dialog (EPC-011): the one place an item is added and edited. Given an
 * `item` it edits it (STY-044); given none it adds one, or several (STY-046). It closes
 * as `FormDialog` sets.
 */
export function ItemDialog({
  open,
  onClose,
  opener,
  tagsInUse,
  organisations,
  ...form
}: ItemDialogProps) {
  const { t } = useTranslation()
  const editing = "item" in form
  return (
    <FormDialog
      open={open}
      title={t(
        editing ? "roadmaps.edit.itemHeading" : "roadmaps.edit.addItem.title",
      )}
      onClose={onClose}
      opener={opener}
    >
      {(labelledBy) => {
        const fields = { labelledBy, tagsInUse, organisations }
        return editing ? (
          <ItemForm {...fields} {...form} />
        ) : (
          <AddItemForms {...fields} {...form} />
        )
      }}
    </FormDialog>
  )
}

/** The item "Add and start another" last added, and how many it has added. */
interface LastAdded {
  count: number
  title: string
  placement: RoadmapPlacement | null
}

/**
 * The adding form, and after each "Add and start another" a new one in its place: empty,
 * on the same horizon or section, with focus in its title, under a line saying what was
 * added (STY-046 S4). The line's place is there from the start, so it is announced. The
 * first form is empty too, unless quick add gives it a title and a placement (`start`).
 */
function AddItemForms({
  action,
  start,
  onAdd,
  ...fields
}: AddingItems &
  Pick<ItemFormProps, "labelledBy" | "tagsInUse" | "organisations">) {
  const { t } = useTranslation()
  const [last, setLast] = useState<LastAdded | null>(null)
  // No horizon is chosen to start with, unless quick add chose one; the next form keeps
  // the last one's (D4, D5).
  const begun: ItemValues = last
    ? { placement: last.placement ?? "" }
    : {
        placement: start?.placement ?? "",
        ...(start && { title: start.title }),
      }
  const item = blankItem(begun)
  const add = (then: AfterAdding) => (changed: ItemValues) => {
    // The form gives the values changed since it opened, so not those it began with.
    const values = { ...begun, ...changed }
    onAdd(values, then)
    if (then === "close") return
    const { title = "", placement = "" } = values
    setLast({
      count: (last?.count ?? 0) + 1,
      title,
      placement: isRoadmapPlacement(placement) ? placement : null,
    })
  }
  return (
    // Pinned, a column that can shrink, so the form's body scrolls between the pinned
    // parts, and grows, so the form's buttons stay at the foot of a full-height side
    // panel; the line saying what was added stays in view, its title cut at three lines.
    <div className="flex flex-col pinned:min-h-0 pinned:grow">
      <div role="status">
        {last && (
          <DismissibleNotice
            role="note"
            variant="success"
            Icon={CircleCheckIcon}
            // Pinned, it sits under the header, in step with the body's padding.
            className="mb-4 pinned:mx-6 pinned:mt-4 pinned:mb-0 pinned:w-auto"
          >
            <p className="pinned:line-clamp-3 pinned:wrap-anywhere">
              {t("roadmaps.edit.addItem.added", { title: last.title })}
            </p>
          </DismissibleNotice>
        )}
      </div>
      <ItemForm
        // A form of its own for each item: nothing of the last one stays in its fields.
        key={last?.count ?? 0}
        {...fields}
        opened={{ read: item, shown: item }}
        item={item}
        onDone={add("close")}
        adding={{
          action,
          takesFocus: last !== null,
          onAnother: add("another"),
        }}
      />
    </div>
  )
}
