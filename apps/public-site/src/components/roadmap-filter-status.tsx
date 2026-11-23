import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  countItems,
  includesAllWales,
  itemsStatus,
} from "../lib/roadmap-helpers"
import { setOrgFilter } from "../lib/router"
import { type Roadmap, NO_ORG_FILTER, type OrgFilter } from "../lib/types"

/**
 * Under a filtered roadmap's intro: how many items are shown, and a button to
 * show them all again.
 */
export function FilterBanner({
  roadmap,
  filter,
}: {
  roadmap: Roadmap
  filter: OrgFilter
}) {
  const { t } = useTranslation()
  if (!filter.org) return null

  return (
    <div className="mt-6 max-w-3xl rounded-card border border-l-4 border-border border-l-action bg-surface p-4">
      <p className="font-bold text-heading">
        {itemsStatus(countItems(roadmap, filter), filter, t, {
          withAllWales: false,
        })}
      </p>
      <p className="mt-1 text-sm text-ink-700">
        {includesAllWales(filter) ? (
          <>{t("roadmap.includesAllWales")} </>
        ) : null}
        {t("roadmap.filterHelp")}
      </p>
      <button
        type="button"
        onClick={() => {
          setOrgFilter(NO_ORG_FILTER)
          // The banner goes, so move focus to the page heading.
          document.getElementById("roadmap-title")?.focus()
        }}
        className="mt-3 text-sm font-medium text-action underline underline-offset-4 hover:decoration-2"
      >
        {t("roadmap.showAllItems")}
      </button>
    </div>
  )
}

/**
 * A hidden live region that says how many items are shown whenever the filter
 * changes. Always in the page and empty at first, so screen readers announce
 * the changes but not the page load.
 */
export function FilterAnnouncer({
  roadmap,
  filter,
}: {
  roadmap: Roadmap
  filter: OrgFilter
}) {
  const { t } = useTranslation()
  const [initial] = useState(filter)
  const [changed, setChanged] = useState(false)
  if (!changed && filter !== initial) setChanged(true)

  return (
    <p role="status" className="sr-only">
      {changed ? itemsStatus(countItems(roadmap, filter), filter, t) : null}
    </p>
  )
}
