---
name: records-sync
description: Sync conversation — bring every live site that cites a superseded or deprecated record in line with the records that hold now
disable-model-invocation: true
argument-hint: path of the docket
---

This runs after /code-record. I am the engineer. Your job is to find every live site that cites a record whose Status is not Active, fix the ones a pointer edit settles, and hand the ones whose code must change to /cycle-plan through the docket. Nothing here decides what the app does or how it is built.

Files you may write in this conversation:

- The line of a live site, in code, AGENTS.md or `docs/backlog.md`, and nothing else in that file
- The docket

Give me one thing to answer per turn: one proposed edit, one hand-off, or the docket edit.

## Terms

- A "live site" is what `docs/rules/record-rules.md` calls one: a line in code, AGENTS.md or `docs/backlog.md` that cites a record by number.
- "The guard" is `tests/api_tests/test_record_citation_guard.py`; its failure lists every live site that cites a record whose Status is not Active, with that Status.
- "The docket" is the roundtable docket whose path I give.

## What you read

- `docs/rules/roundtable-docket-rules.md`, then the docket in full, before anything else.
- `docs/rules/record-rules.md`, for what a live site is and what Status holds.
- `docs/rules/comment-rules.md`, `docs/rules/agents-rules.md` and `docs/rules/backlog-rules.md`, for the form a citation takes in each kind of file.
- For each site the guard lists: the record it cites, every record that record's Status names, each in full, and the code or line at the site.
- Nothing else without my explicit permission.

## What you do

### 1. The list

Run the guard with `uv run pytest tests/api_tests/test_record_citation_guard.py -q`. Its failure message is the list of sites. When it passes, say so and stop.

### 2. Each site

Take the sites one at a time, in the guard's order. Read what the site cites, what replaces it, and the code or line at the site, and sort the site into one of three:

- A swap. One record replaces the cited one, and what the site says and what its code does hold under it unchanged. Replace the number yourself and move on.
- A proposal. The line alone settles it, but how is not obvious: the cited record is superseded by several records, or deprecated, or the replacing record changes what the line says. Propose the edit, old text and new text with the reason, and make it once I confirm. A pointer with no record to point at goes, and the line keeps its reason in its own words, as the rules for its file require.
- A hand-off. The code at the site must change, because the replacing record decides it differently or because the decision it followed no longer holds. Propose it; once I confirm, put the site on the docket's Live sites, with Cites and Replaced by, and leave its line as it is for the builder.

If a site's fate depends on a decision no record and no docket item settles, raise it to me; with my approval it goes on the docket as an open question owned by /product-decide or /code-decide.

### 3. The check

Run the guard again. Every site it still lists is on the docket's Live sites, and no other.

## Ending

Show me every edit you made and the docket edit, then make the docket edit. Then stop; /cycle-plan is next.

Docket for this conversation: $ARGUMENTS
