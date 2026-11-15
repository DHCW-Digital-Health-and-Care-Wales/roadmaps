import { CircleCheckIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import {
  isRoadmapPlacement,
  type RoadmapPlacement,
} from "@/domain/roadmap/roadmap-placement"

import { FormDialog, type FormDialogProps } from "./form-dialog"
import {
  type AddItemFormProps,
  type EditItemFormProps,
  ItemForm,
} from "./item-form"

/** What the dialog is given to add items, however many before it closes. */
type AddingItems = Omit<
  AddItemFormProps,
  "labelledBy" | "placement" | "takesFocus"
>

/** What the dialog is given to add items, or to edit the one it is given. */
type ItemDialogForm = AddingItems | Omit<EditItemFormProps, "labelledBy">

export type ItemDialogProps = ItemDialogForm &
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
      {(titleId) =>
        editing ? (
          <ItemForm labelledBy={titleId} {...form} />
        ) : (
          <AddItemForms labelledBy={titleId} {...form} />
        )
      }
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
 * added (STY-046 S4). The line's place is there from the start, so it is announced.
 */
function AddItemForms({
  onAdd,
  ...form
}: AddingItems & Pick<AddItemFormProps, "labelledBy">) {
  const { t } = useTranslation()
  const [last, setLast] = useState<LastAdded | null>(null)
  return (
    <div>
      <div role="status">
        {last && (
          <DismissibleNotice
            role="note"
            variant="success"
            Icon={CircleCheckIcon}
            className="mb-4"
          >
            <p>{t("roadmaps.edit.addItem.added", { title: last.title })}</p>
          </DismissibleNotice>
        )}
      </div>
      <ItemForm
        // A form of its own for each item: nothing of the last one stays in its fields.
        key={last?.count ?? 0}
        {...form}
        placement={last?.placement ?? null}
        takesFocus={last !== null}
        onAdd={(values, then) => {
          onAdd(values, then)
          if (then === "another") {
            const { title = "", placement = "" } = values
            setLast({
              count: (last?.count ?? 0) + 1,
              title,
              placement: isRoadmapPlacement(placement) ? placement : null,
            })
          }
        }}
      />
    </div>
  )
}
