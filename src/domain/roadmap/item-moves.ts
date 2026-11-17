/**
 * Where publishing a moved item puts it among the roadmap's items (ADR-014 and ADR-012,
 * _STY-051 amendments_): last in its new placement. Pure, and in items only, so every
 * `RoadmapRepository` moves the same ones; each finds what holds an item itself.
 */

/**
 * One item taken out of the roadmap's items and put back just after another, or just
 * before it. Each index is the item's place among the items as read, and the move is
 * made over what the moves before it left.
 */
export type ItemMove = { index: number } & (
  { after: number } | { before: number }
)

/**
 * The fewest moves that leave each item of `moved` last in its new placement, in the
 * order they were moved: after every item the placement holds as read, whoever added
 * it, bar one that is itself moving out. `placements` are the items' placements as
 * read, in order, `null` for an unplaced one; `moved` gives each moved item's index
 * among them and where it goes. An item already there is not moved (STY-051 S5): the
 * longest run of them in the order moved stays, the earliest moved of two such runs.
 * Each other one goes just after the item it follows, or, with none to follow, just
 * before the first that stays. No other placement's items change their order.
 */
export function planItemMoves(
  placements: readonly (string | null)[],
  moved: readonly { index: number; placement: string }[],
): ItemMove[] {
  // By index, so an item given twice is moved once, to where it was last sent.
  const movedTo = new Map(
    moved.map(({ index, placement }) => [index, placement]),
  )
  const moves: ItemMove[] = []
  let order = placements.map((_, index) => index)
  const at = (index: number) => order.indexOf(index)

  for (const placement of new Set(movedTo.values())) {
    const arriving = [...movedTo.keys()].filter(
      (index) => movedTo.get(index) === placement,
    )
    const lastStaying = order.findLast(
      (index) => placements[index] === placement && !movedTo.has(index),
    )
    const below =
      lastStaying === undefined
        ? arriving
        : arriving.filter((index) => at(index) > at(lastStaying))
    const staying = longestRun(below, at)
    const [firstStaying] = staying
    let previous = lastStaying
    for (const index of arriving) {
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
  // With no item to follow, every item arriving is in reach of the run, so it has one.
  if (first === undefined) throw new Error("A placement's run holds an item")
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
 * The longest run of `indexes`, taken in their order, that `at` puts in rising order:
 * of two as long, the one whose items come first.
 */
function longestRun(
  indexes: readonly number[],
  at: (index: number) => number,
): ReadonlySet<number> {
  const places = indexes.map(at)
  // The length of the longest run that starts with each.
  const lengths = places.map(() => 1)
  for (let i = places.length - 1; i >= 0; i--) {
    for (let j = i + 1; j < places.length; j++) {
      if ((places[j] ?? 0) > (places[i] ?? 0)) {
        lengths[i] = Math.max(lengths[i] ?? 1, (lengths[j] ?? 1) + 1)
      }
    }
  }
  const run = new Set<number>()
  let left = Math.max(0, ...lengths)
  let last = -1
  for (const [i, index] of indexes.entries()) {
    const place = places[i] ?? 0
    if (lengths[i] === left && place > last) {
      run.add(index)
      last = place
      left--
    }
  }
  return run
}
