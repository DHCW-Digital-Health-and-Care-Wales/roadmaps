import logoImage from "../assets/dhcw-logo.png"
import { useLanguage, useStrings } from "../i18n"
import { FEEDBACK_URL, REPO_URL } from "../lib/links"
import {
  dataPathFor,
  onNavigate,
  pathFor,
  useHasJs,
  withOrgFilter,
  type View,
} from "../lib/router"
import type { OrgFilter } from "../lib/types"

const opensInNewTab = { target: "_blank", rel: "noreferrer" }

interface FooterLink {
  key: string
  href: string
  label: string
  /**
   * `app` links switch the layout in place, so they need JavaScript; `route`
   * links are real pages that JavaScript opens without a reload.
   */
  kind: "external" | "page" | "app" | "route"
}

/**
 * Footer: feedback route, links to the accessibility statement and privacy
 * note, the licence and a link back to the GitHub repository. On a roadmap
 * page (`dataSlug`) it also links to that roadmap's published JSON and to the
 * other layout (cards or list), keeping the organisation filter.
 */
export function SiteFooter({
  dataSlug,
  view,
  filter,
}: {
  dataSlug?: string | undefined
  view: View
  filter: OrgFilter
}) {
  const { lang } = useLanguage()
  const strings = useStrings()
  const hasJs = useHasJs()
  const toList = view !== "list"
  const links: FooterLink[] = [
    {
      key: "feedback",
      href: FEEDBACK_URL,
      label: strings.site.giveFeedback,
      kind: "external",
    },
    {
      key: "accessibility",
      href: pathFor(lang, "accessibility"),
      label: strings.infoPages.accessibility.heading,
      kind: "route",
    },
    {
      key: "privacy",
      href: pathFor(lang, "privacy"),
      label: strings.infoPages.privacy.heading,
      kind: "route",
    },
    ...(dataSlug
      ? [
          {
            key: "data",
            href: dataPathFor(dataSlug),
            label: strings.footer.roadmapData,
            kind: "page",
          } satisfies FooterLink,
          ...(hasJs
            ? [
                {
                  key: "layout",
                  href: withOrgFilter(
                    `${pathFor(lang, dataSlug)}${toList ? "?view=list" : ""}`,
                    filter,
                  ),
                  label: toList
                    ? strings.footer.listView
                    : strings.footer.cardView,
                  kind: "app",
                } satisfies FooterLink,
              ]
            : []),
        ]
      : []),
    {
      key: "licence",
      href: `${REPO_URL}/blob/main/LICENSE`,
      label: strings.footer.licence,
      kind: "external",
    },
    {
      key: "github",
      href: REPO_URL,
      label: strings.footer.onGitHub,
      kind: "external",
    },
  ]

  return (
    <footer className="bg-nhs-wales-blue px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-content">
        <img
          src={logoImage}
          alt={strings.site.organisation}
          className="h-12 w-auto object-contain"
        />
        <nav aria-label={strings.footer.nav} className="mt-6">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {links.map((link) => (
              <li key={link.key}>
                <a
                  href={link.href}
                  onClick={
                    link.kind === "app"
                      ? onNavigate(link.href, { scroll: false })
                      : link.kind === "route"
                        ? onNavigate(link.href)
                        : undefined
                  }
                  className="text-sm underline underline-offset-4 hover:no-underline"
                  {...(link.kind === "external" ? opensInNewTab : {})}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-6 text-sm text-white/80">
          {strings.site.organisationFooter}
        </p>
      </div>
    </footer>
  )
}
