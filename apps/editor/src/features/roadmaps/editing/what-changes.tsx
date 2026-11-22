import { Fragment, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { localise } from "@/domain/roadmap/localised-text"
import { hasOnlyTitle } from "@/domain/roadmap/new-item"
import type { RoadmapChanges } from "@/domain/roadmap/roadmap-changes"
import { ROADMAP_PLACEMENTS } from "@/domain/roadmap/roadmap-placement"
import { useLanguage } from "@/i18n"

import { FieldName } from "../components/field-name"
import { changedParts } from "./pending-changes"
import { hasPendingOrder } from "./pending-orders"

export interface WhatChangesProps {
  /** The roadmap's pending changes, which a dialog asks before writing. */
  changes: RoadmapChanges
}

/** One line of the list: a part's name, then what changed in it. */
interface ListedChange {
  key: string
  name: string
  change: ReactNode
}

/**
 * The line of a part that is edited: its name, then the names of its changed fields,
 * separated by commas, each a node so a field's icon can stand before its name
 * (STY-079 S7).
 */
function edited(
  key: string,
  name: string,
  fields: readonly { field: string; name: ReactNode }[],
): ListedChange {
  return {
    key,
    name,
    change: fields.map((each, index) => (
      <Fragment key={each.field}>
        {index > 0 && ", "}
        {each.name}
      </Fragment>
    )),
  }
}

/**
 * "What changes", in a dialog that asks before a roadmap's pending changes are written:
 * each changed part by name with its changed fields, each item removed marked as
 * removed (STY-049 S5), then each new item by its title, marked as new, and as having
 * only a title when it has no more (STY-025 S9, STY-047 S1, STY-082), in the page's
 * order. A placement whose order is pending is one line, by its heading: the new order
 * is not listed (STY-050 S6). One list, whatever is pending: the roadmap's own text, the
 * placements reordered, the items the roadmap holds, then the new ones.
 */
export function WhatChanges({ changes }: WhatChangesProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const parts = changedParts(changes)
  const listed: ListedChange[] = [
    ...parts.flatMap((part) =>
      part.kind === "roadmap"
        ? [
            edited(
              "roadmap",
              t("roadmaps.productDetails.title"),
              part.fields.map((field) => ({
                field,
                name: t(`roadmaps.edit.roadmapFields.${field}`),
              })),
            ),
          ]
        : [],
    ),
    ...ROADMAP_PLACEMENTS.filter((placement) =>
      hasPendingOrder(changes.orders, placement),
    ).map((placement) => ({
      key: `order-${placement}`,
      name: t(`roadmaps.items.placements.${placement}`),
      change: t("roadmaps.edit.order.changed"),
    })),
    ...parts.flatMap((part) => {
      switch (part.kind) {
        case "item":
          return [
            edited(
              `item-${String(part.position)}`,
              localise(part.item.title, language),
              part.fields.map((field) => ({
                field,
                name: (
                  <FieldName field={field}>
                    {t(`roadmaps.edit.itemFields.${field}`)}
                  </FieldName>
                ),
              })),
            ),
          ]
        // An item removed is one change, whatever is pending beneath it (STY-049 S5).
        case "removal":
          return [
            {
              key: `removal-${String(part.position)}`,
              name: localise(part.item.title, language),
              change: t("roadmaps.publish.dialog.removed"),
            },
          ]
        default:
          return []
      }
    }),
    // A new item is English alone, and no field of it is a change of its own.
    // One with only a title says so, whichever way it was added (STY-082).
    ...changes.newItems.map((newItem) => ({
      key: `new-${newItem.id}`,
      name: newItem.values.title,
      change: hasOnlyTitle(newItem)
        ? t("roadmaps.publish.dialog.newItemTitleOnly")
        : t("roadmaps.publish.dialog.newItem"),
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
