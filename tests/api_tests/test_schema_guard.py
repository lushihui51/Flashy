from pathlib import Path

FORBIDDEN_CALLS = ("create_all(", "drop_all(")


def test_no_create_all_or_drop_all_under_app():
    """ADR 045: alembic upgrade is the only path by which any persistent database's
    schema changes. SQLModel.metadata.create_all/drop_all may only ever run against
    the disposable test database, from tests/conftest.py's own fixture — never from
    application code, which would silently create or drop tables outside alembic's
    tracked history (010 T2's stray mastery_log table was exactly this)."""
    repo_root = Path(__file__).resolve().parents[2]
    app_root = repo_root / "app"
    for path in sorted(app_root.rglob("*.py")):
        text = path.read_text()
        for forbidden in FORBIDDEN_CALLS:
            assert forbidden not in text, (
                f"{forbidden.rstrip('(')} found in {path.relative_to(repo_root)} — "
                "schema changes must go through an alembic migration (ADR 045), never "
                "application code"
            )
