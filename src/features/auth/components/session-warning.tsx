import { XIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { formatDuration } from "@/i18n"

import { useAuth } from "../use-auth"
import { useSessionWarning } from "../use-session-warning"

/**
 * The moment the countdown is announced: each whole minute, then at 30 seconds. Between
 * them it stays the same, so the live region is not re-read every second.
 */
function announcedAt(secondsLeft: number): number {
  if (secondsLeft <= 30) return 30
  return Math.ceil(secondsLeft / 60) * 60
}

/**
 * DHCW's timeout warning, two minutes before the session ends: a countdown, "Stay
 * connected" (a renewal, inside the click, so Google's popup is allowed) and
 * "Disconnect". Escape or Close leave the session to run out. Focus returns to where it
 * was when the warning closes.
 */
export function SessionWarning() {
  const { open, secondsLeft, close } = useSessionWarning()
  const { connect, disconnect } = useAuth()

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      {open && (
        <SessionWarningContent
          secondsLeft={secondsLeft}
          onStay={() => {
            // Synchronous inside the click, or the browser blocks the popup (ADR-003).
            connect()
            close()
          }}
          onDisconnect={() => {
            disconnect()
            close()
          }}
        />
      )}
    </AlertDialog>
  )
}

interface SessionWarningContentProps {
  secondsLeft: number
  onStay: () => void
  onDisconnect: () => void
}

/** Mounted afresh each time the warning opens, so each opening announces anew. */
function SessionWarningContent({
  secondsLeft,
  onStay,
  onDisconnect,
}: SessionWarningContentProps) {
  const { t } = useTranslation()
  const stay = useRef<HTMLButtonElement>(null)
  useReturnFocus()
  // Opening reads the title and description, the time included, so nothing is announced
  // until the next moment. Then the time left as that moment was reached, which a
  // throttled background tab may reach late.
  const moment = announcedAt(secondsLeft)
  const [announced, setAnnounced] = useState<{
    readonly moment: number
    readonly secondsLeft: number | null
  }>({ moment, secondsLeft: null })
  if (announced.moment !== moment) {
    setAnnounced({ moment, secondsLeft })
  }

  return (
    <AlertDialogContent initialFocus={stay} finalFocus={false}>
      <AlertDialogHeader className="pr-8">
        <AlertDialogTitle>{t("auth.sessionWarning.title")}</AlertDialogTitle>
        <AlertDialogDescription>
          {t("auth.sessionWarning.endsIn", {
            remaining: formatDuration(secondsLeft, t),
          })}{" "}
          {t("auth.sessionWarning.afterwards")}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <p role="status" className="sr-only">
        {announced.secondsLeft !== null &&
          t("auth.sessionWarning.endsIn", {
            remaining: formatDuration(announced.secondsLeft, t),
          })}
      </p>
      <AlertDialogFooter>
        <Button ref={stay} onClick={onStay}>
          {t("auth.sessionWarning.stayConnected")}
        </Button>
        <Button variant="secondary" onClick={onDisconnect}>
          {t("auth.disconnect")}
        </Button>
      </AlertDialogFooter>
      <AlertDialogCancel
        variant="ghost"
        size="icon-sm"
        className="absolute top-4 right-4"
        aria-label={t("common.close")}
      >
        <XIcon aria-hidden="true" />
      </AlertDialogCancel>
    </AlertDialogContent>
  )
}

/**
 * Gives focus back to exactly the element that had it when the warning opened (often
 * `<main>`, which `AppShell` focuses). Base UI's own return focus moves on to the first
 * tabbable element inside it instead, which would land on a page's first control.
 */
function useReturnFocus() {
  // Read while rendering the opening warning, before Base UI moves focus into it.
  const [previous] = useState(() =>
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  )
  useEffect(
    () => () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    },
    [previous],
  )
}
