import { XIcon } from "lucide-react"
import { useRef, useState } from "react"
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
  // Opening reads the title and description, the time included; announce later moments.
  const [openedAt] = useState(() => announcedAt(secondsLeft))
  const moment = announcedAt(secondsLeft)

  return (
    <AlertDialogContent initialFocus={stay}>
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
        {moment < openedAt &&
          t("auth.sessionWarning.endsIn", {
            remaining: formatDuration(moment, t),
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
