import { useStrings } from "../i18n"
import { ListFilter, X } from "lucide-react"
import {
  firstCardOnScreen,
  focusCard,
  keepInPlace,
  openOrgFilter,
  ORG_FILTER_ID,
} from "../lib/focus"
import { setOrgFilter } from "../lib/router"
import { type OrganisationId, NO_ORG_FILTER } from "../lib/types"

/** Opens the filter panel, scrolling to it. */
const openFilter = () => {
  openOrgFilter({ scroll: true })
}

/**
 * Clears the filter, holding the first card on screen still and moving focus
 * into it, or to the filter if there is no card.
 */
function clearFilter() {
  const card = firstCardOnScreen()
  keepInPlace(card, () => {
    setOrgFilter(NO_ORG_FILTER)
  })
  if (!focusCard(card)) {
    document.querySelector<HTMLElement>(`#${ORG_FILTER_ID} summary`)?.focus()
  }
}

/**
 * In the header from `sm` up while filtered: the organisation's short name,
 * which opens the filter, and a button to clear it.
 */
export function FilterChip({ org }: { org: OrganisationId }) {
  const strings = useStrings()
  const short = strings.organisations[org].short

  return (
    <div className="hidden sm:block">
      <div className="inline-flex items-center rounded-full border border-white/40 text-sm">
        <button
          type="button"
          onClick={openFilter}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-l-full py-1 pl-3 pr-2 font-medium hover:bg-white/15"
        >
          <ListFilter aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="sr-only">
            {strings.filter.filteredByOrganisation({ organisation: short })}
          </span>
          <span aria-hidden="true">{short}</span>
        </button>
        <button
          type="button"
          onClick={clearFilter}
          aria-label={strings.filter.clearFilter}
          title={strings.filter.clearFilter}
          className="rounded-r-full border-l border-white/40 py-1.5 pl-1.5 pr-2 hover:bg-white/15"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * Under the header below `sm` while filtered, in place of FilterChip. One line
 * of height `--filter-strip-height`, which index.css moves the page down by.
 */
export function FilterStrip({ org }: { org: OrganisationId }) {
  const strings = useStrings()
  const short = strings.organisations[org].short

  return (
    <div
      data-filter-strip=""
      className="flex h-(--filter-strip-height) items-center justify-between gap-3 border-t border-white/20 px-4 text-sm sm:hidden"
    >
      <button
        type="button"
        onClick={openFilter}
        className="inline-flex min-w-0 items-center gap-1.5 rounded-sm py-1 text-left font-medium underline underline-offset-4"
      >
        <ListFilter aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {strings.filter.filteredBy({ organisation: short })}
        </span>
      </button>
      <button
        type="button"
        onClick={clearFilter}
        aria-label={strings.filter.clearFilter}
        className="inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 font-medium hover:bg-white/15"
      >
        <X aria-hidden="true" className="h-4 w-4" />
        {strings.filter.clear}
      </button>
    </div>
  )
}
