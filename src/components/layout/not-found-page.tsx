import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

/** Rendered by the root route for any unknown path: what happened, and a link home. */
export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <section>
      <h1 className="text-heading-xl">{t("notFound.title")}</h1>
      <p className="mt-4 max-w-2xl text-pretty">{t("notFound.description")}</p>
      <p className="mt-4">
        <Link
          to="/"
          className="text-link underline outline-none hover:text-link-hover hover:no-underline focus-visible:focus-link"
        >
          {t("notFound.home")}
        </Link>
      </p>
    </section>
  )
}
