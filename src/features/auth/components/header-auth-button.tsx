import { cn } from "@/lib/utils"

import { useAuth } from "../use-auth"
import { AuthButton } from "./auth-button"

/**
 * The header's auth action. Below `sm` it shows only Disconnect: the header has no room
 * for Connect beside the name, and every signed-out page offers its own Connect or
 * Reconnect (the not-found page links home instead).
 */
export function HeaderAuthButton() {
  const connected = useAuth().state.status === "connected"
  return <AuthButton className={cn("sm:ml-1", !connected && "max-sm:hidden")} />
}
