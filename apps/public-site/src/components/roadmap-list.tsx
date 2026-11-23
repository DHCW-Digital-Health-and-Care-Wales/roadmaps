import { useState } from "react"
import { useStrings } from "../i18n"
import type { Roadmap, OrgFilter } from "../lib/types"
import {
  countInParentheses,
  isExpandable,
  placementHeading,
  placementHeadingId,
  roadmapGroups,
  showsPlacement,
} from "../lib/roadmap-helpers"
import { EmptyItems } from "./empty-items"
import { RoadmapListItem } from "./roadmap-list-item"

const linkButton = "text-action underline underline-offset-4 hover:decoration-2"

/**
 * The roadmap as a compact, text-first list: counts at a glance, then each
 * section and horizon as rows that open to show the outcome and details.
 * Shown instead of the cards with `?view=list`.
 */
export function RoadmapList({
  roadmap,
  filter,
}: {
  roadmap: Roadmap
  filter: OrgFilter
}) {
  const strings = useStrings()
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())

  const groups = roadmapGroups(roadmap, filter).filter((g) =>
    showsPlacement(g.id, g.total),
  )
  // Keyed by the place in the unfiltered list, so rows stay open while filtering.
  const keyOf = (id: string, index: number) => `${id}-${String(index)}`
  const expandable = groups.flatMap((g) =>
    g.items.flatMap(({ item, index }) =>
      isExpandable(item) ? [keyOf(g.id, index)] : [],
    ),
  )

  const toggle = (key: string) => {
    setOpen((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }

  return (
    <div
      id="roadmap"
      className="page-section scroll-mt-28 short:scroll-mt-0 bg-surface"
    >
      <div className="mx-auto max-w-content">
        <div className="max-w-3xl">
          <nav aria-label={strings.roadmap.atAGlance}>
            <ul className="grid grid-cols-2 gap-2 sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none">
              {groups
                .filter((g) => g.glance)
                .map((g) => (
                  <li key={g.id}>
                    <a
                      href={`#${placementHeadingId(g.id)}`}
                      className="block h-full rounded-card border border-border px-4 py-3 text-ink-900 hover:border-action"
                    >
                      <span className="block text-3xl leading-tight font-bold text-heading">
                        {g.items.length}
                        {g.items.length < g.total ? (
                          <span className="text-base font-normal text-ink-700">
                            {" "}
                            {strings.roadmap.ofTotal({ total: g.total })}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-sm text-ink-700">
                        {placementHeading(g.id, strings)}
                      </span>
                    </a>
                  </li>
                ))}
            </ul>
          </nav>

          {expandable.length > 0 ? (
            <div className="mt-6 flex gap-4 text-sm">
              <button
                type="button"
                className={linkButton}
                onClick={() => {
                  setOpen(new Set(expandable))
                }}
              >
                {strings.roadmap.openAll}
              </button>
              <button
                type="button"
                className={linkButton}
                onClick={() => {
                  setOpen(new Set())
                }}
              >
                {strings.roadmap.closeAll}
              </button>
            </div>
          ) : null}

          {groups.map((g) => (
            <section
              key={g.id}
              aria-labelledby={placementHeadingId(g.id)}
              className="mt-10 scroll-mt-28 short:scroll-mt-0"
            >
              <h2
                id={placementHeadingId(g.id)}
                className="border-b-2 border-heading pb-2 text-2xl font-bold text-heading"
              >
                {placementHeading(g.id, strings)}
                {filter.org ? (
                  <>
                    {" "}
                    <span className="text-lg font-normal text-ink-700">
                      {countInParentheses(
                        { shown: g.items.length, total: g.total },
                        strings,
                      )}
                    </span>
                  </>
                ) : null}
              </h2>
              {g.items.length > 0 ? (
                <ul>
                  {g.items.map(({ item, index }) => {
                    const key = keyOf(g.id, index)
                    return (
                      <RoadmapListItem
                        key={key}
                        item={item}
                        open={open.has(key)}
                        onToggle={() => {
                          toggle(key)
                        }}
                      />
                    )
                  })}
                </ul>
              ) : (
                <EmptyItems
                  filter={filter}
                  total={g.total}
                  headingId={placementHeadingId(g.id)}
                  className="py-4"
                />
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
