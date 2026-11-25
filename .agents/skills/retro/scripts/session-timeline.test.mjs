import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import {
  buildTimeline,
  commandWords,
  duration,
  newestLog,
  parseLog,
  renderMarkdown,
  run,
} from "./session-timeline.mjs"

const script = fileURLToPath(new URL("./session-timeline.mjs", import.meta.url))

const T0 = Date.parse("2026-10-21T18:00:00Z")
const at = (seconds) => new Date(T0 + seconds * 1000).toISOString()

function call(seconds, id, name, input) {
  return {
    type: "assistant",
    timestamp: at(seconds),
    message: { content: [{ type: "tool_use", id, name, input }] },
  }
}

function result(seconds, id, content = "ok") {
  return {
    type: "user",
    timestamp: at(seconds),
    message: { content: [{ type: "tool_result", tool_use_id: id, content }] },
  }
}

function said(seconds, content) {
  return { type: "user", timestamp: at(seconds), message: { content } }
}

function log(...entries) {
  return entries.map((e) => JSON.stringify(e)).join("\n")
}

test("refuses a file that is not a session log", () => {
  assert.throws(
    () => parseLog('{"hello":"world"}\nnot json'),
    /not a Claude Code session log/,
  )
})

test("times a full suite by its kind, not by the log file it writes to", () => {
  const t = buildTimeline(
    parseLog(
      log(
        call(0, "a", "Bash", {
          command: "pnpm test > /tmp/x-build.log 2>&1",
        }),
        result(180, "a"),
      ),
    ),
  )
  assert.deepEqual(
    t.kinds.map((k) => [k.kind, k.count, k.alone, k.medianAloneMs]),
    [["Vitest suite (full)", 1, 1, 180_000]],
  )
})

test("counts a call that chains several kinds under each, but not as alone", () => {
  const t = buildTimeline(
    parseLog(
      log(
        call(0, "a", "Bash", {
          command: "pnpm test && pnpm build",
        }),
        result(300, "a"),
      ),
    ),
  )
  const builds = t.kinds.find((k) => k.kind === "Builds")
  assert.equal(builds.count, 1)
  assert.equal(builds.alone, 0)
  assert.equal(builds.medianAloneMs, null)
})

test("ignores the words inside a heredoc", () => {
  assert.equal(
    commandWords("python3 - <<'EOF'\nprint('build lint')\nEOF\necho done"),
    "python3 - <<heredoc\necho done",
  )
  const t = buildTimeline(
    parseLog(
      log(
        call(0, "a", "Bash", { command: "python3 - <<'EOF'\nbuild lint\nEOF" }),
        result(5, "a"),
      ),
    ),
  )
  assert.deepEqual(t.kinds, [])
})

test("ignores words inside quoted strings", () => {
  const t = buildTimeline(
    parseLog(
      log(
        call(0, "a", "Bash", {
          command: `grep -n '"lint"\\|"build"' package.json`,
        }),
        result(1, "a"),
        call(2, "b", "Bash", {
          command: 'echo "- git commit, then build" >> notes.md',
        }),
        result(3, "b"),
      ),
    ),
  )
  assert.deepEqual(t.kinds, [])
  assert.deepEqual(t.milestones, [])
})

test("times Vitest, E2E and script tests as separate kinds", () => {
  const t = buildTimeline(
    parseLog(
      log(
        call(0, "a", "Bash", { command: "pnpm test" }),
        result(30, "a"),
        call(31, "b", "Bash", { command: "pnpm test:e2e" }),
        result(91, "b"),
        call(92, "c", "Bash", {
          command: "node --test .agents/skills/retro/scripts/",
        }),
        result(94, "c"),
      ),
    ),
  )
  assert.deepEqual(
    t.kinds.map((k) => [k.kind, k.count, k.alone, k.medianAloneMs]),
    [
      ["Vitest suite (full)", 1, 1, 30_000],
      ["E2E suite (full)", 1, 1, 60_000],
      ["Script tests", 1, 1, 2_000],
    ],
  )
})

test("times background work from its notice, preferring the agent's own duration", () => {
  const t = buildTimeline(
    parseLog(
      log(
        call(0, "a", "Agent", {
          description: "Quality review",
          prompt: "Review it",
        }),
        result(1, "a", "Async agent launched"),
        call(2, "b", "Bash", {
          command: "pnpm test:e2e",
          run_in_background: true,
        }),
        result(3, "b", "Command running in background"),
        said(
          120,
          "<task-notification>\n<tool-use-id>a</tool-use-id>\n<usage><duration_ms>50000</duration_ms></usage></task-notification>",
        ),
        // The queued notice is when it ended; the same notice delivered later
        // changes nothing.
        {
          type: "queue-operation",
          timestamp: at(200),
          content: "<task-notification>\n<tool-use-id>b</tool-use-id>",
        },
        said(
          260,
          "<task-notification>\n<tool-use-id>b</tool-use-id>\n</task-notification>",
        ),
        call(300, "c", "SendMessage", {
          to: "x",
          summary: "Re-check fixes",
          message: "...",
        }),
        result(301, "c", "Resuming agent"),
      ),
    ),
  )
  assert.deepEqual(
    t.background.map((b) => [b.label, b.ms]),
    [
      ["Bash: pnpm test:e2e", 198_000],
      ["Agent: Quality review", 50_000],
    ],
  )
  // A background run is not a foreground E2E timing.
  assert.deepEqual(t.kinds, [])
  assert.equal(
    t.longest.find((c) => c.name === "SendMessage").label,
    "SendMessage: Re-check fixes",
  )
})

test("reads what the test runners reported in a call's output", () => {
  const t = buildTimeline(
    parseLog(
      log(
        call(0, "a", "Bash", { command: "pnpm test" }),
        result(
          20,
          "a",
          " Test Files  48 passed (48)\n   Duration  18.25s (transform 2s)",
        ),
        call(21, "b", "Bash", { command: "pnpm test:e2e" }),
        result(80, "b", [{ type: "text", text: "  31 passed (1.1m)" }]),
        call(81, "c", "Bash", { command: "pnpm exec playwright test" }),
        result(100, "c", "  31 passed (13.2s)"),
        call(101, "d", "Bash", { command: "pnpm exec vitest run" }),
        result(140, "d", "   Duration  12.00s\n...\n   Duration  30.50s"),
      ),
    ),
  )
  assert.deepEqual(
    t.runners.map((r) => [r.runner, Math.round(r.ms)]),
    [
      ["Vitest", 18_250],
      ["Playwright", 66_000],
      ["Playwright", 13_200],
      ["Vitest", 12_000],
      ["Vitest", 30_500],
    ],
  )
})

test("names milestones once per PR and says what ended each wait", () => {
  const t = buildTimeline(
    parseLog(
      log(
        call(0, "a", "Bash", { command: "git commit -m x && git push" }),
        result(5, "a"),
        { type: "pr-link", prNumber: 7, timestamp: at(10) },
        { type: "pr-link", prNumber: 7, timestamp: at(20) },
        {
          type: "queue-operation",
          timestamp: at(900),
          content:
            "Update on pull request #7 (url):\n- All 3 checks passed on abc.",
        },
        said(
          901,
          "Update on pull request #7 (url):\n- All 3 checks passed on abc.",
        ),
      ),
    ),
    { gapSeconds: 60 },
  )
  assert.deepEqual(
    t.milestones.map((m) => m.label),
    ["commit", "push", "PR #7 linked", "#7: All 3 checks passed on abc."],
  )
  assert.deepEqual(
    t.waits.map((w) => [w.endedBy, w.ms]),
    [["prUpdate", 895_000]],
  )
})

test("says a delegated task's notice ended a wait, not a person", () => {
  // The notice T3 Code writes into the parent's log when a delegated task ends.
  const notice =
    "Delegated task node:delegated-task:abc (r1 review) in child thread thread:delegated-task:abc [completed]:\nNo findings."
  const t = buildTimeline(
    parseLog(
      log(
        said(0, "Review it"),
        { type: "queue-operation", timestamp: at(300), content: notice },
        said(301, notice),
        said(900, "Delegated task management is what I asked about"),
      ),
    ),
    { gapSeconds: 60 },
  )
  assert.deepEqual(
    t.waits.map((w) => [w.endedBy, w.ms]),
    [
      ["person", 599_000],
      ["backgroundTask", 300_000],
    ],
  )
})

test("renders every section as Markdown", () => {
  const t = buildTimeline(
    parseLog(
      log(call(0, "a", "Bash", { command: "pnpm test:e2e" }), result(95, "a")),
    ),
  )
  const md = renderMarkdown(t)
  for (const heading of [
    "## Milestones",
    "## Commands by kind",
    "## What the test runners reported",
    "## Background work",
    "## Waits",
    "## Longest tool calls",
  ]) {
    assert.ok(md.includes(heading), heading)
  }
  assert.ok(
    md.includes("| E2E suite (full) | 1 (1) | 1m 35s | 1m 35s | 1m 35s |"),
  )
  assert.ok(md.includes("| --- |"))
})

test("formats durations for a reader", () => {
  assert.equal(duration(null), "–")
  assert.equal(duration(42_000), "42s")
  assert.equal(duration(95_000), "1m 35s")
  assert.equal(duration(7_560_000), "2h 06m")
})

test("skips entries whose time cannot be read", () => {
  const entries = parseLog(
    log(
      { type: "user", timestamp: "soon", message: { content: "x" } },
      said(5, "hello"),
    ),
  )
  assert.equal(entries.length, 1)
})

test("says a wait ended with the command it waited on, past log bookkeeping", () => {
  const t = buildTimeline(
    parseLog(
      log(
        call(0, "a", "Bash", { command: "timeout 250 tail -f /dev/null" }),
        { type: "pr-link", prNumber: 7, timestamp: at(249) },
        result(250, "a"),
        {
          type: "assistant",
          timestamp: at(500),
          message: { content: [{ type: "text", text: "Done." }] },
        },
      ),
    ),
    { gapSeconds: 60 },
  )
  assert.deepEqual(
    t.waits.map((w) => [w.endedBy, w.ms]),
    [
      ["ownCommand", 250_000],
      ["model", 250_000],
    ],
  )
})

test("finds the newest log for a directory, and says when there is none", () => {
  const home = mkdtempSync(join(tmpdir(), "timeline-"))
  try {
    assert.throws(
      () => newestLog("/work/my_app.v2", home, {}),
      /no Claude Code session logs/,
    )
    const dir = join(home, ".claude", "projects", "-work-my-app-v2")
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "old.jsonl"), "")
    writeFileSync(join(dir, "new.jsonl"), "")
    utimesSync(join(dir, "old.jsonl"), 1, 1)
    assert.equal(newestLog("/work/my_app.v2", home, {}), join(dir, "new.jsonl"))
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test("looks in CLAUDE_CONFIG_DIR when it is set", () => {
  const config = mkdtempSync(join(tmpdir(), "timeline-config-"))
  try {
    const dir = join(config, "projects", "-work-app")
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "s.jsonl"), "")
    assert.equal(
      newestLog("/work/app", "/nowhere", { CLAUDE_CONFIG_DIR: config }),
      join(dir, "s.jsonl"),
    )
    assert.throws(
      () => newestLog("/work/app", "/nowhere", { CLAUDE_CONFIG_DIR: "" }),
      /\/nowhere\/\.claude\/projects\/-work-app/,
    )
  } finally {
    rmSync(config, { recursive: true, force: true })
  }
})

test("refuses options it cannot use", () => {
  assert.match(run(["--help"]), /^usage:/)
  assert.throws(
    () => run(["a.jsonl", "--gap", "abc"]),
    /--gap needs a whole number/,
  )
  assert.throws(() => run(["a.jsonl", "--top"]), /argument missing/)
  assert.throws(() => run(["--tpo", "5"]), /Unknown option/)
  assert.throws(() => run(["a.jsonl", "b.jsonl"]), /^Error: usage:/)
})

test("prints the report and exits 0, or says what is wrong and exits 1", () => {
  const home = mkdtempSync(join(tmpdir(), "timeline-"))
  try {
    const path = join(home, "session.jsonl")
    writeFileSync(
      path,
      log(call(0, "a", "Bash", { command: "pnpm test:e2e" }), result(30, "a")),
    )
    const ok = spawnSync(process.execPath, [script, path, "--top", "3"], {
      encoding: "utf8",
    })
    assert.equal(ok.status, 0, ok.stderr)
    assert.match(ok.stdout, /\| E2E suite \(full\) \| 1 \(1\) \| 30s \|/)
    const bad = spawnSync(process.execPath, [script, path, "--gap=-1"], {
      encoding: "utf8",
    })
    assert.equal(bad.status, 1)
    assert.match(bad.stderr, /^session-timeline: --gap needs a whole number/)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

function kindsOf(...commands) {
  const entries = commands.flatMap((command, i) => [
    call(i * 10, `c${i}`, "Bash", { command }),
    result(i * 10 + 5, `c${i}`),
  ])
  return buildTimeline(parseLog(log(...entries))).kinds.map((k) => [
    k.kind,
    k.count,
  ])
}

test("takes no file name for a step, even without a path", () => {
  assert.deepEqual(kindsOf("tail -n 5 lint.log", "cat build.log"), [])
})

test("counts a run naming a test file as targeted, never the full suite", () => {
  assert.deepEqual(
    kindsOf(
      "pnpm test -- src/features/auth/use-auth.test.tsx",
      "pnpm exec vitest run src/lib/errors.test.ts",
      "pnpm exec vitest related --run src/lib/errors.ts",
      "pnpm test:e2e tests/e2e/auth.spec.ts",
    ),
    [
      ["Vitest tests (targeted)", 3],
      ["E2E tests (targeted)", 1],
    ],
  )
})

test("knows the full suite however it is started", () => {
  assert.deepEqual(
    kindsOf(
      "timeout 600 pnpm test > /tmp/x.log 2>&1",
      "pnpm run test",
      "pnpm exec vitest run",
      "pnpm test -- --maxWorkers=3",
      "pnpm exec vitest run roadmaps",
    ),
    [["Vitest suite (full)", 5]],
  )
})

test("does not take test:watch or test:e2e for the Vitest suite", () => {
  assert.deepEqual(kindsOf("pnpm test:watch", "CI=true pnpm test:e2e"), [
    ["E2E suite (full)", 1],
  ])
})

test("knows checks, builds, servers, installs, CI watches and a bash -c body", () => {
  assert.deepEqual(
    kindsOf(
      "pnpm typecheck",
      "pnpm exec tsc -b --noEmit",
      "pnpm lint",
      "pnpm exec eslint src/app",
      "pnpm format:check",
      "pnpm exec prettier --write src/app/main.tsx",
      "actionlint",
      "pnpm build",
      "pnpm editor:build",
      "pnpm exec vite build",
      "pnpm dev",
      "pnpm editor:dev",
      "pnpm editor:preview --port 4173 --strictPort",
      "pnpm install --frozen-lockfile",
      "pnpm exec playwright install --with-deps chromium",
      "gh run watch 123",
      "gh pr checks 5 --watch",
      "bash -lc 'pnpm exec playwright test --grep auth'",
    ),
    [
      ["E2E suite (full)", 1],
      ["Type checks", 2],
      ["Builds", 3],
      ["Lint", 2],
      ["Format", 2],
      ["Workflow lint", 1],
      ["Dev server start-up", 3],
      ["Dependency install", 2],
      ["CI watches", 2],
    ],
  )
})

test("counts git and gh calls, but a CI watch only as a watch", () => {
  assert.deepEqual(
    kindsOf(
      "git status --short",
      "git -C /work/app log --oneline -5",
      "gh pr view 7 --json state",
      "gh pr checks 7 --watch",
    ),
    [
      ["Git and GitHub", 3],
      ["CI watches", 1],
    ],
  )
})

test("counts a chained call once in the wall-clock total", () => {
  const t = buildTimeline(
    parseLog(
      log(
        call(0, "a", "Bash", {
          command: "pnpm test && pnpm build",
        }),
        result(300, "a"),
      ),
    ),
  )
  assert.equal(t.uniqueMs, 300_000)
  assert.equal(
    t.kinds.reduce((sum, k) => sum + k.totalMs, 0),
    600_000,
  )
})

test("marks a commit when it returns, and not at all when it fails", () => {
  const failed = {
    type: "user",
    timestamp: at(70),
    message: {
      content: [
        {
          type: "tool_result",
          tool_use_id: "b",
          content: "hook failed",
          is_error: true,
        },
      ],
    },
  }
  const t = buildTimeline(
    parseLog(
      log(
        call(0, "a", "Bash", { command: "git commit -m one" }),
        result(60, "a"),
        call(65, "b", "Bash", { command: "git commit -m two" }),
        failed,
      ),
    ),
  )
  assert.deepEqual(
    t.milestones.map((m) => [m.label, m.at]),
    [["commit", T0 + 60_000]],
  )
})

test("reads runner summaries only from calls that ran tests", () => {
  const t = buildTimeline(
    parseLog(
      log(
        call(0, "a", "Bash", { command: "cat /tmp/e2e.log" }),
        result(1, "a", "  5 passed (1.1m)"),
        call(2, "b", "Bash", {
          command: "pnpm test | tail -3",
        }),
        result(200, "b", " Test Files  239 passed (239)"),
      ),
    ),
  )
  assert.deepEqual(t.runners, [])
  assert.equal(t.unreportedTests, 1)
})

test("takes a background notice only from a user or queued entry", () => {
  const t = buildTimeline(
    parseLog(
      log(
        call(0, "a", "Bash", {
          command: "pnpm test:e2e",
          run_in_background: true,
        }),
        result(1, "a", "Command running in background"),
        {
          type: "assistant",
          timestamp: at(30),
          message: {
            content: [{ type: "text", text: "<tool-use-id>a</tool-use-id>" }],
          },
        },
        said(90, "<task-notification>\n<tool-use-id>a</tool-use-id>"),
      ),
    ),
  )
  assert.deepEqual(
    t.background.map((b) => b.ms),
    [90_000],
  )
})

test("times only whole runs as a suite: any run scoped to some tests is targeted", () => {
  assert.deepEqual(
    kindsOf(
      "pnpm test:e2e",
      "pnpm test:e2e -- tests/e2e/roadmaps.spec.ts",
      "pnpm exec playwright test tests/e2e/",
      "pnpm exec playwright test --grep reconnect",
      "pnpm exec vitest run",
      "pnpm exec vitest run src/features/roadmaps/",
    ),
    [
      ["Vitest suite (full)", 1],
      ["Vitest tests (targeted)", 1],
      ["E2E suite (full)", 2],
      ["E2E tests (targeted)", 2],
    ],
  )
})

test("counts a polling loop as a wait, but not any other loop", () => {
  assert.deepEqual(
    kindsOf(
      "until curl -sf localhost:4173; do sleep 1; done",
      "while read f; do echo $f; done < list.txt",
    ),
    [["Deliberate waits", 1]],
  )
})

test("keeps a bash -c body whatever its flags", () => {
  assert.deepEqual(kindsOf("bash -ec 'pnpm build'"), [["Builds", 1]])
})

test("reads node --test's own duration", () => {
  const t = buildTimeline(
    parseLog(
      log(
        call(0, "a", "Bash", { command: "node --test scripts/x.test.mjs" }),
        result(2, "a", "# pass 3\n# fail 0\n# duration_ms 158.5"),
        call(3, "b", "Bash", { command: "node --test scripts/y.test.mjs" }),
        result(4, "b", "ℹ pass 2\nℹ fail 0\nℹ duration_ms 210.30"),
      ),
    ),
  )
  assert.deepEqual(
    t.runners.map((r) => [r.runner, r.ms]),
    [
      ["node --test", 158.5],
      ["node --test", 210.3],
    ],
  )
  assert.equal(t.unreportedTests, 0)
})

test("counts a run over a directory as targeted, but not a redirect", () => {
  assert.deepEqual(
    kindsOf(
      "timeout 600 pnpm exec vitest run src/features/auth/ > /tmp/x.log 2>&1",
      "pnpm test -- --maxWorkers=3 > /dev/null 2>&1",
    ),
    [
      ["Vitest suite (full)", 1],
      ["Vitest tests (targeted)", 1],
    ],
  )
})

test("keeps the commands either side of a redirect apart", () => {
  assert.deepEqual(
    kindsOf(
      "pnpm exec prettier --write src/a.test.tsx >/dev/null; (timeout 900 pnpm test -- --maxWorkers=3 > /tmp/t.log 2>&1; echo $?)",
    ),
    [
      ["Vitest suite (full)", 1],
      ["Format", 1],
    ],
  )
})
