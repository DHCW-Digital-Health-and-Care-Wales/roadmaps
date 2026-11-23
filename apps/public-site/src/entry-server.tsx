/**
 * Build-time entry for scripts/prerender.ts: renders the language choice at the
 * site root and every page in each language to static HTML, with per-page meta,
 * Open Graph and hreflang tags.
 */
import { StrictMode } from "react"
import { prerender } from "react-dom/static"
import { App } from "./app"
import { LanguageProvider } from "./components/language-provider"
import {
  catalogues,
  defaultLanguage,
  localise,
  supportedLanguages,
  type Language,
} from "./i18n"
import { INFO_PAGES } from "./lib/info-pages"
import { roadmapSummary, titleWithFamily } from "./lib/roadmap-helpers"
import { roadmaps } from "./lib/roadmaps"
import { dataPathFor, INFO_PAGE_IDS, pathFor, type Route } from "./lib/router"

export interface Page {
  /** Output file relative to the build directory. */
  file: string
  /** Canonical URL, or null for 404.html. */
  url: string | null
  /** The `lang` attribute for `<html>`. */
  lang: Language
  /** `data-lang` and `data-slug` for #root, or null when the page can't hydrate. */
  route: { lang: Language; slug: string } | null
  head: string
  html: string
}

const BASE = import.meta.env.BASE_URL

/** Each roadmap's data is published once, at `<slug>/roadmap.json`. */
const JSON_FILE = "roadmap.json"

const LOCALES: Record<Language, string> = { en: "en_GB", cy: "cy_GB" }

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

function head(
  siteUrl: string,
  page: {
    lang: Language
    title: string
    description: string
    url: string | null
    alternates?: [hreflang: string, href: string][]
    json?: string
  },
) {
  const otherLang = page.lang === "en" ? "cy" : "en"
  const meta: [string, string, string][] = [
    ["name", "description", page.description],
    ["property", "og:type", "website"],
    ["property", "og:site_name", catalogues[page.lang].site.title],
    ["property", "og:title", page.title],
    ["property", "og:description", page.description],
    ["property", "og:image", new URL("Timeline.png", siteUrl).href],
    ["property", "og:locale", LOCALES[page.lang]],
    ["property", "og:locale:alternate", LOCALES[otherLang]],
    ["name", "twitter:card", "summary"],
  ]
  if (page.url) meta.push(["property", "og:url", page.url])
  else meta.push(["name", "robots", "noindex"])

  return [
    `<title>${escapeHtml(page.title)}</title>`,
    ...meta.map(
      ([attr, key, value]) =>
        `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`,
    ),
    ...(page.url
      ? [`<link rel="canonical" href="${escapeHtml(page.url)}" />`]
      : []),
    ...(page.alternates ?? []).map(
      ([hreflang, href]) =>
        `<link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(href)}" />`,
    ),
    ...(page.json
      ? [
          `<link rel="alternate" type="application/json" href="${escapeHtml(page.json)}" />`,
        ]
      : []),
  ]
    .map((line) => `    ${line}`)
    .join("\n")
}

async function render(route: Route) {
  const { prelude } = await prerender(
    <StrictMode>
      <LanguageProvider serverRoute={route}>
        <App />
      </LanguageProvider>
    </StrictMode>,
  )
  return new Response(prelude).text()
}

/** `siteUrl` is the deployed address of the site root, ending in `/`. */
export async function renderPages(siteUrl: string): Promise<Page[]> {
  const urlFor = (path: string) =>
    new URL(path.slice(BASE.length), siteUrl).href
  const rootUrl = urlFor(BASE)
  const alternatesFor = (slug: string | null): [string, string][] =>
    supportedLanguages.map((lang) => [lang, urlFor(pathFor(lang, slug))])

  /** `title` and `description` are already in `lang`. */
  async function languagePage(
    lang: Language,
    slug: string | null,
    title: string | null,
    description: string,
    { hasData = false } = {},
  ): Promise<Page> {
    const strings = catalogues[lang]
    const site = strings.site.title
    const url = urlFor(pathFor(lang, slug))
    return {
      file: `${lang}/${slug ? `${slug}/` : ""}index.html`,
      url,
      lang,
      route: { lang, slug: slug ?? "" },
      head: head(siteUrl, {
        lang,
        title: title ? `${title} – ${site}` : site,
        description,
        url,
        alternates: slug
          ? alternatesFor(slug)
          : [...alternatesFor(null), ["x-default", rootUrl]],
        ...(hasData && slug ? { json: urlFor(dataPathFor(slug)) } : {}),
      }),
      html: await render({ lang, slug }),
    }
  }

  const languagePages = await Promise.all(
    supportedLanguages.flatMap((lang) => {
      const strings = catalogues[lang]
      return [
        languagePage(lang, null, null, strings.landing.intro),
        ...INFO_PAGE_IDS.map((id) => {
          const { heading, paragraphs } = INFO_PAGES[id](strings)
          return languagePage(lang, id, heading, paragraphs[0])
        }),
        ...roadmaps.map(({ slug, meta }) => {
          const summary = roadmapSummary(meta)
          return languagePage(
            lang,
            slug,
            localise(titleWithFamily(meta), lang),
            summary ? localise(summary, lang) : strings.roadmap.intro,
            { hasData: true },
          )
        }),
      ]
    }),
  )

  // The site root shows the default landing page; src/main.tsx redirects with
  // JavaScript, and the <noscript> refresh does so without.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- the default language always has its landing page.
  const landing = languagePages.find(
    (page) => page.file === `${defaultLanguage}/index.html`,
  )!
  const root: Page = {
    ...landing,
    file: "index.html",
    route: null,
    head: [
      `    <noscript><meta http-equiv="refresh" content="0; url=${pathFor(defaultLanguage, null)}" /></noscript>`,
      landing.head,
    ].join("\n"),
  }

  const bilingual = (key: "heading" | "generic") =>
    `${catalogues.cy.notFound[key]} / ${catalogues.en.notFound[key]}`
  const notFound: Page = {
    file: "404.html",
    url: null,
    lang: defaultLanguage,
    route: null,
    head: head(siteUrl, {
      lang: defaultLanguage,
      title: bilingual("heading"),
      description: bilingual("generic"),
      url: null,
    }),
    html: await render({ lang: defaultLanguage, slug: "" }),
  }

  return [root, ...languagePages, notFound]
}

export interface DataFile {
  /** Output file relative to the build directory. */
  file: string
  content: string
}

/** The JSON behind each roadmap page, for viewing on the published site. */
export function renderDataFiles(): DataFile[] {
  return roadmaps.map((roadmap) => ({
    file: `${roadmap.slug}/${JSON_FILE}`,
    content: `${JSON.stringify(roadmap, null, 2)}\n`,
  }))
}
