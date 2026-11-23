import { useTranslation } from "react-i18next"
import { useLanguage } from "../i18n"
import { INFO_PAGES } from "../lib/info-pages"
import { pathFor, type InfoPageId } from "../lib/router"
import { ArrowLink } from "../components/arrow-link"

/**
 * The accessibility statement or privacy note, on a page of its own: the
 * heading in a grey band that continues from the phase banner, as on the
 * other pages, then the text and a link to all roadmaps. The link isn't a back
 * link, as visitors may arrive here from anywhere.
 */
export function InfoPage({ page }: { page: InfoPageId }) {
  const { lang } = useLanguage()
  const { t } = useTranslation()
  const { heading, paragraphs } = INFO_PAGES[page]
  const home = pathFor(lang, null)

  return (
    <>
      <div className="page-intro">
        <h1
          tabIndex={-1}
          className="mx-auto max-w-content text-3xl font-bold text-heading"
        >
          {t(heading)}
        </h1>
      </div>
      <div className="page-body">
        <div className="mx-auto max-w-content">
          <div className="max-w-3xl space-y-4 leading-relaxed text-ink-900">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{t(paragraph)}</p>
            ))}
          </div>
          <ArrowLink href={home} className="mt-8">
            {t("site.viewAllRoadmaps")}
          </ArrowLink>
        </div>
      </div>
    </>
  )
}
