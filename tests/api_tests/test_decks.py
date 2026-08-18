class TestDeckCRUD:
    def test_create_deck(self, client, existing_subject):
        response = client.post(
            "/api/decks",
            json={"subject_id": existing_subject["id"], "name": "Create Test Deck"},
        )
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["name"] == "Create Test Deck"
        assert data["subject_id"] == existing_subject["id"]
        assert "id" in data

    def test_create_deck_subject_not_found(self, client):
        import uuid

        response = client.post(
            "/api/decks", json={"subject_id": str(uuid.uuid4()), "name": "Orphan Deck"}
        )
        assert response.status_code == 404

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
