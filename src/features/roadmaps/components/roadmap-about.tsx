import { ChevronRightIcon } from "lucide-react"
import { type ReactNode, useId, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { localise, type LocalisedText } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { useLanguage } from "@/i18n"
import { cn } from "@/lib/utils"

import { ChangedTag } from "../editing/edit-controls"
import { RoadmapSwatch } from "./roadmap-swatch"

type AboutField = "vision" | "serviceDescription" | "family" | "category"

export interface RoadmapAboutProps {
  roadmap: Roadmap
  /** It has a pending change, which it tags "Changed" while closed (STY-053 S6). */
  changed?: boolean
  /** Controls beside the disclosure, such as Edit, as they suit it closed or open. */
  actions?: (open: boolean) => ReactNode
}

/**
 * What the roadmap is about (STY-024), as a disclosure under its facts, with its
 * controls beside it (STY-059 S4): a heading holding a text button with a chevron,
 * closed until pressed, a Changed tag beside it while closed and a change is pending.
 * Open, it shows in place each of the vision, service description, family, with its
 * colour (STY-028 S1), and category, under its label, only when it has one; text keeps
 * its line breaks. A roadmap with none says so, so editing has a place to start.
 */
export function RoadmapAbout({
  roadmap,
  changed = false,
  actions,
}: RoadmapAboutProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const headingId = useId()
  const [open, setOpen] = useState(false)

  const localised = (text: LocalisedText | null) =>
    text && localise(text, language)
  const fields = [
    { key: "vision", value: localised(roadmap.vision) },
    { key: "serviceDescription", value: localised(roadmap.serviceDescription) },
    { key: "family", value: localised(roadmap.family) },
    { key: "category", value: localised(roadmap.category) },
  ].filter((field): field is { key: AboutField; value: string } =>
    Boolean(field.value),
  )

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      render={
        <section aria-labelledby={headingId} className="flex flex-col gap-3" />
      }
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id={headingId} className="text-body">
          <CollapsibleTrigger
            render={
              <button
                type="button"
                className="group/about flex min-h-11 items-center gap-1.5 pr-2 text-left text-link outline-none hover:text-link-hover focus-visible:focus-link"
              />
            }
          >
            <ChevronRightIcon
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 transition-transform",
                open && "rotate-90",
              )}
            />
            <span className="underline-offset-4 group-hover/about:underline">
              {t("roadmaps.about.title")}
            </span>
          </CollapsibleTrigger>
        </h2>
        {!open && changed && <ChangedTag />}
        {actions?.(open)}
      </div>
      <CollapsibleContent className="flex max-w-prose flex-col gap-3 border-l-4 border-border py-1 pl-4">
        {fields.length === 0 ? (
          <p className="text-muted-foreground">{t("roadmaps.about.empty")}</p>
        ) : (
          <dl className="flex flex-col gap-3">
            {fields.map(({ key, value }) => (
              <div key={key} className="flex flex-col gap-0.5">
                <dt className="font-bold">
                  {t(`roadmaps.about.fields.${key}`)}
                </dt>
                <dd className="flex items-stretch gap-2.5">
                  {/* The family's colour, as it will be published (STY-028 S1). */}
                  {key === "family" && (
                    <RoadmapSwatch colour={roadmap.colour} />
                  )}
                  <span className="min-w-0 wrap-break-word whitespace-pre-line">
                    {value}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
