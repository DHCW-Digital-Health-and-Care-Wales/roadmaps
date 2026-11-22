import { LoaderCircleIcon } from "lucide-react"
import type { ComponentProps, Ref } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import { useAuth } from "../use-auth"

export interface ReconnectButtonProps {
  ref?: Ref<HTMLButtonElement>
  size?: ComponentProps<typeof Button>["size"]
  /** Called after reconnecting has started, inside the same click. */
  onReconnect?: () => void
}

/**
 * Reconnect, offered where an expired session blocks content or an action. It stays
 * labelled "Reconnect" (busy, still focusable) while the popup is open.
 */
export function ReconnectButton({
  ref,
  size,
  onReconnect,
}: ReconnectButtonProps) {
  const { t } = useTranslation()
  const { state, connect } = useAuth()
  const busy = state.status === "connecting"

  return (
    <Button
      ref={ref}
      size={size}
      disabled={busy}
      focusableWhenDisabled
      aria-busy={busy}
      onClick={() => {
        // Synchronous inside the click, or the browser blocks the sign-in popup (ADR-003).
        connect()
        onReconnect?.()
      }}
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
