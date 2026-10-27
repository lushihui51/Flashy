# ADR 069: One vocabulary file for the user's words and the code's names

## Status

Active

## Context

PDR 001 decides that the app has one vocabulary: one reference, kept apart from the record and pointed at by AGENTS.md, gives the word for each concept the app shows and each act on it, and says how words are joined when a screen names a thing by the places it belongs to. Only words the reference gives appear on a screen, and a name from the code never does. Where the reference lives, PDR 001 leaves to the engineers.

The reference so far has been the "Canonical vocabulary" table in `docs/cycles/004-practice-setup.md`. ADR 021 made that table the contract's home and ruled that a user-facing word changes there first, then on every surface, and AGENTS.md's "UI copy" line points at it. The table covers practice alone, and the cycle rules forbid editing a merged cycle file or citing one, so the table can neither grow to the library's words nor stay the file AGENTS.md points at.

The code's names and the user's words have already moved apart on their own. ADR 038 renamed `practice_session` to `practice_run` across the schema, the backend, and the frontend's modules, and left every user word as it was; the frontend's own identifiers, `session` props and `practiceSessionId` route params, kept the old term. One concept thus has three code names and one user word, no file lists a concept's names on both sides, and a code name that reaches a screen is checked against nothing.

The reference has three kinds of reader. The product owner reads words and not code. A backend task and a frontend task each need it, and the two sides share no module. The agents that run the skills query a document with grep and otherwise read it whole.

## Decision

We will keep the vocabulary in one file, `docs/vocabulary.md`, holding for every concept the app shows its user's words and its code's names, and every sentence the app says. AGENTS.md points at the file wherever it names the user's words or the entity vocabulary. The file cites no record.

We will keep the code's names independent of the user's words. A change to a user's word never renames a table, a model, an endpoint, or a frontend identifier, and a rename in the code never changes a word. The file lists the two namespaces side by side; it does not tie them.

The "Canonical vocabulary" table in `docs/cycles/004-practice-setup.md` stays as written, and nothing cites it.

## Alternatives considered

### The table left in cycle 004

Rejected: the cycle rules forbid editing or citing a merged cycle file, so the table could not take the library's words and AGENTS.md could not point at it.

### A file under `docs/rules/`

Rejected: every edit under `docs/rules/` needs the engineer's explicit permission, which would gate the ordinary tasks that add or change a word.

### A TypeScript module as the reference

Rejected: the backend cannot share it, and the product owner cannot read it.

### A folder of files, one per area or per side

Rejected: it splits the mapping from a code name to its word across files, so a search on one name no longer finds the other.

### The words inside AGENTS.md

Rejected: AGENTS.md is loaded whole into every session, and the vocabulary is about 170 rows that change with every copy task.

### Rename the schema and the code to match the user's words

Rejected, as ADR 021 rejected it: tables, models, endpoints, migrations, and generated types would churn for no user-visible change, and the schema's names are accurate for what the columns store.

### Reuse the code's names as the words on screens

Rejected: it is what first shipped and confused the schema's own author, and PDR 001 now forbids a name from the code on any screen.

## Consequences

**Positive**

- The developer or the product owner looks up a concept once and sees both its names.
- The reviewer checks a code name on a screen against one file.
- The developer sees code-side naming drift in one place.

**Negative**

- The developer changes a word or a code name in two places, the file and the code, and nothing ties them.
- The developer meets the frontend's old identifiers unchanged; the file records three code names for one concept, it does not resolve them.

**Neutral**

- The developer finds an entity's invariants in the records that decided them, never in the file, which holds names, not rules.
- The developer leaves merged cycle files that cite the old table as they are.
