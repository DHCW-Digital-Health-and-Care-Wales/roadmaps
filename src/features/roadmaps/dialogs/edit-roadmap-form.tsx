import { useTranslation } from "react-i18next"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  ROADMAP_TEXT_FIELDS,
  roadmapValue,
  type RoadmapTextField,
} from "@/domain/roadmap/roadmap-changes"
import { localToday } from "@/lib/local-today"

import { EditForm } from "../editing/edit-form"
import { editFormFields } from "../editing/edit-form-fields"
import type { RoadmapValues } from "../editing/pending-changes"
import { useRoadmapChoices } from "../editing/use-roadmap-choices"

/** Fields that hold paragraphs; the others are one line unless they already break. */
const multilineRoadmapFields: ReadonlySet<RoadmapTextField> = new Set([
  "vision",
  "serviceDescription",
])

export interface EditRoadmapFormProps {
  /** The id of the heading naming the form. */
  labelledBy: string
  /** The roadmap as the page shows it, its pending edits applied. */
  roadmap: Roadmap
  /** Done was chosen, with each value changed since the form opened. */
  onDone: (values: RoadmapValues) => void
}

/**
 * The roadmap dialog's editing form (STY-043): every field of what a roadmap is about
 * and no short name, which can't be changed. Its title, status, product lead, vision
 * and service description are typed (STY-025 S5), its family and category chosen from
 * the lists (STY-028), and the date it was last updated picked, none after today
 * (STY-036). Done writes nothing: the caller keeps the values pending.
 */
export function EditRoadmapForm({
  labelledBy,
  roadmap,
  onDone,
}: EditRoadmapFormProps) {
  const { t } = useTranslation()
  const text = editFormFields(
    ROADMAP_TEXT_FIELDS,
    (field) => roadmapValue(roadmap, field),
    (field) => t(`roadmaps.edit.roadmapFields.${field}`),
    { multiline: multilineRoadmapFields, required: { title: "titleRequired" } },
  )
  const chosen = useRoadmapChoices(true).fields(roadmap)
  const lastUpdated = {
    name: "lastUpdated",
    label: t("roadmaps.edit.roadmapFields.lastUpdated"),
    multiline: false,
    date: { today: localToday },
  } as const

  return (
    <EditForm
      fields={[...text.fields, ...chosen.fields, lastUpdated]}
      initial={{
        ...text.initial,
        ...chosen.initial,
        lastUpdated: roadmapValue(roadmap, "lastUpdated"),
      }}
      labelledBy={labelledBy}
      onDone={onDone}
    />
  )
}
