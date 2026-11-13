import type { ContentLanguage } from "@/domain/roadmap/localised-text"
import type { Organisation } from "@/domain/roadmap/organisation"

/**
 * The order every screen shows organisations in (ADR-014): the national one first, then
 * by `label`, the text that screen shows for each, compared as people read `language`
 * (Welsh sorts `ch`, `dd` and `ll` as letters). The repository promises no order, so a
 * screen sorts what it was given; `organisations` is not changed.
 */
export function sortOrganisations(
  organisations: readonly Organisation[],
  label: (organisation: Organisation) => string,
  language: ContentLanguage,
): Organisation[] {
  const collator = new Intl.Collator(language, { numeric: true })
  return [...organisations].sort(
    (a, b) =>
      Number(b.national) - Number(a.national) ||
      collator.compare(label(a), label(b)),
  )
}
