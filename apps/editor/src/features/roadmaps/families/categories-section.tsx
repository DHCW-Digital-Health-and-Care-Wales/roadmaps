import { useTranslation } from "react-i18next"

import type { Category } from "@/domain/roadmap/category"

import { ContentText } from "../components/content-text"

/** The categories in list order, read-only (S1): they can't be changed here yet. */
export function CategoriesSection({
  categories,
}: {
  categories: readonly Category[] | null
}) {
  const { t } = useTranslation()
  return (
    <section
      aria-labelledby="categories-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <h2 id="categories-heading" className="text-heading-l">
          {t("roadmaps.families.categories.heading")}
        </h2>
        <p className="text-muted-foreground">
          {t("roadmaps.families.categories.description")}
        </p>
      </div>
      {categories && categories.length > 0 ? (
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          {categories.map((category) => (
            <li key={category.id}>
              <ContentText value={category.name} />
            </li>
          ))}
        </ul>
      ) : (
        <p>{t("roadmaps.families.categories.none")}</p>
      )}
    </section>
  )
}
