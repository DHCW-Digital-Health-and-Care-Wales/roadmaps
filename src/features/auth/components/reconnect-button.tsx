import { LoaderCircleIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import { useAuth } from "../use-auth"

export interface ReconnectButtonProps {
  className?: string
}

/**
 * Reconnect, offered where an expired session blocks content. It stays labelled
 * "Reconnect" (busy, still focusable) while the popup is open.
 */
export function ReconnectButton({ className }: ReconnectButtonProps) {
  const { t } = useTranslation()
  const { state, connect } = useAuth()
  const busy = state.status === "connecting"

  return (
    <Button
      size="sm"
      className={className}
      disabled={busy}
      focusableWhenDisabled
      aria-busy={busy}
      // Synchronous inside the click, or the browser blocks the sign-in popup (ADR-0003).
      onClick={connect}
    >
      {busy && (
        <LoaderCircleIcon
          data-icon="inline-start"
          aria-hidden="true"
          className="animate-spin"
        />
      )}
      {t("auth.reconnect")}
    </Button>
  )
}
