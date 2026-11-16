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
`{"type":"module"}` and a `node_modules` symlink to the checkout's. Give every
scratch spec `actionTimeout: 5_000` (in its config's `use`, or `test.use`):
without it, a locator that matches nothing (a Welsh capture looking for an
English name) waits out the whole test timeout. Bound a run with
`timeout -s INT <seconds>` and its output in a log file: interrupted, Playwright
reports the test and the locator it was waiting on, where a killed run or a
`tail` pipe shows nothing. Set `reducedMotion: "reduce"` in the config's `use`, or a dialog or menu is
captured part-way through fading in. For a dark capture, call `useTheme(page, "dark")`
from `tests/e2e/fixtures/look.ts` before navigating: the app is light until the
user chooses dark (ADR-005), so `colorScheme: "dark"` alone captures the light
theme.

Cover desktop (1280 px) and phone (375 px), light and dark mode where relevant,
and Welsh (`cy`) where copy changed. Save captures under
`.artifacts/screenshots/<record-id>/` at the root of your checkout (git-ignored)
with descriptive names, e.g. `s1-roadmaps-desktop-dark-en-after.png`.

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
checkout merely to obtain a baseline: extract the base revision into a scratch
directory (`git archive <base> | tar -x -C <scratch-dir>`), symlink its
`node_modules` to the checkout's, copy the checkout's ignored `.env*.local`
files so both builds and the fakes share one config, and capture it with
`pnpm build && pnpm preview --port <free port> --strictPort` run there (4173
belongs to E2E).

After the review fixes, capture the matching after states with comparable
viewport, data and navigation. Publish every pair and every new capture in the
PR. A change no user sees needs no screenshots.

## Read a risk-based sample

Once the after captures are taken, publish the full set, but read only the
after captures a risk points at, and fix what looks wrong before publishing:

- A copy-only change whose tests pass: read none.
- A layout or behaviour change: read a mix of light and dark, desktop and
  phone, on the screens most likely to break; read more once one shows a
  problem.
- Skip the Welsh twin of a screen you read, unless its longer copy may
  overflow.
- Read a before capture only to diagnose a problem in an after capture or in
  the capture itself.

For layout-heavy UI, also start a fresh read-only subagent on an economy or
standard model (Haiku or Sonnet) with the after captures' paths and this
checklist: clipped or overflowing text, overlap, dark-mode contrast, visible
focus, breakage at 375 px. It returns only the suspect filenames, each with a
one-line reason; open those yourself. Skip it for a copy-only or small change.
Record in the manifest which captures you read and why, and the checker's
suspects.

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
body to confirm every local reference became a hosted URL, since an upload can
skip one without an error; re-attach any left local with `gh pr edit --attach`
of that file, and record the URLs in the manifest. A 404 from an
unauthenticated request does not prove an attachment on this private
repository is missing.

Add captures from later fixes without replacing other PR sections: keep
published URLs, upload only new captures, and update superseded captions. If
uploading fails, keep the local captures, report the exact blocker in the PR's
Verification and the handoff, and list the local absolute paths in your final
reply; never claim a machine-local path is visible to a GitHub reviewer.

Always list every final screenshot's absolute local path in your final reply,
so the owner can view them without opening the PR.
