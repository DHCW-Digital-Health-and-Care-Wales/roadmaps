import { createContext } from "react"

import type { AuthClient } from "@/domain/auth/auth-client"

/** Provided by `AuthProvider`; read it through `useAuth()`. */
export const AuthContext = createContext<AuthClient | null>(null)
