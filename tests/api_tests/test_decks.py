import uuid
from datetime import UTC, datetime

from sqlalchemy import event

from app.database_ops.deck import db_read_deck_listings
from app.mastery.config import get_mastery_strategy
from app.mastery.types import ReviewGroup
from app.models.card import Card
from app.models.deck import Deck
from app.models.field_def import FieldDef, FieldType
from app.services.mastery import apply_rating


class TestDeckSummaryQueryBounds:
    def test_query_count_does_not_scale_with_deck_count(self, db, existing_user):
        """db_read_deck_listings must use grouped aggregate queries, never one
        query per deck — proven directly by counting statements, not just by
        eyeballing the implementation."""
        user_id = existing_user.id  # read before commit expires the ORM object below
        for i in range(5):
            deck = Deck(user_id=user_id, name=f"Deck {i}")
            db.add(deck)
            db.flush()
            db.add(FieldDef(deck_id=deck.id, name="Front", type=FieldType.text, position=0))
        db.commit()

        engine = db.get_bind()
        statements: list[str] = []

        def _record(conn, cursor, statement, *args):
            statements.append(statement)

        event.listen(engine, "before_cursor_execute", _record)
        try:
            summaries = db_read_deck_listings(db, user_id)
        finally:
            event.remove(engine, "before_cursor_execute", _record)

        assert len(summaries) == 5
        # decks + grouped card-count + grouped field-names = 3, regardless of deck
        # count — not 1 (decks) + 5 (counts) + 5 (field names) as N+1 would produce.
        assert len(statements) <= 3, statements


class TestDeckReadiness:
    @staticmethod
    def _count_statements(db, request):
        engine = db.get_bind()
        statements: list[str] = []

        def _record(conn, cursor, statement, *args):
            statements.append(statement)

        event.listen(engine, "before_cursor_execute", _record)
        try:
            response = request()
        finally:
            event.remove(engine, "before_cursor_execute", _record)
        assert response.status_code == 200
        return response.json(), statements

    def test_list_runs_a_fixed_number_of_statements(self, client, db, existing_user):
        user_id = existing_user.id
        for i in range(5):
            deck = Deck(user_id=user_id, name=f"Deck {i}")
            db.add(deck)
            db.flush()
            db.add(FieldDef(deck_id=deck.id, name="Front", type=FieldType.text, position=0))
            db.add(Card(deck_id=deck.id))
        empty = Deck(user_id=user_id, name="No cards")
        db.add(empty)
        db.commit()
        empty_id = str(empty.id)
        db.refresh(existing_user)

        data, statements = self._count_statements(db, lambda: client.get("/api/decks"))

        by_id = {row["id"]: row for row in data}
        assert len(by_id) == 6
        assert by_id[empty_id]["readiness"] is None
        assert [row["readiness"] for key, row in by_id.items() if key != empty_id] == [0.0] * 5
        # decks + grouped card-count + grouped field-names + the one fold over every deck.
        assert len(statements) <= 4, statements

    def test_detail_runs_a_fixed_number_of_statements(self, client, db, existing_user):
        deck = Deck(user_id=existing_user.id, name="Five cards")
        db.add(deck)
        db.flush()
        fields = [
            FieldDef(deck_id=deck.id, name=name, type=FieldType.text, position=position)
            for position, name in enumerate(["Front", "Back"])
        ]
        cards = [Card(deck_id=deck.id) for _ in range(5)]
        db.add_all([*fields, *cards])
        db.flush()
        apply_rating(
            db,
            get_mastery_strategy(),
            ReviewGroup(
                review_group_id=uuid.uuid4(),
                card_id=cards[0].id,
                reviewed_at=datetime.now(UTC),
                ratings=((fields[0].id, 3),),
                shown_prompt_ids=(),
            ),
            None,
        )
        db.commit()
        deck_id, rated_card_id = str(deck.id), str(cards[0].id)
        db.refresh(existing_user)

        data, statements = self._count_statements(
            db, lambda: client.get(f"/api/decks/{deck_id}")
        )

        readiness = {card["id"]: card["readiness"] for card in data["cards"]}
        assert len(readiness) == 5
        assert abs(readiness[rated_card_id] - 0.15) < 1e-9
        assert abs(data["readiness"] - sum(readiness.values()) / 5) < 1e-9
        # deck + field defs + cards + their values + the deck's fold + the cards' fold.
        assert len(statements) <= 6, statements

    def test_detail_of_a_deck_with_no_card_reads_null(self, client, existing_deck):
        assert client.get(f"/api/decks/{existing_deck['id']}").json()["readiness"] is None


class TestDeckCRUD:
    def test_read_deck(self, client, existing_deck):
        response = client.get(f"/api/decks/{existing_deck['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == existing_deck["id"]
        assert data["name"] == "Test Deck"

    def test_read_decks(self, client, existing_deck):
        response = client.get("/api/decks")
        assert response.status_code == 200
        assert [d["id"] for d in response.json()] == [existing_deck["id"]]

    def test_read_decks_includes_card_count_and_field_names(self, client):
        """DeckSummary: card_count and field_names, position order, active fields
        only, computed without one query per deck."""
        deck = client.post(
            "/api/decks",
            json={
                "name": "Vocab",
                "field_defs": [
                    {"name": "Front", "type": "text"},
                    {"name": "Back", "type": "text"},
                    {"name": "Notes", "type": "text"},
                ],
            },
        ).json()
        fields = {fd["name"]: fd["id"] for fd in deck["field_defs"]}
        for values in (
            {"Front": "Bonjour", "Back": "Hello", "Notes": "greeting"},
            {"Front": "Merci", "Back": "Thank you"},
        ):
            card_res = client.post(
                "/api/cards",
                json={
                    "deck_id": deck["id"],
                    "values": {fields[name]: value for name, value in values.items()},
                },
            )
            assert card_res.status_code == 201, card_res.text
        front_id = fields["Front"]
        client.delete(f"/api/fields/{front_id}")  # deleted — must not appear below

        response = client.get("/api/decks")
        assert response.status_code == 200
        [summary] = response.json()
        assert summary["card_count"] == 2
        assert summary["field_names"] == ["Back", "Notes"]

    def test_read_decks_empty_deck_has_zero_card_count(self, client, existing_deck):
        response = client.get("/api/decks")
        assert response.status_code == 200
        [summary] = response.json()
        assert summary["card_count"] == 0
        assert summary["field_names"] == []

    def test_update_deck(self, client, existing_deck):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}", json={"name": "Updated Deck Name"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == existing_deck["id"]
        assert data["name"] == "Updated Deck Name"

    def test_delete_deck(self, client, existing_deck):
        response = client.delete(f"/api/decks/{existing_deck['id']}")
        assert response.status_code == 204

        get_response = client.get(f"/api/decks/{existing_deck['id']}")
        assert get_response.status_code == 404


class TestDeckCreateAtomic:
    """POST /api/decks — deck and field_defs created together in one transaction.
    Cards are not part of this contract: a deck is born with a schema and no content;
    cards come afterward via POST /api/cards or the batch-edit endpoint (see
    test_cards.py and test_deck_batch_edit.py)."""

    def _payload(self, **overrides):
        payload = {
            "name": "Vocab Deck",
            "field_defs": [
                {"name": "Front", "type": "text"},
                {"name": "Back", "type": "text"},
            ],
        }
        payload.update(overrides)
        return payload

    def test_happy_path(self, client):
        response = client.post("/api/decks", json=self._payload())
        assert response.status_code == 201, response.text
        data = response.json()

        assert data["name"] == "Vocab Deck"

        field_defs = sorted(data["field_defs"], key=lambda fd: fd["position"])
        assert [fd["position"] for fd in field_defs] == [0, 1]
        assert [fd["name"] for fd in field_defs] == ["Front", "Back"]
        assert all(fd["type"] == "text" for fd in field_defs)
        assert data["cards"] == []

        get_response = client.get(f"/api/decks/{data['id']}")
        assert get_response.status_code == 200
        got = get_response.json()
        assert got["id"] == data["id"]
        assert got["name"] == data["name"]
        assert {fd["id"]: fd for fd in got["field_defs"]} == {
            fd["id"]: fd for fd in data["field_defs"]
        }
        assert got["cards"] == []

    def test_fewer_than_two_fields_rejected(self, client):
        response = client.post(
            "/api/decks",
            json=self._payload(field_defs=[]),
        )
        assert response.status_code == 422
        assert response.json()["detail"]["code"] == "too_few_fields"

    def test_one_field_rejected(self, client):
        """A deck needs at least one prompt field and one answer field, so a
        single-field deck is rejected too."""
        response = client.post(
            "/api/decks",
            json=self._payload(
                field_defs=[{"name": "Front", "type": "text"}],
            ),
        )
        assert response.status_code == 422
        assert response.json()["detail"]["code"] == "too_few_fields"

    def test_duplicate_field_names_rejected(self, client):
        response = client.post(
            "/api/decks",
            json=self._payload(
                field_defs=[
                    {"name": "Front", "type": "text"},
                    {"name": "front", "type": "text"},
                ],
            ),
        )
        assert response.status_code == 422
        assert "duplicate" in response.json()["detail"].lower()

    def test_name_another_of_the_users_decks_has_is_refused_and_rolled_back(self, client):
        """The one create failure that comes from the database rather than from the
        validation above: the per-user deck name constraint. It raises at the staged
        create's flush and create_deck_atomic's handler turns it into a 422, so the
        rollback must leave only the first deck behind."""
        first = client.post("/api/decks", json=self._payload())
        assert first.status_code == 201, first.text

        second = client.post("/api/decks", json=self._payload())
        assert second.status_code == 422, second.text
        assert second.json()["detail"]["code"] == "deck_name_taken"

        decks = client.get("/api/decks").json()
        assert [d["name"] for d in decks] == ["Vocab Deck"]

    def test_name_another_users_deck_has_is_allowed(self, client, act_as, other_user, existing_user):
        first = client.post("/api/decks", json=self._payload())
        assert first.status_code == 201, first.text

        act_as(other_user)
        second = client.post("/api/decks", json=self._payload())
        assert second.status_code == 201, second.text
        assert [d["id"] for d in client.get("/api/decks").json()] == [second.json()["id"]]

        act_as(existing_user)
        assert [d["id"] for d in client.get("/api/decks").json()] == [first.json()["id"]]
