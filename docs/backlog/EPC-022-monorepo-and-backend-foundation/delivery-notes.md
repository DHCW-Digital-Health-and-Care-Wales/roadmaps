# EPC-022 delivery notes

What agents delivering or reviewing this epic's stories need; see `docs/AGENTS.md`.

- **A scenario only the owner's cut-over can show is still Done with its PR**: one
  that needs a rename, a merge, a ruleset the owner applies or a deploy from another
  repository first (such as STY-085 S1–S3, STY-087 S8, and STY-088 S1–S3 and S8) is
  observed after the owner acts, and the record moves with the PR all the same
  (`status-lifecycle.md`, _Done moves with the PR_). Its Delivery states what the PR
  holds and where the record has the rest observed (a Scope step, as STY-085's step 3,
  or the scenario itself), with no words about merging; the PR's _Needs you_ lists
  the cut-over's steps. The observation, once made, goes into the archived record's
  Delivery in a later commit.
