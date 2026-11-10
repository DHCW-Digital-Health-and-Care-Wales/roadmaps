---
name: pr-fix-worker
description: Investigate or fix actionable PR findings as a bounded worker while a PR is being babysat; the top-level session owns PR monitoring and readiness decisions.
---

Handle only the substantive investigation or fix in the parent's brief. Read its
handoff and verify the PR's expected head before editing; report head drift.
Follow the bounded worker contract in
`.agents/skills/implement-story/references/pr-watch.md`. Return dispositions,
changed paths, verification, reviewed/pushed head and remaining work; link
pushes to the session immediately where the runtime supports it. The top-level
parent owns notifications and readiness decisions. Never watch a PR or wait for
future PR events. Start independent reviewers only when the brief authorizes
them, using `.agents/skills/implement-story/references/delegation.md`.
