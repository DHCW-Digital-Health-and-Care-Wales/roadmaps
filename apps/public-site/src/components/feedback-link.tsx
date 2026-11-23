import { useStrings } from "../i18n"
import { FEEDBACK_URL } from "../lib/links"

/** "Give feedback" in body text, opening the feedback issue form. */
export function FeedbackLink() {
  const strings = useStrings()
  return (
    <a
      href={FEEDBACK_URL}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-action underline underline-offset-4 hover:no-underline"
    >
      {strings.site.giveFeedback}
    </a>
  )
}
