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
 * A roadmap as a card; the whole card is one link to its detail page. The link is named
 * by the title alone; what else the card shows is its description for screen readers.
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
      ? undefined
      : formatCalendarDate(roadmap.lastUpdated, t)
  const hasHeader =
    roadmap.category !== null || status !== null || !roadmap.published
  const hasFooter = roadmap.productLead !== null || updated !== undefined
  // Each part is its own description, so a screen reader pauses between them.
  const describedBy = (
    [
      ["category", roadmap.category !== null],
      ["status", status !== null],
      ["notPublished", !roadmap.published],
      ["summary", summary !== null],
      ["productLead", roadmap.productLead !== null],
      ["updated", updated !== undefined],
    ] as const
  )
    .filter(([, present]) => present)
    .map(([part]) => `${id}-${part}`)

  return (
    <div className="group relative flex h-full min-h-18 items-stretch gap-3.5 rounded-xl border bg-card p-4 text-card-foreground shadow-xs transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-md has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50 dark:hover:border-foreground/25">
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
          className="line-clamp-2 leading-snug font-medium wrap-break-word outline-none after:absolute after:inset-0 after:rounded-xl"
        >
          {title}
        </Link>
        {/* Read as the link's description, not a second time as content. */}
        <div aria-hidden="true" className="flex flex-1 flex-col gap-2">
          {hasHeader && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
              {roadmap.category && (
                <span id={`${id}-category`}>
                  {t(`roadmaps.categories.${roadmap.category}`)}
                </span>
              )}
              {status && (
                <Badge id={`${id}-status`} variant="secondary">
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
          {summary && (
            <p
              id={`${id}-summary`}
              className="line-clamp-3 text-sm text-pretty text-muted-foreground"
            >
              {summary}
            </p>
          )}
          {hasFooter && (
            <div className="mt-auto flex flex-col gap-0.5 pt-1 text-xs text-muted-foreground">
              {roadmap.productLead && (
                <span id={`${id}-productLead`} className="wrap-break-word">
                  {t("roadmaps.card.productLead", {
                    name: roadmap.productLead,
                  })}
                </span>
              )}
              {updated !== undefined && (
                <span id={`${id}-updated`}>
                  {t("roadmaps.card.updated", { date: updated })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <ChevronRightIcon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground group-has-focus-visible:text-foreground"
      />
    </div>
  )
}
