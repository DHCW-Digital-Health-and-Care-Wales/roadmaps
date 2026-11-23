import { useTranslation } from "react-i18next"
import { supportedLanguages, useLanguage } from "../i18n"
import { pathFor } from "../lib/router"
import { ArrowLink } from "./arrow-link"

/**
 * An empty `slug` gives the generic message for the prerendered 404.html, in
 * both languages because the page can't tell which was asked for without
 * JavaScript.
 */
export function NotFoundState({ slug }: { slug: string }) {
  const { lang } = useLanguage()
  const { t } = useTranslation()

  return (
    <section className="bg-surface-subtle px-4 pb-16 pt-6 sm:px-6">
      <div className="mx-auto max-w-content">
        <h1 tabIndex={-1} className="text-3xl font-bold text-heading">
          {slug ? (
            t("notFound.heading")
          ) : (
            <>
              <span lang="cy">{t("notFound.heading", { lng: "cy" })}</span> /{" "}
              <span lang="en">{t("notFound.heading", { lng: "en" })}</span>
            </>
          )}
        </h1>
        {slug ? (
          <>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-900">
              {t("notFound.body", { slug })}
            </p>
            <ArrowLink href={pathFor(lang, null)} className="mt-6">
              {t("site.viewAllRoadmaps")}
            </ArrowLink>
          </>
        ) : (
          supportedLanguages.map((value) => (
            <div key={value} lang={value} className="mt-8">
              <p className="max-w-3xl text-lg leading-relaxed text-ink-900">
                {t("notFound.generic", { lng: value })}
              </p>
              <ArrowLink
                href={pathFor(value, null)}
                clientSide={false}
                className="mt-6"
              >
                {t("site.viewAllRoadmaps", { lng: value })}
              </ArrowLink>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
