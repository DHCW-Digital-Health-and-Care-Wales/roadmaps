import { useTranslation } from "react-i18next"

import { Skeleton } from "@/components/ui/skeleton"

import { roadmapGridClassName } from "./roadmap-grid"

/** Varied widths, so the placeholder reads as names rather than a pattern. */
const NAME_WIDTHS = ["w-3/5", "w-2/5", "w-1/2", "w-2/3", "w-1/3", "w-3/5"]

/** Placeholder cards with the real cards' geometry, announced once as loading. */
export function RoadmapGridSkeleton() {
  const { t } = useTranslation()

  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{t("roadmaps.loading")}</span>
      <ul aria-hidden="true" className={roadmapGridClassName}>
        {NAME_WIDTHS.map((width, index) => (
          <li
            // Static placeholders: the index is a stable key.
            key={index}
            className="flex min-h-18 items-center gap-3.5 rounded-xl border bg-card p-4 shadow-xs"
          >
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <Skeleton className={`h-4 ${width}`} />
          </li>
        ))}
      </ul>
    </div>
  )
}
