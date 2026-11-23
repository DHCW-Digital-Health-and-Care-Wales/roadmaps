import type { MouseEvent } from "react"
import { Building2, Check, Map as MapIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { keepInPlace } from "../lib/focus"
import { includesAllWales } from "../lib/roadmap-helpers"
import { setOrgFilter, useHasJs, useOrgFilter } from "../lib/router"
import { type OrganisationId, NO_ORG_FILTER } from "../lib/types"

const pill =
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"

const looks = {
  plain:
    "border-border-strong bg-surface text-ink-700 hover:border-action hover:text-action",
  pressed: "border-heading bg-heading text-white hover:bg-navy",
  // All of Wales while a filter takes all-Wales work in.
  included:
    "border-heading bg-surface-muted text-heading hover:border-action hover:text-action",
}

/**
 * The organisations a roadmap item is for. Each is a toggle button: pressing
 * one filters the page to that organisation, and pressing it again shows
 * everything. The card stays where it is on screen while the page changes
 * around it. Plain labels without JavaScript.
 */
export function OrgPills({
  organisations,
  className = "",
}: {
  organisations: readonly OrganisationId[]
  className?: string
}) {
  const { t } = useTranslation()
  const hasJs = useHasJs()
  const filter = useOrgFilter()

  const toggle = (id: OrganisationId) => (event: MouseEvent<HTMLElement>) => {
    const button = event.currentTarget
    keepInPlace(button.closest("[data-filter-card]") ?? button, () => {
      setOrgFilter(
        id === filter.org
          ? NO_ORG_FILTER
          : { org: id, includeNational: filter.includeNational },
      )
    })
    button.focus({ preventScroll: true })
  }

  return (
    <p className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="sr-only">{t("filter.organisations")} </span>
      {organisations.map((id) => {
        const short = t(`organisations.${id}.short`)
        const Icon = id === "national" ? MapIcon : Building2
        if (!hasJs) {
          return (
            <span
              key={id}
              className={`${pill} border-border-strong bg-surface text-ink-700`}
            >
              <Icon aria-hidden="true" className="h-3 w-3 shrink-0" />
              {short}
            </span>
          )
        }
        const pressed = id === filter.org
        let look = looks.plain
        if (pressed) look = looks.pressed
        else if (id === "national" && includesAllWales(filter)) {
          look = looks.included
        }
        return (
          <button
            key={id}
            type="button"
            aria-pressed={pressed}
            title={
              pressed
                ? t("filter.showAllItemsAgain")
                : t("filter.showOnlyWorkFor", {
                    organisation: t(`organisations.${id}.name`),
                  })
            }
            onClick={toggle(id)}
            className={`${pill} ${look} underline-offset-2 hover:underline`}
          >
            {pressed ? (
              <Check aria-hidden="true" className="h-3 w-3 shrink-0" />
            ) : (
              <Icon aria-hidden="true" className="h-3 w-3 shrink-0" />
            )}
            <span className="sr-only">{t("filter.byPill")}</span> {short}
          </button>
        )
      })}
    </p>
  )
}
