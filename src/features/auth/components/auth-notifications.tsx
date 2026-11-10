import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import type { AuthState } from "@/domain/auth/auth-client"

import { useAuth } from "../use-auth"

/** One id, so a new auth toast replaces the previous one instead of stacking up. */
const TOAST_ID = "auth"

/** Disconnecting from these states lands on `ready` without a `lastError`. */
function wasSession(state: AuthState): boolean {
  return ["connecting", "connected", "expired"].includes(state.status)
}

/**
 * Toasts the outcome of the user's own actions: connected, disconnected, or a failed
 * attempt. Expiry and a closed popup stay quiet; the header and page already show them.
 */
export function AuthNotifications() {
  const { t } = useTranslation()
  const { state } = useAuth()
  const previous = useRef<AuthState>(state)

  useEffect(() => {
    const before = previous.current
    previous.current = state
    if (before === state) return

    switch (state.status) {
      case "connected":
        toast.success(t("auth.notifications.connected"), { id: TOAST_ID })
        break
      case "error":
        if (before.status === "connecting") {
          toast.error(t(`auth.errors.${state.error}`), { id: TOAST_ID })
        }
        break
      case "ready":
      case "expired":
        if (state.lastError === "popup-blocked") {
          toast.error(t("auth.errors.popup-blocked"), { id: TOAST_ID })
        } else if (
          state.status === "ready" &&
          !state.lastError &&
          wasSession(before)
        ) {
          toast(t("auth.notifications.disconnected"), { id: TOAST_ID })
        }
        break
      default:
        break
    }
  }, [state, t])

  return null
}
