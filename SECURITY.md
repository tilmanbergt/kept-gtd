# Security policy

Kept GTD is a plugin for the Supernote, made by one person in their spare time. This page says
which versions get security fixes, how to report a vulnerability privately, and what Kept touches.

## Supported versions

Security fixes go into the **latest release** on
[GitHub Releases](https://github.com/tilmanbergt/kept-gtd/releases), and into a beta while it is the
current one. Older versions get no fixes: update to the latest release.

## Reporting a vulnerability

Please report it **privately**, not in a public issue:

1. Open the repository's **Security** tab and choose **Report a vulnerability** (GitHub's private
   vulnerability reporting).
2. Describe what you found:
   - the Kept GTD version (Settings → About) and the Supernote model and firmware;
   - what an attacker could do, and what they need for it (for example a file on the device, a
     calendar link, a network position);
   - the steps to reproduce it, as short as you can make them.

Don't attach a debug bundle, profile files or project files with real content. If one is needed,
you'll be asked for it, and you can remove names first.

## What happens next

- You get an answer within a week. This is a best effort: it's a one-person project.
- If the report is confirmed, the fix comes in a patch release, and the release notes say what was
  fixed once it is out.
- You're credited in the release notes if you want to be.

## What Kept touches

The details are in [PRIVACY.md](PRIVACY.md). In short:

- **Your files**: the project, area and Inbox files and the notes in your PARA folders on the
  Supernote, `EXPORT/kept-gtd` for what you export, and `MyStyle/kept-gtd` for an update you
  download; elsewhere it only reads a file you choose (to link it, or as a note background). It
  deletes only after a confirmation that names what is deleted.
- **The plugin's private folder** on the device: settings, lasso mark pictures and temporary files.
- **Google Calendar and Gmail**, both optional, experimental and off by default: the private
  calendar (ICS) link and the Gmail app password you enter are stored unencrypted in the plugin
  settings on the device, never in a file, a log, a debug bundle or a profile.
- **Updates**: the update check and download talk to this repository's GitHub releases
  (`api.github.com`, `github.com`). A downloaded package is checked against the release's checksum
  before it is kept. You install it yourself.

There is no account, no server of its own and no telemetry.
