import { useTranslation } from "react-i18next"

import { Checkbox } from "@/components/ui/checkbox"

export interface MarkUpdatedCheckboxProps {
  checked: boolean
  disabled: boolean
  onCheckedChange: (checked: boolean) => void
}

/**
 * "Mark as updated today", in a dialog that publishes or saves: ticked, the roadmap's
 * `Last updated` is set to today in the same write (STY-036 S6). Unticked by default.
 */
export function MarkUpdatedCheckbox({
  checked,
  disabled,
  onCheckedChange,
}: MarkUpdatedCheckboxProps) {
  const { t } = useTranslation()
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-3">
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => {
          onCheckedChange(next)
        }}
      />
      <span className="min-w-0 wrap-break-word">
        {t("roadmaps.publish.markUpdated")}
      </span>
    </label>
  )
}
