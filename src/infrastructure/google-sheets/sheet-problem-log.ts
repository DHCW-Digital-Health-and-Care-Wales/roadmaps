/** A mistake in a tab, as data for a later sheet-health view (no prose). */
export interface SheetProblem<Code extends string> {
  code: Code
  /** The spreadsheet row, 1 being the header; `null` for a problem of the whole tab. */
  row: number | null
  /** The header as written, or the expected header when it is missing. */
  column: string | null
  /** The cell's trimmed value. */
  value: string | null
}

/** Where a problem is; whatever is not given is `null`. */
export type ProblemPlace = Partial<Omit<SheetProblem<string>, "code">>

/** Collects a tab's problems while it is parsed. */
export class ProblemLog<Code extends string> {
  readonly #problems: SheetProblem<Code>[] = []

  record(
    code: Code,
    { row = null, column = null, value = null }: ProblemPlace,
  ): void {
    this.#problems.push({ code, row, column, value })
  }

  /** Problems of the whole tab first, then by row; ties keep their order. */
  sorted(): SheetProblem<Code>[] {
    return this.#problems.toSorted((a, b) => (a.row ?? 0) - (b.row ?? 0))
  }
}
