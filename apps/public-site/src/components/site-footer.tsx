import logoImage from "../assets/dhcw-logo.png"
import type { ParseKeys } from "i18next"
import { useTranslation } from "react-i18next"
import { useLanguage } from "../i18n"
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
  label: ParseKeys
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
  const { t } = useTranslation()
  const hasJs = useHasJs()
  const toList = view !== "list"
  const links: FooterLink[] = [
    {
      key: "feedback",
      href: FEEDBACK_URL,
      label: "site.giveFeedback",
      kind: "external",
    },
    {
      key: "accessibility",
      href: pathFor(lang, "accessibility"),
      label: "infoPages.accessibility.heading",
      kind: "route",
    },
    {
      key: "privacy",
      href: pathFor(lang, "privacy"),
      label: "infoPages.privacy.heading",
      kind: "route",
    },
    ...(dataSlug
      ? [
          {
            key: "data",
            href: dataPathFor(dataSlug),
            label: "footer.roadmapData",
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
                  label: toList ? "footer.listView" : "footer.cardView",
                  kind: "app",
                } satisfies FooterLink,
              ]
            : []),
        ]
      : []),
    {
      key: "licence",
      href: `${REPO_URL}/blob/main/LICENSE`,
      label: "footer.licence",
      kind: "external",
    },
    {
      key: "github",
      href: REPO_URL,
      label: "footer.onGitHub",
      kind: "external",
    },
  ]

  return (
    <footer className="bg-nhs-wales-blue px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-content">
        <img
          src={logoImage}
          alt={t("site.organisation")}
          className="h-12 w-auto object-contain"
        />
        <nav aria-label={t("footer.nav")} className="mt-6">
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
                  {t(link.label)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-6 text-sm text-white/80">
          {t("site.organisationFooter")}
        </p>
      </div>
    </footer>
  )
}
