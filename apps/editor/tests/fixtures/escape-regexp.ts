/**
 * Escapes `text` so a `RegExp` built from it matches it literally (test code only).
 * Give way to the built-in `RegExp.escape` once the TypeScript target and every supported
 * Node have it (ES2025, Node 24).
 */
export function escapeRegExp(text: string): string {
  return text.replace(/[\\^$.*+?()[\]{}|/-]/g, String.raw`\$&`)
}
