# Contexts

A *context* is a place you work in - Work, Home, a café with only the Supernote. It decides what [Daily](daily.md), [Week](week-and-month.md#week), [Month](week-and-month.md#month) and [Projects, Areas](projects-and-areas.md) show, so the day in front of you holds only what fits where you are. A context like Home may show almost nothing: that is rest, not a gap.

## Choosing one

The chip in the tab bar, left of ✕, names the active context (**Everything** when none is chosen). Tap it to open **Settings → Contexts**: **Everything** and your contexts, each with how many next todos it shows and the sentence that says what it shows. Tap the **○** in front of one to make it active (●); the [status line](index.md#the-status-line) confirms it ("Context: Home"). Then go back to the tab you were on.

The context stays until you choose another, also after closing Kept GTD. Each [profile](profiles-and-demo.md#profiles) has its own contexts.

## What a context shows

A context has a **Show** list and an **Except** list. Show has two parts:

- *where*: areas and projects. An area brings its [projects](projects-and-areas.md#projects-of-an-area), and the [loops](loops.md) and [threads](threads.md) in them; a project is just that project.
- *what*: tags. A tag brings every todo and meeting with that tag or a tag under it, wherever it lives: `#sparring` also brings `#sparring/jordan` ([Nested tags](tags.md#nested-tags)). A loop or thread type brings all its loops or threads: **All #workshop loops**, **All #sparring threads**.

The rules:

- Within a part, any entry is enough. A part with nothing in it sets no limit; with both parts empty the context shows everything (except what Except names).
- With both parts filled, a todo shows when it fits either part: "Show Work, plus #computer everywhere". Tick **Only inside the selected areas and projects** to show only what fits both: "Show #computer in Work".
- *Except wins*: what Except names is left out, even when Show names it too.
- A project or area is listed when the context shows it, or when it holds an open todo or a meeting from today on that the context shows; an area also when one of its projects does. So a context of tags only - an "Errands" with `#errand` and `#shopping` - still lists the projects and areas where there is an errand to do.
- The [Inbox](quick-add.md#the-inbox) always shows, in every context. Todos that are due follow the context like any other; the [hidden line](contexts.md#the-hidden-line) warns about hidden ones that are due: "3 due!".
- **Meetings** are never hidden. Meetings outside the context are drawn faint (dimmed), or shown as usual if you choose that for the context.

## The sentence

On top of the editor and in the list of contexts, one sentence says what a context shows. Places are joined with "and", tags with "or"; a long list ends "and 3 more". For example:

- "Show Work, Coaching and Home"
- "Show #computer everywhere"
- "Show Work, Coaching and Home, plus #computer everywhere"
- "Show #computer in Work, Coaching and Home except #wifi"
- "Show #computer everywhere except in Home"
- "Show everything except Home, Work and #computer"
- "Show all #workshop loops everywhere"

## Where it applies

- [Daily](daily.md): the next todos of the context; meetings outside it dimmed.
- [Week and Month](week-and-month.md): meetings outside it dimmed; [Given time](week-and-month.md#given-time) counts only what the context shows.
- [Projects and Areas](projects-and-areas.md): only the context's projects and areas.
- [Weekly Review](review.md): only when you ask for it. Review starts in **Everything**, because a context is for doing the work; **Review only in Home** on its overview narrows it, see [Reviewing in a context](review.md#reviewing-in-a-context).

Not filtered: the [Inbox](quick-add.md#the-inbox) tab, a project's or area's own page ([Current](projects-and-areas.md#the-current-tab)), Settings, [Engage](engage.md), and the [thread](threads.md#opening-the-overview) and [loop overviews](loops.md#the-loop-overview).

## The hidden line

A filtered tab ends with a line like "Hidden by Work: 9 todos · 2 loops · 1 thread · 3 due! · Show". "3 due!" counts the hidden todos due today or earlier, so nothing urgent slips by unseen. **Show** shows everything on that tab until you leave it; the context itself stays.

When [Quick Add](quick-add.md) files a todo where the active context doesn't show it, the [status line](index.md#the-status-line) says so: "Saved to Team · hidden by Home".

## Setting up contexts

In **Settings → Contexts**, tap **+ New context**. On top of the editor, on every tab: the context's name with **Save** and **Delete**, the sentence of what it shows, and how many next todos that is ("Shows 3 of 21 next todos"). The sentence follows every tap; **Save** becomes active as soon as something changed, and nothing is stored until you tap it. **Delete** removes the context (your files are not touched); for a new one it is **Discard**.

Below it, three tabs:

- **General**: the **Name**; **Meetings outside this context**: Dimmed or Shown as usual; **Given time: loops and counterparts from** - how much time a loop or thread needs in **a week** and **a month** to be listed in [Given time](week-and-month.md#given-time) on Week and Month (**all** lists every one). A new context opens here.
- **Show** and **Except**: each says how many entries it has ("Show 3"). **Areas**, **Projects** and **Tags** switch the chips below. Under Show, tap the areas the context is about - usually that is all it needs, an area brings its projects. A tap adds or removes an entry; one already on the other side says "(excepted)" or "(shown)". When there are more chips than fit, **‹ ›** at the right of Areas · Projects · Tags shows the others.
- **Tags** has a **New tag** field: type a tag that no todo carries yet - `shopping` or `#Shopping` - and tap **Add**. A nested tag like `garden/beds` becomes one chip and also brings the tags under it. The chips start with the tags the context already names, then the loop and thread types (**All #workshop loops**, **All #sparring threads**) and the tags in use.
- **Only inside the selected areas and projects** appears under Show once it names both a place and a tag.

Tap **Everything** (not its ○) to set the same threshold for Everything: 1 h a week and 2 h a month unless you change it. A context without its own threshold uses Everything's. Everything's threshold is saved as soon as you tap it.

When you rename a project's or area's folder and Kept GTD offers to rename its [home notebook](projects-and-areas.md#home-notebooks), its contexts follow the new name. Otherwise [Run Integrity Check](settings.md#advanced) (Settings → Advanced) lists contexts that name a project or area that isn't there any more.
