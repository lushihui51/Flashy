class TestDeckCRUD:
    def test_create_deck(self, client, deck_path, existing_subject):
        response = client.post(
            deck_path,
            json={
                "name": "Create Test Deck",
                "subject_id": existing_subject["id"],
                "deck_schema": {"front": "str", "back": "str"},
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Create Test Deck"
        assert data["subject_id"] == existing_subject["id"]
        assert data["deck_schema"] == {"front": "str", "back": "str"}
        assert "id" in data

    def test_read_deck(self, client, deck_path, existing_deck):
        deck_id = existing_deck["id"]

        response = client.get(f"{deck_path}/{deck_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == deck_id
        assert data["name"] == "Test Deck"
        assert data["subject_id"] == existing_deck["subject_id"]
        assert data["deck_schema"] == {"front": "str", "back": "str"}

    def test_update_deck(self, client, deck_path, existing_subject, existing_deck):
        deck_id = existing_deck["id"]

        response = client.put(
            f"{deck_path}/{deck_id}",
            json={"name": "Updated Deck Name", "subject_id": existing_subject["id"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == deck_id
        assert data["name"] == "Updated Deck Name"
        assert data["subject_id"] == existing_subject["id"]

    def test_delete_deck(self, client, deck_path, existing_deck):
        deck_id = existing_deck["id"]

        response = client.delete(f"{deck_path}/{deck_id}")
        assert response.status_code == 204

        get_response = client.get(f"{deck_path}/{deck_id}")
        assert get_response.status_code == 404
