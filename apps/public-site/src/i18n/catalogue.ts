import type { Language } from "./languages"
import type { Plural } from "./plural"

/**
 * The shape the `L` translation of `Source` must have: the same nested keys, with a
 * string for each string, a count in `L`'s plural forms for each count, and the same
 * signature for each other function (a value filled in, or a sentence around an
 * element). Assign with `satisfies`, so a missing or extra key, a function of another
 * shape, or a count in another language's forms fails type checking.
 */
export type Catalogue<Source, L extends Language> = {
  readonly [Key in keyof Source]: Source[Key] extends string
    ? string
    : Source[Key] extends Plural<Language>
      ? Plural<L>
      : Source[Key] extends (...args: never[]) => unknown
        ? Source[Key]
        : Catalogue<Source[Key], L>
}
