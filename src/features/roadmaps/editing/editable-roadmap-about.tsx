import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import type { Roadmap } from "@/domain/roadmap/roadmap"

import { RoadmapAbout } from "../components/roadmap-about"
import { RoadmapDialog } from "../dialogs/roadmap-dialog"
import { useRoadmapLists } from "../hooks/use-roadmap-lists"
import { EditControls } from "./edit-controls"
import {
  applyRoadmapChanges,
  changedRoadmapFields,
  hasChoiceChange,
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

export interface EditableRoadmapAboutProps {
  /** The roadmap as last read. */
  roadmap: Roadmap
}

/**
 * What the roadmap is about, with its pending English shown and tagged, and an Edit
 * that opens the roadmap dialog on it (STY-043): its title, status, product lead,
 * vision and service description (STY-025 S5), its family and category (STY-028), and
 * when it was last updated (STY-036). Done keeps the edits pending; the panel stays as
 * it is behind the dialog.
 */
export function EditableRoadmapAbout({ roadmap }: EditableRoadmapAboutProps) {
  const { t } = useTranslation()
  const store = usePendingChangesStore()
  const changes = useRoadmapChanges(roadmap.id)
  const undoable = !awaitingRefresh(usePendingChanges(), roadmap.id)
  // The roadmap as read and as shown when the dialog opened, which its edits are made
  // from: a co-lead's change read while it is open never changes what Done keeps.
  const [opened, setOpened] = useState<{
    read: Roadmap
    shown: Roadmap
  } | null>(null)
  const editButton = useRef<HTMLButtonElement>(null)
  const { lists } = useRoadmapLists(hasChoiceChange(changes))
  const shown = applyRoadmapChanges(roadmap, changes, lists)

  const close = () => {
    setOpened(null)
  }
  const done = (values: RoadmapValues) => {
    const from = opened ?? { read: roadmap, shown }
    store.update(roadmap.id, (current) =>
      editRoadmap(current, from.read, values, {
        shown: from.shown,
        latest: roadmap,
      }),
    )
    close()
  }
  const undo = () => {
    if (!undoable) return
    store.update(roadmap.id, undoRoadmap)
    // "Undo changes" goes with the changes.
    editButton.current?.focus()
  }

  return (
    <>
      <RoadmapAbout
        roadmap={shown}
        actions={
          <EditControls
            subject={t("roadmaps.about.title")}
            changed={changedRoadmapFields(changes).length > 0}
            undoable={undoable}
            editButton={editButton}
            onEdit={() => {
              setOpened({ read: roadmap, shown })
            }}
            onUndo={undo}
          />
        }
      />
      <RoadmapDialog
        open={opened !== null}
        roadmap={shown}
        onDone={done}
        onClose={close}
      />
    </>
  )
}
