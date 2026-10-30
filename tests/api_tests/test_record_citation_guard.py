import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCAN_DIRS = ("app", "tests", "alembic", "frontend/src")
SCAN_FILES = ("frontend/eslint.config.js", "AGENTS.md", "docs/backlog.md")
RECORD_DIRS = {"ADR": "docs/adrs", "PDR": "docs/pdrs"}
CITATION = re.compile(r"\b(ADR|PDR) (\d{3})\b")


def _scanned_files(root: Path) -> list[Path]:
    files = [root / name for name in SCAN_FILES]
    for name in SCAN_DIRS:
        files.extend(
            p for p in (root / name).rglob("*") if p.is_file() and "__pycache__" not in p.parts
        )
    return sorted(files)


def _record_status(root: Path, kind: str, number: str) -> str:
    """The first non-blank line under the record's `## Status` heading, or "no record"
    when no file carries that number."""
    matches = sorted((root / RECORD_DIRS[kind]).glob(f"{number}-*.md"))
    if not matches:
        return "no record"
    lines = matches[0].read_text(encoding="utf-8").splitlines()
    after_heading = False
    for line in lines:
        if after_heading and line.strip():
            return line.strip()
        if line.strip() == "## Status":
            after_heading = True
    return "no status"


def _offenders(root: Path, files: list[Path]) -> list[str]:
    """One `<path>:<line>: <kind> <NNN> — <status>` entry per citation of a record that
    is not Active, paths relative to root."""
    statuses: dict[tuple[str, str], str] = {}
    offenders = []
    for path in files:
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for lineno, line in enumerate(text.splitlines(), start=1):
            for kind, number in CITATION.findall(line):
                if (kind, number) not in statuses:
                    statuses[(kind, number)] = _record_status(root, kind, number)
                status = statuses[(kind, number)]
                if status != "Active":
                    rel = path.relative_to(root).as_posix()
                    offenders.append(f"{rel}:{lineno}: {kind} {number} — {status}")
    return offenders


def test_every_cited_record_is_active():
    """A record number in code sends a reader to the decision behind that code, so it
    must name a record that still holds; a superseded or deprecated record would send
    them to a decision the code no longer follows. Under docs/, only the backlog is
    scanned: a record cites the records it supersedes, and a merged cycle file is
    never edited."""
    offenders = _offenders(REPO_ROOT, _scanned_files(REPO_ROOT))
    assert not offenders, (
        "these lines cite a record that is not Active; repoint each to the record that "
        "holds now, or drop the pointer:\n" + "\n".join(offenders)
    )


def test_offenders_list_a_superseded_and_a_missing_record_but_not_an_active_one(tmp_path):
    # Built at runtime so the guard above, which scans this file, never sees them.
    adr = "ADR"
    active, superseded, missing = (f"{adr} {n}" for n in ("001", "002", "003"))
    superseded_status = f"Superseded by {adr} 999"

    records = tmp_path / "docs" / "adrs"
    records.mkdir(parents=True)
    (records / "001-kept.md").write_text("# One\n\n## Status\n\nActive\n\n## Context\n")
    (records / "002-replaced.md").write_text(f"# Two\n\n## Status\n\n{superseded_status}\n")
    citing = tmp_path / "app" / "module.py"
    citing.parent.mkdir()
    citing.write_text(f"# kept ({active})\n# replaced ({superseded})\n# gone ({missing})\n")

    assert _offenders(tmp_path, [citing]) == [
        f"app/module.py:2: {superseded} — {superseded_status}",
        f"app/module.py:3: {missing} — no record",
    ]
