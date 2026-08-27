"""D13 — last_activity_at, the recency sort key for subject/deck. Bumps on own-column
edits and on bubbled child activity (e.g. a deck's card/field writes, a deck created/
deleted/moved under a subject). See docs/plans/003-frontend-rebuild-creation-flows.md
Phase 5.4 for the full bubbling table this file verifies."""

import uuid
from datetime import datetime


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


class TestTimestampsOnInsert:
    def test_subject_timestamps_equal_created_at_on_insert(self, client):
        response = client.post("/api/subjects", json={"name": "Fresh Subject"})
        data = response.json()
        assert _parse(data["created_at"]) == _parse(data["last_activity_at"])

    def test_deck_timestamps_equal_created_at_on_insert(self, client, existing_subject):
        response = client.post(
            "/api/decks",
            json={
                "name": "Fresh Deck",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
            },
        )
        data = response.json()
        assert _parse(data["created_at"]) == _parse(data["last_activity_at"])


class TestOwnColumnEditBumpsBoth:
    def test_subject_edit_bumps_last_activity(self, client, existing_subject):
        response = client.patch(
            f"/api/subjects/{existing_subject['id']}", json={"description": "edited"}
        )
        data = response.json()
        assert _parse(data["last_activity_at"]) > _parse(existing_subject["created_at"])

    def test_deck_edit_bumps_last_activity(self, client, existing_subject):
        created = client.post(
            "/api/decks",
            json={
                "name": "Original Name",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
            },
        ).json()

        response = client.patch(f"/api/decks/{created['id']}", json={"name": "Renamed"})
        data = response.json()
        assert _parse(data["last_activity_at"]) > _parse(created["last_activity_at"])

    def test_subject_update_with_no_fields_does_not_touch_timestamps(self, client, existing_subject):
        response = client.patch(f"/api/subjects/{existing_subject['id']}", json={})
        data = response.json()
        assert _parse(data["last_activity_at"]) == _parse(existing_subject["last_activity_at"])


class TestDeckLifecycleBubblesToSubject:
    def test_deck_create_touches_subject_last_activity(self, client, existing_subject):
        client.post(
            "/api/decks",
            json={
                "name": "New Deck",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
            },
        )
        subject = client.get(f"/api/subjects/{existing_subject['id']}").json()
        assert _parse(subject["last_activity_at"]) > _parse(existing_subject["last_activity_at"])

    def test_deck_delete_touches_subject_last_activity(self, client, existing_subject):
        deck = client.post(
            "/api/decks",
            json={
                "name": "Doomed Deck",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
            },
        ).json()
        after_create = client.get(f"/api/subjects/{existing_subject['id']}").json()

        client.delete(f"/api/decks/{deck['id']}")

        after_delete = client.get(f"/api/subjects/{existing_subject['id']}").json()
        assert _parse(after_delete["last_activity_at"]) > _parse(after_create["last_activity_at"])

    def test_deck_move_touches_both_subjects_last_activity(self, client, existing_subject):
        other_subject = client.post("/api/subjects", json={"name": "Other Subject"}).json()
        deck = client.post(
            "/api/decks",
            json={
                "name": "Movable Deck",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
            },
        ).json()
        before_source = client.get(f"/api/subjects/{existing_subject['id']}").json()
        before_target = client.get(f"/api/subjects/{other_subject['id']}").json()

        response = client.patch(f"/api/decks/{deck['id']}", json={"subject_id": other_subject["id"]})
        assert response.status_code == 200, response.text

        after_source = client.get(f"/api/subjects/{existing_subject['id']}").json()
        after_target = client.get(f"/api/subjects/{other_subject['id']}").json()
        assert _parse(after_source["last_activity_at"]) > _parse(before_source["last_activity_at"])
        assert _parse(after_target["last_activity_at"]) > _parse(before_target["last_activity_at"])


class TestFieldWritesTouchDeck:
    def _deck(self, client, existing_subject, **field_overrides):
        field_defs = [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}]
        return client.post(
            "/api/decks",
            json={
                "name": f"Field Test Deck {uuid.uuid4()}",
                "subject_id": existing_subject["id"],
                "field_defs": field_defs,
            },
        ).json()

    def test_field_create_touches_deck_last_activity(self, client, existing_subject):
        deck = self._deck(client, existing_subject)
        client.post(f"/api/decks/{deck['id']}/fields", json={"name": "Extra", "type": "text"})
        after = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(deck["last_activity_at"])

    def test_field_rename_touches_deck_last_activity(self, client, existing_subject):
        deck = self._deck(client, existing_subject)
        field_id = deck["field_defs"][0]["id"]
        client.patch(f"/api/fields/{field_id}", json={"name": "Renamed"})
        after = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(deck["last_activity_at"])

    def test_field_archive_touches_deck_last_activity(self, client, existing_subject):
        deck = self._deck(client, existing_subject)
        client.post(f"/api/decks/{deck['id']}/fields", json={"name": "Extra", "type": "text"})
        before = client.get(f"/api/decks/{deck['id']}").json()

        field_id = deck["field_defs"][0]["id"]
        client.delete(f"/api/fields/{field_id}")

        after = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(before["last_activity_at"])

    def test_field_reorder_touches_deck_last_activity(self, client, existing_subject):
        deck = self._deck(client, existing_subject)
        ids = [fd["id"] for fd in deck["field_defs"]]
        client.post(f"/api/decks/{deck['id']}/fields/reorder", json=list(reversed(ids)))
        after = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(deck["last_activity_at"])

    def test_field_hard_delete_touches_deck_last_activity(self, client, existing_subject):
        deck = self._deck(client, existing_subject)
        client.post(f"/api/decks/{deck['id']}/fields", json={"name": "Extra", "type": "text"})
        field_id = deck["field_defs"][0]["id"]
        client.delete(f"/api/fields/{field_id}")
        before = client.get(f"/api/decks/{deck['id']}").json()

        client.delete(f"/api/fields/{field_id}/hard")

        after = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(before["last_activity_at"])


class TestCardWritesTouchDeck:
    def _deck_and_field(self, client, existing_subject):
        deck = client.post(
            "/api/decks",
            json={
                "name": f"Card Test Deck {uuid.uuid4()}",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
            },
        ).json()
        return deck, deck["field_defs"][0]["id"], deck["field_defs"][1]["id"]

    def test_card_create_touches_deck_last_activity(self, client, existing_subject):
        deck, front_id, back_id = self._deck_and_field(client, existing_subject)
        client.post(
            "/api/cards",
            json={"deck_id": deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        )
        after = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(deck["last_activity_at"])

    def test_card_patch_touches_deck_last_activity(self, client, existing_subject):
        deck, front_id, back_id = self._deck_and_field(client, existing_subject)
        card = client.post(
            "/api/cards",
            json={"deck_id": deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()
        before = client.get(f"/api/decks/{deck['id']}").json()

        client.patch(f"/api/cards/{card['id']}", json={"values": {front_id: "Salut"}})

        after = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(before["last_activity_at"])

    def test_card_delete_touches_deck_last_activity(self, client, existing_subject):
        deck, front_id, back_id = self._deck_and_field(client, existing_subject)
        card = client.post(
            "/api/cards",
            json={"deck_id": deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()
        before = client.get(f"/api/decks/{deck['id']}").json()

        client.delete(f"/api/cards/{card['id']}")

        after = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(before["last_activity_at"])

    def test_card_edit_does_not_touch_subject(self, client, existing_subject):
        """Editing a card is two levels below the subject — it must not bubble that
        far (§0: "Editing a card does not touch the subject — that's two levels up")."""
        deck, front_id, back_id = self._deck_and_field(client, existing_subject)
        card = client.post(
            "/api/cards",
            json={"deck_id": deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()
        before_subject = client.get(f"/api/subjects/{existing_subject['id']}").json()

        client.patch(f"/api/cards/{card['id']}", json={"values": {front_id: "Salut"}})

        after_subject = client.get(f"/api/subjects/{existing_subject['id']}").json()
        assert _parse(after_subject["last_activity_at"]) == _parse(before_subject["last_activity_at"])


class TestRecencyOrdering:
    def test_subject_list_ordered_by_last_activity_desc(self, client):
        first = client.post("/api/subjects", json={"name": "First Subject"}).json()
        second = client.post("/api/subjects", json={"name": "Second Subject"}).json()

        # touch `first` again so it should now sort ahead of `second`.
        client.patch(f"/api/subjects/{first['id']}", json={"description": "bump"})

        ids = [s["id"] for s in client.get("/api/subjects").json()]
        assert ids.index(first["id"]) < ids.index(second["id"])

    def test_deck_list_ordered_by_last_activity_desc(self, client, existing_subject):
        payload = lambda name: {  # noqa: E731
            "name": name,
            "subject_id": existing_subject["id"],
            "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
        }
        first = client.post("/api/decks", json=payload("First Deck")).json()
        second = client.post("/api/decks", json=payload("Second Deck")).json()

        client.patch(f"/api/decks/{first['id']}", json={"name": "First Deck Renamed"})

        ids = [d["id"] for d in client.get("/api/decks").json()]
        assert ids.index(first["id"]) < ids.index(second["id"])

    def test_subject_decks_ordered_by_last_activity_desc(self, client, existing_subject):
        payload = lambda name: {  # noqa: E731
            "name": name,
            "subject_id": existing_subject["id"],
            "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
        }
        first = client.post("/api/decks", json=payload("First Deck")).json()
        second = client.post("/api/decks", json=payload("Second Deck")).json()

        client.patch(f"/api/decks/{first['id']}", json={"name": "First Deck Renamed"})

        response = client.get("/api/decks", params={"subject_id": existing_subject["id"]})
        ids = [d["id"] for d in response.json()]
        assert ids.index(first["id"]) < ids.index(second["id"])
