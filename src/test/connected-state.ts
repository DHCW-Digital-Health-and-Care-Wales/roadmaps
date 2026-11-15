import type { AuthState } from "@/domain/auth/auth-client"

/** The state of a connected session, for a test that renders a page as connected (test code only). */
export const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}
