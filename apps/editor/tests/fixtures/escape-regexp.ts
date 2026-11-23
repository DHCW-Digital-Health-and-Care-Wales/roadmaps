/**
 * Escapes `text` so a `RegExp` built from it matches it literally, with or without the
 * `u` or `v` flag (test code only). Use it outside a character class. A hyphen becomes
 * `\x2d`, as `RegExp.escape` writes it. Give way to the built-in `RegExp.escape` once the
 * TypeScript target has it (ES2025).
 */
export function escapeRegExp(text: string): string {
  return text
    .replace(/[\\^$.*+?()[\]{}|/]/g, String.raw`\$&`)
    .replaceAll("-", String.raw`\x2d`)
}
