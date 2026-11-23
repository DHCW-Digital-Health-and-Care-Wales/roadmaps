import { CircleAlertIcon, CircleCheckIcon, InfoIcon } from "lucide-react"
import type { TFunction } from "i18next"
import type { ReactNode, RefObject } from "react"
import { Trans, useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import type { LocalisedText } from "@/domain/roadmap/localised-text"
import type { PublishProblem } from "@/domain/roadmap/published-state"
import { useNoticeDwell } from "@/features/auth/use-notice-dwell"

import { ContentText } from "../components/content-text"
import { writeFailureMessage } from "../write-failure-message"
import type { PublishedStateOutcomeNotice } from "./use-published-state"

export interface PublishedStateNoticeProps {
  ref: RefObject<HTMLDivElement | null>
  notice: PublishedStateOutcomeNotice
  /** The roadmap's title, as shown in the interface's language. */
  title: LocalisedText
  onDismiss: () => void
}

/**
 * What publishing or unpublishing a roadmap came to, as a page notice (STY-035): a
 * confirmation clears itself after a dwell; a refusal names each problem to fix in the
 * spreadsheet (S4); a failure says why (S8), and both say pending edits are kept. It
 * shows at the foot, where focus comes as the dialog that asked closes (STY-052 D21).
 */
export function PublishedStateNotice({
  ref,
  notice,
  title,
  onDismiss,
}: PublishedStateNoticeProps) {
  const { t } = useTranslation()
  const confirmed = notice.kind === "set"
  const dwell = useNoticeDwell(confirmed, onDismiss)
  const verb = (published: boolean) => (published ? "publish" : "unpublish")
  const kept = "kept" in notice && notice.kept
  /** A sentence naming the roadmap, its title marked when it is English in Welsh. */
  const naming = (key: NamingKey) => (
    <Trans
      i18nKey={key}
      components={{ title: <ContentText value={title} /> }}
    />
  )

  const content = (() => {
    switch (notice.kind) {
      case "set":
        return {
          variant: "success",
          Icon: CircleCheckIcon,
          title: null,
          line: naming(
            notice.published
              ? notice.withChanges
                ? "roadmaps.publishRoadmap.notice.savedAndPublished"
                : "roadmaps.publishRoadmap.notice.published"
              : "roadmaps.publishRoadmap.notice.unpublished",
          ),
        } as const
      case "changed":
        return {
          variant: "info",
          Icon: InfoIcon,
          title: null,
          line: t("roadmaps.publishRoadmap.notice.changed"),
        } as const
      case "unpublishable":
        return {
          variant: "destructive",
          Icon: CircleAlertIcon,
          title: naming("roadmaps.publishRoadmap.notice.failed.publish"),
          line: t("roadmaps.publishRoadmap.notice.refused.description"),
        } as const
      case "failed":
        return {
          variant: "destructive",
          Icon: CircleAlertIcon,
          title: naming(
            `roadmaps.publishRoadmap.notice.failed.${verb(notice.published)}`,
          ),
          line: writeFailureMessage(t, "publish", notice.error),
        } as const
    }
  })()

  return (
    <DismissibleNotice
      ref={ref}
      tabIndex={-1}
      role={confirmed || notice.kind === "changed" ? "status" : "alert"}
      variant={content.variant}
      Icon={content.Icon}
      title={content.title}
      onDismiss={onDismiss}
      className="outline-none focus-visible:focus-ring"
      {...(confirmed ? dwell : {})}
    >
      <p>{content.line}</p>
      {notice.kind === "unpublishable" && (
        <ul className="list-disc pl-5">
          {notice.problems.map((problem, i) => (
            // eslint-disable-next-line @eslint-react/no-array-index-key -- A list that never reorders: its place is its identity.
            <li key={i}>{problemText(problem, t)}</li>
          ))}
        </ul>
      )}
      {kept && <p>{t("roadmaps.publish.notice.kept")}</p>}
    </DismissibleNotice>
  )
}

/** A problem the public site's sync would fail on, in the Product Lead's terms. */
function problemText(problem: PublishProblem, t: TFunction): ReactNode {
  const key = "roadmaps.publishRoadmap.notice.refused.problems"
  switch (problem.code) {
    case "items-missing":
      return t(`${key}.itemsMissing`, { location: problem.location })
    case "items-field-missing":
      return t(
        problem.field === "title"
          ? `${key}.titleMissing`
          : `${key}.placementMissing`,
        { location: problem.location },
      )
    case "short-colour":
      return t(`${key}.shortColour`, {
        colour: problem.colour,
        long: sixDigits(problem.colour),
      })
    case "id-taken":
      return (
        <Trans
          i18nKey={`${key}.idTaken`}
          components={{ title: <ContentText value={problem.title} /> }}
        />
      )
  }
}

/** `#abc` as the six-digit colour it stands for, `#aabbcc`. */
function sixDigits(colour: string): string {
  return colour.replace(/[0-9a-f]/gi, (digit) => digit + digit).toLowerCase()
}

/** The notice's sentences that name the roadmap by its title. */
type NamingKey =
  | "roadmaps.publishRoadmap.notice.savedAndPublished"
  | "roadmaps.publishRoadmap.notice.published"
  | "roadmaps.publishRoadmap.notice.unpublished"
  | `roadmaps.publishRoadmap.notice.failed.${"publish" | "unpublish"}`
