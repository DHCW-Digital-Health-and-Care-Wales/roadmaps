import {
  PencilIcon,
  PencilLineIcon,
  PlusIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react"
import type { ReactNode, RefObject } from "react"
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

/** The "New" tag on an item added and not yet published, named for it (STY-046 S9). */
function NewTag({ subject }: { subject: string }) {
  const { t } = useTranslation()
  return (
    <Badge variant="info">
      <PlusIcon data-icon="inline-start" aria-hidden="true" />
      {t("roadmaps.edit.new")} <span className="sr-only">{subject}</span>
    </Badge>
  )
}

export interface EditControlsProps {
  /** What is edited, for assistive technology: "Edit First item". */
  subject: string
  /**
   * What of it is pending, if anything: `changed`, its edits, tagged "Changed", which
   * "Undo changes" drops; or `new`, the whole of an item added and not yet published,
   * tagged "New", which Remove drops (STY-046).
   */
  pending: "changed" | "new" | undefined
  /**
   * Whether it can be edited, and what is pending dropped, now, which it can unless
   * told; the buttons stay focusable when not.
   */
  editable?: boolean
  editButton: RefObject<HTMLButtonElement | null>
  /** The buttons' size: `sm` on a card, as default; 40px beside About (STY-059 D6). */
  size?: "default" | "sm"
  /** A control between the drop button and Edit, such as an item's Move menu (STY-031). */
  move?: ReactNode
  onEdit: () => void
  /** "Undo changes" or Remove was chosen. */
  onDrop: () => void
}

/**
 * "Changed" or "New", then "Undo changes" or Remove, while something is pending, then
 * `move` and Edit.
 */
export function EditControls({
  subject,
  pending,
  editable = true,
  editButton,
  size = "sm",
  move,
  onEdit,
  onDrop,
}: EditControlsProps) {
  const { t } = useTranslation()
  const isNew = pending === "new"
  const DropIcon = isNew ? Trash2Icon : Undo2Icon
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {pending === "changed" && <ChangedTag />}
      {isNew && <NewTag subject={subject} />}
      <div className="flex flex-wrap gap-2 sm:ml-auto">
        {pending && (
          <Button
            variant="secondary"
            size={size}
            disabled={!editable}
            focusableWhenDisabled
            onClick={onDrop}
          >
            <DropIcon data-icon="inline-start" aria-hidden="true" />
            {t(isNew ? "roadmaps.edit.remove" : "roadmaps.edit.undo")}{" "}
            <span className="sr-only">{subject}</span>
          </Button>
        )}
        {move}
        <Button
          ref={editButton}
          variant="secondary"
          size={size}
          disabled={!editable}
          focusableWhenDisabled
          onClick={onEdit}
        >
          <PencilIcon data-icon="inline-start" aria-hidden="true" />
          {t("roadmaps.edit.edit")} <span className="sr-only">{subject}</span>
        </Button>
      </div>
    </div>
  )
}
