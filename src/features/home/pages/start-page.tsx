import { useTranslation } from "react-i18next"

import { InsetText } from "@/components/layout/inset-text"
import { AuthButton } from "@/features/auth/components/auth-button"

const TITLE_ID = "start-title"

/**
 * The signed-out start page, a plain DHCW start page: what the app is, where its data
 * comes from, Connect, and what Connect needs. Why the last attempt failed is the shell's
 * page notice, above the heading (`AuthNotice`).
 */
export function StartPage() {
  const { t } = useTranslation()

  return (
    <section aria-labelledby={TITLE_ID}>
      <h1 id={TITLE_ID} className="text-heading-xl text-pretty">
        {t("common.appName")}
      </h1>
      <p className="mt-4 max-w-2xl text-heading-s font-normal text-pretty">
        {t("landing.tagline")}
      </p>

      <InsetText className="mt-6">{t("landing.source")}</InsetText>

      <AuthButton className="mt-6 w-full sm:w-auto" />
      <p className="mt-4 max-w-2xl text-body-xs text-pretty text-muted-foreground">
        {t("landing.accessNote")}
      </p>
    </section>
  )
}
