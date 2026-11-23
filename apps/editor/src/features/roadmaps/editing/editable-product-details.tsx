import { useRef } from "react"
import { useTranslation } from "react-i18next"

import type { Roadmap } from "@/domain/roadmap/roadmap"

import { ProductDetails } from "../components/product-details"
import { EditControls } from "./edit-controls"
import { changedRoadmapFields, undoRoadmap } from "./pending-changes"
import {
  usePendingChangesStore,
  useRoadmapChanges,
} from "./pending-changes-context"

export interface EditableProductDetailsProps {
  /** The roadmap as last read. */
  roadmap: Roadmap
  /** The roadmap as shown, its pending edits applied. */
  shown: Roadmap
  /** Edit was pressed: opens the roadmap dialog, with Edit, where focus returns. */
  onEdit: (from: HTMLElement | null) => void
}

/**
 * A roadmap's facts and its product details (`ProductDetails`), with its pending
 * English shown and tagged. Open, the details end in the Changed tag and "Undo
 * changes", while a change is pending, and an Edit that opens the roadmap dialog on
 * them (STY-043, STY-065 S3): the roadmap's title, status, product lead, vision and
 * service description (STY-025 S5), its family and category (STY-028), and when it was
 * last updated (STY-036). The details stay as they are behind the dialog.
 */
export function EditableProductDetails({
  roadmap,
  shown,
  onEdit,
}: EditableProductDetailsProps) {
  const { t } = useTranslation()
  const store = usePendingChangesStore()
  const changes = useRoadmapChanges(roadmap.id)
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const changed = changedRoadmapFields(changes).length > 0

  return (
    <ProductDetails
      roadmap={shown}
      changed={changed}
      actions={
        <EditControls
          subject={t("roadmaps.productDetails.title")}
          size="default"
          align="start"
          pending={changed ? "changed" : undefined}
          editButton={editButtonRef}
          onEdit={() => {
            onEdit(editButtonRef.current)
          }}
          onDrop={() => {
            store.update(roadmap.id, undoRoadmap)
            // "Undo changes" goes with the changes.
            editButtonRef.current?.focus()
          }}
        />
      }
    />
  )
}
