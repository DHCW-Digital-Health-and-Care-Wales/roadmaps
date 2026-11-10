// Launches the Chromium the prototype scripts and their tests share: the one
// PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH names, else Playwright's own, else the
// cloud image's copy.
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
)
const { chromium } = createRequire(path.join(repo, "package.json"))(
  "@playwright/test",
)
const CLOUD_CHROMIUM = "/opt/pw-browsers/chromium"

export function launchChromium() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  return executablePath
    ? chromium.launch({ executablePath, chromiumSandbox: false })
    : chromium.launch().catch(() =>
        chromium.launch({
          executablePath: CLOUD_CHROMIUM,
          chromiumSandbox: false,
        }),
      )
}
