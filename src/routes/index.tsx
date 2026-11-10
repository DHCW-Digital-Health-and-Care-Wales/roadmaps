import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/")({
  component: HomePage,
})

// Placeholder until the app shell (S05), which moves the switcher into the header.
function HomePage() {
  const { t } = useTranslation()
  return (
    <>
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("common.appName")}
        </h1>
        <p className="max-w-prose text-muted-foreground">
          {t("landing.tagline")}
        </p>
        <Button disabled>{t("auth.connect")}</Button>
      </main>
    </>
  )
}
