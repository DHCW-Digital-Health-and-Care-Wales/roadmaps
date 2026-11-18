import { PlusIcon } from "lucide-react"
import type { RefObject } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { useSessionAction } from "@/features/auth/session-action"
import { cn } from "@/lib/utils"

export interface AddItemButtonProps {
  ref: RefObject<HTMLButtonElement | null>
  /** The roadmap's items are not read, so none can be added to them yet. */
  disabled?: boolean
  /**
   * An icon alone, still named "Add an item", as in a phone's stuck header (STY-052
   * D18).
   */
  compact?: boolean
  className?: string | undefined
  onAdd: () => void
}

/**
 * "Add an item", which opens the item dialog to add one (STY-046 S1): with a roadmap's
 * page's actions, and in the panel of a roadmap that has none. Unavailable, but
 * focusable, while the roadmap's items are not read. After the session has expired it
 * asks to reconnect first, then opens the dialog (STY-057).
 */
export function AddItemButton({
  ref,
  disabled = false,
  compact = false,
  className,
  onAdd,
}: AddItemButtonProps) {
  const { t } = useTranslation()
  const add = useSessionAction(onAdd)
  return (
    <Button
      ref={ref}
      disabled={disabled}
      focusableWhenDisabled
      size={compact ? "icon" : "default"}
      className={className}
      onClick={(event) => {
        add(event.currentTarget)
      }}
    >
      <PlusIcon data-icon="inline-start" aria-hidden="true" />
      <span className={cn(compact && "sr-only")}>
        {t("roadmaps.edit.addItem.title")}
      </span>
    </Button>
  )
}
