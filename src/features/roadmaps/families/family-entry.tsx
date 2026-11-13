import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { textLinkClasses } from "@/components/layout/text-link-classes"
import { Button } from "@/components/ui/button"
import type { Family } from "@/domain/roadmap/family"
import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { useLanguage } from "@/i18n"

import { NotPublishedBadge } from "../components/not-published-badge"
import { RoadmapSwatch } from "../components/roadmap-swatch"

export interface FamilyEntryProps {
  family: Family
  /** Its roadmaps, in list order. */
  roadmaps: readonly Roadmap[]
  /** The id of its Change button, so focus can return to it. */
  changeId: string
  /** While another family write is under way. */
  disabled: boolean
  onChange: () => void
}

/** A family as listed (S1): its colour, names and roadmaps, and Change. */
export function FamilyEntry({
  family,
  roadmaps,
  changeId,
  disabled,
  onChange,
}: FamilyEntryProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  return (
    <div className="flex items-stretch gap-3.5">
      <RoadmapSwatch colour={family.colour} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-heading-s wrap-break-word">{family.name.en}</h3>
            <p className="text-body-xs text-muted-foreground">
              {family.name.cy === ""
                ? t("roadmaps.families.noWelshName")
                : t("roadmaps.families.welshName", { name: family.name.cy })}
            </p>
            <p className="text-body-xs text-muted-foreground">
              {family.colour}
            </p>
          </div>
          <Button
            id={changeId}
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={onChange}
          >
            {t("roadmaps.families.change")}{" "}
            <span className="sr-only">{family.name.en}</span>
          </Button>
        </div>
        {roadmaps.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {roadmaps.map((roadmap) => (
              <li
                key={roadmap.id}
                className="flex flex-wrap items-center gap-2"
              >
                <Link
                  to="/roadmaps/$roadmapId"
                  params={{ roadmapId: roadmap.id }}
                  className={textLinkClasses}
                >
                  {localise(roadmap.title, language)}
                </Link>
                {!roadmap.published && <NotPublishedBadge />}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            {t("roadmaps.families.noRoadmaps")}
          </p>
        )}
      </div>
    </div>
  )
}
