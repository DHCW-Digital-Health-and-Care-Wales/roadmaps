import { nameKey } from "@/lib/text"

import type { Family } from "./family"
import { createItemId, createUnusedId } from "./item-id"
import type { Roadmap } from "./roadmap"

/** What a Product Lead types to add or change a family (ADR-013): English only. */
export interface FamilyInput {
  name: string
  /** `#rrggbb`. */
  colour: string
}

export type FamilyField = keyof FamilyInput

/** Why a family's name or colour can't be saved (STY-029 S6). */
export interface FamilyInputProblems {
  /** Blank, or another family's name, folded as names match. */
  name?: "blank" | "taken"
  /** Not `#rrggbb`. */
  colour?: "invalid"
}

/** A family's change, as confirmed: the family as read, its changed fields, its roadmaps. */
export interface FamilyEdit {
  /** The family as the page read it: each field's base value. */
  family: Family
  /** The fields changed, each as `checkFamilyInput` gives it. */
  changes: Partial<FamilyInput>
  /** The ids of the roadmaps the confirmation named (STY-029 S8). */
  members: readonly string[]
}

/**
 * A field a co-lead changed since the page read it: its current value differs from both
 * its base and its pending value, as ADR-012 finds a roadmap's conflicts.
 */
export interface FamilyConflict {
  field: FamilyField
  base: string
  pending: string
  current: string
}

/**
 * What adding or changing a family came to. Every outcome but `saved` wrote nothing; an
 * addition is only `saved` or `name-taken`.
 */
export type FamilyOutcome =
  /** The family, as written, and every roadmap in it. */
  | { status: "saved"; family: Family }
  /** Another family now has the name, folded. */
  | { status: "name-taken" }
  /** A co-lead changed a field being changed. */
  | { status: "refused"; conflicts: FamilyConflict[] }
  /** A roadmap joined or left the family since the confirmation: these are its roadmaps now. */
  | { status: "members-changed"; members: Roadmap[] }
  /** The family is no longer listed. */
  | { status: "family-not-found" }
  /** The answer was lost and a re-read failed: the family may have been saved (DEF-015). */
  | { status: "unconfirmed" }

interface Settled {
  kind: "settled"
  outcome: FamilyOutcome
}

const HEX_COLOUR = /^#[0-9a-f]{6}$/

/**
 * The input trimmed, its colour lower case, and what is wrong with it among `families`.
 * `ownId` is the family being changed, which may keep its own name.
 */
export function checkFamilyInput(
  { name, colour }: FamilyInput,
  families: readonly Family[],
  ownId?: string,
): { input: FamilyInput; problems: FamilyInputProblems } {
  const input = { name: name.trim(), colour: colour.trim().toLowerCase() }
  const problems: FamilyInputProblems = {}
  if (input.name === "") problems.name = "blank"
  else if (nameTaken(input.name, families, ownId)) problems.name = "taken"
  if (!HEX_COLOUR.test(input.colour)) problems.colour = "invalid"
  return { input, problems }
}

/** The roadmaps in the family, in the order given. */
export function familyMembers(
  roadmaps: readonly Roadmap[],
  familyId: string,
): Roadmap[] {
  return roadmaps.filter((roadmap) => roadmap.familyId === familyId)
}

/**
 * A new family from checked input, with an ID in the `Item ID` format that no row of the
 * list holds (`takenIds`), and no Welsh name; refused when the list, as read now, has
 * the name.
 */
export function planNewFamily(
  input: FamilyInput,
  families: readonly Family[],
  takenIds: ReadonlySet<string> = new Set(),
  newId: () => string = createItemId,
): Settled | { kind: "write"; family: Family } {
  if (nameTaken(input.name, families)) {
    return { kind: "settled", outcome: { status: "name-taken" } }
  }
  const id = createUnusedId(
    new Set([...takenIds, ...families.map(({ id }) => id)]),
    newId,
  )
  return {
    kind: "write",
    family: { id, name: { en: input.name, cy: "" }, colour: input.colour },
  }
}

/**
 * The family as it will be written, and its roadmaps, from the lists as read now
 * (ADR-013): a field not changed keeps its current value, and the Welsh name is never
 * changed. Settled, writing nothing, when the family is gone, a field changed is in
 * conflict, its roadmaps are not those confirmed, or another family has the new name.
 */
export function planFamilyChange(
  { family: base, changes, members }: FamilyEdit,
  current: { families: readonly Family[]; roadmaps: readonly Roadmap[] },
): Settled | { kind: "write"; family: Family; members: Roadmap[] } {
  const family = current.families.find(({ id }) => id === base.id)
  if (family === undefined) {
    return { kind: "settled", outcome: { status: "family-not-found" } }
  }

  const conflicts = (["name", "colour"] as const).flatMap((field) => {
    const pending = changes[field]
    if (pending === undefined) return []
    const conflict = {
      field,
      base: fieldValue(base, field),
      pending,
      current: fieldValue(family, field),
    }
    return conflict.current === conflict.base ||
      conflict.current === conflict.pending
      ? []
      : [conflict]
  })
  if (conflicts.length > 0) {
    return { kind: "settled", outcome: { status: "refused", conflicts } }
  }

  const found = familyMembers(current.roadmaps, family.id)
  const confirmed = new Set(members)
  if (
    found.length !== confirmed.size ||
    found.some(({ id }) => !confirmed.has(id))
  ) {
    return {
      kind: "settled",
      outcome: { status: "members-changed", members: found },
    }
  }

  if (
    changes.name !== undefined &&
    nameTaken(changes.name, current.families, family.id)
  ) {
    return { kind: "settled", outcome: { status: "name-taken" } }
  }

  return {
    kind: "write",
    family: {
      id: family.id,
      name: { en: changes.name ?? family.name.en, cy: family.name.cy },
      colour: changes.colour ?? family.colour,
    },
    members: found,
  }
}

/**
 * Whether `families` lists the family with its name and colour: how a write whose answer
 * was lost is settled (ADR-012 Option 16).
 */
export function familyHeld(
  family: Family,
  families: readonly Family[] | null,
): boolean {
  const found = families?.find(({ id }) => id === family.id)
  return found?.name.en === family.name.en && found.colour === family.colour
}

function fieldValue(family: Family, field: FamilyField): string {
  return field === "name" ? family.name.en : family.colour
}

function nameTaken(
  name: string,
  families: readonly Family[],
  ownId?: string,
): boolean {
  const key = nameKey(name)
  return families.some(
    ({ id, name: { en } }) => id !== ownId && nameKey(en) === key,
  )
}
