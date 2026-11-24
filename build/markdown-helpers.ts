import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"

/** Repository root, shared by the root package's Markdown and guide tests. */
export const ROOT = join(import.meta.dirname, "..")

/** Fenced code block (backticks or tildes), closed by an equal-or-longer fence or EOF. */
export const CODE_FENCE_SOURCE =
  /^[ \t]*(?<fence>(?<mark>`|~)\k<mark>{2,})[^\n]*\n[\s\S]*?(?:^[ \t]*\k<fence>\k<mark>*[ \t]*$|(?![\s\S]))/
    .source

/** HTML comment span. */
export const HTML_COMMENT_SOURCE = /<!--[\s\S]*?-->/.source

/** Non-prose Markdown regions (code fences and HTML comments) stripped before scanning prose. */
export const SKIPPED_PROSE = new RegExp(
  `${CODE_FENCE_SOURCE}|${HTML_COMMENT_SOURCE}`,
  "gm",
)

/** Tracked and untracked non-ignored files on disk, optionally filtered by Git pathspecs. */
export function listRepositoryFiles(...pathspecs: string[]): string[] {
  const listing = execFileSync(
    "git",
    [
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
      ...pathspecs,
    ],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  )
  return listing
    .split("\0")
    .filter((path) => path !== "" && existsSync(join(ROOT, path)))
}
