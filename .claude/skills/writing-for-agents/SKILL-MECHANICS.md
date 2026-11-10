# Skill mechanics

The skill-specific branch of [`writing-for-agents`](SKILL.md): what changes when the document is a skill (frontmatter, the invocation choice, and router skills). Everything else about writing it is the universal reference in `SKILL.md`.

## Invocation

Two choices, trading the two loads:

- A **model-invoked** skill keeps a `description`, so the agent can discover it autonomously. A person can still invoke it by name. The description is a context pointer and costs always-on context; a model-invoked reference skill can also be invoked from another skill when the runtime supports that. Mechanics: omit `disable-model-invocation`, and write a model-facing description carrying the trigger branches (the pointer-writing rules in `SKILL.md` apply in full).
- A **user-invoked** skill sets `disable-model-invocation: true`: its description is not used for autonomous discovery, and the human is responsible for invoking it by name. This does not prevent another skill from pointing to its file or an agent from reading and applying that file; whether a runtime can invoke it through a skill tool is runtime-specific. Mechanics: set `disable-model-invocation: true`; keep the description human-facing and concise.

Pick model-invocation only when the agent should discover the skill on its own. If it only fires by hand, make it user-invoked and avoid its always-on discovery description. A skill that needs its content can still link to the file and apply it directly.

Shared reference needed by several skills can live in a plain reference file or one authoritative skill. Link to the file explicitly when automatic discovery is unnecessary; user-only invocation metadata does not prohibit reading it.

## Splitting by invocation

The invocation cut of splitting (the sequence cut lives in `SKILL.md`): split off a model-invoked skill when you have a distinct leading word that should trigger it on its own (a trigger word you actually use in your prompts), or independent automatic discovery is required. A known file pointer alone does not need model invocation. You pay context load for the new always-loaded description, so that independent reach has to be worth it.

## Router skills

When user-invoked skills multiply past what you can remember, that piled-up cognitive load is cured by a **router skill**: one user-invoked skill that names the others and when to reach for each, so the human has one skill to remember instead of many. The router can point to a skill file and apply its procedure directly; runtime restrictions may still require the human to invoke that skill through the native skill tool.
