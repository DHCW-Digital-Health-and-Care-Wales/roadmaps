import type { TFunction } from "i18next"

/**
 * A whole number of seconds written out in the language of `t`, e.g. "1 minute and 49
 * seconds" or "1 munud a 49 eiliad". A part that is zero is left out ("2 minutes").
 */
export function formatDuration(totalSeconds: number, t: TFunction): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return t("common.duration.seconds", { count: seconds })
  if (seconds === 0) return t("common.duration.minutes", { count: minutes })
  return t("common.duration.minutesAndSeconds", { minutes, seconds })
}
