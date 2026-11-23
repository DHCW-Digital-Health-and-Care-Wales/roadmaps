import type { ReactNode } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useLanguage } from "../i18n"
import type { RoadmapMeta, OrgFilter } from "../lib/types"
import { formatDate } from "../lib/roadmap-helpers"
import { pathFor, withOrgFilter } from "../lib/router"
import { BackLink } from "./back-link"
import { FamilyLabel } from "./family-label"
import { ContentText } from "./content-text"

/**
 * Title section, rendered as the page's primary heading. A link back to all
 * roadmaps sits on the left of the top row and `controls` (the organisation
 * filter) on the right, in a column of its own from `xl`; the back link keeps
 * the organisation filter. Below them come the title, with the family as a
 * caption inside the h1, then the status, "last updated" date and product
 * lead, each shown only if set: stacked on small screens, on one line with
 * dots between from `sm`. The roadmap's "Our vision" follows, or the generic
 * intro if it has none, then `children`. A 4px edge in the roadmap's colour
 * closes the section; the colour is decorative and never used for text.
 */
export function RoadmapIntro({
  meta,
  filter,
  controls,
  children,
}: {
  meta: RoadmapMeta
  filter: OrgFilter
  controls?: ReactNode
  children?: ReactNode
}) {
  const { lang } = useLanguage()
  const { t } = useTranslation()
  const back = withOrgFilter(pathFor(lang, null), filter)
  const metaItems: { key: string; content: ReactNode }[] = []
  if (meta.statusLabel.en) {
    metaItems.push({
      key: "status",
      content: (
        <Trans
          i18nKey="roadmap.status"
          components={{ status: <ContentText value={meta.statusLabel} /> }}
        />
      ),
    })
  }
  if (meta.lastUpdated) {
    metaItems.push({
      key: "updated",
      content: (
        <Trans
          i18nKey="roadmap.lastUpdated"
          values={{ date: formatDate(meta.lastUpdated, t) }}
          components={{ time: <time dateTime={meta.lastUpdated} /> }}
        />
      ),
    })
  }
  if (meta.productLead) {
    metaItems.push({
      key: "lead",
      content: t("roadmap.productLead", { name: meta.productLead }),
    })
  }

  return (
    <section
      id="about"
      aria-labelledby="roadmap-title"
      className="page-intro scroll-mt-28 short:scroll-mt-0 border-b-4"
      style={{ borderBottomColor: meta.colour }}
    >
      {/* From xl the filter gets its own column, so opening it doesn't push the
          title down. The column has a fixed width so the text doesn't reflow,
          and the 1fr row takes any extra height when the panel is taller. */}
      <div className="mx-auto max-w-content xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:grid-rows-[auto_1fr] xl:gap-x-12">
        {/* Below xl the back link floats left, so the filter link sits beside
            it and its panel opens underneath at full width without moving
            the link. */}
        <div className="flow-root xl:contents">
          <BackLink
            href={back}
            className="float-left mr-8 xl:col-start-1 xl:row-start-1 xl:justify-self-start"
          >
            {t("roadmap.allRoadmaps")}
          </BackLink>
          {controls ? (
            <div className="min-w-0 xl:col-start-2 xl:row-span-2 xl:row-start-1">
              {controls}
            </div>
          ) : null}
        </div>

        <div className="xl:col-start-1 xl:row-start-2">
          <h1
            id="roadmap-title"
            tabIndex={-1}
            className="mt-6 text-3xl font-bold text-heading sm:text-4xl"
          >
            {meta.family.en ? (
              <>
                <FamilyLabel meta={meta} as="span" className="mb-1">
                  {/* Not sr-only: its absolute position adds a space before the colon in the name. */}
                  <span className="[clip-path:inset(50%)]">:</span>
                </FamilyLabel>{" "}
              </>
            ) : null}
            <ContentText value={meta.title} />
          </h1>

          {metaItems.length > 0 ? (
            // Stacked on small screens. From sm it's one line, where
            // overflow-hidden clips a separator if its item wraps to the start
            // of a line, so dots only show between items.
            <p className="mt-3 flex flex-col items-start gap-x-6 gap-y-2 overflow-hidden text-sm text-ink-700 sm:flex-row sm:flex-wrap sm:items-center">
              {metaItems.map(({ key, content }, index) => (
                <span key={key} className="relative">
                  {index > 0 ? (
                    // -left-3 is half the parent's gap-x-6, which centres the
                    // dot in the gap; change the two together.
                    <span
                      aria-hidden="true"
                      className="absolute -left-3 hidden -translate-x-1/2 text-ink-500 sm:inline"
                    >
                      ·
                    </span>
                  ) : null}
                  {content}
                </span>
              ))}
            </p>
          ) : null}

          {meta.vision.en ? (
            <div id="vision" className="mt-8 max-w-3xl">
              <h2 className="text-2xl font-bold text-heading">
                {t("roadmap.vision")}
              </h2>
              <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-ink-900">
                <ContentText value={meta.vision} />
              </p>
            </div>
          ) : (
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-900">
              {t("roadmap.intro")}
            </p>
          )}
          {children}
        </div>
      </div>
    </section>
  )
}
