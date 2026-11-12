import { TriangleAlertIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import type { Roadmap } from "@/domain/roadmap/roadmap"

export interface ListMismatchBadgesProps {
  roadmap: Pick<Roadmap, "outOfStep" | "familyNotListed">
  /** For a card that names each badge in its link's description, as `${id}-<flag>`. */
  id?: string
}

/**
 * Says a roadmap is out of step with its family or category list, or that its family
 * isn't in the family list (STY-027 S4, S8), on its card and its page. Nothing otherwise.
 */
export function ListMismatchBadges({ roadmap, id }: ListMismatchBadgesProps) {
  const { t } = useTranslation()
  return (
    <>
      {roadmap.outOfStep && (
        <Badge id={id && `${id}-outOfStep`} variant="warning">
          <TriangleAlertIcon data-icon="inline-start" aria-hidden="true" />
          {t("roadmaps.lists.outOfStep")}
        </Badge>
      )}
      {roadmap.familyNotListed && (
        <Badge id={id && `${id}-familyNotListed`} variant="warning">
          <TriangleAlertIcon data-icon="inline-start" aria-hidden="true" />
          {t("roadmaps.lists.familyNotListed")}
        </Badge>
      )}
    </>
  )
}
