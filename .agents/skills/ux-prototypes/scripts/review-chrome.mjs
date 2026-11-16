// The review page's chrome, assets/review-chrome.css and .js, for a page to
// inline: every prototype page carries the same bar and Options panel.
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const assets = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../assets",
)

export async function reviewChrome() {
  const [css, js] = await Promise.all(
    ["review-chrome.css", "review-chrome.js"].map((name) =>
      readFile(path.join(assets, name), "utf8"),
    ),
  )
  return { css, js }
}
