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

/**
 * The "New" tag on an item added and not yet published (STY-046 S9), or the "Removed"
 * tag on one removed and not yet published (STY-049 S2), named for it.
 */
function ItemTag({
  pending,
  subject,
}: {
  pending: "new" | "removed"
  subject: string
}) {
  const { t } = useTranslation()
  const Icon = pending === "new" ? PlusIcon : Trash2Icon
  return (
    <Badge variant="info">
      <Icon data-icon="inline-start" aria-hidden="true" />
      {t(`roadmaps.edit.${pending}`)} <span className="sr-only">{subject}</span>
    </Badge>
  )
}

/** What of an item or a roadmap is pending: see `EditControlsProps.pending`. */
export type Pending = "changed" | "new" | "removed" | undefined

/** "Changed", "New" or "Removed" for what is pending, or nothing. */
export function PendingTag({
  pending,
  subject,
}: {
  pending: Pending
  /** Names what is new or removed, for assistive technology: "New First item". */
  subject: string
}) {
  if (pending === "changed") return <ChangedTag />
  if (pending === "new" || pending === "removed") {
    return <ItemTag pending={pending} subject={subject} />
  }
  return null
}

interface ButtonProps {
  /** What the button acts on, for assistive technology: "Edit First item". */
  subject: string
  /** Held, though focusable: what it does can't be done for now. */
  disabled: boolean
  size: "default" | "sm"
}

/**
 * "Undo changes", which drops what is pending, or "Undo removal", which puts back an
 * item removed (STY-049 S3); nothing for what is new, or not pending.
 */
export function DropButton({
  subject,
  pending,
  disabled,
  size,
  button,
  onDrop,
}: ButtonProps & {
  pending: Pending
  button?: RefObject<HTMLButtonElement | null> | undefined
  onDrop: () => void
}) {
  const { t } = useTranslation()
  if (pending !== "changed" && pending !== "removed") return null
  return (
    <Button
      ref={button}
      variant="secondary"
      size={size}
      disabled={disabled}
      focusableWhenDisabled
      onClick={onDrop}
    >
      <Undo2Icon data-icon="inline-start" aria-hidden="true" />
      {t(
        pending === "removed"
          ? "roadmaps.edit.undoRemoval"
          : "roadmaps.edit.undo",
      )}{" "}
      <span className="sr-only">{subject}</span>
    </Button>
  )
}

/**
 * Remove, on an item the roadmap holds or a new one, which asks first (STY-049 S1,
 * S10).
 */
export function RemoveButton({
  subject,
  disabled,
  size,
  button,
  onRemove,
}: ButtonProps & {
  button: RefObject<HTMLButtonElement | null>
  onRemove: () => void
}) {
  const { t } = useTranslation()
  return (
    <Button
      ref={button}
      variant="secondary"
      size={size}
      disabled={disabled}
      focusableWhenDisabled
      onClick={onRemove}
    >
      <Trash2Icon data-icon="inline-start" aria-hidden="true" />
      {t("roadmaps.edit.remove")} <span className="sr-only">{subject}</span>
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
   * "Undo changes" drops; `new`, the whole of an item added and not yet published,
   * tagged "New" (STY-046); or `removed`, an item removed and not yet published, tagged
   * "Removed", which "Undo removal" puts back (STY-049).
   */
  pending: Pending
  /**
   * Whether it can be edited now, which it can unless told; the buttons stay focusable
   * when not.
   */
  editable?: boolean
  /** Whether what is pending can be dropped now: as `editable`, unless told. */
  droppable?: boolean
  editButton: RefObject<HTMLButtonElement | null>
  /** The drop button's ref, when focus is sent to it. */
  dropButton?: RefObject<HTMLButtonElement | null> | undefined
  /**
   * `sm` (32px) by default, for a card; `default` (40px) at the foot of the open
   * product details (STY-065 S3).
   */
  size?: "default" | "sm"
  /** Where the buttons sit from 640px: at the row's `end` by default, as on a card. */
  align?: "start" | "end"
  /** An item's Remove, after the drop button (STY-049). */
  remove?: ReactNode
  /** The moved mark's label, before the tag, beside it (STY-075 S1). */
  mark?: ReactNode
  /** A control between Remove and Edit, such as an item's Move menu (STY-031). */
  move?: ReactNode
  onEdit: () => void
  /** "Undo changes" or "Undo removal" was chosen. */
  onDrop: () => void
}

/**
 * The moved mark's label, if the item carries it, then "Changed", "New" or "Removed",
 * together; then "Undo changes" or "Undo removal" while something can be dropped, then
 * `remove`, `move` and Edit.
 */
export function EditControls({
  subject,
  pending,
  editable = true,
  droppable = editable,
  editButton,
  dropButton,
  size = "sm",
  align = "end",
  remove,
  mark,
  move,
  onEdit,
  onDrop,
}: EditControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {(mark ?? pending) && (
        // Together: where one line can't hold both, the second wraps under the first.
        <div className="flex flex-wrap items-center gap-2">
          {mark}
          <PendingTag pending={pending} subject={subject} />
        </div>
      )}
      <div
        className={cn("flex flex-wrap gap-2", align === "end" && "sm:ml-auto")}
      >
        <DropButton
          subject={subject}
          pending={pending}
          disabled={!droppable}
          size={size}
          button={dropButton}
          onDrop={onDrop}
        />
        {remove}
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
