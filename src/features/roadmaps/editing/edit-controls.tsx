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
import { cn } from "@/lib/utils"

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

/** What of an item or a roadmap is pending: see `EditControlsProps.pending`. */
export type Pending = "changed" | "new" | undefined

/** "Changed" or "New" for what is pending, or nothing. */
export function PendingTag({
  pending,
  subject,
}: {
  pending: Pending
  /** Names what is new, for assistive technology: "New First item". */
  subject: string
}) {
  if (pending === "changed") return <ChangedTag />
  if (pending === "new") return <NewTag subject={subject} />
  return null
}

interface ButtonProps {
  /** What the button acts on, for assistive technology: "Edit First item". */
  subject: string
  /** Held, though focusable: what it does can't be done for now. */
  disabled: boolean
  size: "default" | "sm"
}

/** "Undo changes", or Remove for what is `new`, which drops what is pending. */
export function DropButton({
  subject,
  pending,
  disabled,
  size,
  onDrop,
}: ButtonProps & { pending: "changed" | "new"; onDrop: () => void }) {
  const { t } = useTranslation()
  const isNew = pending === "new"
  const DropIcon = isNew ? Trash2Icon : Undo2Icon
  return (
    <Button
      variant="secondary"
      size={size}
      disabled={disabled}
      focusableWhenDisabled
      onClick={onDrop}
    >
      <DropIcon data-icon="inline-start" aria-hidden="true" />
      {t(isNew ? "roadmaps.edit.remove" : "roadmaps.edit.undo")}{" "}
      <span className="sr-only">{subject}</span>
    </Button>
  )
}

/** Edit, its word shown unless `iconOnly`, its name the same either way. */
export function EditButton({
  subject,
  disabled,
  size,
  iconOnly = false,
  button,
  onEdit,
}: ButtonProps & {
  iconOnly?: boolean
  button: RefObject<HTMLButtonElement | null>
  onEdit: () => void
}) {
  const { t } = useTranslation()
  return (
    <Button
      ref={button}
      variant="secondary"
      size={iconOnly ? "icon-sm" : size}
      disabled={disabled}
      focusableWhenDisabled
      onClick={onEdit}
    >
      <PencilIcon data-icon="inline-start" aria-hidden="true" />
      <span className={cn(iconOnly && "sr-only")}>
        {t("roadmaps.edit.edit")}
      </span>{" "}
      <span className="sr-only">{subject}</span>
    </Button>
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
  pending: Pending
  /**
   * Whether it can be edited, and what is pending dropped, now, which it can unless
   * told; the buttons stay focusable when not.
   */
  editable?: boolean
  editButton: RefObject<HTMLButtonElement | null>
  /**
   * `sm` (32px) by default, for a card; `default` (40px) at the foot of the open
   * product details (STY-065 S3).
   */
  size?: "default" | "sm"
  /** Where the buttons sit from 640px: at the row's `end` by default, as on a card. */
  align?: "start" | "end"
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
  align = "end",
  move,
  onEdit,
  onDrop,
}: EditControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <PendingTag pending={pending} subject={subject} />
      <div
        className={cn("flex flex-wrap gap-2", align === "end" && "sm:ml-auto")}
      >
        {pending && (
          <DropButton
            subject={subject}
            pending={pending}
            disabled={!editable}
            size={size}
            onDrop={onDrop}
          />
        )}
        {move}
        <EditButton
          subject={subject}
          disabled={!editable}
          size={size}
          button={editButton}
          onEdit={onEdit}
        />
      </div>
    </div>
  )
}
