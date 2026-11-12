import { useTranslation } from "react-i18next"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  EDITABLE_ROADMAP_FIELDS,
  roadmapText,
  type EditableRoadmapField,
} from "@/domain/roadmap/roadmap-changes"

import { RoadmapAbout } from "../components/roadmap-about"
import { EditControls } from "./edit-controls"
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
  usePendingChanges,
  usePendingChangesStore,
  useRoadmapChanges,
} from "./pending-changes-context"
import { awaitingRefresh } from "./pending-changes-store"
import { useEditMode } from "./use-edit-mode"

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
  const undoable = !awaitingRefresh(usePendingChanges(), roadmap.id)
  const mode = useEditMode<{ read: Roadmap; shown: Roadmap }>()
  const shown = applyRoadmapChanges(roadmap, changes)
  const changed = changedRoadmapFields(changes).length > 0

  // A field's edit is made from the roadmap as the form opened on it.
  const done = (values: RoadmapValues) => {
    const opened = mode.opened ?? { read: roadmap, shown }
    store.update(roadmap.id, (current) =>
      editRoadmap(current, opened.read, values, {
        shown: opened.shown,
        latest: roadmap,
      }),
    )
    mode.close()
  }
  const undo = () => {
    if (!undoable) return
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
            undoable={undoable}
            editButton={mode.editButton}
            onEdit={() => {
              mode.open({ read: roadmap, shown })
            }}
            onUndo={undo}
          />
        )
      }
    />
  )
}
