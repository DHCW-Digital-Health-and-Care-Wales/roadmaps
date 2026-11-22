import { TriangleAlertIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface HorizonFlagProps {
  /** The item's horizon as written: empty for none. */
  writtenHorizon: string
  /**
   * On one line, cut with an ellipsis where its room runs out, as in a desktop's compact
   * row (STY-067 S4); its whole text is still its own. Otherwise it wraps.
   */
  cut?: boolean
}

/**
 * What is wrong with an unplaced item's horizon, as written (STY-021 D4): none, or one
 * the public site does not recognise. On a card, a compact row and an opened row.
 */
export function HorizonFlag({ writtenHorizon, cut = false }: HorizonFlagProps) {
  const { t } = useTranslation()
  return (
    <Badge variant="warning" className={cn(cut && "min-w-0 shrink")}>
      <TriangleAlertIcon data-icon="inline-start" aria-hidden="true" />
      <span className={cn(cut && "truncate")}>
        {writtenHorizon === ""
          ? t("roadmaps.items.unplaced.noHorizon")
          : t("roadmaps.items.unplaced.unknownHorizon", {
              horizon: writtenHorizon,
            })}
      </span>
    </Badge>
  )
}
