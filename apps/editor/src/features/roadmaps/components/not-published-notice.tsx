import { EyeOffIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

export interface NotPublishedNoticeProps {
  /** "Publish roadmap", at the notice's end. */
  action: ReactNode
}

/**
 * Says a roadmap is not on the public site, on its page, with the action that puts it
 * there: one strip under the facts, the only thing in the header that asks for
 * attention, gone once the roadmap is published.
 */
export function NotPublishedNotice({ action }: NotPublishedNoticeProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-l-4 border-input bg-muted py-3 pr-3 pl-4">
      <p className="flex min-w-48 flex-1 items-start gap-2.5 text-body-xs">
        <EyeOffIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          <strong>{t("roadmaps.notPublished")}</strong>
          <br />
          {t("roadmaps.notPublishedNote")}
        </span>
      </p>
      {action}
    </div>
  )
}
