import type { ReactNode } from "react"

import type { AuthClient } from "@/domain/auth/auth-client"

import { AuthContext } from "./auth-context"

export interface AuthProviderProps {
  /** Created by the composition root; tests pass a fake. */
  client: AuthClient
  children: ReactNode
}

export function AuthProvider({ client, children }: AuthProviderProps) {
  return <AuthContext value={client}>{children}</AuthContext>
}
