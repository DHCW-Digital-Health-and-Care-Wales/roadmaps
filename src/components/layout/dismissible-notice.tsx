import { XIcon, type LucideIcon } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
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

export interface DismissibleNoticeProps extends Omit<
  ComponentProps<"div">,
  "title"
> {
  variant: AlertVariant
  Icon: LucideIcon
  title?: ReactNode
  /** The notice's text. */
  children: ReactNode
  onDismiss: () => void
}

/**
 * A page notice (the copywriter's pattern): a callout with its icon, an optional title,
 * its text and a button that dismisses it. Its `role` defaults to the alert's; a caller
 * passes anything else, such as a dwell's handlers, through.
 */
export function DismissibleNotice({
  variant,
  Icon,
  title,
  children,
  onDismiss,
  ...props
}: DismissibleNoticeProps) {
  const { t } = useTranslation()
  return (
    <Alert variant={variant} {...props}>
      <Icon aria-hidden="true" />
      <AlertContent>
        {title && <AlertTitle>{title}</AlertTitle>}
        <AlertDescription>{children}</AlertDescription>
      </AlertContent>
      <AlertAction className="-my-1.5 -mr-2 self-start max-sm:w-auto max-sm:pl-0">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("common.dismiss")}
          onClick={onDismiss}
        >
          <XIcon aria-hidden="true" />
        </Button>
      </AlertAction>
    </Alert>
  )
}
