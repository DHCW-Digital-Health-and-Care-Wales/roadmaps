import { AppError } from "@/lib/errors"

import type { Category } from "./category"
import type { Family } from "./family"
import type { Roadmap } from "./roadmap"
import type { RoadmapChoiceField } from "./roadmap-changes"
import {
  checkShortName,
  shortNameAddress,
  type ShortNameProblem,
} from "./short-name"

/** What a Product Lead gives to add a roadmap (STY-040): English only. */
export interface NewRoadmapInput {
  title: string
  /** Its identity: it names where its items are kept and ends its public address. */
  shortName: string
  /** `null`: no family. */
  familyId: string | null
  /** `null`: no category. */
  categoryId: string | null
  /** Free text, as a roadmap's is; `""` for none. */
  productLead: string
}

/** Why a new roadmap's title or short name can't be sent. */
export interface NewRoadmapProblems {
  title?: "blank"
  shortName?: ShortNameProblem
}

/**
 * What adding a roadmap came to (STY-040). Every outcome but `added` and `unconfirmed`
 * wrote nothing.
 */
export type NewRoadmapOutcome =
  /** The roadmap, as the list then gives it: not published, with no items. */
  | { status: "added"; roadmap: Roadmap }
  /** The short name is in use, by a roadmap or by something else the data source keeps. */
  | { status: "short-name-taken" }
  /** The family or the category chosen is no longer listed. */
  | { status: "choice-not-listed"; fields: RoadmapChoiceField[] }
  /**
   * The write's answer never arrived and a check could not settle whether it was
   * applied (ADR-012 Option 16): the roadmap may have been added.
   */
  | { status: "unconfirmed" }

/** The short names a data source has in use, as read now. */
export interface ShortNamesInUse {
  /** Every roadmap it lists. */
  roadmaps: readonly Roadmap[]
  /** Every name it keeps something under, a roadmap's items or not. */
  names: Iterable<string>
}

/** What a new roadmap is planned over: the data source as read now. */
export interface NewRoadmapSnapshot extends ShortNamesInUse {
  /** `null` without a usable list. */
  families: readonly Family[] | null
  categories: readonly Category[] | null
}

interface Settled {
  kind: "settled"
  outcome: NewRoadmapOutcome
}

/** The input trimmed, and what is wrong with its title and short name. */
export function checkNewRoadmapInput(input: NewRoadmapInput): {
  input: NewRoadmapInput
  problems: NewRoadmapProblems
} {
  const title = input.title.trim()
  const { shortName, problem } = checkShortName(input.shortName)
  return {
    input: {
      ...input,
      title,
      shortName,
      productLead: input.productLead.trim(),
    },
    problems: {
      ...(title === "" && { title: "blank" as const }),
      ...(problem !== undefined && { shortName: problem }),
    },
  }
}

/**
 * Whether a short name is in use (STY-040 S4): a roadmap has its address, or the data
 * source keeps something under its name, in any letter case.
 */
export function shortNameInUse(
  shortName: string,
  { roadmaps, names }: ShortNamesInUse,
): boolean {
  const address = shortNameAddress(shortName)
  const name = caseKey(shortName)
  return (
    roadmaps.some(({ id }) => id === address) ||
    [...names].some((each) => caseKey(each) === name)
  )
}

/**
 * The roadmap as it will be written and then listed: not published, in step with the
 * family and category chosen, and with nothing else (STY-040 S2). Settled, writing
 * nothing, when its short name is in use or a family or category chosen is not listed.
 * Throws for input `checkNewRoadmapInput` refuses, which a screen never sends.
 */
export function planNewRoadmap(
  unchecked: NewRoadmapInput,
  current: NewRoadmapSnapshot,
): Settled | { kind: "write"; roadmap: Roadmap } {
  const { input, problems } = checkNewRoadmapInput(unchecked)
  if (Object.keys(problems).length > 0) {
    throw new AppError("unknown", {
      message: "A new roadmap's input was not checked",
    })
  }
  if (shortNameInUse(input.shortName, current)) {
    return { kind: "settled", outcome: { status: "short-name-taken" } }
  }

  const family = chosen(current.families, input.familyId)
  const category = chosen(current.categories, input.categoryId)
  if (family === undefined || category === undefined) {
    return {
      kind: "settled",
      outcome: {
        status: "choice-not-listed",
        fields: [
          ...(family === undefined ? (["familyId"] as const) : []),
          ...(category === undefined ? (["categoryId"] as const) : []),
        ],
      },
    }
  }

  return {
    kind: "write",
    roadmap: {
      id: shortNameAddress(input.shortName),
      itemsLocation: input.shortName,
      title: { en: input.title, cy: "" },
      published: false,
      category: category?.name ?? null,
      categoryId: category?.id ?? null,
      family: family?.name ?? null,
      familyId: family?.id ?? null,
      copied: {
        family: family?.name ?? null,
        colour: family?.colour ?? null,
        category: category?.name.en ?? "",
      },
      outOfStep: false,
      familyNotListed: false,
      statusLabel: null,
      productLead: input.productLead === "" ? null : input.productLead,
      lastUpdated: null,
      colour: family?.colour ?? null,
      vision: null,
      serviceDescription: null,
    },
  }
}

/**
 * How an add whose answer was lost is settled, from one re-read (STY-040 S7). `written`
 * says whether the data source holds what this very write made: then the roadmap was
 * added, as its entry and its empty roadmap are one write. Otherwise a short name now in
 * use is another's roadmap, whatever it holds; and `null` means nothing was written.
 */
export function settleLostNewRoadmap(
  roadmap: Roadmap,
  written: boolean,
  current: ShortNamesInUse,
): NewRoadmapOutcome | null {
  if (written) return { status: "added", roadmap }
  return shortNameInUse(roadmap.itemsLocation, current)
    ? { status: "short-name-taken" }
    : null
}

/** The entry chosen: `null` for none, `undefined` when the list, as read now, lacks it. */
function chosen<T extends { id: string }>(
  list: readonly T[] | null,
  id: string | null,
): T | null | undefined {
  return id === null ? null : list?.find((each) => each.id === id)
}

/** A name as names are told apart, in any letter case. */
function caseKey(name: string): string {
  return name.normalize("NFC").toLowerCase()
}
