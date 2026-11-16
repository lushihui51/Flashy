# PDR 057: Home as first steps, then the user's runs

## Status

Active

## Context

A user opens Home to start something.

PDR 033 takes subjects away and PDR 039 makes a deck's configuration a part of its practice, so before a first practice a user makes a deck, a card in it, and a practice of it, each on its own page.

PDR 034 lands a deck made from its own entry on its page, and brings one made from a picker inside another form back to that form. The top bar's New starts a deck, a card or a practice from any page. A user making their first things moves from page to page without passing Home.

PDR 035 makes a practice a set of decks the user keeps and runs many times, each run active until it ends and completed from then on. PDR 038 gives a practice at most one active run, and has starting the practice continue it. A user may leave runs of several practices active.

PDR 047 makes a run as recent as the last thing the user did in it: starting it, rating a card in it, or ending it. It lists a practice never run by when it was made.

PDR 040 starts a next run of a practice from a completed run, under the same practice, by the practice's configurations as they stand. A completed run is kept as it was.

A practice the user runs every day has a new completed run every day.

PDR 053 shows a visitor who is not logged in an example library whose runs Home lists, so a user first meets the steps to a first practice after logging in to a new account.

Today Home shows three steps to a first practice until the user has made one, and lists runs from then on. A user who has made a practice and started no run has no run to list, so Home shows its heading and the way to All practices and nothing between.

A practice just made opens on its own page, where "Start run" stands.

PDR 037 leaves to the user what to practice and when, marks nothing as due, and never tells the user they are behind. A count that grows while the user is away, a mark of days practiced in a row, or the time since something was last done each change without the user acting.

PDR 054 marks at most one action on a screen as its main one, in yellow.

PDR 021 counts a deck never practiced as not ready, so the least ready deck in Your library is nearly always one just made or one set aside.

A user who has never practiced and a user who has practiced before come to Home needing different next steps.

PDR 048 made Home the runs the user can continue or start again, with three steps to a first practice that left Home once the practice was made. This record replaces PDR 048 to keep the steps until the user has started a run and to add the step that starts it, and restates the rest unchanged.

## Decision

We will make Home show what the user can do next, and nothing on it will say how long ago anything happened or that anything is waiting.

Until the user has started a run, Home shows the four steps to a first practice, making a deck, a card and a practice and starting a run, with how many of the four are done. A step is ticked as soon as its thing exists, wherever the user made it. The first step not yet ticked is Home's main action. The fourth step starts a run of the practice the user made and opens its first card, and when the user has made several practices and run none, it starts the one made most recently. The steps leave Home once the user has started a run, and never come back, even if the user later deletes everything.

Once the user has started a run, Home lists runs, never practices or decks, in two sections. Active lists up to three active runs, those the user acted in most recently, newest first, each with its progress, and Home neither counts nor mentions any further active run. Recently completed lists the three most recently completed runs, newest first, at most one of each practice and none of a practice that has an active run.

We will give every run on Home a play button that opens a card with no page between. An active run's play button continues it at its next card. A completed run's play button starts a new run of its practice at its first card, without asking first, and the completed run stays as it was.

The play button of the active run the user acted in most recently is Home's main action, and with no active run, the play button of the most recently completed run is.

We will end Home with one way to All practices, and offer no way to New practice on it.

## Alternatives considered

### The steps leaving Home once the user has made a practice

Rejected because the user one press from their first card finds a blank page, and must know to open All practices and then the practice.

### A sentence saying there are no runs yet

Rejected because it tells the user nothing to do.

### The decks of recently completed practices

Rejected because the user looks for the practice they did and finds decks, and a deck also in an active run shows in both lists.

### A row that opens the practice's page, with a way to start it there

Rejected because it takes two taps to the next card, with a page between that the user does not need.

### The three most recently completed runs, whatever their practice

Rejected because a practice run daily fills the section with three rows of one name.

### One section of recent runs, active and completed mixed

Rejected because the user must read each row's progress to tell what to continue from what to start again.

### Active runs by when they were started

Rejected because a run continued today would stay below one started yesterday, and the main action would point away from the run the user is in the middle of.

### Every play button in yellow

Rejected because no one action stands out.

### No main action while no run is active

Rejected because Home then offers nothing to go on with.

### Asking before a completed run's play button starts a new run

Rejected because the play button promises a card, and the completed run is kept, so nothing is lost by not asking.

### A completed run's play button opening its summary

Rejected because the play button would mean two things on one screen.

### A way to All practices beside a way to New practice

Rejected because New practice is already one tap away in the top bar.

### A way to New practice alone

Rejected because the rest of the user's practices would be two taps away, by the menu.

### Every active run, with no limit

Rejected because a long list of unfinished runs reads as a backlog.

### Only the most recent active run

Rejected because a user who left several runs would find only one of them on Home.

### A line saying how many more active runs there are

Rejected because a count that grows reads as being behind.

### The least ready deck in Your library

Rejected because it nearly always points at a deck just made or set aside on purpose, and nags until it is practiced.

### A step ticked only when done from Home

Rejected because a user making their first things does not come back to Home between steps, and would find steps they had done still unticked.

### A quick way to a new card

Rejected because the top bar's New already offers one from every page.

### Days practiced in a row

Rejected because it punishes the user for missing a day.

### Quotes

Rejected because they are not the user's own material.

## Consequences

**Positive**

- The user who has not practiced yet sees on Home how far they are from a first run and what to do next.
- The user who makes their first things from the top bar or from inside another form finds them ticked when they come back to Home.
- The user who has made a practice finds on Home one press that puts them in front of their first card.
- The user reaches a card of any run on Home in one tap, to continue it or to go again.
- The user finds first on Home, and under its main action, the run they were last in.
- The user finds each practice on Home at most once, and tells what to continue from what to start again by its section.
- The user always finds one main action on Home once they have a run.
- The user is never told by Home that they are behind or that something is waiting.

**Negative**

- The user with more than three active runs finds the rest only through All practices, and Home does not say there are more.
- The user who taps a completed run's play button by mistake has started a new run.
- The user who deletes everything after a first run does not see the steps again.

**Neutral**

- The user starts a new practice from the top bar's New or from All practices, not from Home.
- The user reads four steps to a first practice, the last of them starting its first run.
- The user sees the steps only until they start a run, and a different Home from then on.
