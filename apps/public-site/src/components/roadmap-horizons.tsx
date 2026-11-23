import { ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { HORIZON_IDS, type Roadmap, type OrgFilter } from "../lib/types"
import { filterItems, placementHeadingId } from "../lib/roadmap-helpers"
import { HorizonPhase } from "./horizon-phase"

/**
 * The roadmap itself: a heading, followed by the three horizons stacked as a
 * single top-to-bottom journey (Now, then Next, then Later). This stacked
 * chronological layout is the canonical roadmap presentation pattern. Horizons
 * are never rendered as side-by-side columns. A decorative connector between
 * phases signals progression without relying on colour to carry meaning.
 */
export function RoadmapHorizons({
  roadmap,
  filter,
}: {
  roadmap: Roadmap
  filter: OrgFilter
}) {
  const { t } = useTranslation()
  const headingId = "roadmap-heading"
  const lastIndex = HORIZON_IDS.length - 1

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-2xl font-bold text-heading">
        {t("roadmap.heading")}
      </h2>

      <p className="mt-4 max-w-3xl leading-relaxed text-ink-900">
        {t("roadmap.description")}
      </p>

      <ol className="mt-8 space-y-3">
        {HORIZON_IDS.map((id, index) => (
          <li key={id}>
            <HorizonPhase
              label={t(`horizons.${id}.label`)}
              items={filterItems(roadmap.items[id], filter)}
              total={roadmap.items[id].length}
              filter={filter}
              headingId={placementHeadingId(id)}
            />
            {index < lastIndex ? (
              <div
                aria-hidden="true"
                className="flex flex-col items-center pt-3 text-ink-300"
              >
                <ChevronDown className="h-6 w-6" strokeWidth={2.5} />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}
