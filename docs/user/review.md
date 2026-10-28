# Weekly Review

The Review tab walks you through a weekly review, one step at a time. You can also do a single step whenever you like.

## The overview

The first page lists all steps. Each row shows how many things are in the step and when you last reviewed it. A step you haven't reviewed for more than a week gets a ● mark, and so does the Review tab itself. Steps with nothing in them count as done automatically.

Tap a step to open it. Inside a step:

- **Reviewed ›** saves the step as reviewed and goes to the next one
- **Skip ›** goes on without marking it reviewed
- **‹ Back** and **Overview** move around without saving

## The steps

- **Week ahead**: this week's schedule (meetings and focus blocks); from Friday to Sunday the coming week
- **Meetings to close out**: past meetings (last 7 days) whose review is still open. A todo you add there records the meeting it came from, so it shows under **I owe** in that meeting's thread (the grey line in Quick Add, see [Threads](threads.md)). Next to **Mark reviewed** and **Open note**, **Reflect ›** opens the meeting's Reflection page (creating it after one question, see [Meetings](meetings.md)); reflecting does not mark the meeting reviewed
- **Tending threads**: the people, teams and series you work with (counterparts, see [Threads](threads.md)), per area or project. See below.
- **Agreements**: agreements that need a decision - past their date, with someone you set inactive, of a closed loop, or in a project that is done or on hold. Only shown when there is one. See below.
- **Gmail inbox**: only with the experimental Gmail integration, see [Features and integrations](features.md)
- **Inbox to zero**: file or finish everything in the Inbox - tap an item for its card, where the arrow next to **Inbox** moves it (see [Quick Add](quick-add.md)). Open lasso marks count too; the card **n marks to process** opens them, see [Lasso](lasso.md)
- **Stalled projects**: active projects without a next action: no open `#next` todo and nothing you wait for. Planned todos (no flow state), Someday and Maybe don't count. The step lists them - the plan first - and **→ Next** makes one the next action with one tap.
- **Open loops**: your loops (see [Loops](loops.md)), per area or project. See below.
- **Done awaiting review**: projects marked Done - close them out or archive them
- **On Hold reconsideration**: paused projects and areas - keep them paused or reactivate them
- **Neglected areas**: the same for areas - no next action and nothing you wait for
- **Someday / Maybe**: the open Someday and Maybe todos of your active and paused projects and areas, see below

Steps that list several projects show them on the left; tap one to work on it on the right.

## Tending threads

This step is about keeping your word in ongoing relationships: is the next meeting set up, are agreements followed up, is anything waiting too long? It ranks nothing and raises no alarms.

On the left:

- **New** on top: counterparts you use but haven't confirmed, with the area or project they belong to, and inactive ones that got a new meeting (`back in use`).
- Then one block per area (with its projects) and per project without an area, its active counterparts that need tending, in alphabetical order: nothing planned in the next 14 days and no `#next` or I-owe todo. A counterpart with its next meeting set up or a next step on the list is in good hands and not listed. The Inbox has none.

Each row has two lines: the counterpart, then `last 30.9. · next 14.10.` and what is open (`w/f 18 d`); `nothing planned` when no meeting is set up for the next 14 days. One-off counterparts (only `#wf/name` or `#owe/name`) show `w/f only`, `owe only` or `w/f · owe only` instead of meeting dates.

Tap a counterpart to see it on the right: Quick Add, then **Tend** and **Not** for a new one, **Open overview ›** and **Set inactive** for an active one, its next meetings (or **+ Next retro**, which puts the next meeting into Quick Add), what you owe, wait for and should raise, its active agreements, and its last three meetings. **Open overview ›** opens its thread overview over the Review; **‹ Review** brings you back to the step as you left it. **Set inactive** first goes through its open todos (Done, Cancel or Keep each one) and its agreements (Keep or End each one, or **End all**), see [Projects and Areas](projects-and-areas.md).

The recap counts counterparts confirmed, set inactive and next meetings added.

## Agreements

This step lists the active [agreements](agreements.md) that need a decision, grouped by the project or area they live in. Each row has two lines: the agreement, then why it is listed:

- `till 30.9. – over`: the day it was valid till has passed
- `thread inactive`: it is with someone you set inactive
- `loop closed`: its loop is done or no longer active
- `project done` or `on hold`: its project or area is done or paused

Tap one to decide on the right:

- **Keep**: it holds on. Choose a new valid-till date: **none**, **+1 m**, **+3 m** or **end of year**.
- **Change**: Quick Add opens with its words; **+ Add** ends the old one and adds the new one.
- **End**: asks once, then marks it ended today.

Rows you decided on stay listed with a checkmark. The step only shows in the overview while it lists something. The recap counts agreements kept and ended.

## Someday / Maybe

Someday and Maybe todos stay out of the way during the week: the thread and loop overviews and [Engage](engage.md) only count them. This step is where you look at them again. On the left they are grouped by project or area; tap one to see it on the right with **#next** (work on it soon), **To plan** (back into the plan, without Someday or Maybe), **Done** and **Cancel**.

Opened from an overview's **n someday ›** or from Engage's **Also here**, the step shows "Only #sparring/mieke · Show all" (the name of where you came from) and lists just those todos; **Show all** lists every one. Leaving the step ends the filter. The recap counts the todos made `#next`.

## The recap

Each step remembers what you did in it (items filed, todos done, loops closed). The overview shows the total of your last visits.

## Open loops

This step goes through the active loops that need a look, one block per area (with its projects) and per project without an area: those without a todo you can act on and with nothing planned in the next 14 days (`no next action`), and those past their main date (`was 14.11. · close?`). Loops with a next todo or a meeting or focus block coming up are not listed. Each row has two lines: ○ the loop and its kind (and its project), then its main date, next meeting and todos (`14.11. · next 20.10. · 2 open · 1 next`), and `nothing planned` when it has no meeting or focus block in the next 14 days.

The step counts these loops. When none needs a look, the step counts as reviewed.

Tap a loop to see it on the right: Quick Add (a todo or meeting you add gets the loop's tag), its summary, **+ F block**, **Open overview ›** and **Close loop**. **+ F block** fills Quick Add's Meeting tab with the loop and **F** on: set the day and time and add it, for time of your own with the loop. Closing asks **Done** or **Dropped**, and only works while the loop has no open todo and no meeting ahead - otherwise the status line says what is still open, and **Show** opens the loop. The recap counts the loops closed.

