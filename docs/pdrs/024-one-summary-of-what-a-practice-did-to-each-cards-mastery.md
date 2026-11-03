# PDR 024: One summary of what a practice did to each card's mastery

## Status

Active

## Context

PDR 009 has the user rate each answer of a card during a practice and move on, so a card the user has rated is not seen again until the summary. A rating cannot be changed once given. A card rated Again on a field returns later in the same practice, so one card can have several attempts.

A practice's ratings cannot change once it is complete, though a field the user deletes leaves every practice that showed or asked it. A practice has a run page, where it is carried out, and its own page, reached from the list of practices.

At the end of a practice, a user wants to know what it did to how ready they are: which cards rose, which fell, and by how much. They tell a card that improved a lot from one that improved and from one that did not change. How many tries a card took matters little to them.

PDR 021 gives each card one mastery, saying how ready the user is to recall it, which changes only when they practice. PDR 023 shows that mastery as a filled circle on every card's row.

A practice can hold many cards. In a single list, the few that slipped can sit several screens down.

Today the summary shows each card's mastery as a number, its change as a signed number, and a badge for how many tries it took. The cards can be sorted by gains, by drops or by mastery.

## Decision

We will show only the current card during a practice. A rated card cannot be revisited, and its rating cannot be changed.

We will turn the run page into the practice's summary, in place, when nothing is left, and show the same summary on the practice's own page from then on.

We will list every card once in the summary, with its mastery after the practice and its change in mastery as one of five kinds: up a lot, up, no change, down, or down a lot. A row shows no number, and nothing about how many attempts the card took or whether it passed.

We will show how many cards had each kind of change. The user can choose one or more of these counts, and the list then shows only their cards; with none chosen, it shows every card.

We will let the user order the list by mastery, the least ready card first, which is the default; by gains, the biggest rise first; or by drops, the biggest fall first.

## Alternatives considered

### Browsing already-rated cards mid-practice

Rejected because they could only be looked at.

### A summary at completion that differs from the one the practice's page shows later

Rejected because two views of the same facts drift apart.

### Four tabs by outcome as the summary's structure

Rejected because it answers what happened but not what it did to mastery.

### A row per attempt

Rejected because it fills the list with one card's retries.

### The change as a number

Rejected because a change of a point or two tells the user little, and the kinds of change are what they tell apart.

### A badge for how many tries a card took

Rejected because how many tries a card took matters little to the user.

### The list with no counts

Rejected because the cards that slipped sit several screens down.

### One count chosen at a time

Rejected because the user wants to see the cards of several kinds of change at once.

### The cards that went well folded into one line

Rejected because it hides most of the practice.

### Leading with what went wrong

Rejected because it turns a good practice into a list of misses.

### Ordering by mastery with the most ready card first

Rejected because it puts first the card that least needs practice.

### Gains as the default order

Rejected because the least ready card, the one to practice next, would not come first.

## Consequences

**Positive**

- The user sees at a glance which cards rose and which fell, and by how much.
- The user reads the whole practice in one row of counts, and reaches the cards that slipped in one tap.
- The user sees the least ready card first, the one to practice next.
- The user reads the same summary at the end of a practice and whenever they come back to it.

**Negative**

- The user who misrated a card cannot go back and change it.
- The user cannot read an exact change off a row, and two changes of one kind look the same.
- The user who wants a card's retries finds them only by opening the card.

**Neutral**
