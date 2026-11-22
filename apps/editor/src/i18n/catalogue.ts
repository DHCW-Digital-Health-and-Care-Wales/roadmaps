/** CLDR plural categories, as i18next suffixes them onto keys (`count_one`, `count_few`…). */
type PluralCategory = Intl.LDMLPluralRule

/**
 * The shape a translation of `Source` must have: the same nested keys with string values,
 * except that every plural key family (`count_one`, `count_other`…) is spelled out in the
 * plural categories of the target language. Assign with `satisfies`, so a missing or
 * extra key fails type checking.
 */
export type Catalogue<Source, Categories extends PluralCategory> = {
  readonly [
    Key in keyof Source &
      string as Key extends `${infer Base}_${PluralCategory}`
      ? `${Base}_${Categories}`
      : Key
  ]: Source[Key] extends string ? string : Catalogue<Source[Key], Categories>
}
