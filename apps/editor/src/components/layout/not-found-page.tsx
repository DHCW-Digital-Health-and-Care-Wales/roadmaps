import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { textLinkClasses } from "./text-link-classes"

/** Rendered by the root route for any unknown path: what happened, and a link home. */
export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <section>
      <h1 className="text-heading-xl">{t("notFound.title")}</h1>
      <p className="mt-4 max-w-2xl text-pretty">{t("notFound.description")}</p>
      <p className="mt-4">
        <Link to="/" className={textLinkClasses}>
          {t("notFound.home")}
        </Link>
      </p>
    </section>
  )
}
