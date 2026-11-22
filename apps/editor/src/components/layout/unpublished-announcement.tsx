import { useState } from "react"
import { useTranslation } from "react-i18next"

export interface UnpublishedAnnouncementProps {
  /** How many roadmaps have unpublished changes. */
  count: number
}

/**
 * Says to a screen reader how many roadmaps have unpublished changes, when that number
 * changes (STY-055 S4): a roadmap gaining its first change or losing its last, not an edit
 * of one with changes, nor a change of language. Always in the page, at any width, as the
 * navigation that draws the count is not while it is a closed drawer; empty until there
 * has been a count, then saying none is left once the last has gone. A live region, not a
 * `status`, which the page's own notices are found by.
 */
export function UnpublishedAnnouncement({
  count,
}: UnpublishedAnnouncementProps) {
  const { t } = useTranslation()
  // What was last said, in the language of the time: text that follows the language
  // would be read again as it changes.
  const [said, setSaid] = useState<{ count: number; text: string } | null>(null)
  if ((count > 0 || said !== null) && said?.count !== count) {
    setSaid({ count, text: t("layout.navigation.unpublished", { count }) })
  }
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {said?.text}
    </div>
  )
}
