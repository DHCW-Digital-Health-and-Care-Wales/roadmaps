import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
} from "lucide-react"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import { localise } from "@/domain/roadmap/localised-text"
import type { PublishProblem } from "@/domain/roadmap/published-state"
import { useNoticeDwell } from "@/features/auth/use-notice-dwell"
import { useLanguage, type Language } from "@/i18n"

import type { PublishedStateOutcomeNotice } from "./use-published-state"

export interface PublishedStateNoticeProps {
  notice: PublishedStateOutcomeNotice
  /** The roadmap's title, as shown. */
  title: string
  onDismiss: () => void
}

/**
 * What publishing or unpublishing a roadmap came to, as a page notice (STY-035): a
 * confirmation clears itself after a dwell; a refusal names each problem to fix in the
 * spreadsheet (S4); a failure says why (S8), and both say pending edits are kept.
 */
export function PublishedStateNotice({
  notice,
  title,
  onDismiss,
}: PublishedStateNoticeProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const confirmed = notice.kind === "set"
  const dwell = useNoticeDwell(confirmed, onDismiss)
  const verb = (published: boolean) => (published ? "publish" : "unpublish")
  const kept = "kept" in notice && notice.kept

  const content = (() => {
    switch (notice.kind) {
      case "set":
        return {
          variant: "success",
          Icon: CircleCheckIcon,
          title: null,
          lines: [
            t(
              notice.published
                ? notice.withChanges
                  ? "roadmaps.publishRoadmap.notice.savedAndPublished"
                  : "roadmaps.publishRoadmap.notice.published"
                : "roadmaps.publishRoadmap.notice.unpublished",
              { title },
            ),
          ],
        } as const
      case "changed":
        return {
          variant: "info",
          Icon: InfoIcon,
          title: null,
          lines: [t("roadmaps.publishRoadmap.notice.changed")],
        } as const
      case "unpublishable":
        return {
          variant: "destructive",
          Icon: CircleAlertIcon,
          title: t("roadmaps.publishRoadmap.notice.failed.publish", { title }),
          lines: [t("roadmaps.publishRoadmap.notice.refused.description")],
        } as const
      case "failed":
        return {
          variant: "destructive",
          Icon: CircleAlertIcon,
          title: t(
            `roadmaps.publishRoadmap.notice.failed.${verb(notice.published)}`,
            { title },
          ),
          lines: [t(`roadmaps.publish.errors.${notice.error}`)],
        } as const
      case "unconfirmed":
        return {
          variant: "warning",
          Icon: TriangleAlertIcon,
          title: t(
            `roadmaps.publishRoadmap.notice.unconfirmed.${verb(notice.published)}`,
            { title },
          ),
          lines: [t("roadmaps.publish.notice.unconfirmed.description")],
        } as const
    }
  })()

  return (
    <DismissibleNotice
      role={confirmed || notice.kind === "changed" ? "status" : "alert"}
      variant={content.variant}
      Icon={content.Icon}
      title={content.title}
      onDismiss={onDismiss}
      className="max-w-2xl"
      {...(confirmed ? dwell : {})}
    >
      {content.lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {notice.kind === "unpublishable" && (
        <ul className="list-disc pl-5">
          {notice.problems.map((problem, i) => (
            // A list that never reorders: its place is its identity.
            <li key={i}>{problemText(problem, t, language)}</li>
          ))}
        </ul>
      )}
      {kept && <p>{t("roadmaps.publish.notice.kept")}</p>}
    </DismissibleNotice>
  )
}

/** A problem the public site's sync would fail on, in the Product Lead's terms. */
function problemText(
  problem: PublishProblem,
  t: TFunction,
  language: Language,
): string {
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
      return t(`${key}.idTaken`, {
        title: localise(problem.title, language),
      })
  }
}

/** `#abc` as the six-digit colour it stands for, `#aabbcc`. */
function sixDigits(colour: string): string {
  return colour.replace(/[0-9a-f]/gi, (digit) => digit + digit).toLowerCase()
}
