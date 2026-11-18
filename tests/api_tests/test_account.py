import uuid

import httpx
import pytest
from sqlmodel import col, func, select

from app.clerk_users import (
    CLERK_API_URL,
    CLERK_TIMEOUT_SECONDS,
    ClerkUnavailable,
    delete_clerk_user,
)
from app.config import settings
from app.models.app_user import AppUser
from app.models.card import Card
from app.models.card_field_value import CardFieldValue
from app.models.deck import Deck
from app.models.field_def import FieldDef
from app.models.mastery_log import MasteryLog
from app.models.practice import Practice
from app.models.practice_configuration import PracticeConfiguration
from app.models.review_log import ReviewLog
from app.models.run import Run
from app.models.run_card import RunCard
from app.models.run_configuration import RunConfiguration
from app.models.run_counted_card import RunCountedCard
from tests.conftest import configuration, start_practice


def _make_deck(client, name: str) -> dict:
    """A deck of the client's user with fields "front" and "back" and two cards."""
    deck_res = client.post(
        "/api/decks",
        json={
            "name": name,
            "field_defs": [{"name": "front", "type": "text"}, {"name": "back", "type": "text"}],
        },
    )
    assert deck_res.status_code == 201, deck_res.text
    deck = deck_res.json()
    fields = {fd["name"]: fd["id"] for fd in deck["field_defs"]}
    for front, back in (("Bonjour", "Hello"), ("Merci", "Thanks")):
        card_res = client.post(
            "/api/cards",
            json={"deck_id": deck["id"], "values": {fields["front"]: front, fields["back"]: back}},
        )
        assert card_res.status_code == 201, card_res.text
    return {"id": deck["id"], "fields": fields}


@pytest.fixture
def library(client, act_as, existing_user, other_user):
    """existing_user's deck, practice, run and one rated card, beside another user's deck
    with its cards; requests then go as existing_user."""
    act_as(other_user)
    other_deck = _make_deck(client, "Theirs")
    act_as(existing_user)

    deck = _make_deck(client, "Mine")
    run = start_practice(
        client, {deck["id"]: configuration([deck["fields"]["front"]], [deck["fields"]["back"]])}
    )
    state = client.get(f"/api/runs/{run['id']}/state")
    assert state.status_code == 200, state.text
    run_card = state.json()["current_card"]
    rated = client.post(
        f"/api/run_cards/{run_card['run_card_id']}/rate",
        json={"ratings": {deck["fields"]["back"]: 4}},
    )
    assert rated.status_code == 200, rated.text
    return {
        "deck_id": uuid.UUID(deck["id"]),
        "practice_id": uuid.UUID(run["practice_id"]),
        "run_id": uuid.UUID(run["id"]),
        "other_deck_id": uuid.UUID(other_deck["id"]),
    }


def _row_counts(db, user_id: uuid.UUID, library: dict) -> dict[str, int]:
    """For each table, how many rows of the user it holds, reached from the ids the
    library's setup made."""
    deck_ids = [library["deck_id"]]
    practice_ids = [library["practice_id"]]
    run_ids = [library["run_id"]]
    card_ids = select(Card.id).where(col(Card.deck_id).in_(deck_ids))

    def count(model, *where) -> int:
        return db.exec(select(func.count()).select_from(model).where(*where)).one()

    return {
        "app_user": count(AppUser, AppUser.id == user_id),
        "deck": count(Deck, col(Deck.id).in_(deck_ids)),
        "field_def": count(FieldDef, col(FieldDef.deck_id).in_(deck_ids)),
        "card": count(Card, col(Card.deck_id).in_(deck_ids)),
        "card_field_value": count(CardFieldValue, col(CardFieldValue.card_id).in_(card_ids)),
        "practice": count(Practice, col(Practice.id).in_(practice_ids)),
        "practice_configuration": count(
            PracticeConfiguration, col(PracticeConfiguration.practice_id).in_(practice_ids)
        ),
        "run": count(Run, col(Run.id).in_(run_ids)),
        "run_card": count(RunCard, col(RunCard.run_id).in_(run_ids)),
        "run_configuration": count(RunConfiguration, col(RunConfiguration.run_id).in_(run_ids)),
        "run_counted_card": count(RunCountedCard, col(RunCountedCard.run_id).in_(run_ids)),
        "review_log": count(ReviewLog, ReviewLog.user_id == user_id),
        "mastery_log": count(MasteryLog, col(MasteryLog.card_id).in_(card_ids)),
    }


class TestDeleteAccount:
    def test_deletes_every_row_of_the_user_and_the_user_at_clerk(
        self, db, client, existing_user, library, monkeypatch
    ):
        user_id, clerk_user_id = existing_user.id, existing_user.clerk_user_id
        deleted_at_clerk: list[str] = []
        monkeypatch.setattr("app.services.account.delete_clerk_user", deleted_at_clerk.append)
        before = _row_counts(db, user_id, library)
        assert all(before.values()), before

        response = client.delete("/api/account")

        assert response.status_code == 204, response.text
        assert _row_counts(db, user_id, library) == dict.fromkeys(before, 0)
        assert deleted_at_clerk == [clerk_user_id]
        other_deck_id = library["other_deck_id"]
        assert db.exec(select(func.count()).where(Deck.id == other_deck_id)).one() == 1
        assert db.exec(select(func.count()).where(Card.deck_id == other_deck_id)).one() == 2

    def test_clerk_unavailable_answers_502_and_deletes_nothing(
        self, db, client, existing_user, library, monkeypatch
    ):
        user_id = existing_user.id

        def refuse(clerk_user_id: str) -> None:
            raise ClerkUnavailable("Clerk's DELETE /users answered 500")

        monkeypatch.setattr("app.services.account.delete_clerk_user", refuse)
        before = _row_counts(db, user_id, library)

        response = client.delete("/api/account")

        assert response.status_code == 502, response.text
        assert response.json()["detail"]["code"] == "clerk_unavailable"
        assert _row_counts(db, user_id, library) == before


class TestDeleteClerkUser:
    def test_sends_the_users_address_and_the_secret_key(self, monkeypatch):
        sent: list[tuple[str, dict, float]] = []

        def fake_delete(url: str, *, headers: dict, timeout: float) -> httpx.Response:
            sent.append((url, headers, timeout))
            return httpx.Response(200)

        monkeypatch.setattr(httpx, "delete", fake_delete)

        delete_clerk_user("user_abc")

        assert sent == [
            (
                f"{CLERK_API_URL}/users/user_abc",
                {"Authorization": f"Bearer {settings.clerk_secret_key}"},
                CLERK_TIMEOUT_SECONDS,
            )
        ]

    @pytest.mark.parametrize("status", [404, 500])
    def test_an_answer_but_success_raises_naming_the_status(self, monkeypatch, status):
        monkeypatch.setattr(httpx, "delete", lambda *args, **kwargs: httpx.Response(status))

        with pytest.raises(ClerkUnavailable, match=str(status)):
            delete_clerk_user("user_abc")

    @pytest.mark.parametrize(
        "error",
        [httpx.TimeoutException("timed out"), httpx.ConnectError("connection refused")],
        ids=["timeout", "connect_error"],
    )
    def test_an_http_error_raises_naming_the_error(self, monkeypatch, error):
        def fail(*args, **kwargs):
            raise error

        monkeypatch.setattr(httpx, "delete", fail)

        with pytest.raises(ClerkUnavailable, match=type(error).__name__):
            delete_clerk_user("user_abc")
