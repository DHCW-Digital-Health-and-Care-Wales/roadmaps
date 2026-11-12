import { PencilIcon, PencilLineIcon, Undo2Icon } from "lucide-react"
import type { RefObject } from "react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/** The "Changed" tag on whatever holds a pending change. */
export interface ChangedTagProps {
  id?: string
  /** What it says, if not "Changed": the list card's "Unpublished changes". */
  label?: string
}

export function ChangedTag({ id, label }: ChangedTagProps) {
  const { t } = useTranslation()
  return (
    <Badge id={id} variant="info">
      <PencilLineIcon data-icon="inline-start" aria-hidden="true" />
      {label ?? t("roadmaps.edit.changed")}
    </Badge>
  )
}

export interface EditControlsProps {
  /** What is edited, for assistive technology: "Edit First item". */
  subject: string
  changed: boolean
  /** Whether "Undo changes" is available; it stays focusable when not. */
  undoable: boolean
  editButton: RefObject<HTMLButtonElement | null>
  onEdit: () => void
  onUndo: () => void
}

/** "Changed", "Undo changes" while something is pending, and Edit. */
export function EditControls({
  subject,
  changed,
  undoable,
  editButton,
  onEdit,
  onUndo,
}: EditControlsProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {changed && <ChangedTag />}
      <div className="flex flex-wrap gap-2 sm:ml-auto">
        {changed && (
          <Button
            variant="secondary"
            size="sm"
            disabled={!undoable}
            focusableWhenDisabled
            onClick={onUndo}
          >
            <Undo2Icon data-icon="inline-start" aria-hidden="true" />
            {t("roadmaps.edit.undo")} <span className="sr-only">{subject}</span>
          </Button>
        )}
        <Button ref={editButton} variant="secondary" size="sm" onClick={onEdit}>
          <PencilIcon data-icon="inline-start" aria-hidden="true" />
          {t("roadmaps.edit.edit")} <span className="sr-only">{subject}</span>
        </Button>
      </div>
    </div>
  )
}
