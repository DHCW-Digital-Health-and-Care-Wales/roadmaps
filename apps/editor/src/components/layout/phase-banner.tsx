import { XIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { useAppInfo } from "./app-info"
import { PageContainer } from "./page-container"
import { textLinkClasses } from "./text-link-classes"

export interface PhaseBannerProps {
  /** The banner was dismissed, and its button has gone with it. */
  onDismiss: () => void
}

/**
 * DHCW's phase banner: a tag naming the service's phase and a sentence inviting
 * feedback, then a button that dismisses it (STY-065 S8). Dismissed, it stays away
 * while the app stays loaded, on every page: nothing is stored, so loading the app
 * again shows it. The link appears only when a feedback address is configured, and
 * opens in a new tab, since leaving the app would end the session held in memory.
 */
export function PhaseBanner({ onDismiss }: PhaseBannerProps) {
  const { t } = useTranslation()
  const { feedbackUrl } = useAppInfo()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null
  return (
    <div data-slot="phase-banner" className="border-b">
      <PageContainer className="flex items-center gap-x-3 py-1.5 text-body-xs">
        <Badge variant="info">{t("layout.phase.tag")}</Badge>
        <p className="min-w-0 flex-1 text-pretty">
          {t("layout.phase.text")}
          {feedbackUrl && (
            <>
              {" "}
              <a
                href={feedbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={textLinkClasses}
              >
                {t("layout.phase.feedback")}
                <span className="sr-only"> {t("layout.opensInNewTab")}</span>
              </a>
            </>
          )}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("common.dismiss")}
          // Its icon ends where the header's last control does.
          className="-mr-2 self-start"
          onClick={() => {
            setDismissed(true)
            onDismiss()
          }}
        >
          <XIcon aria-hidden="true" />
        </Button>
      </PageContainer>
    </div>
  )
}
