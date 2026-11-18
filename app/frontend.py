from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

# The name the one route outside /api is registered under, by which the route-table test knows it.
FRONTEND_ROUTE_NAME = "frontend"


def _file_within(root: Path, path: str) -> Path | None:
    """The file `path` names under `root`, or None when it names no file there, or one
    that resolves outside it through `..` or a link."""
    try:
        candidate = (root / path).resolve()
    except ValueError:
        return None
    if candidate.is_relative_to(root) and candidate.is_file():
        return candidate
    return None


def add_frontend(app: FastAPI, dist: Path) -> None:
    """Registers the one route outside /api, GET /{path:path}, named FRONTEND_ROUTE_NAME:
    a file of `dist` when the path names one, `dist/index.html` otherwise, and 404 for a
    path under /api. Call it after every /api router is included, so that each /api route
    is matched first; `dist` must hold an index.html."""
    root = dist.resolve()
    index = root / "index.html"

    @app.get("/{path:path}", name=FRONTEND_ROUTE_NAME, include_in_schema=False)
    def frontend(path: str) -> FileResponse:
        # An address under /api that no route serves is an API error, never a page.
        if path == "api" or path.startswith("api/"):
            raise HTTPException(status_code=404)
        return FileResponse(_file_within(root, path) or index)
