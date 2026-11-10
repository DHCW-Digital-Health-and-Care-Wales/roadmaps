import { Link } from "@tanstack/react-router"
import { ChevronRightIcon } from "lucide-react"

import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { useLanguage } from "@/i18n"

import { RoadmapIcon } from "./roadmap-icon"

export interface RoadmapCardProps {
  roadmap: Roadmap
}

/**
 * A roadmap as a card; the whole card is one link to its detail page. Long titles wrap to
 * two lines; the link's text (its accessible name) and tooltip keep the full title.
 */
export function RoadmapCard({ roadmap }: RoadmapCardProps) {
  const title = localise(roadmap.title, useLanguage())

  return (
    <Link
      to="/roadmaps/$roadmapId"
      params={{ roadmapId: roadmap.id }}
      title={title}
      className="group flex h-full min-h-18 items-center gap-3.5 rounded-xl border bg-card p-4 text-card-foreground shadow-xs transition-[border-color,box-shadow] outline-none hover:border-foreground/20 hover:shadow-md focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:hover:border-foreground/25"
    >
      <RoadmapIcon />
      <span className="line-clamp-2 min-w-0 flex-1 leading-snug font-medium wrap-break-word">
        {title}
      </span>
      <ChevronRightIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground group-focus-visible:text-foreground"
      />
    </Link>
  )
}
