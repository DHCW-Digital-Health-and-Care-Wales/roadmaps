# EPC-022 delivery notes

What agents delivering or reviewing this epic's stories need; see `docs/AGENTS.md`.

- **A scenario only the owner's cut-over can show is still Done with its PR**: a
  rename, a ruleset the owner applies, or a deploy from another repository (STY-085
  S1–S3, STY-087's ruleset, STY-088 S2) is observed after the owner acts, and the
  record moves with the PR all the same (`status-lifecycle.md`, _Done moves with the
  PR_). Its Delivery states what the PR holds and that the record's Scope step
  observes the rest at the cut-over, with no words about merging; the PR's _Needs
  you_ lists the cut-over's steps. The observation, once made, goes into the archived
  record's Delivery in a later commit.
