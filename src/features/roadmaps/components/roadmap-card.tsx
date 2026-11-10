import { Link } from "@tanstack/react-router"
import { ChevronRightIcon, EyeOffIcon } from "lucide-react"
import { useId } from "react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { formatCalendarDate, useLanguage } from "@/i18n"

import { RoadmapSwatch } from "./roadmap-swatch"

export interface RoadmapCardProps {
  roadmap: Roadmap
}

/**
 * A roadmap as DHCW's clickable card: square, bordered, with a grey bar under it, an
 * underlined link-blue title and a chevron. The whole card is one link to its detail page.
 * The link is named by the title alone; what else the card shows is its description for
 * screen readers.
 * Only what the roadmap has is shown, no empty labels. Long titles wrap to two lines and
 * the summary to three; the link's tooltip keeps the full title.
 */
export function RoadmapCard({ roadmap }: RoadmapCardProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const id = useId()

  const title = localise(roadmap.title, language)
  const status = roadmap.statusLabel && localise(roadmap.statusLabel, language)
  const summary =
    roadmap.serviceDescription && localise(roadmap.serviceDescription, language)
  const updated =
    roadmap.lastUpdated === null
      ? null
      : (formatCalendarDate(roadmap.lastUpdated, t) ?? null)
  // Which parts the roadmap has. Each is its own description, so a screen reader pauses
  // between them; the keys are the suffixes of the ids the JSX gives the parts.
  const has = {
    category: roadmap.category !== null,
    status: status !== null,
    notPublished: !roadmap.published,
    summary: summary !== null,
    productLead: roadmap.productLead !== null,
    updated: updated !== null,
  }
  const hasHeader = has.category || has.status || has.notPublished
  const hasFooter = has.productLead || has.updated
  const describedBy = Object.entries(has)
    .filter(([, present]) => present)
    .map(([part]) => `${id}-${part}`)

  return (
    <div className="group relative flex h-full min-h-18 items-stretch gap-3.5 border bg-card p-4 text-card-foreground shadow-card-bar hover:border-input has-focus-visible:focus-ring">
      <RoadmapSwatch colour={roadmap.colour} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* The link is the title alone, stretched over the whole card, so its name is the
            visible label (WCAG 2.5.3) and the rest of the card is its description. */}
        <Link
          to="/roadmaps/$roadmapId"
          params={{ roadmapId: roadmap.id }}
          title={title}
          aria-describedby={
            describedBy.length > 0 ? describedBy.join(" ") : undefined
          }
          className="line-clamp-2 text-heading-xs wrap-anywhere text-link underline outline-none after:absolute after:inset-0 hover:text-link-hover hover:no-underline"
        >
          {title}
        </Link>
        {/* Read as the link's description, not a second time as content. */}
        <div aria-hidden="true" className="flex flex-1 flex-col gap-2">
          {hasHeader && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-body-xs text-muted-foreground">
              {roadmap.category !== null && (
                <span id={`${id}-category`}>
                  {t(`roadmaps.categories.${roadmap.category}`)}
                </span>
              )}
              {status !== null && (
                <Badge id={`${id}-status`} variant="neutral">
                  {status}
                </Badge>
              )}
              {!roadmap.published && (
                <Badge id={`${id}-notPublished`} variant="outline">
                  <EyeOffIcon data-icon="inline-start" aria-hidden="true" />
                  {t("roadmaps.card.notPublished")}
                </Badge>
              )}
            </div>
          )}
          {summary !== null && (
            <p
              id={`${id}-summary`}
              className="line-clamp-3 text-body-xs text-pretty text-muted-foreground"
            >
              {summary}
            </p>
          )}
          {hasFooter && (
            <div className="mt-auto flex flex-col gap-0.5 pt-1 text-body-xs text-muted-foreground">
              {roadmap.productLead !== null && (
                <span id={`${id}-productLead`} className="wrap-anywhere">
                  {t("roadmaps.card.productLead", {
                    name: roadmap.productLead,
                  })}
                </span>
              )}
              {updated !== null && (
                <span id={`${id}-updated`}>
                  {t("roadmaps.card.updated", { date: updated })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {/* DHCW's chevron: a link-blue circle, which turns with the title on hover. */}
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-link text-background group-hover:bg-link-hover"
      >
        <ChevronRightIcon className="size-4" />
      </span>
    </div>
  )
}
