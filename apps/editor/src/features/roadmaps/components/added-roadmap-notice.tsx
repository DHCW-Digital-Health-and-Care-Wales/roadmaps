import { CircleCheckIcon } from "lucide-react"
import { Trans } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import type { LocalisedText } from "@/domain/roadmap/localised-text"
import { useNoticeDwell } from "@/features/auth/use-notice-dwell"

import { ContentText } from "./content-text"

export interface AddedRoadmapNoticeProps {
  /** The roadmap's title, as shown in the interface's language. */
  title: LocalisedText
  /** Stable between renders: the dwell starts again when it changes. */
  onDismiss: () => void
}

/**
 * Says, on the page of a roadmap just added, that it was added and isn't published yet
 * (STY-041 S5): a confirmation, which clears itself after a dwell.
 */
export function AddedRoadmapNotice({
  title,
  onDismiss,
}: AddedRoadmapNoticeProps) {
  const dwell = useNoticeDwell(true, onDismiss)
  return (
    <DismissibleNotice
      role="status"
      variant="success"
      Icon={CircleCheckIcon}
      onDismiss={onDismiss}
      className="max-w-2xl"
      {...dwell}
    >
      <p>
        <Trans
          i18nKey="roadmaps.add.added"
          components={{ title: <ContentText value={title} /> }}
        />
      </p>
    </DismissibleNotice>
  )
}
