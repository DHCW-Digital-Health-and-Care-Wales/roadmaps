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
- **A thread keeps the request's trace only if it is given it**: a service that starts a
  thread runs it in `contextvars.copy_context()`, as `ReadinessService.check` does, or
  its queries leave the request's trace and its log lines lose the request ID. FastAPI's
  own telemetry stays off in `create_app` (its spans carry the query string), so a
  FastAPI bump re-reads `fastapi/telemetry/` for a new way it could turn on.
- **Row-level security does not cover `TRUNCATE` or `REFERENCES`**: PostgreSQL applies
  neither to policies, so the first schema story's enforcement suite also proves the
  application's role holds neither on any table.
- **Before a route takes a request model, read `ApiRequestModel`'s docstring**
  (`apps/api/src/roadmaps_api/wire.py`): which keys FastAPI gives a query, header,
  cookie or body model decides what its `extra="forbid"` refuses (CHO-047 D4).
- **Give every collection field in an `ApiRequestModel` a `max_length`**, above all
  beneath a dictionary: DEF-040 caps the 422 response after Pydantic builds
  `exc.errors()`, not the memory Pydantic spends validating an unbounded collection first,
  and bounding only the dictionary key does not stop Pydantic validating every item
  beneath it (a `max_length` on the collection fails early with one `too_long` error).
- **A local API's log lines hold messages**: `ROADMAPS_ENV=local` writes an exception's
  and a third party's message (ADR-018 _STY-101 amendments_), so an API test that
  asserts no planted value reaches the log runs under test's or production's rules
  (`apps/api/tests/conftest.py`'s `lines` fixture, or production's settings).
