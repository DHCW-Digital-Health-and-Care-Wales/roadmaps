import { useStrings } from "../i18n"
import type { RoadmapMeta } from "../lib/types"
import { ContentText } from "./content-text"

/**
 * "Our value" section, placed directly beneath the intro (which holds "Our
 * vision"). Copy comes from the product's "Service description" column on the
 * Google Sheet's roadmap list; the section is hidden when it is empty.
 */
export function OurValue({ meta }: { meta: RoadmapMeta }) {
  const strings = useStrings()
  if (!meta.serviceDescription.en) return null

  return (
    <section
      id="service-description"
      aria-labelledby="service-description-heading"
      className="page-section bg-surface"
    >
      <div className="mx-auto max-w-content">
        <h2
          id="service-description-heading"
          className="text-2xl font-bold text-heading"
        >
          {strings.roadmap.value}
        </h2>
        <p className="mt-4 max-w-3xl whitespace-pre-line text-lg leading-relaxed text-ink-900">
          <ContentText value={meta.serviceDescription} />
        </p>
      </div>
    </section>
  )
}
