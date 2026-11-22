/**
 * Today's date by the browser's own clock and time zone, `YYYY-MM-DD` (STY-036 D11): for
 * "Today", the "Mark as updated today" tick box and the latest date a roadmap's
 * `Last updated` may be set to. Never UTC's date, which differs near midnight.
 *
 * CHO-005: the future database API takes this date in UTC; convert it at that adapter.
 */
export function localToday(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${String(now.getFullYear())}-${month}-${day}`
}
