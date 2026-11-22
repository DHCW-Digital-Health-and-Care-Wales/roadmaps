/**
 * Playwright lint rules, each a race a test has lost in CI.
 *
 * A Playwright test never slows the machine it runs on. DEF-020 first redded a race by
 * throttling the CPU in a committed test; it was rejected as a test that passes or fails
 * with the runner's speed. Redden a race by what it does: sample every frame, hold a
 * request with `page.route`, or move `page.clock`. Busy work is not caught here, since
 * lint cannot read it. Review by 2027-02-17 whether it has caught any since.
 *
 * A test reads a box through `boxOf` or `boxesOf` (`tests/e2e/fixtures/layout.ts`), never
 * `boundingBox()`: they read once nothing animates and the element is laid out, where
 * `boundingBox()` reads a dialog mid-slide or a row mid-move.
 */
import type { Linter } from "eslint"

const noThrottling = {
  selector:
    ":matches(Literal[value=/CPUThrottlingRate/], TemplateElement[value.cooked=/CPUThrottlingRate/])",
  message:
    "Do not slow the CPU in a test, nor load it with busy work: redden a race by sampling frames, holding a request or moving page.clock.",
}

const noBoundingBox = {
  selector: "CallExpression[callee.property.name='boundingBox']",
  message:
    "Read a box with boxOf or boxesOf (tests/e2e/fixtures/layout.ts): they wait for the page's animations and for layout.",
}

export const e2eRules: Linter.Config[] = [
  {
    files: ["tests/e2e/**/*.ts"],
    rules: {
      "no-restricted-syntax": ["error", noThrottling, noBoundingBox],
    },
  },
]
