# PDR 042: A card edited where the user notices a mistake

## Status

Active

## Context

A user notices a mistake in a card while practicing it, or while reading what a run did to it, such as a typo or a wrong answer.

PDR 034 gives a card its own form, which the user opens wherever they meet the card. The form changes the card's values, never its deck's fields, and shows every value of the card, answers included.

PDR 036 keeps every answer of a card hidden during a run until one action shows them all.

PDR 041 shows only the current card during a run. The user's place in a run is that card, whether its answers are shown, and the ratings given so far. On a completed run's page, which is its summary, a card's row opens to show what the run did to it.

PDR 017 has a form back out to what opened it.

Where a control sits tells the user what it acts on. A control in the row of places reads as acting on the practice or the run, and one on the prompt's heading as acting on the prompt alone.

PDR 019 decided where a card is edited, and spoke of a practice where it meant one go through it, and of a practice's summary. This record replaces PDR 019 to say a run and its summary, and restates the rest unchanged.

## Decision

We will let the user edit a card during a run, from the run page, and after it, from a card opened on the run's summary. Editing opens the card's own form.

On the run page, the way to edit the card is always there, beside the card's main action, and cannot be used while the card's answers are hidden.

We will return the user who saves or backs out of the card's form to where they were: to the run page on the same card, as they left it, its answers shown and any ratings given kept; or to the summary with the same card open. The card's new values show from then on.

Editing a card changes its values and never a rating.

## Alternatives considered

### No way to edit a card during a run

Rejected because the user who notices a mistake would have to leave the run to fix it.

### A labelled button in the row of places

Rejected because it reads as editing the practice.

### A pencil on the prompt's heading

Rejected because it reads as editing only the prompt.

### A labelled button on its own line above the card

Rejected because it sits apart from the card's acts, where the user does not look while practicing.

### The button appearing only once the answers are shown

Rejected because a button that comes and goes is not where the user looks for it.

### A button that works before the answers are shown

Rejected because the card's form would show the answers before the user recalls them.

## Consequences

**Positive**

- The user fixes a mistake in a card the moment they see it, without losing their place in the run.
- The user who reads a run's summary fixes a card there and comes back to it open.
- The user never sees a card's answers on its form before showing them on the run page.

**Negative**

- The user who notices a mistake before the answers are shown waits until they are shown to fix it.
- The user who rated an answer against a wrong value keeps that rating after fixing the card.

**Neutral**

- The user sees the way to edit on the run page before it can be used.
