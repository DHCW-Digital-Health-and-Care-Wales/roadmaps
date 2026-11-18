import { createContext } from "react"

import type { Roadmap } from "@/domain/roadmap/roadmap"

/** What Disconnect asked about: the roadmaps with changes when it was asked. */
export interface DisconnectQuestionSubject {
  count: number
  /** Those of them the roadmap list holds, none while it is unread. */
  roadmaps: readonly Roadmap[]
}

/** The question Disconnect asks while changes are pending, and what answers it. */
export interface DisconnectQuestionState extends DisconnectQuestionSubject {
  open: boolean
  onKeep: () => void
  onDiscard: () => void
  onCancel: () => void
}

/**
 * Provided by `PendingChangesProvider`, which sits above the router: the question is put
 * by `DisconnectQuestion`, which the root route renders, so its links reach the router.
 */
export const DisconnectQuestionContext =
  createContext<DisconnectQuestionState | null>(null)
