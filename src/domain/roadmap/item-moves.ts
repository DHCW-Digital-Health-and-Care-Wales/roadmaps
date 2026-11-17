/**
 * Where publishing a moved item puts it among the roadmap's items (ADR-014 and ADR-012,
 * _STY-051 amendments_): last in its new placement. Pure, and in items only, so every
 * `RoadmapRepository` moves the same ones; each finds what holds an item itself.
 */

import { AppError } from "@/lib/errors"

/**
 * One item taken out of the roadmap's items and put back just after another, or just
 * before it. Each index is the item's place among the items as read, and the move is
 * made over what the moves before it left.
 */
export type ItemMove = { index: number } & (
  { after: number } | { before: number }
)

/**
 * A placement's items once published, in order, each by its index among the items as
 * read: those `still` are never moved, whatever the fewest moves would be.
 */
interface PlacementTarget {
  items: readonly number[]
  still: ReadonlySet<number>
}

/**
 * The fewest moves that leave each item of `moved` last in its new placement, in the
 * order they were moved: after every item the placement holds as read, whoever added
 * it, bar one that is itself moving out. `placements` are the items' placements as
 * read, in order, `null` for an unplaced one; `moved` gives each moved item's index
 * among them and where it goes. An item already there is not moved (STY-051 S5): the
 * longest run of them in the order moved stays, the earliest moved of two such runs.
 * Each other one goes just after the item it follows, or, with none to follow, just
 * before the first that stays. The placement's own items are held still.
 *
 * A placement of `orders`, one whose order is pending (STY-050 S7), is to hold `items`
 * instead, those staying in it and those moved in, in that order, and any of its rows
 * may move: the longest run already in that order stays, the first of two as long, and
 * each other row goes as above. No other placement's items change their order.
 */
export function planItemMoves(
  placements: readonly (string | null)[],
  moved: readonly { index: number; placement: string }[],
  orders: readonly { placement: string; items: readonly number[] }[] = [],
): ItemMove[] {
  // By index, so an item given twice is moved once, to where it was last sent.
  const movedTo = new Map(
    moved.map(({ index, placement }) => [index, placement]),
  )
  const ordered = new Set(orders.map(({ placement }) => placement))
  const targets: PlacementTarget[] = [
    ...orders.map(({ items }) => ({ items, still: new Set<number>() })),
    ...[...new Set(movedTo.values())]
      .filter((placement) => !ordered.has(placement))
      .map((placement) => {
        const own = placements.flatMap((each, index) =>
          each === placement && !movedTo.has(index) ? [index] : [],
        )
        const arriving = [...movedTo.keys()].filter(
          (index) => movedTo.get(index) === placement,
        )
        return { items: [...own, ...arriving], still: new Set(own) }
      }),
  ]

  const moves: ItemMove[] = []
  let order = placements.map((_, index) => index)
  for (const { items, still } of targets) {
    const staying = longestRun(items, (index) => order.indexOf(index), still)
    const firstStaying = items.find((index) => staying.has(index))
    let previous: number | undefined
    for (const index of items) {
      if (!staying.has(index)) {
        const move = moveTo(index, previous, firstStaying)
        moves.push(move)
        order = afterMove(order, move)
      }
      previous = index
    }
  }
  return moves
}

/** `index` put just after `previous`, or, with none to follow, just before `first`. */
function moveTo(
  index: number,
  previous: number | undefined,
  first: number | undefined,
): ItemMove {
  if (previous !== undefined) return { index, after: previous }
  // Never: with no item to follow, every item arriving may stay, so one of them does.
  if (first === undefined) {
    throw new AppError("unknown", {
      message:
        "An item moved into a placement with no items has none to go before",
    })
  }
  return { index, before: first }
}

/** `items` in the order `moves`, made over them in turn, leave them. */
export function movedItems<T>(
  items: readonly T[],
  moves: readonly ItemMove[],
): T[] {
  const order = moves.reduce(
    afterMove,
    items.map((_, index) => index),
  )
  // Each index is one of `items`: a slice gives that item, typed, or nothing.
  return order.flatMap((index) => items.slice(index, index + 1))
}

/** `order`, a list of item indexes, once `move` is made. */
function afterMove(order: readonly number[], move: ItemMove): number[] {
  const rest = order.filter((index) => index !== move.index)
  const to =
    "after" in move ? rest.indexOf(move.after) + 1 : rest.indexOf(move.before)
  return [...rest.slice(0, to), move.index, ...rest.slice(to)]
}

/**
 * The longest run of `indexes`, taken in their order, that `at` puts in rising order
 * and that holds every one of `still`, which `at` puts in rising order already: of two
 * as long, the one whose items come first.
 */
function longestRun(
  indexes: readonly number[],
  at: (index: number) => number,
  still: ReadonlySet<number>,
): ReadonlySet<number> {
  // Each with the length of the longest run that starts with it, from the last back:
  // none (0) for one that can't be followed by the next of `still`.
  const starts: { index: number; place: number; length: number }[] = []
  for (const index of indexes.toReversed()) {
    const place = at(index)
    const next = upToStill(starts, still)
    const longest = Math.max(
      0,
      ...next
        .filter((later) => later.place > place)
        .map((later) => later.length),
    )
    // One of `still` lies after it, so it must be followed up to that one.
    const followed = next.some((later) => still.has(later.index))
    starts.unshift({
      index,
      place,
      length: followed && longest === 0 ? 0 : 1 + longest,
    })
  }
  const run = new Set<number>()
  let left = Math.max(
    0,
    ...upToStill(starts, still).map(({ length }) => length),
  )
  let last = -1
  for (const { index, place, length } of starts) {
    if (left > 0 && length === left && place > last) {
      run.add(index)
      last = place
      left--
    }
  }
  return run
}

/** The first of `starts` up to and with the first that is one of `still`. */
function upToStill<T extends { index: number }>(
  starts: readonly T[],
  still: ReadonlySet<number>,
): readonly T[] {
  const end = starts.findIndex(({ index }) => still.has(index))
  return end < 0 ? starts : starts.slice(0, end + 1)
}
