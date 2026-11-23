/**
 * The shape a translation of `Source` must have: the same nested keys, with a string
 * for each string and the same signature for each function (a value filled in, a
 * sentence around an element, or a count's plural forms). Assign with `satisfies`, so a
 * missing or extra key, or a function of another shape, fails type checking.
 */
export type Catalogue<Source> = {
  readonly [Key in keyof Source]: Source[Key] extends string
    ? string
    : Source[Key] extends (...args: never[]) => unknown
      ? Source[Key]
      : Catalogue<Source[Key]>
}
