import {
  CircleAlertIcon,
  InfoIcon,
  LockKeyholeIcon,
  TableIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { ContextChip } from "@/components/layout/context-chip"
import { Alert, AlertContent, AlertDescription } from "@/components/ui/alert"
import type { AuthState } from "@/domain/auth/auth-client"
import { AuthButton } from "@/features/auth/components/auth-button"
import { useAuth } from "@/features/auth/use-auth"

const TITLE_ID = "welcome-title"

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

/** The signed-out home page: what the app is, where data comes from, and Connect. */
export function WelcomeHero() {
  const { t } = useTranslation()
  const { state } = useAuth()
  const notice = useNotice(state)

  return (
    <section
      aria-labelledby={TITLE_ID}
      className="relative isolate flex-1 overflow-hidden"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pt-14 pb-16 text-center sm:px-6 sm:pt-24 sm:pb-24">
        <ContextChip icon={<TableIcon />}>{t("landing.source")}</ContextChip>

        <h1 id={TITLE_ID} className="mt-6 text-heading-xl text-balance">
          {t("common.appName")}
        </h1>
        <p className="mt-4 max-w-xl text-heading-m font-normal text-pretty text-muted-foreground">
          {t("landing.tagline")}
        </p>

        <div className="mt-9 flex w-full flex-col items-center gap-4">
          <AuthButton className="w-full sm:w-auto" />
          <p className="max-w-md text-body-xs text-pretty text-muted-foreground">
            <LockKeyholeIcon
              aria-hidden="true"
              className="mr-1.5 inline size-3.5 -translate-y-px align-middle"
            />
            {t("landing.accessNote")}
          </p>
        </div>

        {notice && (
          // A note, not an alert: the connection status has already announced it.
          <Alert
            role="note"
            variant={notice.tone === "error" ? "destructive" : "info"}
            className="mt-8 max-w-md"
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
      </div>
    </section>
  )
}
