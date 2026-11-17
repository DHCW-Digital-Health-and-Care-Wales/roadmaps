/** A word's first letter or number. */
const FIRST_LETTER_OR_NUMBER = /[\p{L}\p{N}]/u

/**
 * What the folded navigation shows for a roadmap (STY-054 D5): the first letter or
 * number of its title's first two words that have one, in capitals, so "Community
 * Nursing roadmap" is "CN". They begin its name in the rail, before its title, so
 * speech input can say what is shown (WCAG 2.5.3).
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
