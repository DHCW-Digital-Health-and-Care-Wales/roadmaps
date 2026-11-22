/** A calendar date as the domain holds one: `YYYY-MM-DD`, such as `2026-11-13`. */
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Whether `value` is a real calendar date written `YYYY-MM-DD`, as `lastUpdated` is. */
export function isCalendarDate(value: string): boolean {
  const [, year, month, day] = CALENDAR_DATE.exec(value) ?? []
  if (year === undefined || month === undefined || day === undefined) {
    return false
  }
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return date.toISOString().slice(0, 10) === value
}
