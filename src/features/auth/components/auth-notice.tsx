import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  Alert,
  AlertAction,
  AlertContent,
  AlertDescription,
  AlertTitle,
  type AlertVariant,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { useAuthNotice, type AuthNotice as Notice } from "../use-auth-notice"

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
 * connection status, so those are notes.
 */
function announces(notice: Notice): boolean {
  return notice.kind !== "confirmed" && notice.code !== "popup-closed"
}

/**
 * The outcome of connecting, disconnecting or staying connected, at the top of the page in
 * view, whichever page started it (no toasts: DHCW has none, and they vanish). It stays
 * until the next attempt, the session's end or a dismissal; a confirmation also clears on
 * the next page.
 */
export function AuthNotice() {
  const { t } = useTranslation()
  const { notice, version, dismiss } = useAuthNotice()
  if (!notice) return null

  const { variant, Icon } = looks[notice.kind]
  const text =
    notice.kind === "confirmed"
      ? t(`auth.notifications.${notice.code}`)
      : t(`auth.errors.${notice.code}`)

  return (
    <Alert
      // A new state is a new notice: remounting announces a repeated failure again.
      key={version}
      role={announces(notice) ? "alert" : "note"}
      variant={variant}
      className="mb-6 max-w-2xl"
    >
      <Icon aria-hidden="true" />
      <AlertContent>
        {notice.kind === "renewal-failed" && (
          <AlertTitle>{t("auth.renewal.failed")}</AlertTitle>
        )}
        <AlertDescription>
          {notice.kind === "renewal-failed" ? (
            <>
              <p>{text}</p>
              <p>{t("auth.renewal.reconnectLater")}</p>
            </>
          ) : (
            text
          )}
        </AlertDescription>
      </AlertContent>
      <AlertAction className="-my-1.5 -mr-2 self-start max-sm:w-auto max-sm:pl-0">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("auth.notice.dismiss")}
          onClick={dismiss}
        >
          <XIcon aria-hidden="true" />
        </Button>
      </AlertAction>
    </Alert>
  )
}
