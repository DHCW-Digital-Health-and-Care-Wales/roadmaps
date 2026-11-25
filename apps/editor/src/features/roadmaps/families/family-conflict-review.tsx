import { TriangleAlertIcon } from "lucide-react"
import type { ReactNode, RefObject } from "react"
import { useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import { Button } from "@/components/ui/button"
import type { FamilyConflict } from "@/domain/roadmap/family-changes"

import { WrittenText } from "../components/content-text"

export interface FamilyConflictReviewProps {
  ref: RefObject<HTMLDivElement | null>
  conflicts: readonly FamilyConflict[]
  onKeepMine: (conflict: FamilyConflict) => void
  onUseTheirs: (conflict: FamilyConflict) => void
}

/**
 * A change someone else's stopped (S5): each field they changed beside the Product
 * Lead's, to keep or give up one by one, as a roadmap's conflicts are shown (STY-026).
 * Nothing was written.
 */
export function FamilyConflictReview({
  ref,
  conflicts,
  onKeepMine,
  onUseTheirs,
}: FamilyConflictReviewProps) {
  const { t } = useTranslation()
  return (
    <DismissibleNotice
      ref={ref}
      tabIndex={-1}
      role="alert"
      variant="warning"
      Icon={TriangleAlertIcon}
      title={t("roadmaps.families.refused.title")}
      className="max-w-2xl outline-none focus-visible:focus-ring"
    >
      <p>{t("roadmaps.families.refused.description")}</p>
      <ul className="mb-4 flex flex-col gap-4">
        {conflicts.map((conflict) => {
          const field = t(`roadmaps.families.form.${conflict.field}`)
          // The name being changed is the English one; a colour is in no language.
          const shown = (value: string) =>
            conflict.field === "name" ? (
              <WrittenText written="en" text={value} />
            ) : (
              value
            )
          return (
            <li
              key={conflict.field}
              className="flex flex-col gap-3 border-t border-border pt-4"
            >
              <p className="font-bold">{field}</p>
              <dl className="grid gap-3 sm:grid-cols-2">
                <ConflictValue
                  label={t("roadmaps.families.refused.yours")}
                  value={shown(conflict.pending)}
                />
                <ConflictValue
                  label={t("roadmaps.families.refused.theirs")}
                  value={shown(conflict.current)}
                />
              </dl>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="sm"
                  onClick={() => {
                    onKeepMine(conflict)
                  }}
                >
                  {t("roadmaps.families.refused.keepMine")}{" "}
                  <span className="sr-only">{field}</span>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    onUseTheirs(conflict)
                  }}
                >
                  {t("roadmaps.families.refused.useTheirs")}{" "}
                  <span className="sr-only">{field}</span>
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </DismissibleNotice>
  )
}

function ConflictValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border border-border bg-card p-3">
      <dt className="font-bold">{label}</dt>
      <dd className="wrap-break-word">{value}</dd>
    </div>
  )
}
