import uuid


class TestCardCRUD:
    def test_create_card(self, client, existing_deck, existing_field_defs):
        values = {fd["id"]: f"{fd['name']} value" for fd in existing_field_defs}
        response = client.post(
            "/api/cards", json={"deck_id": existing_deck["id"], "values": values}
        )
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["deck_id"] == existing_deck["id"]
        assert data["values"] == values
        assert "id" in data
        assert "created_at" in data

    def test_create_card_missing_field_rejected(self, client, existing_deck, existing_field_defs):
        values = {existing_field_defs[0]["id"]: "only one value"}
        response = client.post(
            "/api/cards", json={"deck_id": existing_deck["id"], "values": values}
        )
        assert response.status_code == 400

    def test_create_card_unknown_field_rejected(self, client, existing_deck, existing_field_defs):
        values = {fd["id"]: "v" for fd in existing_field_defs}
        values[str(uuid.uuid4())] = "extra"
        response = client.post(
            "/api/cards", json={"deck_id": existing_deck["id"], "values": values}
        )
        assert response.status_code == 400

    def test_create_card_deck_not_found(self, client, existing_field_defs):
        values = {fd["id"]: "v" for fd in existing_field_defs}
        response = client.post(
            "/api/cards", json={"deck_id": str(uuid.uuid4()), "values": values}
        )
        assert response.status_code == 404

    def test_create_card_excludes_archived_fields(self, client, existing_deck, existing_field_defs):
        archived_field = existing_field_defs[0]
        client.delete(f"/api/fields/{archived_field['id']}")

        remaining = {fd["id"]: "v" for fd in existing_field_defs if fd["id"] != archived_field["id"]}
        response = client.post(
            "/api/cards", json={"deck_id": existing_deck["id"], "values": remaining}
        )
        assert response.status_code == 201, response.text

        with_archived = dict(remaining)
        with_archived[archived_field["id"]] = "v"
        rejected = client.post(
            "/api/cards", json={"deck_id": existing_deck["id"], "values": with_archived}
        )
        assert rejected.status_code == 400

    def test_read_card(self, client, existing_card):
        response = client.get(f"/api/cards/{existing_card['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == existing_card["id"]
        assert data["values"] == existing_card["values"]

    def test_update_card_values(self, client, existing_card, existing_field_defs):
        field_id = existing_field_defs[0]["id"]
        response = client.patch(
            f"/api/cards/{existing_card['id']}",
            json={"values": {field_id: "Updated value"}},
        )
        assert response.status_code == 200, response.text
        assert response.json()["values"][field_id] == "Updated value"

    def test_delete_card(self, client, existing_card):
        response = client.delete(f"/api/cards/{existing_card['id']}")
        assert response.status_code == 204

        get_response = client.get(f"/api/cards/{existing_card['id']}")
        assert get_response.status_code == 404
