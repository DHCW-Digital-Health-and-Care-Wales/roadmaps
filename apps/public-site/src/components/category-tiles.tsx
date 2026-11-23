import { useTranslation } from "react-i18next"
import { categorySectionId, type CategoryTile } from "../lib/roadmap-helpers"
import { CategoryIcon } from "./category-icon"

const NAV_ID = "categories"

const tileClass =
  "flex h-full gap-3.5 rounded-card border border-border bg-surface px-5 py-4 text-ink-900 no-underline"

/**
 * Jump links to each category's section, with the number of matches. A
 * category with no matches has no section, so its tile is not a link.
 * Nothing is shown if there are no tiles.
 */
export function CategoryTiles({ tiles }: { tiles: CategoryTile[] }) {
  const { t } = useTranslation()
  if (tiles.length === 0) return null

  return (
    <nav id={NAV_ID} aria-labelledby={`${NAV_ID}-heading`} className="mt-8">
      <h2 id={`${NAV_ID}-heading`} className="sr-only">
        {t("landing.browseCategories")}
      </h2>
      <ul className="card-gap grid sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ category, count }) => {
          const content = (
            <>
              <CategoryIcon category={category} size="small" />
              <span>
                <span
                  className={`block text-lg font-bold text-heading ${count ? "group-hover:underline" : ""}`}
                >
                  {t(`categories.${category.id}.label`)}
                </span>
                <span className="mt-0.5 block text-sm text-ink-700">
                  {t(`categories.${category.id}.description`)}
                </span>
                <span className="mt-1.5 block text-sm text-ink-700">
                  {t("landing.roadmapCount", { count })}
                </span>
              </span>
            </>
          )
          return (
            <li key={category.id}>
              {count ? (
                <a
                  href={`#${categorySectionId(category)}`}
                  className={`group ${tileClass} transition-shadow hover:border-border-strong hover:shadow-md`}
                >
                  {content}
                </a>
              ) : (
                <div className={`${tileClass} bg-surface-subtle`}>
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
