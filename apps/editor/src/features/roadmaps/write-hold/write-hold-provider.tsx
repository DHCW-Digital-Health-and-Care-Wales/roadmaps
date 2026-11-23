import { useQueryClient } from "@tanstack/react-query"
import { LoaderCircleIcon, RotateCwIcon, TriangleAlertIcon } from "lucide-react"
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react"
import { useTranslation } from "react-i18next"

import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useReturnFocus } from "@/components/layout/use-return-focus"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/use-auth"
import { toAppError } from "@/lib/errors"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { readNow } from "./read-back"
import { WriteHoldContext } from "./write-hold-context"
import {
  createWriteHoldStore,
  type WriteHold,
  type WriteHoldStore,
} from "./write-hold-store"

export interface WriteHoldProviderProps {
  children: ReactNode
}

/**
 * Holds the whole app after a write it couldn't read back (DEF-015): one dialog, which
 * nothing but a Refresh that reads closes, over every page, so nothing is done on what
 * was shown before the write.
 */
export function WriteHoldProvider({ children }: WriteHoldProviderProps) {
  const [store] = useState(createWriteHoldStore)
  const held = useSyncExternalStore(store.subscribe, store.getSnapshot)
  return (
    <WriteHoldContext value={store}>
      {children}
      <AlertDialog
        open={held !== null}
        onOpenChange={() => {
          // Escape does nothing: only a Refresh that reads ends the hold.
        }}
      >
        {held && <WriteHoldContent held={held} store={store} />}
      </AlertDialog>
    </WriteHoldContext>
  )
}

interface WriteHoldContentProps {
  held: WriteHold
  store: WriteHoldStore
}

/**
 * What was written, and Refresh, which ends the hold once every read it makes succeeds;
 * one that fails says so and leaves it open. Not connected, it offers Reconnect instead,
 * then refreshes once connected. Mounted afresh for each hold.
 */
function WriteHoldContent({ held, store }: WriteHoldContentProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const repository = useRoadmapRepository()
  const { state, connect } = useAuth()
  const actionRef = useRef<HTMLButtonElement>(null)
  useReturnFocus()
  useKeepFocus(actionRef)

  const connected = state.status === "connected"
  const { request, refresh } = held
  const outcome = request.landed ? "landed" : "lost"
  const busy = connected
    ? refresh.status === "reading"
    : state.status === "connecting"

  const read = async () => {
    store.setRefresh({ status: "reading" })
    try {
      // A write held while this reads may have changed what it read: read again.
      for (;;) {
        const current = store.getSnapshot()
        if (!current) return
        if (!(await readNow(queryClient, repository, current.reads))) {
          store.setRefresh({ status: "idle" })
          return
        }
        if (store.release(current.writes)) return
      }
    } catch (error) {
      store.setRefresh({ status: "failed", error: toAppError(error).kind })
    }
  }
  const readOnConnect = useEffectEvent(() => {
    void read()
  })
  const wasConnectedRef = useRef(connected)
  useEffect(() => {
    if (connected && !wasConnectedRef.current) readOnConnect()
    wasConnectedRef.current = connected
  }, [connected])

  return (
    <AlertDialogContent initialFocus={actionRef} finalFocus={false}>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {t(`roadmaps.hold.title.${outcome}.${request.write}`)}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {t(`roadmaps.hold.description.${outcome}`)}
          {!connected && <> {t("roadmaps.hold.reconnect")}</>}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {connected && refresh.status === "failed" && (
        <Alert variant="warning">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertContent>
            <AlertTitle>{t("roadmaps.refreshFailed")}</AlertTitle>
            <AlertDescription>{t(`errors.${refresh.error}`)}</AlertDescription>
          </AlertContent>
        </Alert>
      )}
      <AlertDialogFooter>
        {/* One button, relabelled, so focus stays on it as the session ends or resumes. */}
        <Button
          ref={actionRef}
          disabled={busy}
          focusableWhenDisabled
          aria-busy={busy}
          onClick={
            connected
              ? () => {
                  void read()
                }
              : // Synchronous inside the click, or the browser blocks the popup (ADR-003).
                connect
          }
        >
          {busy ? (
            <LoaderCircleIcon
              data-icon="inline-start"
              aria-hidden="true"
              className="animate-spin"
            />
          ) : (
            connected && (
              <RotateCwIcon data-icon="inline-start" aria-hidden="true" />
            )
          )}
          {connected ? t("roadmaps.refresh") : t("auth.reconnect")}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}

/**
 * Brings focus back to `target` whenever the page behind moves it out of every dialog,
 * as a form the write closed does when it gives focus back to its opener. A dialog
 * opened over the hold, such as the session warning, keeps it.
 */
function useKeepFocus(target: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const keep = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return
      if (event.target.closest('[role="dialog"], [role="alertdialog"]')) return
      target.current?.focus({ preventScroll: true })
    }
    document.addEventListener("focusin", keep)
    return () => {
      document.removeEventListener("focusin", keep)
    }
  }, [target])
}
