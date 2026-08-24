"""PATCH /api/decks/{id} per plan §2.3 — the batch changeset endpoint Phase 6 adds:
field_defs and cards applied together in one transaction, in the stated order (field
create -> field update -> field delete -> reorder -> card delete -> card update ->
card create)."""

import uuid


def _field_defs(**overrides):
    payload = {"create": [], "update": [], "delete": [], "order": []}
    payload.update(overrides)
    return payload


def _cards(**overrides):
    payload = {"create": [], "update": [], "delete": []}
    payload.update(overrides)
    return payload


class TestFieldDefsCreateAlone:
    def test_field_create_alone(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(create=[{"client_key": "c1", "name": "Notes", "type": "text"}])},
        )
        assert response.status_code == 200, response.text
        names = {fd["name"] for fd in response.json()["field_defs"]}
        assert names == {"front", "back", "Notes"}

    def test_field_create_backfills_dense_card_field_value_rows(
        self, client, existing_deck, existing_field_defs
    ):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(create=[{"client_key": "c1", "name": "Notes", "type": "text"}])},
        )
        assert response.status_code == 200, response.text
        data = response.json()
        notes_id = next(fd["id"] for fd in data["field_defs"] if fd["name"] == "Notes")
        found = next(c for c in data["cards"] if c["id"] == card["id"])
        assert len(found["values"]) == 3
        assert found["values"][notes_id] == ""

    def test_duplicate_client_key_rejected(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={
                "field_defs": _field_defs(
                    create=[
                        {"client_key": "c1", "name": "Notes", "type": "text"},
                        {"client_key": "c1", "name": "Other", "type": "text"},
                    ]
                )
            },
        )
        assert response.status_code == 422

    def test_blank_name_rejected(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(create=[{"client_key": "c1", "name": "  ", "type": "text"}])},
        )
        assert response.status_code == 422


class TestFieldDefsUpdateAlone:
    def test_field_rename_alone(self, client, existing_deck, existing_field_defs):
        field_id = existing_field_defs[0]["id"]
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(update=[{"id": field_id, "name": "Renamed"}])},
        )
        assert response.status_code == 200, response.text
        renamed = next(fd for fd in response.json()["field_defs"] if fd["id"] == field_id)
        assert renamed["name"] == "Renamed"

    def test_field_type_change_alone(self, client, existing_deck, existing_field_defs):
        field_id = existing_field_defs[0]["id"]
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(update=[{"id": field_id, "type": "image"}])},
        )
        assert response.status_code == 200, response.text
        updated = next(fd for fd in response.json()["field_defs"] if fd["id"] == field_id)
        assert updated["type"] == "image"


class TestFieldDefsDeleteAlone:
    def test_field_delete_alone(self, client, existing_deck, existing_field_defs):
        client.post(f"/api/decks/{existing_deck['id']}/fields", json={"name": "Extra", "type": "text"})
        field_id = existing_field_defs[0]["id"]
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(delete=[field_id])},
        )
        assert response.status_code == 200, response.text
        ids = {fd["id"] for fd in response.json()["field_defs"]}
        assert field_id not in ids

    def test_field_delete_cascades_card_field_value_rows(
        self, client, existing_deck, existing_field_defs
    ):
        client.post(f"/api/decks/{existing_deck['id']}/fields", json={"name": "Extra", "type": "text"})
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(delete=[front_id])},
        )
        assert response.status_code == 200, response.text
        found = next(c for c in response.json()["cards"] if c["id"] == card["id"])
        assert front_id not in found["values"]
        assert back_id in found["values"]


class TestMinimumTwoActiveFields:
    def test_delete_below_two_fields_rejected(self, client, existing_deck, existing_field_defs):
        field_id = existing_field_defs[0]["id"]
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(delete=[field_id])},
        )
        assert response.status_code == 422
        assert "at least two fields" in response.json()["detail"]

    def test_delete_all_active_fields_at_once_rejected(self, client, existing_deck, existing_field_defs):
        extra = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "Extra", "type": "text"}
        ).json()
        field_ids = [fd["id"] for fd in existing_field_defs] + [extra["id"]]
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(delete=field_ids)},
        )
        assert response.status_code == 422
        assert "at least two fields" in response.json()["detail"]

        # rejected before commit — nothing persisted, all three still active.
        get_response = client.get(f"/api/decks/{existing_deck['id']}")
        assert len(get_response.json()["field_defs"]) == 3


class TestFieldDefsReorder:
    def test_reorder_alone(self, client, existing_deck, existing_field_defs):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(order=[back_id, front_id])},
        )
        assert response.status_code == 200, response.text
        by_id = {fd["id"]: fd["position"] for fd in response.json()["field_defs"]}
        assert by_id[back_id] == 0
        assert by_id[front_id] == 1

    def test_reorder_updates_positions_contiguously(self, client, existing_deck, existing_field_defs):
        extra = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "Extra", "type": "text"}
        ).json()
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(order=[extra["id"], back_id, front_id])},
        )
        assert response.status_code == 200, response.text
        positions = sorted(fd["position"] for fd in response.json()["field_defs"])
        assert positions == [0, 1, 2]

    def test_reorder_including_a_newly_created_field(self, client, existing_deck, existing_field_defs):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={
                "field_defs": _field_defs(
                    create=[{"client_key": "c1", "name": "Notes", "type": "text"}],
                    order=["c1", back_id, front_id],
                )
            },
        )
        assert response.status_code == 200, response.text
        by_name = {fd["name"]: fd["position"] for fd in response.json()["field_defs"]}
        assert by_name == {"Notes": 0, "back": 1, "front": 2}

    def test_incomplete_order_rejected(self, client, existing_deck, existing_field_defs):
        back_id = existing_field_defs[1]["id"]
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(order=[back_id])},
        )
        assert response.status_code == 422


class TestCardsCreateAlone:
    def test_card_create_alone(self, client, existing_deck, existing_field_defs):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(create=[{"values": {front_id: "Bonjour", back_id: "Hello"}}])},
        )
        assert response.status_code == 200, response.text
        [card] = response.json()["cards"]
        assert card["values"] == {front_id: "Bonjour", back_id: "Hello"}

    def test_card_create_all_blank_dropped(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(create=[{"values": {}}])},
        )
        assert response.status_code == 200, response.text
        assert response.json()["cards"] == []

    def test_card_create_dense_over_untouched_fields(self, client, existing_deck, existing_field_defs):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(create=[{"values": {front_id: "Bonjour"}}])},
        )
        assert response.status_code == 200, response.text
        [card] = response.json()["cards"]
        assert card["values"] == {front_id: "Bonjour", back_id: ""}


class TestCardsUpdateAlone:
    def test_card_update_alone(self, client, existing_deck, existing_field_defs):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(update=[{"id": card["id"], "values": {back_id: "Salut"}}])},
        )
        assert response.status_code == 200, response.text
        [updated] = response.json()["cards"]
        assert updated["values"] == {front_id: "Bonjour", back_id: "Salut"}

    def test_card_update_null_value_clears_to_empty_string(
        self, client, existing_deck, existing_field_defs
    ):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(update=[{"id": card["id"], "values": {back_id: None}}])},
        )
        assert response.status_code == 200, response.text
        [updated] = response.json()["cards"]
        assert updated["values"][back_id] == ""


class TestCardsDeleteAlone:
    def test_card_delete_alone(self, client, existing_deck, existing_field_defs):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(delete=[card["id"]])},
        )
        assert response.status_code == 200, response.text
        assert response.json()["cards"] == []


class TestCombinedFieldCreateAndCardCreate:
    def test_field_create_and_card_create_via_client_key(
        self, client, existing_deck, existing_field_defs
    ):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={
                "field_defs": _field_defs(create=[{"client_key": "c1", "name": "Notes", "type": "text"}]),
                "cards": _cards(
                    create=[
                        {"values": {front_id: "Bonjour", back_id: "Hello", "c1": "greeting"}}
                    ]
                ),
            },
        )
        assert response.status_code == 200, response.text
        data = response.json()
        notes_id = next(fd["id"] for fd in data["field_defs"] if fd["name"] == "Notes")
        [card] = data["cards"]
        assert card["values"] == {front_id: "Bonjour", back_id: "Hello", notes_id: "greeting"}

    def test_field_create_and_existing_card_update_via_client_key(
        self, client, existing_deck, existing_field_defs
    ):
        """Phase 7's widened contract: an *existing* card's value for a
        same-request client_key field, set via cards.update rather than
        cards.create — the deck editor's edit-mode diff needs this when a field is
        added and immediately filled in on an already-saved card."""
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={
                "field_defs": _field_defs(create=[{"client_key": "c1", "name": "Notes", "type": "text"}]),
                "cards": _cards(update=[{"id": card["id"], "values": {"c1": "greeting"}}]),
            },
        )
        assert response.status_code == 200, response.text
        data = response.json()
        notes_id = next(fd["id"] for fd in data["field_defs"] if fd["name"] == "Notes")
        [updated] = data["cards"]
        assert updated["values"] == {front_id: "Bonjour", back_id: "Hello", notes_id: "greeting"}


class TestForeignAndUnknownIdsRejected:
    def test_field_update_unknown_id_rejected(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(update=[{"id": str(uuid.uuid4()), "name": "x"}])},
        )
        assert response.status_code == 422

    def test_field_delete_unknown_id_rejected(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(delete=[str(uuid.uuid4())])},
        )
        assert response.status_code == 422

    def test_field_from_another_deck_rejected(
        self, client, existing_subject, existing_deck, existing_field_defs
    ):
        other_deck = client.post(
            "/api/decks",
            json={
                "name": "Other Deck",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "A", "type": "text"}, {"name": "B", "type": "text"}],
                "cards": [],
            },
        ).json()
        other_field_id = other_deck["field_defs"][0]["id"]

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(delete=[other_field_id])},
        )
        assert response.status_code == 422

    def test_card_update_unknown_id_rejected(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(update=[{"id": str(uuid.uuid4()), "values": {}}])},
        )
        assert response.status_code == 422

    def test_card_delete_unknown_id_rejected(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(delete=[str(uuid.uuid4())])},
        )
        assert response.status_code == 422

    def test_card_from_another_deck_rejected(
        self, client, existing_subject, existing_deck, existing_field_defs
    ):
        other_deck = client.post(
            "/api/decks",
            json={
                "name": "Other Deck",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "A", "type": "text"}, {"name": "B", "type": "text"}],
                "cards": [{"values": ["x", "y"]}],
            },
        ).json()
        [other_card] = other_deck["cards"]

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(delete=[other_card["id"]])},
        )
        assert response.status_code == 422

    def test_card_create_unknown_field_key_rejected(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(create=[{"values": {str(uuid.uuid4()): "x"}}])},
        )
        assert response.status_code == 422

    def test_card_update_unknown_field_id_rejected(self, client, existing_deck, existing_field_defs):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front_id: "a", back_id: "b"}},
        ).json()
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(update=[{"id": card["id"], "values": {str(uuid.uuid4()): "x"}}])},
        )
        assert response.status_code == 422

    def test_subject_id_not_found_rejected(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}", json={"subject_id": str(uuid.uuid4())}
        )
        assert response.status_code == 422


class TestRollback:
    def test_mid_request_failure_rolls_back_everything(
        self, client, existing_deck, existing_field_defs
    ):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={
                "name": "Should Not Stick",
                "field_defs": _field_defs(create=[{"client_key": "c1", "name": "Notes", "type": "text"}]),
                "cards": _cards(update=[{"id": str(uuid.uuid4()), "values": {}}]),
            },
        )
        assert response.status_code == 422

        check = client.get(f"/api/decks/{existing_deck['id']}").json()
        assert check["name"] == "Test Deck"
        assert {fd["name"] for fd in check["field_defs"]} == {"front", "back"}
