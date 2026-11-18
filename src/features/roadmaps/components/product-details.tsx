import { ChevronDownIcon } from "lucide-react"
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
import { RoadmapFacts } from "./roadmap-facts"
import { RoadmapSwatch } from "./roadmap-swatch"

type ProductDetailsField =
  "vision" | "serviceDescription" | "family" | "category"

export interface ProductDetailsProps {
  /** The roadmap as shown, pending edits applied. */
  roadmap: Roadmap
  /** The details have a pending change, tagged "Changed" while they are closed. */
  changed?: boolean
  /** Controls at the foot of the open details, such as Edit. */
  actions?: ReactNode
}

/**
 * The one line under a roadmap's title (STY-065 S2, S3): a list named "Roadmap
 * details" of its facts, ending in "Product details", a disclosure closed until
 * pressed, since what it holds is about the product the roadmap is for (STY-024): a
 * heading holding a text button with a chevron, a Changed tag beside it while closed
 * and a change is pending. The line wraps between its items. Open, it shows under the
 * line each of the vision, service description, family, with its colour (STY-028 S1),
 * and category, under its label, only when it has one; text keeps its line breaks. A
 * roadmap with none says so, so editing has a place to start. `actions` end what it
 * shows.
 */
export function ProductDetails({
  roadmap,
  changed = false,
  actions,
}: ProductDetailsProps) {
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
  ].filter((field): field is { key: ProductDetailsField; value: string } =>
    Boolean(field.value),
  )

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      render={<section aria-labelledby={headingId} className="flex flex-col" />}
    >
      <ul
        aria-label={t("roadmaps.facts.name")}
        className="flex flex-wrap items-center gap-x-5 text-body-xs"
      >
        <RoadmapFacts roadmap={roadmap} />
        <li className="flex items-center gap-x-2">
          <h2 id={headingId} className="text-body-xs">
            <CollapsibleTrigger
              render={
                <button
                  type="button"
                  // A line of text 32px tall, pressed across 44px.
                  className="relative flex min-h-8 items-center gap-1 text-left text-link outline-none after:absolute after:inset-x-0 after:-inset-y-1.5 hover:text-link-hover focus-visible:focus-link"
                />
              }
            >
              <span className="underline underline-offset-4">
                {t("roadmaps.productDetails.title")}
              </span>
              <ChevronDownIcon
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0 transition-transform",
                  open && "rotate-180",
                )}
              />
            </CollapsibleTrigger>
          </h2>
          {!open && changed && <ChangedTag />}
        </li>
      </ul>
      <CollapsibleContent className="mt-2 mb-1 flex max-w-prose flex-col gap-4 border-l-4 border-border py-1 pl-4">
        {fields.length === 0 ? (
          <p className="text-muted-foreground">
            {t("roadmaps.productDetails.empty")}
          </p>
        ) : (
          <dl className="flex flex-col gap-3">
            {fields.map(({ key, value }) => (
              <div key={key} className="flex flex-col gap-0.5">
                <dt className="font-bold">
                  {t(`roadmaps.productDetails.fields.${key}`)}
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
        {actions}
      </CollapsibleContent>
    </Collapsible>
  )
}
