import type { TFunction } from "i18next"

import type { AppErrorKind } from "@/lib/errors"

/** What a write changes, which names it in the messages that differ. */
export type WriteSubject = "lists" | "publish" | "families" | "add"

/** Why a write failed: one message per kind, shared by every surface that writes. */
export function writeFailureMessage(
  t: TFunction,
  subject: WriteSubject,
  kind: AppErrorKind,
): string {
  if (
    subject === "publish" &&
    (kind === "not-found" || kind === "invalid-data")
  ) {
    return t(`roadmaps.writeFailure.publish.${kind}`)
  }
  if (
    subject === "add" &&
    (kind === "unauthenticated" || kind === "invalid-data")
  ) {
    return t(`roadmaps.writeFailure.add.${kind}`)
  }
  return t(`roadmaps.writeFailure.${kind}`, {
    action: t(`roadmaps.writeFailure.action.${subject}`),
  })
}
