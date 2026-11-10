import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import type { AuthState } from "@/domain/auth/auth-client"
import { cn } from "@/lib/utils"

import { useAuth } from "../use-auth"

const dotColour = {
  initializing: "bg-muted-foreground/40",
  ready: "bg-muted-foreground/40",
  connecting: "bg-amber-500 animate-pulse",
  connected: "bg-emerald-500",
  expired: "bg-amber-500",
  error: "bg-destructive",
} satisfies Record<AuthState["status"], string>

/**
 * A live badge naming the connection state. It never names the user: a token proves
 * access, not identity (ADR-003). Below `sm` it is visually hidden, but still announced:
 * the narrow header has no room for it, and the auth action on screen (Disconnect, or the
 * page's Connect or Reconnect) shows the state.
 */
export function ConnectionStatus() {
  const { t } = useTranslation()
  const { status } = useAuth().state

  return (
    <Badge
      variant="outline"
      role="status"
      className="h-7 gap-2 px-2.5 font-normal text-muted-foreground max-sm:sr-only"
    >
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full", dotColour[status])}
      />
      {t(`auth.status.${status}`)}
    </Badge>
  )
}
