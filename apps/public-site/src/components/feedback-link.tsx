import { FEEDBACK_URL } from "../lib/links"
import { useTranslation } from "react-i18next"

/** "Give feedback" in body text, opening the feedback issue form. */
export function FeedbackLink() {
  const { t } = useTranslation()
  return (
    <a
      href={FEEDBACK_URL}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-action underline underline-offset-4 hover:no-underline"
    >
      {t("site.giveFeedback")}
    </a>
  )
}
