import { useState } from "react"

import {
  checkNewRoadmapInput,
  shortNameInUse,
} from "@/domain/roadmap/new-roadmap"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapChoiceField } from "@/domain/roadmap/roadmap-changes"
import {
  suggestShortName,
  type ShortNameProblem,
} from "@/domain/roadmap/short-name"
import { toAppError, type AppError } from "@/lib/errors"

import { usePendingChangesStore } from "../editing/pending-changes-context"
import { useAddRoadmap } from "../hooks/use-add-roadmap"

/** What the form holds; a family or category is its ID, `""` for none. */
interface NewRoadmapValues {
  title: string
  shortName: string
  familyId: string
  categoryId: string
  productLead: string
}

/** The fields that can be refused, in the form's order. */
const REFUSABLE_FIELDS = [
  "title",
  "shortName",
  "familyId",
  "categoryId",
] as const satisfies readonly (keyof NewRoadmapValues)[]

export type RefusableField = (typeof REFUSABLE_FIELDS)[number]

/** Why each field can't be sent, or was refused by the write. */
type NewRoadmapFormProblems = {
  title?: "blank"
  /** `taken`: a roadmap, or something else the data source keeps, has it. */
  shortName?: ShortNameProblem | "taken"
} & Partial<Record<RoadmapChoiceField, "not-listed">>

const EMPTY = { title: "", familyId: "", categoryId: "", productLead: "" }

/**
 * The adding form's state (STY-041): what was typed, with the short name following the
 * title until it is changed (S3); what the last attempt found wrong with each field, and
 * a request to focus the first (S4, S6); and a write that failed (S7). A lost answer
 * closes the dialog with `onClose`, as the app is held until a Refresh (DEF-015).
 * Submitting checks the fields, and the short name against `roadmaps`, the list as
 * cached, before anything is sent (D7); the write checks again. Whatever it answers but `added`, everything
 * typed is kept, but a family or category the lists no longer offer, which goes back to
 * none with its field saying so (S6).
 */
export function useNewRoadmapForm({
  roadmaps,
  onAdded,
  onClose,
}: {
  roadmaps: readonly Roadmap[]
  onAdded: (roadmap: Roadmap) => void
  onClose: () => void
}) {
  const add = useAddRoadmap()
  const store = usePendingChangesStore()
  const [typed, setTyped] = useState(EMPTY)
  // `null` until it is changed: it follows the title.
  const [shortName, setShortName] = useState<string | null>(null)
  const [problems, setProblems] = useState<NewRoadmapFormProblems>({})
  const [focusRequest, setFocusRequest] = useState<{
    field: RefusableField
  } | null>(null)
  const [failure, setFailure] = useState<AppError | null>(null)

  const values: NewRoadmapValues = {
    ...typed,
    shortName: shortName ?? suggestShortName(typed.title),
  }

  const refuse = (found: NewRoadmapFormProblems) => {
    setProblems(found)
    const first = REFUSABLE_FIELDS.find((field) => found[field])
    setFocusRequest(first ? { field: first } : null)
  }

  const dropChoices = (fields: readonly RoadmapChoiceField[]) => {
    const each = <Value extends string>(value: Value) =>
      Object.fromEntries(fields.map((field) => [field, value])) as Partial<
        Record<RoadmapChoiceField, Value>
      >
    setTyped((current) => ({ ...current, ...each("") }))
    setProblems((current) => ({ ...current, ...each("not-listed") }))
  }

  const submit = () => {
    if (add.isPending) return
    const { input, problems: found } = checkNewRoadmapInput({
      ...values,
      familyId: values.familyId || null,
      categoryId: values.categoryId || null,
    })
    const taken =
      !found.shortName &&
      shortNameInUse(input.shortName, { roadmaps, names: [] })
    if (found.title || found.shortName || taken) {
      refuse({ ...found, ...(taken && { shortName: "taken" as const }) })
      return
    }
    refuse({})
    setFailure(null)
    add.mutate(input, {
      onSuccess: (outcome) => {
        switch (outcome.status) {
          case "added":
            // Written, so listed, whatever this tab found gone from the list before.
            store.restoreRoadmaps([outcome.roadmap.id])
            onAdded(outcome.roadmap)
            break
          case "short-name-taken":
            refuse({ shortName: "taken" })
            break
          case "choice-not-listed": {
            dropChoices(outcome.fields)
            const first = REFUSABLE_FIELDS.find((field) =>
              (outcome.fields as readonly string[]).includes(field),
            )
            setFocusRequest(first ? { field: first } : null)
            break
          }
          case "unconfirmed":
            // The app is held, saying the roadmap may have been added (DEF-015).
            onClose()
            break
        }
      },
      onError: (cause) => {
        setFailure(toAppError(cause))
      },
    })
  }

  return {
    values,
    change: (field: keyof NewRoadmapValues, value: string) => {
      if (field === "shortName") setShortName(value)
      else setTyped((current) => ({ ...current, [field]: value }))
    },
    /**
     * Puts choices the lists no longer offer back to none, each field saying so: what
     * the write found gone, or what a list read again no longer holds.
     */
    dropChoices,
    problems,
    focusRequest,
    failure,
    dismissFailure: () => {
      setFailure(null)
    },
    busy: add.isPending,
    submit,
  }
}
