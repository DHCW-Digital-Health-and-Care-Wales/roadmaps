import { createContext, use } from "react"

/** The question Disconnect asks while changes are pending, and what answers it. */
export interface DisconnectQuestionState {
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

/** The question's state, for `DisconnectQuestion`. */
export function useDisconnectQuestion(): DisconnectQuestionState {
  const question = use(DisconnectQuestionContext)
  if (!question) {
    throw new Error(
      "useDisconnectQuestion must be used within a PendingChangesProvider",
    )
  }
  return question
}
