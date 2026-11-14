import { useTranslation } from "react-i18next"

import type { Roadmap } from "@/domain/roadmap/roadmap"

import { useAddingRoadmap } from "../hooks/use-add-roadmap"
import { AddRoadmapForm } from "./add-roadmap-form"
import { FormDialog } from "./form-dialog"

export interface RoadmapDialogProps {
  open: boolean
  /** The roadmap list as cached, whose addresses a new short name can't have. */
  roadmaps: readonly Roadmap[]
  /** The roadmap was added, as the list now gives it. */
  onAdded: (roadmap: Roadmap) => void
  onClose: () => void
}

/**
 * The roadmap dialog (EPC-011): the one place a roadmap is added. It closes as
 * `FormDialog` sets, except while the roadmap is being added.
 */
export function RoadmapDialog({
  open,
  roadmaps,
  onAdded,
  onClose,
}: RoadmapDialogProps) {
  const { t } = useTranslation()
  return (
    <FormDialog
      open={open}
      title={t("roadmaps.add.title")}
      busy={useAddingRoadmap()}
      onClose={onClose}
    >
      {(titleId) => (
        <AddRoadmapForm
          labelledBy={titleId}
          roadmaps={roadmaps}
          onAdded={onAdded}
        />
      )}
    </FormDialog>
  )
}
