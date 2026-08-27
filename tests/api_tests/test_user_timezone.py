"""ADR 019: `app_user.timezone` is the user's IANA zone, supplied by the client on
every request via X-Timezone, and used only to render dates back in their local zone.
Nothing stored is ever expressed in it — every timestamp column stays a server-stamped
UTC instant."""

import pytest
from sqlmodel import select

from app import dependencies
from app.dependencies import get_current_app_user
from app.models.app_user import DEFAULT_TIMEZONE, AppUser
from app.services.timezone import normalize_timezone


@pytest.fixture
def stub_clerk(monkeypatch):
    """Makes the Authorization header a plain clerk_user_id, so these tests exercise
    the real get_current_app_user (headers and all) rather than the dependency override
    the `client` fixture installs."""

    def _verify(token: str) -> dict:
        return {"sub": token}

    monkeypatch.setattr(dependencies, "verify_clerk_session", _verify)


def _call(db, clerk_user_id="tz-user", zone=None):
    return get_current_app_user(db, authorization=f"Bearer {clerk_user_id}", x_timezone=zone)


class TestNormalizeTimezone:
    @pytest.mark.parametrize(
        "value", ["UTC", "America/Los_Angeles", "Europe/London", "Australia/Sydney"]
    )
    def test_accepts_resolvable_iana_keys(self, value):
        assert normalize_timezone(value) == value

    @pytest.mark.parametrize(
        "value",
        [
            None,
            "",
            "Not/AZone",
            "PST",  # an abbreviation, not an IANA key
            "-07:00",  # a raw offset carries no DST rules
            "../../etc/passwd",
            "America/Los_Angeles; DROP TABLE app_user",
            "A" * 65,
        ],
    )
    def test_rejects_anything_unresolvable(self, value):
        assert normalize_timezone(value) is None


class TestTimezoneSync:
    def test_new_user_defaults_to_utc_when_client_sends_nothing(self, db, stub_clerk):
        user = _call(db)
        assert user.timezone == DEFAULT_TIMEZONE

    def test_new_user_takes_the_clients_zone(self, db, stub_clerk):
        user = _call(db, zone="America/Los_Angeles")
        assert user.timezone == "America/Los_Angeles"

    def test_existing_user_follows_the_client_when_it_changes(self, db, stub_clerk):
        _call(db, zone="America/Los_Angeles")
        user = _call(db, zone="Europe/London")
        assert user.timezone == "Europe/London"

    def test_a_missing_header_does_not_downgrade_a_known_zone(self, db, stub_clerk):
        _call(db, zone="Europe/London")
        user = _call(db, zone=None)
        assert user.timezone == "Europe/London"

    def test_an_unresolvable_header_does_not_downgrade_a_known_zone(self, db, stub_clerk):
        _call(db, zone="Europe/London")
        user = _call(db, zone="Not/AZone")
        assert user.timezone == "Europe/London"

    def test_sync_does_not_create_a_second_user_row(self, db, stub_clerk):
        _call(db, zone="America/Los_Angeles")
        _call(db, zone="Europe/London")
        rows = db.exec(select(AppUser).where(AppUser.clerk_user_id == "tz-user")).all()
        assert len(rows) == 1

    def test_zone_is_per_user_not_global(self, db, stub_clerk):
        _call(db, clerk_user_id="tz-a", zone="America/Los_Angeles")
        _call(db, clerk_user_id="tz-b", zone="Europe/London")
        assert _call(db, clerk_user_id="tz-a").timezone == "America/Los_Angeles"
        assert _call(db, clerk_user_id="tz-b").timezone == "Europe/London"

    def test_zone_never_changes_stored_timestamps(self, db, stub_clerk):
        """The whole point of ADR 019: the zone is a rendering input. Moving it must not
        rewrite, re-express, or shift any instant already on the row."""
        user = _call(db, zone="America/Los_Angeles")
        created_at = user.created_at
        user = _call(db, zone="Pacific/Auckland")
        assert user.created_at == created_at
        assert user.created_at.utcoffset().total_seconds() == 0
