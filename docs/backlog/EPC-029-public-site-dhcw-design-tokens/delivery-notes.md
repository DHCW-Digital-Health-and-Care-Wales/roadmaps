# EPC-029 delivery notes

What agents delivering or reviewing this epic's stories need; carried from EPC-022 when
STY-099 moved here. See `docs/AGENTS.md`.

- **A public-site change the public can see waits for the owner's eye**: a pull request
  that changes what the public site shows (its text, marks, font, icons or look, as
  STY-099 does) puts its before/after screenshots in the PR and is merged only once the
  owner has seen them and approved, even in a run authorised to merge (owner, 2026-11-23,
  STY-095 grilling).
- **The site's script has about 1.5 KB to spare**: Lighthouse counts 98,489 of the
  100,000 bytes `apps/public-site/lighthouserc.json` allows, Simple Analytics' 6 KB
  included (its `latest.js` can grow unasked), so a story that bumps or adds a package
  in the site's script (react, react-dom or lucide-react) runs `pnpm site:lighthouse`
  before choosing its version.
