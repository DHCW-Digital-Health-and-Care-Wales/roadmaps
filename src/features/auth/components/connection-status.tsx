import { useTranslation } from "react-i18next"

import { Badge, type TagVariant } from "@/components/ui/badge"
import type { AuthState } from "@/domain/auth/auth-client"

import { useAuth } from "../use-auth"

/** Each connection state's DHCW tag: the one place a state picks its colour. */
const tagVariants = {
  initializing: "neutral",
  ready: "neutral",
  connecting: "warning",
  connected: "success",
  expired: "warning",
  error: "danger",
} satisfies Record<AuthState["status"], TagVariant>

/**
 * A live tag naming the connection state. It never names the user: a token proves
 * access, not identity (ADR-003). Below `sm` it is visually hidden, but still announced:
 * the narrow header has no room for it, and the auth action on screen (Disconnect, or the
 * page's Connect or Reconnect) shows the state.
 */
export function ConnectionStatus() {
  const { t } = useTranslation()
  const { status } = useAuth().state

  return (
    <Badge
      variant={tagVariants[status]}
      role="status"
      className="max-sm:sr-only"
    >
      {t(`auth.status.${status}`)}
    </Badge>
  )
}
