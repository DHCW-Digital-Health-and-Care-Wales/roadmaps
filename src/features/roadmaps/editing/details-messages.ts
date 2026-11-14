import type { TFunction } from "i18next"

import { detailText } from "@/domain/roadmap/item-details"

import type { EditorLine, Refusal } from "./details-outline"

/**
 * What the editor says of a change; all but a refusal, a removal and pasted lines held
 * to three levels reach assistive technology only.
 */
export type DetailsMessage =
  | { readonly kind: "refused"; readonly why: Refusal }
  | {
      readonly kind: "movedIn" | "movedOut" | "new"
      /** The detail it is now nested under; `null` at the top level. */
      readonly parent: string | null
    }
  | { readonly kind: "movedUp" | "movedDown" | "joined" | "removedEmpty" }
  | {
      readonly kind: "added"
      readonly count: number
      /** A pasted line asked for more than three levels, so shows at the third. */
      readonly limited: boolean
    }
  | {
      readonly kind: "removed"
      readonly detail: string
      /** How many details were nested under it, and moved up a level (D15). */
      readonly nested: number
      /** The list as it was, which Undo puts back (S25). */
      readonly before: readonly EditorLine[]
      readonly id: number
    }
  | { readonly kind: "putBack"; readonly detail: string }

/** A detail by its text, for a name or a message: one with no text is "the empty detail". */
export function detailName(text: string, t: TFunction): string {
  return detailText(text) || t("roadmaps.edit.details.emptySubject")
}

/** What the status line says for `message`. */
export function detailsMessageText(
  message: DetailsMessage,
  t: TFunction,
): string {
  switch (message.kind) {
    case "refused":
      return t(`roadmaps.edit.details.refused.${message.why}`)
    case "movedIn":
      return t("roadmaps.edit.details.said.movedIn", {
        parent: detailName(message.parent ?? "", t),
      })
    case "movedOut":
      return message.parent === null
        ? t("roadmaps.edit.details.said.movedOutTop")
        : t("roadmaps.edit.details.said.movedOutUnder", {
            parent: detailName(message.parent, t),
          })
    case "new":
      return message.parent === null
        ? t("roadmaps.edit.details.said.newTop")
        : t("roadmaps.edit.details.said.newUnder", {
            parent: detailName(message.parent, t),
          })
    case "added":
      return [
        t("roadmaps.edit.details.said.added", { count: message.count }),
        ...(message.limited
          ? [t("roadmaps.edit.details.refused.deepest")]
          : []),
      ].join(" ")
    case "removed":
      return [
        t("roadmaps.edit.details.said.removed", { detail: message.detail }),
        ...(message.nested > 0
          ? [
              t("roadmaps.edit.details.said.nestedMoved", {
                count: message.nested,
              }),
            ]
          : []),
      ].join(" ")
    case "putBack":
      return t("roadmaps.edit.details.said.putBack", {
        detail: message.detail,
      })
    default:
      return t(`roadmaps.edit.details.said.${message.kind}`)
  }
}
