import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

import { useAppInfo } from "./app-info"
import { PageContainer } from "./page-container"
import { textLinkClasses } from "./text-link-classes"

/**
 * DHCW's phase banner: a tag naming the service's phase and a sentence inviting
 * feedback. The link appears only when a feedback address is configured, and opens in a
 * new tab, since leaving the app would end the session held in memory.
 */
export function PhaseBanner() {
  const { t } = useTranslation()
  const { feedbackUrl } = useAppInfo()

  return (
    <div data-slot="phase-banner" className="border-b">
      <PageContainer className="flex items-center gap-x-3 py-2.5 text-body-xs">
        <Badge variant="info">{t("layout.phase.tag")}</Badge>
        <p className="min-w-0 text-pretty">
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
      </PageContainer>
    </div>
  )
}
