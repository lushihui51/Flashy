# README planning session

- Date: 2026-09-18
- Prompted by: a /plan session on writing a proper README for a repository whose README was the single line `# Flashy`.
- Outcome: README written directly from the session's confirmed decisions at the user's request, skipping /decompose and /justify; no task file and no ADR. Also added `LICENSE` (MIT) and deleted the untouched Vite template `frontend/README.md`.

## Decisions

Confirmed in the planning conversation; recorded here because the usual task-file and ADR path was not run.

- **D1 — Primary reader is a public visitor.** The README leads with what Flashy is, what makes its design worth reading about, and where it stands; setup is secondary. Rejected: a setup-first contributor README.
- **D2 — The README is self-contained human documentation.** It never refers a reader to `AGENTS.md`, which is read by agents; `AGENTS.md` keeps its own Commands section, and duplication between the two is accepted. The user intends to extend their `/distill` command to keep the README in step with the project. Rejected: linking readers to `AGENTS.md`; keeping commands out of the README to avoid drift.
- **D3 — Run instructions are one short trailing section.** The body is what, why, how it works, and reasoning. "Running it locally" is limited to prerequisites, env configuration, and the handful of commands, and does not mention the dev-auth bypass (`app/dependencies.py`, tagged `TODO(defer:dev-auth-bypass)`). Rejected: no run instructions; a separate setup document.
- **D4 — The opening thesis is the author's three points**, in the author's framing: knowledge is a bundle of fields and the learner chooses at practice time what is shown and what is quizzed; a configuration can sample a different field combination each appearance; mastery is per field and the sampling favors weak and unseen fields. Anki is named, with the precise contrast that its prompt/answer split is fixed at card-template authoring time. Both sampling claims were verified against `app/services/practice_generation.py` before being written. Rejected: an architecture-first opening; a vague "other apps" comparison.
- **D5 — Body order and featured reasoning.** How it works, Design notes, Architecture, Status, Running it locally. Six design notes, each linked to its ADR; the sampling note cites the code because no ADR covers pool sampling (it predates the ADR record; ADR 036's context carries the weighted-not-argmin principle). Rejected: an unranked index of all ADRs.
- **D6 — A "How this is built" section** after Architecture, naming Claude Code and the plan, decompose, justify, build, sync, distill cycle, pointing at `docs/adr/`, `docs/tasks/`, `docs/cc/`, and stating the commands live outside the repo. Rejected: leaving the docs trail unexplained; shipping the commands in the repo.
- **D7 — MIT license.** Root `LICENSE`, copyright 2026 Jaden Lu, one-line License section closing the README. Rejected: Apache-2.0, AGPL-3.0, staying unlicensed.
- **D8 — Companion cleanup.** Delete the Vite template `frontend/README.md`; no screenshots or diagrams this cycle (logo and palette are placeholders; the ERD is drawio); the GitHub About description is a manual follow-up for the user. Rejected: a stub frontend README; exporting the drawio ERD.

## Assumption made while writing

The question of whether checked-in `.env.example` files should accompany the run section was left open in the session. The README lists the variables inline instead, because no confirmed decision covers adding example files. Adding them later would let the README's step 2 shrink to "copy and fill in".

## Follow-ups outside the repository

- Extend the `/distill` command (in `~/.claude/commands`) to cover `README.md` (D2).
- Set the GitHub repository's About description to the README's opening line (D8).

## Cross-references

No decision here contradicts an accepted ADR. The README's design notes summarize ADRs 009, 010, 011, 012, 013, 015, 036, 037, 040, 042, 043, 044 and the architecture section ADRs 006, 019, 033, 034, 041, 045; if any of those is superseded, the corresponding README paragraph needs the same update.
