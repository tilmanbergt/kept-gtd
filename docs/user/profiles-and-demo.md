# Profiles and the demo space

A *profile* is a complete configuration: which [folders](settings.md#folders) Kept GTD uses, your [contexts](contexts.md), [Note setups](note-setups.md), review dates, the [calendar and Gmail](features.md#google-calendar-and-gmail-experimental) setup and the [experimental switches](features.md#experimental). You can keep several and switch between them - for example your real setup and a demo setup for trying things out.

## Profiles

Go to [Settings → Data](settings.md#profiles). The Profiles list shows every profile; the active one has a ●.

- **Save** writes the active profile to its file.
- **Restore** appears next to the active profile when Kept runs on fresh settings (after a fresh install, see [Saved profiles](profiles-and-demo.md#saved-profiles)): it loads the settings from the active profile's file and leaves the file as it is. When Kept could not read its stored settings, **Restore** appears instead of **Save** and puts the settings from the file back (see [Troubleshooting](troubleshooting.md#common-situations)).
- **Switch** changes to another profile, after you confirm in the [status line](index.md#the-status-line). Kept saves the current profile first, then loads the other one and starts the app fresh with it. On fresh settings nothing is saved first: your saved profile stays as it is.
- While a profile other than Production is active, its name (for example `DEMO`) is shown in the tab bar. Tap it to get back to the profile list.

The first time you open the list, your current setup is saved as `production.json`, so you can always switch back to it. If `production.json` already exists, it is left as it is.

## What switches and what doesn't

Switches with the profile: folders, contexts and the active context, Note setups, review state, calendar and Gmail setup, experimental switches, recent tags.

Stays the same for all profiles: [keep tabs in memory, performance tracing](settings.md#advanced), [debug logging](troubleshooting.md#reporting-a-problem).

## Profile files

Profiles are files in `EXPORT/kept-gtd/profiles`, one `.json` file per profile. To import a profile, copy its file into that folder and tap **Refresh list**. To share your Note setups or folder setup, share the file.

To move your setup to another Supernote, or to keep it over a reinstall of Kept: **Save** each profile, copy the files in `EXPORT/kept-gtd/profiles` (they stay on the device when you uninstall Kept), put them into that folder on the new install, then open Kept: **Welcome back** offers to load them ([Saved profiles](profiles-and-demo.md#saved-profiles)). A profile saved by an earlier Kept GTD loads too.

The Gmail app password and the calendar link are never written into these files. They stay inside the plugin, separately for each profile.

## Saved profiles

After a fresh install, or after [Remove Kept's data](settings.md#remove-kepts-data), Kept starts on fresh settings. When it finds profiles you saved earlier in `EXPORT/kept-gtd/profiles`, the [setup assistant](settings.md#setup-assistant) opens with **Welcome back** first: one row per saved profile with the date it was saved, the newest selected.

- **Load "Production"** (with the name of the profile you picked) loads it: your folders, Note setups and contexts are back, the assistant closes and the [status line](index.md#the-status-line) says which profile was loaded. The Gmail app password and the calendar link are never in profile files - enter them again on the [Features](settings.md#features) tab.
- **Start fresh** goes on to the setup steps as on a new install. Your saved profile stays as it is, and you can still load it later with **Restore** in [Settings → Data → Profiles](profiles-and-demo.md#profiles).

Until you load or save a profile, Kept never writes the fresh settings into a saved profile without asking: **Save** on the active profile asks first ("Replace your saved profile …"), **Switch** saves nothing first, and [Remove Kept's data](settings.md#remove-kepts-data) starts with *Save the active profile first* unticked.

Your notes and files are not changed either way.

## The demo space

**Create demo space** writes a small fictional setup to `Note/kept-gtd-demo`: five projects (one on hold, one done), five areas and an Inbox (in `2 Areas/0 Inbox`), with todos, meetings, [focus blocks](meetings.md#focus-blocks), tags and two [contexts](contexts.md), **Work** and **Home** (the [chip](contexts.md#choosing-one) starts at Everything). Dates are set relative to today, so it always looks current. It also adds the profile "Demo" that points to these folders. In the demo, every note of a project or area goes into its [home notebook](projects-and-areas.md#home-notebooks) - create one with the [notebook icon](projects-and-areas.md#the-notebook-icon) on "Garden renovation" to see its [Home page](projects-and-areas.md#the-home-page). The area "Coaching" has a sparring [thread](threads.md) with Jordan, `#sparring/jordan` (past meetings, agreed todos) and a [loop](loops.md) with a meeting today, to try [Engage](engage.md). The area "Sport" has a loop `#race/marathon` whose note is Sport's home notebook, and yesterday's "Coach call": open its note, add a page after it and write a heading to see which section a page belongs to ([Which owner a page belongs to](engage.md#which-owner-a-page-belongs-to)). A demo profile from an earlier version keeps its Note setups: there, add a Loop setup on the tag `race` with the notebook name `{name} {year}` in [Settings → Note setups](note-setups.md#editing-a-setup).

Existing files are never overwritten, so a demo space created with an earlier version keeps its names (its sparring partner has another name) until you create it again. To start the demo from scratch, delete the `Note/kept-gtd-demo` folder and create it again.

The demo space is useful for:

- trying out Kept before using it with your own data
- testing Note setups or new features without touching your real notes
- reproducing a problem, so that others can see exactly the same thing
