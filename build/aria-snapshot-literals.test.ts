import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Every aria snapshot holds the literal text the E2E fixtures fix. Playwright's
 * `--update-snapshots` rewrites each snapshot it touches with checks dropped: a number,
 * duration or ID becomes a pattern (`2026-10-01` to `/\d+-\d+-\d+/`) that matches any
 * other, and text that is part of a control's name becomes `text: ""`, which matches any
 * text (tests/e2e/AGENTS.md, Look checks). Both still pass, so only this test sees them.
 * Incident: in November 2026 five deliveries' snapshot updates wrote such patterns, each
 * found by reading the YAML diff, the last a dialog's date field. Review by February 2027
 * whether it has caught any since.
 */
const SNAPSHOTS = join(
  import.meta.dirname,
  "..",
  "tests",
  "e2e",
  "structure.spec.ts-snapshots",
)

/** Patterns a snapshot keeps on purpose, by file: text the fixtures cannot fix. */
const KEPT: Record<string, string[]> = {
  // The countdown ticks while the snapshot is taken.
  "session-warning.aria.yml": [
    "/Your session ends in 1 minute and \\d+ seconds\\. After that, you'll need to reconnect\\./",
  ],
}

/** A node's key (its role and name) and its raw value, the key's YAML quotes undone. */
function splitKeyAndValue(body: string): { key: string; value: string } {
  // A single-quoted key doubles each apostrophe in it.
  const quoted = /^'((?:[^']|'')*)'/.exec(body)
  if (quoted?.[1] !== undefined) {
    return {
      key: quoted[1].replaceAll("''", "'"),
      value: body.slice(quoted[0].length).replace(/^:\s?/, ""),
    }
  }
  const colon = /:(\s|$)/.exec(body)
  if (!colon) return { key: body, value: "" }
  return {
    key: body.slice(0, colon.index),
    value: body.slice(colon.index + 1).trimStart(),
  }
}

/** A YAML value as Playwright reads it: a double-quoted one unescaped. */
function unquote(value: string): string {
  if (!value.startsWith('"')) return value
  try {
    return JSON.parse(value) as string
  } catch {
    return value.slice(1, -1)
  }
}

/** What an update wrote in place of a literal on one snapshot line, if anything. */
function looseCheck(line: string): string | undefined {
  const node = /^\s*- (.*)$/.exec(line)
  if (!node?.[1]) return undefined
  const { key, value } = splitKeyAndValue(node[1])
  // A property (`/url`, `/children`) holds no text of the screen's own.
  if (key.startsWith("/")) return undefined
  const name = /^[a-z]+ (\/(?:\\.|[^\\/])+\/)(?: \[|$)/.exec(key)
  if (name?.[1]) return name[1]
  if (value === '""') return 'text: ""'
  const text = unquote(value)
  return /^\/.+\/$/.test(text) ? text : undefined
}

describe("looseCheck", () => {
  it.each([
    ['- textbox "Roadmap last updated": /\\d+-\\d+-\\d+/', "/\\d+-\\d+-\\d+/"],
    ["- paragraph: /1 October \\d+/", "/1 October \\d+/"],
    ["    - text: /Updated \\d+ items/", "/Updated \\d+ items/"],
    ['- paragraph: "/Time: \\\\d+/"', "/Time: \\d+/"],
    ["- heading /Roadmap \\d+/ [level=2]", "/Roadmap \\d+/"],
    ["- 'heading /Now: \\d+ items/ [level=2]'", "/Now: \\d+ items/"],
    ["- link /Item \\d+/:", "/Item \\d+/"],
    ['      - text: ""', 'text: ""'],
    [
      "- 'heading /You''ll publish: \\d+ items/ [level=2]'",
      "/You'll publish: \\d+ items/",
    ],
    [
      "- 'textbox \"Dyddiad diweddaru''r map: dyddiad\"': /\\d+-\\d+-\\d+/",
      "/\\d+-\\d+-\\d+/",
    ],
    ["- 'link \"Don''t: x\"': \"\"", 'text: ""'],
  ])("reads %s as loose", (line, check) => {
    expect(looseCheck(line)).toBe(check)
  })

  it.each([
    '- textbox "Roadmap last updated": 2026-10-01',
    '- button "Add Service X, on 2 other items": Service X',
    "- 'button \"Keep mine Product details: Vision\"'",
    "- 'group \"In Now: 1 of 3\"':",
    "- 'button \"Cau''r neges: Vision\"'",
    '- link "Docs /help/"',
    "- paragraph: and/or",
    "- paragraph: /roadmaps is where it lives",
    '- dialog "Edit this item":',
    '- button "Close"',
    "  - /url: /#main",
    "- /children: deep-equal",
    "- text: Title",
  ])("reads %s as literal", (line) => {
    expect(looseCheck(line)).toBeUndefined()
  })
})

describe("the aria snapshots", () => {
  const files = readdirSync(SNAPSHOTS).filter((name) =>
    name.endsWith(".aria.yml"),
  )
  const loose = files.flatMap((file) =>
    readFileSync(join(SNAPSHOTS, file), "utf8")
      .split("\n")
      .map((line, index) => ({
        file,
        line: index + 1,
        check: looseCheck(line),
      }))
      .filter(
        (each): each is { file: string; line: number; check: string } =>
          each.check !== undefined,
      ),
  )

  it("hold the literals the fixtures fix", () => {
    expect(files, "No aria snapshot was found").not.toEqual([])
    const unkept = loose
      .filter(({ file, check }) => !KEPT[file]?.includes(check))
      .map(({ file, line, check }) => `${file}:${String(line)} ${check}`)
    expect(
      unkept,
      "An update wrote a pattern or an empty text where the fixtures fix the text: put back the literal from the git diff",
    ).toEqual([])
  })

  it("still hold each pattern kept on purpose", () => {
    const stale = Object.entries(KEPT).flatMap(([file, checks]) =>
      checks
        .filter(
          (check) =>
            !loose.some((each) => each.file === file && each.check === check),
        )
        .map((check) => `${file} ${check}`),
    )
    expect(stale, "A kept pattern is gone: replace or drop it in KEPT").toEqual(
      [],
    )
  })
})
