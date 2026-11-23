/**
 * Reads a catalogue sentence that places content as an element (`<name />`, for
 * `<Trans>`) as plain words, the content's text standing where its element would: for an
 * attribute or a control's hidden words, which can't mark a part of themselves
 * (ADR-008). Spread into `t()`'s options beside the values: `{ name, ...AS_PLAIN_WORDS }`.
 */
export const AS_PLAIN_WORDS = {
  interpolation: { prefix: "<", suffix: "/>" },
} as const
