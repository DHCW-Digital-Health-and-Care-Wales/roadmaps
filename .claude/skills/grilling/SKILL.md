---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round, then wait for the user's answers before the next round.

Ask each round with the `AskUserQuestion` tool, not as chat text. Put each frontier question in its own `questions` entry, with a short `header` and 2–4 options; for an open-ended question, offer the main candidate answers and let the tool's automatic "Other" entry take the rest. Make your recommended answer the first option and end its label with "(Recommended)", so picking the first option accepts it. Put the trade-off in each option's `description`. The tool takes at most 4 questions per call, so send a larger frontier as consecutive calls in the same round. If the tool is unavailable, fall back to numbered chat questions, each with your recommended answer, worded so "yes" accepts it.

When the answer changes what a user sees or does, include a short example scenario in the question that shows the impact: who does what, and what they now see.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it (Claude: the `Explore` agent; Codex: a fresh read-only worker; without delegation, look yourself); don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

When the plan is a backlog record, its template's Decisions and Open questions sections hold the answers and the questions still open.

When the plan is an ADR, draft it before the first round: its Options section is the grilling script. List each option with what the build does now, what choosing it adds, removes or moves, and a one-line example of who sees what, recommended first. Put each option into its question as the option's label and `description`. Once the owner answers, mark the chosen option once, keep the others with the reason each lost, and cite the answer in Status (`.claude/skills/domain-modeling/ADR-FORMAT.md`).

## Impact on existing behaviour

When the plan adds a state, rule or permission to something that exists, put
this on the first frontier: list every existing screen, query hook,
repository call and route that touches the same data (`rg` the type, repository
and query key), and ask what the new rule means for each. A path the plan does not
mention is a question, not an assumption: refuse, warn, carry on or change it.
The session is not done until every such path has an answer.
