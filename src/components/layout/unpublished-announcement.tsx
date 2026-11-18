import { useState } from "react"
import { useTranslation } from "react-i18next"

export interface UnpublishedAnnouncementProps {
  /** How many roadmaps have unpublished changes. */
  count: number
}

/**
 * Says to a screen reader how many roadmaps have unpublished changes, when that number
 * changes (STY-055 S4): a roadmap gaining its first change or losing its last, not an edit
 * of one with changes. Always in the page, at any width, as the navigation that draws the
 * count is not while it is a closed drawer; empty until there has been a count, then
 * saying none is left once the last has gone. A live region, not a `status`, which the
 * page's own notices are found by.
 */
export function UnpublishedAnnouncement({
  count,
}: UnpublishedAnnouncementProps) {
  const { t } = useTranslation()
  const [hadChanges, setHadChanges] = useState(false)
  if (count > 0 && !hadChanges) setHadChanges(true)
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {hadChanges && t("layout.navigation.unpublished", { count })}
    </div>
  )
}
