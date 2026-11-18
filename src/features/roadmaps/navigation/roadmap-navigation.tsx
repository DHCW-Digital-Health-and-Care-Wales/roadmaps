import { GlobeIcon, LayoutGridIcon } from "lucide-react"
import { useId, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { NavigationForm } from "@/components/layout/app-shell"
import { TooltipProvider } from "@/components/ui/tooltip"
import { localise } from "@/domain/roadmap/localised-text"
import { useLanguage } from "@/i18n"
import { cn } from "@/lib/utils"

import {
  groupRoadmaps,
  namesFamilies,
  type RoadmapGroup,
} from "../group-roadmaps"
import { useGroupName } from "../hooks/use-group-name"
import { useRoadmaps } from "../hooks/use-roadmaps"
import { NavigationLink } from "./navigation-link"
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
  const named = namesFamilies(groups)

  const destinations = (
    <>
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
      {groups.map((group) => (
        <RoadmapGroupLinks
          key={group.key}
          group={group}
          named={named}
          rail={rail}
        />
      ))}
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
}

/** One family's roadmaps, in a list named for the family. */
function RoadmapGroupLinks({ group, named, rail }: RoadmapGroupLinksProps) {
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
              }}
            />
          )
        })}
      </ul>
    </div>
  )
}
