import {
  FileQuestionIcon,
  FileWarningIcon,
  FileXIcon,
  HourglassIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  RotateCwIcon,
  TriangleAlertIcon,
  WifiOffIcon,
  type LucideIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  Alert,
  AlertAction,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ReconnectButton } from "@/features/auth/components/reconnect-button"
import type { AppError, AppErrorKind } from "@/lib/errors"

const icons = {
  forbidden: LockKeyholeIcon,
  protected: LockKeyholeIcon,
  "not-found": FileQuestionIcon,
  "rate-limited": HourglassIcon,
  network: WifiOffIcon,
  "invalid-response": FileXIcon,
  "invalid-data": FileWarningIcon,
  unknown: TriangleAlertIcon,
} satisfies Record<Exclude<AppErrorKind, "unauthenticated">, LucideIcon>

export interface RoadmapsErrorStateProps {
  error: AppError
  /**
   * `panel` replaces the content (nothing loaded yet); `alert` sits above roadmaps
   * loaded earlier, which may now be out of date.
   */
  variant: "panel" | "alert"
  /** Refetches; offered only for retryable errors. */
  onRetry: () => void
  /** A refetch is in flight. */
  retrying: boolean
  /** The panel title's heading level (a `panel`'s title is a heading; an `alert`'s is not). */
  titleAs?: "h1" | "h2" | undefined
  /**
   * What couldn't be read: the roadmap list (the default), one roadmap's items, or the
   * roadmaps with the family and category lists.
   */
  subject?: "roadmaps" | "items" | "families"
}

const titleKeys = {
  roadmaps: {
    panel: "roadmaps.loadFailed",
    alert: "roadmaps.refreshFailed",
  },
  items: {
    panel: "roadmaps.items.loadFailed",
    alert: "roadmaps.items.refreshFailed",
  },
  families: {
    panel: "roadmaps.families.loadFailed",
    alert: "roadmaps.families.refreshFailed",
  },
} as const

/**
 * Why roadmaps, or a roadmap's items, couldn't be loaded, in words chosen by the error's
 * kind alone (ADR-008), with the one action that can help: Reconnect after the session
 * expired, Retry when trying again may work, otherwise none. A failure with nothing
 * loaded is a `destructive` notice; an expired session, or any problem above roadmaps
 * loaded earlier (which may be out of date), is a `warning`.
 */
export function RoadmapsErrorState({
  error,
  variant,
  onRetry,
  retrying,
  titleAs,
  subject = "roadmaps",
}: RoadmapsErrorStateProps) {
  const { t } = useTranslation()
  const titleElement = variant === "panel" ? (titleAs ?? "h2") : "div"
  if (error.kind === "unauthenticated") {
    return (
      <Alert variant="warning">
        <KeyRoundIcon aria-hidden="true" />
        <AlertContent>
          <AlertTitle as={titleElement}>
            {t("roadmaps.expired.title")}
          </AlertTitle>
          <AlertDescription>
            {t("roadmaps.expired.description")}
          </AlertDescription>
        </AlertContent>
        <AlertAction>
          <ReconnectButton size="sm" />
        </AlertAction>
      </Alert>
    )
  }

  // `errors.invalid-data` is about the roadmap list; a roadmap's items have their own.
  const description =
    subject === "items" && error.kind === "invalid-data"
      ? t("roadmaps.items.invalidData")
      : t(`errors.${error.kind}`)

  const Icon = icons[error.kind]
  return (
    <Alert variant={variant === "alert" ? "warning" : "destructive"}>
      <Icon aria-hidden="true" />
      <AlertContent>
        <AlertTitle as={titleElement}>
          {t(titleKeys[subject][variant])}
        </AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </AlertContent>
      {error.retryable && (
        <AlertAction>
          <Button
            variant="secondary"
            size="sm"
            disabled={retrying}
            focusableWhenDisabled
            aria-busy={retrying}
            onClick={onRetry}
          >
            {retrying ? (
              <LoaderCircleIcon
                data-icon="inline-start"
                aria-hidden="true"
                className="animate-spin"
              />
            ) : (
              <RotateCwIcon data-icon="inline-start" aria-hidden="true" />
            )}
            {t("common.retry")}
          </Button>
        </AlertAction>
      )}
    </Alert>
  )
}
