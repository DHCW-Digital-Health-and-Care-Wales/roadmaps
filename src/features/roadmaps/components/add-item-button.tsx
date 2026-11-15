import { PlusIcon } from "lucide-react"
import type { RefObject } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/use-auth"

export interface AddItemButtonProps {
  ref: RefObject<HTMLButtonElement | null>
  /** The roadmap's items are not read, so none can be added to them yet. */
  disabled?: boolean
  onAdd: () => void
}

/**
 * "Add an item", which opens the item dialog to add one (STY-046 S1): with a roadmap's
 * page's actions, and in the panel of a roadmap that has none. Unavailable, but
 * focusable, unless connected and while the roadmap's items are not read.
 */
export function AddItemButton({
  ref,
  disabled = false,
  onAdd,
}: AddItemButtonProps) {
  const { t } = useTranslation()
  const connected = useAuth().state.status === "connected"
  return (
    <Button
      ref={ref}
      disabled={disabled || !connected}
      focusableWhenDisabled
      onClick={onAdd}
    >
      <PlusIcon data-icon="inline-start" aria-hidden="true" />
      {t("roadmaps.edit.addItem.title")}
    </Button>
  )
}
