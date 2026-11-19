/**
 * A Playwright test never slows the machine it runs on. DEF-020 first redded a race by
 * throttling the CPU in a committed test; it was rejected as a test that passes or fails
 * with the runner's speed. Redden a race by what it does: sample every frame, hold a
 * request with `page.route`, or move `page.clock`. Busy work is not caught here, since
 * lint cannot read it. Review by 2027-02-17 whether it has caught any since.
 */
import type { Linter } from "eslint"

export const e2eRules: Linter.Config[] = [
  {
    files: ["tests/e2e/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/CPUThrottlingRate/]",
          message:
            "Do not slow the CPU in a test, nor load it with busy work: redden a race by sampling frames, holding a request or moving page.clock.",
        },
      ],
    },
  },
]
