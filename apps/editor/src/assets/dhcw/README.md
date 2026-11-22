# DHCW logo and icon

The app's header shows the DHCW logo (`nhsw-logo.svg`, white, for the navy header) and
the DHCW icon (`dhcw-icon-white.svg`, white, below the `sm` breakpoint). `public/favicon.svg`
is the same icon in white on a DHCW navy tile, so it reads on light and dark browser chrome.

## Provenance and permission

- **Source:** `preview/assets/` of the DHCW design system,
  <https://github.com/DHCW-Digital-Health-and-Care-Wales/dhcw-design-system>, release
  v0.1.104, commit `bc52697f812699d7701959d8e82f6aa7bcf80fe9` (the release `package.json`
  pins). The files are not in the package's published files.
- **Not covered by DHCW's MIT or OGL licences.** The logo and icon are DHCW branding. The
  owner gave permission to use them in this app on 2026-11-10 (STY-016 D1, ADR-010
  _Branding_). Do not reuse them elsewhere, and do not use them for a project outside DHCW.
- **Changes:** none to the two copied files, which are byte-for-byte the pinned release's.
  Check any replacement for scripts and external references first. These two contain only
  the SVG namespace declaration and one `<style>` rule (`.cls-1{fill:#ffffff;}`): no
  script, event handler, link or embedded image. `public/favicon.svg` is derived: the
  icon's paths inside a navy rounded square.
- **Upgrading:** when the DHCW pin moves (`src/styles/AGENTS.md`), compare these files with
  the new tag's `preview/assets/` and copy any that changed.
