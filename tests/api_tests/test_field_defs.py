class TestFieldDefLifecycle:
    def test_create_field_def(self, client, existing_deck):
        response = client.post(
            f"/api/decks/{existing_deck['id']}/fields",
            json={"name": "front", "type": "text"},
        )
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["name"] == "front"
        assert data["type"] == "text"
        assert data["position"] == 0
        assert data["archived_at"] is None

    def test_archive_below_two_active_fields_rejected(self, client, existing_field_defs):
        """D3: archiving counts as removing — a deck can't archive down to fewer than
        two active fields, same floor as create and the batch-edit endpoint."""
        field_id = existing_field_defs[0]["id"]
        response = client.delete(f"/api/fields/{field_id}")
        assert response.status_code == 422
        assert "at least two fields" in response.json()["detail"]

        get_response = client.get(f"/api/fields/{field_id}")
        assert get_response.json()["archived_at"] is None

    def test_positions_auto_increment(self, client, existing_field_defs):
        positions = [fd["position"] for fd in existing_field_defs]
        assert positions == sorted(positions)
        assert len(set(positions)) == len(positions)

    def test_list_field_defs_excludes_archived_by_default(
        self, client, existing_deck, existing_field_defs
    ):
        # D3: archiving down to fewer than two active fields is rejected, so a third
        # field exists here purely to leave two active after the archive below.
        client.post(f"/api/decks/{existing_deck['id']}/fields", json={"name": "extra", "type": "text"})
        field_id = existing_field_defs[0]["id"]
        client.delete(f"/api/fields/{field_id}")

        response = client.get(f"/api/decks/{existing_deck['id']}/fields")
        assert response.status_code == 200
        assert field_id not in [fd["id"] for fd in response.json()]

        response = client.get(
            f"/api/decks/{existing_deck['id']}/fields", params={"include_archived": True}
        )
        assert field_id in [fd["id"] for fd in response.json()]

    def test_rename_unrestricted(self, client, existing_field_defs):
        field_id = existing_field_defs[0]["id"]
        response = client.patch(f"/api/fields/{field_id}", json={"name": "renamed"})
        assert response.status_code == 200, response.text
        assert response.json()["name"] == "renamed"

    def test_reorder_unrestricted(self, client, existing_deck, existing_field_defs):
        ids = [fd["id"] for fd in existing_field_defs]
        reversed_ids = list(reversed(ids))

        response = client.post(
            f"/api/decks/{existing_deck['id']}/fields/reorder", json=reversed_ids
        )
        assert response.status_code == 200, response.text
        by_id = {fd["id"]: fd["position"] for fd in response.json()}
        assert by_id[reversed_ids[0]] == 0
        assert by_id[reversed_ids[1]] == 1

    def test_type_change_rejected(self, client, existing_field_defs):
        field_id = existing_field_defs[0]["id"]
        response = client.patch(f"/api/fields/{field_id}", json={"type": "image"})
        assert response.status_code == 400

    def test_archive_then_recreate_same_name_succeeds(self, client, existing_deck, existing_field_defs):
        # D3: leave a third field active so archiving `field` below doesn't drop the
        # deck under the two-active-field floor.
        client.post(f"/api/decks/{existing_deck['id']}/fields", json={"name": "extra", "type": "text"})
        field = existing_field_defs[0]

        archive_response = client.delete(f"/api/fields/{field['id']}")
        assert archive_response.status_code == 200, archive_response.text
        assert archive_response.json()["archived_at"] is not None

        recreate_response = client.post(
            f"/api/decks/{existing_deck['id']}/fields",
            json={"name": field["name"], "type": field["type"]},
        )
        assert recreate_response.status_code == 201, recreate_response.text
        assert recreate_response.json()["id"] != field["id"]

    def test_duplicate_active_name_rejected(self, client, existing_deck, existing_field_defs):
        field = existing_field_defs[0]
        response = client.post(
            f"/api/decks/{existing_deck['id']}/fields",
            json={"name": field["name"], "type": field["type"]},
        )
        assert response.status_code == 400

    def test_hard_delete_requires_archive_first(self, client, existing_field_defs):
        field_id = existing_field_defs[0]["id"]
        response = client.delete(f"/api/fields/{field_id}/hard")
        assert response.status_code == 400

    def test_hard_delete_blocked_when_values_exist(
        self, client, existing_deck, existing_card, existing_field_defs
    ):
        # D3: a third field keeps two active after archiving one below.
        client.post(f"/api/decks/{existing_deck['id']}/fields", json={"name": "extra", "type": "text"})
        field_id = existing_field_defs[0]["id"]
        client.delete(f"/api/fields/{field_id}")

        response = client.delete(f"/api/fields/{field_id}/hard")
        assert response.status_code == 400

    def test_hard_delete_succeeds_when_empty(self, client, existing_deck, existing_field_defs):
        client.post(f"/api/decks/{existing_deck['id']}/fields", json={"name": "extra", "type": "text"})
        field_id = existing_field_defs[0]["id"]
        client.delete(f"/api/fields/{field_id}")

        response = client.delete(f"/api/fields/{field_id}/hard")
        assert response.status_code == 204

        get_response = client.get(f"/api/fields/{field_id}")
        assert get_response.status_code == 404
