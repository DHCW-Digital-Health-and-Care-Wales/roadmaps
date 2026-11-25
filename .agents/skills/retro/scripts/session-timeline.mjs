#!/usr/bin/env node
// Where a Claude Code session's wall-clock time went, read from its log: its
// milestones, the commands it ran grouped by kind, what its test runners
// reported, its background work and the waits between. It reads only what the
// session did; it never re-runs a command to time it.
//
//   node .agents/skills/retro/scripts/session-timeline.mjs [session.jsonl]
//     [--top N] [--gap SECONDS]
//
// With no path it reads the newest log for the current directory, under
// <config>/projects/<the directory, each non-alphanumeric character as ->,
// where <config> is $CLAUDE_CONFIG_DIR, or ~/.claude when that is unset.
// Pass the primary task's log when a retro runs in a later session.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

const USAGE =
  "usage: session-timeline.mjs [session.jsonl] [--top N] [--gap SECONDS]"

/**
 * Each whole-suite kind and the kind its runs count as when scoped to some
 * tests, so a suite's median is a whole run's and a targeted run keeps its
 * runner.
 */
const SCOPED = {
  "Vitest suite (full)": "Vitest tests (targeted)",
  "E2E suite (full)": "E2E tests (targeted)",
  "pytest suite (full)": "pytest tests (targeted)",
}

/** Kinds of test run, whose runner summaries are worth reading. */
const TEST_KINDS = new Set([
  ...Object.keys(SCOPED),
  ...Object.values(SCOPED),
  "Script tests",
])

/**
 * Kinds of command worth timing, matched against each command of a foreground
 * Bash call's chain. A call can match several kinds when it chains them. A
 * targeted kind with no pattern of its own is reached only through `SCOPED`.
 */
const NEVER = /(?!)/

/**
 * `pnpm api:test`, or pytest as the command run, never a word a search, an
 * install or a path names: after `uv run` and its options, after `python -m`
 * or `coverage run -m`, or where a command starts, past `VAR=…`, `timeout N`
 * and a path. Asking for its help or version runs no tests.
 */
const PYTEST_RUN = new RegExp(
  [
    String.raw`\bpnpm (?:run )?api:test\b(?![:\w-])`,
    "(?:" +
      [
        String.raw`\buv run(?:\s+-\S+(?:\s+[^-\s]\S*)?)*\s+`,
        String.raw`\b(?:python3?|coverage run)\s+-m\s+`,
        String.raw`(?:^|\(|\bdo|\bthen)\s*(?:\w+=\S*\s+)*(?:timeout\s+\d+\s+)?(?:\S*\/)?`,
      ].join("|") +
      String.raw`)pytest(?![-\w])(?!\s+(?:--help|--version|-h)\b)`,
  ].join("|"),
)
const KINDS = [
  [
    "Vitest suite (full)",
    // `pnpm test`, a JavaScript package's (not `test:e2e` or `test:watch`),
    // or `vitest run`; the scope rule in `kindsOf` catches a narrowed run.
    /\bpnpm (?:run )?(?:(?:editor|site|repo):)?test\b(?![:\w-])|\bvitest run\b/,
  ],
  ["Vitest tests (targeted)", /\bvitest related\b|\bpnpm (?:run )?test:docs\b/],
  ["E2E suite (full)", /\btest:e2e\b|\bplaywright test\b/],
  ["E2E tests (targeted)", NEVER],
  ["pytest suite (full)", PYTEST_RUN],
  ["pytest tests (targeted)", NEVER],
  ["Script tests", /\bnode --test\b/],
  ["Type checks", /\btsc\b|\btypecheck\b|\bty check\b/],
  ["Builds", /\bpnpm (?:run )?(?:\w+:)?build\b(?!:)|\bvite build\b/],
  [
    "Lint",
    /\bpnpm (?:run )?(?:\w+:)?lint\b|\beslint\b|\bruff check\b|\blint-imports\b/,
  ],
  ["Format", /\bprettier\b|\bpnpm (?:run )?(?:\w+:)?format\b|\bruff format\b/],
  ["Workflow lint", /\bactionlint\b/],
  [
    "Dev server start-up",
    /\bpnpm (?:run )?(?:\w+:)?(?:dev|preview)\b|\bvite (?:dev|preview|serve)\b/,
  ],
  [
    "Dependency install",
    /\bpnpm (?:install|add)\b|\bplaywright install\b|\buv (?:add|sync)\b/,
  ],
  ["Git and GitHub", /^\s*(?:git|gh)\s(?!.*--watch\b)(?!\s*run watch\b)/],
  ["CI watches", /\bgh (?:pr checks\b.*--watch|run watch)\b/],
  ["Deliberate waits", /tail -f \/dev\/null|\bsleep \d|^\s*until\b/],
]

const MILESTONES = [
  ["commit", /\bgit commit\b/],
  ["push", /\bgit push\b/],
  ["PR opened", /\bgh pr create\b|\/pulls -f title/],
  ["merge", /\bgh pr merge\b|\/merge\b.*merge_method/],
]

/** What a test runner prints as its own summary of how long it took. */
const RUNNER_DURATIONS = [
  ["Vitest", /^\s*Duration\s+([\d.]+)(m?s)\b/gm],
  ["Playwright", /\b\d+ (?:passed|failed) \(([\d.]+)(m|s)\)/gm],
  // Its last line, `236 passed in 12.26s`, inside `=` banners unless `-q`.
  ["pytest", /^=*\s*(?:\d+ \w+, )*\d+ \w+ in ([\d.]+)(s)\b/gm],
  // TAP (`#`) or the spec reporter (`ℹ`), in milliseconds: the empty group
  // gives `runnerMs` no unit.
  ["node --test", /^(?:# |ℹ )duration_ms ([\d.]+)()$/gm],
]

/** What ended a wait, kept apart from the words a reader sees. */
const ENDED_BY = {
  ownCommand: "a foreground command returning (timed under its kind)",
  backgroundTask: "a background task finishing",
  prUpdate: "a PR update",
  person: "a person's message",
  model: "the model's own reply",
}

/**
 * A command's words, as a shell would run them: a `bash -c` body is kept and
 * any other quoted string, heredoc body or file name blanked, so `grep
 * '"build"'`, a log named `lint.log`, a redirect or a script's source is not
 * taken for the step it names. A test file becomes `test-file`, which marks a scoped
 * run. An apostrophe in an unquoted word, or a quote nested in a `bash -c`
 * body, can blank more than it should.
 */
export function commandWords(command) {
  return command
    .replace(/<<-?\s*['"]?(\w+)['"]?[^\n]*\n[\s\S]*?\n\1\b/g, "<<heredoc")
    .replace(/\b(?:ba|z)?sh\s+-\w*c\s+(['"])([\s\S]*?)\1/g, " $2 ")
    .replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "''")
    .replace(/\d*>>?(?:&\d+|\s*[^\s;&|()]+)|(?<!<)<(?!<)\s*[^\s;&|()]+/g, " ")
    .replace(
      /[^\s;&|()]+\.(?:test|spec)\.[A-Za-z]\w*[^\s;&|()]*|[^\s;&|()]*\btest_\w*\.py\b[^\s;&|()]*/g,
      " test-file ",
    )
    .replace(/[^\s;&|()]*\.[A-Za-z]\w*\b/g, " ")
}

/**
 * Whether a test command runs only some tests: it names a test file, or a
 * path follows the runner's own word, as in `vitest run src/features/auth/`
 * or `playwright test tests/e2e/auth.spec.ts`. Only paths and files mark a
 * scope: a name filter (`vitest run roadmaps`, `-t name`, `--grep name`,
 * pytest's `-k name` or `-m mark`)
 * counts as the suite, and a later argument holding a `/` can mark one
 * wrongly.
 */
function isScoped(command) {
  if (/\btest-file\b/.test(command)) return true
  const [, ...after] = command.split(
    /\b(?:vitest(?: run)?|playwright test|pytest|test)\b/,
  )
  return after
    .join(" ")
    .split(/\s+/)
    .some((word) => word.includes("/") && !/^[-@]/.test(word))
}

/**
 * The kinds a call ran, matching each command of its chain on its own. A
 * suite run scoped to some tests is targeted, so a suite's median is a whole
 * run's.
 */
function kindsOf(words) {
  const ran = new Set()
  for (const command of words.split(/&&|\|\||[;|\n]/)) {
    for (const [kind, pattern] of KINDS) {
      if (!pattern.test(command)) continue
      ran.add(
        Object.hasOwn(SCOPED, kind) && isScoped(command) ? SCOPED[kind] : kind,
      )
    }
  }
  return KINDS.map(([kind]) => kind).filter((kind) => ran.has(kind))
}

/** The log's entries that carry a valid time, in order. */
export function parseLog(raw) {
  const entries = []
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    const at = Date.parse(entry.timestamp)
    if (!Number.isNaN(at)) entries.push({ ...entry, at })
  }
  if (!entries.some((e) => e.type === "assistant" || e.type === "user")) {
    throw new Error(
      "not a Claude Code session log: no timestamped user or assistant entries",
    )
  }
  return entries.sort((a, b) => a.at - b.at)
}

function blocks(entry) {
  const content = entry.message?.content
  return Array.isArray(content) ? content : []
}

function entryText(entry) {
  if (entry.type === "queue-operation") return String(entry.content ?? "")
  const content = entry.message?.content
  if (typeof content === "string") return content
  return blocks(entry)
    .map((b) => (typeof b.text === "string" ? b.text : ""))
    .join("\n")
}

function resultText(block) {
  if (typeof block.content === "string") return block.content
  return (block.content ?? []).map((c) => c.text ?? "").join("\n")
}

function describe(name, input = {}) {
  const raw =
    input.description ??
    input.command ??
    input.summary ??
    input.prompt ??
    input.url ??
    ""
  return `${name}: ${String(raw).replace(/\s+/g, " ").trim()}`.slice(0, 90)
}

/** What a user or queued entry is, as a key of `ENDED_BY`. */
function arrival(entry) {
  if (blocks(entry).some((b) => b.type === "tool_result")) return "ownCommand"
  const said = entryText(entry)
  if (said.includes("<task-notification>")) return "backgroundTask"
  if (said.startsWith("Update on pull request")) return "prUpdate"
  return "person"
}

function runnerMs(value, unit) {
  const n = Number(value)
  // `node --test` prints milliseconds with no unit.
  return unit === "m" ? n * 60_000 : unit === "s" ? n * 1000 : n
}

/** Each tool call with its timing, the session's milestones and runner reports. */
export function collectCalls(entries) {
  const calls = new Map()
  const milestones = []
  const runners = []
  const linked = new Set()
  for (const entry of entries) {
    if (entry.type === "pr-link" && !linked.has(entry.prNumber)) {
      linked.add(entry.prNumber)
      milestones.push({ at: entry.at, label: `PR #${entry.prNumber} linked` })
    }
    if (entry.type === "user" && arrival(entry) === "prUpdate") {
      const [first, second = ""] = entryText(entry).split("\n")
      const pr = first.match(/#\d+/)?.[0] ?? "PR"
      const what = second.replace(/^- /, "").replace(/:$/, "")
      milestones.push({ at: entry.at, label: `${pr}: ${what}` })
    }
    for (const block of blocks(entry)) {
      if (entry.type === "assistant" && block.type === "tool_use") {
        const words = commandWords(block.input?.command ?? "")
        calls.set(block.id, {
          name: block.name,
          label: describe(block.name, block.input),
          words,
          kinds: block.name === "Bash" ? kindsOf(words) : [],
          start: entry.at,
          background:
            block.input?.run_in_background === true ||
            (block.name === "Agent" &&
              block.input?.run_in_background !== false),
        })
      }
      if (block.type === "tool_result" && calls.has(block.tool_use_id)) {
        const call = calls.get(block.tool_use_id)
        call.ms = entry.at - call.start
        if (call.name !== "Bash") continue
        // A commit or push happened when it returned, and only if it worked.
        if (!block.is_error) {
          for (const [label, pattern] of MILESTONES) {
            if (pattern.test(call.words))
              milestones.push({ at: entry.at, label })
          }
        }
        // A runner's summary counts only from a call that ran tests, not one
        // that read an earlier run's log back.
        const ranTests = call.kinds.some((kind) => TEST_KINDS.has(kind))
        if (!ranTests || call.background) continue
        const output = resultText(block)
        for (const [runner, pattern] of RUNNER_DURATIONS) {
          for (const match of output.matchAll(pattern)) {
            call.reported = true
            runners.push({
              runner,
              at: call.start,
              ms: runnerMs(match[1], match[2]),
              label: call.label,
            })
          }
        }
      }
    }
    // A background task's notice names the call that started it; the first
    // notice is when it ended, and an agent's own duration is its run time.
    if (entry.type !== "user" && entry.type !== "queue-operation") continue
    const notice = entryText(entry)
    const id = notice.match(/<tool-use-id>([^<]+)<\/tool-use-id>/)?.[1]
    const call = id && calls.get(id)
    if (call && call.ranMs === undefined && call.background) {
      const ran = notice.match(/<duration_ms>(\d+)<\/duration_ms>/)
      call.ranMs = ran ? Number(ran[1]) : entry.at - call.start
    }
  }
  return {
    calls: [...calls.values()],
    milestones: milestones.sort((a, b) => a.at - b.at),
    runners,
  }
}

/** The lower middle value, so the median is always a run that happened. */
function lowerMedian(values) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) / 2)]
}

/**
 * Foreground Bash calls by kind. _Alone_ runs matched no other kind, so their
 * median is the cleanest measure of that kind; a chained call counts under
 * each kind it ran, and once in `uniqueMs`.
 */
export function summariseCommands(calls) {
  const timed = calls.filter(
    (c) => c.name === "Bash" && !c.background && c.ms !== undefined,
  )
  const matched = timed.filter((c) => c.kinds.length > 0)
  const tests = matched.filter((c) => c.kinds.some((k) => TEST_KINDS.has(k)))
  return {
    // A chained call counts once here, however many kinds it ran.
    uniqueMs: matched.reduce((sum, c) => sum + c.ms, 0),
    unreportedTests: tests.filter((c) => !c.reported).length,
    kinds: summariseEachKind(timed),
  }
}

/** Each kind's calls, total, longest run and median of runs that ran alone. */
function summariseEachKind(timed) {
  return KINDS.map(([kind]) => {
    const runs = timed.filter((c) => c.kinds.includes(kind))
    const alone = runs.filter((c) => c.kinds.length === 1)
    return {
      kind,
      count: runs.length,
      alone: alone.length,
      totalMs: runs.reduce((sum, c) => sum + c.ms, 0),
      longestMs: Math.max(0, ...runs.map((c) => c.ms)),
      medianAloneMs: lowerMedian(alone.map((c) => c.ms)),
    }
  }).filter((k) => k.count > 0)
}

/**
 * Gaps of at least `gapSeconds` between the entries that mean something to a
 * reader: the model's turns, tool results, queued and user messages. Log
 * bookkeeping between them, such as a PR link written mid-call, is skipped.
 */
export function findWaits(entries, gapSeconds) {
  const meaningful = entries.filter((e) =>
    ["assistant", "user", "queue-operation"].includes(e.type),
  )
  const waits = []
  for (let i = 1; i < meaningful.length; i++) {
    const ms = meaningful[i].at - meaningful[i - 1].at
    if (ms < gapSeconds * 1000) continue
    const next = meaningful[i]
    waits.push({
      start: meaningful[i - 1].at,
      ms,
      endedBy: next.type === "assistant" ? "model" : arrival(next),
    })
  }
  return waits.sort((a, b) => b.ms - a.ms)
}

/** The session's timeline, ready for `renderMarkdown`. */
export function buildTimeline(entries, { gapSeconds = 120 } = {}) {
  const { calls, milestones, runners } = collectCalls(entries)
  const waits = findWaits(entries, gapSeconds)
  const waitsBy = {}
  for (const w of waits) waitsBy[w.endedBy] = (waitsBy[w.endedBy] ?? 0) + w.ms
  const perTool = {}
  for (const c of calls) {
    if (c.ms !== undefined) perTool[c.name] = (perTool[c.name] ?? 0) + c.ms
  }
  return {
    start: entries[0].at,
    end: entries.at(-1).at,
    milestones,
    ...summariseCommands(calls),
    runners,
    background: calls
      .filter((c) => c.ranMs !== undefined)
      .map((c) => ({ label: c.label, start: c.start, ms: c.ranMs }))
      .sort((a, b) => b.ms - a.ms),
    waits,
    waitsBy,
    longest: calls
      .filter((c) => c.ms !== undefined)
      .sort((a, b) => b.ms - a.ms),
    perTool,
  }
}

export function duration(ms) {
  if (ms === null) return "–"
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`
}

function clock(at) {
  return new Date(at).toISOString().slice(11, 19) + "Z"
}

function table(headers, rows) {
  const cell = (value) => String(value).replaceAll("|", "\\|")
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ]
}

/** The timeline as Markdown, `top` rows to a long table. */
export function renderMarkdown(t, { top = 15 } = {}) {
  let previous = t.start
  const milestoneRows = t.milestones.map((m) => {
    const row = [
      clock(m.at),
      duration(m.at - t.start),
      duration(m.at - previous),
      m.label,
    ]
    previous = m.at
    return row
  })
  return [
    `# Session timeline`,
    ``,
    `${new Date(t.start).toISOString().slice(0, 10)}, ${clock(t.start)} to ${clock(t.end)}: ${duration(t.end - t.start)}.`,
    ``,
    `## Milestones`,
    ``,
    ...table(
      ["At", "Since start", "Since previous", "Milestone"],
      milestoneRows,
    ),
    ``,
    `## Commands by kind`,
    ``,
    `Foreground Bash calls. A call that chains kinds counts under each, so the`,
    `totals overlap; _alone_ runs matched no other kind, so their median is the`,
    `cleanest measure. Together these calls took ${duration(t.uniqueMs)}.`,
    ``,
    ...table(
      ["Kind", "Calls (alone)", "Total", "Longest", "Median alone"],
      t.kinds.map((k) => [
        k.kind,
        `${k.count} (${k.alone})`,
        duration(k.totalMs),
        duration(k.longestMs),
        duration(k.medianAloneMs),
      ]),
    ),
    ``,
    `## What the test runners reported`,
    ``,
    `Each runner's own summary, from calls that ran tests and kept it in their`,
    `output. No runner summary for ${t.unreportedTests} test calls, so only their`,
    `wall-clock time above measures them.`,
    ``,
    ...table(
      ["Started", "Runner", "Took", "Call"],
      t.runners.map((r) => [clock(r.at), r.runner, duration(r.ms), r.label]),
    ),
    ``,
    `## Background work`,
    ``,
    ...table(
      ["Started", "Ran for", "Task"],
      t.background
        .slice(0, top)
        .map((b) => [clock(b.start), duration(b.ms), b.label]),
    ),
    ``,
    `## Waits`,
    ``,
    `Gaps between the session's turns, by what ended them:`,
    ``,
    ...Object.entries(t.waitsBy)
      .sort((a, b) => b[1] - a[1])
      .map(([key, ms]) => `- ${ENDED_BY[key]}: ${duration(ms)}`),
    ``,
    ...table(
      ["From", "Waited", "Ended by"],
      t.waits
        .slice(0, top)
        .map((w) => [clock(w.start), duration(w.ms), ENDED_BY[w.endedBy]]),
    ),
    ``,
    `## Longest tool calls`,
    ``,
    ...table(
      ["Started", "Took", "Call"],
      t.longest
        .slice(0, top)
        .map((c) => [clock(c.start), duration(c.ms), c.label]),
    ),
    ``,
    `## Time in tool calls`,
    ``,
    ...Object.entries(t.perTool)
      .filter(([, ms]) => ms >= 1000)
      .sort((a, b) => b[1] - a[1])
      .map(([name, ms]) => `- ${name}: ${duration(ms)}`),
    ``,
  ].join("\n")
}

/**
 * The newest session log for a working directory, in Claude Code's config
 * directory: `$CLAUDE_CONFIG_DIR`, or `.claude` in the home directory.
 */
export function newestLog(cwd, home = homedir(), env = process.env) {
  const config = env.CLAUDE_CONFIG_DIR || join(home, ".claude")
  const dir = join(config, "projects", cwd.replace(/[^a-zA-Z0-9]/g, "-"))
  const logs = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".jsonl"))
        .map((f) => join(dir, f))
        .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
    : []
  if (logs.length === 0)
    throw new Error(`no Claude Code session logs in ${dir}`)
  return logs[0]
}

function count(value, flag) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(
      `${flag} needs a whole number, not ${JSON.stringify(value)}`,
    )
  }
  return n
}

/** The report for the command line's arguments. */
export function run(args, cwd = process.cwd()) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      top: { type: "string", default: "15" },
      gap: { type: "string", default: "120" },
      help: { type: "boolean", default: false },
    },
  })
  if (values.help) return `${USAGE}\n`
  if (positionals.length > 1) throw new Error(USAGE)
  const gapSeconds = count(values.gap, "--gap")
  const top = count(values.top, "--top")
  const path = positionals[0] ?? newestLog(cwd)
  const timeline = buildTimeline(parseLog(readFileSync(path, "utf8")), {
    gapSeconds,
  })
  return renderMarkdown(timeline, { top })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(run(process.argv.slice(2)))
  } catch (error) {
    process.stderr.write(`session-timeline: ${error.message}\n`)
    process.exit(1)
  }
}
