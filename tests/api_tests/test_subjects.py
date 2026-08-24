from sqlalchemy import event

from app.database_ops.subject import db_read_subjects_with_summary
from app.models.subject import Subject


class TestSubjectSummaryQueryBounds:
    def test_query_count_does_not_scale_with_subject_count(self, db, existing_user):
        """Phase 2.6: db_read_subjects_with_summary must use a grouped aggregate
        query, never one query per subject — proven directly by counting statements."""
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
            summaries = db_read_subjects_with_summary(db, user_id)
        finally:
            event.remove(engine, "before_cursor_execute", _record)

        assert len(summaries) == 5
        # subjects + grouped deck-count = 2, regardless of subject count.
        assert len(statements) <= 2, statements


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
        """SubjectSummary (Phase 2.6): deck_count, computed without one query per
        subject."""
        list_response = client.get("/api/subjects")
        [summary] = list_response.json()
        assert summary["deck_count"] == 0

        client.post(
            "/api/decks",
            json={
                "name": "Deck A",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
                "cards": [],
            },
        )
        client.post(
            "/api/decks",
            json={
                "name": "Deck B",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
                "cards": [],
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

    def test_delete_subject(self, client, existing_subject):
        response = client.delete(f"/api/subjects/{existing_subject['id']}")
        assert response.status_code == 204

        get_response = client.get(f"/api/subjects/{existing_subject['id']}")
        assert get_response.status_code == 404

    def test_delete_subject_cascades_its_decks(self, client, existing_subject):
        """D12 cascades everything a deck owns from a deck delete, but deck.subject_id
        itself had no ondelete — deleting a subject with any deck 500'd
        (ForeignKeyViolation) instead of cascading, contradicting what SubjectForm's
        delete confirm tells the user will happen (§4.2)."""
        deck_response = client.post(
            "/api/decks",
            json={
                "name": "Deck to cascade",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
                "cards": [{"values": ["hi", "there"]}],
            },
        )
        deck_id = deck_response.json()["id"]

        response = client.delete(f"/api/subjects/{existing_subject['id']}")
        assert response.status_code == 204

        get_deck_response = client.get(f"/api/decks/{deck_id}")
        assert get_deck_response.status_code == 404

    def test_duplicate_name_for_same_user_rejected(self, client, existing_user, existing_subject):
        response = client.post(
            "/api/subjects",
            json={"user_id": str(existing_user.id), "name": existing_subject["name"]},
        )
        assert response.status_code == 400

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
