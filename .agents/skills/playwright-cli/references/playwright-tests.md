# Running Playwright Tests

To run Playwright tests, use `pnpm editor:test:e2e` (for the editor; see `apps/editor/tests/e2e/AGENTS.md`) or `pnpm site:test:e2e` (for the public site; see `apps/public-site/AGENTS.md`), passing extra flags directly (such as a single spec), or run `./node_modules/.bin/playwright test` inside the app directory. To avoid opening the interactive html report, use `PLAYWRIGHT_HTML_OPEN=never`.

```bash
# Run all editor E2E tests
PLAYWRIGHT_HTML_OPEN=never pnpm editor:test:e2e

# Run a single spec directly from the app's local binary
(cd apps/editor && PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test tests/e2e/auth.spec.ts)
```

# Debugging Playwright Tests

To debug a failing Playwright test, run it with `--debug=cli` option. This command will pause the test at the start and print the debugging instructions.

**IMPORTANT**: run the command in the background and check the output until "Debugging Instructions" is printed.

Once instructions containing a session name are printed, use `playwright-cli` to attach the session and explore the page.

```bash
# Run the test
(cd apps/editor && PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --debug=cli)
# ...
# ... debugging instructions for "tw-abcdef" session ...
# ...

# Attach to the test
playwright-cli attach tw-abcdef
```

Keep the test running in the background while you explore and look for a fix.
The test is paused at the start, so you should step over or pause at a particular location
where the problem is most likely to be.

Every action you perform with `playwright-cli` generates corresponding Playwright TypeScript code.
This code appears in the output and can be copied directly into the test. Most of the time, a specific locator or an expectation should be updated, but it could also be a bug in the app. Use your judgement.

After fixing the test, stop the background test run. Rerun to check that test passes.
