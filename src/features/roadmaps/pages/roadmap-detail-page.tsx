import { Link } from "@tanstack/react-router"
import { ArrowLeftIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { buttonVariants } from "@/components/ui/button"
import { AuthButton } from "@/features/auth/components/auth-button"
import { useAuth } from "@/features/auth/use-auth"

/** `/roadmaps/$roadmapId` placeholder. S06 loads the roadmap and handles unknown ids. */
export function RoadmapDetailPage() {
  const { t } = useTranslation()
  const { state } = useAuth()

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Link semantics with button styling (Base UI's `render` would add role=button). */}
      <Link
        to="/"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "-ml-2.5 text-muted-foreground",
        })}
      >
        <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
        {t("roadmaps.detail.back")}
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        {t("roadmaps.detail.title")}
      </h1>
      {state.status === "connected" ? (
        <p className="mt-2 text-muted-foreground">
          {t("roadmaps.detail.comingSoon")}
        </p>
      ) : (
        <div className="mt-2 flex flex-col items-start gap-4">
          <p className="text-muted-foreground">
            {t("roadmaps.detail.connectPrompt")}
          </p>
          <AuthButton />
        </div>
      )}
    </section>
  )
}
