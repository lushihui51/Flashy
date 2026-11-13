# PDR 034: A form about one thing and nothing it holds, landing on the thing it made

## Status

Active

## Context

The user makes a deck and its cards in one sitting.

A deck has a name and its fields, and holds cards. A deck needs at least two fields before it can hold a card.

A deck's fields are set when it is made and changed rarely; its cards are added throughout the deck's life.

A user meets a card in several places: in its deck's list, while practicing it, and on the summary of what practicing did to it. A mistake in a card is noticed wherever the user is reading it.

A form that also takes the thing's contents lets the user make a deck and its first cards without leaving it, and grows with every card. A form that takes only the thing's own attributes stays the same length and sends the user elsewhere for the contents.

A thing is started in two situations: from its own entry, when the user is looking at the place it will live, and from a picker inside another form, when the user is choosing which thing another thing belongs to. A picker's last row ends with an ellipsis, telling the user they will leave the form and come back to it.

PDR 003 puts a list's "Add …" button inside the list, present while the list is empty.

PDR 033 gives a deck nothing above it. PDR 018 gave a subject's form and a deck's form their own attributes and nothing they held, the deck's form its subject among them. This record replaces PDR 018 to drop the subject, and restates the rest unchanged.

## Decision

We will give a deck's form its name and its fields, and nothing the deck holds.

We will have cards added and edited on a card's own form, which the user opens wherever they meet the card.

We will land a deck created from its own entry on its page the moment it exists, where its empty list and the list's add button invite the next step.

We will bring the user who created a deck from a picker inside another form back to that form, with the new deck chosen.

## Alternatives considered

### Cards entered inside the deck form

Rejected because it ties routine card entry to changing the deck's shape, and the form grows with the deck.

### A card's form opened only from its deck's page

Rejected because the user who notices a mistake in a card while practicing would have to stop practicing to fix it.

### Landing back on Your library after creating a deck

Rejected because the user must find the new deck before adding to it.

### Opening the card form straight after creating a deck

Rejected because it presumes the next step, and the user who wanted only the deck backs out of it.

## Consequences

**Positive**

- The user meets a form that is short and about one thing.
- The user changes a card on the same form wherever they meet it, and never inside its deck's form.
- The user sees a new deck on screen the moment it exists, or finds it chosen in the form that asked for it.

**Negative**

- The user who makes a deck to fill it at once takes one more step, from the deck's page to its first card.

**Neutral**

- The user who makes a deck from the card form has it chosen there without visiting its page.
