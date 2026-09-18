import ast
import importlib
from pathlib import Path

MODELS_ROOT = Path(__file__).resolve().parents[2] / "app" / "models"


def _is_table_class(obj) -> bool:
    """ADR 046's mechanical predicate: SQLModel sets `__table__` on a `table=True`
    class and nothing else, so this is what distinguishes a class safe to import
    across entity modules (a table class, for a `Relationship` — e.g. `card.py`'s
    import of `CardFieldValue`) from a shape, which must live in a
    `<router>_payloads.py` module instead."""
    return hasattr(obj, "__table__")


def _sibling_imports(path: Path) -> list[tuple[str, str]]:
    """Every `from app.models.<x> import <name>` in this module's source, excluding
    `<x> == base`, as (sibling_module, imported_name) pairs — via `ast`, not a live
    import, so a module can be inspected without importing it first."""
    tree = ast.parse(path.read_text())
    pairs = []
    for node in ast.walk(tree):
        if not (isinstance(node, ast.ImportFrom) and node.module):
            continue
        if not node.module.startswith("app.models."):
            continue
        sibling = node.module.removeprefix("app.models.")
        if sibling == "base":
            continue
        for alias in node.names:
            pairs.append((sibling, alias.name))
    return pairs


def _table_modules() -> list[Path]:
    """Every app/models/*.py whose source defines a table=True class — base.py,
    __init__.py, and the payload modules don't and are excluded (ADR 046)."""
    return sorted(p for p in MODELS_ROOT.glob("*.py") if "table=True" in p.read_text())


def test_table_modules_never_import_a_non_table_shape_from_a_sibling():
    """ADR 046: a module defining a table=True class may import from a sibling entity
    module only a table class itself — never a request/response shape, which belongs
    in a <router>_payloads.py module instead. This is the half of the rule that can
    drift silently through an import; the other half (a scalar-only shape misfiled in
    an entity module) imports nothing and isn't mechanically checkable."""
    for path in _table_modules():
        module_name = path.stem
        for sibling, name in _sibling_imports(path):
            obj = getattr(importlib.import_module(f"app.models.{sibling}"), name)
            assert _is_table_class(obj), (
                f"{module_name}.py imports {name} from {sibling}.py, which is not a "
                "table class — non-table shapes belong in a <router>_payloads.py "
                "module (ADR 046), not a sibling entity module"
            )


def test_table_class_predicate_distinguishes_card_field_value_from_card_read():
    """The case ADR 046's table-class exception exists for: card.py legitimately
    imports the CardFieldValue table class for its Relationship, and the guard above
    must keep passing because of this predicate, not by accident."""
    from app.models.card import CardFieldValue, CardRead

    assert _is_table_class(CardFieldValue) is True
    assert _is_table_class(CardRead) is False
