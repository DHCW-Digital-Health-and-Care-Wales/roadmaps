import { ArrowRight, Building2 } from "lucide-react"
import { useLanguage, useStrings } from "../i18n"
import { HORIZON_IDS, type Roadmap, type OrgFilter } from "../lib/types"
import {
  countItems,
  countOf,
  filterItems,
  formatDate,
  roadmapSummary,
} from "../lib/roadmap-helpers"
import { onNavigate, pathFor, withOrgFilter } from "../lib/router"
import { FamilyLabel } from "./family-label"
import { ContentText } from "./content-text"

/**
 * A landing page card linking to a roadmap. While filtered, it says how many
 * items are for the organisation and counts only those.
 */
export function ProductCard({
  roadmap,
  filter,
}: {
  roadmap: Roadmap
  filter: OrgFilter
}) {
  const { lang } = useLanguage()
  const strings = useStrings()
  const href = withOrgFilter(pathFor(lang, roadmap.slug), filter)
  const { meta } = roadmap
  const accent = meta.colour
  const summary = roadmapSummary(meta)
  const headingId = `product-${roadmap.slug}`

  return (
    <li
      data-filter-card=""
      className="group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-xs transition-shadow hover:shadow-md card-focus-ring"
    >
      <div
        aria-hidden="true"
        className="h-1.5"
        style={{ backgroundColor: accent }}
      />
      <div className="flex flex-1 flex-col p-6">
        {/* overflow-hidden clips the dot if the date wraps to the start of a
            line, so it only shows between the status and the date. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 overflow-hidden text-xs text-ink-700">
          {meta.statusLabel.en ? (
            <span>
              <ContentText value={meta.statusLabel} />
            </span>
          ) : null}
          {meta.lastUpdated ? (
            <span className="relative">
              {meta.statusLabel.en ? (
                // -left-1.5 is half the parent's gap-x-3, which centres the
                // dot in the gap; change the two together.
                <span
                  aria-hidden="true"
                  className="absolute -left-1.5 -translate-x-1/2 text-ink-500"
                >
                  ·
                </span>
              ) : null}
              {strings.landing.updated({
                date: (
                  <time dateTime={meta.lastUpdated}>
                    {formatDate(meta.lastUpdated, strings)}
                  </time>
                ),
              })}
            </span>
          ) : null}
        </div>

        {meta.family.en ? (
          // The swatch matches the colour band, linking a family across categories.
          <FamilyLabel meta={meta} className="mt-3" />
        ) : null}
        <h3
          id={headingId}
          className={`${meta.family.en ? "mt-1" : "mt-3"} text-xl font-bold text-heading`}
        >
          <a
            data-filter-focus=""
            href={href}
            onClick={onNavigate(href)}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:shadow-none focus-visible:outline-hidden group-hover:underline"
          >
            <ContentText value={meta.title} />
          </a>
        </h3>

        <p className="mt-3 line-clamp-4 leading-relaxed text-ink-900">
          {summary ? <ContentText value={summary} /> : strings.roadmap.intro}
        </p>

        {/* mt-auto pins the counts and link to the bottom, so they line up across a row. */}
        <div className="mt-auto pt-5">
          {filter.org ? (
            <p className="mb-3 flex items-center gap-1.5 text-sm text-ink-700">
              <Building2 aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>
                <strong className="font-semibold text-heading">
                  {countOf(countItems(roadmap, filter), strings)}
                </strong>{" "}
                {strings.landing.itemsFor({
                  organisation: strings.organisations[filter.org].short,
                })}
              </span>
            </p>
          ) : null}
          <ul className="flex flex-wrap gap-y-1 text-base">
            {HORIZON_IDS.map((id, i) => (
              <li key={id} className="flex items-baseline gap-1">
                <span className="font-semibold text-heading">
                  {filterItems(roadmap.items[id], filter).length}
                </span>
                <span className="text-ink-700">
                  {strings.horizons[id].label}
                </span>
                {i < HORIZON_IDS.length - 1 ? (
                  <span aria-hidden="true" className="mx-2 text-ink-500">
                    ·
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <p
          aria-hidden="true"
          className="inline-flex items-center gap-1 pt-6 font-medium text-action"
        >
          {strings.landing.viewRoadmap}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </p>
      </div>
    </li>
  )
}
