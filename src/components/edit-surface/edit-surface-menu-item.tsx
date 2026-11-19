import { AppWindowIcon, PanelRightIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

import { useEditSurface } from "./use-edit-surface"

/**
 * A menu item that switches the forms between a side panel and a dialog; the label names
 * the way it switches to. It closes the menu, which hands focus back to its trigger.
 */
export function EditSurfaceMenuItem() {
  const { t } = useTranslation()
  const { surface, setSurface } = useEditSurface()
  const isPanel = surface === "panel"
  const Icon = isPanel ? AppWindowIcon : PanelRightIcon

  return (
    <DropdownMenuItem
      onClick={() => {
        setSurface(isPanel ? "dialog" : "panel")
      }}
    >
      <Icon aria-hidden="true" />
      {t(isPanel ? "editSurface.useDialog" : "editSurface.useSidePanel")}
    </DropdownMenuItem>
  )
}
