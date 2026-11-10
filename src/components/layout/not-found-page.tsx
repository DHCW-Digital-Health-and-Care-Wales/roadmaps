import { Link } from "@tanstack/react-router"
import { CompassIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Rendered by the root route for any unknown path. */
export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl border bg-muted/50 text-muted-foreground">
        <CompassIcon aria-hidden="true" className="size-5" />
      </span>
      <h1 className="mt-6 text-heading-xl">{t("notFound.title")}</h1>
      <p className="mt-2 text-pretty text-muted-foreground">
        {t("notFound.description")}
      </p>
      <Link
        to="/"
        className={cn(
          buttonVariants({ variant: "outline", className: "mt-8" }),
        )}
      >
        {t("notFound.home")}
      </Link>
    </section>
  )
}
