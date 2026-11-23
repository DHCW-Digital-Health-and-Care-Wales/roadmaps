import { catalogues, supportedLanguages, useStrings } from "../i18n"

/**
 * GOV.UK-style phase banner at the top of every page: the beta tag with a line
 * about the service. Its top padding clears the SiteHeader (72px, 88px
 * from sm) by 16px, so pages start below it without their own clearance;
 * index.css moves <main> down further while the mobile filter strip shows.
 * The strip is surface-subtle to run into the grey top of most pages; info
 * pages are white below it. `bilingual` shows the line in every language, for
 * the generic 404.html.
 */
export function PhaseBanner({ bilingual = false }: { bilingual?: boolean }) {
  const strings = useStrings()
  return (
    <div className="bg-surface-subtle px-4 pt-22 sm:px-6 sm:pt-26">
      <p className="mx-auto flex max-w-content items-center gap-3 border-b border-border pb-3 text-ink-900">
        <strong className="inline-flex shrink-0 items-center rounded-full bg-heading px-3 py-1 text-sm font-medium text-white">
          {strings.site.phaseBadge}
        </strong>
        <span>
          {bilingual
            ? supportedLanguages.map((value) => (
                <span key={value} lang={value} className="block">
                  {catalogues[value].site.phaseBanner}
                </span>
              ))
            : strings.site.phaseBanner}
        </span>
      </p>
    </div>
  )
}
