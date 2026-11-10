import { useTranslation } from "react-i18next"

import { useAppInfo } from "./app-info"
import { PageContainer } from "./page-container"

/** DHCW's footer: who the service belongs to, and which version of the app this is. */
export function AppFooter() {
  const { t } = useTranslation()
  const { version } = useAppInfo()

  return (
    <footer className="mt-8 border-t">
      <PageContainer className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-6 text-body-xs text-muted-foreground">
        <p>{t("layout.footer.copyright")}</p>
        <p>{t("layout.footer.version", { version })}</p>
      </PageContainer>
    </footer>
  )
}
