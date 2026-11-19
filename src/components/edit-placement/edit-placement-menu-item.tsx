import { AppWindowIcon, PanelRightIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

import { useEditPlacement } from "./edit-placement-context"

/**
 * A menu item that switches the forms between a side panel and a dialog; the label names
 * the way it switches to. It closes the menu, which hands focus back to its trigger.
 */
export function EditPlacementMenuItem() {
  const { t } = useTranslation()
  const { placement, setPlacement } = useEditPlacement()
  const isPanel = placement === "panel"
  const Icon = isPanel ? AppWindowIcon : PanelRightIcon

  return (
    <DropdownMenuItem
      onClick={() => {
        setPlacement(isPanel ? "dialog" : "panel")
      }}
    >
      <Icon aria-hidden="true" />
      {t(isPanel ? "editPlacement.useDialog" : "editPlacement.useSidePanel")}
    </DropdownMenuItem>
  )
}
