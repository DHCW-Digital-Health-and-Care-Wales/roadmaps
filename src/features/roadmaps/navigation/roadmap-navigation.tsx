import { useParams } from "@tanstack/react-router"
import { GlobeIcon, LayoutGridIcon } from "lucide-react"
import { useId, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { NavigationForm } from "@/components/layout/app-shell"
import { TooltipProvider } from "@/components/ui/tooltip"
import { localise } from "@/domain/roadmap/localised-text"
import { useLanguage } from "@/i18n"
import { cn } from "@/lib/utils"

import { namesFamilies, type RoadmapGroup } from "../group-roadmaps"
import { useGroupName } from "../hooks/use-group-name"
import { usePendingChanges } from "../editing/pending-changes-context"
import { findIn } from "./narrow-roadmaps"
import { NavigationLink, NavigationText } from "./navigation-link"
import { useNavigationSearch } from "./navigation-search-context"
import { nextChangedRoadmap } from "./next-changed-roadmap"
import { roadmapInitials } from "./roadmap-initials"

export interface RoadmapNavigationProps {
  form: NavigationForm
}

/**
 * The shell's destinations (STY-054): all the roadmaps, each roadmap grouped by family
 * as the list groups them (D3), with its colour, and the families, categories and
 * organisations. The current page is marked, to sight and to a screen reader (S3).
 * Until the roadmaps are read (not connected, loading, or a list that failed), it offers
 * the two pages alone, which say why there is nothing to show (S4). Folded to a rail,
 * each shows as an icon or a roadmap's initials (`NavigationLink`).
 *
 * It says, from every page, which roadmaps have unpublished changes (STY-055): a dot on
 * each, and under "All roadmaps" how many, which leads to one of them. Changes are held
 * for the tab, so the count shows while the roadmaps are unread, as text alone.
 *
 * In full, it lists only the roadmaps its search finds, each with the part found
 * underlined, or says none match (STY-061 S1–S4); the rail lists every roadmap whatever
 * the search (D4). All roadmaps, the count and the families page always show.
 */
export function RoadmapNavigation({ form }: RoadmapNavigationProps) {
  const { t } = useTranslation()
  const search = useNavigationSearch()
  const groups = search.groups ?? []
  const rail = form === "rail"
  const named = namesFamilies(groups)
  const searched = !rail && search.key !== ""
  const listed = searched ? search.found : groups
  const { changes } = usePendingChanges()
  const changed = useMemo(() => new Set(changes.keys()), [changes])
  const currentId = useParams({
    strict: false,
    select: (params) => params.roadmapId,
  })
  // In the navigation's order, so the count steps through them as the Product Lead reads.
  const changedInOrder = groups
    .flatMap((group) => group.roadmaps)
    .filter((roadmap) => changed.has(roadmap.id))
    .map((roadmap) => roadmap.id)

  const destinations = (
    <>
      <div>
        <ul className="flex flex-col gap-1">
          <NavigationLink
            to="/"
            // The router marks `/` current only there already: this says so.
            activeOptions={{ exact: true }}
            rail={rail}
            name={t("roadmaps.navigation.all")}
            mark={{ icon: <LayoutGridIcon aria-hidden="true" /> }}
          />
        </ul>
        <UnpublishedTotal
          count={changed.size}
          leadsTo={nextChangedRoadmap(changedInOrder, currentId)}
          rail={rail}
        />
      </div>
      {searched && listed.length === 0 ? (
        <p className="px-2 text-body-xs wrap-anywhere">
          {t("roadmaps.navigation.search.noMatch", {
            query: search.query.trim(),
          })}
        </p>
      ) : (
        listed.map((group) => (
          <RoadmapGroupLinks
            key={group.key}
            group={group}
            named={named}
            rail={rail}
            changed={changed}
            searchKey={searched ? search.key : ""}
          />
        ))
      )}
      <ul className="flex flex-col gap-1 border-t border-sidebar-border pt-3">
        <NavigationLink
          to="/families"
          rail={rail}
          name={t("roadmaps.familiesLink")}
          mark={{ icon: <GlobeIcon aria-hidden="true" /> }}
        />
      </ul>
    </>
  )
  // In a rail, moving between tooltips shows the next at once.
  return rail ? <TooltipProvider>{destinations}</TooltipProvider> : destinations
}

interface RoadmapGroupLinksProps {
  group: RoadmapGroup
  /** The family's name names the list: shown in full, not in a rail. */
  named: boolean
  rail: boolean
  /** The roadmaps with unpublished changes, by id. */
  changed: ReadonlySet<string>
  /** What the search compares (`searchKey`), underlined where a title holds it. */
  searchKey: string
}

/** One family's roadmaps, in a list named for the family. */
function RoadmapGroupLinks({
  group,
  named,
  rail,
  changed,
  searchKey,
}: RoadmapGroupLinksProps) {
  const language = useLanguage()
  const groupName = useGroupName()
  const nameId = useId()
  return (
    <div className="flex flex-col gap-1">
      {named && (
        // The list's name: read with the list, not again before it.
        <p
          id={nameId}
          aria-hidden="true"
          className={cn(
            "px-2 text-body-xs font-bold wrap-anywhere",
            rail && "sr-only",
          )}
        >
          {groupName(group)}
        </p>
      )}
      <ul
        aria-labelledby={named ? nameId : undefined}
        className="flex flex-col gap-1"
      >
        {group.roadmaps.map((roadmap) => {
          const title = localise(roadmap.title, language)
          return (
            <NavigationLink
              key={roadmap.id}
              to="/roadmaps/$roadmapId"
              params={{ roadmapId: roadmap.id }}
              rail={rail}
              name={title}
              mark={{
                colour: roadmap.colour,
                initials: roadmapInitials(title),
                unpublished: changed.has(roadmap.id),
                found: findIn(title, searchKey),
              }}
            />
          )
        })}
      </ul>
    </div>
  )
}

interface UnpublishedTotalProps {
  /** How many roadmaps have unpublished changes. */
  count: number
  /** The roadmap it leads to, if there is one to lead to. */
  leadsTo: string | undefined
  rail: boolean
}

/**
 * How many roadmaps have unpublished changes, none shown while there are none (S3). It
 * leads to one of them, and the dots mark each (S2); where there is none else to lead to,
 * it says so as text. What a screen reader is told of the number is the shell's
 * (`UnpublishedAnnouncement`), which this drawer may not be in.
 */
function UnpublishedTotal({ count, leadsTo, rail }: UnpublishedTotalProps) {
  const { t } = useTranslation()
  if (count === 0) return null
  const entry = {
    rail,
    name: t("layout.navigation.unpublished", { count }),
    mark: { count },
  }
  return (
    <ul className="mt-1 flex flex-col gap-1">
      {leadsTo === undefined ? (
        <NavigationText {...entry} />
      ) : (
        <NavigationLink
          to="/roadmaps/$roadmapId"
          params={{ roadmapId: leadsTo }}
          {...entry}
        />
      )}
    </ul>
  )
}
