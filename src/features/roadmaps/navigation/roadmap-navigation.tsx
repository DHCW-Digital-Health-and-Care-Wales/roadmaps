import { Link } from "@tanstack/react-router"
import { GlobeIcon, LayoutGridIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useId, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { NavigationForm } from "@/components/layout/app-shell"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { localise } from "@/domain/roadmap/localised-text"
import { useLanguage } from "@/i18n"
import { cn } from "@/lib/utils"

import { RoadmapSwatch } from "../components/roadmap-swatch"
import { groupRoadmaps, type RoadmapGroup } from "../group-roadmaps"
import { useRoadmaps } from "../hooks/use-roadmaps"
import { roadmapInitials } from "./roadmap-initials"

export interface RoadmapNavigationProps {
  form: NavigationForm
}

/**
 * The shell's destinations (STY-054): all the roadmaps, each roadmap grouped by family
 * as the list groups them (D3), with its colour, and the families, categories and
 * organisations. The current page is marked, to sight and to a screen reader (S3).
 * Until the roadmaps are read (not connected, loading, or a list that failed), it offers
 * the two pages alone, which say why there is nothing to show (S4). Folded to a rail, each
 * shows as an icon or a roadmap's initials, named for assistive technology and in a
 * tooltip.
 */
export function RoadmapNavigation({ form }: RoadmapNavigationProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const { data: roadmaps } = useRoadmaps()
  const groups = useMemo(
    () => (roadmaps ? groupRoadmaps(roadmaps, language) : []),
    [roadmaps, language],
  )
  const rail = form === "rail"
  // One list with no family name when no roadmap has a family, as the list shows it.
  const [only] = groups
  const named = !(groups.length === 1 && only?.family === null)

  const destinations = (
    <>
      <ul className="flex flex-col gap-1">
        <NavigationItem rail={rail} name={t("roadmaps.navigation.all")}>
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className={linkClasses(rail)}
          >
            <LinkLabel
              rail={rail}
              icon={<LayoutGridIcon aria-hidden="true" />}
              name={t("roadmaps.navigation.all")}
            />
          </Link>
        </NavigationItem>
      </ul>
      {groups.map((group) => (
        <RoadmapGroupLinks
          key={group.key}
          group={group}
          named={named}
          rail={rail}
        />
      ))}
      <ul className="flex flex-col gap-1 border-t border-sidebar-border pt-3">
        <NavigationItem rail={rail} name={t("roadmaps.familiesLink")}>
          <Link to="/families" className={linkClasses(rail)}>
            <LinkLabel
              rail={rail}
              icon={<GlobeIcon aria-hidden="true" />}
              name={t("roadmaps.familiesLink")}
            />
          </Link>
        </NavigationItem>
      </ul>
    </>
  )
  // In a rail, moving between tooltips shows the next at once.
  return rail ? <TooltipProvider>{destinations}</TooltipProvider> : destinations
}

interface RoadmapGroupLinksProps {
  group: RoadmapGroup
  /** The family's name heads the list: shown in full, read in a rail. */
  named: boolean
  rail: boolean
}

/** One family's roadmaps, under its name. */
function RoadmapGroupLinks({ group, named, rail }: RoadmapGroupLinksProps) {
  const { t } = useTranslation()
  const language = useLanguage()
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
          {group.family
            ? localise(group.family, language)
            : t("roadmaps.noFamily")}
        </p>
      )}
      <ul
        aria-labelledby={named ? nameId : undefined}
        className="flex flex-col gap-1"
      >
        {group.roadmaps.map((roadmap) => {
          const title = localise(roadmap.title, language)
          return (
            <NavigationItem key={roadmap.id} rail={rail} name={title}>
              <Link
                to="/roadmaps/$roadmapId"
                params={{ roadmapId: roadmap.id }}
                className={linkClasses(rail)}
              >
                <RoadmapSwatch colour={roadmap.colour} />
                <LinkLabel
                  rail={rail}
                  initials={roadmapInitials(title)}
                  name={title}
                />
              </Link>
            </NavigationItem>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * A link of the navigation, on navy: white, DHCW's active blue on hover, yellow when
 * focused, and bold for the current page, whose entry (`ITEM_CLASSES`) is the active blue.
 */
function linkClasses(rail: boolean): string {
  return cn(
    "flex min-h-10 items-center gap-2 rounded-lg py-2 outline-none hover:bg-sidebar-accent focus-visible:focus-fill aria-[current=page]:font-bold",
    rail ? "justify-center px-1" : "px-2",
  )
}

interface LinkLabelProps {
  rail: boolean
  name: string
  /** Shown beside the name, and alone in a rail. */
  icon?: ReactNode
  /** A roadmap's initials, shown in a rail in place of its name. */
  initials?: string
}

/** What a link shows: its name, or in a rail its icon or initials, named for a screen reader. */
function LinkLabel({ rail, name, icon, initials }: LinkLabelProps) {
  if (!rail) {
    return (
      <>
        {icon}
        <span className="min-w-0 wrap-break-word">{name}</span>
      </>
    )
  }
  return (
    <>
      {icon ?? (
        <span aria-hidden="true" className="text-body-xs font-bold">
          {initials}
        </span>
      )}
      <span className="sr-only">{name}</span>
    </>
  )
}

interface NavigationItemProps {
  rail: boolean
  /** The link's name, shown in a tooltip in a rail. */
  name: string
  children: ReactElement
}

/**
 * An entry holding the current page is DHCW's active blue. The entry carries it, not the
 * link: on the link it would sort after the focus fill and hide it.
 */
const ITEM_CLASSES = "rounded-lg has-[[aria-current=page]]:bg-sidebar-accent"

/** An entry of a list, its link carrying a tooltip of its name in a rail. */
function NavigationItem({ rail, name, children: link }: NavigationItemProps) {
  if (!rail) return <li className={ITEM_CLASSES}>{link}</li>
  return (
    <li className={ITEM_CLASSES}>
      <Tooltip>
        <TooltipTrigger render={link} />
        <TooltipContent side="right">{name}</TooltipContent>
      </Tooltip>
    </li>
  )
}
