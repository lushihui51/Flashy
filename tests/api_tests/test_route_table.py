"""A guard over the app's route table: which user a route resolves follows from its
method, so a read a guest can make and a write only a session can make are told apart by
the dependency each route takes. Every entry of `app.routes` is read whatever its class,
so a route added outside a router, or a page of FastAPI's own, is checked too."""

from collections.abc import Callable, Iterable

from fastapi import APIRouter, FastAPI
from fastapi.dependencies.models import Dependant

from app.dependencies import CurrentUserDep, ViewerDep, get_current_app_user, get_viewer
from app.frontend import FRONTEND_ROUTE_NAME
from app.main import app

HEALTH_PATH = "/api/health"
FRONTEND_PATH = "/{path:path}"


def _calls(dependant: Dependant | None) -> set[Callable]:
    """Every function the dependant's dependencies call, sub-dependencies included; empty
    for an entry with no dependant, such as a plain Starlette route or a mount."""
    if dependant is None:
        return set()
    calls: set[Callable] = set()
    for dependency in dependant.dependencies:
        if dependency.call is not None:
            calls.add(dependency.call)
        calls |= _calls(dependency)
    return calls


def _methods(route) -> set[str]:
    """The route's methods but HEAD, which Starlette adds beside every GET; empty for an
    entry with no methods, such as a mount."""
    return set(getattr(route, "methods", None) or ()) - {"HEAD"}


def _under_api(route) -> bool:
    return getattr(route, "path", "").startswith("/api/")


def _gets_without_viewer(routes: Iterable) -> list[str]:
    return [
        f"{route.path} {sorted(_methods(route))}"
        for route in routes
        if _under_api(route)
        and route.path != HEALTH_PATH
        and "GET" in _methods(route)
        and get_viewer not in _calls(getattr(route, "dependant", None))
    ]


def _others_without_current_user(routes: Iterable) -> list[str]:
    """An entry with no methods, such as a mount, answers every method, so it counts as
    a route of another method."""
    return [
        f"{route.path} {sorted(_methods(route))}"
        for route in routes
        if _under_api(route)
        and (_methods(route) - {"GET"} or not _methods(route))
        and get_current_app_user not in _calls(getattr(route, "dependant", None))
    ]


def _serves_the_frontend(route) -> bool:
    return getattr(route, "name", None) == FRONTEND_ROUTE_NAME and route.path == FRONTEND_PATH


def _outside_api(routes: Iterable) -> list[str]:
    return [
        f"{type(route).__name__} {getattr(route, 'path', None)}"
        for route in routes
        if not _under_api(route) and not _serves_the_frontend(route)
    ]


def test_every_get_route_under_api_but_health_takes_viewer_dep():
    """A read a guest makes is answered as the example user only through get_viewer;
    without it the read answers a guest 401."""
    assert _gets_without_viewer(app.routes) == []


def test_every_route_of_another_method_takes_current_user_dep():
    """A route that can write answers no request without a verified session."""
    assert _others_without_current_user(app.routes) == []


def test_health_resolves_no_user():
    """The health probe must answer whether or not Clerk answers and whether or not the
    database holds an example user."""
    [health] = [route for route in app.routes if getattr(route, "path", None) == HEALTH_PATH]
    calls = _calls(health.dependant)
    assert get_viewer not in calls
    assert get_current_app_user not in calls


def test_the_only_route_outside_api_serves_the_frontend():
    """A route outside /api would be checked by neither rule above. The one that serves
    the frontend's files reads no user's data, and stands in the table only where a
    built frontend exists."""
    assert _outside_api(app.routes) == []


def test_the_guard_finds_each_kind_of_offending_route():
    """Each rule above names the routes it is meant to catch, so an empty list from
    app.routes means the app is clean and not that the rule matches nothing."""
    router = APIRouter()

    @router.get("/open-read")
    def open_read() -> None: ...

    @router.get("/session-read")
    def session_read(user: CurrentUserDep) -> None: ...

    @router.get("/viewer-read")
    def viewer_read(user: ViewerDep) -> None: ...

    @router.post("/open-write")
    def open_write() -> None: ...

    @router.post("/viewer-write")
    def viewer_write(user: ViewerDep) -> None: ...

    @router.post("/session-write")
    def session_write(user: CurrentUserDep) -> None: ...

    bad = FastAPI()
    bad.include_router(router, prefix="/api")
    bad.mount("/api/files", FastAPI())
    bad.add_api_route("/page", open_read, name=FRONTEND_ROUTE_NAME)
    bad.add_api_route(FRONTEND_PATH, open_read, name="catch_all")
    bad.add_api_route(FRONTEND_PATH, open_read, name=FRONTEND_ROUTE_NAME)

    assert _gets_without_viewer(bad.routes) == [
        "/api/open-read ['GET']",
        "/api/session-read ['GET']",
    ]
    assert _others_without_current_user(bad.routes) == [
        "/api/open-write ['POST']",
        "/api/viewer-write ['POST']",
        "/api/files []",
    ]
    assert _outside_api(bad.routes) == [
        "Route /openapi.json",
        "Route /docs",
        "Route /docs/oauth2-redirect",
        "Route /redoc",
        "APIRoute /page",
        "APIRoute /{path:path}",
    ]
