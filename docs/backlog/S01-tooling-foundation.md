# S01 — Tooling foundation

## Goal

A clean, current, strictly-typed Vite + React 19 project with Tailwind v4, shadcn/ui on
Base UI, ESLint, Prettier, Vitest + RTL + MSW harness — ready for feature work.

## Scope

- pnpm project (`packageManager` field pinned; `engines.node` >= current LTS; `.nvmrc`).
- Vite + `@vitejs/plugin-react`; React 19; TypeScript strict (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes` if ecosystem tolerates it, `verbatimModuleSyntax`).
  Pick the **newest mutually compatible** versions — verify peer deps (e.g. whether
  typescript-eslint supports the latest TypeScript major; fall back to the newest
  supported TS if not). Record the chosen versions/reasons in the handoff.
- Path alias `@/*` -> `src/*` (tsconfig + Vite).
- Tailwind v4 via `@tailwindcss/vite`; `src/styles/globals.css`.
- shadcn/ui initialised for **Base UI** (`components.json`, `src/lib/utils.ts` `cn`).
  Use the shadcn CLI's current Base UI path (verify against shadcn docs). Add only `button`
  now (more components are added by the stories that use them).
- TanStack Router Vite plugin wired (ADR-0004) with a minimal `src/routes/__root.tsx` and
  `src/routes/index.tsx` placeholder, `src/app/main.tsx`, `src/app/router.tsx` with hash
  history; `routeTree.gen.ts` committed and excluded from lint/format.
- ESLint flat config: typescript-eslint (type-aware, strict), react-hooks, react-refresh,
  jsx-a11y (if compatible), import-direction rules per ADR-0002 using
  `no-restricted-imports` (domain must not import react/@tanstack/infrastructure/features;
  infrastructure must not import react/@tanstack/features/app; features must not import
  infrastructure). Prettier (+ `prettier-plugin-tailwindcss`), `eslint-config-prettier`.
- Vitest (jsdom) + `@testing-library/react` + `@testing-library/user-event` +
  `@testing-library/jest-dom` + MSW node server bootstrapped in `src/test/setup.ts`
  (`onUnhandledRequest: 'error'`). `pnpm test` runs once (not watch).
- Public config: `.env.example` and `.env.production` with
  `VITE_GOOGLE_CLIENT_ID=581293930758-54rmui7d7256t5qri7g8lbrs70lvfuq4.apps.googleusercontent.com`
  and `VITE_GOOGLE_SPREADSHEET_ID=1wuk_pK1LpfLKmdbg6WsY_qKeBC5lcN4rlsjqkAxtflw`;
  `src/app/config.ts` validates `import.meta.env` with Zod v4 and exports a typed frozen
  config (fail fast with a clear message). `vite-env.d.ts` types the env vars.
  `.gitignore` covers `.env`, `.env.local`, `.env.*.local`, `dist`, `playwright-report`,
  `test-results`.
- Scripts: `dev`, `build` (`tsc -b`/typecheck is separate), `preview`, `typecheck`, `lint`,
  `format`, `format:check`, `test`, `test:watch`, `test:e2e` (placeholder wired in S06 — may
  be omitted until then).
- `index.html` with proper title, meta description, favicon (simple SVG roadmap glyph).

## Out of scope

Feature code, auth, data fetching, CI workflow, README (S07).

## Acceptance criteria

- [ ] `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`,
      `pnpm format:check`, `pnpm test` all succeed (at least one real test, e.g. config parsing).
- [ ] A Button from `@/components/ui/button` renders on the placeholder page and is
      built on `@base-ui/react` (no `@radix-ui/*` in the dependency tree).
- [ ] Layer import restrictions demonstrably fail lint when violated (verify, then revert).
- [ ] Handoff entry lists exact chosen versions and any compatibility notes.
