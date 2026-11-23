import type { Language } from "./languages"

/**
 * Each language's CLDR plural categories: Welsh has a form for 0, 1, 2, 3, 6 and
 * everything else. A test holds them to `Intl.PluralRules`.
 */
export const pluralCategories = {
  en: ["one", "other"],
  cy: ["zero", "one", "two", "few", "many", "other"],
} as const satisfies Record<Language, readonly Intl.LDMLPluralRule[]>

type PluralForm = (count: number) => string

/** Every plural form `L` uses, each a count's text. */
export type PluralForms<L extends Language> = Readonly<
  Record<(typeof pluralCategories)[L][number] | "other", PluralForm>
>

/**
 * A count's text, in the form `L`'s plural rules choose. It carries its language, so
 * a catalogue's type can require its own language's forms (`Catalogue`).
 */
export type Plural<L extends Language> = PluralForm & { readonly language: L }

/**
 * A count's text in `language`, from its plural forms, which type checking requires in
 * full. Counts are not formatted, so the prerendered page and the browser's render
 * give the same text.
 */
export function plural<L extends Language>(
  language: L,
  forms: PluralForms<L>,
): Plural<L> {
  const rules = new Intl.PluralRules(language)
  const byCategory: Partial<Record<Intl.LDMLPluralRule, PluralForm>> = forms
  const choose = (count: number) =>
    (byCategory[rules.select(count)] ?? forms.other)(count)
  return Object.assign(choose, { language })
}
