import { PencilLineIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { InsetText } from "@/components/layout/inset-text"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { AuthButton } from "@/features/auth/components/auth-button"
import { usePendingChanges } from "@/features/roadmaps/editing/pending-changes-context"

const TITLE_ID = "start-title"

/**
 * The signed-out start page, a plain DHCW start page: what the app is, where its data
 * comes from, Connect, and what Connect needs. Why the last attempt failed is the shell's
 * page notice, above the heading (`AuthNotice`). Changes kept at Disconnect are said to
 * be waiting (STY-025 S14).
 */
export function StartPage() {
  const { t } = useTranslation()
  const waiting = usePendingChanges().changes.size

  return (
    <section aria-labelledby={TITLE_ID}>
      <h1 id={TITLE_ID} className="text-heading-xl text-pretty">
        {t("common.appName")}
      </h1>
      <p className="mt-4 max-w-2xl text-heading-s font-normal text-pretty">
        {t("landing.tagline")}
      </p>

      {waiting > 0 && (
        <Alert role="note" variant="info" className="mt-6 max-w-2xl">
          <PencilLineIcon aria-hidden="true" />
          <AlertContent>
            <AlertTitle>
              {t("roadmaps.waiting.title", { count: waiting })}
            </AlertTitle>
            <AlertDescription>
              {t("roadmaps.waiting.description")}
            </AlertDescription>
          </AlertContent>
        </Alert>
      )}

      <InsetText className="mt-6">{t("landing.source")}</InsetText>

      <AuthButton className="mt-6 w-full sm:w-auto" />
      <p className="mt-4 max-w-2xl text-body-xs text-pretty text-muted-foreground">
        {t("landing.accessNote")}
      </p>
    </section>
  )
}
