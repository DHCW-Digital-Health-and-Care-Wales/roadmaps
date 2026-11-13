import type { Roadmap } from "./roadmap"

/**
 * What making a roadmap match its family and category came to (STY-030). Only `matched`
 * wrote anything.
 */
export type MatchOutcome =
  /** Its row's copied cells now hold the lists' values. */
  | { status: "matched" }
  /** The roadmap is no longer listed. */
  | { status: "roadmap-not-found" }
  /**
   * What the roadmap is now differs from what was shown (its family or category changed,
   * or it is already in step or can't be fixed here): this is how it is.
   */
  | { status: "changed"; roadmap: Roadmap }

interface Settled {
  kind: "settled"
  outcome: MatchOutcome
}

/**
 * Whether "Make it match" can fix the roadmap: its copied cells differ from the lists,
 * and its family is one of them. A family not in the list is chosen again instead
 * (STY-030 S3).
 */
export function canMatchLists(
  roadmap: Pick<Roadmap, "outOfStep" | "familyNotListed">,
): boolean {
  return roadmap.outOfStep && !roadmap.familyNotListed
}

/**
 * Whether to write: the roadmap as re-read must be fixable and show what the Product
 * Lead saw, its family and category (names and colour) included (S4). Settled, writing
 * nothing, otherwise.
 */
export function planListMatch(
  loaded: Roadmap,
  current: Roadmap | undefined,
): Settled | { kind: "write" } {
  if (current === undefined) {
    return { kind: "settled", outcome: { status: "roadmap-not-found" } }
  }
  if (!canMatchLists(current) || !shownAlike(loaded, current)) {
    return {
      kind: "settled",
      outcome: { status: "changed", roadmap: current },
    }
  }
  return { kind: "write" }
}

function shownAlike(a: Roadmap, b: Roadmap): boolean {
  return (
    a.familyId === b.familyId &&
    a.family?.en === b.family?.en &&
    a.family?.cy === b.family?.cy &&
    a.colour === b.colour &&
    a.categoryId === b.categoryId &&
    a.category?.en === b.category?.en &&
    a.category?.cy === b.category?.cy
  )
}
