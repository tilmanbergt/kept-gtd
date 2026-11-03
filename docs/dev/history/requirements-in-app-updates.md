# In-app updates from GitHub - requirements

Status: **requirements decided 2026-11-03**, release **0.24.0** "Launch ready". Design: docs/dev/history/technical-design-in-app-updates.md.

Why: an InkHub review takes long, and a resubmission takes the old version off InkHub meanwhile. Kept
should tell users about new releases itself and put the official `.snplg` on the device, so a fix
reaches them in minutes instead of weeks. Kept never installs anything itself: Supernote's own
installer (Settings → Plugins → Add plugin) stays the only way a build gets installed.

## U - Update check and download

- **U1 Source.** Only the official releases of `tilmanbergt/kept-gtd` on GitHub, read through the public
  API (`/releases/latest`: no drafts, no pre-releases). No account, no token, no server of our own.
- **U2 Newer?** A release counts only if its tag `vX.Y.Z` is newer than the running build and it has
  exactly one asset named `kept-gtd-X.Y.Z.snplg`. Anything else is ignored (and logged). An alpha or beta
  build towards X.Y.Z counts as older than the final X.Y.Z: a `0.24.0 beta` is offered `0.24.0`.
- **U3 Check by hand.** Settings → About: **Check for updates**. Result in the status slot: "Kept GTD is
  up to date (0.25.0)" / "Kept GTD 0.26.0 is available" / the reason it failed (no network, GitHub
  unreachable, no permission).
- **U4 Check automatically (opt-in, off by default).** Setting **Check for updates automatically**:
  at most once a day, when Kept opens, in the background after the first screen is drawn. Never blocks
  or slows the start. Silent on failure (log only).
- **U5 Notice.** When a newer release is found: a notice like What's new - "Kept GTD 0.26.0 is
  available", the release notes from the release body, **Download** and **Not now**. **Not now** hides
  the notice for this version; the next version shows it again. About keeps showing "0.26.0 available"
  until it is installed.
- **U6 Download.** Into `MyStyle/kept-gtd/` (Add plugin also lists subfolders of `MyStyle`), as
  `kept-gtd-X.Y.Z.snplg`. Written to the private folder first, checked (U7), then moved into `MyStyle`.
  If that file already exists and matches, no new download: "Already downloaded: MyStyle/kept-gtd/kept-gtd-0.26.0.snplg".
- **U7 Check the file.** Size and SHA-256 must match what the GitHub API reports for the asset; if they
  don't, the temp file is removed from the private folder and nothing lands in `MyStyle`.
- **U8 How to install, said plainly.** After the download: "Saved to MyStyle/kept-gtd/kept-gtd-0.26.0.snplg. To
  install: close Kept, then Settings → Plugins → Add plugin → choose this file. Your data stays where it
  is." Same text in Help.
- **U9 Nothing is deleted.** Downloaded files stay in `MyStyle`; the user removes old ones if he wants.
  No FILE:DELETE for this feature.
- **U10 Permissions.** INTERNET is asked right before the first check (by hand or automatic), as today
  for Calendar and Gmail. If it is refused, the automatic check stays quiet and the manual check says why.

## S - Setup assistant

- **S1** New choice in the setup assistant (claude/feature-easy-start-0.23.md S2): **Updates** -
  "Check for new versions on GitHub once a day" yes / no (default: no), with one line on what it does
  and the disclaimer (D1). Later: Settings → About.

## D - Disclaimer and transparency

- **D1** Wherever the GitHub updater is offered (setting, notice, setup step, Help, README): "Releases on
  GitHub are not reviewed or approved by Ratta. You install them at your own risk. Each release is
  tested to keep your data safe."
- **D2** `docs/inkhub-review.md` and `PRIVACY.md`: INTERNET now also covers the update check (GitHub API
  and download, only when the user taps or has switched on the daily check; no data is sent besides the
  normal HTTPS request).
- **D3** The InkHub build contains the updater like the GitHub build (no separate build). No conflict
  with InkHub expected.

## X - Developer mode (later, low priority)

- **X1** Settings → Advanced: checkbox **Developer**. Only when it is on, the very advanced options show:
  Simulate screen (Nomad), debug-only switches, and the update channel (X2). Users never see them by
  default.
- **X2** Update channel **Stable / Beta**: Beta also offers GitHub pre-releases (`vX.Y.Z-beta.N`).
- **X3** Alpha builds (every push) are Actions artifacts today; GitHub only lets logged-in users download
  those, so Kept can't fetch them. Would need publishing alphas as a pre-release too (e.g. one rolling
  `alpha` pre-release replaced on each push to main). To decide when X is planned.

## Out of scope

- Installing or launching the installer from Kept.
- Deleting old downloads.
- Downgrades, rollbacks, pre-releases outside developer mode.

## Decisions on the former open points (2026-11-03)

1. Add plugin lists subfolders of `MyStyle` → files go to `MyStyle/kept-gtd/`.
2. Writing to `MyStyle` with FILE:WRITE is assumed to work (checked in the device test).
3. Installing a GitHub build over an InkHub one (and back) is assumed to work; InkHub is mainly a hub for
   reviewed `.snplg` files (checked in the device test).
4. Release notes reuse the What's-new renderer (design).
5. Ships in **0.24.0**, so it can be tested before the InkHub launch.
