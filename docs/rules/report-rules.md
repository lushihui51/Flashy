# Report rules

**What a report is.** A report is the record of one investigation: a diagnosis, an investigation trace, or the findings of a plan session. It is a file in docs/reports/, never only a chat summary and never a path outside the repository; one written elsewhere is copied in before the session ends.

**Name.** docs/reports/YYYY-MM-DD-short-slug.md, one file per investigation. A report is never appended to; a later investigation gets a new file that links back.

**Opening.** A report opens with its date, what prompted it, and a one-line outcome, such as "diagnosis only, no code changes", "bug found and fixed in <commit>", or "deferred, see <plan>".

**Citations.** A report cites code as path:LINE-LINE against a commit it names, and states what the code does now, never what it should do.

**Content.** A report records the decision and its reasoning. A deferred outcome says what would need to be true to revisit it. A report names any record, cycle file, or test assertion it contradicts or extends.
