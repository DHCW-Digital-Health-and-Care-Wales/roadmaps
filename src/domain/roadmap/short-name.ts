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

/** What a short name can hold: letters, numbers, spaces and hyphens (STY-040 D8). */
const PERMITTED_CHARACTER = String.raw`[\p{L}\p{N} -]`
const PERMITTED = new RegExp(`^${PERMITTED_CHARACTER}+$`, "u")
const NOT_PERMITTED = new RegExp(`(?!${PERMITTED_CHARACTER}).`, "gsu")
/** A title's last word when it is "roadmap", which a short name leaves out. */
const FINAL_ROADMAP = /\s+roadmap\s*$/i

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

/**
 * The short name suggested for a roadmap with this title (STY-041 S3): the title without
 * a final "roadmap" (an English word, whatever the interface's language) and without
 * anything a short name can't hold, cut to the longest it can be. It can still have no
 * address, or be blank: `checkShortName` says so.
 */
export function suggestShortName(title: string): string {
  const name = title
    .normalize("NFC")
    .replace(FINAL_ROADMAP, "")
    .replace(NOT_PERMITTED, "")
    .replace(/ {2,}/g, " ")
    .trim()
  let kept = ""
  // By character, so a letter of two UTF-16 units is kept whole or not at all.
  for (const character of name) {
    if (kept.length + character.length > SHORT_NAME_MAX_LENGTH) break
    kept += character
  }
  return kept.trimEnd()
}

function problemWith(shortName: string): ShortNameProblem | undefined {
  if (shortName === "") return "blank"
  if (!PERMITTED.test(shortName)) return "invalid-character"
  // In UTF-16 units, so no way of counting characters makes it longer.
  if (shortName.length > SHORT_NAME_MAX_LENGTH) return "too-long"
  if (shortNameAddress(shortName) === "") return "no-address"
  return undefined
}
