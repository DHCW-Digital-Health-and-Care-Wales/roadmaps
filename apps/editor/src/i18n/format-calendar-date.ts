import type { TFunction } from "i18next"

/** The catalogue's month names (`common.months`), in calendar order. */
const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const

/**
 * A calendar date (`YYYY-MM-DD`) written out in the language of `t`, e.g. "1 October 2026"
 * or "1 Hydref 2026"; `undefined` when it isn't one. The month names come from the
 * catalogues rather than the browser, which may lack Welsh locale data, and a date has
 * no time zone, so it never shifts a day with the reader's.
 */
export function formatCalendarDate(
  date: string,
  t: TFunction,
): string | undefined {
  const [, year, month, day] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date) ?? []
  const monthKey = MONTH_KEYS[Number(month) - 1]
  if (!year || !day || !monthKey) return undefined
  return t("common.date", {
    day: Number(day),
    month: t(`common.months.${monthKey}`),
    year,
  })
}
