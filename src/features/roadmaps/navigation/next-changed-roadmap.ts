/**
 * The roadmap the navigation's count leads to (STY-055 S2): of `changed`, the roadmaps
 * with unpublished changes in the navigation's order, the one after `currentId`, and the
 * first from any other page, so choosing the count again and again reaches each in turn.
 * None where that is the roadmap already open, as when it is the only one, or where no
 * roadmap has changes.
 */
export function nextChangedRoadmap(
  changed: readonly string[],
  currentId: string | undefined,
): string | undefined {
  const at = currentId === undefined ? -1 : changed.indexOf(currentId)
  const next = changed[(at + 1) % changed.length]
  return next === currentId ? undefined : next
}
