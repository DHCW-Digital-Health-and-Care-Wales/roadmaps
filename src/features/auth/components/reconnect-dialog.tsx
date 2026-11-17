import { TriangleAlertIcon } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { useReturnFocus } from "@/components/layout/use-return-focus"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { AuthErrorCode, AuthState } from "@/domain/auth/auth-client"

import {
  type ReconnectRequest,
  ReconnectRequestContext,
} from "../session-action"
import { useAuth } from "../use-auth"
import { ReconnectButton } from "./reconnect-button"

export interface ReconnectDialogProviderProps {
  children: ReactNode
}

/**
 * The one dialog that asks to reconnect before an action that needs a session
 * (`useSessionAction`, STY-057): Reconnect, then the action carries on; Cancel, and
 * nothing happens. Either way focus goes back to the control that was pressed. Nothing
 * pending is touched.
 */
export function ReconnectDialogProvider({
  children,
}: ReconnectDialogProviderProps) {
  const connected = useAuth().state.status === "connected"
  const [request, setRequest] = useState<ReconnectRequest | null>(null)
  // The request just reconnected for: it carries on once its dialog has gone, and focus
  // with it has gone back to the control, so whatever it opens takes focus from there.
  const [reconnected, setReconnected] = useState<ReconnectRequest | null>(null)
  if (request && connected) {
    setRequest(null)
    setReconnected(request)
  }
  useEffect(() => {
    reconnected?.carryOn()
  }, [reconnected])

  return (
    <ReconnectRequestContext value={setRequest}>
      {children}
      <AlertDialog
        open={request !== null}
        onOpenChange={(next) => {
          if (!next) setRequest(null)
        }}
      >
        {request && <ReconnectDialogContent from={request.from} />}
      </AlertDialog>
    </ReconnectRequestContext>
  )
}

/**
 * Why the latest attempt to connect didn't succeed, if it didn't. An abandoned attempt
 * returns to `expired`, or to `ready` when it followed a refusal.
 */
function connectFailure(state: AuthState): AuthErrorCode | undefined {
  switch (state.status) {
    case "error":
      return state.error
    case "expired":
    case "ready":
      return state.lastError
    default:
      return undefined
  }
}

interface ReconnectDialogContentProps {
  from: HTMLElement | null
}

/**
 * Says the session has expired and the changes are kept, then why a Reconnect from here
 * didn't succeed, if it didn't (S4). Mounted afresh for each request.
 */
function ReconnectDialogContent({ from }: ReconnectDialogContentProps) {
  const { t } = useTranslation()
  const { state } = useAuth()
  const reconnect = useRef<HTMLButtonElement>(null)
  // A failure from before the dialog opened is not this dialog's to say.
  const [tried, setTried] = useState(false)
  const failure = tried ? connectFailure(state) : undefined
  useReturnFocus(from)

  return (
    <AlertDialogContent initialFocus={reconnect} finalFocus={false}>
      <AlertDialogHeader>
        <AlertDialogTitle>{t("auth.reconnectDialog.title")}</AlertDialogTitle>
        <AlertDialogDescription>
          {t("auth.reconnectDialog.description")}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {failure && (
        <Alert variant="warning">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertContent>
            <AlertTitle>{t("auth.reconnectDialog.failed")}</AlertTitle>
            <AlertDescription>{t(`auth.errors.${failure}`)}</AlertDescription>
          </AlertContent>
        </Alert>
      )}
      <AlertDialogFooter>
        <ReconnectButton
          ref={reconnect}
          onReconnect={() => {
            setTried(true)
          }}
        />
        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}
