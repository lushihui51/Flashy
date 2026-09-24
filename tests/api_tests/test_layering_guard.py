import ast
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
APP_ROOT = REPO_ROOT / "app"
DATABASE_OPS_ROOT = APP_ROOT / "database_ops"

# ADR 055: outside database_ops, transaction control is the only thing a caller may
# do with the session. Everything else is a persistence operation behind a db_* name.
SESSION_ALLOWLIST = {"commit", "rollback", "flush", "refresh"}

# ADR 055: verbs that name a function which writes nothing. It carries no stage_
# prefix and never commits, whatever else its name says.
NON_WRITING_VERBS = {"read", "fetch", "count", "next", "lock"}


def _rel(path: Path) -> str:
    return str(path.relative_to(REPO_ROOT))


def _app_files(*excluded: Path) -> list[Path]:
    """Every app/**/*.py outside the excluded paths, in a stable order so a failure
    message lists offenders the same way on every run."""
    return sorted(
        p
        for p in APP_ROOT.rglob("*.py")
        if not any(p == ex or ex in p.parents for ex in excluded)
    )


def _module_name(path: Path) -> str:
    """The dotted module a file under app/ is imported as: `app/services/deck.py` is
    `app.services.deck`, and a package's `__init__.py` is the package itself."""
    parts = list(path.relative_to(REPO_ROOT).with_suffix("").parts)
    if parts[-1] == "__init__":
        parts.pop()
    return ".".join(parts)


def _imported_modules(node: ast.Import | ast.ImportFrom, path: Path) -> list[str]:
    """Every dotted module an import statement can bind, resolved to absolute form.

    `from app import services` has module `app`, so a check on the module string alone
    would miss that it imports `app.services`; each imported name is therefore also
    tried as a submodule. A relative import is resolved against the file's own package,
    so `from ..services import x` inside `app/database_ops/` counts as `app.services`."""
    if isinstance(node, ast.Import):
        return [alias.name for alias in node.names]
    if node.level:
        package = _module_name(path).split(".")
        if path.name != "__init__.py":
            package = package[:-1]
        package = package[: len(package) - (node.level - 1)]
        base = ".".join(package + ([node.module] if node.module else []))
    else:
        base = node.module or ""
    return [base] + [f"{base}.{alias.name}" for alias in node.names]


def _within(module: str, package: str) -> bool:
    return module == package or module.startswith(package + ".")


def test_only_database_ops_imports_statement_builders():
    """ADR 055: outside database_ops, models, and the engine module, the only
    persistence imports are the Session type for signatures and the exceptions a
    caller catches. Anything else from sqlmodel or sqlalchemy is a statement builder,
    and building a statement is database_ops' job alone."""
    offenders = []
    for path in _app_files(DATABASE_OPS_ROOT, APP_ROOT / "models", APP_ROOT / "database.py"):
        for node in ast.walk(ast.parse(path.read_text())):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if _within(alias.name, "sqlmodel") or _within(alias.name, "sqlalchemy"):
                        offenders.append(f"{_rel(path)}:{node.lineno} import {alias.name}")
            elif isinstance(node, ast.ImportFrom) and node.module and not node.level:
                if _within(node.module, "sqlalchemy.exc"):
                    continue
                if node.module == "sqlmodel":
                    for alias in node.names:
                        if alias.name != "Session":
                            offenders.append(
                                f"{_rel(path)}:{node.lineno} from sqlmodel import {alias.name}"
                            )
                elif _within(node.module, "sqlmodel") or _within(node.module, "sqlalchemy"):
                    names = ", ".join(alias.name for alias in node.names)
                    offenders.append(f"{_rel(path)}:{node.lineno} from {node.module} import {names}")
    assert not offenders, (
        "statement builders imported outside database_ops; only `from sqlmodel import "
        "Session` and imports from sqlalchemy.exc are allowed there (ADR 055):\n"
        + "\n".join(offenders)
    )


def test_only_database_ops_calls_the_session():
    """ADR 055: every read, write, primary-key fetch, lock, and savepoint is a db_*
    function, so a service or router touches the session only to control the
    transaction it owns. Parsed as ast, so a `db.get` in a comment or docstring is
    never matched."""
    offenders = []
    for path in _app_files(DATABASE_OPS_ROOT):
        for node in ast.walk(ast.parse(path.read_text())):
            if (
                isinstance(node, ast.Call)
                and isinstance(node.func, ast.Attribute)
                and isinstance(node.func.value, ast.Name)
                and node.func.value.id == "db"
                and node.func.attr not in SESSION_ALLOWLIST
            ):
                offenders.append(f"{_rel(path)}:{node.lineno} db.{node.func.attr}(...)")
    assert not offenders, (
        "session called outside database_ops; only "
        f"{', '.join(sorted(SESSION_ALLOWLIST))} are allowed there (ADR 055):\n"
        + "\n".join(offenders)
    )


def test_layers_depend_downward_only():
    """ADR 055, amending ADR 034: routers depend on services, services on
    database_ops, and never the other way. database_ops/subject.py importing `touch`
    from a service went unnoticed through three syncs because nothing checked it."""
    upward = {
        DATABASE_OPS_ROOT: ("app.services", "app.routers"),
        APP_ROOT / "services": ("app.routers",),
    }
    offenders = []
    for layer_root, forbidden in upward.items():
        for path in sorted(layer_root.rglob("*.py")):
            for node in ast.walk(ast.parse(path.read_text())):
                if not isinstance(node, (ast.Import, ast.ImportFrom)):
                    continue
                for module in _imported_modules(node, path):
                    hit = next((pkg for pkg in forbidden if _within(module, pkg)), None)
                    if hit:
                        offenders.append(f"{_rel(path)}:{node.lineno} imports {module}")
                        break
    assert not offenders, (
        "a lower layer imports a higher one; database_ops may not import services or "
        "routers, and services may not import routers (ADR 055):\n" + "\n".join(offenders)
    )


def _commits(function: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
    return any(
        isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "commit"
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id == "db"
        for node in ast.walk(function)
    )


def test_stage_prefix_matches_commit_behaviour():
    """ADR 055: a caller reads commit behaviour off the name. `db_stage_*` and
    `db_try_stage_*` never commit; a writer without `stage_` does; a function whose
    verb writes nothing (read, fetch, count, next, lock) neither carries the prefix nor
    commits. The name is parsed exactly as task 015's Guards contract states."""
    offenders = []
    for path in sorted(DATABASE_OPS_ROOT.glob("*.py")):
        for node in ast.parse(path.read_text()).body:
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            if not node.name.startswith("db_"):
                continue
            where = f"{_rel(path)}:{node.lineno} {node.name}"

            tokens = node.name.removeprefix("db_").split("_")
            if tokens and tokens[0] == "try":
                tokens = tokens[1:]
            staged = bool(tokens) and tokens[0] == "stage"
            if staged:
                tokens = tokens[1:]
            if not tokens or not tokens[0]:
                offenders.append(f"{where} has no verb after its prefix")
                continue
            verb = tokens[0]
            commits = _commits(node)

            if verb in NON_WRITING_VERBS:
                if staged:
                    offenders.append(f"{where} is a `{verb}` but carries the stage_ prefix")
                if commits:
                    offenders.append(f"{where} is a `{verb}` but commits")
            elif commits and staged:
                offenders.append(f"{where} is named stage_ but commits")
            elif not commits and not staged:
                offenders.append(f"{where} does not commit, so it must be named db_stage_*")
    assert not offenders, (
        "a database_ops function's name disagrees with its commit behaviour (ADR 055):\n"
        + "\n".join(offenders)
    )
