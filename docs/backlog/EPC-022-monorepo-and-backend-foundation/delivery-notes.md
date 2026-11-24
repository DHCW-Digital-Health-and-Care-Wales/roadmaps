# EPC-022 delivery notes

What agents delivering or reviewing this epic's stories need; see `docs/AGENTS.md`.

- **A scenario only the owner's cut-over can show is still Done with its PR**: one that
  needs a rename, a merge, a ruleset or repository setting the owner applies, or a
  deploy from another repository first (such as STY-085 S1–S3, STY-087 S8, and STY-088
  S1–S3 and S8) is observed after the owner acts, and the record moves with the PR all
  the same (`status-lifecycle.md`, _Done moves with the PR_). Its Delivery states what
  the PR holds and where the record has the rest observed (a Scope step, as STY-085's
  step 3, or the scenario itself), with no words about merging; the PR's _Needs you_
  lists the cut-over's steps. The observation, once made, goes into the archived
  record's Delivery in a later commit.
- **A public-site change the public can see waits for the owner's eye**: a pull request
  that changes what the public site shows (its text, marks, font, icons or look, as
  STY-096, STY-097 and STY-099 do) puts its before/after screenshots in the PR and is
  merged only once the owner has seen them and approved, even in a run authorised to
  merge (owner, 2026-11-23, STY-095 grilling). A change with no visible difference on
  the site merges as the run allows.
- **The site's script has about 1.5 KB to spare**: Lighthouse counts 98,489 of the
  100,000 bytes `apps/public-site/lighthouserc.json` allows, Simple Analytics' 6 KB
  included (its `latest.js` can grow unasked), so a story that bumps or adds a package
  in the site's script (react, react-dom or lucide-react) runs `pnpm site:lighthouse`
  before choosing its version.
- **FastAPI already brings `opentelemetry-api`**: FastAPI 0.163 depends on it and runs
  each `def` route through `fastapi/telemetry/`, whose spans carry `url.query` once an
  SDK is configured, so the tracing story reads what that emits, against the log
  allow-list, before adding an instrumentation of its own.
- **Row-level security does not cover `TRUNCATE` or `REFERENCES`**: PostgreSQL applies
  neither to policies, so the first schema story's enforcement suite also proves the
  application's role holds neither on any table.
