import { useStrings } from "../i18n"
import type { View } from "../lib/router"
import { placementHeadingId } from "../lib/roadmap-helpers"
import { HORIZON_IDS } from "../lib/types"

const horizonLink =
  "text-action underline underline-offset-4 hover:decoration-2"

/**
 * Plain-English explainer of what Now, Next and Later mean, plus a note that
 * the work has no dates and its order isn't a priority list. The cards view
 * shows the horizons as a quiet three-column strip with the note below; the
 * list view puts the note first and the horizons in a plain list. Each
 * horizon name links to its section further down the page.
 */
export function HorizonExplainer({ view }: { view: View }) {
  const headingId = "horizons-explainer-heading"
  const strings = useStrings()
  const note = strings.roadmap.horizonNote

  return (
    <section
      aria-labelledby={headingId}
      className={`page-section ${
        view === "list" ? "bg-surface" : "bg-surface-subtle"
      }`}
    >
      <div className="mx-auto max-w-content">
        <h2 id={headingId} className="text-2xl font-bold text-heading">
          {strings.roadmap.horizonsHeading}
        </h2>

        {view === "list" ? (
          <div className="max-w-3xl">
            <p className="mt-4 leading-relaxed text-ink-700">{note}</p>
            <dl className="mt-6 divide-y divide-border border-y border-border">
              {HORIZON_IDS.map((id) => (
                <div key={id} className="py-3">
                  <dt className="text-lg font-bold">
                    <a
                      href={`#${placementHeadingId(id)}`}
                      className={horizonLink}
                    >
                      {strings.horizons[id].label}
                    </a>
                  </dt>
                  <dd className="mt-1 leading-relaxed text-ink-900">
                    {strings.horizons[id].definition}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <>
            <dl className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-3">
              {HORIZON_IDS.map((id) => (
                <div key={id}>
                  <dt className="font-bold">
                    <a
                      href={`#${placementHeadingId(id)}`}
                      className={horizonLink}
                    >
                      {strings.horizons[id].label}
                    </a>
                  </dt>
                  <dd className="mt-1 leading-relaxed text-ink-700">
                    {strings.horizons[id].definition}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 max-w-3xl leading-relaxed text-ink-700">
              {note}
            </p>
          </>
        )}
      </div>
    </section>
  )
}
