import { KeyRoundIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import {
  Alert,
  AlertAction,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { ReconnectButton } from "@/features/auth/components/reconnect-button"

export interface SessionExpiredAlertProps {
  /** The title's element: a heading when the alert is a page's only content. */
  titleAs?: "div" | "h1" | "h2"
  /** What reconnecting is for, here. */
  children: ReactNode
}

/**
 * Says the session has expired and offers Reconnect, wherever that blocks what the
 * Product Lead is doing: routine, so a warning and never an error.
 */
export function SessionExpiredAlert({
  titleAs = "div",
  children,
}: SessionExpiredAlertProps) {
  const { t } = useTranslation()
  return (
    <Alert variant="warning">
      <KeyRoundIcon aria-hidden="true" />
      <AlertContent>
        <AlertTitle as={titleAs}>{t("roadmaps.expired.title")}</AlertTitle>
        <AlertDescription>{children}</AlertDescription>
      </AlertContent>
      <AlertAction>
        <ReconnectButton />
      </AlertAction>
    </Alert>
  )
}
