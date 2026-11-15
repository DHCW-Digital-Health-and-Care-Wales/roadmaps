import { useTranslation } from "react-i18next"

import { localise } from "@/domain/roadmap/localised-text"
import type { RoadmapChanges } from "@/domain/roadmap/roadmap-changes"
import { useLanguage } from "@/i18n"

import { changedParts } from "./pending-changes"

export interface WhatChangesProps {
  /** The roadmap's pending changes, which a dialog asks before writing. */
  changes: RoadmapChanges
}

/** The line of a part that is edited: its name, then the names of its changed fields. */
function edited(key: string, name: string, fields: readonly string[]) {
  return { key, name, change: fields.join(", ") }
}

/**
 * "What changes", in a dialog that asks before a roadmap's pending changes are written:
 * each changed part by name with its changed fields, then each new item by its title,
 * marked as new (STY-025 S9, STY-047 S1), in the page's order. One list, whatever is
 * pending: the roadmap's own text, the items it holds, then the new ones.
 */
export function WhatChanges({ changes }: WhatChangesProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const listed = [
    ...changedParts(changes).map((part) =>
      part.kind === "roadmap"
        ? edited(
            "roadmap",
            t("roadmaps.about.title"),
            part.fields.map((field) =>
              t(`roadmaps.edit.roadmapFields.${field}`),
            ),
          )
        : edited(
            `item-${String(part.position)}`,
            localise(part.item.title, language),
            part.fields.map((field) => t(`roadmaps.edit.itemFields.${field}`)),
          ),
    ),
    // A new item is English alone, and no field of it is a change of its own.
    ...changes.newItems.map(({ id, values }) => ({
      key: `new-${id}`,
      name: values.title,
      change: t("roadmaps.publish.dialog.newItem"),
    })),
  ]

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-bold">{t("roadmaps.publish.dialog.changes")}</h3>
      <ul className="flex list-disc flex-col gap-1.5 pl-5">
        {listed.map(({ key, name, change }) => (
          <li key={key} className="wrap-break-word">
            <span className="font-bold">{name}</span>
            <span className="block text-body-xs text-muted-foreground">
              {change}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
