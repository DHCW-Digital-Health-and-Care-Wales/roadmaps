import { useTranslation } from "react-i18next"

const TITLE_ID = "roadmaps-title"

/** The connected home page. S06 adds the roadmap list below the heading. */
export function RoadmapsPage() {
  const { t } = useTranslation()

  return (
    <section
      aria-labelledby={TITLE_ID}
      className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <div className="flex flex-col gap-1.5">
        <h1 id={TITLE_ID} className="text-2xl font-semibold tracking-tight">
          {t("roadmaps.title")}
        </h1>
        <p className="text-muted-foreground">{t("roadmaps.description")}</p>
      </div>
    </section>
  )
}
