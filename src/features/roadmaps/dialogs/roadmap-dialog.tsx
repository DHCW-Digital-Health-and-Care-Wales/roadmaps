import { useTranslation } from "react-i18next"

import { useAddingRoadmap } from "../hooks/use-add-roadmap"
import { AddRoadmapForm, type AddRoadmapFormProps } from "./add-roadmap-form"
import { EditRoadmapForm, type EditRoadmapFormProps } from "./edit-roadmap-form"
import { FormDialog, type FormDialogProps } from "./form-dialog"

/** What the dialog is given to add a roadmap, or to edit the one it is given. */
type RoadmapDialogForm =
  | Omit<AddRoadmapFormProps, "labelledBy">
  | Omit<EditRoadmapFormProps, "labelledBy">

export type RoadmapDialogProps = RoadmapDialogForm &
  Pick<FormDialogProps, "open" | "onClose" | "opener">

/**
 * The roadmap dialog (EPC-011): the one place a roadmap is added, and where what it is
 * about is edited. Given a `roadmap` it edits it, with every About field and no short
 * name (STY-043); given none it adds one (STY-041). It closes as `FormDialog` sets,
 * except while a roadmap is being added.
 */
export function RoadmapDialog({
  open,
  onClose,
  opener,
  ...form
}: RoadmapDialogProps) {
  const { t } = useTranslation()
  const adding = useAddingRoadmap()
  const editing = "roadmap" in form
  return (
    <FormDialog
      open={open}
      title={t(editing ? "roadmaps.edit.roadmapHeading" : "roadmaps.add.title")}
      busy={!editing && adding}
      onClose={onClose}
      opener={opener}
    >
      {(titleId) =>
        editing ? (
          <EditRoadmapForm labelledBy={titleId} {...form} />
        ) : (
          <AddRoadmapForm labelledBy={titleId} {...form} />
        )
      }
    </FormDialog>
  )
}
