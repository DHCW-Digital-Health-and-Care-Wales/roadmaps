/** A word's first letter or number. */
const FIRST_LETTER_OR_NUMBER = /[\p{L}\p{N}]/u

/**
 * What the folded navigation shows for a roadmap (STY-054 D5): the first letter or
 * number of its title's first two words that have one, in capitals, so "Community
 * Nursing roadmap" is "CN". A shown mark only: its name is the title.
 */
export function roadmapInitials(title: string): string {
  return title
    .split(/\s+/)
    .map((word) => FIRST_LETTER_OR_NUMBER.exec(word)?.[0])
    .filter((initial) => initial !== undefined)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
