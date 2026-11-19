/**
 * The rules of pending edits (ADR-012, EPC-005 "The pending-edit store"): what an edit
 * keeps, what a fresh read or a publish drops, and how an edit finds its item again. Pure
 * functions over `RoadmapChanges`; the store applies them. A new item is added, edited
 * and removed by `domain/roadmap/new-item.ts`; how it shows is here (`shownNewItem`).
 * An item the roadmap holds is removed by `domain/roadmap/item-removal.ts`.
 */

import { findEditedItem } from "@/domain/roadmap/find-edited-item"
import { reconcileRemovals, removalOf } from "@/domain/roadmap/item-removal"
import { englishDetails } from "@/domain/roadmap/item-details"
import type { LocalisedText } from "@/domain/roadmap/localised-text"
import { dropPublishedNewItems } from "@/domain/roadmap/new-item"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  EDITABLE_ITEM_FIELDS,
  EDITABLE_ROADMAP_FIELDS,
  type EditableItemField,
  type EditableRoadmapField,
  type FieldChange,
  isChoiceField,
  type ItemChanges,
  type ItemTarget,
  itemValue,
  type ItemValues,
  type NewItem,
  organisationIdsOf,
  type RoadmapChanges,
  type RoadmapChoiceField,
  roadmapValue,
  sameTarget,
  tagsOf,
  UNLISTED_FAMILY,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import {
  isRoadmapPlacement,
  type RoadmapPlacement,
} from "@/domain/roadmap/roadmap-placement"

import type { RoadmapLists } from "../hooks/use-roadmap-lists"

/** The roadmap's own fields as a form gives them, as typed: kept trimmed. */
export type RoadmapValues = Partial<Record<EditableRoadmapField, string>>

type FieldChanges<F extends string> = Partial<Record<F, FieldChange>>

/**
 * `fields` with `values` applied over `current`: a value is kept trimmed, with the text
 * it was first edited from as its base; a value equal to that base, or to the current
 * text, is no edit.
 */
function editFields<F extends string>(
  fields: FieldChanges<F>,
  values: Partial<Record<F, string>>,
  current: (field: F) => string,
): FieldChanges<F> {
  const next = new Map(Object.entries(fields) as [F, FieldChange][])
  for (const [field, raw] of Object.entries(values) as [F, string][]) {
    const value = raw.trim()
    const text = current(field)
    const base = fields[field]?.base ?? text
    if (value === base || value === text) next.delete(field)
    else next.set(field, { base, value })
  }
  return Object.fromEntries(next) as FieldChanges<F>
}

/** `fields` without each whose value `current` holds; `fields` itself if none. */
function dropHeld<F extends string>(
  fields: FieldChanges<F>,
  current: (field: F) => string | undefined,
): FieldChanges<F> {
  const held = (Object.keys(fields) as F[]).filter(
    (field) => fields[field]?.value === current(field),
  )
  if (held.length === 0) return fields
  return Object.fromEntries(
    Object.entries(fields).filter(([field]) => !held.includes(field as F)),
  ) as FieldChanges<F>
}

function isEmpty(fields: object): boolean {
  return Object.keys(fields).length === 0
}

/**
 * What a form has seen since it opened: the record as it showed it then (`shown`, pending
 * English applied) and the `latest` read. A field the latest read holds as the form showed it (the
 * Product Lead's own publish landed while it was open) is edited from that read, not from
 * the older one the form opened on, so the next publish is not refused over it.
 */
export interface SinceOpened<T> {
  readonly shown: T
  readonly latest: T
}

/** The text `field` is edited from: as `opened`, unless `since` re-bases it. */
function originOf<T, F>(
  text: (record: T, field: F) => string,
  opened: T,
  since: SinceOpened<T> | undefined,
): (field: F) => string {
  return (field) => {
    const read = text(opened, field)
    if (!since) return read
    const latest = text(since.latest, field)
    return latest.trim() === text(since.shown, field).trim() ? latest : read
  }
}

/** `changes` with the roadmap's own text, as `roadmap` read it, edited to `values`. */
export function editRoadmap(
  changes: RoadmapChanges,
  roadmap: Roadmap,
  values: RoadmapValues,
  since?: SinceOpened<Roadmap>,
): RoadmapChanges {
  return {
    ...changes,
    roadmap: editFields(
      changes.roadmap,
      values,
      originOf(roadmapValue, roadmap, since),
    ),
  }
}

/**
 * `changes` with an item edited to `values`: `previous` is the item's entry (from
 * {@link matchItemChanges}), `item` the item as the form opened on it, `position` where
 * it is now and `since` what the form has seen since. An entry keeps the item as first
 * loaded, which a publish checks it by. It keeps its turn among the entries too, unless
 * the edit moves the item, which puts it after every item moved before it (STY-051 D3).
 */
export function editItem(
  changes: RoadmapChanges,
  previous: ItemChanges | undefined,
  item: RoadmapItem,
  position: number,
  values: ItemValues,
  since?: SinceOpened<RoadmapItem>,
): RoadmapChanges {
  const fields = editFields(
    previous?.fields ?? {},
    values,
    originOf(itemValue, item, since),
  )
  const others = changes.items.filter((entry) => entry !== previous)
  if (isEmpty(fields)) return { ...changes, items: others }
  const entry = { item: previous?.item ?? item, position, fields }
  const moved =
    fields.placement !== undefined &&
    fields.placement.value !== previous?.fields.placement?.value
  return {
    ...changes,
    items:
      previous === undefined || moved
        ? [...others, entry]
        : changes.items.map((each) => (each === previous ? entry : each)),
  }
}

/** `changes` without the roadmap's own text's. */
export function undoRoadmap(changes: RoadmapChanges): RoadmapChanges {
  return { ...changes, roadmap: {} }
}

/** `changes` without `entry`. */
export function undoItem(
  changes: RoadmapChanges,
  entry: ItemChanges,
): RoadmapChanges {
  return { ...changes, items: changes.items.filter((each) => each !== entry) }
}

/** An entry's pending values, as `findEditedItem` takes them. */
function pendingValues(
  entry: ItemChanges,
): { field: EditableItemField; value: string }[] {
  return EDITABLE_ITEM_FIELDS.flatMap((field) => {
    const change = entry.fields[field]
    return change ? [{ field, value: change.value }] : []
  })
}

const NO_REPEATED_IDS: ReadonlySet<string> = new Set()

/**
 * Which entry edits which of `items`, by index: an item with an ID by its ID, one with
 * none at its place holding what was loaded (or that with the pending values). An entry
 * matching nothing is left out: its item was removed or changed by a co-lead (STY-026).
 */
export function matchItemChanges(
  items: readonly RoadmapItem[],
  changes: RoadmapChanges | undefined,
): ReadonlyMap<number, ItemChanges> {
  const matched = new Map<number, ItemChanges>()
  for (const entry of changes?.items ?? []) {
    const index = findEditedItem(
      items,
      NO_REPEATED_IDS,
      entry,
      pendingValues(entry),
    )
    if (index >= 0 && !matched.has(index)) matched.set(index, entry)
  }
  return matched
}

/**
 * `changes` after a fresh read of the roadmap's own text: each field it already holds is
 * dropped; bases stay as they were. `changes` itself when nothing is dropped. A family or
 * category read with no ID but a name, as a row reads while its list is missing, is not
 * known to be none, so "No family" or "No category" stays pending.
 */
export function reconcileRoadmap(
  changes: RoadmapChanges,
  roadmap: Roadmap,
): RoadmapChanges {
  const roadmapFields = dropHeld(changes.roadmap, (field) =>
    isChoiceField(field) && roadmapValue(roadmap, field) === ""
      ? noChoiceHeld(roadmap, field)
      : roadmapValue(roadmap, field),
  )
  return roadmapFields === changes.roadmap
    ? changes
    : { ...changes, roadmap: roadmapFields }
}

/** `""` if the roadmap holds no `field`, `undefined` if it names one the read can't link. */
function noChoiceHeld(
  roadmap: Roadmap,
  field: RoadmapChoiceField,
): string | undefined {
  const name = field === "familyId" ? roadmap.family : roadmap.category
  return name === null ? "" : undefined
}

/**
 * `changes` after a fresh read of the roadmap's items: each entry found follows its item
 * to its place in the read, without the fields the item already holds; an entry not
 * found is kept as it was. Bases stay as they were, and so does the content an entry
 * was loaded with, which a publish checks a repeated ID by (ADR-012): the entry only
 * takes the item's ID if it had none, and the value of each field it drops. A new item
 * the read holds is no longer pending (`dropPublishedNewItems`), nor is a removal of an
 * item it no longer holds, with that item's edits, and a removal found follows its item
 * (`reconcileRemovals`).
 */
export function reconcileItems(
  changes: RoadmapChanges,
  items: readonly RoadmapItem[],
): RoadmapChanges {
  return reconcileEdits(
    reconcileRemovals(dropPublishedNewItems(changes, items), items),
    items,
  )
}

/** `reconcileItems` for the edits to the items the roadmap already held. */
function reconcileEdits(
  changes: RoadmapChanges,
  items: readonly RoadmapItem[],
): RoadmapChanges {
  if (changes.items.length === 0) return changes
  const indexOf = new Map(
    [...matchItemChanges(items, changes)].map(([index, entry]) => [
      entry,
      index,
    ]),
  )
  const reconciled = changes.items.flatMap((entry): ItemChanges[] => {
    const position = indexOf.get(entry)
    const read = position === undefined ? undefined : items[position]
    if (position === undefined || read === undefined) return [entry]
    const fields = dropHeld(entry.fields, (field) => itemValue(read, field))
    if (isEmpty(fields)) return []
    const id = entry.item.id ?? read.id
    if (
      fields === entry.fields &&
      position === entry.position &&
      id === entry.item.id
    ) {
      return [entry]
    }
    const item = changedItemFields(entry)
      .filter((field) => !(field in fields))
      .reduce((loaded, field) => withFieldOf(loaded, read, field), {
        ...entry.item,
        id,
      })
    return [{ item, position, fields }]
  })
  return reconciled.length === changes.items.length &&
    reconciled.every((entry, index) => entry === changes.items[index])
    ? changes
    : { ...changes, items: reconciled }
}

/**
 * `item` with `from`'s `field`: English and Welsh, a placement with its horizon, tags
 * or details with whether they have Welsh, or organisations with their unknown codes.
 */
function withFieldOf(
  item: RoadmapItem,
  from: RoadmapItem,
  field: EditableItemField,
): RoadmapItem {
  switch (field) {
    case "placement":
      return {
        ...item,
        placement: from.placement,
        writtenHorizon: from.writtenHorizon,
      }
    case "tags":
      return { ...item, tags: from.tags, hasWelshTags: from.hasWelshTags }
    case "organisationIds":
      return {
        ...item,
        organisationIds: from.organisationIds,
        unknownOrganisationCodes: from.unknownOrganisationCodes,
      }
    case "details":
      return {
        ...item,
        details: from.details,
        hasWelshDetails: from.hasWelshDetails,
      }
    default:
      return { ...item, [field]: from[field] }
  }
}

/**
 * `fields` once `sent` is published: each edit still as it was sent is gone; one edited
 * again since it was sent keeps its value, now from the published text.
 */
function settleFields<F extends string>(
  fields: FieldChanges<F>,
  sent: FieldChanges<F>,
): FieldChanges<F> {
  return Object.fromEntries(
    (Object.entries(fields) as [F, FieldChange][]).flatMap(
      ([field, change]) => {
        const published = sent[field]?.value
        if (published === undefined) return [[field, change]]
        if (published === change.value) return []
        return [[field, { base: published, value: change.value }]]
      },
    ),
  ) as FieldChanges<F>
}

/**
 * `changes` once `sent` is published: each edit still as it was sent is gone, and any
 * made meanwhile is kept, edited from what was published. A new item that was sent is
 * gone too, and one added meanwhile is kept. So is a placement's order that was sent:
 * none is made meanwhile, as the order controls wait for the publish (STY-050 S15). A
 * removal that was sent is gone, with every edit of its item, which is no more; one
 * made meanwhile is kept.
 */
export function settlePublished(
  changes: RoadmapChanges,
  sent: RoadmapChanges,
): RoadmapChanges {
  const sentIds = new Set(sent.newItems.map(({ id }) => id))
  const isRemoved = (entry: ItemTarget) =>
    sent.removals.some((each) => sameTarget(each, entry))
  return {
    roadmap: settleFields(changes.roadmap, sent.roadmap),
    items: changes.items.flatMap((entry) => {
      if (isRemoved(entry)) return []
      const sentEntry = sent.items.find((each) => sameTarget(each, entry))
      if (!sentEntry) return [entry]
      const fields = settleFields(entry.fields, sentEntry.fields)
      if (isEmpty(fields)) return []
      return [
        { ...entry, item: applyItemChanges(entry.item, sentEntry), fields },
      ]
    }),
    newItems: changes.newItems.filter(({ id }) => !sentIds.has(id)),
    orders: changes.orders.filter(
      ({ placement }) =>
        !sent.orders.some((each) => each.placement === placement),
    ),
    removals: changes.removals.filter((entry) => !isRemoved(entry)),
  }
}

/**
 * An entry's turn among the items that show last in their placement (STY-051 S1): its
 * place among the roadmap's pending moves, in the order they were made (D3); none for
 * an entry that moves nothing. A new item's turn follows them all: `newItemTurn`.
 */
export function moveTurn(
  changes: RoadmapChanges | undefined,
  entry: ItemChanges | undefined,
): number | undefined {
  if (!changes || !entry?.fields.placement) return undefined
  return changes.items.indexOf(entry)
}

/**
 * The turn of the new item `added`th among those pending: after every `moveTurn`, each
 * of which is an index of `changes.items`, in the order added (STY-051 D4).
 */
export function newItemTurn(
  changes: RoadmapChanges | undefined,
  added: number,
): number {
  return (changes?.items.length ?? 0) + added
}

/**
 * The roadmap's new items still to be published: those `items`, its items as read,
 * don't hold. One a read holds is that item, however it then reads.
 */
export function pendingNewItems(
  items: readonly RoadmapItem[],
  changes: RoadmapChanges | undefined,
): readonly NewItem[] {
  return changes ? dropPublishedNewItems(changes, items).newItems : []
}

/**
 * Whether publishing `changes` leaves the public site nothing of `items` to show: none
 * is in a horizon or section, counting a pending move (STY-042 D4), and no item is new,
 * which is always in one (STY-046 D9).
 */
export function publishesNoItems(
  items: readonly RoadmapItem[],
  changes: RoadmapChanges | undefined,
): boolean {
  if (pendingNewItems(items, changes).length > 0) return false
  const entries = matchItemChanges(items, changes)
  return items.every(
    (item, at) => applyItemChanges(item, entries.get(at)).placement === null,
  )
}

/**
 * How many changes are pending, what the page counts as unpublished changes: each field
 * edited, each new item as one, whatever fields it has, each placement's order as one,
 * however many of its items moved (STY-050), and each removal as one, its item's edits
 * beneath it none (STY-049 D5).
 */
export function countChanges(changes: RoadmapChanges | undefined): number {
  if (!changes) return 0
  return (
    Object.keys(changes.roadmap).length +
    changes.items.reduce(
      (count, entry) =>
        removalOf(changes, entry)
          ? count
          : count + Object.keys(entry.fields).length,
      0,
    ) +
    changes.newItems.length +
    changes.orders.length +
    changes.removals.length
  )
}

/** `text` showing `value` as its English, if one is given: `null` for a cleared field. */
function withEnglish(
  text: LocalisedText | null,
  value: string | undefined,
): LocalisedText | null {
  if (value === undefined) return text
  if (value === "") return null
  return { en: value, cy: text?.cy ?? "" }
}

/**
 * The roadmap as it will read once its pending English, family, category and date are
 * published: a chosen family or category as `lists` names it (and colours it), or with
 * only its ID until they are read; none for no family or category, the colour kept
 * (STY-028 S1, S2).
 */
export function applyRoadmapChanges(
  roadmap: Roadmap,
  changes: RoadmapChanges | undefined,
  lists?: RoadmapLists,
): Roadmap {
  const fields = changes?.roadmap
  if (!fields || isEmpty(fields)) return roadmap
  return {
    ...roadmap,
    ...chosenFamily(fields.familyId, lists?.families),
    ...chosenCategory(fields.categoryId, lists?.categories),
    title: withEnglish(roadmap.title, fields.title?.value) ?? roadmap.title,
    statusLabel: withEnglish(roadmap.statusLabel, fields.statusLabel?.value),
    productLead: fields.productLead
      ? fields.productLead.value || null
      : roadmap.productLead,
    lastUpdated: fields.lastUpdated
      ? fields.lastUpdated.value || null
      : roadmap.lastUpdated,
    vision: withEnglish(roadmap.vision, fields.vision?.value),
    serviceDescription: withEnglish(
      roadmap.serviceDescription,
      fields.serviceDescription?.value,
    ),
  }
}

/** The family fields of a roadmap showing `change`, a pending choice of family. */
function chosenFamily(
  change: FieldChange | undefined,
  families: RoadmapLists["families"],
): Partial<Roadmap> {
  if (!change || change.value === UNLISTED_FAMILY) return {}
  if (change.value === "") {
    return { familyId: null, family: null, familyNotListed: false }
  }
  const family = families?.find(({ id }) => id === change.value)
  return {
    familyId: change.value,
    familyNotListed: false,
    ...(family && { family: family.name, colour: family.colour }),
  }
}

/** The category fields of a roadmap showing `change`, a pending choice of category. */
function chosenCategory(
  change: FieldChange | undefined,
  categories: RoadmapLists["categories"],
): Partial<Roadmap> {
  if (!change) return {}
  if (change.value === "") return { categoryId: null, category: null }
  const category = categories?.find(({ id }) => id === change.value)
  return {
    categoryId: change.value,
    ...(category && { category: category.name }),
  }
}

/**
 * The item as it will read once its pending English, placement, tags, organisations
 * and details are published: a placed item has no horizon as written (STY-031 S4),
 * changed tags and details are English alone, as only an item with no Welsh ones has
 * them changed (STY-037 S20, STY-039 S18), and chosen organisations have no unknown
 * codes (STY-034 S4).
 */
export function applyItemChanges(
  item: RoadmapItem,
  entry: ItemChanges | undefined,
): RoadmapItem {
  if (!entry) return item
  return withValues(
    item,
    Object.fromEntries(
      pendingValues(entry).map(({ field, value }) => [field, value]),
    ),
  )
}

/** `item` reading `values` in each field they give, as a publish of them writes it. */
function withValues(item: RoadmapItem, values: ItemValues): RoadmapItem {
  const { placement, tags, organisationIds, details } = values
  return {
    ...item,
    ...(placement !== undefined &&
      isRoadmapPlacement(placement) && { placement, writtenHorizon: null }),
    ...(tags !== undefined && {
      tags: tagsOf(tags).map((en) => ({ en, cy: "" })),
    }),
    ...(organisationIds !== undefined && {
      organisationIds: organisationIdsOf(organisationIds),
      unknownOrganisationCodes: [],
    }),
    ...(details !== undefined && { details: englishDetails(details) }),
    title: withEnglish(item.title, values.title) ?? item.title,
    description: withEnglish(item.description, values.description),
    expectedOutcome: withEnglish(item.expectedOutcome, values.expectedOutcome),
    phase: withEnglish(item.phase, values.phase),
  }
}

/** An item with nothing in it and no horizon, which a new item's values go over. */
const BLANK_ITEM: RoadmapItem = {
  id: null,
  title: { en: "", cy: "" },
  placement: null,
  writtenHorizon: "",
  description: null,
  expectedOutcome: null,
  phase: null,
  tags: [],
  hasWelshTags: false,
  organisationIds: [],
  unknownOrganisationCodes: [],
  details: [],
  hasWelshDetails: false,
}

/**
 * An item with nothing in it, which the item dialog's adding form starts from: in
 * `placement`, or in none, which a new item can't keep (ADR-014).
 */
export function blankItem(placement: RoadmapPlacement | null): RoadmapItem {
  return placement ? withValues(BLANK_ITEM, { placement }) : BLANK_ITEM
}

/**
 * A new item as its card shows it: the item it will read as once published, in English
 * alone, with the ID it was added with.
 */
export function shownNewItem({ id, values }: NewItem): RoadmapItem {
  return withValues({ ...BLANK_ITEM, id }, values)
}

/** The roadmap's own fields that are pending, in the form's order. */
export function changedRoadmapFields(
  changes: RoadmapChanges | undefined,
): EditableRoadmapField[] {
  return EDITABLE_ROADMAP_FIELDS.filter((field) => changes?.roadmap[field])
}

/**
 * Whether a family or category is pending, so the lists are needed to show it by name
 * and colour.
 */
export function hasChoiceChange(changes: RoadmapChanges | undefined): boolean {
  return changedRoadmapFields(changes).some(isChoiceField)
}

/** A part of the roadmap with pending changes, and which of its fields they are. */
export type ChangedPart =
  | { readonly kind: "roadmap"; readonly fields: EditableRoadmapField[] }
  | {
      readonly kind: "item"
      readonly position: number
      /** The item as it will read once published. */
      readonly item: RoadmapItem
      readonly fields: EditableItemField[]
    }

/**
 * What a publish changes of what the roadmap holds: its own text first, then its items
 * in their order. The items new to it are no part of these: `changes.newItems`.
 */
export function changedParts(changes: RoadmapChanges): ChangedPart[] {
  const roadmapFields = changedRoadmapFields(changes)
  return [
    ...(roadmapFields.length > 0
      ? [{ kind: "roadmap", fields: roadmapFields } as const]
      : []),
    ...[...changes.items]
      .sort((a, b) => a.position - b.position)
      .map(
        (entry) =>
          ({
            kind: "item",
            position: entry.position,
            item: applyItemChanges(entry.item, entry),
            fields: changedItemFields(entry),
          }) as const,
      ),
  ]
}

/** An item's fields that are pending, in the form's order. */
export function changedItemFields(entry: ItemChanges): EditableItemField[] {
  return EDITABLE_ITEM_FIELDS.filter((field) => entry.fields[field])
}
