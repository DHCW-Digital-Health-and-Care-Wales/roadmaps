import { LoaderCircleIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import { useConnectAction } from "../use-connect-action"

export interface ConnectButtonProps {
  className?: string
}

/**
 * The page's Connect, or Reconnect after expiry, for a view that needs a session. It
 * waits (busy, still focusable) while sign-in loads or its popup is open.
 */
export function ConnectButton({ className }: ConnectButtonProps) {
  const { t } = useTranslation()
  const { labelKey, busy, connect } = useConnectAction()

  return (
    <Button
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
      {t(labelKey)}
    </Button>
  )
}
