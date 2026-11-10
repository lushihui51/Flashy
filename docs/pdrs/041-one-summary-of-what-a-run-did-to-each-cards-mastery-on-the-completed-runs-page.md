# PDR 041: One summary of what a run did to each card's mastery, on the completed run's page

## Status

Active

## Context

PDR 036 has the user rate each answer of a card during a run and move on, so a card the user has rated is not seen again until the summary. A rating cannot be changed once given. A card rated Again on a field returns later in the same run, so one card can have several attempts.

A completed run's ratings cannot change.

PDR 044 has a deleted field leave every run that showed or asked it.

The user deletes a card from its own form, and a deleted card's values and mastery are gone with it.

At the end of a run, a user wants to know what it did to how ready they are: which cards rose, which fell, and by how much. They tell a card that improved a lot from one that improved and from one that did not change. How many tries a card took matters little to them.

PDR 021 gives each card one mastery, saying how ready the user is to recall it, which changes only when they practice.

A run can hold many cards. In a single list, the few that slipped can sit several screens down.

PDR 035 makes a practice a thing the user keeps and runs many times, each run with its own cards and ratings. A practice's page lists its runs.

PDR 038 lets the user end a run before its last card, leaving cards it never reached.

Today a practice's summary appears on its run page when the practice is finished, and again on the practice's own page from then on. PDR 024 decided that summary, and this record replaces it to give each run a summary of its own, on its own page.

## Decision

We will show only the current card during a run. A rated card cannot be revisited, and its rating cannot be changed.

We will make a completed run's page its summary, and turn the run page into it, in place, when the run ends. A practice's page holds no summary, and leads to each run's.

We will list once in the summary every card the run reached that the user has not since deleted, with its mastery after the run and its change in mastery as one of five kinds: up a lot, up, no change, down, or down a lot. A row shows no number, and nothing about how many attempts the card took or whether it passed.

We will show how many of the listed cards had each kind of change. The user can choose one or more of these counts, and the list then shows only their cards; with none chosen, it shows every card.

We will let the user order the list by mastery, the least ready card first, which is the default; by gains, the biggest rise first; or by drops, the biggest fall first.

## Alternatives considered

### Browsing already-rated cards mid-run

Rejected because they could only be looked at.

### A summary at the end of a run that differs from the one its page shows later

Rejected because two views of the same facts drift apart.

### The latest run's summary on the practice's page

Rejected because the summary would stand in two places, and it would push the practice's runs down its page.

### Four tabs by outcome as the summary's structure

Rejected because it answers what happened but not what it did to mastery.

### A row per attempt

Rejected because it fills the list with one card's retries.

### A deleted card kept in the summaries of the runs that reached it

Rejected because its row would show a card that no longer exists, and a deleted card and a deleted field would leave a run in two different ways.

### The change as a number

Rejected because a change of a point or two tells the user little, and the kinds of change are what they tell apart.

### A badge for how many tries a card took

Rejected because how many tries a card took matters little to the user.

### The list with no counts

Rejected because the cards that slipped sit several screens down.

### One count chosen at a time

Rejected because the user wants to see the cards of several kinds of change at once.

### The cards that went well folded into one line

Rejected because it hides most of the run.

### Leading with what went wrong

Rejected because it turns a good run into a list of misses.

### Ordering by mastery with the most ready card first

Rejected because it puts first the card that least needs practice.

### Gains as the default order

Rejected because the least ready card, the one to practice next, would not come first.

## Consequences

**Positive**

- The user sees at a glance which cards rose and which fell, and by how much.
- The user reads the whole run in one row of counts, and reaches the cards that slipped in one tap.
- The user sees the least ready card first, the one to practice next.
- The user reads the same summary at the end of a run and whenever they come back to it.
- The user finds every run's summary on its own page, reached from its practice's page.

**Negative**

- The user who misrated a card cannot go back and change it.
- The user cannot read an exact change off a row, and two changes of one kind look the same.
- The user who wants a card's retries finds them only by opening the card.
- The user who wants the latest summary from a practice's page opens its run first.
- The user who deletes a card loses what past runs recorded about it.

**Neutral**

- The user who ends a run early finds only the cards it reached in its summary.
- The user finds no run that still shows a card they deleted.
