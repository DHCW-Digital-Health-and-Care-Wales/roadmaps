import { useEffect, useRef } from "react"
import { roadmaps } from "./lib/roadmaps"
import { useTranslation } from "react-i18next"
import { localise, useLanguage } from "./i18n"
import { INFO_PAGES } from "./lib/info-pages"
import { organisationsWithWork, titleWithFamily } from "./lib/roadmap-helpers"
import { NO_ORG_FILTER } from "./lib/types"
import { useOrgFilter, useView, isInfoPage } from "./lib/router"
import { SiteHeader } from "./components/site-header"
import { SiteFooter } from "./components/site-footer"
import { BackToTop } from "./components/back-to-top"
import { PhaseBanner } from "./components/phase-banner"
import { NotFoundState } from "./components/not-found-state"
import { InfoPage } from "./pages/info-page"
import { LandingPage } from "./pages/landing-page"
import { RoadmapPage } from "./pages/roadmap-page"

/**
 * Routes on the URL path (via LanguageProvider) to a landing page or a product
 * roadmap. The prerender uses an empty slug for the generic not-found page in
 * 404.html.
 */
export function App() {
  const { lang, route } = useLanguage()
  const { t } = useTranslation()
  const view = useView()
  const filter = useOrgFilter()
  const { slug } = route
  const infoPage = isInfoPage(slug) ? slug : null
  const roadmap =
    slug && !infoPage ? roadmaps.find((r) => r.slug === slug) : undefined
  const mainRef = useRef<HTMLElement>(null)
  const previousSlugRef = useRef(slug)

  useEffect(() => {
    const site = t("site.title")
    let page: string | undefined
    if (roadmap) page = localise(titleWithFamily(roadmap.meta), lang)
    else if (infoPage) page = t(INFO_PAGES[infoPage].heading)
    else if (slug !== null) page = t("notFound.heading")
    document.title = page ? `${page} – ${site}` : site
  }, [roadmap, infoPage, slug, lang, t])

  // After client-side navigation, move focus to the new page's heading so
  // screen readers announce it (runs after the title update above).
  useEffect(() => {
    if (previousSlugRef.current === slug) return
    previousSlugRef.current = slug
    mainRef.current?.querySelector("h1")?.focus()
  }, [slug])

  // Only pages with the filter's controls show it in the header.
  const hasOrgFilter = slug === null ? roadmaps.length > 0 : Boolean(roadmap)

  let content
  if (slug === null) {
    content = <LandingPage roadmaps={roadmaps} filter={filter} />
  } else if (infoPage) {
    content = <InfoPage page={infoPage} />
  } else if (!roadmap) {
    content = <NotFoundState slug={slug} />
  } else {
    content = (
      <RoadmapPage
        roadmap={roadmap}
        view={view}
        filter={filter}
        organisations={organisationsWithWork(roadmaps)}
      />
    )
  }

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t("site.skipLink")}
      </a>

      <span id="top" tabIndex={-1} />
      <SiteHeader
        filter={hasOrgFilter ? filter : NO_ORG_FILTER}
        showSectionLinks={Boolean(roadmap)}
      />

      <main id="main-content" ref={mainRef}>
        <PhaseBanner bilingual={slug === ""} />
        {content}
      </main>

      <SiteFooter dataSlug={roadmap?.slug} view={view} filter={filter} />
      <BackToTop />
    </>
  )
}
