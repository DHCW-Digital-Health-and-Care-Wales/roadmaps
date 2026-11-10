import { LoaderCircleIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import { useAuth } from "../use-auth"

export interface AuthButtonProps {
  className?: string
  /** Pass `header` on the navy header band; elsewhere the button picks its own look. */
  variant?: "header"
}

/**
 * The one auth action for the current state: Connect, Reconnect after expiry, or
 * Disconnect. It waits (busy, still focusable) while sign-in loads or its popup is open.
 */
export function AuthButton({ className, variant }: AuthButtonProps) {
  const { t } = useTranslation()
  const { state, connect, disconnect } = useAuth()

  if (state.status === "connected") {
    return (
      <Button
        variant={variant ?? "secondary"}
        className={className}
        onClick={disconnect}
      >
        {t("auth.disconnect")}
      </Button>
    )
  }

  const busy = state.status === "initializing" || state.status === "connecting"
  return (
    <Button
      variant={variant ?? "default"}
      className={className}
      disabled={busy}
      focusableWhenDisabled
      aria-busy={busy}
      // Synchronous inside the click, or the browser blocks the sign-in popup (ADR-003).
      onClick={connect}
    >
      {busy && (
        <LoaderCircleIcon
          data-icon="inline-start"
          aria-hidden="true"
          className="animate-spin"
        />
      )}
      {t(state.status === "expired" ? "auth.reconnect" : "auth.connect")}
    </Button>
  )
}
