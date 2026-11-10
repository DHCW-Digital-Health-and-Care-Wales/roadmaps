# Aligning the editor with the DHCW design system

What the editor can take from the Digital Health and Care Wales (DHCW) design system so
it is on-brand, without the public-service defaults that would slow a staff editor down.
It also covers the quality problems the comparison exposed.

- **Source:** [DHCW design system](https://github.com/DHCW-Digital-Health-and-Care-Wales/dhcw-design-system)
  at v0.1.104 (`bc52697f812699d7701959d8e82f6aa7bcf80fe9`, 2026-10-23). This covers its
  `src/tokens/`, `src/components/`, `.agent/design-system-rules.md`, and the rendered
  `preview/examples/page-template-dashboard-default.html`.
- **The editor:** audited at `22c3336` on 2026-11-10.

## Findings

### What the design system is

- **Sass, Nunjucks macros and a script.** It ships Sass with BEM classes (`nhsw-*`),
  Nunjucks macros, a compiled `nhsw.css` and a dependency-free behaviours script. It has
  no React components.
  - `nhsw.css` styles `html` and `body` globally, so it would fight Tailwind's
    preflight.
- **Defaults sized for the public.** Body text is 19px from tablet, the h1 is 48px,
  buttons are at least 44px tall, and its guidance is one question per page.
- **A staff template exists.** `nhswDashboard` has a navy left-hand navigation, a white
  top bar of bordered context "chips" and white content.
  - Its rules let canvas-style tools use their own layout, provided they still meet its
    accessibility rules.
- **No dark mode and no motion tokens.**
- **Licences:** code is MIT and guidance text is OGL v3.0.
  - Logos are under neither, and need the owner's permission; the owner has given it
    (decision 4).
  - Its rules forbid NHS branding: the organisation is DHCW.
- **Releases are frequent.** Every merge publishes a patch, so a consumer must pin a
  version and check for drift. It is not on the npm registry; install it from a GitHub
  tag.

### What carries over well

- **Colour tokens** (`src/tokens/_colours.scss`):
  - text `#212b32`; secondary text `#4c6272` (6.4:1 on white);
  - link `#005aa8`; navy primary `#1b365d`, with hover and active shades;
  - decorative border `#d8dde0`; muted surface `#f0f4f5`; destructive `#d5281b`;
  - focus yellow `#ffeb3b` with dark focus text.
- **The tag palette** (`src/components/content/_tag.scss`): ten tint and ink pairs,
  hard-coded in the component rather than tokens, all passing AA.
- **Type:** Roboto, bold headings, no letter-spacing, sentence case everywhere.
- **The focus indicator**, its most recognisable trait:
  - buttons and links get a yellow fill with dark text and a dark bottom bar;
  - inputs get a 3px yellow outline outside a 2px dark inner ring.

  Yellow alone measures about 1.2:1 on white, so the dark part is what passes WCAG
  1.4.11.

- **Components:**
  - buttons: bold, with a 2px bottom shadow; the secondary is white with a grey border;
  - square cards, tags and callouts;
  - inset text, the notification banner and the warning callout;
  - the back link, phase banner, footer and skip link;
  - the error-summary and form patterns;
  - a session-timeout dialog.

### Where the editor falls short today

| What                    | Evidence at `22c3336`                                                                                                                                                                                        | Cost                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Focus ring contrast     | `rg -n "ring-ring/50" src` finds it in `button.tsx`, `badge.tsx`, `roadmap-card.tsx`, the header and the skip link. `--ring` is `oklch(0.708 0 0)` at 50%, about 1.5:1 on white                              | Fails WCAG 1.4.11; axe does not test focus indicators |
| Control borders         | `--input: oklch(0.922 0 0)`, about 1.2:1                                                                                                                                                                     | Form controls in the coming editor would fail 1.4.11  |
| Raw palette colours     | `rg -no "\b(bg\|text\|ring)-(neutral\|indigo\|amber\|emerald\|black\|white)" src --glob '!src/components/ui/**' --glob '!*.test.*'` finds 9, in `brand-mark`, `connection-status` and `roadmaps-error-state` | Off-token, with per-component `dark:` handling        |
| A competing accent      | `rg -n "brand" src --glob '*.tsx'` finds the indigo `--brand` token in `roadmap-icon` and `welcome-hero`, plus the indigo-on-black brand mark                                                                | Off-brand                                             |
| Nothing enforces tokens | No lint rule or test rejects a palette class, a bracket value or an inline colour                                                                                                                            | Every story can drift; review is the only guard       |
| Toasts repeat the page  | `auth-notifications.tsx` toasts OAuth failures that the start page also shows inline; DHCW has no toast                                                                                                      | Transient, easy to miss with a magnifier              |
| Silent session end      | The token lasts about an hour; the app expires 60 s before Google's expiry and only then asks the user to reconnect                                                                                          | The coming editor would lose the user's flow          |

## Options

How to bring the design system in:

- **(a) Port tokens and patterns onto shadcn/Base UI** (recommended). Its values become
  CSS custom properties behind our semantic tokens, and our components adopt its look.
  - Keeps one component system and our accessibility work.
  - Costs a drift check against the pinned version.
- **(b) Load `nhsw.css` and use its classes.** Its global element styles fight
  Tailwind, it gives us two component systems, and no React components come with it.
- **(c) Compile its Sass for tokens only.** This adds a Sass toolchain to a CSS-first
  Tailwind setup to read about forty variables, and the tag palette isn't even in its
  tokens.
- **(d) Wait for React components from DHCW.** There is no sign of any; the editor
  would stay off-brand indefinitely.

## Recommendation

Take (a), in this order:

1. foundations (tokens, type, focus);
2. enforcement (a locked Tailwind theme plus lint rules, so off-token styling fails the
   build);
3. components;
4. shell and pages;
5. notifications and the session warning;
6. visual regression.

Use DHCW's mobile type scale at every width for density. Keep dark mode as a tested
extension, and defer the dashboard sidebar until there is navigation for it.

These are the recommendations as presented to the owner, which decision 7 approved:

- **Take as-is:**
  - the yellow focus indicator;
  - Roboto with its latin-ext subset;
  - sentence case;
  - the tag palette for statuses;
  - the yellow skip link;
  - the error-summary and form rules (they come with the roadmap editor);
  - the back link.
- **Adapt:**
  - buttons: bold, with the 2px bottom shadow; a navy primary and a white secondary; a
    40px default and a 32px size for dense toolbars;
  - cards: square and white, a link-styled title, a chevron and the 4px bar;
  - alert variants from the notification banner, warning callout and inset text;
  - a navy header with the logo and the status as a chip;
  - a plain start page in place of the hero;
  - a "Beta" phase banner with a feedback link;
  - a footer with the organisation and version.
- **Don't adopt:**
  - the 19px body and 48px h1;
  - one question per page;
  - full-width buttons in the header;
  - a purple visited colour for in-app navigation (it stays for external links in body
    text).
- **Quality fixes:**
  - the focus ring;
  - `--input` at 3:1;
  - removing `--brand` and gradient decoration;
  - failures inline, not by toast;
  - a session-expiry warning (spike first);
  - a few screenshot regression tests.

## Decisions needed

| #   | Decision                                                  | Recommended                               | Owner answer (2026-11-10)                                    |
| --- | --------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| 1   | How to bring the design system in                         | (a) port tokens and patterns              | (a), "implement your recommended approach"                   |
| 2   | Dark mode, which DHCW lacks                               | Keep, as a tested extension               | Keep                                                         |
| 3   | Type scale                                                | DHCW's mobile scale at every width        | Yes                                                          |
| 4   | The DHCW logo                                             | Use it once permitted                     | Permission given                                             |
| 5   | The dashboard sidebar shell                               | Defer until there is a second destination | Hold; note it for adoption when the relevant story lands     |
| 6   | Enforcing semantic tokens                                 | Locked theme plus lint rules              | Yes: "capture any new linting rules that enforce" the tokens |
| 7   | Toasts and the session warning; the other recommendations | As recommended                            | Approved with the recommended approach                       |

## Outcome

Decided in [ADR-010](../adr/ADR-010-align-the-ui-with-the-dhcw-design-system.md) and
planned as [EPC-003](../backlog/EPC-003-dhcw-design-alignment/README.md).
