import { useTranslation } from "react-i18next"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  EDITABLE_ROADMAP_FIELDS,
  roadmapText,
  type EditableRoadmapField,
} from "@/domain/roadmap/roadmap-changes"

import { RoadmapAbout } from "../components/roadmap-about"
import { EditControls } from "./edit-controls"
import { useEditMode } from "./use-edit-mode"
import { EditForm } from "./edit-form"
import { editFormFields } from "./edit-form-fields"
import {
  applyRoadmapChanges,
  changedRoadmapFields,
  editRoadmap,
  undoRoadmap,
  type RoadmapValues,
} from "./pending-changes"
import {
  useRoadmapChanges,
  usePendingChangesStore,
} from "./pending-changes-context"

/** Fields that hold paragraphs; the others are one line unless they already break. */
const multilineRoadmapFields: ReadonlySet<EditableRoadmapField> = new Set([
  "vision",
  "serviceDescription",
])

export interface EditableRoadmapAboutProps {
  /** The roadmap as last read. */
  roadmap: Roadmap
}

/**
 * What the roadmap is about, with its pending English shown and tagged, and an Edit for
 * its title, status, product lead, vision and service description (STY-025 S5).
 */
export function EditableRoadmapAbout({ roadmap }: EditableRoadmapAboutProps) {
  const { t } = useTranslation()
  const store = usePendingChangesStore()
  const changes = useRoadmapChanges(roadmap.id)
  const mode = useEditMode<Roadmap>()
  const shown = applyRoadmapChanges(roadmap, changes)
  const changed = changedRoadmapFields(changes).length > 0

  // A field's edit is made from the roadmap as the form opened on it.
  const done = (values: RoadmapValues) => {
    const opened = mode.opened ?? roadmap
    store.update(roadmap.id, (current) => editRoadmap(current, opened, values))
    mode.close()
  }
  const undo = () => {
    store.update(roadmap.id, undoRoadmap)
    mode.refocus()
  }

  const { fields, initial } = editFormFields(
    EDITABLE_ROADMAP_FIELDS,
    (field) => roadmapText(shown, field),
    (field) => t(`roadmaps.edit.roadmapFields.${field}`),
    multilineRoadmapFields,
  )

  return (
    <RoadmapAbout
      roadmap={shown}
      form={
        mode.editing
          ? (headingId) => (
              <EditForm
                fields={fields}
                initial={initial}
                labelledBy={headingId}
                onDone={done}
                onCancel={mode.close}
              />
            )
          : undefined
      }
      actions={
        mode.editing ? undefined : (
          <EditControls
            subject={t("roadmaps.about.title")}
            changed={changed}
            editButton={mode.editButton}
            onEdit={() => {
              mode.open(roadmap)
            }}
            onUndo={undo}
          />
        )
      }
    />
  )
}
