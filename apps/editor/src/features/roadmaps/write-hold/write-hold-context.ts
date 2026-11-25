import { createContext, use } from "react"

import type { WriteHoldRequest, WriteHoldStore } from "./write-hold-store"

/** Provided by `WriteHoldProvider`; read it through the hooks below. */
export const WriteHoldContext = createContext<WriteHoldStore | null>(null)

function useWriteHoldStore(): WriteHoldStore {
  const store = use(WriteHoldContext)
  if (!store) {
    throw new Error("useWriteHold must be used within a WriteHoldProvider")
  }
  return store
}

/**
 * Holds the whole app after a write it couldn't read back, until a Refresh reads it
 * (DEF-015); what it returns settles once the hold ends.
 */
export function useWriteHold(): (request: WriteHoldRequest) => Promise<void> {
  return useWriteHoldStore().hold
}
