import { type Mock, vi } from "vitest"

import type { AuthClient, AuthState } from "@/domain/auth/auth-client"
import { createExternalStore } from "@/lib/external-store"

export const FAKE_ACCESS_TOKEN = "fake-access-token"

const ONE_HOUR_MS = 60 * 60 * 1000

export interface FakeAuthClient extends AuthClient {
  /** Moves the fake to any state and notifies subscribers. */
  readonly setState: (state: AuthState) => void
  /** Moves to `connected` (an hour from now). */
  readonly connect: Mock<() => void>
  /** Moves to `ready`. */
  readonly disconnect: Mock<() => void>
  /** Moves `connected` to `expired`. */
  readonly reportUnauthenticated: Mock<() => void>
}

/**
 * A controllable `AuthClient` for component tests (test code only). Actions are spies
 * that apply the happy-path transition; `setState` reaches every other state.
 */
export function createFakeAuthClient(
  initialState: AuthState = { status: "ready" },
): FakeAuthClient {
  const store = createExternalStore(initialState)
  const isConnected = () => store.getSnapshot().status === "connected"

  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    setState: store.setSnapshot,
    // Mirrors the real client: no token once `expiresAt` has passed, even before the
    // snapshot moves to `expired`.
    getAccessToken: () => {
      const state = store.getSnapshot()
      return state.status === "connected" && Date.now() < state.expiresAt
        ? FAKE_ACCESS_TOKEN
        : null
    },
    connect: vi.fn(() => {
      store.setSnapshot({
        status: "connected",
        expiresAt: Date.now() + ONE_HOUR_MS,
      })
    }),
    disconnect: vi.fn(() => {
      store.setSnapshot({ status: "ready" })
    }),
    reportUnauthenticated: vi.fn(() => {
      if (isConnected()) store.setSnapshot({ status: "expired" })
    }),
  }
}
