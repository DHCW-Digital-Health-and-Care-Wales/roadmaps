import {
  CircleAlertIcon,
  InfoIcon,
  LockKeyholeIcon,
  SheetIcon,
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
    case "expired":
      if (state.lastError) {
        return {
          tone: "info",
          text: t(`auth.errors.${state.lastError}`),
        } as const
      }
      return state.status === "expired"
        ? ({ tone: "info", text: t("errors.unauthenticated") } as const)
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
      {/* A faint grid fading out from a soft accent glow; purely decorative. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_45%_at_50%_0%,color-mix(in_oklch,var(--brand)_16%,transparent),transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] mask-[radial-gradient(60%_55%_at_50%_0%,black,transparent)] bg-size-[56px_56px] opacity-70"
      />

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pt-14 pb-16 text-center sm:px-6 sm:pt-24 sm:pb-24">
        <p className="inline-flex max-w-full items-center gap-2 rounded-2xl border bg-background/70 px-3 py-1.5 text-left text-xs text-muted-foreground shadow-xs backdrop-blur-sm sm:rounded-full sm:py-1 sm:text-sm">
          <SheetIcon
            aria-hidden="true"
            className="size-3.5 shrink-0 text-brand"
          />
          <span className="text-pretty">{t("landing.source")}</span>
        </p>

        <h1
          id={TITLE_ID}
          className="mt-6 text-4xl font-semibold tracking-tighter text-balance sm:text-6xl"
        >
          {t("common.appName")}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-pretty text-muted-foreground sm:text-xl">
          {t("landing.tagline")}
        </p>

        <div className="mt-9 flex w-full flex-col items-center gap-4">
          <AuthButton className="h-11 w-full gap-2 rounded-xl px-6 text-[0.9375rem] shadow-sm sm:w-auto" />
          <p className="max-w-md text-sm text-pretty text-muted-foreground">
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
                ? "mt-8 flex max-w-md items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-left text-sm text-destructive"
                : "mt-8 flex max-w-md items-start gap-2 rounded-xl border bg-muted/50 px-4 py-3 text-left text-sm text-muted-foreground"
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
