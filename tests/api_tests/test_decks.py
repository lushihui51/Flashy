import uuid

from sqlalchemy import event

from app.database_ops.deck import db_read_decks_with_summary
from app.models.deck import Deck
from app.models.field_def import FieldDef, FieldType


class TestDeckSummaryQueryBounds:
    def test_query_count_does_not_scale_with_deck_count(self, db, existing_user, existing_subject):
        """Phase 2.6: db_read_decks_with_summary must use grouped aggregate queries,
        never one query per deck — proven directly by counting statements, not just by
        eyeballing the implementation."""
        subject_id = uuid.UUID(existing_subject["id"])
        user_id = existing_user.id  # read before commit expires the ORM object below
        for i in range(5):
            deck = Deck(subject_id=subject_id, name=f"Deck {i}")
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
            summaries = db_read_decks_with_summary(db, user_id)
        finally:
            event.remove(engine, "before_cursor_execute", _record)

        assert len(summaries) == 5
        # decks + grouped card-count + grouped field-names = 3, regardless of deck
        # count — not 1 (decks) + 5 (counts) + 5 (field names) as N+1 would produce.
        assert len(statements) <= 3, statements


class TestDeckCRUD:
    def test_read_deck(self, client, existing_deck):
        response = client.get(f"/api/decks/{existing_deck['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == existing_deck["id"]
        assert data["name"] == "Test Deck"

    def test_read_decks_by_subject(self, client, existing_subject, existing_deck):
        response = client.get("/api/decks", params={"subject_id": existing_subject["id"]})
        assert response.status_code == 200
        assert [d["id"] for d in response.json()] == [existing_deck["id"]]

    def test_read_decks_includes_card_count_and_field_names(self, client, existing_subject):
        """DeckSummary (Phase 2.6): card_count and field_names, position order, active
        fields only, computed without one query per deck."""
        deck = client.post(
            "/api/decks",
            json={
                "name": "Vocab",
                "subject_id": existing_subject["id"],
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
        client.delete(f"/api/fields/{front_id}")  # archived — must not appear below

        response = client.get("/api/decks", params={"subject_id": existing_subject["id"]})
        assert response.status_code == 200
        [summary] = response.json()
        assert summary["card_count"] == 2
        assert summary["field_names"] == ["Back", "Notes"]

    def test_read_decks_empty_deck_has_zero_card_count(self, client, existing_deck):
        response = client.get("/api/decks", params={"subject_id": existing_deck["subject_id"]})
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
    Cards are no longer part of this contract (ADR 023, task 008 T2): a deck is born
    with a schema and no content; cards come afterward via POST /api/cards or the
    batch-edit endpoint (see test_cards.py and test_deck_batch_edit.py)."""

    def _payload(self, subject_id, **overrides):
        payload = {
            "name": "Vocab Deck",
            "subject_id": subject_id,
            "field_defs": [
                {"name": "Front", "type": "text"},
                {"name": "Back", "type": "text"},
            ],
        }
        payload.update(overrides)
        return payload

    def test_happy_path(self, client, existing_subject):
        response = client.post("/api/decks", json=self._payload(existing_subject["id"]))
        assert response.status_code == 201, response.text
        data = response.json()

        assert data["name"] == "Vocab Deck"
        assert data["subject_id"] == existing_subject["id"]

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
        assert got["subject_id"] == data["subject_id"]
        assert {fd["id"]: fd for fd in got["field_defs"]} == {
            fd["id"]: fd for fd in data["field_defs"]
        }
        assert got["cards"] == []

    def test_subject_not_found(self, client):
        response = client.post("/api/decks", json=self._payload(str(uuid.uuid4())))
        assert response.status_code == 422
        assert "subject" in response.json()["detail"].lower()

    def test_fewer_than_two_fields_rejected(self, client, existing_subject):
        response = client.post(
            "/api/decks",
            json=self._payload(existing_subject["id"], field_defs=[]),
        )
        assert response.status_code == 422
        assert "at least two fields" in response.json()["detail"]

    def test_one_field_rejected(self, client, existing_subject):
        """D3: a deck needs at least one prompt field and one answer field, so a
        single-field deck — unlike the old ≥1 rule — is rejected too."""
        response = client.post(
            "/api/decks",
            json=self._payload(
                existing_subject["id"],
                field_defs=[{"name": "Front", "type": "text"}],
            ),
        )
        assert response.status_code == 422
        assert "at least two fields" in response.json()["detail"]

    def test_duplicate_field_names_rejected(self, client, existing_subject):
        response = client.post(
            "/api/decks",
            json=self._payload(
                existing_subject["id"],
                field_defs=[
                    {"name": "Front", "type": "text"},
                    {"name": "front", "type": "text"},
                ],
            ),
        )
        assert response.status_code == 422
        assert "duplicate" in response.json()["detail"].lower()
