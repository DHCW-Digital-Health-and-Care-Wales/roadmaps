import { useAuth } from "./use-auth"

/**
 * What a control that connects Google says and whether it can be pressed, for the
 * session as it is: Reconnect after expiry, otherwise Connect, and busy while sign-in
 * loads or its popup is open. The control calls `connect` synchronously inside its click,
 * or the browser blocks the popup (ADR-003).
 */
export function useConnectAction() {
  const { state, connect } = useAuth()
  return {
    labelKey: state.status === "expired" ? "auth.reconnect" : "auth.connect",
    busy: state.status === "initializing" || state.status === "connecting",
    connect,
  } as const
}
