import { CircleUserRoundIcon, LoaderCircleIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ThemeMenuItem } from "@/components/theme/theme-menu-item"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMenuChoice } from "@/lib/use-menu-choice"

import { useRequestDisconnect } from "../disconnect-request"
import { useAuth } from "../use-auth"
import { useConnectAction } from "../use-connect-action"

/**
 * The header's menu of what a Product Lead seldom changes: the theme, and the session's
 * one action, Disconnect while connected, otherwise Connect (Reconnect after expiry). The
 * state itself is not shown: only a session that needs action asks for it (STY-056 D3).
 * It stays on screen as the session changes, so focus is never lost with its item.
 */
export function AccountMenu() {
  const { t } = useTranslation()
  const disconnect = useRequestDisconnect()
  // Disconnect may ask a question in a dialog: it waits for the menu to close, so the
  // dialog's focus is not handed back to the trigger from under it.
  const { choose, onOpenChangeComplete } = useMenuChoice<undefined>(disconnect)

  return (
    <DropdownMenu onOpenChangeComplete={onOpenChangeComplete}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="header"
            size="icon"
            // 32px below `sm`, as the header's other buttons, so the brand keeps its name.
            className="max-sm:size-8"
            aria-label={t("layout.account")}
          />
        }
      >
        <CircleUserRoundIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        <ThemeMenuItem />
        <DropdownMenuSeparator />
        <SessionMenuItem
          onDisconnect={() => {
            choose(undefined)
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface SessionMenuItemProps {
  onDisconnect: () => void
}

/** Disconnect, Reconnect after expiry or Connect: the one action the session needs. */
function SessionMenuItem({ onDisconnect }: SessionMenuItemProps) {
  const { t } = useTranslation()
  const connected = useAuth().state.status === "connected"
  const { labelKey, busy, connect } = useConnectAction()

  if (connected) {
    return (
      <DropdownMenuItem
        onClick={() => {
          onDisconnect()
        }}
      >
        {t("auth.disconnect")}
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenuItem
      disabled={busy}
      // Synchronous inside the click, or the browser blocks the sign-in popup (ADR-003).
      onClick={connect}
    >
      {busy && <LoaderCircleIcon aria-hidden="true" className="animate-spin" />}
      {t(labelKey)}
    </DropdownMenuItem>
  )
}
