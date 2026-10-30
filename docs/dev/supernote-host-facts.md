# Supernote host facts

> **About this document.** This is a living document. It collects how the Supernote and its
> plugin host behave where Ratta's SDK documentation (`sn-plugin-lib`, docs.supernote.com) says
> nothing, says it unclearly, or says something else - facts found by testing on the device or
> by tracing a bug. Each entry says what the host does, how it was found, and where Kept GTD deals
> with it. It describes the current behavior in present tense; the bug or design that found a
> fact is named as its source in `docs/dev/history/`. Screen sizes, typography and space budgets
> are in `design-device-rendering.md`; the architecture rules that follow from these facts are in
> `design-overview.md`. When a new host fact turns up, add it here in the same change; when a
> firmware or library update changes one, update the entry.

Measured on: Supernote A5 X, plugin firmware Chauvet 2.27.42, `sn-plugin-lib` 0.2.3.

## 1. Keywords

- **At most 43 characters per keyword.** The keyword dialog cuts longer input silently;
  `PluginFileAPI.insertKeyWord` rejects it with "The keyword exceeds the maximum length limit.
  Cannot call the related API!". `sn-plugin-lib` neither documents nor checks the limit.
- **Characters, not bytes**: an umlaut counts as one, the same as JavaScript's `.length`.
  Measured by typing `1234567890` six times (43 kept) and `123456789ä` repeated (43 kept, four
  of them "ä").
- In Kept: every keyword is built through `fitKeyword` (`domain/keywordLength.ts`):
  unchanged up to 43, otherwise tags left out, then cut at a word boundary with "…". The page
  engine (`storage/sharedNotePages.ts`) refuses a longer keyword before it writes a page.
  Source: `docs/dev/history/technical-design-keyword-length.md`.
- `getKeyWords` returns each keyword with a 1-based `index` per page; `deleteKeyWord` takes that
  index, and deleting shifts the indexes after it. Kept reads the index right before it
  deletes and never computes it (`renameKeywordAt`, `syncPageKeywords`).

## 2. Notes and pages

- **Creating a note works only when the plugin was opened from a note.** From a document (PDF,
  EPUB) `PluginFileAPI.createNote` fails with "This app is not allowed to use this API", so
  creating a linked note or a notebook needs Kept to be opened from a note. Kept doesn't try
  when it knows it was opened from a document and shows its own sentence for the host's refusal
  (`domain/noteCreation.ts`).
- `createNote` needs a fixed template name (`style_white`, or a MyStyle file path); a template
  reference from `getNoteSystemTemplates()` does not resolve there.
- **Horizontal notes**: `createNote(..., isPortrait = false)` makes one; `getPageSize` reports
  its pages as 1872 × 1404 px, and `insertNotePage` adds horizontal pages to it. Element
  coordinates are page pixels from the top left; a text box placed below the page is stored
  but never visible. The host's page bar covers about the bottom 100 px of a page.
- Inserting a page and adding its keyword are two separate calls; nothing makes them atomic.
  Kept checks what it can (the keyword length) before the first call.

## 3. Coordinates

- With the plugin firmware above, every coordinate the SDK reads or takes is an Android pixel on
  the page's real size from `PluginFileAPI.getPageSize`; a `.note` page on the A5 X is
  1404 × 1872 px. Ratta changes such semantics without a major version, so `sn-plugin-lib` is
  pinned exactly (`design-overview.md` §4 "Page-size pixels everywhere").

## 4. Permissions

- The host's permission bridge can hang without answering. Every permission check goes through
  a wrapper with an 8-second timeout (`supernote/pluginPermissions.ts`).
- Network sockets are blocked ("has no NETWORK permission for: ip:port") until the runtime
  INTERNET permission is granted, also again after a reinstall. Kept checks it right before
  every network call (`ensureInternetPermission`).

## 5. Display and input

- The e-ink panel does not always show a change that arrives without a tap. Kept refreshes
  explicitly (`utils/screenRefresh.ts`'s `requestEinkRefresh()`, `useEinkRefreshOnLoad()`).
- Android's native text-selection toolbar does not work in the plugin host;
  `ui/ClipboardTextInput.tsx` has its own Select All/Copy/Cut/Paste strip.
- **Rotation**: the plugin view turns with the device while Kept is open, without a restart. The
  window goes from 994 × 1325 dp to 1325 × 994 dp on the A5 X and `Dimensions` reports the
  change; below the tab bar Kept has 994 × 1238 dp upright and 1325 × 906 dp turned.
- **Font scale**: the A5 X reports a font scale of 1.15 - text renders 15 % larger than the
  `FONT` sizes. The row heights in `design-device-rendering.md` are measured with it.

## 6. Lasso

- On a cold plugin start the host can drop the lasso while the plugin is still reading it
  (error 904). Kept takes the lasso picture first, before the slower reads
  (`design-overview.md` §2.10, "Recognition").

## 7. Files outside Note

Checked on the device in 0.23 with a diagnostic screen since removed. Source:
`docs/dev/history/technical-design-easy-start.md` §7.

- **Listing**: `listFolderEntries('/storage/emulated/0')` lists every top-level folder - the
  Supernote's own (`Note`, `Document`, `EXPORT`, `INBOX`, `MyStyle`, `SCREENSHOT`) next to Android's
  and the apps' (`Android`, `DCIM`, `Alarms`, `Download`, …). Folders below them, `Document` and its
  subfolders for example, list like folders in `Note`. The Files pane's Device tab offers only the
  Supernote's folders and `Download` (`domain/linkTargets.ts`'s `DEVICE_FOLDERS`).
- **SD card**: without a card, `/storage` lists only `emulated` and `self`, the internal storage's own
  names. Kept treats any other entry that lists something as an SD card (`storage/deviceRoots.ts`).
- **Opening**: `openPath` opens a PDF, an EPUB and a `.note` outside `Note/` the same way as inside.
  `openPath(path, -1)` reopens a PDF or a note at the page last read there.
- **Launch file and page**: when Kept is opened from a document, `getCurrentFilePath` returns the
  document's absolute path as it does for a note, and `getCurrentPageNum` the page on screen, 0-based:
  the same index `openPath` takes. A stored page link writes it 1-based (`#page=12` for index 11,
  `domain/sharedNotePages.ts`'s `buildPageAnchor`), as lasso links do.

## 8. Installing builds

- The host can install a new build into the running process instead of restarting it, so two
  builds end up loaded in one process. The plugin firmware Kept requires unloads the old build;
  every build still gets a higher `versionCode`. Source:
  `docs/dev/history/technical-design-host-update-crash.md`.

## 9. Uninstalling

- Uninstalling the plugin keeps what it stored in the host's key–value store (`AsyncStorage`: the
  settings, the profile secrets, recent tags and places, the calendar cache); a reinstall finds
  everything again, including the Gmail app password and the calendar link. Only the runtime
  permissions are reset: the next start asks for them again. Seen on the device with 0.23.0.
- The SDK gives a plugin no uninstall event (`sn-plugin-lib` has start and stop listeners only), so
  Kept can't clean up when it is removed. Settings → Data → Remove Kept's data does it on request
  (`docs/dev/history/technical-design-remove-data.md`).
