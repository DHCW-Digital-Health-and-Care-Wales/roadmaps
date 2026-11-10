# Capture and attach delivery screenshots

Any record that changes visible UI publishes screenshots of every screen and
state it built or changed. Keep a manifest in the task handoff with each
capture's local path, caption and published URL. Captions say which scenario,
viewport, screen and state the image shows; mark diagnostic or superseded
captures so they are not mistaken for the final UI. Deduplicate identical
images, not distinct states. Use fake data only; never capture a real Google
account, token or spreadsheet.

## Capture

Use headless Playwright (Chromium is installed in `~/.cache/ms-playwright`)
against `pnpm dev` (`cp .env.example .env.local` first if it is missing), or
the `playwright-cli` skill. Fake Google with `page.route`: serve a stub for
`https://accounts.google.com/gsi/client` and fulfil
`https://sheets.googleapis.com/**`, reusing `FakeGis` and `FakeSheets` from
`tests/e2e/fixtures/` directly. Do not use `tests/e2e/fixtures/test.ts` against
the dev server: its hermetic guard rejects Vite's HMR WebSocket. StrictMode in
dev aborts and repeats the first fetch, consuming a queued Sheets reply, so
route Sheets yourself or capture against `pnpm build && pnpm preview`. Keep
capture scripts in a scratch directory, not in the repository, unless they are
proper E2E tests. A scratch Playwright spec that imports the repository's
fixtures loads only once that directory holds a `package.json` of
`{"type":"module"}` and a `node_modules` symlink to the checkout's.

Cover desktop (1280 px) and phone (375 px), light and dark mode where relevant,
and Welsh (`cy`) where copy changed. Save captures under
`.artifacts/screenshots/<record-id>/` at the root of your checkout (git-ignored)
with descriptive names, e.g. `s1-roadmaps-desktop-dark-en-after.png`. Open each
one yourself and fix anything that looks wrong before publishing.

## Before and after

At the start of the delivery session, read enough of the requirements to
identify the screens and states that will change. Before editing their
implementation, capture before screenshots of the existing UI with the same
fakes, viewports and themes, and record the starting revision in the manifest.
For newly discovered UI scope, capture its baseline before changing it. A new
screen or state with no predecessor has no baseline and is published as new;
a changed entry point to it gets its own before/after pair. If capture is
impossible, record the missing baseline and blocker; never reconstruct it from
an already edited UI or label an after capture as before. Do not reset the
checkout merely to obtain a baseline: build the base revision in scratch
instead (`git archive <base> | tar -x`, with `node_modules` symlinked and
`.env.local` copied).

After the review fixes, capture the matching after states with comparable
viewport, data and navigation. Publish every pair and every new capture in the
PR. A change no user sees needs no screenshots.

## Attach to the PR

Never commit screenshots or host them anywhere but GitHub. A local path or a
chat attachment is not a GitHub attachment.

Write the PR body with local Markdown image references in its Screenshots
section, captioned and laid out as that section's template comment sets, and
pass each referenced file with its own `--attach` flag:

```sh
gh pr create --base <base branch> --head <branch> --title '<title>' --body-file <body-file> \
  --attach <dir>/s1-roadmaps-desktop-light-en-before.png \
  --attach <dir>/s1-roadmaps-desktop-light-en-after.png
```

`gh pr edit <n> --body-file <body-file> --attach <file>` does the same for an
existing PR. The CLI uploads the images and rewrites matching local references
to hosted URLs, keeping alt text and placement; an unreferenced attachment is
appended at the end, so reference every capture. Afterwards read back the PR
body to confirm every local reference became a hosted URL, and record those
URLs in the manifest. A 404 from an unauthenticated request does not prove an
attachment on this private repository is missing.

Add captures from later fixes without replacing other PR sections: keep
published URLs, upload only new captures, and update superseded captions. If
uploading fails, keep the local captures, report the exact blocker in the PR's
Verification and the handoff, and list the local absolute paths in your final
reply; never claim a machine-local path is visible to a GitHub reviewer.

Always list every final screenshot's absolute local path in your final reply,
so the owner can view them without opening the PR.
