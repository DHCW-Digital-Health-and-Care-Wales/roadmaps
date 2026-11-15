import { useQueryClient } from "@tanstack/react-query"

import { readBackAfterWrite } from "./read-back"
import { useWriteHold } from "./write-hold-context"
import type { WriteHoldRequest } from "./write-hold-store"

/**
 * What a write's answer said: it landed; it didn't (refused, failed, or there was
 * nothing to change); or it was lost, so it may or may not have landed.
 */
export type WriteAnswer = "landed" | "not-landed" | "lost"

/**
 * The answer of a write whose outcome is `status` (none once it failed), given the
 * status it has once it landed; a write whose answer was lost is `unconfirmed`.
 */
export function writeAnswer(
  status: string | undefined,
  landed: string,
): WriteAnswer {
  if (status === landed) return "landed"
  return status === "unconfirmed" ? "lost" : "not-landed"
}

/** The write a hold names, and what its Refresh reads. */
export type WriteToHold = Pick<WriteHoldRequest, "write" | "reads">

/**
 * Holds the app after a write (DEF-015): once its answer was lost, or once it landed and
 * what it can have changed wasn't read back (`readBack` false). Returns the hold, which
 * settles once a Refresh ends it, or `null` when none is needed.
 */
export function holdAfterWrite(
  hold: (request: WriteHoldRequest) => Promise<void>,
  write: WriteToHold,
  answer: WriteAnswer,
  readBack: boolean,
): Promise<void> | null {
  if (answer === "lost") return hold({ ...write, landed: false })
  if (answer === "landed" && !readBack) return hold({ ...write, landed: true })
  return null
}

/**
 * Reads again what a write can have changed once it has answered, whatever the answer,
 * then holds the app as `holdAfterWrite` says. A lost answer holds at once, unread, as
 * the hold's Refresh reads it.
 */
export function useReadBackOrHold(): (
  write: WriteToHold,
  answer: WriteAnswer,
) => Promise<void> {
  const queryClient = useQueryClient()
  const hold = useWriteHold()
  return async (write, answer) => {
    const readBack =
      answer !== "lost" && (await readBackAfterWrite(queryClient, write.reads))
    void holdAfterWrite(hold, write, answer, readBack)
  }
}
