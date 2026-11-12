/** Lower case with accents removed: `Ŵ` folds to `w`. */
export function foldText(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
}

/**
 * A family's or category's name as names match (ADR-009, ADR-013): ignoring case,
 * accents, spaces and punctuation, so a typo in spacing does not split a family. Unlike
 * header matching, which is ASCII, letters and digits of any script count; a name with
 * none (only punctuation) is matched by its trimmed text instead.
 */
export function nameKey(name: string): string {
  const folded = foldText(name)
  return folded.replace(/[^\p{L}\p{N}]/gu, "") || folded.trim()
}
