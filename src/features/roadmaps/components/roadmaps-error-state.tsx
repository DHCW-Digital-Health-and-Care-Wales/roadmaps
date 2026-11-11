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
  unauthenticated: KeyRoundIcon,
  forbidden: LockKeyholeIcon,
  "not-found": FileQuestionIcon,
  "rate-limited": HourglassIcon,
  network: WifiOffIcon,
  "invalid-response": FileXIcon,
  "invalid-data": FileWarningIcon,
  unknown: TriangleAlertIcon,
} satisfies Record<AppErrorKind, LucideIcon>

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
  /** What couldn't be read: the roadmap list (the default) or one roadmap's items. */
  subject?: "roadmaps" | "items"
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
} as const

/**
 * Why roadmaps, or a roadmap's items, couldn't be loaded, in words chosen by the error's kind alone (ADR-008),
 * with the one action that can help: Reconnect after the session expired, Retry when
 * trying again may work, otherwise none. A failure with nothing loaded is a `destructive`
 * notice; an expired session, or any problem above roadmaps loaded earlier (which may be
 * out of date), is a `warning`.
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
  const expired = error.kind === "unauthenticated"
  const title = expired
    ? t("roadmaps.expired.title")
    : t(titleKeys[subject][variant])
  // `errors.invalid-data` is about the roadmap list; a roadmap's items have their own.
  const description = expired
    ? t("roadmaps.expired.description")
    : subject === "items" && error.kind === "invalid-data"
      ? t("roadmaps.items.invalidData")
      : t(`errors.${error.kind}`)

  const action = expired ? (
    <ReconnectButton />
  ) : error.retryable ? (
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
  ) : null

  const Icon = icons[error.kind]
  return (
    <Alert variant={expired || variant === "alert" ? "warning" : "destructive"}>
      <Icon aria-hidden="true" />
      <AlertContent>
        <AlertTitle as={variant === "panel" ? (titleAs ?? "h2") : "div"}>
          {title}
        </AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </AlertContent>
      {action && <AlertAction>{action}</AlertAction>}
    </Alert>
  )
}
