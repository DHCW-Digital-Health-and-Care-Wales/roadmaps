import { useTranslation } from "react-i18next"

import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"
import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  ROADMAP_CHOICE_FIELDS,
  type RoadmapChoiceField,
  roadmapValue,
  UNLISTED_FAMILY,
} from "@/domain/roadmap/roadmap-changes"
import { useLanguage } from "@/i18n"

import { type RoadmapLists, useRoadmapLists } from "../hooks/use-roadmap-lists"
import type { EditFormField, EditFormOption } from "./edit-form"

/**
 * A roadmap's family and category as chosen from the lists (STY-028): the lists, the
 * form fields choosing them, and the name a chosen value shows as. The lists are read
 * only once `needed`.
 */
export function useRoadmapChoices(needed: boolean) {
  const { t } = useTranslation()
  const language = useLanguage()
  const { lists, reading, refetch } = useRoadmapLists(needed)

  /** The name `value`, a family's or category's ID, shows as; `""` is none. */
  const describe = (field: RoadmapChoiceField, value: string): string => {
    if (field === "familyId") {
      if (value === "") return t("roadmaps.edit.noFamily")
      if (value === UNLISTED_FAMILY) return t("roadmaps.lists.familyNotListed")
    } else if (value === "") {
      return t("roadmaps.edit.noCategory")
    }
    const name = listOf(lists, field)?.find(({ id }) => id === value)?.name
    return name ? localise(name, language) : value
  }

  /** "No family", then the row's unlisted family, then the list in its order. */
  const familyOptions = (
    shown: Roadmap,
    families: readonly Family[],
  ): EditFormOption[] => [
    { value: "", label: t("roadmaps.edit.noFamily"), colour: null },
    ...(shown.familyNotListed && shown.family
      ? [
          {
            value: UNLISTED_FAMILY,
            label: t("roadmaps.edit.familyNotListed", {
              name: localise(shown.family, language),
            }),
            colour: shown.colour,
          },
        ]
      : []),
    ...families.map(({ id, name, colour }) => ({
      value: id,
      label: localise(name, language),
      colour,
    })),
  ]

  /** "No category", then the list in its order. */
  const categoryOptions = (
    categories: readonly Category[],
  ): EditFormOption[] => [
    { value: "", label: t("roadmaps.edit.noCategory") },
    ...categories.map(({ id, name }) => ({
      value: id,
      label: localise(name, language),
    })),
  ]

  /**
   * The family and category fields of the form editing `shown`, each chosen from its
   * list (held at its value while the list is first read), or shown read-only while its
   * list can't be read (S6), and their values as the form opens.
   */
  const fields = (shown: Roadmap) => {
    const nameOf = (field: RoadmapChoiceField) => {
      const name = field === "familyId" ? shown.family : shown.category
      return name
        ? localise(name, language)
        : t(
            field === "familyId"
              ? "roadmaps.edit.noFamily"
              : "roadmaps.edit.noCategory",
          )
    }
    return {
      fields: ROADMAP_CHOICE_FIELDS.map(
        (field): EditFormField<RoadmapChoiceField> => {
          const label = t(`roadmaps.edit.roadmapFields.${field}`)
          const options =
            field === "familyId"
              ? lists.families && familyOptions(shown, lists.families)
              : lists.categories && categoryOptions(lists.categories)
          if (options) return { name: field, label, multiline: false, options }
          const value = roadmapValue(shown, field)
          return reading[field === "familyId" ? "families" : "categories"]
            ? {
                name: field,
                label,
                multiline: false,
                options: [
                  {
                    value,
                    label: nameOf(field),
                    ...(field === "familyId" ? { colour: shown.colour } : {}),
                  },
                ],
                disabled: true,
              }
            : {
                name: field,
                label,
                multiline: false,
                fixed: {
                  text: nameOf(field),
                  notice: t(`roadmaps.edit.choiceUnavailable.${field}`),
                },
              }
        },
      ),
      initial: Object.fromEntries(
        ROADMAP_CHOICE_FIELDS.map((field) => [
          field,
          roadmapValue(shown, field),
        ]),
      ) as Record<RoadmapChoiceField, string>,
    }
  }

  return { lists, refetch, describe, fields }
}

function listOf(lists: RoadmapLists, field: RoadmapChoiceField) {
  return field === "familyId" ? lists.families : lists.categories
}
