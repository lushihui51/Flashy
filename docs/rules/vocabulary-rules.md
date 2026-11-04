# Vocabulary rules

**What the file is.** `docs/vocabulary.md` is the one file that gives the words for every concept the app shows, every act on it and every situation it speaks to, and the code's names for each, side by side. It holds those and nothing else.

**Who reads it.** An agent, to find the word for a concept or the concept behind a word, by grepping a quoted word or a backticked name. The product owner, through the Concept and User reads columns. The engineer, to check a screen's words in review.

**Who writes it.** A builder, in a task whose Files lists it, or an agent on the engineer's order. No decide, record or plan skill writes it.

**Lifetime.** One file, titled "# Vocabulary", never numbered and never deleted.

**Layout.** The title line, a one-sentence preamble saying what the file gives, then one table, and nothing else: no section heading, no bullet, and no record number. A row is one line, so a grep on any word or name in it returns the whole row.

**Table.** The columns Area, Concept, User reads, Where, Code, in that order. One row per concept as the user meets it. Rows of one Area stand together. A concept the user never meets reads "—" in User reads and Where, and stands in the file for its code names.

**Concept.** Written in the user-facing vocabulary, with the verbs as the file assigns them: never "create" for a button that reads "Add", never "add" for one that reads "New".

**User reads.** The words as the screen shows them, in double quotes, several joined by "; ". A part that varies is a placeholder in angle brackets naming what fills it, as `<name>`, capitalised where it opens a sentence, as `<Thing>`; a count is N. A value only heard, as an accessible name, carries ", spoken" after it; when every value in a row is only heard, the Concept carries it instead. Where the screen shows the user's own data rather than a word, User reads describes it unquoted, and may follow it with one quoted example after "as".

**Where.** The screens and parts of a screen that show the row's words, joined by "; ". A row whose words no screen shows yet reads "Not shown yet".

**Code.** The names the code gives the row's concept, in backticks, joined by "; ": its table and model in `app/models/`, its route in `app/routers/api/`, its error code, and its frontend identifiers where they differ. A Code cell holds the names alone, never a note on how they relate to the row's words.

**Writing.** User-facing text stands in double quotes and code names in backticks, everywhere in the file. An empty cell reads "—". Never say what a word or a name used to be, when it changed, or what will change.
