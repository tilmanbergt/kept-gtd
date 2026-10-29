# Contexts

A *context* is a place you work in - Work, Home, a café with only the Supernote. It decides what Daily, Week, Month, Projects, Areas and the Weekly Review show, so the day in front of you holds only what fits where you are. A context like Home may show almost nothing: that is rest, not a gap.

## Choosing one

The chip in the tab bar, left of ✕, names the active context (**Everything** when none is chosen). Tap it to open **Settings → Contexts**: **Everything** and your contexts, each with how many next todos it shows and a one-line summary. Tap the **○** in front of one to make it active (●); the status line confirms it ("Context: Home"). Then go back to the tab you were on.

The context stays until you choose another, also after closing Kept GTD. Each profile has its own contexts.

## What a context shows

A context has a **Shows** list and a **Hides** list. Each holds areas, projects and tags:

- an *area* brings its projects, and the loops and threads in them;
- a *project* is just that project;
- a *tag* brings every todo and meeting with that tag or a tag under it: `#sparring` also brings `#sparring/jordan`. Loop and thread tags work the same way.

The rules:

- *Hides wins*: what Hides names is left out, even when Shows names it too.
- A context with a Shows list shows only what that list names. Projects and areas no context mentions show only under **Everything**.
- A context with an empty Shows list shows everything except what Hides names ("everything but work").
- The [Inbox](quick-add.md#the-inbox) always shows, in every context. Todos that are due follow the context like any other; the hidden line warns about hidden ones that are due: "3 due!".
- **Meetings** are never hidden. Meetings outside the context are drawn faint (dimmed), or shown as usual if you choose that for the context.

## Where it applies

- [Daily](daily.md): the next todos of the context; meetings outside it dimmed.
- **Week and Month**: meetings outside it dimmed; [Given time](week-and-month.md#given-time) counts only what the context shows.
- **Projects and Areas**: only the context's projects and areas.
- [Weekly Review](review.md): each step lists the context's items and todos. The overview shows "+2 in other contexts" next to a step's count. **Reviewed** and the reminder dot count every context: reviewing a step under Home marks it reviewed for all.

Not filtered: the Inbox tab, a project's or area's own page (Current), Settings, Engage, and the thread and loop overviews.

## The hidden line

A filtered tab ends with a line like "Hidden by Work: 9 todos · 2 loops · 1 thread · 3 due! · Show". "3 due!" counts the hidden todos due today or earlier, so nothing urgent slips by unseen. **Show** shows everything on that tab until you leave it; the context itself stays.

When Quick Add files a todo where the active context doesn't show it, the status line says so: "Saved to Team · hidden by Home".

## Setting up contexts

In **Settings → Contexts**, tap **+ New context** and type its name; **Save** and **Delete** sit right next to the name. Under **Shows**, tap the areas the context is about - usually that is all it needs, an area brings its projects. **Projects** and **Tags** switch the list below to projects or to tags, for the rarer cases; loop and thread tags are not offered there. Switch to **Hides** for what to leave out. **Meetings outside this context**: Dimmed or Shown as usual. **Given time: loops and counterparts from** sets how much time a loop or thread needs in **a week** and **a month** to be listed in Given time on Week and Month (**all** lists every one). The preview counts how many next todos it shows. **Save** stores it at once; **Delete** removes it (your files are not touched).

Tap **Everything** (not its ○) to set the same threshold for Everything: 1 h a week and 2 h a month unless you change it. A context without its own threshold uses Everything's. Everything's threshold is saved as soon as you tap it.

When you rename a project's or area's folder and Kept GTD offers to rename its [home notebook](projects-and-areas.md#home-notebooks), its contexts follow the new name. Otherwise [Run Integrity Check](settings.md#advanced) (Settings → Advanced) lists contexts that name a project or area that isn't there any more.
