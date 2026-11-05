import uuid
from datetime import UTC, datetime

from sqlalchemy import event

from app.database_ops.subject import db_read_subject_listings
from app.mastery.config import get_mastery_strategy
from app.mastery.types import ReviewGroup
from app.models.card import Card
from app.models.deck import Deck
from app.models.field_def import FieldDef, FieldType
from app.models.subject import Subject
from app.services.mastery import apply_rating


class TestSubjectSummaryQueryBounds:
    def test_query_count_does_not_scale_with_subject_count(self, db, existing_user):
        """db_read_subject_listings must use a grouped aggregate query, never one
        query per subject — proven directly by counting statements."""
        user_id = existing_user.id  # read before commit expires the ORM object below
        for i in range(5):
            db.add(Subject(user_id=user_id, name=f"Subject {i}"))
        db.commit()

        engine = db.get_bind()
        statements: list[str] = []

        def _record(conn, cursor, statement, *args):
            statements.append(statement)

        event.listen(engine, "before_cursor_execute", _record)
        try:
            summaries = db_read_subject_listings(db, user_id)
        finally:
            event.remove(engine, "before_cursor_execute", _record)

        assert len(summaries) == 5
        # subjects + grouped deck-count = 2, regardless of subject count.
        assert len(statements) <= 2, statements


def _deck_with_cards(db, subject_id, name, card_count):
    """A deck of one field and that many cards, returning the field's and the cards' ids."""
    deck = Deck(subject_id=subject_id, name=name)
    db.add(deck)
    db.flush()
    field = FieldDef(deck_id=deck.id, name="Front", type=FieldType.text, position=0)
    cards = [Card(deck_id=deck.id) for _ in range(card_count)]
    db.add(field)
    db.add_all(cards)
    db.flush()
    return field.id, [card.id for card in cards]


def _rate_good(db, card_id, field_id):
    apply_rating(
        db,
        get_mastery_strategy(),
        ReviewGroup(
            review_group_id=uuid.uuid4(),
            card_id=card_id,
            reviewed_at=datetime.now(UTC),
            ratings=((field_id, 3),),
            shown_prompt_ids=(),
        ),
        None,
    )


class TestSubjectReadiness:
    def test_list_runs_a_fixed_number_of_statements(self, client, db, existing_user):
        user_id = existing_user.id  # read before commit expires the ORM object below
        for i in range(5):
            subject = Subject(user_id=user_id, name=f"Subject {i}")
            db.add(subject)
            db.flush()
            _deck_with_cards(db, subject.id, "Deck", 2)
        empty = Subject(user_id=user_id, name="No cards")
        db.add(empty)
        db.flush()
        _deck_with_cards(db, empty.id, "Empty deck", 0)
        db.commit()
        empty_id = str(empty.id)
        db.refresh(existing_user)

        engine = db.get_bind()
        statements: list[str] = []

        def _record(conn, cursor, statement, *args):
            statements.append(statement)

        event.listen(engine, "before_cursor_execute", _record)
        try:
            response = client.get("/api/subjects")
        finally:
            event.remove(engine, "before_cursor_execute", _record)

        assert response.status_code == 200
        by_id = {row["id"]: row for row in response.json()}
        assert len(by_id) == 6
        assert by_id[empty_id]["readiness"] is None
        assert [row["readiness"] for key, row in by_id.items() if key != empty_id] == [0.0] * 5
        # subjects + grouped deck-count + the one fold over every subject.
        assert len(statements) <= 3, statements

    def test_a_subject_with_no_deck_reads_null(self, client, existing_subject):
        assert client.get("/api/subjects").json()[0]["readiness"] is None

    def test_read_carries_deck_count_and_readiness(
        self, client, db, existing_user, existing_subject
    ):
        subject_id = uuid.UUID(existing_subject["id"])
        _deck_with_cards(db, subject_id, "Deck", 1)
        db.commit()
        db.refresh(existing_user)

        engine = db.get_bind()
        statements: list[str] = []

        def _record(conn, cursor, statement, *args):
            statements.append(statement)

        event.listen(engine, "before_cursor_execute", _record)
        try:
            response = client.get(f"/api/subjects/{subject_id}")
        finally:
            event.remove(engine, "before_cursor_execute", _record)

        assert response.status_code == 200
        data = response.json()
        assert data["deck_count"] == 1
        assert data["readiness"] == 0.0
        # subject + grouped deck-count + the one fold.
        assert len(statements) <= 3, statements

    def test_folds_over_cards_each_once_not_over_decks(self, client, db, existing_subject):
        """A one-card deck at 0.3 beside a three-card deck at 0 reads 0.075, over four cards;
        an average of the decks' figures would read 0.15."""
        subject_id = uuid.UUID(existing_subject["id"])
        field_id, [card_id] = _deck_with_cards(db, subject_id, "Small", 1)
        _deck_with_cards(db, subject_id, "Large", 3)
        _rate_good(db, card_id, field_id)
        db.commit()

        data = client.get(f"/api/subjects/{subject_id}").json()

        assert abs(data["readiness"] - 0.3 / 4) < 1e-9


class TestSubjectsCRUD:
    def test_create_subject(self, client, existing_user):
        response = client.post(
            "/api/subjects",
            json={"user_id": str(existing_user.id), "name": "Create Test Subject"},
        )
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["name"] == "Create Test Subject"
        assert "id" in data

    def test_read_subject(self, client, existing_subject):
        response = client.get(f"/api/subjects/{existing_subject['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == existing_subject["id"]
        assert data["name"] == "Test Subject"

    def test_read_subjects_by_user(self, client, existing_user, existing_subject):
        response = client.get("/api/subjects", params={"user_id": str(existing_user.id)})
        assert response.status_code == 200
        assert [s["id"] for s in response.json()] == [existing_subject["id"]]

    def test_read_subjects_includes_deck_count(self, client, existing_subject):
        """SubjectSummary: deck_count, computed without one query per subject."""
        list_response = client.get("/api/subjects")
        [summary] = list_response.json()
        assert summary["deck_count"] == 0

        client.post(
            "/api/decks",
            json={
                "name": "Deck A",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
            },
        )
        client.post(
            "/api/decks",
            json={
                "name": "Deck B",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
            },
        )

        list_response = client.get("/api/subjects")
        assert list_response.status_code == 200
        [summary] = list_response.json()
        assert summary["deck_count"] == 2

    def test_update_subject(self, client, existing_subject):
        response = client.patch(
            f"/api/subjects/{existing_subject['id']}",
            json={"name": "Updated Subject Name"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == existing_subject["id"]
        assert data["name"] == "Updated Subject Name"

    def test_rename_to_taken_name_answers_subject_name_taken(self, client, existing_subject):
        other = client.post("/api/subjects", json={"name": "Other Subject"})
        assert other.status_code == 201, other.text

        response = client.patch(
            f"/api/subjects/{other.json()['id']}", json={"name": existing_subject["name"]}
        )
        assert response.status_code == 400
        assert response.json()["detail"]["code"] == "subject_name_taken"

        check = client.get(f"/api/subjects/{other.json()['id']}").json()
        assert check["name"] == "Other Subject"

    def test_delete_subject(self, client, existing_subject):
        response = client.delete(f"/api/subjects/{existing_subject['id']}")
        assert response.status_code == 204

        get_response = client.get(f"/api/subjects/{existing_subject['id']}")
        assert get_response.status_code == 404

    def test_delete_subject_cascades_its_decks(self, client, existing_subject):
        """Deleting a subject cascades to its decks and on to everything each deck
        owns, which is what SubjectForm's delete confirm tells the user will happen."""
        deck_response = client.post(
            "/api/decks",
            json={
                "name": "Deck to cascade",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
            },
        )
        deck = deck_response.json()
        fields = {fd["name"]: fd["id"] for fd in deck["field_defs"]}
        card_response = client.post(
            "/api/cards",
            json={"deck_id": deck["id"], "values": {fields["Front"]: "hi", fields["Back"]: "there"}},
        )
        card_id = card_response.json()["id"]

        response = client.delete(f"/api/subjects/{existing_subject['id']}")
        assert response.status_code == 204

        get_deck_response = client.get(f"/api/decks/{deck['id']}")
        assert get_deck_response.status_code == 404
        get_card_response = client.get(f"/api/cards/{card_id}")
        assert get_card_response.status_code == 404

    def test_duplicate_name_for_same_user_rejected(self, client, existing_user, existing_subject):
        response = client.post(
            "/api/subjects",
            json={"user_id": str(existing_user.id), "name": existing_subject["name"]},
        )
        assert response.status_code == 400
        assert response.json()["detail"]["code"] == "subject_name_taken"

    def test_create_subject_defaults_description_and_icon(self, client):
        response = client.post("/api/subjects", json={"name": "Defaults Test Subject"})
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["description"] == ""
        assert data["icon"]
        assert data["icon"] is not None

        get_response = client.get(f"/api/subjects/{data['id']}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["description"] == data["description"]
        assert get_data["icon"] == data["icon"]
