import ast
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


NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


def test_alembic_env_imports_app_database_before_reading_metadata():
    """ADR 054: the naming convention is applied as an import side effect of
    app.database, so alembic/env.py must import it before it reads SQLModel.metadata.
    Drop the import and autogenerate compares the database against unnamed
    constraints, proposing spurious drops and creates on every revision. Parsed as
    ast rather than scanned as text, so commenting the import out fails this: a
    comment is no longer an ast.Import node."""
    repo_root = Path(__file__).resolve().parents[2]
    env_path = repo_root / "alembic" / "env.py"
    tree = ast.parse(env_path.read_text())
    rel = env_path.relative_to(repo_root)

    import_lines = [
        node.lineno
        for node in ast.walk(tree)
        if isinstance(node, ast.Import)
        and any(alias.name == "app.database" for alias in node.names)
    ]
    assert import_lines, (
        f"{rel} does not import app.database — the naming convention (ADR 054) is "
        "applied as that module's import side effect, so autogenerate would compare "
        "against unnamed constraints"
    )

    assign_lines = [
        node.lineno
        for node in ast.walk(tree)
        if isinstance(node, ast.Assign)
        and len(node.targets) == 1
        and isinstance(node.targets[0], ast.Name)
        and node.targets[0].id == "target_metadata"
    ]
    assert assign_lines, f"{rel} does not assign target_metadata"

    assert min(import_lines) < min(assign_lines), (
        f"{rel} reads SQLModel.metadata at line {min(assign_lines)} before importing "
        f"app.database at line {min(import_lines)} — the convention (ADR 054) must be "
        "applied first"
    )


def test_metadata_naming_convention_is_the_adr_054_templates():
    """ADR 054: these five templates are the source of every constraint and index
    name. Changing one renames constraints across the whole schema without any
    migration saying so, and autogenerate then proposes a drop-and-create for every
    constraint whose derived name moved (the drift task 009 T6 hit)."""
    import app.database  # noqa: F401 — the assignment is the import side effect
    from sqlmodel import SQLModel

    assert SQLModel.metadata.naming_convention == NAMING_CONVENTION, (
        "app/database.py's naming_convention no longer matches the ADR 054 templates — "
        "every derived constraint name in the schema depends on it"
    )
