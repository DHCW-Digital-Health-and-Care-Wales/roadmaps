import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"
import { parse } from "yaml"

/**
 * main's ruleset requires one check, CI result, which passes unless a job it needs
 * failed (STY-087 D5, D11). A job left out of its needs could fail and still merge, and
 * a gate renamed away from the ruleset's check would block every merge. The owner's
 * bypass can merge past a failing gate, so deploy waits on it too.
 */
const ROOT = join(import.meta.dirname, "..")
const GATE = "ci-result"
/** Runs only after the gate, on a push to main. */
const AFTER_THE_GATE = new Set([GATE, "deploy"])
/** GitHub Actions' app, so a status posted by anything else cannot pass the check. */
const GITHUB_ACTIONS_INTEGRATION_ID = 15368

interface Job {
  name?: string
  needs?: string | string[]
  if?: string
  container?: { image?: string }
}
interface Workflow {
  jobs: Record<string, Job>
}
interface Ruleset {
  rules: {
    type: string
    parameters?: {
      required_status_checks?: { context: string; integration_id?: number }[]
    }
  }[]
}

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
}

const workflow = parse(read(".github/workflows/ci.yml")) as Workflow
const gate = workflow.jobs[GATE]
const ruleset = JSON.parse(read(".github/rulesets/main.json")) as Ruleset

describe("ci.yml's CI result gate", () => {
  it("needs every job that runs before it", () => {
    const needs = new Set([gate?.needs ?? []].flat())
    const missing = Object.keys(workflow.jobs).filter(
      (job) => !AFTER_THE_GATE.has(job) && !needs.has(job),
    )

    expect(
      missing,
      `Add ${missing.join(", ")} to the needs of ${GATE} in .github/workflows/ci.yml, ` +
        "or a failure there would not block a merge.",
    ).toEqual([])
  })

  it("runs whatever the jobs it needs did", () => {
    expect(gate?.if).toBe("always()")
  })
})

/**
 * deploy runs only once every job it needs has passed, the gate among them, so nothing
 * publishes past a failed or cancelled check. A push to main skips a job the gate needs
 * (Dependency review), and a condition with no status function takes GitHub's implicit
 * success(), which fails on a skipped job anywhere before it, so deploy never ran
 * (DEF-031). Its condition names the result of each job it needs instead.
 */
describe("ci.yml's deploy", () => {
  const deploy = workflow.jobs.deploy
  const needs = [deploy?.needs ?? []].flat()
  const terms = (deploy?.if ?? "").split("&&").map((term) => term.trim())

  it("needs the gate", () => {
    expect(needs).toContain(GATE)
  })

  it("runs only once every job it needs has passed", () => {
    // An `||` could run deploy whatever the jobs it needs did; always() or failure()
    // in place of !cancelled() would run it in a run cancelled after the gate passed.
    expect(deploy?.if).not.toMatch(/\|\||always\(|failure\(/)
    for (const job of needs) {
      const term = `needs.${job}.result == 'success'`
      expect(
        terms,
        `Add \`&& ${term}\` to deploy's if: in .github/workflows/ci.yml.`,
      ).toContain(term)
    }
  })

  it("runs only on a push to main", () => {
    expect(terms).toContain("github.event_name == 'push'")
    expect(terms).toContain("github.ref == 'refs/heads/main'")
  })

  it("runs even when a job before it skips by its event or paths", () => {
    expect(
      terms,
      "Without a status function, deploy is skipped whenever a job the gate needs is.",
    ).toContain("!cancelled()")
  })
})

describe("ci.yml's app jobs", () => {
  it("skip only on an explicit false from the changes job, so a missing output runs them", () => {
    const conditions = Object.values(workflow.jobs)
      .map((job) => job.if ?? "")
      .filter((condition) => condition.includes("needs.changes.outputs."))

    expect(conditions).not.toEqual([])
    for (const condition of conditions) {
      expect(condition).toMatch(/^needs\.changes\.outputs\.[\w-]+ != 'false'$/)
    }
  })

  it("is the one check main's ruleset requires, from GitHub Actions", () => {
    const checks = ruleset.rules
      .filter((rule) => rule.type === "required_status_checks")
      .flatMap((rule) => rule.parameters?.required_status_checks ?? [])

    expect(checks).toEqual([
      { context: gate?.name, integration_id: GITHUB_ACTIONS_INTEGRATION_ID },
    ])
  })
})

describe("ci.yml's E2E jobs", () => {
  it("run in one Playwright image, as both apps take @playwright/test from the catalog", () => {
    const images = Object.values(workflow.jobs).flatMap((job) => {
      const image = job.container?.image
      return image?.startsWith("mcr.microsoft.com/playwright:") ? [image] : []
    })

    expect(images.length).toBeGreaterThan(1)
    expect(
      new Set(images).size,
      "Give every E2E job in .github/workflows/ci.yml the same Playwright image tag and digest.",
    ).toBe(1)
  })
})

/**
 * product-roadmaps publishes the public site from main here, so it is protected as
 * main is, less the required check, which it has no CI to report (ADR-016, STY-088 S8).
 */
describe("product-roadmaps' ruleset", () => {
  it("is main's, less the required status check", () => {
    const productRoadmaps = JSON.parse(
      read(".github/rulesets/product-roadmaps.json"),
    ) as Ruleset

    expect(productRoadmaps).toEqual({
      ...ruleset,
      rules: ruleset.rules.filter(
        (rule) => rule.type !== "required_status_checks",
      ),
    })
  })
})
