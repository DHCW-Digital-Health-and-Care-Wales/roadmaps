import {
  FileQuestionIcon,
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

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ReconnectButton } from "@/features/auth/components/reconnect-button"
import type { AppError, AppErrorKind } from "@/lib/errors"

import { StatusPanel } from "./status-panel"

const icons = {
  unauthenticated: KeyRoundIcon,
  forbidden: LockKeyholeIcon,
  "not-found": FileQuestionIcon,
  "rate-limited": HourglassIcon,
  network: WifiOffIcon,
  "invalid-response": FileXIcon,
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
  /** The panel title's heading level. */
  titleAs?: "h1" | "h2" | undefined
}

/**
 * Why roadmaps couldn't be loaded, in words chosen by the error's kind alone (ADR-008),
 * with the one action that can help: Reconnect after the session expired, Retry when
 * trying again may work, otherwise none.
 */
export function RoadmapsErrorState({
  error,
  variant,
  onRetry,
  retrying,
  titleAs,
}: RoadmapsErrorStateProps) {
  const { t } = useTranslation()
  const expired = error.kind === "unauthenticated"
  const title = expired
    ? t("roadmaps.expired.title")
    : t(variant === "panel" ? "roadmaps.loadFailed" : "roadmaps.refreshFailed")
  const description = expired
    ? t("roadmaps.expired.description")
    : t(`errors.${error.kind}`)

  const action = expired ? (
    <ReconnectButton />
  ) : error.retryable ? (
    <Button
      variant="outline"
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
  if (variant === "panel") {
    return (
      <StatusPanel
        role="alert"
        icon={<Icon />}
        title={title}
        titleAs={titleAs}
        description={description}
        action={action}
      />
    )
  }

  return (
    <Alert className="flex items-start gap-3 px-4 py-3 max-sm:flex-wrap">
      {/* `!`: the alert otherwise forces its icons to the text colour. */}
      <Icon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-amber-600! dark:text-amber-400!"
      />
      <div className="min-w-0 flex-1">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </div>
      {action && (
        <div className="shrink-0 self-center max-sm:w-full max-sm:pl-7">
          {action}
        </div>
      )}
    </Alert>
  )
}
