import { useParams } from "@tanstack/react-router"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  GlobeIcon,
  LayoutGridIcon,
} from "lucide-react"
import { useId, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { NavigationForm } from "@/components/layout/app-shell"
import { UnpublishedDot } from "@/components/layout/unpublished-dot"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { namesFamilies, type RoadmapGroup } from "../group-roadmaps"
import { useContent } from "../hooks/use-content"
import { useGroupName } from "../hooks/use-group-name"
import { usePendingChanges } from "../editing/pending-changes-context"
import { AS_PLAIN_WORDS } from "../plain-words"
import { findIn } from "./narrow-roadmaps"
import {
  NavigationButton,
  NavigationLink,
  NavigationText,
} from "./navigation-link"
import { useNavigationSearch } from "./navigation-search-context"
import { roadmapInitials } from "./roadmap-initials"

export interface RoadmapNavigationProps {
  form: NavigationForm
  /** Opens a rail, remembered as open, for its count's circle (STY-063 S7). */
  onOpenNavigation: () => void
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
 * each, and under "All roadmaps" how many. With one roadmap changed the count leads to it;
 * with two or more it is a button that shows only those roadmaps, and every roadmap again
 * once pressed again (STY-063). Changes are held for the tab, so the count shows while
 * the roadmaps are unread, as text alone.
 *
 * In full, it lists only the roadmaps its search finds, each with the part found
 * underlined, or says none match (STY-061 S1–S4), or only those the count shows; the rail
 * lists every roadmap whatever the search or the count (D4), and its count's circle opens
 * the navigation narrowed (STY-063 S7). All roadmaps, the count and the families page
 * always show.
 *
 * Listed whole, each family's name is a button that closes and opens its roadmaps, with
 * "Close all" above them (STY-062 S1, S3); narrowed by the search or the count, a closed
 * family shows what it holds under a plain heading (S6), and the rail lists every
 * roadmap, with no family control (S7).
 */
export function RoadmapNavigation({
  form,
  onOpenNavigation,
}: RoadmapNavigationProps) {
  const { t } = useTranslation()
  const search = useNavigationSearch()
  const groups = search.groups ?? []
  const rail = form === "rail"
  const named = namesFamilies(groups)
  const searched = !rail && search.key !== ""
  const narrowed = searched || (!rail && search.onlyChanged)
  const listed = narrowed ? search.found : groups
  // Only the whole list in full has families to close, where there are some and they have
  // names.
  const foldable = !rail && !narrowed && named && groups.length > 0
  const { changes } = usePendingChanges()
  const changed = useMemo(() => new Set(changes.keys()), [changes])
  const currentId = useParams({
    strict: false,
    select: (params) => params.roadmapId,
  })
  // Where the count leads while one roadmap has changes, and it is not the page open.
  const soleChangedId =
    changed.size === 1
      ? groups
          .flatMap((group) => group.roadmaps)
          .find((roadmap) => changed.has(roadmap.id))?.id
      : undefined

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
          leadsTo={soleChangedId === currentId ? undefined : soleChangedId}
          rail={rail}
          onOpenNavigation={onOpenNavigation}
        />
      </div>
      {searched && listed.length === 0 ? (
        <p className="px-2 text-body-xs wrap-anywhere">
          {t("roadmaps.navigation.search.noMatch", {
            query: search.query.trim(),
          })}
        </p>
      ) : (
        <>
          {foldable && (
            <CloseAllFamilies
              allClosed={search.allClosed}
              onPress={search.toggleAllFamilies}
            />
          )}
          {listed.map((group) => (
            <RoadmapGroupLinks
              key={group.key}
              group={group}
              named={named}
              rail={rail}
              changed={changed}
              searchKey={searched ? search.key : ""}
              closable={foldable}
              closed={foldable && search.closed.has(group.key)}
              onToggle={() => {
                search.toggleFamily(group.key)
              }}
            />
          ))}
        </>
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
  /** The family's name is a button that closes its list, rather than a heading. */
  closable: boolean
  /** Its list is put away; only while `closable`. */
  closed: boolean
  onToggle: () => void
}

/**
 * One family's roadmaps, in a list named for the family: under its button while the
 * families can close, put away while it is closed, and else under a plain heading.
 */
function RoadmapGroupLinks({
  group,
  named,
  rail,
  changed,
  searchKey,
  closable,
  closed,
  onToggle,
}: RoadmapGroupLinksProps) {
  const { t } = useTranslation()
  const content = useContent()
  const groupName = useGroupName()
  const nameId = useId()
  const listId = useId()
  const name = groupName(group)
  // A closed family keeps a dot while a roadmap inside has unpublished changes (S2).
  const unpublished = closed && group.roadmaps.some((r) => changed.has(r.id))
  return (
    <div className="flex flex-col gap-1">
      {closable ? (
        <Button
          variant="navigation"
          size="sm"
          aria-expanded={!closed}
          aria-controls={closed ? undefined : listId}
          aria-label={
            unpublished
              ? t("roadmaps.navigation.changed", {
                  name: name.text,
                  ...AS_PLAIN_WORDS,
                })
              : undefined
          }
          onClick={onToggle}
          className="h-auto min-h-8 w-full justify-start gap-2 py-1 text-start font-bold whitespace-normal"
        >
          <span id={nameId} lang={name.lang} className="min-w-0 wrap-anywhere">
            {name.text}
          </span>
          {unpublished && (
            // As an entry's dot (`dotClasses`), the button being the group in focus.
            <UnpublishedDot className="bg-focus group-focus-visible/button:bg-focus-foreground" />
          )}
          {closed ? (
            <ChevronRightIcon aria-hidden="true" className="ms-auto" />
          ) : (
            <ChevronDownIcon aria-hidden="true" className="ms-auto" />
          )}
        </Button>
      ) : (
        named && (
          // The list's name: read with the list, not again before it.
          <p
            id={nameId}
            lang={name.lang}
            aria-hidden="true"
            className={cn(
              "px-2 text-body-xs font-bold wrap-anywhere",
              rail && "sr-only",
            )}
          >
            {name.text}
          </p>
        )
      )}
      {!closed && (
        <ul
          id={listId}
          aria-labelledby={named ? nameId : undefined}
          className="flex flex-col gap-1"
        >
          {group.roadmaps.map((roadmap) => {
            const { text: title, lang } = content(roadmap.title)
            return (
              <NavigationLink
                key={roadmap.id}
                to="/roadmaps/$roadmapId"
                params={{ roadmapId: roadmap.id }}
                rail={rail}
                name={title}
                nameLang={lang}
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
      )}
    </div>
  )
}

interface CloseAllFamiliesProps {
  /** Every family is closed: the button opens them. */
  allClosed: boolean
  onPress: () => void
}

/** "Close all", at the end of its own row above the families, "Open all" once all are closed (S3). */
function CloseAllFamilies({ allClosed, onPress }: CloseAllFamiliesProps) {
  const { t } = useTranslation()
  const Icon = allClosed ? ChevronsUpDownIcon : ChevronsDownUpIcon
  return (
    <div className="-mb-2 flex justify-end">
      <Button
        variant="navigation"
        size="sm"
        aria-label={t(
          allClosed
            ? "roadmaps.navigation.families.openAllName"
            : "roadmaps.navigation.families.closeAllName",
        )}
        onClick={onPress}
      >
        <Icon aria-hidden="true" />
        {t(
          allClosed
            ? "roadmaps.navigation.families.openAll"
            : "roadmaps.navigation.families.closeAll",
        )}
      </Button>
    </div>
  )
}

interface UnpublishedTotalProps {
  /** How many roadmaps have unpublished changes. */
  count: number
  /** The one roadmap with changes it leads to, if it is not the page open. */
  leadsTo: string | undefined
  rail: boolean
  /** Opens a rail, remembered as open, as its circle is pressed (S7). */
  onOpenNavigation: () => void
}

/**
 * How many roadmaps have unpublished changes, none shown while there are none (S3). With
 * two or more it is a button that shows only them, pressed while it does (STY-063 S1, S2),
 * and in a rail pressing it opens the navigation (S7), the circle carrying no pressed
 * state. With one it leads to that roadmap, and the dots mark each (STY-055 S2); on its
 * own page, or while the roadmaps are unread, it says so as text. What a screen reader is
 * told of the number is the shell's (`UnpublishedAnnouncement`), which this drawer may
 * not be in.
 */
function UnpublishedTotal({
  count,
  leadsTo,
  rail,
  onOpenNavigation,
}: UnpublishedTotalProps) {
  const { t } = useTranslation()
  const search = useNavigationSearch()
  if (count === 0) return null
  // Two or more roadmaps with changes, once the roadmaps are read, are to narrow to.
  const narrows = search.groups !== null && count >= 2
  const entry = {
    rail,
    name: t("layout.navigation.unpublished", { count }),
    mark: { count, narrows },
  }
  const press = () => {
    if (rail) {
      // The circle always opens the navigation narrowed, with focus on the count (S7).
      search.requestFocus("count")
      search.showChanged()
      onOpenNavigation()
    } else if (search.onlyChanged) {
      search.showEveryRoadmap()
    } else {
      search.showChanged()
    }
  }
  return (
    <ul className="mt-1 flex flex-col gap-1">
      {narrows ? (
        <NavigationButton
          {...entry}
          ref={(element) => {
            if (element && search.takeFocusRequest("count")) element.focus()
          }}
          pressed={rail ? undefined : search.onlyChanged}
          onPress={press}
        />
      ) : leadsTo === undefined ? (
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
