import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import type { FamilyInput } from "@/domain/roadmap/family-changes"
import type { Family } from "@/domain/roadmap/family"
import { toAppError, type AppError } from "@/lib/errors"

import { useAddFamily } from "../hooks/use-family-changes"
import { FamilyForm } from "./family-form"
import type { FamilyNotice } from "./family-outcome-notice"
import { FamilyWriteFailed } from "./family-write-failed"
import { useFamilyInputCheck } from "./use-family-input-check"

export interface AddFamilyFormProps {
  /** The family list as cached, which a new name must not match (S6). */
  families: readonly Family[]
  available: boolean
  onAdded: (notice: FamilyNotice) => void
  onCancel: () => void
}

const EMPTY: FamilyInput = { name: "", colour: "" }

/** Adds a family with its name and colour and no Welsh name (S2). */
export function AddFamilyForm({
  families,
  available,
  onAdded,
  onCancel,
}: AddFamilyFormProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const add = useAddFamily()
  const { problems, focusRequest, check, refuse } =
    useFamilyInputCheck(families)
  const [values, setValues] = useState(EMPTY)
  const [error, setError] = useState<AppError | null>(null)

  const submit = () => {
    const input = check(values)
    if (input === null) return
    setError(null)
    add.mutate(input, {
      onSuccess: (outcome) => {
        if (outcome.status === "saved") {
          onAdded({ kind: "added", name: outcome.family.name.en })
        } else if (outcome.status === "unconfirmed") {
          // The app is held, saying the family may have been added (DEF-015).
          onCancel()
        } else {
          refuse({ name: "taken" })
        }
      },
      onError: (cause) => {
        setError(toAppError(cause))
      },
    })
  }

  return (
    <div className="flex flex-col gap-4 border bg-card p-4">
      <h3 id={titleId} className="text-heading-s">
        {t("roadmaps.families.add")}
      </h3>
      {error && (
        <FamilyWriteFailed
          action="add"
          error={error}
          onDismiss={() => {
            setError(null)
          }}
        />
      )}
      <FamilyForm
        labelledBy={titleId}
        values={values}
        problems={problems}
        focusRequest={focusRequest}
        submitLabel={t("roadmaps.families.form.add")}
        busy={add.isPending}
        available={available}
        onChange={setValues}
        onSubmit={submit}
        onCancel={onCancel}
      />
    </div>
  )
}
