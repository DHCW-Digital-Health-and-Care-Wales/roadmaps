/** Lower case with accents removed: `Ŵ` folds to `w`. */
export function foldText(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
}
