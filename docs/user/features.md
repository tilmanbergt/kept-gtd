# Features and integrations

[Settings → Features](settings.md#features) switches parts of Kept GTD on or off. A switch takes effect at once, on every tab. Switching something off only hides it: your files and its settings stay as they are, and switching it on again brings everything back.

## Project close-out

On by default. When a project is done, [Close out…](close-out.md#where-to-start-it) walks you through a checklist, where its outcomes go and an archive PDF before the folder moves to the Archive.

Off: a [Done](projects-and-areas.md#status) project shows **Archive…** on its page and **Archive** in the Weekly Review's step [Done awaiting review](review.md#the-steps), and moves to the Archive after one confirmation, without the checklist and the PDF. A close-out you started earlier stays in the project's file.

## Experimental

These depend on outside services or on reading your notebooks, and may be slow or stop working:

- [Google Calendar](features.md#google-calendar): your Google Calendar in Daily, Week, Month, Inbox, Projects/Areas and Review
- [Gmail](features.md#gmail): the Gmail inbox step in the Weekly Review
- [Notebook contents](projects-and-areas.md#contents-experimental): the headings list on a project's or area's [Notebook tab](projects-and-areas.md#the-notebook-tab)

## Google Calendar and Gmail (experimental)

Both integrations are *experimental*: they depend on Google's services, can be slow on the Supernote and may stop working when Google changes something. They are off until you switch them on under [Experimental](features.md#experimental). Switching one off only hides it; its settings are kept.

The Supernote needs a network connection for both. Kept GTD only connects when you tap Load or Refresh.

## Google Calendar

Kept reads your calendar through its private address in iCal format. It only reads; nothing is written to Google.

1. On a computer, open Google Calendar, then the settings of your calendar, and copy the **secret address in iCal format**.
2. Switch on **Google Calendar** under Experimental.
3. Paste the address in [Settings → Calendar](settings.md#calendar-and-gmail) and tap **Save**.

A **Google** tab then appears in [Daily](daily.md#schedule-and-cards), [Week](week-and-month.md#week), [Month](week-and-month.md#month), [Inbox](quick-add.md#the-inbox), a project's [Current](projects-and-areas.md#the-current-tab) tab and the Review's [Week ahead](review.md#the-steps) step. Tap **Load Google Calendar**. You can copy an event into a Kept meeting with one tap; copied events get a check mark, and **Hide existing** hides them. Events copied on the Month tab become [monthly highlights](week-and-month.md#month).

Keep the secret address private - anyone who has it can read your calendar. You can reset it in Google Calendar.

## Gmail

Kept reads your Gmail inbox over IMAP with an *app password*, not your normal password.

1. In your Google account, turn on 2-step verification (required for app passwords) and create an app password.
2. Switch on **Gmail** under Experimental.
3. In [Settings → Gmail](settings.md#calendar-and-gmail), enter your Gmail address and the app password, and tap **Save**.

The Weekly Review then has a [Gmail inbox](review.md#the-steps) step. Tap **Load Gmail inbox**, open an email and:

- create todos or meetings from it; select text in the email and tap **→ Todo** or **→ Meeting** to use it
- save PDF, EPUB or text attachments into the project and link them
- save the email text as a note
- archive the email in Gmail when you are done

Emails you have created something from get a check mark during the review. The option **Hide emails already turned into a Task/Meeting** in Settings → Gmail hides them.

The app password is stored inside the plugin on the Supernote. You can revoke it in your Google account at any time.
