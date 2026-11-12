import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  checkFamilyInput,
  type FamilyField,
  type FamilyInput,
  type FamilyInputProblems,
} from "@/domain/roadmap/family-changes"
import type { Family } from "@/domain/roadmap/family"
import { toAppError, type AppError } from "@/lib/errors"

import { useFamilyChanges } from "../hooks/use-family-changes"
import { FamilyForm } from "./family-form"
import type { FamilyNotice } from "./family-outcome-notice"
import { FamilyWriteFailed } from "./family-write-failed"

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
  const { add } = useFamilyChanges()
  const [values, setValues] = useState(EMPTY)
  const [problems, setProblems] = useState<FamilyInputProblems>({})
  const [focusRequest, setFocusRequest] = useState<{
    field: FamilyField
  } | null>(null)
  const [error, setError] = useState<AppError | null>(null)

  const refuse = (found: FamilyInputProblems) => {
    setProblems(found)
    setFocusRequest({ field: found.name ? "name" : "colour" })
  }

  const submit = () => {
    const { input, problems: found } = checkFamilyInput(values, families)
    if (found.name || found.colour) {
      refuse(found)
      return
    }
    setProblems({})
    setError(null)
    add.mutate(input, {
      onSuccess: (outcome) => {
        if (outcome.status === "saved") {
          onAdded({ kind: "added", name: outcome.family.name.en })
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
