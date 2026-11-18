import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import type { AlertVariant } from "@/components/ui/alert"

import { useAuthNotice, type AuthNotice as Notice } from "../use-auth-notice"
import { useNoticeDwell } from "../use-notice-dwell"

/** Each notice's callout: the one place a notice picks its look. */
const looks = {
  failed: { variant: "destructive", Icon: CircleAlertIcon },
  cancelled: { variant: "info", Icon: InfoIcon },
  "renewal-failed": { variant: "warning", Icon: TriangleAlertIcon },
  confirmed: { variant: "success", Icon: CircleCheckIcon },
} satisfies Record<
  Notice["kind"],
  { readonly variant: AlertVariant; readonly Icon: LucideIcon }
>

/**
 * Interrupts (`alert`) only with news the user didn't cause and nothing else announces: a
 * failure. A closed popup was the user's own doing, and a confirmation is announced by the
 * connection status (visible to no one), so those are notes.
 */
function announces(notice: Notice): boolean {
  return notice.kind !== "confirmed" && notice.code !== "popup-closed"
}

/**
 * The outcome of connecting, disconnecting or staying connected, at the top of the page in
 * view, whichever page started it (no toasts: DHCW has none). A failure stays until the
 * next attempt, the session's end or a dismissal. A confirmation, of a disconnect only
 * (a connect shows itself, STY-056 D3), clears itself after a short dwell, paused while it
 * is hovered or holds focus, and on the next page.
 */
export function AuthNotice() {
  const { notice, version, dismiss } = useAuthNotice()
  if (!notice) return null
  // A new state is a new notice: remounting announces a repeated failure again, and gives
  // a confirmation a dwell of its own.
  return <NoticeCallout key={version} notice={notice} onDismiss={dismiss} />
}

interface NoticeCalloutProps {
  notice: Notice
  onDismiss: () => void
}

function NoticeCallout({ notice, onDismiss }: NoticeCalloutProps) {
  const { t } = useTranslation()
  const dwell = useNoticeDwell(notice.kind === "confirmed", onDismiss)

  const { variant, Icon } = looks[notice.kind]
  const text =
    notice.kind === "confirmed"
      ? t(`auth.notifications.${notice.code}`)
      : t(`auth.errors.${notice.code}`)

  return (
    <DismissibleNotice
      role={announces(notice) ? "alert" : "note"}
      variant={variant}
      Icon={Icon}
      title={
        notice.kind === "renewal-failed" ? t("auth.renewal.failed") : undefined
      }
      onDismiss={onDismiss}
      className="mb-6 max-w-2xl"
      {...dwell}
    >
      {notice.kind === "renewal-failed" ? (
        <>
          <p>{text}</p>
          <p>{t("auth.renewal.reconnectLater")}</p>
        </>
      ) : (
        text
      )}
    </DismissibleNotice>
  )
}
