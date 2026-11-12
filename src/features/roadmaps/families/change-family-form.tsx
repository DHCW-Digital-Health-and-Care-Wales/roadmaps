import { useEffect, useId, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  checkFamilyInput,
  familyMembers,
  type FamilyConflict,
  type FamilyField,
  type FamilyInput,
  type FamilyInputProblems,
} from "@/domain/roadmap/family-changes"
import type { Family } from "@/domain/roadmap/family"
import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { useLanguage } from "@/i18n"
import { toAppError, type AppError } from "@/lib/errors"

import { useFamilyChanges } from "../hooks/use-family-changes"
import { FamilyChangeDialog } from "./family-change-dialog"
import { FamilyConflictReview } from "./family-conflict-review"
import { FamilyForm } from "./family-form"
import type { FamilyNotice } from "./family-outcome-notice"
import { FamilyWriteFailed } from "./family-write-failed"

export interface ChangeFamilyFormProps {
  /** The family as cached when the form opened: the base each change is checked against. */
  family: Family
  /** The family list as cached, which a new name must not match (S6). */
  families: readonly Family[]
  /** The roadmaps as cached, which the confirmation names (S3). */
  roadmaps: readonly Roadmap[]
  available: boolean
  onDone: (notice: FamilyNotice | null) => void
}

interface Confirming {
  members: readonly Roadmap[]
  /** Whether a write found these roadmaps, not those confirmed (S8). */
  changed: boolean
}

function inputOf(family: Family): FamilyInput {
  return { name: family.name.en, colour: family.colour }
}

/**
 * Renames or recolours a family (S3–S9). A change to a family with roadmaps is confirmed
 * first, naming them; a refusal shows each conflict to decide (S5); a changed set of
 * roadmaps asks again (S8). Nothing changed closes the form.
 */
export function ChangeFamilyForm({
  family,
  families,
  roadmaps,
  available,
  onDone,
}: ChangeFamilyFormProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const titleId = useId()
  const { change } = useFamilyChanges()
  const [base, setBase] = useState(family)
  const [values, setValues] = useState(() => inputOf(family))
  const [problems, setProblems] = useState<FamilyInputProblems>({})
  const [focusRequest, setFocusRequest] = useState<{
    field: FamilyField
  } | null>(null)
  const [conflicts, setConflicts] = useState<readonly FamilyConflict[]>([])
  const [confirming, setConfirming] = useState<Confirming | null>(null)
  const [error, setError] = useState<AppError | null>(null)
  // Open from the confirmation's opening until it has finished closing: focus moves to
  // what a write found only then, or the dialog would take it back.
  const [dialogShown, setDialogShown] = useState(false)
  const [reviewRequest, setReviewRequest] = useState<object | null>(null)
  const reviewRef = useRef<HTMLDivElement>(null)
  const name = localise(family.name, language)

  useEffect(() => {
    if (reviewRequest !== null && !dialogShown) reviewRef.current?.focus()
  }, [reviewRequest, dialogShown])

  const confirm = (next: Confirming) => {
    setConfirming(next)
    setDialogShown(true)
    setFocusRequest(null)
    setReviewRequest(null)
  }

  const refuse = (found: FamilyInputProblems) => {
    setProblems(found)
    setFocusRequest({ field: found.name ? "name" : "colour" })
  }

  /** The checked input's fields that differ from the base, or `null` when it has a problem. */
  const checkedChanges = (): Partial<FamilyInput> | null => {
    const { input, problems: found } = checkFamilyInput(
      values,
      families,
      family.id,
    )
    if (found.name || found.colour) {
      refuse(found)
      return null
    }
    setProblems({})
    return {
      ...(input.name === base.name.en ? {} : { name: input.name }),
      ...(input.colour === base.colour ? {} : { colour: input.colour }),
    }
  }

  const write = (members: readonly Roadmap[]) => {
    const changes = checkedChanges()
    if (changes === null) {
      setConfirming(null)
      return
    }
    setError(null)
    change.mutate(
      { family: base, changes, members: members.map(({ id }) => id) },
      {
        onSuccess: (outcome) => {
          switch (outcome.status) {
            case "saved":
              onDone({
                kind: members.some(({ published }) => published)
                  ? "changedPublic"
                  : "changed",
                name: outcome.family.name.en,
              })
              return
            case "family-not-found":
              onDone({ kind: "gone" })
              return
            case "members-changed":
              confirm({ members: outcome.members, changed: true })
              return
            case "name-taken":
              setConfirming(null)
              refuse({ name: "taken" })
              return
            case "refused":
              setConfirming(null)
              setConflicts(outcome.conflicts)
              setReviewRequest({})
              return
          }
        },
        onError: (cause) => {
          setConfirming(null)
          setError(toAppError(cause))
        },
      },
    )
  }

  const submit = () => {
    const changes = checkedChanges()
    if (changes === null) return
    if (changes.name === undefined && changes.colour === undefined) {
      onDone(null)
      return
    }
    const members = familyMembers(roadmaps, family.id)
    if (members.length > 0) confirm({ members, changed: false })
    else write([])
  }

  const decide = (conflict: FamilyConflict, keep: "mine" | "theirs") => {
    setBase((current) =>
      conflict.field === "name"
        ? { ...current, name: { ...current.name, en: conflict.current } }
        : { ...current, colour: conflict.current },
    )
    if (keep === "theirs") {
      setValues((current) => ({
        ...current,
        [conflict.field]: conflict.current,
      }))
    }
    setConflicts((current) =>
      current.filter(({ field }) => field !== conflict.field),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 id={titleId} className="text-heading-s">
        {t("roadmaps.families.form.changeTitle", { name })}
      </h3>
      {conflicts.length > 0 && (
        <FamilyConflictReview
          ref={reviewRef}
          conflicts={conflicts}
          onKeepMine={(conflict) => {
            decide(conflict, "mine")
          }}
          onUseTheirs={(conflict) => {
            decide(conflict, "theirs")
          }}
        />
      )}
      {error && (
        <FamilyWriteFailed
          action="change"
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
        focusRequest={dialogShown ? null : focusRequest}
        submitLabel={t("roadmaps.families.form.save")}
        busy={change.isPending}
        available={available}
        onChange={setValues}
        onSubmit={submit}
        onCancel={() => {
          onDone(null)
        }}
      />
      <FamilyChangeDialog
        open={confirming !== null}
        name={name}
        members={confirming?.members ?? []}
        membersChanged={confirming?.changed ?? false}
        saving={change.isPending}
        available={available}
        returnFocus={() => focusRequest === null && reviewRequest === null}
        onClosed={() => {
          setDialogShown(false)
        }}
        onConfirm={() => {
          if (confirming) write(confirming.members)
        }}
        onCancel={() => {
          setConfirming(null)
        }}
      />
    </div>
  )
}
