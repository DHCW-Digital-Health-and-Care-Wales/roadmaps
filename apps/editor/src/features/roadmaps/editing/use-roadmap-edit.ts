import { useRef, useState } from "react"

import type { Roadmap } from "@/domain/roadmap/roadmap"

import type { EditRoadmapFormProps } from "../dialogs/edit-roadmap-form"
import type { FormDialogProps } from "../dialogs/form-dialog"
import { editRoadmap, type RoadmapValues } from "./pending-changes"
import { usePendingChangesStore } from "./pending-changes-context"

/** The page's one roadmap dialog, editing, as `useRoadmapEdit` gives it. */
export interface RoadmapEdit {
  /** What `RoadmapDialog` takes. */
  readonly dialog: Pick<EditRoadmapFormProps, "roadmap" | "onDone"> &
    Pick<FormDialogProps, "open" | "onClose" | "opener">
  /** Opens the dialog; `from` is the control pressed, where focus returns as it closes. */
  readonly open: (from: HTMLElement | null) => void
}

/**
 * The roadmap dialog of a roadmap's page, opened on its product details (STY-043),
 * which the page holds, since two controls open it: Edit in the open details, and
 * "Edit product details" in More (STY-065 S5). Done keeps the edits pending, made from
 * the roadmap as read and as shown when the dialog opened: a co-lead's change read
 * while it is open never changes what Done keeps.
 */
export function useRoadmapEdit(roadmap: Roadmap, shown: Roadmap): RoadmapEdit {
  const store = usePendingChangesStore()
  const [opened, setOpened] = useState<{
    read: Roadmap
    shown: Roadmap
  } | null>(null)
  const openerRef = useRef<HTMLElement>(null)

  const close = () => {
    setOpened(null)
  }
  return {
    dialog: {
      open: opened !== null,
      // As shown when it opened, so its options match the values it holds, whatever a
      // Refresh reads meanwhile (DEF-005).
      roadmap: opened?.shown ?? shown,
      onDone: (values: RoadmapValues) => {
        if (!opened) return
        store.update(roadmap.id, (current) =>
          editRoadmap(current, opened.read, values, {
            shown: opened.shown,
            latest: roadmap,
          }),
        )
        close()
      },
      onClose: close,
      opener: openerRef,
    },
    open: (from) => {
      openerRef.current = from
      setOpened({ read: roadmap, shown })
    },
  }
}
