import re
from pathlib import Path

from sqlalchemy.exc import OperationalError

from app.database import _CONNECT_ARGS, DB_CONNECT_TIMEOUT_SECONDS, engine


def test_health_ok_without_auth(client):
    """ADR 064: the one route without CurrentUserDep. Clears the test's auth bypass so
    the real get_current_app_user would run if the route depended on it."""
    from app.dependencies import get_current_app_user
    from app.main import app

    app.dependency_overrides.pop(get_current_app_user, None)
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_reports_database_unavailable(client, monkeypatch):
    def failing_ping(db):
        raise OperationalError("SELECT 1", {}, Exception("connection refused"))

    monkeypatch.setattr("app.routers.api.health.db_ping", failing_ping)
    response = client.get("/api/health")
    assert response.status_code == 503
    assert response.json() == {
        "detail": {
            "code": "database_unavailable",
            "message": "Flashy is temporarily unavailable.",
        }
    }


def test_engine_fails_fast_and_pre_pings():
    """Task 020 MD-1."""
    assert _CONNECT_ARGS["connect_timeout"] == DB_CONNECT_TIMEOUT_SECONDS == 3
    assert engine.pool._pre_ping is True


def test_db_connect_timeout_is_shorter_than_the_probe_timeout():
    """ADR 063: a silent database must answer 503 before the frontend probe gives up,
    so it reads as server trouble rather than can't connect."""
    repo_root = Path(__file__).resolve().parents[2]
    source = (repo_root / "frontend/src/api/health.ts").read_text()
    match = re.search(r"HEALTH_PROBE_TIMEOUT_MS = ([\d_]+);", source)
    assert match, "HEALTH_PROBE_TIMEOUT_MS not found in frontend/src/api/health.ts"
    probe_timeout_ms = int(match.group(1).replace("_", ""))
    assert probe_timeout_ms > DB_CONNECT_TIMEOUT_SECONDS * 1000
