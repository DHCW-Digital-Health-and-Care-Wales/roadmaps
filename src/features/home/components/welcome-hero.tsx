import {
  CircleAlertIcon,
  InfoIcon,
  LockKeyholeIcon,
  TableIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

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
        <p className="inline-flex max-w-full items-center gap-2 rounded-2xl border bg-background px-3 py-1.5 text-left text-body-xs text-muted-foreground sm:rounded-full sm:py-1">
          <TableIcon
            aria-hidden="true"
            className="size-3.5 shrink-0 text-link"
          />
          <span className="text-pretty">{t("landing.source")}</span>
        </p>

        <h1 id={TITLE_ID} className="mt-6 text-heading-xl text-balance">
          {t("common.appName")}
        </h1>
        <p className="mt-4 max-w-xl text-heading-m font-normal text-pretty text-muted-foreground">
          {t("landing.tagline")}
        </p>

        <div className="mt-9 flex w-full flex-col items-center gap-4">
          <AuthButton className="h-11 w-full gap-2 rounded-xl px-6 text-body sm:w-auto" />
          <p className="max-w-md text-body-xs text-pretty text-muted-foreground">
            <LockKeyholeIcon
              aria-hidden="true"
              className="mr-1.5 inline size-3.5 -translate-y-px align-middle"
            />
            {t("landing.accessNote")}
          </p>
        </div>

        {notice && (
          <p
            className={
              notice.tone === "error"
                ? "mt-8 flex max-w-md items-start gap-2 rounded-xl border border-status-danger-border bg-status-danger-bg px-4 py-3 text-left text-body-xs text-status-danger-fg"
                : "mt-8 flex max-w-md items-start gap-2 rounded-xl border bg-muted px-4 py-3 text-left text-body-xs text-muted-foreground"
            }
          >
            {notice.tone === "error" ? (
              <CircleAlertIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
            ) : (
              <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            )}
            {notice.text}
          </p>
        )}
      </div>
    </section>
  )
}
