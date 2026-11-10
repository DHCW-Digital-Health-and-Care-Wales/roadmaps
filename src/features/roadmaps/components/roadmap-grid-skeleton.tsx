import { useTranslation } from "react-i18next"

import { Skeleton } from "@/components/ui/skeleton"

import { roadmapGridClassName } from "./roadmap-grid"

/** Varied widths, so the placeholder reads as names rather than a pattern. */
const NAME_WIDTHS = ["w-3/5", "w-2/5", "w-1/2", "w-2/3", "w-1/3", "w-3/5"]

/** Placeholder cards shaped like the real cards, announced once as loading. */
export function RoadmapGridSkeleton() {
  const { t } = useTranslation()

  return (
    <div role="status">
      <span className="sr-only">{t("roadmaps.loading")}</span>
      <ul aria-hidden="true" className={roadmapGridClassName}>
        {NAME_WIDTHS.map((width, index) => (
          <li
            // Static placeholders: the index is a stable key.
            key={index}
            className="flex min-h-18 items-stretch gap-3.5 border bg-card p-4 shadow-card-bar"
          >
            <Skeleton className="w-1.5 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2.5">
              <Skeleton className={`h-4 ${width}`} />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
