# Working on Kept GTD

Kept GTD (formerly gtdpara) is a Supernote e-ink plugin (React Native + `sn-plugin-lib`, native Kotlin
modules). Its identity is `keptgtd` (pluginKey, app name; pluginID `nj7yssrvl7g778tz`), its stored
keys start with `kept:` (`src/domain/storeKeys.ts`). What the user never sees and what is already
in their notes and files keeps `gtdpara`: the Android package, native module and TS names, the
`[GtdPara]` log prefix, the note markers, the profile format `gtdpara-profile` and `.gtdpara-tmp`
(`docs/dev/history/technical-design-clean-break.md` §3, pinned by `__tests__/pluginIdentity.test.ts`).

**Before any change, read and follow `docs/dev/DEVELOPMENT-POLICY.md`.** Every feature, bugfix
and release ends with its checklists (§8 for changes, §9 for releases): architecture, UI,
logging, help pages, CHANGELOG, tests, device test.

Short version:

- Features: clarify requirements, then a technical design in `docs/dev/history/`, then implement.
  Bugs: exact failure, then root cause, then fix.
- `src/domain/` stays pure (no React Native, no `sn-plugin-lib`, no I/O).
- Comments say what and why, never when: no dates, no change history. New files stay ≤ 1,000 lines.
- Files are the source of truth; secrets never go into files, logs or debug bundles.
- Living docs (`docs/dev/README.md` lists them) describe the current state only; open work goes
  to the internal backlog `claude/next-improvements.md`, never into repo docs.
- User-visible change = help page (`docs/user/`, device-safe markdown) + a line under
  `## [Unreleased]` in `CHANGELOG.md`, in the same change.
- Checks in tiers (`DEVELOPMENT-POLICY.md` §7): each cloud step runs `npm run check:affected` (plus
  `-- --area <ids>` for the areas the design names), the end of a release's steps runs the full
  `npm run check`; CI runs everything with coverage on every push, `release.ps1` once on the release
  commit. A design's test scenarios become scenario tests (`__tests__/scenarios/`); new files belong to
  a feature area (`scripts/test-areas.json`). Then a device test with a build
  labelled for the release being worked on (`./buildPlugin.ps1`, `RELEASING.md` §4).
- Branches: `main` is always releasable; features on `feature/<name>`, merged with `--no-ff`.
  Releases only via `scripts/release.ps1` from `main` (`docs/dev/RELEASING.md`).
- **End every change, build or release with a short, numbered, copy-paste-ready guide for
  Tilman**: what to commit (with message) on which branch, whether to build and what to test on
  the device, whether to push/merge, whether a release is advisable (`RELEASING.md` §8).
- Code review rules (what Codex and other reviewers flag): `AGENTS.md` `## Review guidelines`.
- Architecture rules in detail: `docs/dev/design-overview.md` §3. Build and code tour:
  `docs/dev/README.md`. Git, build and release workflow: `docs/dev/RELEASING.md`.
