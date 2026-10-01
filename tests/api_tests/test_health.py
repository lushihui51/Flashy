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
