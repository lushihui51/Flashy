# Flashy — User Stories

Format: **As a [role], I want [capability], so that [benefit].**
Acceptance criteria define "done" and double as test cases.

Each story is tagged **[MVP]** (needed for a working core loop) or **[Later]** (real, but defer).

---

## Actors

- **Logged-out visitor** — has not authenticated. Can see marketing/landing content and create an account.
- **Registered learner** — authenticated. Owns subjects, decks, cards, and runs practice sessions.

---

## Account & Access

### Visitor can understand the app `[MVP]`

> As a logged-out visitor, I want to see what the app does before signing up, so that I can decide whether it's worth an account.

- [ ] Landing page is reachable without authentication
- [ ] Page communicates the core value (create decks, practice recall) without requiring an account

### Visitor can register `[MVP]`

> As a logged-out visitor, I want to create an account, so that I can save my decks and progress.

- [ ] Registration requires a unique identifier (email or username) and a password
- [ ] Duplicate identifier shows a clear error
- [ ] On success, the visitor becomes a registered learner and is logged in

### Learner can log in and out `[MVP]`

> As a registered learner, I want to log in and out, so that I can access my own content securely.

- [ ] Valid credentials grant access; invalid credentials show an error
- [ ] A learner only ever sees their own subjects, decks, and cards
- [ ] Logging out ends the session

---

## Creating

### Create a subject `[MVP]`

> As a registered learner, I want to create a subject, so that I can group related decks.

- [ ] Subject requires a non-empty name; empty name shows an error
- [ ] Subject belongs to the learner who created it

### Create a deck with its fields `[MVP]` ← the data-model story

> As a registered learner, I want to create a deck with a fixed set of fields (e.g. "word", "reading", "meaning"), so that every card in it shares a consistent structure.

- [ ] Creating a deck requires a non-empty name and at least one field, defined together in a single step
- [ ] Deck belongs to exactly one subject
- [ ] Fields are an ordered list of unique names
- [ ] Fields are fixed at creation: they cannot be added, removed, renamed, or reordered afterward

### Add a card `[MVP]`

> As a registered learner, I want to add a card by filling in the deck's fields, so that I have material to practice.

- [ ] Card presents exactly the fields defined by its deck
- [ ] A field left blank is allowed (stored as empty)
- [ ] Card belongs to exactly one deck

---

## Viewing & Editing

### View decks and cards `[MVP]`

> As a registered learner, I want to view my subjects, decks, and the cards in a deck, so that I can see and manage what I've made.

- [ ] Learner can list their subjects, drill into a deck, and see its cards

### Edit a card `[MVP]`

> As a registered learner, I want to edit a card's field values, so that I can fix mistakes.

### Delete a card / deck / subject `[Later]`

> As a registered learner, I want to delete content I no longer need, so that my workspace stays clean.

- [ ] Deleting a deck/subject defines what happens to its children (cascade vs block) — decide explicitly

---

## Practice

### Configure a deck for practice `[MVP]` (simplified from your story 4)

> As a registered learner, I want to choose which of a deck's fields are shown as prompts and which I have to recall, so that I practice the recall direction I care about.

- [ ] Configuration is per-deck and reusable across sessions
- [ ] Each field can be set to **always revealed** or **always concealed** for MVP
- [ ] At least one field must be concealed (otherwise there's nothing to recall)

> The four-state model (always/sometimes revealed, always/sometimes concealed) is an _implementation choice_, so it lives here in criteria, not in the story. Ship the two always-states first.

### Sometimes-reveal / sometimes-conceal fields `[Later]`

> As a registered learner, I want some fields to be randomly shown or hidden per card, so that practice stays varied.

- [ ] Per-field probability or weighting for reveal vs conceal
- [ ] This is genuinely more complex (per-card randomness). Defer until the core loop works.

### Start a practice session `[MVP]`

> As a registered learner, I want to start a session from a deck's configuration, so that I can practice.

- [ ] Session draws cards from the chosen deck
- [ ] Each card is presented with configured fields revealed and the rest concealed

### Reveal a concealed field `[MVP]` ← the core loop

> As a registered learner, I want to reveal a concealed field during practice, so that I can check whether I recalled it correctly.

- [ ] Concealed fields can be revealed one at a time or all at once (your call)

### Mark a card and advance `[MVP]`

> As a registered learner, I want to mark a card right or wrong and move to the next, so that I work through the session.

- [ ] **(Decision) Does marking _do_ anything?**
  - Option A — manual flip-through: the mark just advances; nothing is scheduled. Simplest. Matches "practice the way I intend to."
  - Option B — spaced repetition: the mark feeds a schedule that reorders/reweights future cards. Much more to build.
  - Pick A for MVP unless SRS is the point of the project.

### Spaced-repetition scheduling `[Later]`

> As a registered learner, I want cards I get wrong to come back sooner, so that I study efficiently.

- [ ] Only relevant if you chose Option B above. Treat as a separate epic.

---

## Open decisions to resolve before designing screens

1. **Marking behavior** — manual flip-through vs spaced repetition.
2. **"Sometimes" visibility** — in or out of MVP.
3. **Field edits after cards exist** — what happens to existing card data.
4. **Delete cascades** — what deleting a parent does to its children.
