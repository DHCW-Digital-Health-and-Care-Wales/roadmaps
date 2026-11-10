import { CircleAlertIcon, InfoIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { InsetText } from "@/components/layout/inset-text"
import { Alert, AlertContent, AlertDescription } from "@/components/ui/alert"
import type { AuthState } from "@/domain/auth/auth-client"
import { AuthButton } from "@/features/auth/components/auth-button"
import { useAuth } from "@/features/auth/use-auth"

const TITLE_ID = "start-title"

/** Why the user isn't connected, when there is something to say. */
function useNotice(state: AuthState) {
  const { t } = useTranslation()
  switch (state.status) {
    case "error":
      return { tone: "error", text: t(`auth.errors.${state.error}`) } as const
    case "ready":
      return state.lastError
        ? ({ tone: "info", text: t(`auth.errors.${state.lastError}`) } as const)
        : null
    default:
      return null
  }
}

/**
 * The signed-out start page, a plain DHCW start page: any notice first, above the heading,
 * then what the app is, where its data comes from, Connect, and what Connect needs.
 */
export function StartPage() {
  const { t } = useTranslation()
  const { state } = useAuth()
  const notice = useNotice(state)

  return (
    <section aria-labelledby={TITLE_ID}>
      {notice && (
        // A note, not an alert: the connection status has already announced it.
        <Alert
          role="note"
          variant={notice.tone === "error" ? "destructive" : "info"}
          className="mb-6 max-w-2xl"
        >
          {notice.tone === "error" ? (
            <CircleAlertIcon aria-hidden="true" />
          ) : (
            <InfoIcon aria-hidden="true" />
          )}
          <AlertContent>
            <AlertDescription>{notice.text}</AlertDescription>
          </AlertContent>
        </Alert>
      )}

      <h1 id={TITLE_ID} className="text-heading-xl text-pretty">
        {t("common.appName")}
      </h1>
      <p className="mt-4 max-w-2xl text-heading-s font-normal text-pretty">
        {t("landing.tagline")}
      </p>

      <InsetText className="mt-6">{t("landing.source")}</InsetText>

      <AuthButton className="mt-6 w-full sm:w-auto" />
      <p className="mt-4 max-w-2xl text-body-xs text-pretty text-muted-foreground">
        {t("landing.accessNote")}
      </p>
    </section>
  )
}
