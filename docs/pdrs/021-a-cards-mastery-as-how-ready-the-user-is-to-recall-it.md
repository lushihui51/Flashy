# PDR 021: A card's mastery as how ready the user is to recall it

## Status

Active

## Context

A user opens the app when they feel like it and chooses what to go over. PDR 027 leaves that choice to the user, marks nothing as due and never tells the user they are behind, so what the app shows them is what they choose by.

A user looks at mastery to see how ready they are, so they can tell what to practice next.

A card holds one value for each field of its deck. PDR 009 has the user rate each answer field on its own, and each field of a card keeps a mastery built from the ratings given to it.

PDR 008 lets a configuration choose which fields a practice asks, and random draw varies them from one attempt to the next. A card can have fields the user has never practiced.

PDR 028 lets a user who stops studying a field keep it in its deck or delete it.

No one has reported a field held below ready as a problem.

PDR 006 shows a card as one row under one label in lists and on a practice's summary, where it sits beside other cards.

PDR 022 gives a deck and a subject the average mastery of their cards. A card's mastery carries up to the decks and subjects the user chooses between.

Today a card's mastery is a whole number over every field of its deck, with a field never practiced counting at a starting value. A card never practiced reads about 50, and a practice moves it a point or two at a time.

Memory fades with time. A mastery that fades would fall while the user is away. A mastery that changes only when the user practices stays where they left it, and after a long break it can read more ready than the user is.

A mastery that says how likely the user is to recall a card tells them how ready they are. A mastery that only rises with good ratings tells them which card is further along, but not whether either is ready.

## Decision

We will give a card one mastery that says how ready the user is to recall it: how likely they are to recall it now, across every field of its deck. Each field of the card has a mastery of its own, built from the ratings the user has given that field.

We will count every field of a deck in its cards' mastery, and offer the user no way to choose which count.

We will count a field the user has never practiced as not ready. A card never practiced is not ready at all, and it fills as the user practices it, until a card the user will recall is ready.

We will give a card the same mastery wherever it appears, whatever configuration looked at it.

We will change a user's mastery only when they practice.

## Alternatives considered

### Mastery as stages named in words

Rejected because it brings new words, and boundaries between them, for the user to learn.

### Mastery that means only "higher is better"

Rejected because it tells the user which card is further along, but not how ready either one is.

### The number as it is

Rejected because a card never practiced reads half known, and a practice moves it too little to tell the user anything.

### Mastery that fades with time

Rejected because a user who comes back after a break would find their mastery fallen while they were away.

### A mastery relative to the configuration used

Rejected because one card would read differently through different configurations.

### A mastery over the practiced fields only

Rejected because a card practiced on one field of five would read ready.

### Mastery per field only, none per card

Rejected because the user compares cards as rows, and finds the least ready one to practice next.

### A choice per field of whether it counts

Rejected because it adds a control, a word and a lasting concept, and a card reading ready would no longer mean ready on the whole card.

### Counting only the fields some configuration uses

Rejected because a card's mastery would move when a configuration is edited or deleted, and one narrow configuration would read ready on one field of five.

## Consequences

**Positive**

- The user sees how ready they are for every card, and the least ready card is the one to practice next.
- The user sees a new card, and a deck never practiced, as not ready rather than half known.
- The user sees the same mastery for a card wherever it appears.
- The user who takes a break finds their mastery where they left it.
- The user reads ready as one thing on every card: ready on the whole card.

**Negative**

- The user who practiced one field of five sees a fifth of the rise on the card.
- The user who keeps a field in a deck but no longer practices it sees every card of that deck held below ready.
- The user who adds a field to a deck sees every card in it become less ready before practicing anything.
- The user who comes back after a long break sees cards as ready that they may have forgotten.

**Neutral**

- The user who practices one card through two configurations sees one mastery for it, built from both.
