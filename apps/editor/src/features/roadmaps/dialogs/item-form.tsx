import { useTranslation } from "react-i18next"

import { InsetText } from "@/components/layout/inset-text"
import type { Organisation } from "@/domain/roadmap/organisation"
import {
  ITEM_TEXT_FIELDS,
  itemValue,
  type ItemTextField,
  type ItemValues,
  organisationIdsOf,
  organisationIdsValue,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { ROADMAP_PLACEMENTS } from "@/domain/roadmap/roadmap-placement"
import { useLanguage } from "@/i18n"

import { WrittenText } from "../components/content-text"
import { DetailList } from "../components/detail-list"
import { useContent, useWritten } from "../hooks/use-content"
import { EditForm, type EditFormField } from "../editing/edit-form"
import { editFormFields } from "../editing/edit-form-fields"
import type { TagInUse } from "../editing/item-tags"
import type { PublishAction } from "../editing/pending-changes-store"
import { TagList } from "../editing/tag-list"
import { localiseDetails } from "../localise-details"
import { shortNamesOf, sortOrganisations } from "../sort-organisations"

/** Fields that hold paragraphs; the others are one line unless they already break. */
const multilineItemFields: ReadonlySet<ItemTextField> = new Set([
  "description",
  "expectedOutcome",
])

/**
 * An item as read and as shown when the dialog opened on it, which its edits are made
 * from: a co-lead's change read while it is open never changes what Done keeps.
 */
export interface OpenedItem {
  readonly read: RoadmapItem
  readonly shown: RoadmapItem
}

/** What the adding form has that the editing form lacks (STY-046). */
interface AddingItem {
  /** What publishing the roadmap's changes is called, which the form's note names. */
  action: PublishAction
  /** Whether the form takes focus as it is drawn (`EditForm`). */
  takesFocus: boolean
  /** "Add and start another" was chosen, with what `onDone` is given. */
  onAnother: (values: ItemValues) => void
}

export interface ItemFormProps {
  /** The id of the heading naming the form. */
  labelledBy: string
  /** The item the form opened on: to add one, an item with nothing in it. */
  opened: OpenedItem
  /** The item as the page shows it now, its pending edits applied. */
  item: RoadmapItem
  /** The tags the roadmap's other items carry, which the form offers (STY-037 S3). */
  tagsInUse: readonly TagInUse[]
  /** The organisation list the item's organisations are named from (ADR-014). */
  organisations: readonly Organisation[]
  /** Done, or "Add item", was chosen, with each value changed since the form opened. */
  onDone: (values: ItemValues) => void
  /** Given, the form adds an item: `item` is what it starts from. */
  adding?: AddingItem | undefined
}

/**
 * The item dialog's form (STY-044, STY-046): an item's title, description, expected
 * outcome, phase and placement (STY-025 S1–S4; STY-031 S3), its tags (STY-037),
 * organisations (STY-034) and details (STY-039), the last three shut until asked for.
 * Done keeps the values changed. Adding is the same form over an item with nothing in
 * it: a horizon or section is required, a note says when the item is published, and its
 * buttons are "Add item" and "Add and start another". Either way it writes nothing: the
 * caller keeps the values pending.
 */
export function ItemForm({
  labelledBy,
  opened,
  item,
  tagsInUse,
  organisations,
  onDone,
  adding,
}: ItemFormProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const content = useContent()
  const written = useWritten()
  const text = editFormFields(
    ITEM_TEXT_FIELDS,
    (field) => itemValue(item, field),
    (field) => t(`roadmaps.edit.itemFields.${field}`),
    { multiline: multilineItemFields, required: { title: "titleRequired" } },
  )
  // The form keeps the placement it opened on, so its options follow that one: a
  // co-lead's placing the item since can't take the none option from the form's value.
  const placementField: EditFormField<"placement"> = {
    name: "placement",
    label: t("roadmaps.edit.itemFields.placement"),
    multiline: false,
    // An item that is edited may stay unplaced; a new one is always placed (ADR-014).
    ...(adding && { required: "placementRequired" as const }),
    options: [
      // An unplaced item starts on none, which can't be chosen again (S4).
      ...(opened.shown.placement === null
        ? [
            {
              value: "",
              label: t("roadmaps.edit.choosePlacement"),
              disabled: true,
            },
          ]
        : []),
      ...ROADMAP_PLACEMENTS.map((placement) => ({
        value: placement,
        label: t(`roadmaps.items.placements.${placement}`),
      })),
    ],
  }

  // Tags stay English; those with Welsh versions are shown as the card shows them, not
  // changed (S20).
  const tagsField: EditFormField<"tags"> = item.hasWelshTags
    ? {
        name: "tags",
        label: t("roadmaps.items.fields.tags"),
        multiline: false,
        fixed: {
          text:
            item.tags.length > 0 ? (
              <TagList
                tags={item.tags.map((tag) => ({
                  ...content(tag),
                  name: tag.en,
                }))}
              />
            ) : (
              t("roadmaps.edit.tags.none")
            ),
          notice: t("roadmaps.edit.tags.welshLocked"),
        },
      }
    : {
        name: "tags",
        label: t("roadmaps.edit.itemFields.tags"),
        multiline: false,
        tags: { inUse: tagsInUse },
      }

  // Short names and codes stay English; the order is the card's (ADR-014).
  const unknownCodes = opened.read.unknownOrganisationCodes
  const organisationsField: EditFormField<"organisationIds"> = {
    name: "organisationIds",
    label: t("roadmaps.edit.itemFields.organisationIds"),
    multiline: false,
    options: sortOrganisations(
      organisations,
      ({ shortName }) => shortName,
      language,
    ).map(({ id, code, shortName }) => {
      const { text: label, lang } = written(
        t("roadmaps.edit.organisationChoice", { shortName, code }),
        "en",
      )
      return { value: id, label, lang }
    }),
    many: {
      ofValue: organisationIdsOf,
      toValue: organisationIdsValue,
      // Named as the card names them (STY-038 D2).
      summary: (chosen) => {
        const names = shortNamesOf(organisations, chosen, language)
        return names.length > 0 ? (
          <WrittenText written="en" text={names.join(", ")} />
        ) : null
      },
      none: t("roadmaps.edit.organisations.none"),
      subject: t("roadmaps.edit.organisations.subject"),
    },
    ...(unknownCodes.length > 0 && {
      hint: t("roadmaps.edit.unknownOrganisations", {
        count: unknownCodes.length,
        codes: unknownCodes.join(", "),
      }),
    }),
  }

  // Details with Welsh versions are shown as the card shows them, not changed (S18).
  const detailsField: EditFormField<"details"> = item.hasWelshDetails
    ? {
        name: "details",
        label: t("roadmaps.items.fields.details"),
        multiline: false,
        fixed: {
          text:
            item.details.length > 0 ? (
              <DetailList details={localiseDetails(item.details, language)} />
            ) : (
              t("roadmaps.edit.details.none")
            ),
          notice: t("roadmaps.edit.details.welshLocked"),
        },
      }
    : {
        name: "details",
        label: t("roadmaps.edit.itemFields.details"),
        multiline: false,
        // As the form opened on them, as its value is; in English, as the field's
        // own are: Welsh details are never changed here.
        details: { asListed: localiseDetails(opened.shown.details, "en") },
      }

  return (
    <EditForm
      fields={[
        ...text.fields,
        placementField,
        tagsField,
        organisationsField,
        detailsField,
      ]}
      initial={{
        ...text.initial,
        placement: itemValue(item, "placement"),
        tags: itemValue(item, "tags"),
        organisationIds: itemValue(item, "organisationIds"),
        details: itemValue(item, "details"),
      }}
      labelledBy={labelledBy}
      onDone={onDone}
      confirmLabel={adding && t("roadmaps.edit.addItem.submit")}
      another={
        adding && {
          label: t("roadmaps.edit.addItem.another"),
          onDone: adding.onAnother,
        }
      }
      note={
        adding && (
          <InsetText className="py-2 pl-4">
            <p>{t(`roadmaps.edit.addItem.note.${adding.action}`)}</p>
          </InsetText>
        )
      }
      takesFocus={adding?.takesFocus}
    />
  )
}
