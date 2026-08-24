import uuid


class TestCardList:
    def test_lists_all_cards_in_deck(self, client, existing_deck, existing_field_defs):
        values = {fd["id"]: f"{fd['name']} value" for fd in existing_field_defs}
        first = client.post("/api/cards", json={"deck_id": existing_deck["id"], "values": values})
        second = client.post("/api/cards", json={"deck_id": existing_deck["id"], "values": values})
        assert first.status_code == 201 and second.status_code == 201

        response = client.get("/api/cards", params={"deck_id": existing_deck["id"]})
        assert response.status_code == 200, response.text
        ids = {c["id"] for c in response.json()}
        assert ids == {first.json()["id"], second.json()["id"]}

    def test_empty_deck_returns_empty_list(self, client, existing_deck):
        response = client.get("/api/cards", params={"deck_id": existing_deck["id"]})
        assert response.status_code == 200
        assert response.json() == []

    def test_foreign_deck_not_found(self, client, other_user, act_as, existing_deck):
        act_as(other_user)
        response = client.get("/api/cards", params={"deck_id": existing_deck["id"]})
        assert response.status_code == 404


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

    def test_card_create_writes_dense_rows_for_omitted_fields(
        self, client, existing_deck, existing_field_defs
    ):
        """§2.6: an active field the client omits is written as "", not rejected —
        the persisted row set is dense over the deck's active fields regardless of
        what the client actually sent."""
        values = {existing_field_defs[0]["id"]: "only one value"}
        response = client.post(
            "/api/cards", json={"deck_id": existing_deck["id"], "values": values}
        )
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["values"][existing_field_defs[0]["id"]] == "only one value"
        assert data["values"][existing_field_defs[1]["id"]] == ""
        assert len(data["values"]) == len(existing_field_defs)

    def test_card_create_rejects_unknown_field_key(self, client, existing_deck, existing_field_defs):
        values = {fd["id"]: "v" for fd in existing_field_defs}
        values[str(uuid.uuid4())] = "extra"
        response = client.post(
            "/api/cards", json={"deck_id": existing_deck["id"], "values": values}
        )
        assert response.status_code == 422

    def test_card_create_rejects_all_blank_values(self, client, existing_deck, existing_field_defs):
        values = {fd["id"]: "" for fd in existing_field_defs}
        response = client.post(
            "/api/cards", json={"deck_id": existing_deck["id"], "values": values}
        )
        assert response.status_code == 422
        assert "no values" in response.json()["detail"]

    def test_card_create_all_omitted_rejected_as_all_blank(self, client, existing_deck, existing_field_defs):
        """Omitting every field is equivalent to sending them all blank (§2.6's dense
        write fills omissions with "") — still rejected, just via the same all-blank
        rule rather than a separate "nothing sent" rule."""
        response = client.post(
            "/api/cards", json={"deck_id": existing_deck["id"], "values": {}}
        )
        assert response.status_code == 422
        assert "no values" in response.json()["detail"]

    def test_create_card_deck_not_found(self, client, existing_field_defs):
        values = {fd["id"]: "v" for fd in existing_field_defs}
        response = client.post(
            "/api/cards", json={"deck_id": str(uuid.uuid4()), "values": values}
        )
        assert response.status_code == 404

    def test_card_create_rejects_archived_field_key(self, client, existing_deck, existing_field_defs):
        # D3: a third field keeps two active after archiving one below.
        extra_field = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "extra", "type": "text"}
        ).json()
        archived_field = existing_field_defs[0]
        client.delete(f"/api/fields/{archived_field['id']}")

        # The dense write fills the omitted active field automatically now — no need
        # to pass every active id, just proving a non-archived subset still works.
        remaining = {fd["id"]: "v" for fd in existing_field_defs if fd["id"] != archived_field["id"]}
        response = client.post(
            "/api/cards", json={"deck_id": existing_deck["id"], "values": remaining}
        )
        assert response.status_code == 201, response.text
        assert response.json()["values"][extra_field["id"]] == ""

        with_archived = dict(remaining)
        with_archived[archived_field["id"]] = "v"
        rejected = client.post(
            "/api/cards", json={"deck_id": existing_deck["id"], "values": with_archived}
        )
        assert rejected.status_code == 422

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

    def test_card_patch_can_blank_one_of_several_values(self, client, existing_card, existing_field_defs):
        """Merge semantics: blanking one field while another stays non-empty is fine
        — only blanking *every* active field is rejected."""
        field_id = existing_field_defs[0]["id"]
        response = client.patch(
            f"/api/cards/{existing_card['id']}", json={"values": {field_id: ""}}
        )
        assert response.status_code == 200, response.text
        assert response.json()["values"][field_id] == ""

    def test_card_patch_cannot_blank_all_values(self, client, existing_card, existing_field_defs):
        blank_values = {fd["id"]: "" for fd in existing_field_defs}
        response = client.patch(
            f"/api/cards/{existing_card['id']}", json={"values": blank_values}
        )
        assert response.status_code == 422
        assert "no values" in response.json()["detail"]

        unchanged = client.get(f"/api/cards/{existing_card['id']}")
        assert all(v != "" for v in unchanged.json()["values"].values())

    def test_card_patch_rejects_unknown_field_key(self, client, existing_card):
        response = client.patch(
            f"/api/cards/{existing_card['id']}",
            json={"values": {str(uuid.uuid4()): "v"}},
        )
        assert response.status_code == 422

    def test_delete_card(self, client, existing_card):
        response = client.delete(f"/api/cards/{existing_card['id']}")
        assert response.status_code == 204

        get_response = client.get(f"/api/cards/{existing_card['id']}")
        assert get_response.status_code == 404


class TestCardMastery:
    def test_unreviewed_card_reports_prior_and_zero_reviewed(self, client, existing_card):
        response = client.get(f"/api/cards/{existing_card['id']}/mastery")
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["reviewed_field_count"] == 0
        assert data["mastery"] == 50.0  # EmaStrategy's MASTERY_PRIOR

    def test_foreign_card_not_found(self, client, other_user, act_as, existing_card):
        act_as(other_user)
        response = client.get(f"/api/cards/{existing_card['id']}/mastery")
        assert response.status_code == 404

    def test_missing_card_not_found(self, client):
        response = client.get(f"/api/cards/{uuid.uuid4()}/mastery")
        assert response.status_code == 404
