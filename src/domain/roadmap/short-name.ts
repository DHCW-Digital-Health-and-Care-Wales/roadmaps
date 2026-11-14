import { foldText } from "@/lib/text"

/** The longest name the data source can keep a roadmap's items under (STY-040 D10). */
export const SHORT_NAME_MAX_LENGTH = 100

/** Why a short name can't be used (STY-040 S1). */
export type ShortNameProblem =
  | "blank"
  /** It holds something other than a letter, a number, a space or a hyphen. */
  | "invalid-character"
  | "too-long"
  /** Its address would be empty: letters with no form in `a` to `z`, or none at all. */
  | "no-address"

const PERMITTED = /^[\p{L}\p{N} -]+$/u

/**
 * A roadmap's address, on the public site and here: the public site's slug of its short
 * name, so `Community Nursing` is `community-nursing` (ADR-009). Accents are folded and
 * only `a` to `z` and digits are kept, so two short names with the same address are the
 * same, and a name with neither has none (`""`).
 */
export function shortNameAddress(shortName: string): string {
  return foldText(shortName)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * The short name as it is kept, and what is wrong with it (STY-040 S1): trimmed, an
 * accent typed as a mark of its own joined to its letter, so `Môn` is allowed however
 * it was typed.
 */
export function checkShortName(typed: string): {
  shortName: string
  problem?: ShortNameProblem
} {
  const shortName = typed.trim().normalize("NFC")
  const problem = problemWith(shortName)
  return problem === undefined ? { shortName } : { shortName, problem }
}

function problemWith(shortName: string): ShortNameProblem | undefined {
  if (shortName === "") return "blank"
  if (!PERMITTED.test(shortName)) return "invalid-character"
  // In UTF-16 units, so no way of counting characters makes it longer.
  if (shortName.length > SHORT_NAME_MAX_LENGTH) return "too-long"
  if (shortNameAddress(shortName) === "") return "no-address"
  return undefined
}
