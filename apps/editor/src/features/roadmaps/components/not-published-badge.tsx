import { EyeOffIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

export interface NotPublishedBadgeProps {
  /** For a card that names it in its link's description. */
  id?: string
}

/** Says a roadmap is not on the public site, on its card and its page. */
export function NotPublishedBadge({ id }: NotPublishedBadgeProps) {
  const { t } = useTranslation()
  return (
    <Badge id={id} variant="outline">
      <EyeOffIcon data-icon="inline-start" aria-hidden="true" />
      {t("roadmaps.notPublished")}
    </Badge>
  )
}
